import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  slot_id!: string;

  @IsInt()
  @Min(1)
  @Max(6)
  seats_count!: number;

  @IsInt()
  @Min(0)
  @Max(6)
  rental_count!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  allergies?: string;
}
