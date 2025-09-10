import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from 'src/main';
import {
  CreateWalletDto,
  UpdateWalletDto,
} from 'src/modules/wallet/wallet.dto';
import { Wallet } from 'src/modules/wallet/wallet.model';

@Injectable()
export class WalletService {
  private collection = 'wallets';

  async create(model: CreateWalletDto) {
    const id = db.collection(this.collection).doc().id;
    const wallet: Wallet = {
      id,
      userId: model.userId,
      balance: 0,
      currency: model.currency || 'NGN',
      createdAt: new Date(),
    };
    return await db.collection(this.collection).doc(id).set(wallet);
  }

  async findAll(): Promise<Wallet[]> {
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map((doc) => doc.data() as Wallet);
  }

  async findOne(walletId: string): Promise<Wallet> {
    const doc = await db.collection(this.collection).doc(walletId).get();
    if (!doc.exists) throw new NotFoundException('Wallet not found');
    return doc.data() as Wallet;
  }

  async findByUserId(userId: string): Promise<Wallet> {
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .get();
    if (snapshot.empty)
      throw new NotFoundException('Wallet for user not found');
    return snapshot.docs[0].data() as Wallet;
  }

  async update(id: string, model: UpdateWalletDto): Promise<Wallet> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Wallet not found');
    await docRef.update(model as any);
    return { ...(doc.data() as Wallet), ...model };
  }

  async remove(id: string): Promise<void> {
    await db.collection(this.collection).doc(id).delete();
  }
}
