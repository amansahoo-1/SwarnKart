// // middleware.ts
// import { NextRequest, NextResponse } from "next/server";

// export function middleware(request: NextRequest) {
//   const token = request.cookies.get("token")?.value;

//   const pathname = request.nextUrl.pathname;

//   // If accessing user-private routes and not authenticated
//   if (pathname.startsWith("/profile") || pathname.startsWith("/cart")) {
//     if (!token) return NextResponse.redirect(new URL("/login", request.url));
//   }

//   // If accessing admin routes
//   if (pathname.startsWith("/admin")) {
//     const role = getUserRoleFromToken(token); // You should decode JWT or session cookie here
//     if (role !== "ADMIN") {
//       return NextResponse.redirect(new URL("/", request.url));
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/(user)/(.*)", "/(admin)/(.*)", "/profile", "/cart", "/orders"],
// };
