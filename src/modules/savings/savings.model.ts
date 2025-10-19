export class Savings {
  id: string;
  userId: string;
  planType: string;
  interestRate: number;
  expectedInterest: number;
  balance: number;
  goalAmount?: number;
  durationInDays?: number;
  startDate: Date;
  maturityDate?: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface PreviewSaving {
  principal: number;
  interestRate: number; // in %
  duration: number; // in days
  expectedInterest: number;
  maturityDate: Date; // ISO date string
}
