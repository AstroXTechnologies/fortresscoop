import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/main';
import { InvestmentProduct } from 'src/modules/investment/product/product.model';
import {
  CreateUserInvestmentDto,
  UpdateUserInvestmentDto,
} from './investment.dto';
import { UserInvestment } from './investment.model';

@Injectable()
export class UserInvestmentsService {
  private collection = 'userInvestments';
  private productCollection = 'products';
  private walletCollection = 'wallets';
  private transactionCollection = 'transactions';

  async create(dto: CreateUserInvestmentDto): Promise<UserInvestment> {
    const { userId, productId, amount } = dto;

    // Fetch product
    const productDoc = await db
      .collection(this.productCollection)
      .doc(productId)
      .get();

    if (!productDoc.exists)
      throw new NotFoundException(`Product with id ${productId} not found`);
    const product = productDoc.data() as InvestmentProduct;

    // Validate amount
    if (amount < product.minAmount) {
      throw new BadRequestException(`Minimum amount is ${product.minAmount}`);
    }
    if (product.maxAmount && amount > product.maxAmount) {
      throw new BadRequestException(`Maximum amount is ${product.maxAmount}`);
    }

    // Deduct from wallet
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
    const investmentRef = db.collection(this.collection).doc();
    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setDate(now.getDate() + product.durationInDays);

    await db.runTransaction(async (t) => {
      const walletSnap = await t.get(walletRef);
      if (!walletSnap.exists) throw new NotFoundException('Wallet not found');

      const walletData = walletSnap.data() || { balance: 0 };
      if (walletData.balance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Deduct balance
      t.update(walletRef, { balance: walletData.balance - amount });

      // Create investment
      const investment: UserInvestment = {
        id: investmentRef.id,
        userId,
        productId,
        amount,
        startDate: now,
        maturityDate,
        status: 'ACTIVE',
        returnsAccrued: 0,
        createdAt: now,
        updatedAt: now,
      };

      t.set(investmentRef, investment);

      // Record transaction
      const transactionRef = db.collection(this.transactionCollection).doc();
      t.set(transactionRef, {
        id: transactionRef.id,
        userId,
        walletId: walletRef.id,
        type: 'INVESTMENT',
        amount,
        status: 'SUCCESS',
        reference: `INV-${Date.now()}`,
        createdAt: now,
      });
    });

    return (await investmentRef.get()).data() as UserInvestment;
  }

  async findAll(): Promise<UserInvestment[]> {
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map((doc) => doc.data() as UserInvestment);
  }

  async findAllPaginatedFiltered(params: {
    userId?: string;
    status?: string;
    productId?: string;
    limit?: number;
    cursor?: string; // ISO createdAt string cursor
  }): Promise<{ data: UserInvestment[]; nextCursor: string | null }> {
    const { userId, status, productId, limit = 25, cursor } = params;
    let q: FirebaseFirestore.Query = db.collection(this.collection);
    if (userId) q = q.where('userId', '==', userId);
    if (status) q = q.where('status', '==', status);
    if (productId) q = q.where('productId', '==', productId);
    q = q.orderBy('createdAt', 'desc');

    if (cursor) {
      // Fetch a doc with createdAt equal to cursor (or startAfter timestamp)
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        q = q.startAfter(cursorDate);
      }
    }

    const snap = await q.limit(Math.min(limit, 100)).get();
    const data = snap.docs.map((d) => d.data() as UserInvestment);
    const last = snap.docs[snap.docs.length - 1];
    let nextCursor: string | null = null;
    if (last) {
      const createdAtVal: unknown = last.get('createdAt');
      if (createdAtVal instanceof Date) {
        nextCursor = createdAtVal.toISOString();
      } else if (
        createdAtVal &&
        typeof createdAtVal === 'object' &&
        'toDate' in createdAtVal &&
        typeof (createdAtVal as { toDate: () => Date }).toDate === 'function'
      ) {
        try {
          nextCursor = (createdAtVal as { toDate: () => Date })
            .toDate()
            .toISOString();
        } catch {
          // ignore parse errors
        }
      }
    }
    return { data, nextCursor };
  }

  async findOne(id: string): Promise<UserInvestment> {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists)
      throw new NotFoundException(`Investment with id ${id} not found`);
    return doc.data() as UserInvestment;
  }

  async update(
    id: string,
    dto: UpdateUserInvestmentDto,
  ): Promise<UserInvestment> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Investment with id ${id} not found`);

    const updated = {
      ...doc.data(),
      ...dto,
      updatedAt: new Date(),
    } as UserInvestment;

    await docRef.update(updated as unknown as Record<string, unknown>);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Investment with id ${id} not found`);
    await docRef.delete();
  }
}
