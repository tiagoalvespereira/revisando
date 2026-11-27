import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Hexagono } from "@/components/Hexagono";

type P = { slug: string; nome: string; descricao: string | null; icone: string; tem: boolean; vitrine: string; compra: string | null; preco_centavos: number | null };

const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CardProduto({ p }: { p: P }) {
  if (p.tem) {
    return (
      <Link href={`/area/produto/${p.slug}`} className="cartao cartao-link group p-5 flex gap-4 items-center">
        <span className="shrink-0 size-14 rounded-2xl bg-preto text-laranja grid place-items-center"><Icone nome={p.icone} className="size-7" /></span>
        <span className="flex-1 min-w-0">
          <span className="titulo text-base block leading-tight">{p.nome}</span>
          {p.descricao && <span className="text-sm text-cinza block mt-1 line-clamp-2">{p.descricao}</span>}
        </span>
        <span className="shrink-0 grid place-items-center size-10 rounded-full bg-off group-hover:bg-laranja transition"><Icone nome="seta" className="size-5" /></span>
      </Link>
    );
  }
  const emBreve = p.vitrine === "em_breve" || !p.compra;
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-preto text-off p-5 flex gap-4 items-start">
      <Hexagono className="absolute -right-10 -bottom-12 w-40 text-laranja/20" />
      <span className="relative shrink-0 size-14 rounded-2xl bg-white/10 text-off/70 grid place-items-center">
        <Icone nome={p.icone} className="size-7" />
        <span className="absolute -right-1.5 -bottom-1.5 size-7 rounded-full bg-laranja text-preto grid place-items-center ring-4 ring-preto"><Icone nome="cadeado" className="size-3.5" /></span>
      </span>
      <span className="relative flex-1 min-w-0">
        <span className="titulo text-base block leading-tight">{p.nome}</span>
        {p.descricao && <span className="text-sm text-off/65 block mt-1">{p.descricao}</span>}
        {emBreve ? (
          <span className="selo mt-3 bg-white/10 text-off/80">Em breve</span>
        ) : (
          <a href={p.compra!} className="btn btn-laranja btn-pequeno mt-4" target="_blank" rel="noopener">
            <Icone nome="cadeado" className="size-4" /> Desbloquear{p.preco_centavos ? ` · ${reais(p.preco_centavos)}` : ""}
          </a>
        )}
      </span>
    </div>
  );
}
