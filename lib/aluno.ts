import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { usuarioDaSessao } from "@/lib/auth";

export type Produto = {
  id: string; slug: string; nome: string; descricao: string | null; icone: string;
  checkout_url: string | null; vitrine: "venda" | "em_breve" | "oculto"; ordem: number; preco_centavos: number | null;
};
export type Arquivo = { id: string; product_id: string; titulo: string; tipo: string; dia: number | null; ordem: number; storage_path: string; atualizado_em: string };

export const alunoAtual = cache(async () => {
  const supabase = await supabaseServidor();
  const user = await usuarioDaSessao(supabase);
  if (!user) redirect("/entrar");
  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, perfil: perfil ?? { id: user.id, email: user.email, nome: null, cpf: null, telefone: null, is_admin: false } };
});

/** Todos os produtos ativos, cada um marcado com acesso ou não. */
export const meusProdutos = cache(async () => {
  const { supabase, user, perfil } = await alunoAtual();
  const agora = new Date().toISOString();
  const [{ data: produtos }, { data: acessos }] = await Promise.all([
    supabase.from("products").select("id, slug, nome, descricao, icone, checkout_url, vitrine, ordem, preco_centavos").eq("ativo", true).order("ordem"),
    supabase.from("entitlements").select("product_id, valido_ate, revogado_em").eq("user_id", user.id).is("revogado_em", null),
  ]);
  const validos = new Map((acessos ?? []).filter((a) => !a.valido_ate || a.valido_ate > agora).map((a) => [a.product_id, a.valido_ate as string | null]));
  // Administrador vê tudo liberado, sem prazo, para conferir e editar qualquer material.
  // (No banco, as políticas de RLS também liberam os arquivos para is_admin.)
  if (perfil.is_admin) return (produtos as Produto[] ?? []).map((p) => ({ ...p, tem: true, validoAte: null }));
  return (produtos as Produto[] ?? []).map((p) => ({ ...p, tem: validos.has(p.id), validoAte: validos.get(p.id) ?? null }));
});

/** Link de checkout da Kiwify com o e-mail do aluno já preenchido. */
export function linkCompra(url: string | null, email: string, nome?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    u.searchParams.set("email", email);
    if (nome) u.searchParams.set("name", nome);
    return u.toString();
  } catch { return url; }
}

/** Busca o arquivo respeitando RLS: só retorna se o aluno tiver acesso ao produto. */
export async function arquivoPermitido(id: string) {
  const supabase = await supabaseServidor();
  const user = await usuarioDaSessao(supabase);
  if (!user) return { user: null, arquivo: null };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { user, arquivo: null };
  const { data } = await supabase.from("product_files").select("id, product_id, titulo, tipo, dia, ordem, storage_path, atualizado_em").eq("id", id).maybeSingle();
  return { user, arquivo: data as Arquivo | null, supabase };
}
