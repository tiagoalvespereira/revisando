import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarAcesso, garantirUsuario, liberar, temSenha } from "@/lib/acesso";
import { dentroDoLimite } from "@/lib/limite";

export const runtime = "nodejs";

const Esquema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  consentimento: z.literal(true),
});

/** Cadastro da isca: grava o lead, cria a conta e libera a Revisão de 3 dias. */
export async function POST(req: NextRequest) {
  const corpo = await req.json().catch(() => null);
  const r = Esquema.safeParse(corpo);
  if (!r.success) return NextResponse.json({ erro: "Preencha nome, e-mail e aceite a política de privacidade." }, { status: 400 });
  const { nome, email } = r.data;

  if (!(await dentroDoLimite(email, "isca"))) return NextResponse.json({ erro: "Muitas tentativas. Tente mais tarde." }, { status: 429 });

  const db = supabaseAdmin();
  await db.from("leads").insert({ nome, email, consentimento_lgpd: true, origem: "isca-3-dias" });

  const { data: isca } = await db.from("products").select("id").eq("slug", "3-dias").single();
  if (!isca) return NextResponse.json({ erro: "Material indisponível no momento." }, { status: 503 });

  try {
    const u = await garantirUsuario({ email, nome });
    // Não rebaixa quem já tem o produto por outra origem.
    const { data: ja } = await db.from("entitlements").select("origem").eq("user_id", u.id).eq("product_id", isca.id).is("revogado_em", null).maybeSingle();
    const nomes = ja ? ["Revisão de 3 dias estratégica"] : await liberar(u.id, [isca.id], "isca");
    await enviarAcesso(email, nome, nomes, u.novo || !(await temSenha(u.id)));
  } catch (e) {
    console.error("[isca]", e);
    return NextResponse.json({ erro: "Não foi possível concluir agora. Tente de novo em alguns minutos." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
