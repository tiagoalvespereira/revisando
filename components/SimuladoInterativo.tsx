"use client";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { enviarSimulado } from "@/app/area/simulado/[n]/actions";
import { Leitor } from "@/components/Leitor";
import { Icone } from "@/components/Icone";

type Materia = { materia: string; questoes: [number, number] };
const LETRAS = ["A", "B", "C", "D"] as const;

/**
 * Simulado: PDF + gabarito.
 * Computador: PDF à esquerda, gabarito à direita.
 * Celular: PDF em tela cheia e um botão flutuante que abre a folha de respostas por cima,
 * uma questão por vez (marca e já avança). A correção só acontece no final.
 */
export function SimuladoInterativo({ n, materias, arquivoId }: { n: number; materias: Materia[]; arquivoId: string | null }) {
  const chave = `rv-simulado-${n}`;
  const questoes = useMemo(
    () => materias.flatMap((m) => Array.from({ length: m.questoes[1] - m.questoes[0] + 1 }, (_, i) => ({ numero: m.questoes[0] + i, materia: m.materia }))),
    [materias],
  );
  const total = questoes.length;
  const [resp, setResp] = useState<Record<string, string>>({});
  const [atual, setAtual] = useState(1);
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [verGrade, setVerGrade] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const marcadas = Object.keys(resp).length;

  // Rascunho salvo no aparelho: dá para fechar e continuar depois.
  useEffect(() => {
    try {
      const s = localStorage.getItem(chave);
      if (s) {
        const r = JSON.parse(s) as Record<string, string>;
        setResp(r);
        const proxima = questoes.find((q) => !r[q.numero]);
        if (proxima) setAtual(proxima.numero);
      }
    } catch {}
  }, [chave, questoes]);

  const marcar = useCallback((q: number, l: string, avancar = false) => {
    setResp((r) => {
      const novo = { ...r };
      if (novo[q] === l && !avancar) delete novo[q]; else novo[q] = l;
      try { localStorage.setItem(chave, JSON.stringify(novo)); } catch {}
      return novo;
    });
    if (avancar && q < total) setTimeout(() => setAtual(q + 1), 220);
  }, [chave, total]);

  const enviar = () => {
    if (marcadas < total && !confirm(`Você deixou ${total - marcadas} questões em branco. Enviar para correção mesmo assim?`)) return;
    if (marcadas === total && !confirm("Enviar suas 80 respostas para correção?")) return;
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

  const materiaAtual = questoes[atual - 1]?.materia;
  const pdf = arquivoId ? (
    <Leitor arquivoId={arquivoId} paginaInicial={1} />
  ) : (
    <div className="h-full grid place-items-center bg-[#2a2a2a] text-off/70 p-8 text-center">
      <p>O PDF deste simulado ainda não foi publicado.<br />Você já pode marcar as respostas ao lado.</p>
    </div>
  );

  const Barra = (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-xs font-semibold mb-1"><span>Respondidas</span><span>{marcadas}/{total}</span></div>
        <div className="h-2 rounded-full bg-off overflow-hidden"><div className="h-full rounded-full bg-laranja transition-all" style={{ width: `${(marcadas / total) * 100}%` }} /></div>
      </div>
      <button type="button" onClick={enviar} disabled={pendente || marcadas === 0} className="btn btn-laranja btn-pequeno">
        {pendente ? "Corrigindo..." : "Enviar para correção"}
      </button>
    </div>
  );

  return (
    <>
      {/* ---------------- Computador: PDF | gabarito ---------------- */}
      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_400px] h-[calc(100dvh-120px-58px)]">
        <div className="min-h-0 border-r border-linha">{pdf}</div>
        <aside className="min-h-0 flex flex-col bg-white">
          <div className="p-4 border-b border-linha">{Barra}{erro && <p className="text-vermelho text-sm mt-2">{erro}</p>}</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {materias.map((m) => (
              <fieldset key={m.materia}>
                <legend className="titulo text-xs mb-1.5 text-cinza">{m.materia}</legend>
                <ol className="space-y-1">
                  {Array.from({ length: m.questoes[1] - m.questoes[0] + 1 }, (_, i) => m.questoes[0] + i).map((q) => (
                    <li key={q} className={`flex items-center gap-2 rounded-xl px-2 py-1 ${resp[q] ? "" : "bg-off/60"}`}>
                      <span className="titulo w-7 text-right text-sm text-cinza">{String(q).padStart(2, "0")}</span>
                      <div className="flex gap-1.5" role="radiogroup" aria-label={`Questão ${q}`}>
                        {LETRAS.map((l) => {
                          const sel = resp[q] === l;
                          return (
                            <button key={l} type="button" role="radio" aria-checked={sel} onClick={() => marcar(q, l)}
                              className={`size-9 rounded-full border-2 text-sm font-extrabold transition active:scale-90 ${sel ? "bg-preto border-preto text-laranja" : "border-linha bg-white hover:border-preto"}`}>
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
          </div>
        </aside>
      </div>

      {/* ---------------- Celular: PDF + folha de respostas por cima ---------------- */}
      <div className="md:hidden relative h-[calc(100dvh-76px-4.5rem-52px)]">
        {pdf}

        {!folhaAberta && (
          <button type="button" onClick={() => setFolhaAberta(true)}
            className="absolute right-4 bottom-4 z-20 flex items-center gap-2 rounded-full bg-laranja text-preto pl-4 pr-5 h-14 font-extrabold shadow-[0_10px_30px_-8px_rgba(255,107,26,.9)] active:scale-95">
            <Icone nome="check" className="size-6" />
            <span className="text-left leading-tight text-sm">Gabarito<br /><span className="text-xs font-bold opacity-80">{marcadas}/{total}</span></span>
          </button>
        )}

        {folhaAberta && (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-white shadow-[0_-20px_40px_-20px_rgba(0,0,0,.6)] max-h-[78%] flex flex-col">
            <div className="flex items-center gap-2 px-4 pt-3">
              <span className="mx-auto h-1.5 w-12 rounded-full bg-linha absolute left-1/2 -translate-x-1/2 top-2" />
              <p className="flex-1 text-xs font-bold text-cinza truncate mt-2">{materiaAtual}</p>
              <button type="button" onClick={() => setVerGrade((v) => !v)} className="btn btn-claro btn-pequeno mt-2">{verGrade ? "Uma por vez" : "Ver todas"}</button>
              <button type="button" onClick={() => setFolhaAberta(false)} aria-label="Fechar e ver o PDF" className="btn btn-claro btn-icone mt-2"><Icone nome="olho" className="size-4" /></button>
            </div>

            {!verGrade ? (
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setAtual((a) => Math.max(1, a - 1))} disabled={atual === 1} className="btn btn-fantasma btn-icone" aria-label="Questão anterior"><Icone nome="voltar" className="size-5" /></button>
                  <p className="titulo text-2xl">Questão <span className="text-laranja">{String(atual).padStart(2, "0")}</span></p>
                  <button type="button" onClick={() => setAtual((a) => Math.min(total, a + 1))} disabled={atual === total} className="btn btn-fantasma btn-icone" aria-label="Próxima questão"><Icone nome="seta" className="size-5" /></button>
                </div>
                <div className="grid grid-cols-4 gap-2.5 mt-3" role="radiogroup" aria-label={`Questão ${atual}`}>
                  {LETRAS.map((l) => {
                    const sel = resp[atual] === l;
                    return (
                      <button key={l} type="button" role="radio" aria-checked={sel} onClick={() => marcar(atual, l, true)}
                        className={`h-16 rounded-2xl border-2 titulo text-2xl transition active:scale-95 ${sel ? "bg-preto border-preto text-laranja" : "border-linha bg-white"}`}>
                        {l}
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-cinza mt-2">Toque na letra: a próxima questão abre sozinha. Para trocar, volte e toque em outra.</p>
              </div>
            ) : (
              <div className="px-4 pt-3 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1.5">
                  {questoes.map((q) => (
                    <button key={q.numero} type="button" onClick={() => { setAtual(q.numero); setVerGrade(false); }}
                      className={`h-10 rounded-lg text-[11px] font-bold leading-none flex flex-col items-center justify-center ${q.numero === atual ? "ring-2 ring-laranja" : ""} ${resp[q.numero] ? "bg-preto text-off" : "bg-off text-cinza"}`}>
                      <span>{q.numero}</span>
                      {resp[q.numero] && <span className="text-laranja text-xs mt-0.5">{resp[q.numero]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 mt-auto border-t border-linha">{Barra}{erro && <p className="text-vermelho text-sm mt-2">{erro}</p>}</div>
          </div>
        )}
      </div>
    </>
  );
}
