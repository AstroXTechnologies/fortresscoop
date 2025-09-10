import { Injectable, NotFoundException } from '@nestjs/common';
import { db, dbAuth, dbFireStore } from 'src/main';
import { CreateUserDto } from 'src/modules/user/user.dto';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { User, UserRole } from './user.model';

@Injectable()
export class UserService {
  private collection = 'users';

  constructor(private readonly walletSvc: WalletService) {}

  async create(model: CreateUserDto): Promise<any> {
    try {
      const created = await dbAuth.createUser({
        displayName: model.fullName,
        email: model.email,
        password: model.password,
      });

      if (!created) {
        throw new Error('Error creating user');
      }

      await this.saveUser(created.uid, {
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

  async findOne(id: string): Promise<User> {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    return doc.data() as User;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    await docRef.update(data);
    return { ...(doc.data() as User), ...data };
  }

  async remove(id: string): Promise<void> {
    await db.collection(this.collection).doc(id).delete();
  }
}
