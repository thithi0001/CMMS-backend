import { BadRequestException } from "@nestjs/common";

export function myParseDate(value: string | null | undefined, field: string): Date | undefined {
    if (value === undefined)
        return undefined;
    if (value === null)
        throw new BadRequestException(`${field} cannot be null`);

    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new BadRequestException(`${field} must be a valid date`);
    return date;
}