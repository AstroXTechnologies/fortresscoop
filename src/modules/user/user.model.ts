export class User {
  uid?: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  password: string;
}
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}
