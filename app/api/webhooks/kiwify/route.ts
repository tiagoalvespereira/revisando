import { NextResponse, type NextRequest } from "next/server";
import { interpretarEvento, verificarAssinatura } from "@/lib/kiwify";
import { aplicarEventoKiwify } from "@/lib/acesso";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const corpo = await req.text();
  const assinatura = req.nextUrl.searchParams.get("signature") ?? req.headers.get("x-kiwify-signature");

  if (!verificarAssinatura(corpo, assinatura, env.kiwifyToken)) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  let payload: unknown;
  let evento;
  try {
    payload = JSON.parse(corpo);
    evento = interpretarEvento(payload);
  } catch (err) {
    // Evento que não entendemos (ex.: teste da Kiwify, assinatura de outro tipo). 200 para não ficar reenviando.
    console.warn("[kiwify] evento ignorado:", (err as Error).message);
    return NextResponse.json({ ignorado: (err as Error).message });
  }

  const db = supabaseAdmin();
  // Idempotência: o mesmo evento (pedido + status) só é processado uma vez.
  const { data: registro, error: eIns } = await db
    .from("webhook_events")
    .insert({ gateway: "kiwify", event_id: evento.idEvento, payload })
    .select("id")
    .maybeSingle();

  if (eIns) {
    if (eIns.code === "23505") return NextResponse.json({ duplicado: true });
    console.error("[kiwify] falha ao registrar evento", eIns);
    return NextResponse.json({ erro: "falha ao registrar" }, { status: 500 });
  }

  try {
    const r = await aplicarEventoKiwify(evento);
    await db.from("webhook_events").update({
      processado_em: new Date().toISOString(),
      erro: r.ok ? null : r.motivo,
    }).eq("id", registro!.id);
    if (!r.ok) console.warn("[kiwify]", r.motivo);
    return NextResponse.json(r);
  } catch (err) {
    // Apaga o registro para a Kiwify poder reenviar e o evento ser processado de novo.
    console.error("[kiwify] erro ao processar", evento.idEvento, err);
    await db.from("webhook_events").delete().eq("id", registro!.id);
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}
