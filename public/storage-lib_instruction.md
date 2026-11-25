# Hướng dẫn dựng `libs/storage`: lưu file và hình ảnh

Thay vì một service riêng cho file, dự án dùng **một thư viện hạ tầng `libs/storage`**. Service nào cần lưu file (ảnh thiết bị ở `device-service`, tài liệu ở `ai-assistant-service`, ảnh phiếu bảo trì, avatar...) thì **import thư viện này và tự sở hữu file của mình**:

- File nằm trong một **bucket object storage private** (khuyến nghị Cloudflare R2, tương thích API S3).
- Mỗi service có **bảng riêng** lưu thông tin file của nó (vị trí trong bucket, tên gốc, loại, kích thước, trạng thái) và **route riêng** để xin upload, xác nhận, xem. Không có service trung gian.
- Client **upload/tải trực tiếp lên/xuống bucket bằng URL có chữ ký, hết hạn sau vài phút**. Byte của file **không đi qua gateway hay RabbitMQ**.

> Điều kiện: đã làm xong **mục 9 "Khởi tạo nền"** trong `folder_structure.md`; `user-service` và `api-gateway` chạy được; có tài khoản Cloudflare (hoặc nhà cung cấp S3-compatible khác).
> Làm tài liệu này **trước** khi thêm ảnh cho `device-service` và trước `ai-assistant-service`, vì hai service đó dùng thư viện này.

---

## 0. Phạm vi và ý tưởng

### Phân chia trách nhiệm

| Thư viện `libs/storage` (hạ tầng, không nghiệp vụ) | Service sử dụng (nghiệp vụ) |
|---|---|
| Kết nối bucket, tạo URL upload/tải có chữ ký | Bảng file của riêng mình (`device_images`, `documents`...) |
| Kiểm tra loại file, kích thước, **định dạng thật** (đọc byte đầu) | Route xin upload / xác nhận / xem / xóa |
| Chính sách theo loại file (`purpose`) | Quyền ai được làm gì (qua `@Roles` ở gateway và kiểm tra trong service) |
| Tạo key trong bucket, đọc và xóa object | Dọn bản ghi `UPLOADING` quá hạn, xóa file khi xóa đối tượng cha |

Hợp đồng dùng chung giữa gateway và service (DTO xin upload, kiểu `UploadTicket`, `DownloadUrl`) nằm trong `libs/shared/src/contracts/storage/`. **Mã S3 SDK chỉ nằm trong `libs/storage`**, gateway không import nó.

### Luồng upload và hiển thị (mẫu chung, ví dụ ảnh thiết bị)

```text
UPLOAD
1. Client ─► Gateway ─► device-service   POST /devices/:id/images/upload-url {fileName, mimeType, sizeBytes}
              device-service: storage.createUpload() kiểm tra loại + kích thước,
              tạo bản ghi device_images (UPLOADING), trả { imageId, uploadUrl (PUT), headers, expiresAt }
2. Client ───────PUT file──────────────────────────────► Bucket        (không qua backend)
3. Client ─► Gateway ─► device-service   POST /devices/:id/images/:imageId/confirm
              device-service: storage.verifyUpload() kiểm tra file có thật, đúng kích thước,
              đúng "chữ ký" định dạng → bản ghi READY (sai thì xóa file + bản ghi)

HIỂN THỊ
4. Client ─► Gateway ─► device-service   GET /devices/:id   → { ..., images: [{ id, url, expiresAt, isPrimary }] }
   Client: <img src={url}>   (tải trực tiếp từ bucket; URL hết hạn sau ~10 phút)
```

### Loại file (`purpose`) và chính sách

Chính sách nằm trong `libs/storage` (mime + kích thước tối đa). **Quyền ai được upload/xem do route của từng service và `@Roles` ở gateway quyết định.**

| `purpose` | Định dạng | Tối đa | Dùng bởi |
|---|---|---|---|
| `ai-document` | pdf, docx, txt | 20 MB | `ai-assistant-service` |
| `device-image` | jpeg, png, webp | 5 MB | `device-service` |
| `ticket-image` | jpeg, png, webp | 5 MB | `maintenance-service` (khi cần) |
| `user-avatar` | jpeg, png, webp | 2 MB | `user-service` (khi cần) |

Thêm loại mới = thêm một dòng vào `FILE_PURPOSES` và `STORAGE_POLICIES`.

### Quyết định thiết kế

- **Presigned URL** thay vì gửi file qua backend: không bị giới hạn bởi kích thước message RabbitMQ, không tốn RAM gateway/service.
- **Không tin khai báo của client.** Vì file đi thẳng vào bucket, lúc xác nhận thư viện tự kiểm tra kích thước thật và **đọc vài byte đầu để xác minh định dạng** (JPEG, PNG, WebP, PDF, DOCX). Sai thì xóa file khỏi bucket (ném `UploadRejectedException`).
- **File và bản ghi thuộc cùng một service** nên vòng đời đơn giản: xóa đối tượng thì xóa file cùng lúc, không có trạng thái "đã gắn/chưa gắn" như một service file riêng.
- **Service không lưu URL**, chỉ lưu `objectKey`. URL được tạo lúc trả response (tính cục bộ, không gọi mạng) và hết hạn sau vài phút.
- Một bucket, tách theo tiền tố key `<purpose>/<năm>/<uuid>.<đuôi>`. Tên file gốc **không** dùng làm key.
- Bản ghi `UPLOADING` mà client bỏ dở sẽ được dọn bằng job định kỳ **trong chính service đó** (mẫu ở mục 6.5).

---

## 1. Chuẩn bị bucket, package và env

### 1.1 Cloudflare R2

1. Cloudflare dashboard → **R2 Object Storage** → tạo bucket (ví dụ `maintenance-files`). Giữ **private** (không bật public access, không gắn domain công khai).
2. **R2 → Manage API Tokens** → tạo token loại **Object Read & Write**, giới hạn **chỉ cho bucket này**. Lưu `Access Key ID` và `Secret Access Key` (chỉ hiện một lần).
3. Ghi lại **endpoint S3** dạng `https://<account_id>.r2.cloudflarestorage.com`.
4. Cấu hình **CORS** cho bucket (vì trình duyệt PUT/GET trực tiếp). Đối chiếu định dạng với mẫu trong dashboard, nội dung chính:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Khi triển khai thật, thêm domain frontend vào `AllowedOrigins`. Nếu dùng nhà cung cấp khác (Backblaze B2, AWS S3...) thì chỉ khác endpoint/credential, code giữ nguyên. Gói miễn phí và chính sách phí có thể thay đổi, kiểm tra lại trang giá trước khi dùng.

### 1.2 Package

```bash
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Nên dùng bản SDK mới (code dùng hai tùy chọn checksum chỉ có ở các bản gần đây, xem mục 4.5).

### 1.3 Environment (`.env` gốc, dùng chung)

Thư viện được import vào nhiều app nên cấu hình bucket đặt ở **`.env` gốc** (cùng chỗ với `RABBITMQ_URL`, `JWT_SECRET`). Thêm vào `.env.example` và `.env` gốc:

```env
# Object storage (S3-compatible) – dùng chung cho các service có upload file
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=cmms-bucket
S3_ACCESS_KEY_ID=<access key>
S3_SECRET_ACCESS_KEY=<secret key>
# Thời hạn URL có chữ ký (giây)
UPLOAD_URL_TTL_SECONDS=600
DOWNLOAD_URL_TTL_SECONDS=600
```

Lưu ý: vì nằm ở `.env` gốc nên **mọi container** (kể cả service không dùng file) đều nhận được khóa bucket. Chấp nhận được ở dự án này. Nếu muốn chặt hơn, đặt các biến `S3_*` vào `.env` của riêng từng service dùng file (phải giống nhau), hoặc dùng bucket + token riêng cho từng service. Không commit khóa; nếu lỡ lộ thì thu hồi token và tạo lại.

---

## 2. Cập nhật phần nền

**a. Tạo thư viện** (cạnh `libs/shared`):

```bash
nest g lib storage --no-spec          # khi hỏi prefix, nhấn Enter → alias '@app/storage'
```

Lệnh này sinh `libs/storage/src/{index.ts, storage.module.ts, storage.service.ts}` và thêm alias `@app/storage` vào `tsconfig.json` + `nest-cli.json`. Các file sinh sẵn sẽ được **ghi đè** ở mục 4. Kiểm tra `tsconfig.json` có `"@app/storage": ["libs/storage/src"]` và `"@app/storage/*": ["libs/storage/src/*"]` trong `paths`.

**b. Không cần** thêm `QUEUES`/`SERVICES`, không đổi `docker-compose.yml`, không thêm database, không thêm kết nối RabbitMQ. Dockerfile build thư viện cùng app như `libs/shared`.

**c. Cập nhật `folder_structure.md`** (hiện chưa nhắc tới thư viện này):
- Cây thư mục: thêm `libs/storage/` (`storage.module.ts`, `storage.service.ts`, `file-policies.ts`, `file-signature.ts`, `upload-rejected.exception.ts`) và `libs/shared/src/contracts/storage/`.
- Mục 7 (Environment): thêm các biến `S3_*` vào `.env` gốc.
- Mục 4, bảng "Shared: nên và không nên": ghi rõ `libs/storage` là thư viện hạ tầng tách khỏi `shared`, không chứa nghiệp vụ.
- Mục 6 (ai-assistant): đổi luồng upload sang "xin URL → PUT lên bucket → confirm" thay cho gửi base64 qua RabbitMQ; bỏ `MAX_UPLOAD_MB`.

---

## 3. Contract trong shared

Tạo `libs/shared/src/contracts/storage/` gồm 3 file (import tương đối trong `libs/shared`).

`storage.dto.ts`

```ts
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Body xin URL upload; các route `.../upload-url` của mọi service dùng chung (có thể kế thừa để thêm trường). */
export class RequestUploadDto {
  @IsString() @IsNotEmpty() @MaxLength(255) fileName: string;
  @IsString() @IsNotEmpty() @MaxLength(100) mimeType: string;
  @Type(() => Number) @IsInt() @Min(1) sizeBytes: number;
}

export class DownloadUrlQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  download?: boolean; // true → trình duyệt tải về thay vì mở trực tiếp
}
```

`storage.types.ts`

```ts
export interface UploadTicket {
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>; // client PHẢI gửi đúng các header này khi PUT
  expiresAt: string;
  maxBytes: number;
}

export interface DownloadUrl {
  url: string;
  expiresAt: string;
  fileName: string;
  mimeType: string;
}
```

`index.ts`

```ts
export * from './storage.dto';
export * from './storage.types';
```

Rồi thêm vào `libs/shared/src/index.ts`: `export * from './contracts/storage';`

Mỗi service dùng file sẽ định nghĩa kiểu ticket riêng, kế thừa `UploadTicket` và thêm id của đối tượng (ví dụ `DeviceImageUploadTicket extends UploadTicket { imageId: string }`).

---

## 4. Code `libs/storage/src/`

```text
libs/storage/src/
├── index.ts
├── storage.module.ts
├── storage.service.ts
├── file-policies.ts
├── file-signature.ts
└── upload-rejected.exception.ts
```

### 4.1 `file-policies.ts`

```ts
export const FILE_PURPOSES = {
  AI_DOCUMENT: 'ai-document',
  DEVICE_IMAGE: 'device-image',
  TICKET_IMAGE: 'ticket-image',
  USER_AVATAR: 'user-avatar',
} as const;
export type FilePurpose = (typeof FILE_PURPOSES)[keyof typeof FILE_PURPOSES];

export interface FilePolicy {
  allowedMime: readonly string[];
  maxBytes: number;
}

export const MB = 1024 * 1024;
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const STORAGE_POLICIES: Record<FilePurpose, FilePolicy> = {
  'ai-document': {
    allowedMime: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    maxBytes: 20 * MB,
  },
  'device-image': { allowedMime: IMAGE_MIME, maxBytes: 5 * MB },
  'ticket-image': { allowedMime: IMAGE_MIME, maxBytes: 5 * MB },
  'user-avatar': { allowedMime: IMAGE_MIME, maxBytes: 2 * MB },
};
```

### 4.2 `file-signature.ts`

```ts
const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

/** Xác minh định dạng thật của file bằng những byte đầu tiên. */
export function matchesSignature(mimeType: string, head: Uint8Array): boolean {
  switch (mimeType) {
    case 'image/jpeg':
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47]);
    case 'image/webp': // "RIFF" .... "WEBP"
      return startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8);
    case 'application/pdf':
      return startsWith(head, [0x25, 0x50, 0x44, 0x46]); // %PDF
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return startsWith(head, [0x50, 0x4b]); // PK (zip)
    case 'text/plain':
      return true;
    default:
      return false;
  }
}
```

### 4.3 `upload-rejected.exception.ts`

Phân biệt hai tình huống khi xác nhận: **chưa upload xong** (lỗi thường, client thử lại được) và **file không hợp lệ** (object đã bị xóa khỏi bucket, service phải xóa nốt bản ghi của nó).

```ts
import { BadRequestException } from '@nestjs/common';

/** File đã upload nhưng không hợp lệ; object đã bị xóa khỏi bucket. Caller phải xóa bản ghi tương ứng. */
export class UploadRejectedException extends BadRequestException {}
```

### 4.4 `storage.service.ts`

```ts
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
```

### 4.5 `storage.module.ts` và `index.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/** Import MỘT lần trong AppModule của app cần dùng; cần ConfigModule global (đã có ở mọi app). */
@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
```

```ts
export * from './storage.module';
export * from './storage.service';
export * from './file-policies';
export * from './upload-rejected.exception';
```

(Không export `file-signature.ts` vì chỉ dùng nội bộ.) Import trong app: `import { StorageModule, StorageService, FILE_PURPOSES, STORAGE_POLICIES, UploadRejectedException } from '@app/storage';`

Về hai tùy chọn checksum trong constructor: các bản SDK mới tự thêm header checksum vào URL có chữ ký, khiến PUT trực tiếp lên R2 từ trình duyệt thất bại; đặt `WHEN_REQUIRED` tránh điều đó. Nếu TypeScript báo không có hai tùy chọn này thì SDK của bạn quá cũ, hãy cập nhật.

---

## 5. Cách một service dùng thư viện (mẫu chung)

Mỗi service có file làm đúng **bốn việc**, mọi thứ còn lại là nghiệp vụ của chính nó:

1. **Xin upload**: `storage.createUpload()` → lưu bản ghi `UPLOADING` kèm `objectKey` → trả `{ id, ...ticket }`.
2. **Xác nhận**: `storage.verifyUpload()` → bản ghi `READY` (kèm `sizeBytes` thật). Nếu ném `UploadRejectedException` thì xóa bản ghi rồi ném lại lỗi.
3. **Xem**: `storage.createDownloadUrl()` khi dựng response (hoặc có route riêng `.../download-url`).
4. **Xóa**: `storage.deleteObject()` **trước**, rồi mới xóa bản ghi. Nếu xóa object lỗi thì bản ghi còn lại để thử lại, không sinh file mồ côi.

Cộng thêm hai việc bảo trì: **dọn bản ghi `UPLOADING` quá hạn** (mục 6.5) và **xóa file khi xóa đối tượng cha**.

Schema của bảng file trong mỗi service gồm (đặt tên tùy ngữ cảnh): `id`, khóa tới đối tượng cha, `objectKey` (unique), `fileName`, `mimeType`, `sizeBytes`, `status` (`UPLOADING`/`READY`), `uploadedBy`, `createdAt`.

---

## 6. Ví dụ đầy đủ: `device-service` lưu và hiển thị ảnh thiết bị

### 6.1 Schema (điều chỉnh theo schema `Device` thật)

```prisma
enum ImageStatus {
  UPLOADING
  READY
}

model DeviceImage {
  id         String      @id @default(uuid())
  deviceId   String      @map("device_id")
  objectKey  String      @unique @map("object_key")
  fileName   String      @map("file_name")
  mimeType   String      @map("mime_type")
  sizeBytes  Int         @map("size_bytes")
  status     ImageStatus @default(UPLOADING)
  isPrimary  Boolean     @default(false) @map("is_primary")
  uploadedBy String      @map("uploaded_by")
  createdAt  DateTime    @default(now()) @map("created_at")
  device     Device      @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([deviceId])
  @@index([status, createdAt])
  @@map("device_images")
}
```

Chạy migration (hoặc `db pull` nếu DB do bạn quản lý) rồi `prisma generate`.

### 6.2 Contract (`libs/shared/src/contracts/device/`)

```ts
// device.patterns.ts → thêm vào DEVICE_CMD
REQUEST_IMAGE_UPLOAD: 'cmd.device.request_image_upload',
CONFIRM_IMAGE_UPLOAD: 'cmd.device.confirm_image_upload',
REMOVE_IMAGE: 'cmd.device.remove_image',

// device.messages.ts
import { RequestUploadDto } from '../storage/storage.dto';
export interface RequestDeviceImageUploadMsg { deviceId: string; dto: RequestUploadDto; actor: JwtPayload }
export interface ConfirmDeviceImageMsg { deviceId: string; imageId: string; actor: JwtPayload }
export interface RemoveDeviceImageMsg { deviceId: string; imageId: string; actor: JwtPayload }

// device.types.ts
import { DownloadUrl, UploadTicket } from '../storage/storage.types';
export interface DeviceImageView extends DownloadUrl { id: string; isPrimary: boolean }   // url + expiresAt + fileName + mimeType
export interface DeviceImageUploadTicket extends UploadTicket { imageId: string }
// và thêm vào DeviceView:
images: DeviceImageView[];
```

### 6.3 `DevicesService` (đoạn liên quan ảnh)

Cần: `StorageModule` import trong `AppModule` của device-service (`import { StorageModule } from '@app/storage';`) và inject `StorageService` vào `DevicesService`.

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FILE_PURPOSES, StorageService, UploadRejectedException } from '@app/storage';

const MAX_IMAGES_PER_DEVICE = 10;

async requestImageUpload({ deviceId, dto, actor }: RequestDeviceImageUploadMsg): Promise<DeviceImageUploadTicket> {
  await this.assertDeviceExists(deviceId); // 404 nếu không có

  // Đếm cả ảnh đang UPLOADING để không vượt giới hạn bằng cách xin nhiều URL
  const count = await this.prisma.deviceImage.count({ where: { deviceId } });
  if (count >= MAX_IMAGES_PER_DEVICE) {
    throw new BadRequestException(`Mỗi thiết bị tối đa ${MAX_IMAGES_PER_DEVICE} ảnh`);
  }

  const { objectKey, ticket } = await this.storage.createUpload({
    purpose: FILE_PURPOSES.DEVICE_IMAGE,
    fileName: dto.fileName,
    mimeType: dto.mimeType,
    sizeBytes: dto.sizeBytes,
  });
  const image = await this.prisma.deviceImage.create({
    data: {
      deviceId, objectKey, fileName: dto.fileName, mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes, uploadedBy: actor.sub,
    },
  });
  return { imageId: image.id, ...ticket };
}

async confirmImageUpload({ deviceId, imageId }: ConfirmDeviceImageMsg): Promise<DeviceImageView> {
  const image = await this.findImageOrFail(deviceId, imageId);
  if (image.status === 'READY') return this.toImageView(image); // idempotent

  let sizeBytes: number;
  try {
    ({ sizeBytes } = await this.storage.verifyUpload({
      objectKey: image.objectKey,
      purpose: FILE_PURPOSES.DEVICE_IMAGE,
      mimeType: image.mimeType,
    }));
  } catch (e) {
    // File không hợp lệ đã bị xóa khỏi bucket: xóa luôn bản ghi
    if (e instanceof UploadRejectedException) {
      await this.prisma.deviceImage.delete({ where: { id: imageId } }).catch(() => undefined);
    }
    throw e;
  }

  // Ảnh READY đầu tiên tự thành ảnh đại diện
  const readyCount = await this.prisma.deviceImage.count({ where: { deviceId, status: 'READY' } });
  const updated = await this.prisma.deviceImage.update({
    where: { id: imageId },
    data: { status: 'READY', sizeBytes, isPrimary: readyCount === 0 },
  });
  return this.toImageView(updated);
}

async removeImage({ deviceId, imageId }: RemoveDeviceImageMsg) {
  const image = await this.findImageOrFail(deviceId, imageId);
  await this.storage.deleteObject(image.objectKey);          // object trước, bản ghi sau
  await this.prisma.deviceImage.delete({ where: { id: imageId } });
  return { message: 'Đã gỡ ảnh' };
}

/** Dùng khi dựng DeviceView: chỉ lấy ảnh READY. Tạo URL là phép tính cục bộ, không gọi mạng. */
private async toImageView(image: DeviceImage): Promise<DeviceImageView> {
  const dl = await this.storage.createDownloadUrl(image.objectKey, {
    fileName: image.fileName,
    mimeType: image.mimeType,
  });
  return { id: image.id, isPrimary: image.isPrimary, ...dl };
}

private async findImageOrFail(deviceId: string, imageId: string) {
  const image = await this.prisma.deviceImage.findFirst({ where: { id: imageId, deviceId } });
  if (!image) throw new NotFoundException('Không tìm thấy ảnh');
  return image;
}
```

**Xóa thiết bị:** xóa object của các ảnh trước, rồi xóa thiết bị (bản ghi ảnh mất theo `onDelete: Cascade`):

```ts
async deleteDevice(id: string) {
  const images = await this.prisma.deviceImage.findMany({ where: { deviceId: id }, select: { objectKey: true } });
  await Promise.all(images.map((i) => this.storage.deleteObject(i.objectKey))); // lỗi thì dừng, thiết bị còn nguyên
  await this.prisma.device.delete({ where: { id } });
}
```

**Dựng `DeviceView`:** lấy `images` với `where: { status: 'READY' }`, sắp xếp ảnh đại diện lên đầu, rồi `Promise.all(images.map(toImageView))`. Với danh sách thiết bị, chỉ cần trả ảnh đại diện để gọn response.

### 6.4 Controller (service) và route gateway

`devices.controller.ts` (đoạn thêm):

```ts
@MessagePattern(DEVICE_CMD.REQUEST_IMAGE_UPLOAD)
requestImageUpload(@Payload() msg: RequestDeviceImageUploadMsg) { return this.devices.requestImageUpload(msg); }

@MessagePattern(DEVICE_CMD.CONFIRM_IMAGE_UPLOAD)
confirmImageUpload(@Payload() msg: ConfirmDeviceImageMsg) { return this.devices.confirmImageUpload(msg); }

@MessagePattern(DEVICE_CMD.REMOVE_IMAGE)
removeImage(@Payload() msg: RemoveDeviceImageMsg) { return this.devices.removeImage(msg); }
```

Gateway (`devices.controller.ts`):

```ts
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
@Post(':id/images/upload-url')
requestImageUpload(@Param('id') deviceId: string, @Body() dto: RequestUploadDto, @CurrentUser() actor: JwtPayload) {
  return this.bus.send<DeviceImageUploadTicket, RequestDeviceImageUploadMsg>(
    DEVICE_CMD.REQUEST_IMAGE_UPLOAD, { deviceId, dto, actor });
}

@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
@HttpCode(200)
@Post(':id/images/:imageId/confirm')
confirmImageUpload(@Param('id') deviceId: string, @Param('imageId', ParseUUIDPipe) imageId: string, @CurrentUser() actor: JwtPayload) {
  return this.bus.send<DeviceImageView, ConfirmDeviceImageMsg>(
    DEVICE_CMD.CONFIRM_IMAGE_UPLOAD, { deviceId, imageId, actor });
}

@Roles(Role.ADMIN, Role.MANAGER)
@Delete(':id/images/:imageId')
removeImage(@Param('id') deviceId: string, @Param('imageId', ParseUUIDPipe) imageId: string, @CurrentUser() actor: JwtPayload) {
  return this.bus.send<{ message: string }, RemoveDeviceImageMsg>(
    DEVICE_CMD.REMOVE_IMAGE, { deviceId, imageId, actor });
}
```

Gateway **không** có route nhận file; nó chỉ chuyển JSON nhỏ. Việc hiển thị ảnh không cần route riêng vì URL nằm trong `DeviceView`.

### 6.5 Dọn bản ghi `UPLOADING` quá hạn (mẫu, mỗi service có bảng file tự thêm)

Client xin URL rồi bỏ dở thì sẽ để lại bản ghi `UPLOADING` (và có thể cả object). Dọn bằng timer đơn giản, không cần thêm package:

```ts
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { StorageService } from '@app/storage';

const PENDING_TTL_MS = 60 * 60 * 1000;     // 60 phút
const EVERY_MS = 30 * 60 * 1000;           // quét mỗi 30 phút

@Injectable()
export class ImageCleanupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ImageCleanupService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.run(), EVERY_MS);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    const stale = await this.prisma.deviceImage.findMany({
      where: { status: 'UPLOADING', createdAt: { lt: new Date(Date.now() - PENDING_TTL_MS) } },
      take: 100,
    });
    for (const img of stale) {
      try {
        await this.storage.deleteObject(img.objectKey);               // object trước, bản ghi sau
        await this.prisma.deviceImage.delete({ where: { id: img.id } });
      } catch (e) {
        this.logger.warn(`Dọn ảnh ${img.id} thất bại: ${(e as Error).message}`);
      }
    }
    if (stale.length) this.logger.log(`Đã dọn ${stale.length} ảnh upload dở`);
  }
}
```

Khai báo trong module của service. `ai-assistant-service` có đoạn tương tự đã gộp sẵn trong `DocumentsService`.

### 6.6 Mẫu frontend

```ts
// Upload: xin URL → PUT thẳng lên bucket → confirm
async function uploadDeviceImage(deviceId: string, file: File) {
  const ticket = await api.post(`/devices/${deviceId}/images/upload-url`, {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file });
  if (!put.ok) throw new Error('Upload thất bại');
  return api.post(`/devices/${deviceId}/images/${ticket.imageId}/confirm`); // → DeviceImageView
}

// Hiển thị: URL nằm sẵn trong response của thiết bị
const device = await api.get(`/devices/${id}`);
// <img src={device.images[0]?.url} loading="lazy" />   (không có ảnh → hiển thị placeholder)
```

Lưu ý hiển thị:

- URL hết hạn sau `DOWNLOAD_URL_TTL_SECONDS` (mặc định 10 phút), nằm cùng `expiresAt`. Khi ảnh lỗi 403 hoặc gần hết hạn, gọi lại API để lấy URL mới. Không lưu URL vào database.
- URL mới mỗi lần nên trình duyệt không cache được ảnh giữa các lần tải lại dữ liệu. Chấp nhận được ở quy mô này.
- Chưa có ảnh thu nhỏ (thumbnail): danh sách tải ảnh gốc (≤ 5 MB). Nếu chậm, nén/resize ảnh phía client trước khi upload, và chỉ trả ảnh đại diện trong danh sách.

---

## 7. Checklist cho một service mới muốn lưu/hiển thị file hoặc ảnh

1. **Chọn `purpose`.** Dùng loại có sẵn hoặc thêm vào `FILE_PURPOSES` + `STORAGE_POLICIES` (định dạng, kích thước tối đa).
2. **Schema:** bảng file riêng (không nhét mảng vào bảng chính) với `objectKey` unique, `status`, `mimeType`, `fileName`, `sizeBytes`, `uploadedBy`; khóa ngoại tới đối tượng cha. Migration/`db pull`.
3. **Contract** (`libs/shared/src/contracts/<service>/`): lệnh `request_<x>_upload`, `confirm_<x>_upload`, `remove_<x>`; message dùng `RequestUploadDto`; ticket kế thừa `UploadTicket` (+ id); view kế thừa `DownloadUrl` (+ id).
4. **`AppModule`:** `import { StorageModule } from '@app/storage';` (một lần). Không cần `BusService`, không cần kết nối nào thêm.
5. **Service:** viết bốn việc ở mục 5; thêm giới hạn số file mỗi đối tượng nếu cần; **xóa object trước, bản ghi sau**.
6. **Xóa đối tượng cha:** xóa hết object của các file con trước rồi mới xóa đối tượng.
7. **Dọn `UPLOADING` quá hạn** (mẫu mục 6.5).
8. **Gateway:** thêm route `upload-url`, `confirm`, xóa; gắn `@Roles(...)`. **Không** làm route nhận file.
9. **Frontend:** upload 3 bước; hiển thị bằng URL trong response; xử lý URL hết hạn.
10. **Kiểm thử:**
    - Xin upload với `mimeType` sai hoặc `sizeBytes` quá lớn (400).
    - `confirm` khi chưa PUT file (400, bản ghi còn nguyên, PUT rồi `confirm` lại thì thành công).
    - Đổi đuôi `.exe` thành `.png` rồi upload và `confirm` (400; bản ghi và object đều biến mất).
    - PUT thiếu hoặc sai header `Content-Type` (bucket từ chối).
    - PUT bằng URL đã hết hạn (bucket trả 403).
    - Vượt số file tối đa; xóa file rồi kiểm tra object đã biến mất khỏi bucket; xóa đối tượng cha rồi kiểm tra các file con cũng mất.
    - Origin chưa khai báo trong CORS của bucket (lỗi CORS ở trình duyệt).
    - Bỏ dở upload quá `PENDING_TTL` rồi kiểm tra job dọn (để thử nhanh: đặt TTL nhỏ).
11. **Cập nhật `folder_structure.md`** cho service đó (lệnh `cmd.<service>.*` mới).

---

## 8. Chạy thử

Thư viện không tự chạy được, nên kiểm thử qua service đầu tiên dùng nó (`device-service` hoặc `ai-assistant-service`):

1. Log của service có dòng `Đã kết nối bucket "..."` (hoặc cảnh báo HeadBucket nếu token không có quyền đó, không sao).
2. Chạy kịch bản ở mục 7 bước 10, hoặc kịch bản `curl` trong `ai-assistant-service_instruction.md` (mục 11).
3. Trong dashboard R2, object có key dạng `device-image/2026/<uuid>.png`; sau khi xóa file thì object biến mất.

---

## 9. Docker

Không có block compose mới. Các service dùng thư viện cần biến `S3_*` từ `.env` gốc (compose đã nạp `env_file: [.env, ...]`). Container cần truy cập internet ra endpoint của bucket (R2) và Neon.

---

## 10. Lưu ý và hạn chế

- **Bucket luôn private.** Không bật public access. Mọi truy cập đi qua URL có chữ ký.
- **Khóa bucket có mặt ở mọi service dùng file** (và ở mọi container nếu để trong `.env` gốc). Muốn cô lập, dùng bucket và token riêng cho từng service, hoặc đưa `S3_*` vào `.env` riêng từng service.
- **Chính sách và dọn rác phân tán:** mỗi service tự có job dọn `UPLOADING` và tự đếm dung lượng. Nếu về sau có nhiều service dùng file và cần quản lý tập trung (hạn mức, thống kê, kiểm soát truy cập), hãy cân nhắc quay lại thiết kế `file-service` riêng.
- **Chưa quét virus**, chưa tạo thumbnail, chưa xử lý EXIF/xoay ảnh. Kiểm tra định dạng chỉ dựa vào vài byte đầu và kích thước.
- Bucket buộc client dùng đúng `Content-Type` đã khai báo khi PUT (chữ ký), nhưng **giới hạn kích thước thật sự chỉ được kiểm lúc `confirm`**. File quá lớn có thể nằm trong bucket đến lúc `confirm` hoặc đến lúc bị dọn.
- **Đổi nhà cung cấp** (R2 → B2/S3): chỉ đổi các biến `S3_*`; cần chuyển dữ liệu cũ sang bucket mới.
- **Backup**: object storage không thay thế sao lưu. Nếu dữ liệu quan trọng, bật versioning hoặc sao chép định kỳ sang bucket khác.
- Theo dõi mức dùng của gói miễn phí (số lượng file, dung lượng, số thao tác) trên dashboard của nhà cung cấp.
