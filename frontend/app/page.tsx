// "use client";
// import Header from "@/components/user/layout/default-user/Header";
// export default function Home() {
//   return (
//     <main className="p-6 max-w-4xl mx-auto">
//       <Header />
//       <section className="mb-8"></section>
//     </main>
//   );
// }

"use client";
import { UserProvider } from "../context/UserContext";
import UserTable from "../components/admin/functions/UserTable";

export default function Home() {
  return (
    <UserProvider>
      <main className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
        <UserTable />
      </main>
    </UserProvider>
  );
}
