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
      const data = doc.data() as { amount?: number };
      return sum + (data?.amount ?? 0);
    }, 0);

    const investmentsRef = db
      .collection('investments')
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

    return {
      walletBalance,
      totalSavings,
      totalInvestments,
      activeInvestments,
      recentTransactions,
    };
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
