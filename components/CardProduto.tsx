import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Hexagono } from "@/components/Hexagono";

type P = {
  slug: string; nome: string; descricao: string | null; icone: string; tem: boolean; vitrine: string;
  compra: string | null; preco_centavos: number | null; progresso?: number | null;
};

const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Número e subtítulo da capa, no padrão das capas dos PDFs ("30 · DIAS DE REVISÃO"). */
function capa(p: P) {
  const n = p.slug.match(/^(\d+)-dias/)?.[1];
  if (n) return { numero: n, linha: n === "30" ? ["Dias de", "revisão"] : ["Dias", "estratégicos"] };
  return { numero: null, linha: p.nome.split(" ").slice(0, 3) };
}

/**
 * Cartão vertical no formato Reels (9:16), com a cara das capas do material.
 * Liberado: cadeado aberto verde. Bloqueado: cadeado fechado vermelho e botão de compra.
 */
export function CardProduto({ p }: { p: P }) {
  const c = capa(p);
  const emBreve = !p.tem && (p.vitrine === "em_breve" || !p.compra);

  const conteudo = (
    <>
      {/* Capa */}
      <Hexagono className={`absolute -right-14 top-24 w-48 ${p.tem ? "text-laranja/25" : "text-white/10"}`} />
      <div className="absolute inset-x-0 top-0 h-1.5 bg-laranja" />
      <div className="relative flex items-center justify-between px-4 pt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/revisando-logo-negativo.svg" alt="" className="h-3.5 w-auto opacity-90" />
        <span className="text-[9px] font-bold tracking-[.18em] text-off/50">OAB · 2027</span>
      </div>

      <div className="relative px-4 mt-6">
        {c.numero ? (
          <p className="titulo text-laranja leading-[.8] text-[92px] tracking-tight">{c.numero}</p>
        ) : (
          <span className="grid place-items-center size-20 rounded-2xl bg-laranja text-preto"><Icone nome={p.icone} className="size-10" /></span>
        )}
        <p className={`titulo text-[22px] leading-[1.02] mt-3 ${p.tem ? "text-off" : "text-off/80"}`}>{c.linha.map((l) => <span key={l} className="block">{l}</span>)}</p>
        <span className="block w-10 h-1 bg-laranja mt-3 rounded-full" />
        <p className="text-[12px] leading-snug text-off/60 mt-3 line-clamp-2">{p.descricao ?? p.nome}</p>
      </div>

      {/* Selo de acesso */}
      <span
        className={`absolute right-3 grid place-items-center size-11 rounded-full ring-4 ring-preto shadow-lg ${p.tem ? "bg-verde text-white" : "bg-vermelho text-white"}`}
        aria-label={p.tem ? "Liberado" : "Bloqueado"}
        style={{ top: "3.1rem" }}
      >
        <Icone nome={p.tem ? "cadeado-aberto" : "cadeado"} className="size-5" />
      </span>

      {/* Rodapé */}
      <div className="relative mt-auto p-4 pt-3">
        {p.tem ? (
          <>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#4fd1a5]">
              <Icone nome="cadeado-aberto" className="size-3.5" /> Liberado
            </p>
            {typeof p.progresso === "number" && (
              <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden"><div className="h-full rounded-full bg-verde" style={{ width: `${p.progresso}%` }} /></div>
            )}
            <span className="btn btn-laranja btn-pequeno btn-bloco mt-3">Acessar <Icone nome="seta" className="size-4" /></span>
          </>
        ) : emBreve ? (
          <>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#ff8a8a]"><Icone nome="cadeado" className="size-3.5" /> Bloqueado</p>
            <span className="btn btn-pequeno btn-bloco mt-3 bg-white/10 text-off/80 cursor-default">Em breve</span>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#ff8a8a]"><Icone nome="cadeado" className="size-3.5" /> Bloqueado</p>
            {p.preco_centavos ? <p className="titulo text-off text-2xl mt-1">{reais(p.preco_centavos)}</p> : null}
            <span className="btn btn-laranja btn-pequeno btn-bloco mt-3">Desbloquear</span>
          </>
        )}
      </div>
    </>
  );

  const classe = `group relative flex flex-col overflow-hidden rounded-[22px] bg-preto aspect-[9/16] w-full shadow-[0_18px_40px_-24px_rgba(17,17,17,.8)] transition duration-200 ${emBreve ? "" : "hover:-translate-y-1 hover:shadow-[0_26px_50px_-24px_rgba(17,17,17,.9)] active:scale-[.98]"} ${p.tem ? "ring-2 ring-verde/70" : ""}`;

  if (p.tem) return <Link href={`/area/produto/${p.slug}`} className={classe} aria-label={`Acessar ${p.nome}`}>{conteudo}</Link>;
  if (emBreve) return <div className={classe}>{conteudo}</div>;
  return <a href={p.compra!} target="_blank" rel="noopener" className={classe} aria-label={`Desbloquear ${p.nome}`}>{conteudo}</a>;
}

/** Fileira de cartões Reels: rolagem lateral no celular, grade no computador. */
export function Vitrine({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-5 [&>*]:snap-start [&>*]:shrink-0 [&>*]:w-[62vw] [&>*]:max-w-[240px] md:[&>*]:w-auto md:[&>*]:max-w-none pb-2">
        {children}
      </div>
    </div>
  );
}
