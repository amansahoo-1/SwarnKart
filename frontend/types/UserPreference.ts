// types/UserPreferences.ts
export interface UserPreferences {
  currency?: "INR" | "USD" | "EUR";
  theme?: "light" | "dark";
  notifications?: {
    email?: boolean;
    sms?: boolean;
  };
  [key: string]: unknown; // fallback
}
