import { Injectable } from '@nestjs/common';
import { db } from 'src/main';
import {
  ProfitControlDto,
  ProfitPayoutItemDto,
  ProfitSummaryDto,
  RetryFailedResponseDto,
  TriggerAllResponseDto,
  TriggerPayoutInputDto,
  TriggerPayoutResponseDto,
  UpcomingPayoutDto,
} from './profit.dto';

interface SavingsDoc {
  userId?: string;
  planType?: string;
  expectedInterest?: number;
  maturityDate?: FirebaseFirestore.Timestamp;
  createdAt?: FirebaseFirestore.Timestamp;
}

interface UserInvestmentDoc {
  userId?: string;
  productId?: string;
  returnsAccrued?: number;
  maturityDate?: FirebaseFirestore.Timestamp;
  createdAt?: FirebaseFirestore.Timestamp;
}

@Injectable()
export class ProfitService {
  private todayRange() {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }

  async getSummary(): Promise<ProfitSummaryDto> {
    // NOTE: Initial naive implementation (fetch all) – optimize with queries/indexes later
    const savingsSnap = await db.collection('savings').get();
    const investmentsSnap = await db.collection('userInvestments').get();

    const { start, end } = this.todayRange();
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);

    let totalPayoutsToday = 0;
    let totalMonth = 0;
    let nextScheduled: { date: Date; amount: number; planName: string } | null =
      null;

    const considerNext = (date: Date, amount: number, planName: string) => {
      if (!nextScheduled || date < nextScheduled.date) {
        nextScheduled = { date, amount, planName };
      }
    };

    // Savings matured profits
    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as SavingsDoc;
      const maturityDate = data.maturityDate?.toDate();
      if (!maturityDate) return;
      const amount = data.expectedInterest || 0;
      if (maturityDate >= monthStart && maturityDate <= end) {
        totalMonth += amount;
      }
      if (maturityDate >= start && maturityDate <= end) {
        totalPayoutsToday += amount;
      } else if (maturityDate > end) {
        considerNext(maturityDate, amount, data.planType || 'Savings Plan');
      }
    });

    // Investments matured profits
    investmentsSnap.docs.forEach((doc) => {
      const data = doc.data() as UserInvestmentDoc;
      const maturityDate = data.maturityDate?.toDate();
      if (!maturityDate) return;
      const amount = data.returnsAccrued || 0;
      if (maturityDate >= monthStart && maturityDate <= end) {
        totalMonth += amount;
      }
      if (maturityDate >= start && maturityDate <= end) {
        totalPayoutsToday += amount;
      } else if (maturityDate > end) {
        considerNext(
          maturityDate,
          amount,
          data.productId || 'Investment Product',
        );
      }
    });

    // Initially no failure tracking
    const failedPayouts = 0;
    const failedTransactions = 0;
    const scheduledPayouts = nextScheduled ? 1 : 0; // simplistic
    const successRate =
      failedPayouts === 0 ? 100 : Math.max(0, 100 - failedPayouts); // placeholder
    const dayOfMonth = new Date().getDate();
    const avgDaily = dayOfMonth > 0 ? totalMonth / dayOfMonth : 0;

    return {
      totalPayoutsToday,
      scheduledPayouts,
      failedPayouts,
      successRate,
      totalMonth,
      avgDaily,
      failedTransactions,
      nextScheduled,
    };
  }

  async getRecentPayouts(limit = 10): Promise<ProfitPayoutItemDto[]> {
    const savingsSnap = await db.collection('savings').get();
    const investmentsSnap = await db.collection('userInvestments').get();
    const today = new Date();

    // Group matured today/previous days up to limit by maturityDate+plan identifier
    type Key = string;
    const groups: Record<Key, ProfitPayoutItemDto> = {};

    const add = (
      planId: string,
      planName: string,
      maturityDate: Date,
      amount: number,
    ) => {
      const dayKey = maturityDate.toISOString().slice(0, 10);
      const key = `${planId}:${dayKey}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          planId,
          planName,
          totalAmount: 0,
          recipientsCount: 0,
          completedPayouts: 0,
          failedPayouts: 0,
          status: maturityDate <= today ? 'completed' : 'scheduled',
          scheduledDate: maturityDate,
          completedDate: maturityDate <= today ? maturityDate : null,
          type: 'daily',
        } as ProfitPayoutItemDto;
      }
      groups[key].totalAmount += amount;
      groups[key].recipientsCount += 1;
      if (maturityDate <= today) groups[key].completedPayouts += 1;
    };

    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as SavingsDoc;
      const maturityDate = data.maturityDate?.toDate();
      if (!maturityDate) return;
      if (!data.expectedInterest) return;
      add(
        data.planType || 'savings',
        data.planType || 'Savings Plan',
        maturityDate,
        data.expectedInterest,
      );
    });

    investmentsSnap.docs.forEach((doc) => {
      const data = doc.data() as UserInvestmentDoc;
      const maturityDate = data.maturityDate?.toDate();
      if (!maturityDate) return;
      add(
        data.productId || 'investment',
        data.productId || 'Investment Product',
        maturityDate,
        data.returnsAccrued || 0,
      );
    });

    const all = Object.values(groups).sort(
      (a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime(),
    );
    return all.slice(0, limit);
  }

  async getUpcoming(limit = 4): Promise<UpcomingPayoutDto[]> {
    const savingsSnap = await db.collection('savings').get();
    const investmentsSnap = await db.collection('userInvestments').get();
    const now = new Date();
    const upcoming: UpcomingPayoutDto[] = [];

    const pushUpcoming = (
      planName: string,
      amount: number,
      recipients: number,
      date: Date,
    ) => {
      upcoming.push({ planName, amount, recipients, date, type: 'daily' });
    };

    // Aggregate by future maturity date per plan
    type Key = string;
    const agg: Record<
      Key,
      { amount: number; recipients: number; planName: string; date: Date }
    > = {};

    const accumulate = (
      planName: string,
      maturityDate: Date,
      amount: number,
    ) => {
      if (maturityDate <= now) return;
      const dayKey = `${planName}:${maturityDate.toISOString().slice(0, 10)}`;
      if (!agg[dayKey]) {
        agg[dayKey] = {
          amount: 0,
          recipients: 0,
          planName,
          date: maturityDate,
        };
      }
      agg[dayKey].amount += amount;
      agg[dayKey].recipients += 1;
    };

    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as SavingsDoc;
      const maturityDate = data.maturityDate?.toDate();
      if (!maturityDate) return;
      accumulate(
        data.planType || 'Savings Plan',
        maturityDate,
        data.expectedInterest || 0,
      );
    });

    investmentsSnap.docs.forEach((doc) => {
      const data = doc.data() as UserInvestmentDoc;
      const maturityDate = data.maturityDate?.toDate();
      if (!maturityDate) return;
      accumulate(
        data.productId || 'Investment Product',
        maturityDate,
        data.returnsAccrued || 0,
      );
    });

    Object.values(agg)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, limit)
      .forEach((g) => pushUpcoming(g.planName, g.amount, g.recipients, g.date));

    return upcoming;
  }

  async triggerManualPayout(
    input: TriggerPayoutInputDto,
  ): Promise<TriggerPayoutResponseDto> {
    // Placeholder – simulate enqueue with minimal validation
    if (!input.planId) {
      return { accepted: false, message: 'planId required' };
    }
    // Simulate async side-effect
    await Promise.resolve();
    return { accepted: true, message: 'Payout trigger accepted (stub)' };
  }

  // --- Control state helpers ---
  private controlDocRef() {
    return db.collection('system').doc('profitControl');
  }

  async getControlState(): Promise<ProfitControlDto> {
    const snap = await this.controlDocRef().get();
    const raw = (snap.data() || {}) as Partial<
      ProfitControlDto & Record<string, unknown>
    >;
    return {
      mode: raw.mode === 'manual' ? 'manual' : 'auto',
      paused: Boolean(raw.paused),
      lastTriggerAllAt:
        raw.lastTriggerAllAt instanceof Date ? raw.lastTriggerAllAt : null,
      lastRetryFailedAt:
        raw.lastRetryFailedAt instanceof Date ? raw.lastRetryFailedAt : null,
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : null,
    };
  }

  async setMode(mode: 'auto' | 'manual') {
    await this.controlDocRef().set(
      {
        mode,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    return this.getControlState();
  }

  async pauseAll(paused: boolean) {
    await this.controlDocRef().set(
      { paused, updatedAt: new Date() },
      { merge: true },
    );
    return this.getControlState();
  }

  async triggerAll(): Promise<TriggerAllResponseDto> {
    // For now just compute number of matured groups (like getRecentPayouts filtering completed vs scheduled)
    const payouts = await this.getRecentPayouts(500);
    const candidates = payouts.filter((p) => p.status === 'scheduled').length;
    await this.controlDocRef().set(
      { lastTriggerAllAt: new Date(), updatedAt: new Date() },
      { merge: true },
    );
    return { accepted: true, candidates };
  }

  async retryFailed(): Promise<RetryFailedResponseDto> {
    const payouts = await this.getRecentPayouts(500);
    const failed = payouts.filter((p) => p.status === 'failed').length;
    await this.controlDocRef().set(
      { lastRetryFailedAt: new Date(), updatedAt: new Date() },
      { merge: true },
    );
    return { accepted: true, retried: failed };
  }
}
