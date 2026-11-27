import { exigirAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const cel = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita injeção de fórmula no Excel
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const { db } = await exigirAdmin();
  const linhas: string[] = ["nome;whatsapp;email;consentimento_lgpd;origem;envio;contatado_em;criado_em"];
  for (let de = 0; ; de += 1000) {
    const { data } = await db.from("leads").select("nome, whatsapp, email, consentimento_lgpd, origem, envio, contatado_em, created_at").order("created_at").range(de, de + 999);
    for (const l of data ?? []) linhas.push([l.nome, l.whatsapp, l.email, l.consentimento_lgpd ? "sim" : "não", l.origem, l.envio, l.contatado_em, l.created_at].map(cel).join(";"));
    if (!data || data.length < 1000) break;
  }
  return new Response("﻿" + linhas.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-revisando-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
