// dto/user-dashboard.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserDashboardDto {
  @ApiProperty({ description: 'Current wallet balance' })
  walletBalance: number;

  @ApiProperty({ description: 'Total savings amount' })
  totalSavings: number;

  @ApiProperty({ description: 'Total invested amount' })
  totalInvestments: number;

  @ApiProperty({ description: 'Number of active investments' })
  activeInvestments: number;

  @ApiProperty({ description: 'Recent transactions' })
  recentTransactions: any[];
}

export class AdminDashboardDto {
  @ApiProperty({ description: 'Total registered users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total deposits across all wallets' })
  totalWalletBalance: number;

  @ApiProperty({ description: 'Total savings across system' })
  totalSavings: number;

  @ApiProperty({ description: 'Total investments across system' })
  totalInvestments: number;

  @ApiProperty({ description: 'Pending withdrawals count' })
  pendingWithdrawals: number;

  @ApiProperty({ description: 'Top 5 active users by investments or savings' })
  topUsers: any[];
}
