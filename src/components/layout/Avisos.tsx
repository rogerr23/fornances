"use client";

import { Toast } from "@base-ui/react/toast";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

// Avisos (toasts) do app, feitos com o Toast do Base UI (já instalado pelo shadcn),
// sem precisar de biblioteca extra. O `avisos` pode ser chamado de qualquer lugar:
//   avisos.add({ title: "Lançamento salvo", actionProps: { children: "Desfazer", onClick } })
export const avisos = Toast.createToastManager();

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider toastManager={avisos} timeout={6000} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-24 left-4 z-60 mx-auto flex max-w-sm flex-col sm:right-6 sm:bottom-6 sm:left-auto sm:w-sm">
          <ListaAvisos />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ListaAvisos() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((aviso) => (
    <Toast.Root
      key={aviso.id}
      toast={aviso}
      className="absolute right-0 bottom-0 left-0 [transform:translateY(calc(var(--toast-index)*-0.75rem))_scale(calc(1-var(--toast-index)*0.05))] rounded-xl border bg-card text-card-foreground shadow-lg transition-all duration-300 data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:translate-y-full data-starting-style:opacity-0"
    >
      <Toast.Content className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <Toast.Title className="text-sm font-medium" />
          <Toast.Description className="text-sm text-muted-foreground" />
        </div>
        <Toast.Action render={<Button variant="outline" size="lg" />} />
      </Toast.Content>
    </Toast.Root>
  ));
}
