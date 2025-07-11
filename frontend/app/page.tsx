"use client";

import { useEffect, useState } from "react";
import { User } from "../types/User";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`)
      .then((res) => res.json())
      .then((data: User[]) => setUsers(data))
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Hello SwarnKart 👋</h1>

      <h2 className="text-xl mb-2">Users:</h2>
      <ul className="list-disc list-inside space-y-1">
        {users.length === 0 ? (
          <li>No users found.</li>
        ) : (
          users.map((user) => (
            <li key={user.id}>
              {user.name} - {user.email}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
