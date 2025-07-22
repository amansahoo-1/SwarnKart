import type { UserPreferences } from "./UserPreference";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  address?: string;
  preferences?: UserPreferences;
  createdAt: string; // ISO string
  adminId?: number;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  preferences?: UserPreferences;
}
