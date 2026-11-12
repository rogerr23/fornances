import { createAuthClient } from "better-auth/react";

// Client do Better Auth para componentes "use client" (login e sair).
// Ele chama /api/auth/* no mesmo domínio do app.
export const authClient = createAuthClient();
