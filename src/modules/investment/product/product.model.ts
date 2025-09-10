export class InvestmentProduct {
  id: string;
  name: string;
  description: string;
  interestRate: number;
  durationInDays: number;
  minAmount: number;
  maxAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}
