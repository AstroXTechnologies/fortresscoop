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
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Transaction & { id?: string };
      // Fallback to Firestore document ID if missing (legacy records)
      if (!data.id) data.id = doc.id;
      return data as Transaction;
    });
  }

  // Paginated user transactions (cursor = createdAt millis of last item from previous page)
  async findAllPaginated(
    userId: string,
    limit = 25,
    cursor?: string,
  ): Promise<{ items: Transaction[]; nextCursor?: string; hasMore: boolean }> {
    if (limit <= 0) limit = 25;
    if (limit > 100) limit = 100;
    let query = db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1); // fetch one extra to determine hasMore

    if (cursor) {
      const cursorDate = new Date(Number(cursor));
      if (!isNaN(cursorDate.getTime())) {
        query = query.startAfter(cursorDate);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const slice = hasMore ? docs.slice(0, limit) : docs;
    const items = slice.map((doc) => {
      const data = doc.data() as Transaction & { id?: string; createdAt?: any };
      if (!data.id) data.id = doc.id;
      return data as Transaction;
    });
    const last = slice[slice.length - 1];
    let nextCursor: string | undefined;
    if (hasMore && last) {
      interface FirestoreTsLike {
        _seconds: number;
        _nanoseconds?: number;
      }
      const lastData = last.data() as {
        createdAt?: Date | FirestoreTsLike;
      };
      const createdAtVal = lastData.createdAt;
      const isFsTs = (v: unknown): v is FirestoreTsLike =>
        !!v &&
        typeof v === 'object' &&
        '_seconds' in (v as any) &&
        typeof (v as Record<string, unknown>)['_seconds'] === 'number';
      if (createdAtVal instanceof Date) {
        nextCursor = String(createdAtVal.getTime());
      } else if (isFsTs(createdAtVal)) {
        nextCursor = String(createdAtVal._seconds * 1000);
      }
    }
    return { items, nextCursor, hasMore };
  }

  // Admin: list all transactions (optionally limited) ordered by createdAt desc
  async findAllAdmin(params: {
    limit?: number;
    cursor?: string; // millis
    type?: string;
    status?: string;
    userId?: string;
    walletId?: string;
  }): Promise<{ items: Transaction[]; nextCursor: string | null }> {
    const { limit = 50, cursor, type, status, userId, walletId } = params;
    let q: FirebaseFirestore.Query = db.collection(this.collection);
    if (type) q = q.where('type', '==', type);
    if (status) q = q.where('status', '==', status);
    if (userId) q = q.where('userId', '==', userId);
    if (walletId) q = q.where('walletId', '==', walletId);
    q = q.orderBy('createdAt', 'desc');
    if (cursor) {
      const d = new Date(Number(cursor));
      if (!isNaN(d.getTime())) q = q.startAfter(d);
    }
    const snap = await q.limit(Math.min(limit, 200)).get();
    const items = snap.docs.map((doc) => {
      const data = doc.data() as Transaction & { id?: string };
      if (!data.id) data.id = doc.id;
      // Ensure createdAt is in a safe format
      if (
        data.createdAt &&
        typeof data.createdAt === 'object' &&
        'toDate' in data.createdAt
      ) {
        try {
          const toDateFn = (data.createdAt as { toDate: () => Date }).toDate;
          data.createdAt = toDateFn();
        } catch (error) {
          console.warn(
            'Failed to convert timestamp for transaction:',
            doc.id,
            error,
          );
          data.createdAt = new Date(); // fallback
        }
      }
      return data as Transaction;
    });
    const last = snap.docs[snap.docs.length - 1];
    let nextCursor: string | null = null;
    if (last) {
      try {
        const raw = last.get('createdAt') as
          | Date
          | { toDate?: () => Date }
          | { _seconds?: number }
          | undefined;
        if (raw instanceof Date) {
          nextCursor = String(raw.getTime());
        } else if (
          raw &&
          typeof raw === 'object' &&
          typeof (raw as { toDate?: () => Date }).toDate === 'function'
        ) {
          const toDateFn = (raw as { toDate: () => Date }).toDate;
          const d = toDateFn();
          if (d instanceof Date && !isNaN(d.getTime())) {
            nextCursor = String(d.getTime());
          }
        } else if (
          raw &&
          typeof raw === 'object' &&
          '_seconds' in raw &&
          typeof (raw as { _seconds?: number })._seconds === 'number'
        ) {
          const ts = raw as { _seconds: number };
          nextCursor = String(ts._seconds * 1000);
        }
      } catch (error) {
        console.warn('Failed to parse createdAt for cursor:', error);
        nextCursor = null;
      }
    }
    return { items, nextCursor };
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

  async deleteByReference(reference: string): Promise<void> {
    const snapshot = await db
      .collection(this.collection)
      .where('reference', '==', reference)
      .limit(1)
      .get();

    if (snapshot.empty) throw new BadRequestException('Transaction not found');

    const doc = snapshot.docs[0];
    await db.collection(this.collection).doc(doc.id).delete();
  }

  async deleteById(id: string): Promise<void> {
    const snapshot = await db
      .collection(this.collection)
      .where('id', '==', id)
      .limit(1)
      .get();

    if (snapshot.empty) throw new BadRequestException('Transaction not found');

    const doc = snapshot.docs[0];
    await db.collection(this.collection).doc(doc.id).delete();
  }
}
