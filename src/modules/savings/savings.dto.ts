import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';

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

  @ApiProperty({
    description: 'Type of savings plan',
    enum: SavingPlanType,
    example: SavingPlanType.FLEXIBLE,
  })
  @IsEnum(SavingPlanType)
  planType: SavingPlanType;

  @ApiProperty({ description: 'Amount to save initially', example: 2000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Optional savings goal (only for TARGET plan)',
    example: 50000,
    required: false,
  })
  @IsNumber()
  goalAmount?: number;

  @ApiProperty({
    description: 'Duration in days (for FIXED or TARGET plans)',
    example: 180,
    required: false,
  })
  @IsNumber()
  durationInDays?: number;
}

export class UpdateSavingDto extends PartialType(CreateSavingDto) {}
