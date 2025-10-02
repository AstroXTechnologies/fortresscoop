import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { db, dbFireStore, db as firestore } from 'src/main';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { TransactionsService } from 'src/modules/transaction/transaction.service';
import { UserRole } from 'src/modules/user/user.model';
import { WalletManualAdjustDto } from './wallet.adjust.dto';
import { WalletAdminSummaryDto } from './wallet.admin.dto';

@ApAuthGuard(UserRole.ADMIN)
@ApiBearerAuth('access-token')
@ApiTags('wallets-admin')
@Controller('wallets/admin')
export class WalletAdminController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get aggregated wallet & transaction metrics for admin dashboard',
  })
  async getSummary(): Promise<WalletAdminSummaryDto> {
    const { items: txs } = await this.transactionsService.findAllAdmin({
      limit: 500,
    });
    let totalDepositsAmount = 0;
    let totalWithdrawalsAmount = 0;
    let pendingTransactionsCount = 0;
    let failedTransactionsCount = 0;

    for (const t of txs) {
      if (t.status === 'PENDING') pendingTransactionsCount++;
      if (t.status === 'FAILED') failedTransactionsCount++;
      if (t.status === 'SUCCESS' && t.type === 'DEPOSIT')
        totalDepositsAmount += Number(t.amount);
      if (t.status === 'SUCCESS' && t.type === 'WITHDRAWAL')
        totalWithdrawalsAmount += Number(t.amount);
    }

    return {
      totalDepositsAmount,
      totalWithdrawalsAmount,
      pendingTransactionsCount,
      failedTransactionsCount,
    };
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'List recent transactions across all users (admin)',
  })
  async getRecentTransactions(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('walletId') walletId?: string,
  ) {
    let parsed = Number(limit);
    if (!limit || isNaN(parsed) || parsed <= 0) parsed = 50;
    if (parsed > 500) parsed = 500;
    const { items: txs, nextCursor } =
      await this.transactionsService.findAllAdmin({
        limit: parsed,
        cursor,
        type,
        status,
        userId,
        walletId,
      });
    // Enrich with user full names (batch fetch)
    const userIds = Array.from(
      new Set(
        txs
          .map((t) => t.userId)
          .filter((u): u is string => typeof u === 'string'),
      ),
    ).slice(0, 500);
    const userDocs = await Promise.all(
      userIds.map(async (uid) => {
        try {
          const doc = await db.collection('users').doc(uid).get();
          const data = doc.data() as { fullName?: string } | undefined;
          return { uid, fullName: data?.fullName || uid };
        } catch {
          return { uid, fullName: uid };
        }
      }),
    );
    const nameMap = userDocs.reduce<Record<string, string>>((acc, u) => {
      acc[u.uid] = u.fullName;
      return acc;
    }, {});
    interface FirestoreTsLike {
      _seconds: number;
      _nanoseconds?: number;
    }
    return {
      items: txs.map((t) => {
        const raw: unknown = (t as unknown as { createdAt?: unknown })
          .createdAt;
        let createdAt: string | null = null;
        if (raw instanceof Date) {
          createdAt = raw.toISOString();
        } else if (typeof raw === 'string') {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) createdAt = d.toISOString();
        } else if (
          raw &&
          typeof raw === 'object' &&
          '_seconds' in (raw as Record<string, unknown>) &&
          typeof (raw as FirestoreTsLike)._seconds === 'number'
        ) {
          const ts = raw as FirestoreTsLike;
          createdAt = new Date(ts._seconds * 1000).toISOString();
        } else if (
          raw &&
          typeof raw === 'object' &&
          'toDate' in (raw as Record<string, unknown>) &&
          typeof (raw as { toDate?: unknown }).toDate === 'function'
        ) {
          const fn = (raw as { toDate: () => Date }).toDate;
          const d = fn();
          if (d instanceof Date && !isNaN(d.getTime()))
            createdAt = d.toISOString();
        }
        return {
          ...t,
          createdAt,
          userFullName: nameMap[t.userId] || t.userId,
        };
      }),
      nextCursor,
    };
  }

  @Post('adjust')
  @ApiOperation({
    summary: 'Manually adjust a user wallet balance (admin only)',
  })
  async adjustWallet(@Body() dto: WalletManualAdjustDto) {
    const email = (dto.userEmail || '').toLowerCase().trim();
    const userSnap = await firestore
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (userSnap.empty) throw new NotFoundException('User not found');
    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;

    // find wallet
    const walletSnap = await firestore
      .collection('wallets')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    if (walletSnap.empty) throw new NotFoundException('Wallet not found');
    const walletRef = walletSnap.docs[0].ref;
    const walletData = walletSnap.docs[0].data() as {
      balance?: number;
      currency?: string;
    };
    const prev = Number(walletData.balance || 0);
    const currency = walletData.currency || 'NGN';

    const delta = dto.type === 'credit' ? dto.amount : -dto.amount;
    const next = prev + delta;
    if (next < 0)
      throw new BadRequestException('Resulting balance cannot be negative');

    await walletRef.update({
      balance: next,
      updatedAt: dbFireStore.Timestamp.now(),
    });

    // record an admin adjustment transaction
    const txCollection = firestore.collection('transactions');
    const txRef = txCollection.doc();
    const txId = txRef.id;
    await txRef.set({
      id: txId,
      userId,
      type: dto.type === 'credit' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
      amount: Math.abs(delta),
      status: 'SUCCESS',
      currency,
      reason: dto.reason || null,
      createdAt: dbFireStore.Timestamp.now(),
      meta: { admin: true, manual: true },
    });

    return {
      success: true,
      previousBalance: prev,
      newBalance: next,
      currency,
      transactionId: txId,
    };
  }
}
