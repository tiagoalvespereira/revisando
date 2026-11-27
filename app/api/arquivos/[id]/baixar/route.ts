import { NextResponse, type NextRequest } from "next/server";
import { arquivoPermitido } from "@/lib/aluno";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aplicarMarcaDagua } from "@/lib/marca-dagua";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Download com marca d'água (nome, CPF mascarado ou e-mail e data em todas as páginas).
 * O PDF marcado é gerado uma vez por aluno/arquivo/dia, guardado em _downloads/ no bucket privado
 * e entregue por URL assinada de 5 minutos (evita o limite de tamanho de resposta da Vercel).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, arquivo, supabase } = await arquivoPermitido(id);
  if (!user) return NextResponse.redirect(new URL("/entrar", req.url));
  if (!arquivo || !supabase) return NextResponse.json({ erro: "sem acesso" }, { status: 403 });

  const storage = supabaseAdmin().storage.from("materiais");
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const versao = new Date(arquivo.atualizado_em).getTime();
  const caminho = `_downloads/${user.id}/${arquivo.id}-${versao}-${hoje}.pdf`;
  const nome = `Revisando - ${arquivo.titulo}.pdf`.replace(/[\\/:*?"<>|]/g, "-");

  let assinado = await storage.createSignedUrl(caminho, 300, { download: nome });
  if (assinado.error) {
    const { data: perfil } = await supabase.from("profiles").select("nome, email, cpf").eq("id", user.id).single();
    const { data: blob, error } = await storage.download(arquivo.storage_path);
    if (error || !blob) return NextResponse.json({ erro: "arquivo indisponível" }, { status: 404 });

    const pdf = await aplicarMarcaDagua(new Uint8Array(await blob.arrayBuffer()), {
      nome: perfil?.nome ?? null, email: perfil?.email ?? user.email!, cpf: perfil?.cpf ?? null,
    });
    const up = await storage.upload(caminho, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) return NextResponse.json({ erro: "falha ao preparar o download" }, { status: 500 });
    assinado = await storage.createSignedUrl(caminho, 300, { download: nome });
    if (assinado.error) return NextResponse.json({ erro: "falha ao preparar o download" }, { status: 500 });
  }
  return NextResponse.redirect(assinado.data!.signedUrl, { status: 303 });
}
