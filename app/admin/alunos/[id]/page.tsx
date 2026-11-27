import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin, dataBR, reais } from "@/lib/admin";
import { liberarManual, reenviarAcesso, revogarManual } from "../../actions";
import { LinkAcesso } from "../LinkAcesso";

export const dynamic = "force-dynamic";

export default async function Aluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enviado?: string }> }) {
  const { id } = await params;
  const { enviado } = await searchParams;
  const { db } = await exigirAdmin();
  const [{ data: a }, { data: ents }, { data: pedidos }, { data: produtos }, { data: auth }] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
    db.from("entitlements").select("product_id, origem, valido_ate, revogado_em, created_at, products(nome)").eq("user_id", id),
    db.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("products").select("id, nome").order("ordem"),
    db.auth.admin.getUserById(id),
  ]);
  if (!a) notFound();
  const agora = new Date().toISOString();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin/alunos" className="text-sm text-cinza">
        ← Alunos
      </Link>
      <div>
        <h1 className="titulo text-2xl">{a.nome ?? "(sem nome)"}</h1>
        <p className="text-cinza text-sm">
          {a.email} · CPF {a.cpf ?? "—"} · Tel. {a.telefone ?? "—"}
        </p>
        <p className="text-cinza text-sm">
          Cadastro {dataBR(a.created_at)} · Último acesso {dataBR(auth?.user?.last_sign_in_at)}
        </p>
      </div>

      {!process.env.RESEND_API_KEY && (
        <p className="rounded-xl border-2 border-laranja bg-laranja-claro px-4 py-3 text-sm"><b>E-mails ainda não configurados.</b> Use o link de acesso abaixo e envie pelo WhatsApp.</p>
      )}
      <LinkAcesso userId={id} />
      <form action={reenviarAcesso}>
        <input type="hidden" name="user_id" value={id} />
        <button className="btn btn-preto">Reenviar e-mail de acesso</button>
        {enviado && <span className="ml-3 text-verde text-sm font-semibold">E-mail enviado.</span>}
      </form>

      <section className="cartao p-5">
        <h2 className="titulo text-lg mb-3">Acessos</h2>
        <ul className="divide-y divide-linha text-sm">
          {(ents ?? []).map((e) => {
            const ativo = !e.revogado_em && (!e.valido_ate || e.valido_ate > agora);
            return (
              <li key={e.product_id} className="py-3 flex items-center gap-3 flex-wrap">
                <span className="flex-1">
                  <b>{(e.products as unknown as { nome: string } | null)?.nome}</b> <span className="text-cinza">({e.origem})</span>
                  <br />
                  <span className={ativo ? "text-verde" : "text-vermelho"}>
                    {e.revogado_em
                      ? `Revogado em ${dataBR(e.revogado_em)}`
                      : ativo
                        ? `Ativo até ${dataBR(e.valido_ate)}`
                        : `Vencido em ${dataBR(e.valido_ate)}`}
                  </span>
                </span>
                {!e.revogado_em ? (
                  <form action={revogarManual}>
                    <input type="hidden" name="user_id" value={id} />
                    <input type="hidden" name="product_id" value={e.product_id} />
                    <button className="btn btn-contorno btn-pequeno text-vermelho">Revogar</button>
                  </form>
                ) : (
                  <form action={liberarManual}>
                    <input type="hidden" name="user_id" value={id} />
                    <input type="hidden" name="product_id" value={e.product_id} />
                    <button className="btn btn-contorno btn-pequeno">Reativar</button>
                  </form>
                )}
              </li>
            );
          })}
          {!ents?.length && <li className="py-2 text-cinza">Nenhum acesso.</li>}
        </ul>
        <form action={liberarManual} className="mt-4 flex flex-wrap gap-2 items-center">
          <input type="hidden" name="user_id" value={id} />
          <select name="product_id" className="campo !w-auto" required>
            {(produtos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <label className="text-sm flex items-center gap-1">
            <input type="checkbox" name="avisar" defaultChecked /> avisar por e-mail
          </label>
          <button className="btn btn-laranja">Liberar</button>
        </form>
      </section>

      <section className="cartao p-5">
        <h2 className="titulo text-lg mb-3">Pedidos</h2>
        <ul className="divide-y divide-linha text-sm">
          {(pedidos ?? []).map((o) => (
            <li key={o.id} className="py-2">
              {dataBR(o.created_at)} · {o.gateway} {o.gateway_id} · {reais(o.valor_centavos)} · <b>{o.status}</b>
            </li>
          ))}
          {!pedidos?.length && <li className="py-2 text-cinza">Nenhum pedido.</li>}
        </ul>
      </section>
    </div>
  );
}
