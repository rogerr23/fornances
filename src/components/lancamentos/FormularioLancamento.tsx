"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { avisos } from "@/components/layout/Avisos";
import {
  AlternadorTipo,
  CampoValor,
  GradeCategorias,
  SeletorMeio,
} from "@/components/layout/CamposFormulario";
import { Chip } from "@/components/layout/Chip";
import { CLASSE_GAVETA } from "@/components/layout/gaveta";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MeioPagamento, TipoLancamento } from "@/db/schema";
import { hojeEmSaoPaulo, somarDias } from "@/lib/datas";
import { aplicarMascaraValor, formatarCentavos } from "@/lib/dinheiro";
import { MAXIMO_PARCELAS, valorDaParcela } from "@/lib/parcelas";
import type { Escopo } from "@/lib/validacao-lancamento";
import {
  criarLancamento,
  desfazerLancamento,
  editarLancamento,
  excluirLancamento,
} from "@/server/actions/lancamentos";
import type { CategoriaResumo } from "@/server/queries/categorias";
import type { LancamentoDaLista, PadroesDoFormulario } from "@/server/queries/lancamentos";

import { useLancamento } from "./ContextoLancamento";

// O diálogo em si: gaveta de baixo no celular, diálogo centralizado no computador
// (ver CLASSE_GAVETA).
export function DialogoLancamento(props: {
  categorias: CategoriaResumo[];
  padroes: PadroesDoFormulario;
}) {
  const { estado, fechar } = useLancamento();
  const campoValor = useRef<HTMLInputElement>(null);
  const edicao = estado.aberto ? estado.edicao : null;

  return (
    <Dialog open={estado.aberto} onOpenChange={(aberto) => !aberto && fechar()}>
      <DialogContent initialFocus={campoValor} className={CLASSE_GAVETA}>
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription className="sr-only">
            Preencha valor, meio de pagamento, categoria e data.
          </DialogDescription>
        </DialogHeader>
        {/* `key` recria o formulário do zero a cada abertura (estado limpo). */}
        {estado.aberto && (
          <Formulario
            key={edicao?.id ?? "novo"}
            {...props}
            edicao={edicao}
            campoValor={campoValor}
            aoTerminar={fechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormularioProps = {
  categorias: CategoriaResumo[];
  padroes: PadroesDoFormulario;
  edicao: LancamentoDaLista | null;
  campoValor: React.RefObject<HTMLInputElement | null>;
  aoTerminar: () => void;
};

function Formulario({ categorias, padroes, edicao, campoValor, aoTerminar }: FormularioProps) {
  const hoje = hojeEmSaoPaulo();
  const ehParcela = Boolean(edicao?.grupoParcelamentoId);

  const categoriaPadrao = (tipo: TipoLancamento) => {
    const sugerida = padroes.categoriaPorTipo[tipo];
    const doTipo = categorias.filter((c) => c.tipo === tipo);
    return doTipo.find((c) => c.id === sugerida)?.id ?? doTipo[0]?.id ?? null;
  };

  const [tipo, setTipo] = useState<TipoLancamento>(edicao?.tipo ?? "despesa");
  const [valor, setValor] = useState(() =>
    aplicarMascaraValor(String(edicao?.valorCentavos ?? "")),
  );
  const [meio, setMeio] = useState<MeioPagamento>(
    edicao?.meioPagamento ?? padroes.meioPagamento ?? "pix",
  );
  const [categoriaId, setCategoriaId] = useState(
    edicao?.categoria.id ?? categoriaPadrao("despesa"),
  );
  const [data, setData] = useState(edicao?.dataLancamento ?? hoje);
  const [descricao, setDescricao] = useState(edicao?.descricao ?? "");
  const [parcelas, setParcelas] = useState(1);
  const [emAndamento, setEmAndamento] = useState(false);
  const [parcelaAtual, setParcelaAtual] = useState(2);
  const [escopo, setEscopo] = useState<Escopo>("somente-este");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  // Parcelamento só para despesa no crédito, e só ao criar (SPEC 3.4 e 3.8).
  const podeParcelar = !edicao && tipo === "despesa" && meio === "credito";
  const parcelado = podeParcelar && (parcelas > 1 || emAndamento);
  const grupoInteiro = ehParcela && escopo === "todo-grupo";

  function trocarTipo(novo: TipoLancamento) {
    setTipo(novo);
    setCategoriaId(categoriaPadrao(novo));
    // Receita "no crédito" quase nunca acontece: se veio do último gasto, troca para Pix.
    if (novo === "receita" && meio === "credito") setMeio("pix");
  }

  function montarEntrada() {
    const comum = { tipo, categoriaId, meioPagamento: meio, descricao };
    if (!podeParcelar || (!emAndamento && parcelas === 1)) {
      return { forma: "a-vista", ...comum, valorCentavos: valor.centavos, dataLancamento: data };
    }
    if (emAndamento) {
      return {
        forma: "em-andamento",
        ...comum,
        valorParcelaCentavos: valor.centavos,
        parcelaAtual,
        totalParcelas: parcelas,
        dataParcelaAtual: data,
      };
    }
    return {
      forma: "parcelado",
      ...comum,
      valorTotalCentavos: valor.centavos,
      totalParcelas: parcelas,
      dataCompra: data,
    };
  }

  function salvar(lancarOutro = false) {
    setErro(null);

    iniciar(async () => {
      if (edicao) {
        const resultado = await editarLancamento({
          id: edicao.id,
          escopo,
          tipo,
          categoriaId,
          meioPagamento: meio,
          descricao,
          valorCentavos: valor.centavos,
          dataLancamento: data,
        });
        if (!resultado.ok) return setErro(resultado.erro);
        avisos.add({ title: "Lançamento atualizado" });
        return aoTerminar();
      }

      const resultado = await criarLancamento(montarEntrada());
      if (!resultado.ok) return setErro(resultado.erro);

      const quantidade = resultado.ids.length;
      avisos.add({
        title: quantidade > 1 ? `${quantidade} parcelas lançadas` : "Lançamento salvo",
        timeout: 10000, // mais tempo que os outros avisos, para dar tempo de desfazer
        actionProps: {
          children: "Desfazer",
          onClick: async () => {
            const desfeito = await desfazerLancamento(resultado.ids);
            avisos.add({ title: desfeito.ok ? "Lançamento desfeito" : desfeito.erro });
          },
        },
      });

      if (lancarOutro) {
        // Mantém tipo, meio, categoria e data; limpa o que muda de um gasto para outro.
        setValor(aplicarMascaraValor(""));
        setDescricao("");
        setParcelas(1);
        setEmAndamento(false);
        campoValor.current?.focus();
      } else {
        aoTerminar();
      }
    });
  }

  function excluir() {
    if (!edicao) return;
    iniciar(async () => {
      const resultado = await excluirLancamento({ id: edicao.id, escopo });
      if (!resultado.ok) return setErro(resultado.erro);
      avisos.add({
        title:
          resultado.quantidade > 1
            ? `${resultado.quantidade} parcelas excluídas`
            : "Lançamento excluído",
      });
      aoTerminar();
    });
  }

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  return (
    <form
      onSubmit={(evento: FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        salvar();
      }}
      className="flex flex-col gap-5"
      aria-busy={salvando}
    >
      {/* Despesa / Receita (parcelas não mudam de tipo) */}
      {!ehParcela && <AlternadorTipo tipo={tipo} onChange={trocarTipo} />}

      <CampoValor
        rotulo={
          emAndamento && podeParcelar
            ? "Valor da parcela"
            : parcelado
              ? "Valor total da compra"
              : "Valor"
        }
        valor={valor}
        onChange={setValor}
        tipo={tipo}
        desativado={grupoInteiro}
        campoRef={campoValor}
      />

      {/* Meio de pagamento */}
      <fieldset className="flex flex-col gap-1.5" disabled={ehParcela}>
        <legend className="mb-1.5 text-sm font-medium">Meio de pagamento</legend>
        <SeletorMeio meio={meio} onChange={setMeio} />
        {meio === "credito" && tipo === "despesa" && !edicao && (
          <p className="text-xs text-muted-foreground">
            Lance a compra no dia em que ela foi feita. Pagar a fatura não é uma despesa nova (seria
            contar duas vezes).
          </p>
        )}
      </fieldset>

      {/* Parcelas (só crédito, só ao criar) */}
      {podeParcelar && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="parcelas">Parcelas</Label>
            <select
              id="parcelas"
              value={parcelas}
              onChange={(evento) => {
                const total = Number(evento.target.value);
                setParcelas(total);
                setParcelaAtual((atual) => Math.min(atual, total));
                if (total === 1) setEmAndamento(false);
              }}
              className="h-10 rounded-md border bg-card px-2 text-sm"
            >
              {Array.from({ length: MAXIMO_PARCELAS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "À vista (1x)" : `${n}x`}
                </option>
              ))}
            </select>
          </div>

          {parcelas > 1 && !emAndamento && valor.centavos >= parcelas && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {parcelas}x de {formatarCentavos(valorDaParcela(valor.centavos, parcelas))}
              {valor.centavos % parcelas !== 0 &&
                ` (1ª de ${formatarCentavos(valorDaParcela(valor.centavos, parcelas) + (valor.centavos % parcelas))})`}
            </p>
          )}

          {parcelas > 1 && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emAndamento}
                onChange={(evento) => setEmAndamento(evento.target.checked)}
                className="size-4 accent-primary"
              />
              Compra já em andamento (já paguei algumas parcelas)
            </label>
          )}

          {emAndamento && (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="parcela-atual">Estou na parcela</Label>
              <div className="flex items-center gap-2 text-sm">
                <select
                  id="parcela-atual"
                  value={parcelaAtual}
                  onChange={(evento) => setParcelaAtual(Number(evento.target.value))}
                  className="h-10 rounded-md border bg-card px-2"
                >
                  {Array.from({ length: parcelas }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                de {parcelas}
              </div>
            </div>
          )}
          {emAndamento && (
            <p className="text-xs text-muted-foreground">
              Serão lançadas só as parcelas de {parcelaAtual} a {parcelas} (
              {parcelas - parcelaAtual + 1}x de {formatarCentavos(valor.centavos)}).
            </p>
          )}
        </div>
      )}

      <GradeCategorias
        categorias={categoriasDoTipo}
        selecionada={categoriaId}
        onChange={setCategoriaId}
      />

      {/* Data */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="data">
          {emAndamento && podeParcelar
            ? "Data da parcela atual"
            : parcelado
              ? "Data da compra"
              : "Data"}
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Chip ativo={data === hoje} onClick={() => setData(hoje)} desativado={grupoInteiro}>
            Hoje
          </Chip>
          <Chip
            ativo={data === somarDias(hoje, -1)}
            onClick={() => setData(somarDias(hoje, -1))}
            desativado={grupoInteiro}
          >
            Ontem
          </Chip>
          <Input
            id="data"
            type="date"
            value={data}
            onChange={(evento) => evento.target.value && setData(evento.target.value)}
            disabled={grupoInteiro}
            className="h-10 w-auto flex-1"
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Input
          id="descricao"
          value={descricao}
          maxLength={120}
          onChange={(evento) => setDescricao(evento.target.value)}
          placeholder={tipo === "despesa" ? "Ex.: almoço com a equipe" : "Ex.: bolsa de novembro"}
          className="h-11"
        />
      </div>

      {/* Edição de parcela: só nesta ou no grupo todo (SPEC 3.4) */}
      {ehParcela && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">
            Parcela {edicao?.numeroParcela}/{edicao?.totalParcelas} — aplicar em
          </legend>
          <div className="flex flex-wrap gap-2">
            <Chip ativo={escopo === "somente-este"} onClick={() => setEscopo("somente-este")}>
              Só nesta
            </Chip>
            <Chip ativo={escopo === "todo-grupo"} onClick={() => setEscopo("todo-grupo")}>
              Todas as parcelas
            </Chip>
          </div>
          {grupoInteiro && (
            <p className="text-xs text-muted-foreground">
              Em todas as parcelas dá para mudar categoria e descrição (ou excluir tudo). Valor e
              data mudam uma parcela por vez.
            </p>
          )}
        </fieldset>
      )}

      {erro && (
        <p role="alert" className="text-sm text-saida">
          {erro}
        </p>
      )}

      {/* Ações */}
      {confirmandoExclusao ? (
        <div className="flex flex-col gap-2 rounded-lg border border-saida/30 bg-saida-suave p-3">
          <p className="text-sm">
            {grupoInteiro
              ? "Excluir todas as parcelas lançadas desta compra?"
              : "Excluir este lançamento?"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-11 flex-1"
              onClick={excluir}
              disabled={salvando}
            >
              Excluir
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 flex-1"
              onClick={() => setConfirmandoExclusao(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg" className="h-11 flex-1" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
          {edicao ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-11 text-saida"
              onClick={() => setConfirmandoExclusao(true)}
            >
              <Trash2 /> Excluir
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 flex-1"
              disabled={salvando}
              onClick={(evento) => {
                if (evento.currentTarget.form?.reportValidity()) salvar(true);
              }}
            >
              Salvar e lançar outro
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
