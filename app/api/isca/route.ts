import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dentroDoLimite } from "@/lib/limite";
import { normalizarWhatsapp, formatarWhatsapp, linkWhatsapp } from "@/lib/telefone";
import { enviarDocumentoModelo, whatsappAutomatico } from "@/lib/whatsapp";
import { configZappfy, enviarZappfy } from "@/lib/zappfy";
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
    // PDF da revisão de 3 dias: o arquivo do tipo "isca" ou, se não houver, o primeiro PDF do produto "3-dias".
    const { data: prod } = await db.from("products").select("id").eq("slug", "3-dias").maybeSingle();
    if (!prod) throw new Error("produto 'Revisão de 3 dias' não existe (rode o seed.sql)");
    const { data: arquivos } = await db.from("product_files").select("storage_path, tipo, ordem").eq("product_id", prod.id).order("ordem");
    const caminho = (arquivos ?? []).find((f) => f.tipo === "isca")?.storage_path ?? arquivos?.[0]?.storage_path;
    if (!caminho) throw new Error("nenhum arquivo cadastrado em Admin → Produtos → Revisão de 3 dias");
    const { data: blob, error: e1 } = await storage.download(caminho);
    if (e1 || !blob) throw new Error("PDF da Revisão de 3 dias ainda não foi enviado (Admin → Produtos → Revisão de 3 dias → Enviar PDF)");
    const pdf = await aplicarMarcaDagua(new Uint8Array(await blob.arrayBuffer()), { nome, email: formatarWhatsapp(whatsapp), cpf: null });
    const destino = `_isca/${lead.id}.pdf`;
    const up = await storage.upload(destino, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) throw up.error;
    const { data: url, error: e2 } = await storage.createSignedUrl(destino, 60 * 60 * 24 * 7);
    if (e2 || !url) throw e2 ?? new Error("falha ao assinar URL");
    const arquivo = "Revisando - Revisao de 3 dias estrategica - 2027.pdf";
    const zappfy = configZappfy();
    if (zappfy) {
      await enviarZappfy(zappfy, "documento", {
        para: whatsapp, url: url.signedUrl, arquivo,
        legenda: `Olá, ${nome.split(" ")[0]}! Aqui está a sua Revisão de 3 dias estratégica do Revisando. Comece 3 dias antes da prova: o Dia 3 é a véspera. Bons estudos!`,
      });
    } else {
      await enviarDocumentoModelo(whatsapp, nome, url.signedUrl, arquivo);
    }
    await db.from("leads").update({ envio: "enviado" }).eq("id", lead.id);
    return NextResponse.json({ ok: true, modo: "automatico" });
  } catch (e) {
    console.error("[isca] envio automático falhou", e);
    await db.from("leads").update({ envio: "falhou", envio_erro: String((e as Error).message ?? e).slice(0, 500) }).eq("id", lead.id);
    // O lead já está salvo: cai para a conversa manual.
    return NextResponse.json({ ok: true, modo: "conversa", link: conversa });
  }
}
