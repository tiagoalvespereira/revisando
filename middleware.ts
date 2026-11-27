import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, cookieDeSessao, cookieValido, sessaoValida } from "@/lib/sessoes";

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

  // getClaims renova o token se preciso e confere a assinatura localmente (rápido).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; session_id?: string } | undefined;
  const rota = req.nextUrl.pathname;
  const protegida = rota.startsWith("/area") || rota.startsWith("/admin");

  if (!claims?.sub && protegida) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?volta=${encodeURIComponent(rota + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Limite de aparelhos: confere no banco no máximo a cada 2 minutos por aparelho.
  if (claims?.sub && claims.session_id && protegida && !(await cookieValido(claims.session_id, req.cookies.get(COOKIE_SESSAO)?.value))) {
    if (!(await sessaoValida(claims.sub, claims.session_id, req.headers.get("user-agent")))) {
      await supabase.auth.signOut({ scope: "local" });
      const url = req.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = "?erro=sessao";
      const r = NextResponse.redirect(url);
      res.cookies.getAll().forEach((c) => r.cookies.set(c));
      r.cookies.delete(COOKIE_SESSAO);
      return r;
    }
    const c = await cookieDeSessao(claims.session_id);
    res.cookies.set(COOKIE_SESSAO, c.valor, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: c.maxAge });
  }
  return res;
}

// /api/arquivos fica fora: a própria rota confere login e acesso (e o leitor faz muitas requisições).
export const config = { matcher: ["/area/:path*", "/admin/:path*", "/entrar", "/criar-senha"] };
