import { Type } from "class-transformer";
import { 
    IsOptional, IsInt, Min, Max, IsString,
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
}