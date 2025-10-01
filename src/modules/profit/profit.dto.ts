export class ProfitSummaryDto {
  totalPayoutsToday: number;
  scheduledPayouts: number;
  failedPayouts: number;
  successRate: number; // percentage
  totalMonth: number;
  avgDaily: number;
  failedTransactions: number;
  nextScheduled: { date: Date; amount: number; planName: string } | null;
}

export type PayoutStatus = 'scheduled' | 'completed' | 'processing' | 'failed';

export class ProfitPayoutItemDto {
  id: string; // synthetic grouping id
  planName: string;
  planId: string;
  totalAmount: number;
  recipientsCount: number;
  completedPayouts: number;
  failedPayouts: number;
  status: PayoutStatus;
  scheduledDate: Date;
  completedDate: Date | null;
  type: 'daily' | 'weekly' | 'monthly';
}

export class UpcomingPayoutDto {
  planName: string;
  amount: number;
  recipients: number;
  date: Date;
  type: 'daily' | 'weekly' | 'monthly';
}

export class TriggerPayoutInputDto {
  planId: string;
  planType: 'savings' | 'investment';
  payoutType: string; // scheduled-profit | bonus | principal | custom
  amountOverride?: number;
}

export class TriggerPayoutResponseDto {
  accepted: boolean;
  message: string;
}

// Payout control DTOs
export class ProfitControlDto {
  mode: 'auto' | 'manual';
  paused: boolean;
  lastTriggerAllAt?: Date | null;
  lastRetryFailedAt?: Date | null;
  updatedAt?: Date | null;
}

export class TriggerAllResponseDto {
  accepted: boolean;
  candidates: number; // approximate number of payout groups considered
}

export class RetryFailedResponseDto {
  accepted: boolean;
  retried: number; // number of failed groups retried
}
