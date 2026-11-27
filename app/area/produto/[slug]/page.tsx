import Link from "next/link";
import { notFound } from "next/navigation";
import { Icone } from "@/components/Icone";
import { CardProduto } from "@/components/CardProduto";
import { Cabecalho } from "@/components/Cabecalho";
import { Cronograma } from "@/components/Cronograma";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { alunoAtual, linkCompra, meusProdutos, type Arquivo } from "@/lib/aluno";
import { cardsDoCronograma, diaDeHoje } from "@/lib/cronograma";

const numeroSimulado = (a: Arquivo) => Number(a.storage_path.match(/simulado-(\d)/)?.[1]) || null;

const GRUPOS: { tipo: string[]; titulo: string; icone: string }[] = [
  { tipo: ["volume", "caderno", "isca"], titulo: "Material principal", icone: "livro" },
  { tipo: ["dia"], titulo: "Dias separados", icone: "calendario" },
  { tipo: ["cronograma"], titulo: "Cronogramas para imprimir", icone: "lista" },
];

function Linha({ a, destaque }: { a: Arquivo; destaque?: boolean }) {
  return (
    <li className={`cartao p-3 pl-4 flex items-center gap-3 ${destaque ? "border-preto" : ""}`}>
      <span className={`shrink-0 grid place-items-center rounded-xl ${destaque ? "size-12 bg-preto text-laranja" : "size-10 bg-off text-preto"}`}>
        <Icone nome={a.tipo === "dia" ? "calendario" : "documento"} className="size-5" />
      </span>
      <Link href={`/area/ler/${a.id}`} className="flex-1 min-w-0 font-semibold text-sm leading-snug hover:underline underline-offset-4">{a.titulo}</Link>
      <Link href={`/area/ler/${a.id}`} className="btn btn-preto btn-pequeno" aria-label={`Ler ${a.titulo}`}><Icone nome="olho" className="size-4" /><span className="hidden sm:inline">Ler</span></Link>
      <a href={`/api/arquivos/${a.id}/baixar`} className="btn btn-claro btn-icone" aria-label={`Baixar ${a.titulo}`} title="Baixar com marca d'água"><Icone nome="download" className="size-4" /></a>
    </li>
  );
}

export default async function PaginaProduto({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ aba?: string }> }) {
  const { slug } = await params;
  const { aba: abaPedida } = await searchParams;
  const { supabase, perfil } = await alunoAtual();
  const produtos = await meusProdutos();
  const produto = produtos.find((p) => p.slug === slug);
  if (!produto) notFound();

  if (!produto.tem) {
    return (
      <main>
        <Cabecalho sobretitulo="Material bloqueado" titulo={produto.nome} voltar={{ href: "/area/materiais", rotulo: "Materiais" }} />
        <div className="max-w-[260px] mx-auto px-4 py-8"><CardProduto p={{ ...produto, compra: linkCompra(produto.checkout_url, perfil.email, perfil.nome) }} /></div>
      </main>
    );
  }

  const p30 = slug === "15-dias" ? produtos.find((p) => p.slug === "30-dias" && p.tem) : null;
  const [{ data }, { data: prog }, vol30] = await Promise.all([
    supabase.from("product_files").select("id, product_id, titulo, tipo, dia, ordem, storage_path, atualizado_em").eq("product_id", produto.id).order("ordem"),
    supabase.from("progress").select("dia").eq("product_slug", slug),
    // O plano de 15 dias aponta questões no volume de 30: o link só aparece para quem tem o volume.
    p30 ? supabase.from("product_files").select("id").eq("product_id", p30.id).eq("tipo", "volume").maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const arquivos = (data ?? []) as Arquivo[];
  const crono = cardsDoCronograma(slug, arquivos, vol30.data?.id ?? null);
  const concluidos = (prog ?? []).map((p) => p.dia as number);
  const simulados = arquivos.filter((a) => a.tipo === "simulado");

  const abas = [
    crono && { id: "cronograma", rotulo: "Cronograma", icone: "calendario" },
    { id: "arquivos", rotulo: "Arquivos", icone: "pilha" },
    simulados.length > 0 && { id: "simulados", rotulo: "Simulados", icone: "alvo" },
  ].filter(Boolean) as { id: string; rotulo: string; icone: string }[];
  const aba = abas.some((a) => a.id === abaPedida) ? abaPedida! : abas[0].id;
  const pct = crono ? Math.round((concluidos.length / crono.cards.length) * 100) : 0;

  return (
    <main>
      <Cabecalho sobretitulo={crono ? `${concluidos.length} de ${crono.cards.length} dias concluídos · ${pct}%` : "Material"} titulo={produto.nome} voltar={{ href: "/area/materiais", rotulo: "Materiais" }}>
        {produto.validoAte && <p className="text-sm text-off/60 mt-2">Acesso até {new Date(produto.validoAte).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
      </Cabecalho>

      <nav aria-label="Seções" className="sticky top-[76px] z-20 bg-off/95 backdrop-blur border-b border-linha">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {abas.map((a) => (
            <Link key={a.id} href={`?aba=${a.id}`} scroll={false} aria-current={aba === a.id ? "page" : undefined}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-bold border-b-[3px] -mb-px whitespace-nowrap transition ${aba === a.id ? "border-laranja text-preto" : "border-transparent text-cinza hover:text-preto"}`}>
              <Icone nome={a.icone} className="size-4" /> {a.rotulo}
            </Link>
          ))}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {aba === "cronograma" && crono && (
          <>
            {crono.exemplo && <AvisoExemplo>O cronograma ainda usa dados de exemplo.</AvisoExemplo>}
            <Cronograma slug={slug} dias={crono.cards} concluidos={concluidos} hoje={diaDeHoje(crono.cards.length, concluidos)} />
          </>
        )}

        {aba === "arquivos" && (
          <>
            <p className="text-sm text-cinza flex items-center gap-2"><Icone nome="escudo" className="size-4 text-verde" /> Os downloads saem com seu nome e a data em cada página.</p>
            {GRUPOS.map((g) => {
              const lista = arquivos.filter((a) => g.tipo.includes(a.tipo));
              if (!lista.length) return null;
              return (
                <section key={g.titulo}>
                  <h2 className="titulo text-lg mb-3 flex items-center gap-2"><Icone nome={g.icone} className="size-5 text-laranja" /> {g.titulo}</h2>
                  <ul className={`grid gap-2 ${g.tipo.includes("dia") ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                    {lista.map((a) => <Linha key={a.id} a={a} destaque={g.tipo.includes("volume")} />)}
                  </ul>
                </section>
              );
            })}
          </>
        )}

        {aba === "simulados" && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {simulados.map((a) => {
              const n = numeroSimulado(a);
              return (
                <li key={a.id} className="cartao p-5">
                  <div className="flex items-center gap-4">
                    <span className="shrink-0 size-14 rounded-2xl bg-preto text-laranja grid place-items-center titulo text-lg">S{n}</span>
                    <p className="font-bold leading-snug">{a.titulo}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {n && <Link href={`/area/simulado/${n}`} className="btn btn-laranja btn-pequeno"><Icone nome="check" className="size-4" /> Cartão-resposta</Link>}
                    <Link href={`/area/ler/${a.id}`} className="btn btn-claro btn-pequeno"><Icone nome="olho" className="size-4" /> Ler PDF</Link>
                    <a href={`/api/arquivos/${a.id}/baixar`} className="btn btn-claro btn-icone" aria-label="Baixar"><Icone nome="download" className="size-4" /></a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
