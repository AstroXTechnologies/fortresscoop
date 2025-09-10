import { ApiProperty } from '@nestjs/swagger';

export class Investment {
  @ApiProperty({ description: 'Unique investment ID' })
  id: string;

  @ApiProperty({ description: 'User ID who made the investment' })
  userId: string;

  @ApiProperty({ description: 'Wallet ID used to fund the investment' })
  walletId: string;

  @ApiProperty({ description: 'Investment product ID' })
  productId: string;

  @ApiProperty({ description: 'Amount invested' })
  amount: number;

  @ApiProperty({ description: 'Annual interest rate (e.g. 10 for 10%)' })
  interestRate: number;

  @ApiProperty({ description: 'Start date of the investment' })
  startDate: Date;

  @ApiProperty({ description: 'Maturity date of the investment' })
  maturityDate: Date;

  @ApiProperty({
    description: 'Current status of the investment',
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  })
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

  @ApiProperty({ description: 'Returns accrued so far' })
  returnsAccrued: number;
}
