import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateUserInvestmentDto {
  @ApiProperty({
    description: 'ID of the user making the investment',
    example: 'user_123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'ID of the investment product',
    example: 'prod_abc',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Amount the user wants to invest',
    example: 5000,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class UpdateUserInvestmentDto extends PartialType(
  CreateUserInvestmentDto,
) {}
