import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString } from 'class-validator';

export enum SavingPlanType {
  FLEXIBLE = 'FLEXIBLE',
  FIXED = 'FIXED',
  TARGET = 'TARGET',
}

export class CreateSavingDto {
  @ApiProperty({
    description: 'User ID associated with the savings account',
    example: 'user_123',
  })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Amount to save initially', example: 2000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'ID of the saving product created by admin',
    example: 'save_prod_123',
  })
  @IsString()
  savingProductId: string;

  @ApiProperty({
    description: 'Duration in days (33, 66, 99, 122, 188, 366)',
    example: 99,
  })
  @IsNumber()
  durationInDays: number;
}

export class PreviewSavingDto {
  @ApiProperty({ description: 'Amount to save', example: 2000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Duration in days (33, 66, 99, 122, 188, 366)',
    example: 99,
  })
  @IsNumber()
  durationInDays: number;

  @ApiProperty({
    description: 'Optional: ID of the saving product created by admin',
    example: 'save_prod_123',
    required: false,
  })
  @IsString()
  savingProductId?: string;
}

export class UpdateSavingDto extends PartialType(CreateSavingDto) {}
