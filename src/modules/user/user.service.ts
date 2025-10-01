import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, dbAuth, dbFireStore } from 'src/main';
import { CreateUserDto, UpdateUserDto } from 'src/modules/user/user.dto';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { User, UserRole } from './user.model';

@Injectable()
export class UserService {
  private collection = 'users';

  constructor(private readonly walletSvc: WalletService) {}

  async create(model: CreateUserDto): Promise<any> {
    try {
      const existingSnapshot = await db
        .collection(this.collection)
        .where('email', '==', model.email)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        throw new BadRequestException('User with this email already exists');
      }

      // Optionally, also check by phone number if provided
      if (model.phoneNumber) {
        const phoneSnapshot = await db
          .collection(this.collection)
          .where('phoneNumber', '==', model.phoneNumber)
          .limit(1)
          .get();

        if (!phoneSnapshot.empty) {
          throw new BadRequestException(
            'User with this phone number already exists',
          );
        }
      }

      const created = await dbAuth.createUser({
        displayName: model.fullName,
        email: model.email,
        password: model.password,
      });

      if (!created) {
        throw new Error('Error creating user');
      }

      await this.saveUser(created.uid, {
        uid: created?.uid,
        email: created?.email ?? '',
        fullName: created?.displayName ?? '',
        phoneNumber: model?.phoneNumber,
        joinDate: dbFireStore.Timestamp.now().toDate().toISOString(),
        lastLogin: dbFireStore.Timestamp.now().toDate().toISOString(),
        role: UserRole.USER,
      });

      const userDocument = await db
        .collection(this.collection)
        .doc(created.uid)
        .get();

      const data = userDocument.data() as
        | {
            uid: string;
            email: string;
            fullName: string;
            phoneNumber: string;
            joinDate: string;
            lastLogin: string;
            role: UserRole;
          }
        | undefined;

      if (!data) {
        throw new Error('User not found after creation');
      }

      await this.walletSvc.create({ userId: created?.uid, currency: 'NGN' });

      return {
        uid: created?.uid,
        email: data.email,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        joinDate: data.joinDate,
        lastLogin: data.lastLogin,
        role: data.role,
      };
    } catch (error) {
      console.error(error, 'Error creating user');
      throw error;
    }
  }

  async saveUser(uid: string, userData: unknown): Promise<void> {
    const userReference = db.collection(this.collection).doc(uid);
    if (!userData || typeof userData !== 'object' || 'message' in userData) {
      throw new Error('Invalid user data');
    }

    await userReference.set(userData);
  }

  async findAll(): Promise<User[]> {
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map((doc) => doc.data() as User);
  }

  async findAllPaginated(
    limit = 25,
    page = 1,
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    const snapshot = await db.collection(this.collection).get();
    const all = snapshot.docs.map((doc) => doc.data() as User);
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);
    return { data, total, page, totalPages };
  }

  async findOne(model: Partial<CreateUserDto>): Promise<User> {
    const keys = Object.keys(model).filter(
      (key) => model[key as keyof CreateUserDto] !== undefined,
    );

    if (keys.length === 0) {
      throw new BadRequestException('At least one field is required to search');
    }

    // If uid is provided, fetch directly (faster)
    if (model.uid) {
      const doc = await db.collection(this.collection).doc(model.uid).get();
      if (!doc.exists) throw new NotFoundException('User not found');
      return { uid: doc.id, ...(doc.data() as User) };
    }

    // Otherwise, search by the first field provided
    const field = keys[0];
    const value = model[field as keyof CreateUserDto];

    const snapshot = await db
      .collection(this.collection)
      .where(field, '==', value)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`User with ${field}=${value} not found`);
    }

    const doc = snapshot.docs[0];
    return { uid: doc.id, ...(doc.data() as User) };
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('User not found');
    const base = doc.data() as User;
    const updatePayload: Record<string, any> = {
      ...data,
      updatedAt: new Date(),
    };
    await docRef.update(updatePayload);
    return { ...base, ...updatePayload } as User;
  }

  async remove(id: string): Promise<void> {
    await db.collection(this.collection).doc(id).delete();
  }

  // Admin helper summary of a single user: wallet balance + transaction counts
  async getAdminUserSummary(userId: string): Promise<{
    user: User | null;
    wallet: { balance: number; currency: string } | null;
    transactions: {
      total: number;
      pending: number;
      failed: number;
      success: number;
      lastTransactionAt: string | null;
      totalVolume: number;
    };
  }> {
    // fetch user document
    const userDoc = await db.collection(this.collection).doc(userId).get();
    const user = userDoc.exists
      ? ({ uid: userDoc.id, ...(userDoc.data() as User) } as User)
      : null;

    // wallet (if any)
    let wallet: { balance: number; currency: string } | null = null;
    try {
      const wSnapshot = await db
        .collection('wallets')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      if (!wSnapshot.empty) {
        const w = wSnapshot.docs[0].data() as any;
        wallet = { balance: w.balance || 0, currency: w.currency || 'NGN' };
      }
    } catch {}

    // transactions aggregation
    const tSnapshot = await db
      .collection('transactions')
      .where('userId', '==', userId)
      .get();
    const txs = tSnapshot.docs.map((d) => d.data() as any);
    let pending = 0;
    let failed = 0;
    let success = 0;
    let lastTransactionAt: string | null = null;
    let totalVolume = 0;
    for (const t of txs) {
      if (t.status === 'PENDING') pending++;
      else if (t.status === 'FAILED') failed++;
      else if (t.status === 'SUCCESS') success++;
      totalVolume += Number(t.amount) || 0;
      if (t.createdAt) {
        const created = (
          t.createdAt instanceof Date ? t.createdAt : t.createdAt?.toDate?.()
        ) as Date;
        if (
          created &&
          (!lastTransactionAt || created > new Date(lastTransactionAt))
        ) {
          lastTransactionAt = created.toISOString();
        }
      }
    }

    return {
      user,
      wallet,
      transactions: {
        total: txs.length,
        pending,
        failed,
        success,
        lastTransactionAt,
        totalVolume,
      },
    };
  }
}
