import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FormularioLogin } from "@/components/auth/FormularioLogin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obterSessao } from "@/server/auth";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Fornances</CardTitle>
          <CardDescription>Entre com seu e-mail e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioLogin />
        </CardContent>
      </Card>

      {/* Ler a sessão é um acesso à requisição, então fica dentro de <Suspense> (Cache Components). */}
      <Suspense>
        <RedirecionarSeLogado />
      </Suspense>
    </main>
  );
}

// Quem já está logado e abre /login volta para o Início.
async function RedirecionarSeLogado() {
  const sessao = await obterSessao();
  if (sessao) redirect("/");
  return null;
}
