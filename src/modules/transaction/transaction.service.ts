import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from 'src/main';
import { Wallet } from 'src/modules/wallet/wallet.model';
import { CreateTransactionDto, UpdateTransactionDto } from './transaction.dto';
import { Transaction, TransactionHistory } from './transaction.model';

@Injectable()
export class TransactionsService {
  private collection = 'transactions';
  private walletCollection = 'wallets';
  private historyCollection = 'transaction_histories';

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

    await this.createHistory(
      transaction.id,
      userId,
      `Transaction created: ${dto.type} of amount ${dto.amount}`,
    );

    return transaction;
  }

  private async createHistory(
    transactionId: string,
    userId: string,
    description: string,
  ): Promise<void> {
    const id = db.collection(this.historyCollection).doc().id;
    const history: TransactionHistory = {
      id,
      transactionId,
      userId,
      description,
      createdAt: new Date(),
    };
    await db.collection(this.historyCollection).doc(id).set(history);
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

    await this.createHistory(
      id,
      transaction.userId,
      `Transaction status updated to ${dto.status}`,
    );

    if (dto.status === 'SUCCESS') {
      await this.applyWalletEffect(updated);
      await this.createHistory(
        id,
        transaction.userId,
        `Transaction status updated to ${dto.status}`,
      );
    }

    return updated;
  }

  async updateByReference(
    reference: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const snapshot = await db
      .collection(this.collection)
      .where('reference', '==', reference)
      .limit(1)
      .get();

    if (snapshot.empty) throw new BadRequestException('Transaction not found');

    const doc = snapshot.docs[0];
    return this.update(doc.id, dto);
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
        newBalance += Number(transaction.amount);
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

  async getTransactionHistoryByTransactionId(
    transactionId: string,
  ): Promise<TransactionHistory[]> {
    const snapshot = await db
      .collection(this.historyCollection)
      .where('transactionId', '==', transactionId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as TransactionHistory);
  }

  async getTransactionHistoryByUserId(
    userId: string,
  ): Promise<TransactionHistory[]> {
    const snapshot = await db
      .collection(this.historyCollection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as TransactionHistory);
  }
}
