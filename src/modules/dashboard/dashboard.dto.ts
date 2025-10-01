// dto/user-dashboard.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class NextPayoutDto {
  @ApiProperty({ description: 'Maturity date' })
  date: string;

  @ApiProperty({ description: 'amount' })
  amount: number;
}

export class PortfolioGrowthPointDto {
  @ApiProperty({ example: 'Jan', description: 'Month label for the chart' })
  month: string;

  @ApiProperty({ example: 50000, description: 'Total savings for this month' })
  savings: number;

  @ApiProperty({
    example: 30000,
    description: 'Total investments for this month',
  })
  investments: number;
}

export class ActiveLockupDto {
  @ApiProperty({
    example: 'Savings',
    description: 'Type of lockup (Savings or Investment)',
  })
  planType: string;

  @ApiProperty({ example: '99 Days', description: 'Duration of the lockup' })
  duration: string;

  @ApiProperty({ example: 50000, description: 'Amount locked in Naira' })
  balance: number;

  @ApiProperty({
    example: '2025-02-20',
    description: 'Maturity date of the lockup',
  })
  maturityDate: Date;
}

export class UserDashboardDto {
  @ApiProperty({ description: 'Current wallet balance' })
  walletBalance: number;

  @ApiProperty({ description: 'Total savings amount' })
  totalSavings: number;

  @ApiProperty({ description: 'Total invested amount' })
  totalInvestments: number;

  @ApiProperty({ description: 'Total invested amount' })
  totalProfit: number;

  @ApiProperty({ description: 'Total invested amount' })
  nextPayout: NextPayoutDto | null;

  @ApiProperty({ description: 'Number of active investments' })
  activeInvestments: number;

  @ApiProperty({ description: 'Recent transactions' })
  recentTransactions: any[];

  @ApiProperty({ type: [PortfolioGrowthPointDto] })
  chartData: PortfolioGrowthPointDto[];

  @ApiProperty({ type: [ActiveLockupDto] })
  activeLockup: ActiveLockupDto[];
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

  @ApiProperty({
    description: 'Recent transactions (latest 10)',
    required: false,
    type: [Object],
  })
  recentTransactions?: any[];

  @ApiProperty({
    description: 'Monthly deposit vs withdrawal trends (last 6 months)',
    required: false,
    type: [Object],
  })
  monthlyTrends?: { month: string; deposits: number; withdrawals: number }[];
}
