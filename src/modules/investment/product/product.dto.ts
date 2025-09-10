import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateInvestmentProductDto {
  @ApiProperty({
    description: 'Name of the investment product',
    example: 'Fixed Deposit - 6 Months',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the investment product',
    example: 'Earn 12% annual returns by locking funds for 6 months.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Annual interest rate (%) for the investment',
    example: 12,
  })
  @IsNumber()
  @IsPositive()
  interestRate: number;

  @ApiProperty({
    description: 'Duration of the investment in days',
    example: 180,
  })
  @IsNumber()
  @IsPositive()
  durationInDays: number;

  @ApiProperty({
    description: 'Minimum amount allowed for investment',
    example: 1000,
  })
  @IsNumber()
  @Min(100)
  minAmount: number;

  @ApiProperty({
    description: 'Maximum amount allowed for investment (optional)',
    example: 100000,
  })
  @IsNumber()
  @IsOptional()
  maxAmount?: number;
}

export class UpdateInvestmentProductDto extends PartialType(
  CreateInvestmentProductDto,
) {}
