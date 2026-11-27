import Link from "next/link";
import { notFound } from "next/navigation";
import { Icone } from "@/components/Icone";
import { CardProduto } from "@/components/CardProduto";
import { alunoAtual, linkCompra, meusProdutos, type Arquivo } from "@/lib/aluno";

const GRUPOS: { tipo: string[]; titulo: string }[] = [
  { tipo: ["volume", "caderno", "isca"], titulo: "Material principal" },
  { tipo: ["simulado"], titulo: "Simulados" },
  { tipo: ["cronograma"], titulo: "Cronogramas" },
];

function Linha({ a }: { a: Arquivo }) {
  return (
    <li className="cartao p-4 flex items-center gap-3">
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
  const dias = arquivos.filter((a) => a.tipo === "dia");

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

      {dias.length > 0 && (
        <section>
          <h2 className="titulo text-lg mb-3">Dia a dia</h2>
          <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {dias.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/area/ler/${a.id}`}
                  className={`cartao block p-3 text-center hover:border-preto ${a.dia! <= 14 ? "" : a.dia! <= 21 ? "border-laranja" : "border-verde"}`}
                >
                  <span className="text-[10px] uppercase tracking-widest text-cinza block">Dia</span>
                  <span className="titulo text-2xl">{String(a.dia).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
