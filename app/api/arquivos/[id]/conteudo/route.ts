import { NextResponse, type NextRequest } from "next/server";
import { arquivoPermitido } from "@/lib/aluno";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TRECHO = 2 * 1024 * 1024;

/**
 * Entrega trechos do PDF para o leitor (só requisições com Range, até 2 MB cada).
 * Confere login e acesso a cada trecho; a URL do storage nunca chega ao navegador.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const range = req.headers.get("range");
  const m = range?.match(/^bytes=(\d+)-(\d+)$/);
  if (!m || Number(m[2]) < Number(m[1]) || Number(m[2]) - Number(m[1]) + 1 > MAX_TRECHO) {
    return NextResponse.json({ erro: "envie um Range de até 2 MB" }, { status: 416 });
  }

  const { user, arquivo } = await arquivoPermitido(id);
  if (!user) return NextResponse.json({ erro: "faça login" }, { status: 401 });
  if (!arquivo) return NextResponse.json({ erro: "sem acesso" }, { status: 403 });

  const { data, error } = await supabaseAdmin().storage.from("materiais").createSignedUrl(arquivo.storage_path, 60);
  if (error || !data) return NextResponse.json({ erro: "arquivo indisponível" }, { status: 404 });

  const origem = await fetch(data.signedUrl, { headers: { Range: range! }, signal: req.signal });
  if (origem.status !== 206 && !origem.ok) return NextResponse.json({ erro: "arquivo indisponível" }, { status: 404 });

  const h = new Headers({ "Content-Type": "application/pdf", "Cache-Control": "private, no-store" });
  for (const k of ["content-length", "content-range"]) {
    const v = origem.headers.get(k);
    if (v) h.set(k, v);
  }
  return new Response(origem.body, { status: origem.status, headers: h });
}
