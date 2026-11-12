"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

// O login roda no navegador e chama /api/auth/sign-in/email. Ir pela rota HTTP (e não por
// uma Server Action) é o que faz o rate limit do Better Auth valer.
export function FormularioLogin() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setErro(null);
    setEnviando(true);

    const { error: falha } = await authClient.signIn.email({
      email: String(dados.get("email") ?? ""),
      password: String(dados.get("senha") ?? ""),
    });

    if (falha) {
      setEnviando(false);
      // Mensagem genérica de propósito: não revela se o e-mail existe.
      setErro(
        falha.status === 429
          ? "Muitas tentativas. Aguarde um minuto e tente de novo."
          : "E-mail ou senha inválidos.",
      );
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
        />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-saida">
          {erro}
        </p>
      )}

      <Button type="submit" size="lg" className="h-11" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
