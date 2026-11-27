import { createClient } from "@supabase/supabase-js";

/**
 * Limite de aparelhos: cada login tem um session_id no token. Guardamos os mais recentes;
 * acima do limite os mais antigos são revogados e o middleware desconecta aquele aparelho.
 * O resultado fica num cookie assinado por 2 minutos para não consultar o banco a cada clique.
 */
export const LIMITE_SESSOES = Number(process.env.LIMITE_SESSOES ?? 2);
export const COOKIE_SESSAO = "rv_sv";
const VALIDADE_CACHE_S = 120;

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function hmac(texto: string) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "rv"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, "").slice(0, 32);
}

/** Valor do cookie que prova "esta sessão foi conferida há pouco". */
export async function cookieDeSessao(sessionId: string) {
  const ate = Math.floor(Date.now() / 1000) + VALIDADE_CACHE_S;
  return { valor: `${ate}.${await hmac(`${sessionId}.${ate}`)}`, maxAge: VALIDADE_CACHE_S };
}
export async function cookieValido(sessionId: string, valor: string | undefined) {
  if (!valor) return false;
  const [ate, sig] = valor.split(".");
  if (!ate || !sig || Number(ate) < Date.now() / 1000) return false;
  return sig === (await hmac(`${sessionId}.${ate}`));
}

/** Retorna false se esta sessão foi revogada (aluno passou do limite de aparelhos). */
export async function sessaoValida(userId: string, sessionId: string, dispositivo?: string | null): Promise<boolean> {
  const db = admin();
  const { data } = await db.from("sessoes").select("revogada_em").eq("session_id", sessionId).maybeSingle();
  if (data) return !data.revogada_em;

  await db.from("sessoes").insert({ session_id: sessionId, user_id: userId, dispositivo: dispositivo?.slice(0, 200) ?? null });
  const { data: perfil } = await db.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (perfil?.is_admin) return true;
  const { data: ativas } = await db.from("sessoes").select("session_id").eq("user_id", userId).is("revogada_em", null).order("criado_em", { ascending: false });
  const excedentes = (ativas ?? []).slice(LIMITE_SESSOES).map((s) => s.session_id);
  if (excedentes.length) await db.from("sessoes").update({ revogada_em: new Date().toISOString() }).in("session_id", excedentes);
  return true;
}
