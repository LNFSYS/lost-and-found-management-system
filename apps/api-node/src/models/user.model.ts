export type UserRole = "USER" | "STUDENT" | "LECTURER" | "STAFF" | "ADMIN";
export type UserStatus = "PENDING_EMAIL_VERIFICATION" | "ACTIVE" | "LOCKED" | "DISABLED";

export interface User {
  id: string;
  email: string;
  normalizedEmail: string;
  passwordHash: string | null;
  fullName: string;
  studentCode?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  roles: UserRole[];
  status: UserStatus;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  studentCode?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  roles: UserRole[];
  status: UserStatus;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    studentCode: user.studentCode,
    phoneNumber: user.phoneNumber,
    avatarUrl: user.avatarUrl,
    roles: user.roles,
    status: user.status,
    createdAt: user.createdAt
  };
}
