import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/main';
import { CreateSavingDto, UpdateSavingDto } from './savings.dto';
import { Saving } from './savings.model';

@Injectable()
export class SavingsService {
  private collection = 'savings';
  private walletCollection = 'wallets';
  private transactionCollection = 'transactions';

  async create(dto: CreateSavingDto): Promise<Saving> {
    const { userId, planType, amount, durationInDays, goalAmount } = dto;

    const walletRef = db.collection(this.walletCollection).doc(userId);
    const savingRef = db.collection(this.collection).doc();
    const now = new Date();

    let maturityDate: Date | undefined;
    if (durationInDays) {
      maturityDate = new Date(now);
      maturityDate.setDate(now.getDate() + durationInDays);
    }

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
      const saving: Saving = {
        id: savingRef.id,
        userId,
        planType,
        balance: amount,
        goalAmount,
        durationInDays,
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

    return (await savingRef.get()).data() as Saving;
  }

  async findAll(): Promise<Saving[]> {
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map((doc) => doc.data() as Saving);
  }

  async findOne(id: string): Promise<Saving> {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists)
      throw new NotFoundException(`Saving with id ${id} not found`);
    return doc.data() as Saving;
  }

  async update(id: string, dto: UpdateSavingDto): Promise<Saving> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Saving with id ${id} not found`);

    const updated = {
      ...doc.data(),
      ...dto,
      updatedAt: new Date(),
    } as Saving;

    await docRef.update(updated as any);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Saving with id ${id} not found`);
    await docRef.delete();
  }
}
