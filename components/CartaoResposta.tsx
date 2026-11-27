"use client";
import { useEffect, useState, useTransition } from "react";
import { enviarSimulado } from "@/app/area/simulado/[n]/actions";

type Materia = { materia: string; questoes: [number, number] };
const LETRAS = ["A", "B", "C", "D"] as const;

export function CartaoResposta({ n, materias }: { n: number; materias: Materia[] }) {
  const chave = `rv-simulado-${n}`;
  const [resp, setResp] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const total = materias.reduce((t, m) => t + m.questoes[1] - m.questoes[0] + 1, 0);
  const marcadas = Object.keys(resp).length;

  // Rascunho salvo no aparelho: o aluno pode fechar e continuar depois.
  useEffect(() => {
    try { const s = localStorage.getItem(chave); if (s) setResp(JSON.parse(s)); } catch {}
  }, [chave]);
  const marcar = (q: number, l: string) => {
    setResp((r) => {
      const novo = { ...r };
      if (novo[q] === l) delete novo[q]; else novo[q] = l;
      try { localStorage.setItem(chave, JSON.stringify(novo)); } catch {}
      return novo;
    });
  };

  const enviar = () => {
    if (marcadas < total && !confirm(`Você deixou ${total - marcadas} questões em branco. Corrigir mesmo assim?`)) return;
    setErro(null);
    iniciar(async () => {
      try {
        await enviarSimulado(n, resp);
      } catch (e) {
        if ((e as Error).message?.includes("NEXT_REDIRECT")) { try { localStorage.removeItem(chave); } catch {} throw e; }
        setErro("Não foi possível enviar. Verifique a conexão e tente de novo.");
      }
    });
  };

  return (
    <div className="space-y-5 pb-24">
      {materias.map((m) => (
        <fieldset key={m.materia} className="cartao p-4">
          <legend className="titulo text-sm px-1">{m.materia}</legend>
          <ol className="divide-y divide-linha">
            {Array.from({ length: m.questoes[1] - m.questoes[0] + 1 }, (_, i) => m.questoes[0] + i).map((q) => (
              <li key={q} className="flex items-center gap-3 py-2">
                <span className="titulo w-8 text-right text-cinza">{String(q).padStart(2, "0")}</span>
                <div className="flex gap-2" role="radiogroup" aria-label={`Questão ${q}`}>
                  {LETRAS.map((l) => {
                    const sel = resp[q] === l;
                    return (
                      <button key={l} type="button" role="radio" aria-checked={sel} onClick={() => marcar(q, l)}
                        className={`size-11 rounded-full border-2 font-extrabold transition ${sel ? "bg-preto border-preto text-laranja" : "border-linha bg-white hover:border-preto"}`}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </fieldset>
      ))}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#2a2a2a] bg-preto px-4 py-3" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 text-off text-sm leading-tight">
            <b className="titulo text-laranja text-lg block">{marcadas}/{total}</b>marcadas
            {erro && <span className="block text-[#ff9b9b]">{erro}</span>}
          </div>
          <button type="button" onClick={enviar} disabled={pendente || marcadas === 0} className="btn btn-laranja">
            {pendente ? "Corrigindo..." : "Corrigir"}
          </button>
        </div>
      </div>
    </div>
  );
}
