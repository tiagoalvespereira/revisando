import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServidor } from "@/lib/supabase/server";

/** Recebe o link do e-mail (criar senha / recuperar senha / link mágico) e abre a sessão. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token_hash = p.get("token_hash");
  const type = p.get("type") as EmailOtpType | null;
  const next = p.get("next");
  const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/area";

  if (token_hash && type) {
    const supabase = await supabaseServidor();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(destino, req.url));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", req.url));
}
