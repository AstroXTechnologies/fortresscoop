import { Injectable } from '@nestjs/common';
import { db } from 'src/main';
import { Wallet } from 'src/modules/wallet/wallet.model';
import { AdminDashboardDto, UserDashboardDto } from './dashboard.dto';

@Injectable()
export class DashboardService {
  /** 🔹 User Dashboard Summary */
  async getUserDashboard(userId: string): Promise<UserDashboardDto> {
    const walletRef = db.collection('wallets').where('userId', '==', userId);
    const walletSnap = await walletRef.get();
    const walletBalance = walletSnap.empty
      ? 0
      : ((walletSnap.docs[0].data() as Wallet).balance ?? 0);

    const savingsRef = db.collection('savings').where('userId', '==', userId);

    const savingsSnap = await savingsRef.get();
    const totalSavings = savingsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as { balance?: number };
      return sum + (data?.balance ?? 0);
    }, 0);

    const investmentsRef = db
      .collection('userInvestments')
      .where('userId', '==', userId);
    const investmentsSnap = await investmentsRef.get();

    const totalInvestments = investmentsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as { amount?: number };
      return sum + (data.amount || 0);
    }, 0);

    const activeInvestments = investmentsSnap.docs.filter(
      (doc) => doc.data().status === 'ACTIVE',
    ).length;

    const txRef = db
      .collection('transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5);
    const txSnap = await txRef.get();
    const recentTransactions = txSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const now = new Date();
    let totalProfit = 0;

    // ✅ Savings profit (only matured)
    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        maturityDate?: FirebaseFirestore.Timestamp;
        expectedInterest?: number;
      };
      const maturityDate = data.maturityDate?.toDate();
      if (maturityDate && maturityDate <= now) {
        totalProfit += data.expectedInterest || 0;
      }
    });

    // ✅ Investments profit (only matured)
    investmentsSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        maturityDate?: FirebaseFirestore.Timestamp;
        returnsAccrued?: number;
      };
      const maturityDate = data.maturityDate?.toDate();
      if (maturityDate && maturityDate <= now) {
        totalProfit += data.returnsAccrued || 0;
      }
    });

    let nextPayout: { date: Date; amount: number } | null = null;

    // Savings maturities
    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        maturityDate?: FirebaseFirestore.Timestamp;
        expectedInterest?: number;
      };
      const maturityDate = data.maturityDate?.toDate();
      if (maturityDate && maturityDate > now) {
        const amount = data.expectedInterest || 0;
        if (!nextPayout || maturityDate < nextPayout.date) {
          nextPayout = { date: maturityDate, amount };
        }
      }
    });

    // Investment maturities
    investmentsSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        maturityDate?: FirebaseFirestore.Timestamp;
        returnsAccrued?: number;
      };
      const maturityDate = data.maturityDate?.toDate();
      if (maturityDate && maturityDate > now) {
        const amount = data.returnsAccrued || 0;
        if (!nextPayout || maturityDate < nextPayout.date) {
          nextPayout = { date: maturityDate, amount };
        }
      }
    });
    const chartData: { month: string; savings: number; investments: number }[] =
      await this.getPortfolioGrowth(userId);

    // 🔹 Attach active lockup
    const activeLockup = await this.getActiveLockup(userId);

    return {
      walletBalance,
      totalSavings,
      totalInvestments,
      activeInvestments,
      recentTransactions,
      totalProfit,
      nextPayout,
      chartData,
      activeLockup,
    };
  }

  async getActiveLockup(userId: string) {
    const lockupSnap = await db
      .collection('savings')
      .where('userId', '==', userId)
      .where('status', '==', 'ACTIVE')
      .get();

    if (lockupSnap.empty) {
      return [];
    }

    const now = new Date();

    return lockupSnap.docs.map((doc) => {
      console.log(doc.data(), 'Lockup data');
      const lockup = doc.data() as {
        amount: number;
        startDate: FirebaseFirestore.Timestamp;
        maturityDate: FirebaseFirestore.Timestamp;
        planType?: string;
        duration?: number;
      };
      const maturityDate = lockup.maturityDate?.toDate();
      const startDate = lockup.startDate?.toDate();
      const remainingDays = maturityDate
        ? Math.max(
            Math.ceil(
              (maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            ),
            0,
          )
        : null;

      return {
        amount: lockup.amount,
        startDate,
        maturityDate,
        remainingDays,
        planType: lockup.planType ?? '',
        duration: String(
          lockup.duration ??
            (startDate && maturityDate
              ? Math.ceil(
                  (maturityDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0),
        ),
      };
    });
  }

  async getPortfolioGrowth(userId: string) {
    const savingsSnap = await db
      .collection('savings')
      .where('userId', '==', userId)
      .get();
    const investmentsSnap = await db
      .collection('userInvestments')
      .where('userId', '==', userId)
      .get();

    const monthlyStats: Record<
      string,
      { savings: number; investments: number }
    > = {};

    const addToMonth = (
      date: Date,
      type: 'savings' | 'investments',
      amount: number,
    ) => {
      const month = date.toLocaleString('default', { month: 'short' }); // e.g. Jan
      if (!monthlyStats[month]) {
        monthlyStats[month] = { savings: 0, investments: 0 };
      }
      monthlyStats[month][type] += amount;
    };

    // Savings
    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        balance?: number;
        createdAt?: FirebaseFirestore.Timestamp;
      };
      if (data.createdAt)
        addToMonth(data.createdAt.toDate(), 'savings', data.balance || 0);
    });

    // Investments
    investmentsSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        amount?: number;
        createdAt?: FirebaseFirestore.Timestamp;
      };
      if (data.createdAt)
        addToMonth(data.createdAt.toDate(), 'investments', data.amount || 0);
    });

    // Convert to array sorted by month
    return Object.entries(monthlyStats).map(([month, values]) => ({
      month,
      ...values,
    }));
  }
  /** 🔹 Admin Dashboard Summary */
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    const usersSnap = await db.collection('users').get();
    const totalUsers = usersSnap.size;

    const walletsSnap = await db.collection('wallets').get();

    const totalWalletBalance = walletsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as Wallet;
      return sum + (data.balance || 0);
    }, 0);

    const savingsSnap = await db.collection('savings').get();

    const totalSavings = savingsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as { amount?: number };
      return sum + (data?.amount ?? 0);
    }, 0);

    const investmentsSnap = await db.collection('investments').get();

    const totalInvestments = investmentsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as { amount?: number };
      return sum + (data.amount || 0);
    }, 0);

    const withdrawalsSnap = await db
      .collection('withdrawals')
      .where('status', '==', 'PENDING')
      .get();
    const pendingWithdrawals = withdrawalsSnap.size;

    // 🔹 Find top 5 active users by investments + savings
    const userStats: Record<string, number> = {};

    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as { userId?: string; amount?: number };
      const userId = typeof data.userId === 'string' ? data.userId : '';
      if (userId) {
        userStats[userId] = (userStats[userId] || 0) + (data.amount || 0);
      }
    });

    investmentsSnap.docs.forEach((doc) => {
      const data = doc.data() as { userId?: string; amount?: number };
      const userId = typeof data.userId === 'string' ? data.userId : '';
      if (userId) {
        userStats[userId] = (userStats[userId] || 0) + (data.amount || 0);
      }
    });

    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, total]) => ({ userId, total }));

    return {
      totalUsers,
      totalWalletBalance,
      totalSavings,
      totalInvestments,
      pendingWithdrawals,
      topUsers,
    };
  }
}
