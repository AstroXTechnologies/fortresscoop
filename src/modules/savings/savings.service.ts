import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/main';
import {
  CreateSavingDto,
  SavingPlanType,
  UpdateSavingDto,
} from './savings.dto';
import { PreviewSaving, Savings } from './savings.model';

@Injectable()
export class SavingsService {
  private collection = 'savings';
  private walletCollection = 'wallets';
  private transactionCollection = 'transactions';

  private ratesMap: Record<number, number> = {
    33: 10,
    66: 12,
    99: 14,
    122: 16,
    188: 18,
    366: 20,
  };

  private calculateInterest(
    amount: number,
    durationInDays: number,
  ): { interestRate: number; expectedInterest: number } {
    const rate = this.ratesMap[durationInDays];
    if (!rate) throw new BadRequestException('Invalid duration selected');

    // Simple interest: (Principal * Rate% * Time_in_days / 365)
    const expectedInterest = (amount * rate * durationInDays) / (100 * 365);
    return {
      interestRate: rate,
      expectedInterest: parseFloat(expectedInterest.toFixed(2)),
    };
  }

  async create(dto: CreateSavingDto): Promise<Savings> {
    const { userId, amount, durationInDays } = dto;

    const walletQuery = await db
      .collection(this.walletCollection)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (walletQuery.empty) {
      throw new NotFoundException('Wallet not found');
    }

    const walletDoc = walletQuery.docs[0];
    const walletRef = walletDoc.ref;

    const savingRef = db.collection(this.collection).doc();
    const now = new Date();

    const maturityDate = new Date(now);
    maturityDate.setDate(now.getDate() + durationInDays);

    const { interestRate, expectedInterest } = this.calculateInterest(
      amount,
      durationInDays,
    );

    await db.runTransaction(async (t) => {
      const walletSnap = await t.get(walletRef);

      if (!walletSnap.exists) throw new NotFoundException('Wallet not found');

      const walletData = walletSnap.data() || { balance: 0 };
      if (walletData.balance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Deduct from wallet
      t.update(walletRef, { balance: walletData.balance - amount });

      // Create saving
      const saving: Savings = {
        id: savingRef.id,
        userId,
        planType: SavingPlanType.FIXED,
        balance: amount,
        durationInDays,
        interestRate,
        expectedInterest,
        startDate: now,
        maturityDate,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

      t.set(savingRef, saving);

      // Record transaction
      const transactionRef = db.collection(this.transactionCollection).doc();

      t.set(transactionRef, {
        id: transactionRef.id,
        userId,
        walletId: walletRef.id,
        type: 'SAVINGS',
        amount,
        status: 'SUCCESS',
        reference: `SAVE-${Date.now()}`,
        createdAt: now,
      });
    });

    return (await savingRef.get()).data() as Savings;
  }

  async findAll(): Promise<Savings[]> {
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map((doc) => doc.data() as Savings);
  }

  async findOne(id: string): Promise<Savings> {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists)
      throw new NotFoundException(`Saving with id ${id} not found`);
    return doc.data() as Savings;
  }

  preview(amount: number, durationInDays: number): PreviewSaving {
    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setDate(now.getDate() + durationInDays);

    const { interestRate, expectedInterest } = this.calculateInterest(
      amount,
      durationInDays,
    );

    return {
      principal: amount,
      interestRate,
      duration: durationInDays,
      expectedInterest,
      maturityDate,
    };
  }

  async update(id: string, dto: UpdateSavingDto): Promise<Savings> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Saving with id ${id} not found`);

    const updatedData: Partial<Savings> = {
      ...(doc.data() as Partial<Savings>),
      ...dto,
      updatedAt: new Date(),
    };

    await docRef.update(updatedData);
    return updatedData as Savings;
  }

  async remove(id: string): Promise<void> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Saving with id ${id} not found`);
    await docRef.delete();
  }

  async findUserSavings(userId: string): Promise<Savings[]> {
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) return [];
    const now = Date.now();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Savings & {
        maturityDate?: any;
        startDate?: any;
      };
      const startVal: unknown = data.startDate;
      const maturityVal: unknown = data.maturityDate;
      const toMs = (v: unknown): number => {
        if (v instanceof Date) return v.getTime();
        if (typeof v === 'string' || typeof v === 'number')
          return new Date(v).getTime();
        if (
          v &&
          typeof v === 'object' &&
          '_seconds' in v &&
          typeof (v as { _seconds?: unknown })._seconds === 'number'
        ) {
          return (v as { _seconds: number })._seconds * 1000;
        }
        return NaN;
      };
      const startMs = toMs(startVal);
      const maturityMs = toMs(maturityVal);
      let progress = 0;
      if (!isNaN(startMs) && !isNaN(maturityMs) && startMs < maturityMs) {
        progress = Math.min(
          100,
          Math.max(0, ((now - startMs) / (maturityMs - startMs)) * 100),
        );
      }
      const remainingDays = !isNaN(maturityMs)
        ? Math.max(0, Math.ceil((maturityMs - now) / (1000 * 60 * 60 * 24)))
        : 0;
      return {
        ...data,
        progress,
        remainingDays,
      } as Savings & { progress: number; remainingDays: number };
    });
  }
}
