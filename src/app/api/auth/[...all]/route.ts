import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth";

// Todas as rotas do Better Auth (/api/auth/sign-in/email, /api/auth/sign-out, ...)
// passam por aqui. É nesse caminho HTTP que o rate limit é aplicado.
export const { GET, POST } = toNextJsHandler(auth);
