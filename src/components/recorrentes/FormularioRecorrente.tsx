"use client";

import { useRef, useState, useTransition } from "react";

import { avisos } from "@/components/layout/Avisos";
import {
  AlternadorTipo,
  CampoValor,
  GradeCategorias,
  SeletorMeio,
} from "@/components/layout/CamposFormulario";
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
import {
  formatarDataCompleta,
  formatarMes,
  hojeEmSaoPaulo,
  mesDaData,
  somarMesesAoMes,
} from "@/lib/datas";
import { aplicarMascaraValor } from "@/lib/dinheiro";
import { dataDaCobranca, primeiraCompetencia, proximaCobranca } from "@/lib/recorrencias";
import {
  cancelarRecorrencia,
  criarRecorrencia,
  editarRecorrencia,
} from "@/server/actions/recorrencias";
import type { CategoriaResumo } from "@/server/queries/categorias";
import type { RecorrenciaDaLista } from "@/server/queries/recorrencias";

export function DialogoRecorrente({
  aberto,
  edicao,
  categorias,
  aoFechar,
}: {
  aberto: boolean;
  edicao: RecorrenciaDaLista | null;
  categorias: CategoriaResumo[];
  aoFechar: () => void;
}) {
  const campoValor = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent initialFocus={campoValor} className={CLASSE_GAVETA}>
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar recorrente" : "Nova recorrente"}</DialogTitle>
          <DialogDescription>
            Assinaturas e receitas fixas: o lançamento de cada mês é criado sozinho, no dia 1, já
            com a data da cobrança.
          </DialogDescription>
        </DialogHeader>
        {aberto && (
          <Formulario
            key={edicao?.id ?? "nova"}
            edicao={edicao}
            categorias={categorias}
            campoValor={campoValor}
            aoTerminar={aoFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  edicao,
  categorias,
  campoValor,
  aoTerminar,
}: {
  edicao: RecorrenciaDaLista | null;
  categorias: CategoriaResumo[];
  campoValor: React.RefObject<HTMLInputElement | null>;
  aoTerminar: () => void;
}) {
  const hoje = hojeEmSaoPaulo();
  const primeiraDoTipo = (tipo: TipoLancamento) =>
    categorias.find((c) => c.tipo === tipo && c.nome === "Assinaturas")?.id ??
    categorias.find((c) => c.tipo === tipo)?.id ??
    null;

  const [tipo, setTipo] = useState<TipoLancamento>(edicao?.tipo ?? "despesa");
  const [descricao, setDescricao] = useState(edicao?.descricao ?? "");
  const [valor, setValor] = useState(() =>
    aplicarMascaraValor(String(edicao?.valorCentavos ?? "")),
  );
  const [meio, setMeio] = useState<MeioPagamento>(edicao?.meioPagamento ?? "credito");
  const [categoriaId, setCategoriaId] = useState(edicao?.categoria.id ?? primeiraDoTipo("despesa"));
  const [dia, setDia] = useState(edicao?.diaCobranca ?? Number(hoje.slice(8, 10)));
  const [mesEscolhido, setMesEscolhido] = useState<string>("");
  const [cancelando, setCancelando] = useState(false);
  const [dataCancelamento, setDataCancelamento] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function trocarTipo(novo: TipoLancamento) {
    setTipo(novo);
    setCategoriaId(primeiraDoTipo(novo));
    if (novo === "receita" && meio === "credito") setMeio("pix");
  }

  // Prévia da primeira cobrança (cadastro) ou da próxima (edição), calculada com a
  // MESMA função que o servidor usa — o que aparece aqui é o que vai acontecer.
  const mesMaisCedo = primeiraCompetencia(dia, hoje);
  const mesPrimeira = primeiraCompetencia(dia, hoje, mesEscolhido || undefined);
  const previa = edicao
    ? proximaCobranca(
        {
          diaCobranca: dia,
          inicioEm: edicao.inicioEm,
          ultimaCompetenciaGerada: null,
          canceladaEm: null,
        },
        hoje,
      )
    : dataDaCobranca(mesPrimeira, dia);
  const opcoesDeMes = Array.from({ length: 12 }, (_, i) => somarMesesAoMes(mesMaisCedo, i));

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const dados = {
        tipo,
        descricao,
        valorCentavos: valor.centavos,
        meioPagamento: meio,
        categoriaId,
        diaCobranca: dia,
      };
      if (edicao) {
        const resultado = await editarRecorrencia({ id: edicao.id, ...dados });
        if (!resultado.ok) return setErro(resultado.erro);
        avisos.add({ title: "Recorrente atualizada" });
      } else {
        const resultado = await criarRecorrencia({
          ...dados,
          mesInicio: mesEscolhido || undefined,
        });
        if (!resultado.ok) return setErro(resultado.erro);
        avisos.add({
          title: "Recorrente criada",
          description: `Primeira cobrança: ${formatarDataCompleta(resultado.primeiraCobranca)}`,
        });
      }
      aoTerminar();
    });
  }

  function cancelar() {
    if (!edicao) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await cancelarRecorrencia({ id: edicao.id, dataCancelamento });
      if (!resultado.ok) return setErro(resultado.erro);
      avisos.add({
        title: "Recorrente cancelada",
        description:
          resultado.agendadasApagadas > 0
            ? `${resultado.agendadasApagadas} cobrança agendada foi removida.`
            : undefined,
      });
      aoTerminar();
    });
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        salvar();
      }}
      className="flex flex-col gap-5"
      aria-busy={salvando}
    >
      <AlternadorTipo tipo={tipo} onChange={trocarTipo} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descricao-recorrente">Nome</Label>
        <Input
          id="descricao-recorrente"
          required
          maxLength={60}
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          placeholder={tipo === "despesa" ? "Ex.: Netflix, academia" : "Ex.: Salário, bolsa"}
          className="h-11"
        />
      </div>

      <CampoValor
        rotulo="Valor por mês"
        valor={valor}
        onChange={setValor}
        tipo={tipo}
        campoRef={campoValor}
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Meio de pagamento</legend>
        <SeletorMeio meio={meio} onChange={setMeio} />
      </fieldset>

      <GradeCategorias
        categorias={categorias.filter((c) => c.tipo === tipo)}
        selecionada={categoriaId}
        onChange={setCategoriaId}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dia">Dia da cobrança</Label>
          <select
            id="dia"
            value={dia}
            onChange={(evento) => setDia(Number(evento.target.value))}
            className="h-10 rounded-md border bg-card px-2 text-sm"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Todo dia {n}
              </option>
            ))}
          </select>
        </div>
        {!edicao && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mes-inicio">Começa em</Label>
            <select
              id="mes-inicio"
              value={mesEscolhido || mesMaisCedo}
              onChange={(evento) =>
                setMesEscolhido(evento.target.value === mesMaisCedo ? "" : evento.target.value)
              }
              className="h-10 rounded-md border bg-card px-2 text-sm"
            >
              {opcoesDeMes.map((mes) => (
                <option key={mes} value={mes}>
                  {formatarMes(mes)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {dia > 28 && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Nos meses sem o dia {dia}, a cobrança cai no último dia do mês.
        </p>
      )}

      {previa && (
        <p className="rounded-lg bg-destaque-suave px-3 py-2.5 text-sm text-destaque">
          {edicao ? "Próxima cobrança" : "Primeira cobrança"}:{" "}
          <strong className="tabular-nums">{formatarDataCompleta(previa)}</strong>
          {!edicao && mesDaData(previa) !== mesDaData(hoje) && previa > hoje && (
            <span className="block text-xs opacity-80">
              Já aparece em Lançamentos como &quot;Agendado&quot; a partir do dia 1 do mês dela.
            </span>
          )}
        </p>
      )}

      {erro && (
        <p role="alert" className="text-sm text-saida">
          {erro}
        </p>
      )}

      {cancelando ? (
        <div className="flex flex-col gap-3 rounded-lg border border-saida/30 bg-saida-suave p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="data-cancelamento">Data do cancelamento</Label>
            <Input
              id="data-cancelamento"
              type="date"
              value={dataCancelamento}
              onChange={(evento) => evento.target.value && setDataCancelamento(evento.target.value)}
              className="h-10 bg-card"
            />
          </div>
          <p className="text-xs">
            Cobranças agendadas depois dessa data serão removidas. As já debitadas ficam.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-11 flex-1"
              onClick={cancelar}
              disabled={salvando}
            >
              Confirmar cancelamento
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11"
              onClick={() => setCancelando(false)}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg" className="h-11 flex-1" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
          {edicao && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-11 text-saida"
              onClick={() => setCancelando(true)}
            >
              Cancelar recorrente
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
