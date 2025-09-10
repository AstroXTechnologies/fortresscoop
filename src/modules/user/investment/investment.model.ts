export class UserInvestment {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  startDate: Date;
  maturityDate: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  returnsAccrued: number;
  createdAt: Date;
  updatedAt: Date;
}
