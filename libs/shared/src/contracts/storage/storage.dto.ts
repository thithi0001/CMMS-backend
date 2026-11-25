import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Body xin URL upload; các route `.../upload-url` của mọi service dùng chung (có thể kế thừa để thêm trường). */
export class RequestUploadDto {
  @IsString() @IsNotEmpty() @MaxLength(255) fileName!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) mimeType!: string;
  @Type(() => Number) @IsInt() @Min(1) sizeBytes!: number;
}

export class DownloadUrlQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  download?: boolean; // true → trình duyệt tải về thay vì mở trực tiếp
}
