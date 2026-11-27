import { exigirAdmin, reais, dataBR } from "@/lib/admin";
import { Integracoes } from "./Integracoes";
import { configZappfy, problemaZappfy } from "@/lib/zappfy";

export const dynamic = "force-dynamic";

export default async function Metricas() {
  const { db } = await exigirAdmin();
  const agora = new Date().toISOString();
  const [pagos, leads, ativos, eventos, reembolsos, lembretes] = await Promise.all([
    db.from("orders").select("valor_centavos").eq("status", "paid"),
    db.from("leads").select("id", { count: "exact", head: true }),
    db.from("entitlements").select("user_id, valido_ate").is("revogado_em", null).neq("origem", "isca"),
    db.from("webhook_events").select("event_id, erro, recebido_em").not("erro", "is", null).order("recebido_em", { ascending: false }).limit(10),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["refunded", "chargeback"]),
    db.from("lembretes").select("user_id", { count: "exact", head: true }).eq("ativo", true),
  ]);
  const totalVendas = (pagos.data ?? []).reduce((s, o) => s + (o.valor_centavos ?? 0), 0);
  const alunos = new Set((ativos.data ?? []).filter((e) => !e.valido_ate || e.valido_ate > agora).map((e) => e.user_id)).size;

  const cards = [
    { t: "Vendas pagas", v: String(pagos.data?.length ?? 0) },
    { t: "Faturamento bruto", v: reais(totalVendas) },
    { t: "Alunos ativos", v: String(alunos) },
    { t: "Leads da isca", v: String(leads.count ?? 0) },
    { t: "Reembolsos e chargebacks", v: String(reembolsos.count ?? 0) },
    { t: "Lembretes diários ativos", v: String(lembretes.count ?? 0) },
  ];
  return (
    <div className="space-y-8">
      <h1 className="titulo text-2xl">Métricas</h1>
      {!process.env.RESEND_API_KEY && (
        <p className="rounded-xl border-2 border-laranja bg-laranja-claro px-4 py-3 text-sm">
          <b>Os e-mails de acesso ainda não estão configurados</b> (falta o Resend). Até lá, os alunos não recebem o e-mail para criar a senha:
          em <b>Alunos</b>, abra o aluno e use <b>Gerar link</b> para enviar o acesso pelo WhatsApp.
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => <div key={c.t} className="cartao p-4"><p className="text-xs uppercase tracking-widest text-cinza">{c.t}</p><p className="titulo text-2xl mt-2">{c.v}</p></div>)}
      </div>
      <Integracoes itens={[
        { nome: "Kiwify (webhook)", ok: Boolean(process.env.KIWIFY_WEBHOOK_TOKEN), detalhe: process.env.KIWIFY_WEBHOOK_TOKEN ? "token configurado" : "falta KIWIFY_WEBHOOK_TOKEN" },
        { nome: "E-mail (Resend)", ok: Boolean(process.env.RESEND_API_KEY), detalhe: process.env.RESEND_API_KEY ? `envia como ${process.env.EMAIL_FROM ?? "(EMAIL_FROM não definido)"}` : "falta RESEND_API_KEY (aguardando domínio)" },
        { nome: "WhatsApp (Zappfy)", ok: Boolean(configZappfy()), detalhe: configZappfy() ? `conectando em ${configZappfy()!.url}` : problemaZappfy() ?? "não configurada" },
        { nome: "Agendador dos lembretes", ok: Boolean(process.env.CRON_SECRET), detalhe: process.env.CRON_SECRET ? "CRON_SECRET configurado" : "falta CRON_SECRET" },
      ]} />

      <section>
        <h2 className="titulo text-lg mb-3">Webhooks com problema</h2>
        {eventos.data?.length ? (
          <ul className="cartao divide-y divide-linha text-sm">
            {eventos.data.map((e) => <li key={e.event_id} className="p-3"><b>{e.event_id}</b> · {dataBR(e.recebido_em)}<br /><span className="text-vermelho">{e.erro}</span></li>)}
          </ul>
        ) : <p className="text-sm text-cinza">Nenhum problema registrado.</p>}
      </section>
    </div>
  );
}
