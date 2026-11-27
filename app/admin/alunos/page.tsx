import Link from "next/link";
import { exigirAdmin, dataBR } from "@/lib/admin";
import { cadastrarAluno } from "../actions";

export const dynamic = "force-dynamic";

export default async function Alunos({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { db } = await exigirAdmin();
  let consulta = db.from("profiles").select("id, nome, email, cpf, created_at, entitlements(product_id, revogado_em, products(nome))").order("created_at", { ascending: false }).limit(100);
  const termo = q?.trim().replace(/[%,()]/g, "");
  if (termo) consulta = consulta.or(`email.ilike.%${termo}%,nome.ilike.%${termo}%,cpf.ilike.%${termo.replace(/\D/g, "") || termo}%`);
  const { data } = await consulta;
  const { data: produtos } = await db.from("products").select("id, nome").order("ordem");

  return (
    <div className="space-y-5">
      <h1 className="titulo text-2xl">Alunos</h1>
      <form className="flex gap-2 max-w-lg">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou CPF" className="campo" />
        <button className="btn btn-preto">Buscar</button>
      </form>
      <div className="cartao overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-cinza"><tr><th className="p-3">Aluno</th><th className="p-3">Produtos</th><th className="p-3">Cadastro</th></tr></thead>
          <tbody className="divide-y divide-linha">
            {(data ?? []).map((a) => {
              const prods = (a.entitlements as unknown as { revogado_em: string | null; products: { nome: string } | null }[]).filter((e) => !e.revogado_em).map((e) => e.products?.nome).filter(Boolean);
              return (
                <tr key={a.id}>
                  <td className="p-3"><Link href={`/admin/alunos/${a.id}`} className="font-semibold underline">{a.nome ?? "(sem nome)"}</Link><br /><span className="text-cinza">{a.email}</span></td>
                  <td className="p-3">{prods.length ? prods.join(", ") : <span className="text-cinza">nenhum</span>}</td>
                  <td className="p-3 whitespace-nowrap">{dataBR(a.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!data?.length && <p className="p-4 text-cinza text-sm">Nenhum aluno encontrado.</p>}
      </div>
      <p className="text-xs text-cinza">Mostrando até 100 resultados.</p>
      <details className="cartao p-5 max-w-lg">
        <summary className="font-bold cursor-pointer">Cadastrar aluno manualmente</summary>
        <form action={cadastrarAluno} className="mt-4 space-y-3">
          <input name="nome" placeholder="Nome" className="campo" />
          <input name="email" type="email" required placeholder="E-mail" className="campo" />
          <select name="product_id" className="campo"><option value="">Sem produto</option>{(produtos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" name="avisar" defaultChecked /> Enviar e-mail de acesso</label>
          <button className="btn btn-laranja">Cadastrar</button>
        </form>
      </details>
    </div>
  );
}
