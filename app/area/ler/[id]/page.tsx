import Link from "next/link";
import { notFound } from "next/navigation";
import { Leitor } from "@/components/Leitor";
import { arquivoPermitido } from "@/lib/aluno";

export const metadata = { title: "Leitura" };

export default async function Ler({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pagina?: string }> }) {
  const { id } = await params;
  const { pagina } = await searchParams;
  const { arquivo, supabase } = await arquivoPermitido(id);
  if (!arquivo || !supabase) notFound();
  const { data: prod } = await supabase.from("products").select("slug").eq("id", arquivo.product_id).maybeSingle();
  const p = Math.max(1, Number.parseInt(pagina ?? "1", 10) || 1);

  return (
    <div className="flex flex-col h-[calc(100dvh-76px-4.5rem)] md:h-[calc(100dvh-76px)] -mb-24 md:-mb-10">
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-linha">
        <Link href={prod ? `/area/produto/${prod.slug}` : "/area"} className="text-sm text-cinza shrink-0">
          ← Voltar
        </Link>
        <h1 className="font-bold text-sm truncate flex-1">{arquivo.titulo}</h1>
        <a href={`/api/arquivos/${arquivo.id}/baixar`} className="btn btn-laranja btn-pequeno shrink-0">
          Baixar
        </a>
      </div>
      <div className="flex-1 min-h-0">
        <Leitor arquivoId={arquivo.id} paginaInicial={p} />
      </div>
    </div>
  );
}
