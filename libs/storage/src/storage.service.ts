import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand,
  PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import type { DownloadUrl, UploadTicket } from '@app/shared';
import { FilePurpose, MB, STORAGE_POLICIES } from './file-policies';
import { matchesSignature } from './file-signature';
import { UploadRejectedException } from './upload-rejected.exception';

const extOf = (name: string) => {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name);
  return m ? `.${m[1].toLowerCase()}` : '';
};

@Injectable()
export class StorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly uploadTtl: number;
  private readonly downloadTtl: number;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.uploadTtl = Number(config.get('UPLOAD_URL_TTL_SECONDS', 600));
    this.downloadTtl = Number(config.get('DOWNLOAD_URL_TTL_SECONDS', 600));
    this.s3 = new S3Client({
      region: config.get<string>('S3_REGION', 'auto'),
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
      // Các SDK mới tự thêm header checksum vào URL có chữ ký, làm PUT từ trình duyệt/R2 bị lỗi.
      // Chỉ tính checksum khi bắt buộc.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async onApplicationBootstrap() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Đã kết nối bucket "${this.bucket}"`);
    } catch (e: any) {
      // Không chặn khởi động: token chỉ có quyền Object Read & Write có thể không có quyền HeadBucket
      this.logger.warn(`Không kiểm tra được bucket (${e?.name}). Kiểm tra S3_* nếu upload bị lỗi.`);
    }
  }

  // ---------- Upload ----------
  /**
   * Kiểm tra yêu cầu upload theo chính sách của `purpose`, sinh key và URL PUT có chữ ký.
   * Service tự lưu `objectKey` vào bảng của mình (trạng thái UPLOADING).
   */
  async createUpload(p: {
    purpose: FilePurpose;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ objectKey: string; ticket: UploadTicket }> {
    const policy = STORAGE_POLICIES[p.purpose];
    if (!policy.allowedMime.includes(p.mimeType)) {
      throw new BadRequestException(`Định dạng ${p.mimeType} không được hỗ trợ cho "${p.purpose}"`);
    }
    if (p.sizeBytes > policy.maxBytes) {
      throw new BadRequestException(`File vượt quá ${Math.floor(policy.maxBytes / MB)} MB`);
    }

    const objectKey = `${p.purpose}/${new Date().getFullYear()}/${randomUUID()}${extOf(p.fileName)}`;
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, ContentType: p.mimeType }),
      { expiresIn: this.uploadTtl },
    );
    return {
      objectKey,
      ticket: {
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': p.mimeType },
        expiresAt: new Date(Date.now() + this.uploadTtl * 1000).toISOString(),
        maxBytes: policy.maxBytes,
      },
    };
  }

  /**
   * Xác minh file client đã upload. Không tin khai báo: kiểm tra kích thước thật và định dạng thật.
   * - Chưa thấy object  → BadRequestException (client upload xong rồi gọi lại).
   * - File không hợp lệ → xóa object, ném UploadRejectedException (caller xóa bản ghi của nó).
   */
  async verifyUpload(p: {
    objectKey: string;
    purpose: FilePurpose;
    mimeType: string;
  }): Promise<{ sizeBytes: number }> {
    const policy = STORAGE_POLICIES[p.purpose];
    const head = await this.head(p.objectKey);
    if (!head) {
      throw new BadRequestException('Chưa thấy file trên kho lưu trữ, hãy upload xong rồi mới xác nhận');
    }
    if (head.size <= 0 || head.size > policy.maxBytes) {
      return this.reject(p.objectKey, `Kích thước file không hợp lệ (tối đa ${Math.floor(policy.maxBytes / MB)} MB)`);
    }
    const bytes = await this.readHead(p.objectKey, 16);
    if (!matchesSignature(p.mimeType, bytes)) {
      return this.reject(p.objectKey, 'Nội dung file không khớp với định dạng khai báo');
    }
    return { sizeBytes: head.size };
  }

  private async reject(objectKey: string, message: string): Promise<never> {
    await this.deleteObject(objectKey).catch(() => undefined);
    throw new UploadRejectedException(message);
  }

  // ---------- Xem / đọc ----------
  /** URL tải có chữ ký. Tính cục bộ (không gọi mạng), nên gọi cho cả danh sách ảnh cũng nhẹ. */
  async createDownloadUrl(
    objectKey: string,
    opts: { fileName: string; mimeType: string; download?: boolean },
  ): Promise<DownloadUrl> {
    const disposition = `${opts.download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(opts.fileName)}`;
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey, ResponseContentDisposition: disposition }),
      { expiresIn: this.downloadTtl },
    );
    return {
      url,
      expiresAt: new Date(Date.now() + this.downloadTtl * 1000).toISOString(),
      fileName: opts.fileName,
      mimeType: opts.mimeType,
    };
  }

  /** Đọc toàn bộ object vào bộ nhớ (cho service cần xử lý nội dung, ví dụ AI parse tài liệu). */
  async readObject(objectKey: string, maxBytes: number): Promise<Buffer> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    if (Number(res.ContentLength ?? 0) > maxBytes) throw new Error('File vượt quá giới hạn cho phép');
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  // ---------- Xóa ----------
  /** Idempotent: xóa object không tồn tại vẫn thành công. */
  async deleteObject(objectKey: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  // ---------- Nội bộ ----------
  private async head(key: string): Promise<{ size: number } | null> {
    try {
      const r = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: Number(r.ContentLength ?? 0) };
    } catch (e: any) {
      if (e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404) return null;
      throw e;
    }
  }

  private async readHead(key: string, bytes: number): Promise<Uint8Array> {
    const r = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
    );
    return r.Body!.transformToByteArray();
  }
}
