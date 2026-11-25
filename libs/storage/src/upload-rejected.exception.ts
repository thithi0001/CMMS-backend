import { BadRequestException } from '@nestjs/common';

/** File đã upload nhưng không hợp lệ; object đã bị xóa khỏi bucket. Caller phải xóa bản ghi tương ứng. */
export class UploadRejectedException extends BadRequestException {}
