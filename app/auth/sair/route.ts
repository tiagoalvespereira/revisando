import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/entrar", req.url), { status: 303 });
}
