import { createClient } from "@supabase/supabase-js";

/**
 * Limite de dispositivos: cada login gera um session_id no token do Supabase.
 * Guardamos os mais recentes; acima do limite, os mais antigos são revogados
 * e, no próximo acesso, o middleware desconecta aquele aparelho.
 * Funciona no middleware (edge) e no servidor.
 */
export const LIMITE_SESSOES = Number(process.env.LIMITE_SESSOES ?? 2);

export function sessionIdDoToken(accessToken: string | undefined): string | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(payload + "=".repeat((4 - (payload.length % 4)) % 4)));
    return typeof json.session_id === "string" ? json.session_id : null;
  } catch {
    return null;
  }
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Retorna false se esta sessão foi revogada (aluno passou do limite de aparelhos). */
export async function sessaoValida(userId: string, sessionId: string, dispositivo?: string | null): Promise<boolean> {
  const db = admin();
  const { data } = await db.from("sessoes").select("revogada_em").eq("session_id", sessionId).maybeSingle();
  if (data) return !data.revogada_em;

  // Sessão nova: registra e revoga as mais antigas acima do limite (admin não tem limite).
  await db.from("sessoes").insert({ session_id: sessionId, user_id: userId, dispositivo: dispositivo?.slice(0, 200) ?? null });
  const { data: perfil } = await db.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (perfil?.is_admin) return true;
  const { data: ativas } = await db.from("sessoes").select("session_id").eq("user_id", userId).is("revogada_em", null).order("criado_em", { ascending: false });
  const excedentes = (ativas ?? []).slice(LIMITE_SESSOES).map((s) => s.session_id);
  if (excedentes.length) await db.from("sessoes").update({ revogada_em: new Date().toISOString() }).in("session_id", excedentes);
  return true;
}
