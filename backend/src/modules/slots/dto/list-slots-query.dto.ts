import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const toArray = ({ value }: { value: unknown }): string[] =>
  Array.isArray(value) ? value : value !== undefined ? [value as string] : [];

/** LOGIC-007: фильтры каталога — date range (дефолт 7 дней), program_type[], chef_id[], only_available. */
export class ListSlotsQueryDto {
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  program_type?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID(undefined, { each: true })
  chef_id?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  only_available?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number;
}
