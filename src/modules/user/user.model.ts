export class User {
  uid?: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  password: string;
}
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}
