import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dentroDoLimite } from "@/lib/limite";
import { normalizarWhatsapp, formatarWhatsapp, linkWhatsapp } from "@/lib/telefone";
import { enviarDocumentoModelo, whatsappAutomatico } from "@/lib/whatsapp";
import { aplicarMarcaDagua } from "@/lib/marca-dagua";

export const runtime = "nodejs";
export const maxDuration = 60;

const Esquema = z.object({
  nome: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().min(8).max(30),
  consentimento: z.literal(true),
});

/**
 * Isca: grava o lead (nome + WhatsApp) e entrega a Revisão de 3 dias pelo WhatsApp.
 * - Com a API do WhatsApp configurada: envia o PDF (com marca d'água) automaticamente.
 * - Sem ela: devolve o link da conversa com o WhatsApp de atendimento, com a mensagem pronta.
 */
export async function POST(req: NextRequest) {
  const r = Esquema.safeParse(await req.json().catch(() => null));
  if (!r.success) return NextResponse.json({ erro: "Preencha nome, WhatsApp e aceite a política de privacidade." }, { status: 400 });
  const { nome } = r.data;
  const whatsapp = normalizarWhatsapp(r.data.whatsapp);
  if (!whatsapp) return NextResponse.json({ erro: "Confira o número de WhatsApp, com DDD." }, { status: 400 });
  if (!(await dentroDoLimite(whatsapp, "isca"))) return NextResponse.json({ erro: "Muitas tentativas. Tente mais tarde." }, { status: 429 });

  const db = supabaseAdmin();
  const { data: lead, error } = await db.from("leads")
    .insert({ nome, whatsapp, consentimento_lgpd: true, origem: "isca-3-dias", envio: whatsappAutomatico() ? "pendente" : "manual" })
    .select("id").single();
  if (error) {
    console.error("[isca]", error);
    return NextResponse.json({ erro: "Não foi possível concluir agora. Tente de novo em alguns minutos." }, { status: 500 });
  }

  const atendimento = process.env.WHATSAPP_NUMERO_ATENDIMENTO;
  const conversa = atendimento ? linkWhatsapp(atendimento, `Olá! Sou ${nome} e quero receber a Revisão de 3 dias estratégica.`) : null;

  if (!whatsappAutomatico()) return NextResponse.json({ ok: true, modo: "conversa", link: conversa });

  try {
    const storage = db.storage.from("materiais");
    const { data: isca } = await db.from("products").select("product_files(storage_path, tipo)").eq("slug", "3-dias").single();
    const caminho = (isca?.product_files as { storage_path: string; tipo: string }[] | undefined)?.find((f) => f.tipo === "isca")?.storage_path;
    if (!caminho) throw new Error("PDF da isca não cadastrado");
    const { data: blob, error: e1 } = await storage.download(caminho);
    if (e1 || !blob) throw e1 ?? new Error("PDF da isca não encontrado no storage");
    const pdf = await aplicarMarcaDagua(new Uint8Array(await blob.arrayBuffer()), { nome, email: formatarWhatsapp(whatsapp), cpf: null });
    const destino = `_isca/${lead.id}.pdf`;
    const up = await storage.upload(destino, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) throw up.error;
    const { data: url, error: e2 } = await storage.createSignedUrl(destino, 60 * 60 * 24 * 7);
    if (e2 || !url) throw e2 ?? new Error("falha ao assinar URL");
    await enviarDocumentoModelo(whatsapp, nome, url.signedUrl, "Revisando - Revisao de 3 dias estrategica - 2027.pdf");
    await db.from("leads").update({ envio: "enviado" }).eq("id", lead.id);
    return NextResponse.json({ ok: true, modo: "automatico" });
  } catch (e) {
    console.error("[isca] envio automático falhou", e);
    await db.from("leads").update({ envio: "falhou", envio_erro: String((e as Error).message ?? e).slice(0, 500) }).eq("id", lead.id);
    // O lead já está salvo: cai para a conversa manual.
    return NextResponse.json({ ok: true, modo: "conversa", link: conversa });
  }
}
