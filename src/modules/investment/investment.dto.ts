import { ApiProperty } from '@nestjs/swagger';

export class CreateInvestmentDto {
  @ApiProperty({ description: 'Wallet ID funding the investment' })
  walletId: string;

  @ApiProperty({ description: 'Investment product ID' })
  productId: string;

  @ApiProperty({ description: 'Amount to invest' })
  amount: number;
}

export class UpdateInvestmentDto {
  @ApiProperty({
    description: 'Update status of the investment',
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  })
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
