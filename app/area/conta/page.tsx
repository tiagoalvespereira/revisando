import { alunoAtual } from "@/lib/aluno";
import Link from "next/link";
import { FormDados, FormSenha } from "./Forms";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/Icone";

export const metadata = { title: "Minha conta" };

const STATUS: Record<string, string> = { paid: "Pago", pending: "Aguardando pagamento", refunded: "Reembolsado", chargeback: "Contestado", refused: "Recusado" };

export default async function Conta() {
  const { supabase, user, perfil } = await alunoAtual();
  const { data: pedidos } = await supabase.from("orders").select("id, status, valor_centavos, metodo, created_at, kiwify_product_id").eq("user_id", user.id).order("created_at", { ascending: false });
  const suporte = process.env.NEXT_PUBLIC_SUPORTE_EMAIL;

  return (
    <main>
      <Cabecalho sobretitulo="Minha conta" titulo={perfil.nome ?? "Seus dados"}>
        <p className="text-off/60 text-sm mt-2">{perfil.email}</p>
      </Cabecalho>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {perfil.is_admin && (
          <Link href="/admin" className="cartao cartao-link p-4 flex items-center gap-3">
            <span className="grid place-items-center size-11 rounded-xl bg-laranja text-preto"><Icone nome="escudo" className="size-5" /></span>
            <span className="flex-1 font-bold">Painel do administrador</span><Icone nome="seta" className="size-5 text-cinza" />
          </Link>
        )}
        <form action="/auth/sair" method="post" className={perfil.is_admin ? "" : "sm:col-span-2"}>
          <button className="cartao cartao-link w-full p-4 flex items-center gap-3 text-left">
            <span className="grid place-items-center size-11 rounded-xl bg-off"><Icone nome="sair" className="size-5" /></span>
            <span className="flex-1 font-bold">Sair da conta</span>
          </button>
        </form>
      </div>
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
      </div>
    </main>
  );
}
