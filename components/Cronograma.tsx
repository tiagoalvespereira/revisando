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
  base: { nome: "Base forte", faixa: "bg-preto", texto: "text-off", ponto: "bg-preto" },
  virada: { nome: "Virada", faixa: "bg-laranja", texto: "text-preto", ponto: "bg-laranja" },
  reta: { nome: "Reta final", faixa: "bg-verde", texto: "text-off", ponto: "bg-verde" },
} as const;

export function Cronograma({ slug, dias, concluidos, hoje }: { slug: string; dias: DiaCard[]; concluidos: number[]; hoje: number | null }) {
  const [feitos, alternar] = useOptimistic(new Set(concluidos), (atual: Set<number>, d: number) => {
    const n = new Set(atual);
    if (n.has(d)) n.delete(d); else n.add(d);
    return n;
  });
  const [, iniciar] = useTransition();
  const pct = Math.round((feitos.size / dias.length) * 100);
  const marcar = (dia: number, feito: boolean) => iniciar(async () => { alternar(dia); await marcarDia(slug, dia, !feito); });

  const grupos = (["base", "virada", "reta"] as const)
    .map((f) => ({ f, lista: dias.filter((d) => (d.fase ?? "base") === f) }))
    .filter((g) => g.lista.length);

  return (
    <div className="space-y-8">
      <div className="cartao p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cinza">Seu progresso</p>
            <p className="titulo text-3xl mt-1"><span className="text-verde">{feitos.size}</span><span className="text-cinza text-xl">/{dias.length} dias</span></p>
          </div>
          {hoje && (
            <a href={`#dia-${hoje}`} className="btn btn-laranja btn-pequeno"><Icone nome="play" className="size-4" /> Ir para o dia {hoje}</a>
          )}
        </div>
        <div className="mt-4 h-3 rounded-full bg-off overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Dias concluídos">
          <div className="h-full rounded-full bg-verde transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs font-semibold text-cinza">
          {Object.values(FASES).map((f) => <span key={f.nome} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${f.ponto}`} />{f.nome}</span>)}
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-dashed border-laranja" />Revisão geral</span>
        </div>
      </div>

      {grupos.map(({ f, lista }) => (
        <section key={f}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`size-3 rounded-full ${FASES[f].ponto}`} />
            <h3 className="titulo text-lg">{FASES[f].nome}</h3>
            <span className="text-xs font-semibold text-cinza">Dias {lista[0].dia}–{lista[lista.length - 1].dia}</span>
            <span className="flex-1 h-px bg-linha" />
          </div>
          <ol className="grid gap-3 md:grid-cols-2">
            {lista.map((d) => {
              const feito = feitos.has(d.dia);
              const eHoje = d.dia === hoje;
              const tema = FASES[d.fase ?? "base"];
              const principal = d.pdfDoDia ?? d.lerNoVolume;
              return (
                <li key={d.dia} id={`dia-${d.dia}`}
                  className={`scroll-mt-40 cartao overflow-hidden flex transition ${eHoje ? "ring-[3px] ring-laranja border-transparent shadow-[0_14px_30px_-20px_rgba(255,107,26,.9)]" : ""} ${d.revisao ? "border-2 border-dashed border-laranja" : ""} ${feito && !eHoje ? "opacity-75" : ""}`}>
                  <div className={`${tema.faixa} ${tema.texto} w-[68px] shrink-0 flex flex-col items-center justify-center py-4`}>
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-75">Dia</span>
                    <span className="titulo text-[28px] leading-none mt-0.5">{String(d.dia).padStart(2, "0")}</span>
                    <span className="text-[10px] mt-1.5 font-semibold opacity-75">{d.data}</span>
                  </div>
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {eHoje && !feito && <span className="selo bg-laranja text-preto">Hoje</span>}
                          {d.especial && <span className="selo bg-off text-preto">{d.especial}</span>}
                        </div>
                        <p className={`font-bold leading-snug ${feito ? "text-cinza" : ""}`}>{d.conteudo}</p>
                        <p className="text-xs text-cinza mt-1.5 leading-relaxed">{d.paginas}</p>
                      </div>
                      <button type="button" onClick={() => marcar(d.dia, feito)} aria-pressed={feito}
                        aria-label={feito ? `Desmarcar dia ${d.dia}` : `Marcar dia ${d.dia} como concluído`}
                        className={`shrink-0 grid place-items-center size-11 rounded-full border-2 transition active:scale-90 ${feito ? "bg-verde border-verde text-white" : "border-linha text-transparent hover:border-verde hover:text-verde"}`}>
                        <Icone nome="check" className="size-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3.5">
                      {principal && <Link href={principal} className="btn btn-preto btn-pequeno"><Icone nome="olho" className="size-4" /> Estudar</Link>}
                      {d.questoes && <Link href={d.questoes} className="btn btn-claro btn-pequeno"><Icone nome="lista" className="size-4" /> Questões</Link>}
                      {d.pdfDoDia && d.lerNoVolume && <Link href={d.lerNoVolume} className="btn btn-fantasma btn-pequeno text-cinza">No volume</Link>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
