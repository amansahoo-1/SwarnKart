import { useUserActions } from "@/hooks/useUserActions";
import { useUserContext } from "@/context/UserContext";

export default function UserTable() {
  const { users, loading, error } = useUserContext();
  const { deleteUser } = useUserActions();

  if (loading) return <p>Loading users...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  if (users.length === 0) {
    return <p>No users found.</p>;
  }

  return (
    <table className="min-w-full border text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2">ID</th>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Email</th>
          <th className="px-4 py-2">Joined</th>
          <th className="px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b">
            <td className="px-4 py-2">{user.id}</td>
            <td className="px-4 py-2">{user.name}</td>
            <td className="px-4 py-2">{user.email}</td>
            <td className="px-4 py-2">
              {new Date(user.createdAt).toLocaleDateString()}
            </td>
            <td className="px-4 py-2">
              <button
                onClick={() => deleteUser(user.id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
              {/* You can also add Edit button here */}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
