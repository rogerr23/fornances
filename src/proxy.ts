import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Checagem OTIMISTA (só olha se o cookie existe, sem ir ao banco): quem não tem cookie
// de sessão nem chega a renderizar as páginas do app e vai direto para /login.
// A checagem de verdade (cookie válido e não expirado) é feita por `exigirUsuario()`.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const urlLogin = new URL("/login", request.url);
  return NextResponse.redirect(urlLogin);
}

export const config = {
  // Roda em tudo, MENOS: /login, rotas do Better Auth, a rota do cron (ela se protege
  // com o CRON_SECRET, não com sessão), arquivos do Next e arquivos com extensão.
  matcher: ["/((?!login|api/auth|api/cron|_next/static|_next/image|.*\\..*).*)"],
};
