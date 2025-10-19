export class SavingProduct {
  id: string;
  name: string;
  description?: string;
  durationInDays: number;
  interestRate: number;
  minAmount: number;
  maxAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}
