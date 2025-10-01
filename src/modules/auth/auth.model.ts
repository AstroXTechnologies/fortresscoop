import { User } from '../user/user.model';

// Allow returning a user shape that at minimum has uid + email; legacy accounts may be provisioned.
export class TokenResponse {
  idToken: string;
  refreshToken: string;
  localId: string;
  displayName: string;
  expiresIn: string;
  user: User;
}
