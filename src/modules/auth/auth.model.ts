import { User } from '../user/user.model';

export class TokenResponse {
  idToken: string;
  refreshToken: string;
  localId: string;
  displayName: string;
  expiresIn: string;
  user: User;
}
