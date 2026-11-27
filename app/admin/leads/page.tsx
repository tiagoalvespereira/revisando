import { exigirAdmin, dataBR, reais } from "@/lib/admin";
import { formatarWhatsapp, linkWhatsapp } from "@/lib/telefone";
import { marcarContatado } from "../actions";

export const dynamic = "force-dynamic";

const ENVIO: Record<string, string> = { enviado: "PDF enviado", manual: "Pediu no WhatsApp", pendente: "Enviando", falhou: "Envio falhou" };

export default async function Leads({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro } = await searchParams;
  const { db } = await exigirAdmin();
  let q = db.from("leads").select("id, nome, whatsapp, email, envio, envio_erro, contatado_em, created_at, origem").order("created_at", { ascending: false }).limit(300);
  if (filtro === "nao-contatados") q = q.is("contatado_em", null);
  const [{ data: leads }, { data: produtos }, { data: compradores }] = await Promise.all([
    q,
    db.from("products").select("slug, nome, preco_centavos, checkout_url").in("slug", ["30-dias", "15-dias"]),
    db.from("profiles").select("telefone").not("telefone", "is", null),
  ]);
  // Quem já comprou (telefone da Kiwify) não precisa de oferta
  const jaCompraram = new Set((compradores ?? []).map((c) => (c.telefone as string).replace(/\D/g, "").replace(/^(?!55)/, "55")));
  const oferta = (nome: string) => {
    const linhas = (produtos ?? []).sort((a, b) => (a.slug < b.slug ? 1 : -1)).map((p) => `• ${p.nome}: ${reais(p.preco_centavos)}${p.checkout_url ? ` ${p.checkout_url}` : ""}`);
    return `Oi, ${nome.split(" ")[0]}! Aqui é o Tiago, do Revisando. Conseguiu estudar a amostra de 3 dias? Se quiser a revisão completa até a prova:\n${linhas.join("\n")}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo text-2xl">Leads da revisão grátis</h1>
        <a href="/admin/leads.csv" className="btn btn-contorno btn-pequeno ml-auto">Exportar CSV</a>
      </div>
      <nav className="flex gap-3 text-sm">
        <a href="/admin/leads" className={!filtro ? "font-bold underline" : ""}>Todos</a>
        <a href="/admin/leads?filtro=nao-contatados" className={filtro ? "font-bold underline" : ""}>Ainda não contatados</a>
      </nav>
      <ul className="grid gap-2">
        {(leads ?? []).map((l) => {
          const comprou = l.whatsapp && jaCompraram.has(l.whatsapp);
          return (
            <li key={l.id} className="cartao p-4 flex flex-wrap items-center gap-3">
              <span className="flex-1 min-w-52 text-sm">
                <b className="block">{l.nome}</b>
                {formatarWhatsapp(l.whatsapp)}{l.email ? ` · ${l.email}` : ""} · {dataBR(l.created_at)}{l.origem ? <span className="ml-2 selo bg-off text-cinza">{String(l.origem).replace(/^amostra:/, "")}</span> : null}
                <span className="block text-xs mt-1">
                  <span className={l.envio === "falhou" ? "text-vermelho" : "text-cinza"} title={l.envio_erro ?? undefined}>{ENVIO[l.envio] ?? l.envio}</span>
                  {comprou && <span className="ml-2 text-verde font-bold">já comprou</span>}
                  {l.contatado_em && <span className="ml-2 text-cinza">contatado em {dataBR(l.contatado_em)}</span>}
                </span>
              </span>
              {l.whatsapp && (
                <a href={linkWhatsapp(l.whatsapp, oferta(l.nome))} target="_blank" rel="noopener" className="btn btn-laranja btn-pequeno">Chamar no WhatsApp</a>
              )}
              {!l.contatado_em && (
                <form action={marcarContatado}><input type="hidden" name="id" value={l.id} /><button className="btn btn-contorno btn-pequeno">Marcar contatado</button></form>
              )}
            </li>
          );
        })}
        {!leads?.length && <li className="text-cinza text-sm">Nenhum lead ainda.</li>}
      </ul>
    </div>
  );
}
