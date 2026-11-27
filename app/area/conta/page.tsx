import { alunoAtual } from "@/lib/aluno";
import { FormDados, FormSenha } from "./Forms";

export const metadata = { title: "Minha conta" };

const STATUS: Record<string, string> = { paid: "Pago", pending: "Aguardando pagamento", refunded: "Reembolsado", chargeback: "Contestado", refused: "Recusado" };

export default async function Conta() {
  const { supabase, user, perfil } = await alunoAtual();
  const { data: pedidos } = await supabase.from("orders").select("id, status, valor_centavos, metodo, created_at, kiwify_product_id").eq("user_id", user.id).order("created_at", { ascending: false });
  const suporte = process.env.NEXT_PUBLIC_SUPORTE_EMAIL;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="titulo text-2xl">Minha conta</h1>
      <FormDados perfil={perfil} />
      <FormSenha />
      <section className="cartao p-5">
        <h2 className="titulo text-lg mb-3">Histórico de compras</h2>
        {pedidos?.length ? (
          <ul className="divide-y divide-linha text-sm">
            {pedidos.map((p) => (
              <li key={p.id} className="py-3 flex justify-between gap-3">
                <span>{new Date(p.created_at).toLocaleDateString("pt-BR")} · {p.metodo ?? "Kiwify"}</span>
                <span className="text-right">
                  {p.valor_centavos != null && <b className="block">{(p.valor_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b>}
                  <span className={p.status === "paid" ? "text-verde" : "text-cinza"}>{STATUS[p.status] ?? p.status}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-cinza">Nenhuma compra registrada.</p>}
      </section>
      <section className="text-sm text-cinza">
        <p>Para pedir a exclusão dos seus dados (LGPD){suporte ? <> escreva para <a className="underline" href={`mailto:${suporte}?subject=Exclusão de dados`}>{suporte}</a></> : " fale com o suporte"}, usando o e-mail da conta.</p>
      </section>
    </main>
  );
}
