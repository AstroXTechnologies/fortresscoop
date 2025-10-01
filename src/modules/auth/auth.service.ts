import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { Request } from 'express';
import { db, dbAuth } from 'src/main';
import { TokenResponse } from 'src/modules/auth/auth.model';
import { User } from '../user/user.model';
import { UserService } from '../user/user.service';
import { LoginDto } from './auth.dto';

interface AuthenticatedRequest extends Request {
  user: any;
}

@Injectable()
export class AuthService {
  constructor(private readonly userSvc: UserService) {}
  async login(model: LoginDto): Promise<TokenResponse> {
    const { email, password } = model;
    try {
      const { idToken, refreshToken, expiresIn, localId, displayName } =
        await this.signInWithEmailAndPassword(email, password);

      // Will hold ensured user record
      let user: User;
      try {
        user = await this.userSvc.findOne({ uid: localId });
      } catch (err) {
        // Auto-provision Firestore user doc if missing (legacy Firebase-only account)
        if (err instanceof NotFoundException) {
          try {
            const firebaseUser = await dbAuth.getUser(localId);
            await this.userSvc.saveUser(localId, {
              uid: localId,
              email: firebaseUser.email ?? email,
              fullName: firebaseUser.displayName ?? firebaseUser.email ?? '',
              joinDate: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              role: 'user',
            });
            user = await this.userSvc.findOne({ uid: localId });
          } catch (provisionErr) {
            console.error('Failed to auto-provision user doc', provisionErr);
            throw provisionErr;
          }
        } else {
          throw err;
        }
      }

      if (!user.uid) {
        user.uid = localId;
      }
      return {
        idToken,
        refreshToken,
        expiresIn,
        localId,
        displayName,
        user,
      };
    } catch (error: unknown) {
      interface AxiosLikeError {
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      }
      let firebaseMessage: string | undefined;
      if (error && typeof error === 'object') {
        const err = error as AxiosLikeError;
        firebaseMessage =
          err.response?.data?.error?.message || err.message || undefined;
      }
      console.error(firebaseMessage || error, 'Error logging in user');
      // Surface more specific Firebase auth errors when available
      const friendly = firebaseMessage
        ? firebaseMessage
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/^[a-z]/, (c) => c.toUpperCase())
        : 'Invalid credentials';
      throw new UnauthorizedException(friendly);
    }
  }

  private async signInWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<{
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    displayName: string;
    localId: string;
  }> {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
    return await this.sendPostRequest(url, {
      email,
      password,
      returnSecureToken: true,
    });
  }

  private async sendPostRequest<T>(url: string, data: any): Promise<T> {
    try {
      const response = await axios.post<T>(url, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error(error, 'Error sending POST request');
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateRequest(req: Request): Promise<boolean> {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        "Invalid authorization format. Use 'Bearer <token>'",
      );
    }

    try {
      const decodedToken = await dbAuth.verifyIdToken(token);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      if (!userDoc.exists) {
        throw new UnauthorizedException('User not found');
      }

      const docData = userDoc.data() as { role?: string } | undefined;
      const userData = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: (docData?.role ?? 'user')?.toLowerCase(),
      };

      if (userData) (req as AuthenticatedRequest).user = userData;
      return true;
    } catch (error) {
      console.error('Error verifying token: ', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
