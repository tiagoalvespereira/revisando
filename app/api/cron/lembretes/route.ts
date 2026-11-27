import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { agoraBrasilia, montarLembrete } from "@/lib/lembretes";
import { emailLembrete, enviarEmail } from "@/lib/email";
import { enviarLembreteWhatsapp, whatsappAutomatico } from "@/lib/whatsapp";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LOTE = 150;

function autorizado(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const recebido = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!segredo || !recebido) return false;
  const a = Buffer.from(segredo), b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Chamado de hora em hora (agendador do Supabase). Envia o lembrete do dia para quem escolheu esta hora
 * e ainda não recebeu hoje. Pode ser chamado mais de uma vez na mesma hora sem duplicar.
 */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const { hora, data } = agoraBrasilia();
  const forcarHora = req.nextUrl.searchParams.get("hora"); // para teste manual
  const horaAlvo = forcarHora !== null ? Number(forcarHora) : hora;

  const { data: fila, error } = await db
    .from("lembretes")
    .select("user_id, por_whatsapp, por_email, whatsapp")
    .eq("ativo", true)
    .eq("hora", horaAlvo)
    .or(`ultimo_envio.is.null,ultimo_envio.lt.${data}`)
    .limit(LOTE);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const zapLigado = whatsappAutomatico() && Boolean(process.env.WHATSAPP_TEMPLATE_LEMBRETE);
  const linkConfig = `${env.siteUrl}/area/conta#lembretes`;
  const res = { hora: horaAlvo, candidatos: fila?.length ?? 0, emails: 0, whatsapps: 0, semConteudo: 0, erros: 0 };

  for (const l of fila ?? []) {
    const erros: string[] = [];
    try {
      const lem = await montarLembrete(l.user_id);
      if (!lem) {
        res.semConteudo++;
      } else {
        if (l.por_email && process.env.RESEND_API_KEY) {
          try { await enviarEmail({ para: lem.email, ...emailLembrete(lem, linkConfig) }); res.emails++; }
          catch (e) { erros.push(`e-mail: ${(e as Error).message}`); }
        }
        if (l.por_whatsapp && l.whatsapp && zapLigado) {
          try {
            await enviarLembreteWhatsapp(l.whatsapp, lem.nome, `${lem.dia} de ${lem.total}`, lem.conteudo, lem.link);
            res.whatsapps++;
          } catch (e) { erros.push(`whatsapp: ${(e as Error).message}`); }
        }
      }
    } catch (e) {
      erros.push(String((e as Error).message ?? e));
    }
    if (erros.length) res.erros++;
    // Marca o dia como processado mesmo com erro, para não insistir de hora em hora.
    await db.from("lembretes").update({ ultimo_envio: data, ultimo_erro: erros.length ? erros.join(" | ").slice(0, 500) : null }).eq("user_id", l.user_id);
  }

  return NextResponse.json(res);
}
