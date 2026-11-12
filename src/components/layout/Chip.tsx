"use client";

import type { ReactNode } from "react";

/** Botão em formato de pílula usado nas escolhas rápidas (meio, data, escopo...). */
export function Chip({
  ativo,
  onClick,
  desativado,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  desativado?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      disabled={desativado}
      className={`h-10 min-w-11 rounded-full border px-4 text-sm transition-colors disabled:opacity-50 ${
        ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
