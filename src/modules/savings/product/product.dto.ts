import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSavingProductDto {
  @ApiProperty({ example: 'Standard 3-month' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Standard 99-day savings plan' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 99 })
  @IsNumber()
  durationInDays: number;

  @ApiProperty({ example: 14 })
  @IsNumber()
  interestRate: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  minAmount: number;

  @ApiProperty({ example: 1000000 })
  @IsOptional()
  @IsNumber()
  maxAmount?: number;
}

export class UpdateSavingProductDto extends PartialType(
  CreateSavingProductDto,
) {}
