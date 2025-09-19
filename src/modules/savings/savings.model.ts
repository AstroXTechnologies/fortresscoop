import { SavingPlanType } from './savings.dto';

export class Saving {
  id: string;
  userId: string;
  planType: SavingPlanType;
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
