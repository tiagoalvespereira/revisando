import Link from "next/link";
import { exigirAdmin, reais } from "@/lib/admin";
import { Icone } from "@/components/Icone";

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const { db } = await exigirAdmin();
  const { data } = await db.from("products").select("*, kiwify_products(kiwify_product_id), product_files(id)").order("ordem");
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="titulo text-2xl">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn btn-laranja ml-auto btn-pequeno">
          Novo produto
        </Link>
      </div>
      <p className="text-sm text-cinza max-w-2xl">
        Cada produto aparece na área do aluno. Quem não tem acesso vê o card bloqueado com o botão de compra (vitrine &quot;venda&quot;) ou com o selo &quot;em
        breve&quot;. Ligue cada produto ao ID dele na Kiwify para a liberação automática.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/admin/produtos/${p.id}`} className="cartao p-4 flex gap-3 hover:border-preto">
              <span className="size-10 rounded-lg bg-preto text-laranja grid place-items-center shrink-0">
                <Icone nome={p.icone} className="size-5" />
              </span>
              <span className="text-sm">
                <b className="block">{p.nome}</b>
                <span className="text-cinza">
                  {p.slug} · {reais(p.preco_centavos)} · vitrine: {p.vitrine}
                  {p.ativo ? "" : " · inativo"}
                </span>
                <br />
                <span className="text-cinza">
                  {(p.product_files as unknown[]).length} arquivos · Kiwify:{" "}
                  {(p.kiwify_products as { kiwify_product_id: string }[]).map((k) => k.kiwify_product_id).join(",") || (
                    <span className="text-vermelho">não ligado</span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
