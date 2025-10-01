export interface PortfolioSliceDto {
  name: string;
  value: number;
  color?: string;
}

export interface MonthlyEarningDto {
  month: string; // e.g. Jan
  earnings: number;
}

export interface TotalGrowthPointDto {
  month: string;
  total: number;
}

export interface PerformanceMetricsDto {
  avgMonthlyReturnPct: number; // percentage value e.g. 1.8 for 1.8%
  annualGrowthRatePct: number;
  bestMonth: string | null; // month label
  returnPeriodMonths: number; // how many months of data considered
}

export interface UpcomingEventDto {
  type: 'SAVING_MATURITY' | 'INVESTMENT_MATURITY';
  date: Date;
  amount: number;
  label: string;
}

export interface UserAnalyticsDto {
  portfolioBreakdown: PortfolioSliceDto[];
  monthlyEarnings: MonthlyEarningDto[];
  totalGrowth: TotalGrowthPointDto[];
  performance: PerformanceMetricsDto;
  upcomingEvents: UpcomingEventDto[];
  summary: {
    totalPortfolio: number;
    totalProfit: number; // realized (matured) interest/returns
  };
}
