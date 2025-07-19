// "use client";

// import { useState } from "react";
// import { CreateUserDto } from "../types/User";

// export default function AddUserForm({
//   onUserAdded,
// }: {
//   onUserAdded: () => void;
// }) {
//   const [formData, setFormData] = useState<CreateUserDto>({
//     name: "",
//     email: "",
//     password: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);

//     try {
//       const response = await fetch(
//         `${process.env.NEXT_PUBLIC_API_URL}/api/users`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(formData),
//         }
//       );

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to create user");
//       }

//       // Clear form and refresh user list
//       setFormData({ name: "", email: "", password: "" });
//       onUserAdded();
//     } catch (err) {
//       console.error("Error creating user:", err);
//       setError(err instanceof Error ? err.message : "Unknown error occurred");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md mb-8">
//       <h3 className="text-lg font-medium mb-4">Add New User</h3>
//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//           {error}
//         </div>
//       )}
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label
//             htmlFor="name"
//             className="block text-sm font-medium text-gray-700"
//           >
//             Name
//           </label>
//           <input
//             type="text"
//             id="name"
//             value={formData.name}
//             onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
//             required
//           />
//         </div>
//         <div>
//           <label
//             htmlFor="email"
//             className="block text-sm font-medium text-gray-700"
//           >
//             Email
//           </label>
//           <input
//             type="email"
//             id="email"
//             value={formData.email}
//             onChange={(e) =>
//               setFormData({ ...formData, email: e.target.value })
//             }
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
//             required
//           />
//         </div>
//         <div>
//           <label
//             htmlFor="password"
//             className="block text-sm font-medium text-gray-700"
//           >
//             Password
//           </label>
//           <input
//             type="password"
//             id="password"
//             value={formData.password}
//             onChange={(e) =>
//               setFormData({ ...formData, password: e.target.value })
//             }
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
//             required
//             minLength={6}
//           />
//         </div>
//         <button
//           type="submit"
//           disabled={loading}
//           className={`px-4 py-2 rounded-md text-white ${
//             loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
//           }`}
//         >
//           {loading ? "Creating..." : "Create User"}
//         </button>
//       </form>
//     </div>
//   );
// }
