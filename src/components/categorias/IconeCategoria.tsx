import {
  Bike,
  Briefcase,
  Car,
  CircleDollarSign,
  Ellipsis,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Undo2,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Os ícones ficam salvos no banco pelo nome ("shopping-cart"). Este mapa liga o nome
// ao componente. Importar só os usados mantém o JavaScript enviado ao celular pequeno
// (importar TODOS os ícones do lucide pesaria centenas de KB).
export const ICONES_CATEGORIA: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  bike: Bike,
  car: Car,
  house: House,
  receipt: Receipt,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  ellipsis: Ellipsis,
  wallet: Wallet,
  briefcase: Briefcase,
  "undo-2": Undo2,
};

export function IconeCategoria({
  icone,
  cor,
  tamanho = "md",
}: {
  icone: string;
  cor: string;
  tamanho?: "sm" | "md";
}) {
  const Icone = ICONES_CATEGORIA[icone] ?? CircleDollarSign;
  const caixa = tamanho === "sm" ? "size-7" : "size-9";
  const desenho = tamanho === "sm" ? "size-3.5" : "size-4.5";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${caixa}`}
      // Cor da categoria com 15% de opacidade no fundo e cheia no ícone.
      style={{ backgroundColor: `${cor}26`, color: cor }}
      aria-hidden
    >
      <Icone className={desenho} />
    </span>
  );
}
