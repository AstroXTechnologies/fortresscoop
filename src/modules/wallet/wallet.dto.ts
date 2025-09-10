import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ description: 'User ID to link this wallet to' })
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Currency for this wallet', example: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string = 'NGN';
}

export class UpdateWalletDto {
  @ApiProperty({
    description: 'Balance to update (careful: use transactions normally)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  balance?: number;
}
