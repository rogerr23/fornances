// Classes do diálogo dos formulários. No celular (sem prefixo) ele é uma "gaveta" que
// sobe de baixo, ocupando a largura toda; a partir de `sm:` vira um diálogo centralizado.
// Um componente só, sem precisar detectar o tamanho da tela no JavaScript.
export const CLASSE_GAVETA =
  "top-auto bottom-0 left-0 max-h-[92dvh] max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl";
