import { Type } from "class-transformer";
import { 
    IsOptional, IsInt, Min, Max, IsString, Matches, IsDateString
} from "class-validator";

export class FindQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
    
    @IsOptional() @IsString() search?: string;

        @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'from phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'from không phải ngày hợp lệ' },
    )
    from?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'to phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'to không phải ngày hợp lệ' },
    )
    to?: string;

    @IsOptional()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'above phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    above?: string;
    
    @IsOptional()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'below phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    below?: string;
}