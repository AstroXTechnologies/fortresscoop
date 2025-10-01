import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from 'src/main';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import {
  MonthlyEarningDto,
  PerformanceMetricsDto,
  PortfolioSliceDto,
  TotalGrowthPointDto,
  UpcomingEventDto,
  UserAnalyticsDto,
} from './dto/user-analytics.dto';

@Injectable()
export class AnalyticsService {
  // Generic scaffold endpoints (retained if needed later)
  create(createAnalyticsDto: CreateAnalyticsDto) {
    return { message: 'Not implemented', payload: createAnalyticsDto };
  }

  findAll() {
    return { message: 'Not implemented' };
  }

  findOne(id: number) {
    return { message: 'Not implemented', id };
  }

  update(id: number, updateAnalyticsDto: UpdateAnalyticsDto) {
    return { message: 'Not implemented', id, payload: updateAnalyticsDto };
  }

  remove(id: number) {
    return { message: 'Not implemented', id };
  }

  /**
   * Build real analytics for a user by aggregating savings, investments, wallet & transactions.
   */
  async getUserAnalytics(userId: string): Promise<UserAnalyticsDto> {
    if (!userId) throw new NotFoundException('User id required');

    // Parallel fetch
    const [walletSnap, savingsSnap, investmentsSnap, txSnap] =
      await Promise.all([
        db.collection('wallets').where('userId', '==', userId).limit(1).get(),
        db.collection('savings').where('userId', '==', userId).get(),
        db.collection('userInvestments').where('userId', '==', userId).get(),
        db
          .collection('transactions')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(500)
          .get(),
      ]);

    const walletBalance = walletSnap.empty
      ? 0
      : Number(walletSnap.docs[0].data()?.balance || 0);

    const now = new Date();
    let maturedProfit = 0;

    // Savings analytics
    let totalSavingsBalance = 0;
    const upcomingEvents: UpcomingEventDto[] = [];
    savingsSnap.docs.forEach((d) => {
      const data = d.data() as {
        balance?: number;
        expectedInterest?: number;
        maturityDate?: FirebaseFirestore.Timestamp;
      };
      totalSavingsBalance += data.balance || 0;
      const maturityDate = data.maturityDate?.toDate();
      if (maturityDate) {
        if (maturityDate <= now) {
          maturedProfit += data.expectedInterest || 0;
        } else {
          upcomingEvents.push({
            type: 'SAVING_MATURITY',
            date: maturityDate,
            amount: data.expectedInterest || 0,
            label: 'Savings Maturity',
          });
        }
      }
    });

    // Investment analytics
    let totalInvestmentBalance = 0;
    investmentsSnap.docs.forEach((d) => {
      const data = d.data() as {
        amount?: number;
        returnsAccrued?: number;
        maturityDate?: FirebaseFirestore.Timestamp;
      };
      totalInvestmentBalance += data.amount || 0;
      const maturityDate = data.maturityDate?.toDate();
      if (maturityDate) {
        if (maturityDate <= now) {
          maturedProfit += data.returnsAccrued || 0;
        } else {
          upcomingEvents.push({
            type: 'INVESTMENT_MATURITY',
            date: maturityDate,
            amount: data.returnsAccrued || 0,
            label: 'Investment Maturity',
          });
        }
      }
    });

    // Sort upcoming events ascending & limit to next 5
    upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    const trimmedEvents = upcomingEvents.slice(0, 5);

    // Portfolio breakdown
    const portfolioBreakdown: PortfolioSliceDto[] = [
      { name: 'Savings', value: totalSavingsBalance, color: '#059669' },
      { name: 'Investments', value: totalInvestmentBalance, color: '#2563EB' },
      { name: 'Wallet', value: walletBalance, color: '#6B7280' },
    ].filter((s) => s.value > 0);

    // Monthly earnings from matured profit distribution based on transactions of type INTEREST / RETURNS if exist
    const monthlyEarningsMap: Record<string, number> = {};
    txSnap.docs.forEach((d) => {
      const data = d.data() as {
        createdAt?: FirebaseFirestore.Timestamp;
        type?: string;
        amount?: number;
        metaType?: string; // custom field if exists
      };
      const createdAt = data.createdAt?.toDate();
      if (!createdAt) return;
      const isEarning =
        data.type === 'PROFIT' ||
        data.metaType === 'SAVINGS_INTEREST' ||
        data.metaType === 'INVESTMENT_RETURN';
      if (!isEarning) return;
      const key = createdAt.toLocaleString('default', { month: 'short' });
      monthlyEarningsMap[key] =
        (monthlyEarningsMap[key] || 0) + Number(data.amount || 0);
    });
    const monthlyEarnings: MonthlyEarningDto[] = Object.entries(
      monthlyEarningsMap,
    ).map(([month, earnings]) => ({ month, earnings }));

    // Total growth points (cumulative)
    const growthMap: Record<string, number> = {};
    const addGrowth = (createdAt: Date | undefined, amount: number) => {
      if (!createdAt) return;
      const key = createdAt.toLocaleString('default', { month: 'short' });
      growthMap[key] = (growthMap[key] || 0) + amount;
    };
    savingsSnap.docs.forEach((d) => {
      const data = d.data() as {
        balance?: number;
        createdAt?: FirebaseFirestore.Timestamp;
      };
      addGrowth(data.createdAt?.toDate(), data.balance || 0);
    });
    investmentsSnap.docs.forEach((d) => {
      const data = d.data() as {
        amount?: number;
        createdAt?: FirebaseFirestore.Timestamp;
      };
      addGrowth(data.createdAt?.toDate(), data.amount || 0);
    });
    // Convert to cumulative timeline (order not guaranteed by map)
    const monthOrder = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const ordered = Object.entries(growthMap).sort(
      (a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]),
    );
    let running = 0;
    const totalGrowth: TotalGrowthPointDto[] = ordered.map(([month, delta]) => {
      running += delta;
      return { month, total: running };
    });

    // Performance metrics (simple heuristics)
    const monthsCount = totalGrowth.length || 1;
    const finalTotal = running;
    const avgMonthlyReturnPct = monthsCount
      ? (maturedProfit / monthsCount / (finalTotal || 1)) * 100
      : 0;
    const annualGrowthRatePct = avgMonthlyReturnPct * 12;
    let bestMonth: string | null = null;
    let bestValue = -Infinity;
    monthlyEarnings.forEach((m) => {
      if (m.earnings > bestValue) {
        bestValue = m.earnings;
        bestMonth = m.month;
      }
    });
    const performance: PerformanceMetricsDto = {
      avgMonthlyReturnPct: Number(avgMonthlyReturnPct.toFixed(2)),
      annualGrowthRatePct: Number(annualGrowthRatePct.toFixed(2)),
      bestMonth,
      returnPeriodMonths: monthsCount,
    };

    return {
      portfolioBreakdown,
      monthlyEarnings,
      totalGrowth,
      performance,
      upcomingEvents: trimmedEvents,
      summary: {
        totalPortfolio:
          walletBalance + totalSavingsBalance + totalInvestmentBalance,
        totalProfit: maturedProfit,
      },
    };
  }
}
