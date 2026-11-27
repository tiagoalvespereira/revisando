import Link from "next/link";
import { Icone } from "@/components/Icone";

type P = {
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  tem: boolean;
  vitrine: string;
  compra: string | null;
  preco_centavos: number | null;
};

const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CardProduto({ p }: { p: P }) {
  if (p.tem) {
    return (
      <Link href={`/area/produto/${p.slug}`} className="cartao p-5 flex gap-4 items-start hover:border-preto transition">
        <span className="shrink-0 size-12 rounded-xl bg-preto text-laranja grid place-items-center">
          <Icone nome={p.icone} />
        </span>
        <span className="flex-1">
          <span className="titulo text-base block">{p.nome}</span>
          {p.descricao && <span className="text-sm text-cinza block mt-1">{p.descricao}</span>}
          <span className="inline-flex items-center gap-1 text-sm font-bold mt-3">
            Acessar <Icone nome="seta" className="size-4" />
          </span>
        </span>
      </Link>
    );
  }
  const emBreve = p.vitrine === "em_breve" || !p.compra;
  return (
    <div className="cartao p-5 flex gap-4 items-start bg-[#efece5] border-dashed relative">
      <span className="shrink-0 size-12 rounded-xl bg-[#d9d5cc] text-cinza grid place-items-center relative">
        <Icone nome={p.icone} />
        <span className="absolute -right-1.5 -bottom-1.5 size-6 rounded-full bg-preto text-off grid place-items-center">
          <Icone nome="cadeado" className="size-3.5" />
        </span>
      </span>
      <span className="flex-1">
        <span className="titulo text-base block text-cinza">{p.nome}</span>
        {p.descricao && <span className="text-sm text-cinza block mt-1">{p.descricao}</span>}
        {emBreve ? (
          <span className="inline-block mt-3 text-xs font-bold uppercase tracking-widest bg-preto text-off px-2 py-1 rounded">Em breve</span>
        ) : (
          <a href={p.compra!} className="btn btn-laranja mt-3 btn-pequeno" target="_blank" rel="noopener">
            Desbloquear{p.preco_centavos ? ` por ${reais(p.preco_centavos)}` : ""}
          </a>
        )}
      </span>
    </div>
  );
}
