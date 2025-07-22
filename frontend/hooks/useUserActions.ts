import { CreateUserDto, UpdateUserDto } from "../types/User";
import { useUserContext } from "../context/UserContext";

export function useUserActions() {
  const { setError, refetchUsers } = useUserContext();

  const createUser = async (user: CreateUserDto) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        refetchUsers();
        return true;
      } else throw new Error(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      return false;
    }
  };

  const updateUser = async (userId: number, updates: UpdateUserDto) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
      const data = await res.json();
      if (res.ok && data.status === "success") {
        refetchUsers();
        return true;
      } else throw new Error(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      return false;
    }
  };

  const deleteUser = async (userId: number) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (res.ok && data.status === "success") {
        refetchUsers();
        return true;
      } else throw new Error(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      return false;
    }
  };

  return { createUser, updateUser, deleteUser };
}
