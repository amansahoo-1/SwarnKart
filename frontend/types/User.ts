export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string; // Changed from Date to string for API responses
}

// For creating new users
export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}
