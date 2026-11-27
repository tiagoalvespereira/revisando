import Link from "next/link";
import { notFound } from "next/navigation";
import { Icone } from "@/components/Icone";
import { CardProduto } from "@/components/CardProduto";
import { alunoAtual, linkCompra, meusProdutos, type Arquivo } from "@/lib/aluno";
import { Cronograma } from "@/components/Cronograma";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { cardsDoCronograma, diaDeHoje } from "@/lib/cronograma";

const GRUPOS: { tipo: string[]; titulo: string }[] = [
  { tipo: ["volume", "caderno", "isca"], titulo: "Material principal" },
  { tipo: ["simulado"], titulo: "Simulados" },
  { tipo: ["cronograma"], titulo: "Cronogramas" },
];

const numeroSimulado = (a: Arquivo) => Number(a.storage_path.match(/simulado-(\d)/)?.[1]) || null;

function Linha({ a }: { a: Arquivo }) {
  const sim = a.tipo === "simulado" ? numeroSimulado(a) : null;
  return (
    <li className="cartao p-4 flex flex-wrap items-center gap-3">
      <span className="shrink-0 size-10 rounded-lg bg-preto text-laranja grid place-items-center">
        <Icone nome="documento" className="size-5" />
      </span>
      <span className="flex-1 font-semibold text-sm">{a.titulo}</span>
      <Link href={`/area/ler/${a.id}`} className="btn btn-preto btn-pequeno" aria-label={`Ler ${a.titulo}`}>
        <Icone nome="olho" className="size-4" /> Ler
      </Link>
      <a href={`/api/arquivos/${a.id}/baixar`} className="btn btn-contorno btn-pequeno" aria-label={`Baixar ${a.titulo}`}>
        <Icone nome="download" className="size-4" />
      </a>
      {sim && (
        <Link href={`/area/simulado/${sim}`} className="btn btn-laranja btn-pequeno basis-full sm:basis-auto">
          Cartão-resposta online
        </Link>
      )}
    </li>
  );
}

export default async function PaginaProduto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, perfil } = await alunoAtual();
  const produto = (await meusProdutos()).find((p) => p.slug === slug);
  if (!produto) notFound();

  if (!produto.tem) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="titulo text-2xl mb-4">Material bloqueado</h1>
        <CardProduto p={{ ...produto, compra: linkCompra(produto.checkout_url, perfil.email, perfil.nome) }} />
      </main>
    );
  }

  const { data } = await supabase
    .from("product_files")
    .select("id, product_id, titulo, tipo, dia, ordem, storage_path, atualizado_em")
    .eq("product_id", produto.id)
    .order("ordem");
  const arquivos = (data ?? []) as Arquivo[];
  // O plano de 15 dias aponta as questões no volume de 30: o link só aparece para quem tem o volume.
  let volume30Id: string | null = null;
  if (slug === "15-dias") {
    const p30 = (await meusProdutos()).find((p) => p.slug === "30-dias" && p.tem);
    if (p30) volume30Id = (await supabase.from("product_files").select("id").eq("product_id", p30.id).eq("tipo", "volume").maybeSingle()).data?.id ?? null;
  }
  const crono = cardsDoCronograma(slug, arquivos, volume30Id);
  const { data: prog } = crono ? await supabase.from("progress").select("dia").eq("product_slug", slug) : { data: [] };
  const concluidos = (prog ?? []).map((p) => p.dia as number);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link href="/area" className="text-sm text-cinza">
          ← Painel
        </Link>
        <h1 className="titulo text-2xl sm:text-3xl mt-2">{produto.nome}</h1>
        {produto.validoAte && (
          <p className="text-sm text-cinza mt-1">Acesso até {new Date(produto.validoAte).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>
        )}
        <p className="text-sm text-cinza mt-1">Os downloads saem com seu nome e a data em cada página.</p>
      </div>

      {crono && (
        <section>
          <h2 className="titulo text-lg mb-3">Cronograma</h2>
          {crono.exemplo && <AvisoExemplo>O cronograma ainda usa dados de exemplo: conteúdos e páginas podem não corresponder ao material.</AvisoExemplo>}
          <Cronograma slug={slug} dias={crono.cards} concluidos={concluidos} hoje={diaDeHoje(crono.cards.length, concluidos)} />
        </section>
      )}

      {GRUPOS.map((g) => {
        const lista = arquivos.filter((a) => g.tipo.includes(a.tipo));
        if (!lista.length) return null;
        return (
          <section key={g.titulo}>
            <h2 className="titulo text-lg mb-3">{g.titulo}</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {lista.map((a) => (
                <Linha key={a.id} a={a} />
              ))}
            </ul>
          </section>
        );
      })}

    </main>
  );
}
