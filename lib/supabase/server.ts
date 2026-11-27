import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Cliente com a sessão do usuário (respeita RLS). Server Components, Actions e Route Handlers. */
export async function supabaseServidor(opcoes?: { lembrar?: boolean }) {
  const store = await cookies();
  const lembrar = opcoes?.lembrar ?? store.get("rv_lembrar")?.value !== "0";
  return createServerClient(env.supabaseUrl, env.supabaseAnon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) {
            const o = { ...options };
            // "Lembrar de mim" desmarcado: cookie de sessão (apaga ao fechar o navegador).
            if (!lembrar && value) { delete o.maxAge; delete o.expires; }
            store.set(name, value, o);
          }
        } catch {
          // Chamado de um Server Component: o middleware renova a sessão.
        }
      },
    },
  });
}
