"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

const TRECHO = 1024 * 1024;

/**
 * Leitor de PDF que busca o arquivo em trechos pela rota protegida /api/arquivos/[id]/conteudo.
 * Abre na página `paginaInicial` (página do arquivo, começando em 1) e renderiza só o que está perto da tela.
 */
export function Leitor({ arquivoId, paginaInicial = 1 }: { arquivoId: string; paginaInicial?: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [proporcao, setProporcao] = useState(1.414);
  const [erro, setErro] = useState<string | null>(null);
  const [atual, setAtual] = useState(paginaInicial);
  const [zoom, setZoom] = useState(1);
  const [largura, setLargura] = useState(0);
  const renderizadas = useRef(new Map<number, { cancelar: () => void }>());

  // Carrega o documento
  useEffect(() => {
    let vivo = true;
    let tarefa: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const url = `/api/arquivos/${arquivoId}/conteudo`;
        const buscar = async (ini: number, fim: number) => {
          const r = await fetch(url, { headers: { Range: `bytes=${ini}-${fim}` }, credentials: "same-origin" });
          if (r.status === 401) {
            window.location.href = `/entrar?volta=${encodeURIComponent(location.pathname + location.search)}`;
            throw new Error("login");
          }
          if (r.status !== 206 && !r.ok) throw new Error(`Falha ao carregar (${r.status})`);
          return r;
        };
        const primeiro = await buscar(0, TRECHO - 1);
        const total = Number(primeiro.headers.get("content-range")?.split("/")[1]);
        if (!total) throw new Error("Tamanho do arquivo desconhecido");
        const inicio = new Uint8Array(await primeiro.arrayBuffer());

        const transporte = new pdfjs.PDFDataRangeTransport(total, inicio);
        transporte.requestDataRange = (ini: number, fim: number) => {
          // Pedidos grandes são divididos em trechos de até 2 MB (limite da rota).
          (async () => {
            for (let a = ini; a < fim; a += 2 * 1024 * 1024) {
              const b = Math.min(fim, a + 2 * 1024 * 1024);
              const r = await buscar(a, b - 1);
              transporte.onDataRange(a, new Uint8Array(await r.arrayBuffer()));
            }
          })().catch((e) => vivo && setErro(String(e.message ?? e)));
        };
        const t = pdfjs.getDocument({ range: transporte, rangeChunkSize: TRECHO, disableAutoFetch: true, disableStream: true });
        tarefa = t;
        const d = await t.promise;
        if (!vivo) return;
        const p1 = await d.getPage(Math.min(Math.max(1, paginaInicial), d.numPages));
        const v = p1.getViewport({ scale: 1 });
        setProporcao(v.height / v.width);
        setDoc(d);
      } catch (e) {
        if (vivo && (e as Error).message !== "login") setErro((e as Error).message || "Não foi possível abrir o PDF.");
      }
    })();
    return () => {
      vivo = false;
      tarefa?.destroy();
    };
  }, [arquivoId, paginaInicial]);

  // Largura disponível
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth));
    ro.observe(el);
    setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const larguraPagina = Math.max(200, Math.round((largura - 16) * zoom));

  const renderizar = useCallback(
    async (n: number, canvas: HTMLCanvasElement) => {
      if (!doc || renderizadas.current.has(n)) return;
      const pagina = await doc.getPage(n);
      const base = pagina.getViewport({ scale: 1 });
      const escala = larguraPagina / base.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = pagina.getViewport({ scale: escala * dpr });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      const tarefa = pagina.render({ canvasContext: canvas.getContext("2d")!, viewport: vp });
      renderizadas.current.set(n, { cancelar: () => tarefa.cancel() });
      tarefa.promise.catch(() => renderizadas.current.delete(n));
    },
    [doc, larguraPagina],
  );

  // Ao mudar zoom/largura, descarta renderizações
  useEffect(() => {
    renderizadas.current.forEach((r) => r.cancelar());
    renderizadas.current.clear();
  }, [larguraPagina, doc]);

  // Observa páginas perto da tela
  useEffect(() => {
    const el = caixa.current;
    if (!doc || !el) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const n = Number((e.target as HTMLElement).dataset.pagina);
          const canvas = e.target.querySelector("canvas")!;
          if (e.isIntersecting) renderizar(n, canvas);
          else if (renderizadas.current.has(n) && Math.abs(n - atualRef.current) > 6) {
            renderizadas.current.get(n)!.cancelar();
            renderizadas.current.delete(n);
            canvas.width = 0;
            canvas.height = 0; // libera memória no celular
          }
        }
      },
      { root: el, rootMargin: "150% 0px" },
    );
    el.querySelectorAll("[data-pagina]").forEach((p) => io.observe(p));

    const visivel = new IntersectionObserver(
      (entradas) => {
        const v = entradas.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (v) setAtual(Number((v.target as HTMLElement).dataset.pagina));
      },
      { root: el, threshold: [0.25, 0.5, 0.75] },
    );
    el.querySelectorAll("[data-pagina]").forEach((p) => visivel.observe(p));
    return () => {
      io.disconnect();
      visivel.disconnect();
    };
  }, [doc, renderizar]);

  const atualRef = useRef(atual);
  atualRef.current = atual;

  const irPara = useCallback((n: number, suave = true) => {
    const alvo = caixa.current?.querySelector(`[data-pagina="${n}"]`);
    alvo?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  }, []);

  // Pula para a página inicial quando o documento abre
  useEffect(() => {
    if (doc) requestAnimationFrame(() => irPara(Math.min(paginaInicial, doc.numPages), false));
  }, [doc, paginaInicial, irPara]);

  if (erro) return <div className="p-6 text-vermelho font-semibold">{erro}</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 bg-preto text-off text-sm">
        <button className="btn btn-contorno btn-pequeno" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label="Diminuir zoom">
          −
        </button>
        <button className="btn btn-contorno btn-pequeno" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} aria-label="Aumentar zoom">
          +
        </button>
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(new FormData(e.currentTarget).get("p"));
            if (doc && n >= 1 && n <= doc.numPages) irPara(n);
          }}
        >
          <label htmlFor="ir-p" className="sr-only">
            Ir para a página
          </label>
          <input id="ir-p" name="p" inputMode="numeric" key={atual} defaultValue={atual} className="w-14 rounded-md bg-[#222] px-2 py-1 text-center" />
          <span className="text-off/70">de {doc?.numPages ?? "…"}</span>
        </form>
      </div>
      <div ref={caixa} className="flex-1 overflow-auto bg-[#2a2a2a] py-3" style={{ WebkitOverflowScrolling: "touch" }}>
        {!doc && <p className="text-off/70 text-center py-20">Abrindo o material...</p>}
        {doc &&
          Array.from({ length: doc.numPages }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              data-pagina={n}
              className="mx-auto mb-3 bg-white shadow-lg"
              style={{ width: larguraPagina, height: Math.round(larguraPagina * proporcao) }}
            >
              <canvas className="block w-full h-full" aria-label={`Página ${n}`} />
            </div>
          ))}
      </div>
    </div>
  );
}
