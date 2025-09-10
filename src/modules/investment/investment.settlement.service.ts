import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db } from 'src/main';
import { Investment } from 'src/modules/investment/investment.model';

@Injectable()
export class InvestmentSettlementService {
  private readonly logger = new Logger(InvestmentSettlementService.name);
  private collection = 'investments';

  /**
   * Runs every midnight to check matured investments
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleInvestmentSettlements() {
    this.logger.log('Checking for matured investments...');

    const snapshot = await db
      .collection(this.collection)
      .where('status', '==', 'ACTIVE')
      .get();

    const now = new Date();

    for (const doc of snapshot.docs) {
      const investment = doc.data() as Investment;
      const maturityDate = new Date(investment.maturityDate);

      if (maturityDate <= now) {
        this.logger.log(`Settling investment for user ${investment.userId}`);

        // Calculate returns
        const returnsAccrued =
          investment.amount * (investment.interestRate / 100);

        // Update user wallet
        const walletRef = db.collection('wallets').doc(investment.userId);
        await db.runTransaction(async (t) => {
          const walletSnap = await t.get(walletRef);
          const walletData = walletSnap.data() || { balance: 0 };

          t.update(walletRef, {
            balance: walletData.balance + investment.amount + returnsAccrued,
          });

          // Update investment status
          t.update(doc.ref, {
            status: 'COMPLETED',
            returnsAccrued,
            settledAt: now,
          });

          // Add settlement transaction
          const transactionRef = db.collection('transactions').doc();
          t.set(transactionRef, {
            id: transactionRef.id,
            userId: investment.userId,
            walletId: walletRef.id,
            type: 'INVESTMENT_SETTLEMENT',
            amount: investment.amount + returnsAccrued,
            status: 'SUCCESS',
            reference: `SETTLE-${Date.now()}`,
            createdAt: now,
          });
        });
      }
    }
  }
}
