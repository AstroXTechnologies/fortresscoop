import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from 'src/main';
import { InvestmentProduct } from 'src/modules/investment/product/product.model';
import { Wallet } from 'src/modules/wallet/wallet.model';
import { CreateInvestmentDto, UpdateInvestmentDto } from './investment.dto';
import { Investment } from './investment.model';

export interface PreviewInvestment {
  principal: number;
  interestRate: number;
  durationInDays: number;
  expectedReturns: number;
  maturityDate: Date;
}

@Injectable()
export class InvestmentsService {
  private collection = 'investments';
  private walletCollection = 'wallets';
  private productCollection = 'products';

  async create(userId: string, dto: CreateInvestmentDto): Promise<Investment> {
    const walletRef = db.collection(this.walletCollection).doc(dto.walletId);
    const walletSnap = await walletRef.get();

    if (!walletSnap.exists) throw new BadRequestException('Wallet not found');
    const walletData = walletSnap.data() as Wallet;

    if (walletData.balance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Get product details
    const productRef = db.collection(this.productCollection).doc(dto.productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) throw new BadRequestException('Product not found');
    const product = productSnap.data() as InvestmentProduct;

    const startDate = new Date();
    const maturityDate = new Date(
      startDate.getTime() + product.durationInDays * 24 * 60 * 60 * 1000,
    );

    const investment: Investment = {
      id: db.collection(this.collection).doc().id,
      userId,
      walletId: dto.walletId,
      productId: dto.productId,
      amount: dto.amount,
      interestRate: product.interestRate,
      startDate,
      maturityDate,
      status: 'ACTIVE',
      returnsAccrued: 0,
    };

    // Deduct wallet balance
    await walletRef.update({
      balance: walletData.balance - dto.amount,
    });

    await db.collection(this.collection).doc(investment.id).set(investment);
    return investment;
  }

  async findAll(userId: string): Promise<Investment[]> {
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Investment);
  }

  async update(id: string, dto: UpdateInvestmentDto): Promise<Investment> {
    const ref = db.collection(this.collection).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new BadRequestException('Investment not found');

    await ref.update({ status: dto.status });
    const updated = await ref.get();
    return updated.data() as Investment;
  }

  /**
   * Compute a preview for an investment given an amount and productId.
   * Uses the product's interestRate and durationInDays stored in DB.
   */
  async preview(amount: number, productId: string): Promise<PreviewInvestment> {
    if (!amount || amount <= 0) throw new BadRequestException('Invalid amount');

    const productRef = db.collection(this.productCollection).doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) throw new BadRequestException('Product not found');
    const product = productSnap.data() as InvestmentProduct;

    const expectedReturns = parseFloat(
      (amount * (product.interestRate / 100)).toFixed(2),
    );

    const now = new Date();
    const maturityDate = new Date(
      now.getTime() + product.durationInDays * 24 * 60 * 60 * 1000,
    );

    return {
      principal: amount,
      interestRate: product.interestRate,
      durationInDays: product.durationInDays,
      expectedReturns,
      maturityDate,
    };
  }

  // Called by cron job or scheduler
  async settleInvestments(): Promise<void> {
    const now = new Date();
    const snapshot = await db
      .collection(this.collection)
      .where('status', '==', 'ACTIVE')
      .get();

    for (const doc of snapshot.docs) {
      const investment = doc.data() as Investment;
      if (now >= new Date(investment.maturityDate)) {
        const totalReturn =
          investment.amount * (1 + investment.interestRate / 100); // simple interest

        // Credit wallet
        const walletRef = db
          .collection(this.walletCollection)
          .doc(investment.walletId);

        const walletSnap = await walletRef.get();
        if (walletSnap.exists) {
          const walletData = walletSnap.data() as Wallet;
          await walletRef.update({
            balance: walletData.balance + totalReturn,
          });
        }

        await doc.ref.update({
          status: 'COMPLETED',
          returnsAccrued: totalReturn - investment.amount,
        });
      }
    }
  }
}
