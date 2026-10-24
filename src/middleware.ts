import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Protege rutas del dashboard y admin. Las rutas /api/transactions (webhook)
// y /api/auth quedan fuera por el matcher de abajo.
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isOnLogin = nextUrl.pathname.startsWith("/login");
  const isOnAdmin = nextUrl.pathname.startsWith("/admin");
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

  // Usuario no autenticado intentando entrar a área protegida
  if (!isLoggedIn && (isOnAdmin || isOnDashboard)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Autenticado en /login → redirige a su área
  if (isLoggedIn && isOnLogin) {
    const dest = role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // Solo ADMIN puede entrar a /admin
  if (isOnAdmin && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Un ADMIN que entra a /dashboard lo mandamos a /admin
  if (isOnDashboard && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Excluye assets estáticos, el webhook y las rutas de auth.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
