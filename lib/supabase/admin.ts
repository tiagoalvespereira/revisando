import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Cliente com service role: ignora RLS. Só no servidor, depois de checar permissões. */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl, env.serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
