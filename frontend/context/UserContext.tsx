"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "../types/User";

interface UserContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  refetchUsers: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`);
      const data = await res.json();

      if (res.ok && data.status === "success") {
        setUsers(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch users");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetchUsers();
  }, []);

  return (
    <UserContext.Provider
      value={{ users, setUsers, loading, error, setError, refetchUsers }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useUserContext must be used inside <UserProvider>");
  return context;
};
