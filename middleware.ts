import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  return res;
}

export const config = {
  matcher: ["/area/:path*", "/admin/:path*", "/entrar", "/criar-senha", "/api/arquivos/:path*"],
};
