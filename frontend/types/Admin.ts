import type { Role, Status } from "./enums";

export interface Admin {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: Role;
  status: Status;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminDto {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role?: Role;
}

export interface UpdateAdminDto {
  name?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role?: Role;
  status?: Status;
}
