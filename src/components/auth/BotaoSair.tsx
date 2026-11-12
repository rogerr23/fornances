"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    // Apaga a sessão no banco e o cookie no navegador.
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="lg" onClick={sair} disabled={saindo}>
      <LogOut /> Sair
    </Button>
  );
}
