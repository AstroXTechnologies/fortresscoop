import { ApiProperty } from '@nestjs/swagger';

export class WalletAdminSummaryDto {
  @ApiProperty({ description: 'Total successful deposit amount' })
  totalDepositsAmount: number;

  @ApiProperty({ description: 'Total successful withdrawal amount' })
  totalWithdrawalsAmount: number;

  @ApiProperty({ description: 'Count of pending transactions' })
  pendingTransactionsCount: number;

  @ApiProperty({ description: 'Count of failed transactions' })
  failedTransactionsCount: number;
}
