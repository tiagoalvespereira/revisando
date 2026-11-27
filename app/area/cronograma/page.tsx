import Link from "next/link";
import { Cabecalho, Vazio } from "@/components/Cabecalho";
import { Cronograma } from "@/components/Cronograma";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { alunoAtual, meusProdutos, type Arquivo } from "@/lib/aluno";
import { cronogramaDe } from "@/lib/dados";
import { cardsDoCronograma, diaDeHoje } from "@/lib/cronograma";
import { dataProvaAtual } from "@/lib/provas";

export const metadata = { title: "Cronograma" };
const ORDEM = ["30-dias", "15-dias", "3-dias"];

/** Cronograma interativo do plano do aluno (fica na aba "Cronograma" do menu). */
export default async function PaginaCronograma({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  const { supabase } = await alunoAtual();
  const produtos = await meusProdutos();
  const planos = produtos.filter((p) => p.tem && cronogramaDe(p.slug)).sort((a, b) => ORDEM.indexOf(a.slug) - ORDEM.indexOf(b.slug));

  if (!planos.length) {
    return (
      <main>
        <Cabecalho sobretitulo="Cronograma" titulo="Seu plano dia a dia" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Vazio icone="calendario" titulo="Nenhum cronograma liberado" texto="O cronograma interativo vem com as revisões de 30 e de 15 dias.">
            <Link href="/area/materiais" className="btn btn-laranja">Ver materiais</Link>
          </Vazio>
        </div>
      </main>
    );
  }

  const produto = planos.find((p) => p.slug === plano) ?? planos[0];
  const p30 = produto.slug === "15-dias" ? produtos.find((p) => p.slug === "30-dias" && p.tem) : null;
  const [{ data }, { data: prog }, vol30] = await Promise.all([
    supabase.from("product_files").select("id, product_id, titulo, tipo, dia, ordem, storage_path, atualizado_em").eq("product_id", produto.id).order("ordem"),
    supabase.from("progress").select("dia").eq("product_slug", produto.slug),
    // O plano de 15 dias aponta questões no volume de 30: o link só aparece para quem tem o volume.
    p30 ? supabase.from("product_files").select("id").eq("product_id", p30.id).eq("tipo", "volume").maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const crono = cardsDoCronograma(produto.slug, (data ?? []) as Arquivo[], vol30.data?.id ?? null, await dataProvaAtual())!;
  const concluidos = (prog ?? []).map((p) => p.dia as number);
  const pct = Math.round((concluidos.length / crono.cards.length) * 100);

  return (
    <main>
      <Cabecalho sobretitulo={`${concluidos.length} de ${crono.cards.length} dias concluídos · ${pct}%`} titulo={produto.nome} />

      {planos.length > 1 && (
        <nav aria-label="Plano" className="sticky top-[76px] md:top-[120px] z-20 bg-off/95 backdrop-blur border-b border-linha">
          <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
            {planos.map((p) => (
              <Link key={p.slug} href={`/area/cronograma?plano=${p.slug}`} scroll={false} aria-current={p.slug === produto.slug ? "page" : undefined}
                className={`px-4 py-3.5 text-sm font-bold border-b-[3px] -mb-px whitespace-nowrap transition ${p.slug === produto.slug ? "border-laranja text-preto" : "border-transparent text-cinza hover:text-preto"}`}>
                {p.nome}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {crono.exemplo && <AvisoExemplo>O cronograma ainda usa dados de exemplo.</AvisoExemplo>}
        <Cronograma slug={produto.slug} dias={crono.cards} concluidos={concluidos} hoje={diaDeHoje(crono.cards.length, concluidos)} />
      </div>
    </main>
  );
}
