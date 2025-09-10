import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from 'src/main';
import { Wallet } from 'src/modules/wallet/wallet.model';
import { CreateTransactionDto, UpdateTransactionDto } from './transaction.dto';
import { Transaction } from './transaction.model';

@Injectable()
export class TransactionsService {
  private collection = 'transactions';
  private walletCollection = 'wallets';

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const id = db.collection(this.collection).doc().id;
    const transaction: Transaction = {
      id,
      userId,
      walletId: dto.walletId,
      type: dto.type,
      amount: dto.amount,
      status: 'PENDING',
      reference: dto.reference || '',
      createdAt: new Date(),
    };

    await db.collection(this.collection).doc(id).set(transaction);
    return transaction;
  }

  async findAll(userId: string): Promise<Transaction[]> {
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Transaction);
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const ref = db.collection(this.collection).doc(id);
    const existing = await ref.get();

    if (!existing.exists)
      throw new BadRequestException('Transaction not found');

    const transaction = existing.data() as Transaction;

    await ref.update({ status: dto.status });
    const updated = { ...transaction, status: dto.status };

    if (dto.status === 'SUCCESS') {
      await this.applyWalletEffect(updated);
    }

    return updated;
  }

  private async applyWalletEffect(transaction: Transaction): Promise<void> {
    const walletRef = db
      .collection(this.walletCollection)
      .doc(transaction.walletId);

    const walletSnap = await walletRef.get();

    if (!walletSnap.exists) throw new BadRequestException('Wallet not found');

    const walletData = walletSnap.data() as Wallet;

    let newBalance: number = walletData?.balance;

    switch (transaction.type) {
      case 'DEPOSIT':
        newBalance += transaction.amount;
        break;

      case 'WITHDRAWAL':
      case 'INVESTMENT':
        if (walletData.balance < transaction.amount) {
          throw new BadRequestException('Insufficient balance');
        }
        newBalance -= transaction.amount;
        break;

      case 'TRANSFER': {
        if (!transaction.receiverWalletId) {
          throw new BadRequestException(
            'Receiver wallet ID is required for transfers',
          );
        }
        if (walletData.balance < transaction.amount) {
          throw new BadRequestException('Insufficient balance for transfer');
        }
        // Debit sender
        newBalance -= transaction.amount;
        // Credit receiver
        const receiverRef = db
          .collection(this.walletCollection)
          .doc(transaction.receiverWalletId);

        const receiverSnap = await receiverRef.get();

        if (!receiverSnap.exists)
          throw new BadRequestException('Receiver wallet not found');
        const receiverData = receiverSnap.data() as Wallet;
        const newReceiverBalance = receiverData.balance + transaction.amount;

        await receiverRef.update({ balance: newReceiverBalance });
        break;
      }
    }

    await walletRef.update({ balance: newBalance });
  }
}
