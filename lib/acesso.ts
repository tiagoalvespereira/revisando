import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { emailBoasVindas, emailRecuperacao, enviarEmail } from "@/lib/email";
import type { EventoKiwify } from "@/lib/kiwify";

type Dados = { email: string; nome?: string | null; cpf?: string | null; telefone?: string | null };

/** Fim do dia (horário de Brasília) da data-limite do produto. */
export const validoAte = (data: string | null) => (data ? `${data}T23:59:59-03:00` : null);

/** Retorna o usuário com esse e-mail, criando conta e perfil se não existir. */
export async function garantirUsuario(d: Dados): Promise<{ id: string; novo: boolean }> {
  const db = supabaseAdmin();
  const email = d.email.trim().toLowerCase();

  const { data: perfil } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (perfil) {
    await atualizarPerfil(perfil.id, d);
    return { id: perfil.id, novo: false };
  }

  const { data: criado, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome: d.nome ?? null },
  });
  let id = criado?.user?.id;
  let novo = true;
  if (error || !id) {
    // Conta no Auth existe mas sem perfil (ex.: criada à mão no painel do Supabase).
    id = await buscarIdNoAuth(email);
    novo = false;
    if (!id) throw error ?? new Error("não foi possível criar o usuário");
  }
  const { error: e2 } = await db.from("profiles").upsert({
    id, email, nome: d.nome ?? null, cpf: d.cpf ?? null, telefone: d.telefone ?? null,
  });
  if (e2) throw e2;
  return { id, novo };
}

async function atualizarPerfil(id: string, d: Dados) {
  // Só preenche o que está vazio: não sobrescreve o que o aluno editou.
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("nome, cpf, telefone").eq("id", id).single();
  const patch: Record<string, string> = {};
  if (!data?.nome && d.nome) patch.nome = d.nome;
  if (!data?.cpf && d.cpf) patch.cpf = d.cpf;
  if (!data?.telefone && d.telefone) patch.telefone = d.telefone;
  if (Object.keys(patch).length) await db.from("profiles").update(patch).eq("id", id);
}

async function buscarIdNoAuth(email: string): Promise<string | undefined> {
  const db = supabaseAdmin();
  for (let page = 1; page <= 50; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const u = data?.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (!data || data.users.length < 1000) return undefined;
  }
}

/** Link de uso único para criar/redefinir senha, verificado em /auth/confirm. */
export async function linkDeSenha(email: string): Promise<string> {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) throw error ?? new Error("falha ao gerar link");
  const u = new URL("/auth/confirm", env.siteUrl);
  u.searchParams.set("token_hash", data.properties.hashed_token);
  u.searchParams.set("type", "recovery");
  u.searchParams.set("next", "/criar-senha");
  return u.toString();
}

export async function enviarAcesso(email: string, nome: string | null, produtos: string[], novo = true) {
  const link = novo ? await linkDeSenha(email) : `${env.siteUrl}/entrar`;
  const m = emailBoasVindas(nome, produtos, link, novo);
  await enviarEmail({ para: email, ...m });
}

export async function enviarRecuperacao(email: string) {
  const link = await linkDeSenha(email);
  await enviarEmail({ para: email, ...emailRecuperacao(link) });
}

/** Libera produtos para o usuário (upsert: reativa acesso revogado). */
export async function liberar(userId: string, productIds: string[], origem: "compra" | "manual" | "isca", orderId?: string) {
  const db = supabaseAdmin();
  const { data: produtos, error } = await db.from("products").select("id, nome, acesso_ate").in("id", productIds);
  if (error) throw error;
  const linhas = (produtos ?? []).map((p) => ({
    user_id: userId, product_id: p.id, origem, order_id: orderId ?? null,
    valido_ate: validoAte(p.acesso_ate), revogado_em: null,
  }));
  if (linhas.length) {
    const { error: e } = await db.from("entitlements").upsert(linhas, { onConflict: "user_id,product_id" });
    if (e) throw e;
  }
  return (produtos ?? []).map((p) => p.nome as string);
}

export async function revogar(userId: string, productIds: string[], soCompra = false) {
  let q = supabaseAdmin().from("entitlements").update({ revogado_em: new Date().toISOString() })
    .eq("user_id", userId).in("product_id", productIds).is("revogado_em", null);
  if (soCompra) q = q.eq("origem", "compra");
  const { error } = await q;
  if (error) throw error;
}

export type Resultado = { ok: true; acao: string } | { ok: false; motivo: string };

/** Aplica um evento da Kiwify. Seguro para rodar mais de uma vez. */
export async function aplicarEventoKiwify(e: EventoKiwify): Promise<Resultado> {
  const db = supabaseAdmin();
  const { data: mapa, error: em } = await db.from("kiwify_products").select("product_id").eq("kiwify_product_id", e.kiwifyProductId);
  if (em) throw em;
  const productIds = (mapa ?? []).map((m) => m.product_id as string);

  if (e.status === "pending" || e.status === "refused") {
    await registrarPedido(e, null);
    return { ok: true, acao: `pedido ${e.status}` };
  }
  if (!productIds.length) {
    await registrarPedido(e, null);
    return { ok: false, motivo: `produto Kiwify ${e.kiwifyProductId} (${e.produtoNome ?? "sem nome"}) não está ligado a nenhum produto` };
  }

  if (e.status === "paid") {
    const u = await garantirUsuario(e);
    const orderId = await registrarPedido(e, u.id);
    const nomes = await liberar(u.id, productIds, "compra", orderId);
    await enviarAcesso(e.email, e.nome, nomes, u.novo || !(await temSenha(u.id)));
    return { ok: true, acao: `liberado: ${nomes.join(", ")}` };
  }

  // refunded | chargeback
  const { data: perfil } = await db.from("profiles").select("id").ilike("email", e.email).maybeSingle();
  await registrarPedido(e, perfil?.id ?? null);
  if (perfil) await revogar(perfil.id, productIds, true);
  return { ok: true, acao: perfil ? `revogado (${e.status})` : `${e.status} sem aluno cadastrado` };
}

async function registrarPedido(e: EventoKiwify, userId: string | null): Promise<string> {
  const db = supabaseAdmin();
  const linha: Record<string, unknown> = {
    gateway: "kiwify", gateway_id: e.pedidoId, status: e.status, kiwify_product_id: e.kiwifyProductId,
    valor_centavos: e.valorCentavos, metodo: e.metodo, email: e.email, updated_at: new Date().toISOString(),
  };
  if (userId) linha.user_id = userId;
  // Não deixa um "pendente" atrasado sobrescrever um pedido já pago/reembolsado.
  if (e.status === "pending") {
    const { data: atual } = await db.from("orders").select("id, status").eq("gateway", "kiwify").eq("gateway_id", e.pedidoId).maybeSingle();
    if (atual && atual.status !== "pending") return atual.id;
  }
  const { data, error } = await db.from("orders").upsert(linha, { onConflict: "gateway,gateway_id" }).select("id").single();
  if (error) throw error;
  return data.id;
}

/** True se o aluno já entrou alguma vez (portanto já criou senha). */
export async function temSenha(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin().auth.admin.getUserById(userId);
  return Boolean(data?.user?.last_sign_in_at);
}
