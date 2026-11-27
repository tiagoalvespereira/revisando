import type { SupabaseClient } from "@supabase/supabase-js";

export type Usuario = { id: string; email: string; sessionId: string | null };

/**
 * Usuário da sessão, verificado pela assinatura do token (getClaims), sem ida ao servidor
 * de autenticação quando o projeto usa chaves assimétricas (padrão do Supabase).
 */
export async function usuarioDaSessao(supabase: SupabaseClient): Promise<Usuario | null> {
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims as { sub?: string; email?: string; session_id?: string } | undefined;
  if (error || !c?.sub) return null;
  return { id: c.sub, email: c.email ?? "", sessionId: c.session_id ?? null };
}
