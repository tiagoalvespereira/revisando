"use client";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { marcarDia } from "@/app/area/progresso/actions";
import { Icone } from "@/components/Icone";

export type DiaCard = {
  dia: number;
  conteudo: string;
  fase: "base" | "virada" | "reta" | null;
  revisao: boolean;
  especial: string | null;
  paginas: string;
  data: string;
  lerNoVolume: string | null;
  pdfDoDia: string | null;
  questoes: string | null;
};

const FASES = {
  base: { nome: "Base forte", faixa: "bg-preto", texto: "text-off" },
  virada: { nome: "Virada", faixa: "bg-laranja", texto: "text-preto" },
  reta: { nome: "Reta final", faixa: "bg-verde", texto: "text-off" },
} as const;

export function Cronograma({ slug, dias, concluidos, hoje }: { slug: string; dias: DiaCard[]; concluidos: number[]; hoje: number | null }) {
  const [feitos, alternar] = useOptimistic(new Set(concluidos), (atual: Set<number>, d: number) => {
    const n = new Set(atual);
    if (n.has(d)) n.delete(d); else n.add(d);
    return n;
  });
  const [, iniciar] = useTransition();
  const pct = Math.round((feitos.size / dias.length) * 100);

  return (
    <div className="space-y-4">
      <div className="cartao p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-bold">Seu progresso</span>
          <span className="titulo text-xl text-verde">{feitos.size}/{dias.length}</span>
        </div>
        <div className="h-3 rounded-full bg-linha overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-verde transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-cinza">
          {Object.values(FASES).map((f) => <span key={f.nome} className="flex items-center gap-1.5"><span className={`size-3 rounded-sm ${f.faixa}`} />{f.nome}</span>)}
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-2 border-dashed border-laranja" />Revisão geral</span>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2">
        {dias.map((d) => {
          const feito = feitos.has(d.dia);
          const f = d.fase ? FASES[d.fase] : FASES.base;
          return (
            <li key={d.dia} id={`dia-${d.dia}`} className={`cartao overflow-hidden flex ${d.revisao ? "border-2 border-dashed border-laranja" : ""} ${d.dia === hoje ? "ring-3 ring-laranja" : ""}`}>
              <div className={`${f.faixa} ${f.texto} w-16 shrink-0 flex flex-col items-center justify-center py-3`}>
                <span className="text-[10px] uppercase tracking-widest opacity-80">Dia</span>
                <span className="titulo text-2xl leading-none">{String(d.dia).padStart(2, "0")}</span>
                <span className="text-[10px] mt-1 opacity-80">{d.data}</span>
              </div>
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start gap-2">
                  <p className={`flex-1 font-bold leading-snug ${feito ? "text-cinza line-through decoration-verde decoration-2" : ""}`}>{d.conteudo}</p>
                  {d.dia === hoje && !feito && <span className="text-[10px] font-bold uppercase tracking-widest bg-laranja text-preto px-1.5 py-0.5 rounded shrink-0">Hoje</span>}
                </div>
                {d.especial && <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-widest border border-preto px-1.5 py-0.5 rounded">{d.especial}</span>}
                <p className="text-xs text-cinza mt-1">{d.paginas}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {d.pdfDoDia && <Link href={d.pdfDoDia} className="btn btn-preto btn-pequeno"><Icone nome="olho" className="size-4" /> Abrir dia</Link>}
                  {d.lerNoVolume && <Link href={d.lerNoVolume} className={`btn btn-pequeno ${d.pdfDoDia ? "btn-contorno" : "btn-preto"}`}>{d.pdfDoDia ? "No volume" : <><Icone nome="olho" className="size-4" /> Abrir</>}</Link>}
                  {d.questoes && <Link href={d.questoes} className="btn btn-contorno btn-pequeno">Questões</Link>}
                  <button
                    type="button"
                    aria-pressed={feito}
                    onClick={() => iniciar(async () => { alternar(d.dia); await marcarDia(slug, d.dia, !feito); })}
                    className={`btn btn-pequeno ${feito ? "bg-verde text-off" : "btn-contorno"}`}
                  >
                    <Icone nome="check" className="size-4" /> {feito ? "Concluído" : "Concluir"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
