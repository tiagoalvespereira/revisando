import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessaoValida, sessionIdDoToken } from "@/lib/sessoes";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const lembrar = req.cookies.get("rv_lembrar")?.value !== "0";

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => {
          const o = { ...options };
          if (!lembrar && value) { delete o.maxAge; delete o.expires; }
          res.cookies.set(name, value, o);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const rota = req.nextUrl.pathname;
  if (!user && (rota.startsWith("/area") || rota.startsWith("/admin"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?volta=${encodeURIComponent(rota + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Limite de aparelhos: só nas áreas logadas
  if (user && (rota.startsWith("/area") || rota.startsWith("/admin") || rota.startsWith("/api/arquivos"))) {
    const { data: { session } } = await supabase.auth.getSession();
    const sid = sessionIdDoToken(session?.access_token);
    if (sid && !(await sessaoValida(user.id, sid, req.headers.get("user-agent")))) {
      await supabase.auth.signOut({ scope: "local" });
      const url = req.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = "?erro=sessao";
      const r = NextResponse.redirect(url);
      res.cookies.getAll().forEach((c) => r.cookies.set(c));
      return r;
    }
  }
  return res;
}

export const config = {
  matcher: ["/area/:path*", "/admin/:path*", "/entrar", "/criar-senha", "/api/arquivos/:path*"],
};
