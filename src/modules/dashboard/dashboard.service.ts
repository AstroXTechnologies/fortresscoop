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
    const recentTransactions = txSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
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
      const lockup = doc.data() as {
        balance: number;
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
        balance: lockup.balance,
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

    // Savings: sum current locked principal (balance) for active & completed (exclude closed / cancelled if any)
    const savingsSnap = await db.collection('savings').get();
    const totalSavings = savingsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as { balance?: number; status?: string };
      const status = (data.status || '').toUpperCase();
      if (['ACTIVE', 'COMPLETED'].includes(status)) {
        return sum + Number(data.balance || 0);
      }
      return sum;
    }, 0);

    // Investments can exist in two collections (legacy 'investments' and current 'userInvestments'). Sum both ACTIVE/MATURED/COMPLETED, exclude CANCELLED.
    const investmentsSnap = await db.collection('investments').get();
    const userInvestmentsSnap = await db.collection('userInvestments').get();
    const validInvestmentStatus = new Set(['ACTIVE', 'MATURED', 'COMPLETED']);
    const legacyTotal = investmentsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as { amount?: number; status?: string };
      if (validInvestmentStatus.has((data.status || '').toUpperCase())) {
        return sum + Number(data.amount || 0);
      }
      return sum;
    }, 0);
    const userInvTotal = userInvestmentsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as { amount?: number; status?: string };
      if (validInvestmentStatus.has((data.status || '').toUpperCase())) {
        return sum + Number(data.amount || 0);
      }
      return sum;
    }, 0);
    const totalInvestments = legacyTotal + userInvTotal;

    const withdrawalsSnap = await db
      .collection('withdrawals')
      .where('status', '==', 'PENDING')
      .get();
    const pendingWithdrawals = withdrawalsSnap.size;

    // 🔹 Find top 5 active users by investments + savings
    const userStats: Record<string, number> = {};

    savingsSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        userId?: string;
        balance?: number;
        status?: string;
      };
      const userId = typeof data.userId === 'string' ? data.userId : '';
      if (
        userId &&
        ['ACTIVE', 'COMPLETED'].includes((data.status || '').toUpperCase())
      ) {
        userStats[userId] =
          (userStats[userId] || 0) + Number(data.balance || 0);
      }
    });
    // Include both legacy and userInvestments collection in top users aggregate
    const addInvToStats = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
      docs.forEach((doc) => {
        const data = doc.data() as {
          userId?: string;
          amount?: number;
          status?: string;
        };
        const userId = typeof data.userId === 'string' ? data.userId : '';
        if (
          userId &&
          validInvestmentStatus.has((data.status || '').toUpperCase())
        ) {
          userStats[userId] =
            (userStats[userId] || 0) + Number(data.amount || 0);
        }
      });
    };
    addInvToStats(investmentsSnap.docs);
    addInvToStats(userInvestmentsSnap.docs);

    const rawTopUsers = Object.entries(userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Fetch user documents for top users to enrich with fullName
    const topUserDocs = await Promise.all(
      rawTopUsers.map(async ([userId, total]) => {
        try {
          const doc = await db.collection('users').doc(userId).get();
          const data = doc.data() as { fullName?: string } | undefined;
          return { userId, total, fullName: data?.fullName || userId };
        } catch {
          return { userId, total, fullName: userId };
        }
      }),
    );

    // Recent transactions (latest 10)
    const txSnap = await db
      .collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    interface RecentTxRaw {
      id: string;
      userId?: string;
      type?: string;
      status?: string;
      amount?: number;
      createdAt?: any;
      [k: string]: any;
    }
    const recentTransactionsRaw: RecentTxRaw[] = txSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));
    // Collect distinct userIds to batch fetch names
    const recentUserIds = Array.from(
      new Set(
        recentTransactionsRaw
          .map((t) => t.userId)
          .filter((u): u is string => typeof u === 'string'),
      ),
    ).slice(0, 25); // limit safety
    const userDocs = await Promise.all(
      recentUserIds.map(async (uid) => {
        try {
          const doc = await db.collection('users').doc(uid).get();
          const d = doc.data() as { fullName?: string } | undefined;
          return { uid, fullName: d?.fullName || uid };
        } catch {
          return { uid, fullName: uid };
        }
      }),
    );
    const userNameMap = userDocs.reduce<Record<string, string>>((acc, u) => {
      acc[u.uid] = u.fullName;
      return acc;
    }, {});
    const recentTransactions = recentTransactionsRaw.map((t) => {
      const userFullName = t.userId ? userNameMap[t.userId] || t.userId : '';
      return { ...t, userFullName };
    });

    // Monthly trends (last 6 months) based on successful DEPOSIT/WITHDRAWAL
    const trendSnap = await db
      .collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(1000) // cap to avoid full scan
      .get();
    const trendMap: Record<string, { deposits: number; withdrawals: number }> =
      {};
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1); // approx last 6 months
    trendSnap.docs.forEach((doc) => {
      const data = doc.data() as {
        createdAt?: { toDate?: () => Date } | Date | string;
        type?: string;
        status?: string;
        amount?: number;
      };
      if (!data.createdAt) return;
      let createdAt: Date;
      if (data.createdAt instanceof Date) {
        createdAt = data.createdAt;
      } else if (typeof data.createdAt === 'string') {
        createdAt = new Date(data.createdAt);
      } else if (typeof data.createdAt === 'object' && data.createdAt.toDate) {
        createdAt = data.createdAt.toDate();
      } else {
        return;
      }
      if (createdAt < cutoff) return;
      if (data.status !== 'SUCCESS') return;
      const key = createdAt.toLocaleString('default', { month: 'short' });
      if (!trendMap[key]) trendMap[key] = { deposits: 0, withdrawals: 0 };
      if (data.type === 'DEPOSIT')
        trendMap[key].deposits += Number(data.amount || 0);
      if (data.type === 'WITHDRAWAL')
        trendMap[key].withdrawals += Number(data.amount || 0);
    });
    const monthlyTrends = Object.entries(trendMap).map(([month, v]) => ({
      month,
      ...v,
    }));

    return {
      totalUsers,
      totalWalletBalance,
      totalSavings,
      totalInvestments,
      pendingWithdrawals,
      topUsers: topUserDocs,
      recentTransactions,
      monthlyTrends,
    };
  }
}
