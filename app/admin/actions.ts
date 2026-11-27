"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { enviarAcesso, garantirUsuario, liberar, revogar, temSenha } from "@/lib/acesso";
import { ICONES } from "@/components/Icone";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function liberarManual(form: FormData) {
  await exigirAdmin();
  const userId = s(form, "user_id");
  const productId = s(form, "product_id");
  const nomes = await liberar(userId, [productId], "manual");
  if (form.get("avisar") === "on") {
    const { db } = await exigirAdmin();
    const { data: p } = await db.from("profiles").select("email, nome").eq("id", userId).single();
    if (p) await enviarAcesso(p.email, p.nome, nomes, !(await temSenha(userId)));
  }
  revalidatePath(`/admin/alunos/${userId}`);
}

export async function revogarManual(form: FormData) {
  await exigirAdmin();
  const userId = s(form, "user_id");
  await revogar(userId, [s(form, "product_id")]);
  revalidatePath(`/admin/alunos/${userId}`);
}

export async function reenviarAcesso(form: FormData) {
  const { db } = await exigirAdmin();
  const userId = s(form, "user_id");
  const { data: p } = await db.from("profiles").select("email, nome").eq("id", userId).single();
  const { data: ent } = await db.from("entitlements").select("products(nome)").eq("user_id", userId).is("revogado_em", null);
  const nomes = (ent ?? []).map((e) => (e.products as unknown as { nome: string } | null)?.nome).filter(Boolean) as string[];
  // Sempre manda link de criar senha: serve para quem esqueceu ou nunca entrou.
  if (p) await enviarAcesso(p.email, p.nome, nomes.length ? nomes : ["Revisando"], true);
  redirect(`/admin/alunos/${userId}?enviado=1`);
}

export async function cadastrarAluno(form: FormData) {
  await exigirAdmin();
  const email = s(form, "email").toLowerCase();
  if (!email.includes("@")) throw new Error("e-mail inválido");
  const u = await garantirUsuario({ email, nome: s(form, "nome") || null });
  const productId = s(form, "product_id");
  if (productId) {
    const nomes = await liberar(u.id, [productId], "manual");
    if (form.get("avisar") === "on") await enviarAcesso(email, s(form, "nome") || null, nomes, u.novo || !(await temSenha(u.id)));
  }
  redirect(`/admin/alunos/${u.id}`);
}

export async function salvarProduto(form: FormData) {
  const { db } = await exigirAdmin();
  const id = s(form, "id");
  const preco = s(form, "preco").replace(/\./g, "").replace(",", ".");
  const icone = s(form, "icone");
  const vitrine = s(form, "vitrine");
  const dados = {
    nome: s(form, "nome"),
    descricao: s(form, "descricao") || null,
    icone: ICONES.includes(icone) ? icone : "livro",
    preco_centavos: preco ? Math.round(Number(preco) * 100) : null,
    checkout_url: s(form, "checkout_url") || null,
    acesso_ate: s(form, "acesso_ate") || null,
    vitrine: ["venda", "em_breve", "oculto"].includes(vitrine) ? vitrine : "venda",
    ordem: Number(s(form, "ordem")) || 0,
    ativo: form.get("ativo") === "on",
  };
  if (dados.checkout_url && !/^https:\/\//.test(dados.checkout_url)) throw new Error("O link de checkout precisa começar com https://");

  let productId = id;
  if (id) {
    await db.from("products").update(dados).eq("id", id);
  } else {
    const slug = s(form, "slug").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const { data, error } = await db.from("products").insert({ ...dados, slug }).select("id").single();
    if (error) throw error;
    productId = data.id;
  }

  // IDs da Kiwify (um por linha ou separados por vírgula)
  const ids = s(form, "kiwify_ids").split(/[\s,]+/).filter(Boolean);
  await db.from("kiwify_products").delete().eq("product_id", productId);
  if (ids.length) await db.from("kiwify_products").insert(ids.map((k) => ({ kiwify_product_id: k, product_id: productId })));

  // Ao mudar o prazo, atualiza os acessos existentes desse produto (exceto revogados).
  if (id && form.get("aplicar_prazo") === "on") {
    await db.from("entitlements").update({ valido_ate: dados.acesso_ate ? `${dados.acesso_ate}T23:59:59-03:00` : null }).eq("product_id", productId).is("revogado_em", null);
  }
  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${productId}?salvo=1`);
}

export async function adicionarArquivo(form: FormData) {
  const { db } = await exigirAdmin();
  const productId = s(form, "product_id");
  const tipo = s(form, "tipo");
  const { data: p } = await db.from("products").select("slug").eq("id", productId).single();
  const titulo = s(form, "titulo");
  const nomeArq = titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await db.from("product_files").insert({
    product_id: productId, titulo, tipo,
    dia: tipo === "dia" ? Number(s(form, "dia")) || null : null,
    ordem: Number(s(form, "ordem")) || 0,
    storage_path: `${p!.slug}/${nomeArq}-${Date.now()}.pdf`,
  });
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function removerArquivo(form: FormData) {
  const { db } = await exigirAdmin();
  await db.from("product_files").delete().eq("id", s(form, "id"));
  revalidatePath(`/admin/produtos/${s(form, "product_id")}`);
}

/** URL para o navegador enviar o PDF direto ao storage (sem passar pelo limite de 4,5 MB da Vercel). */
export async function urlDeEnvio(arquivoId: string) {
  const { db } = await exigirAdmin();
  const { data: a } = await db.from("product_files").select("storage_path").eq("id", arquivoId).single();
  if (!a) throw new Error("arquivo não encontrado");
  const { data, error } = await db.storage.from("materiais").createSignedUploadUrl(a.storage_path, { upsert: true });
  if (error) throw error;
  return { path: a.storage_path, token: data.token };
}

export async function confirmarEnvio(arquivoId: string, productId: string) {
  const { db } = await exigirAdmin();
  await db.from("product_files").update({ atualizado_em: new Date().toISOString() }).eq("id", arquivoId);
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function marcarContatado(form: FormData) {
  const { db } = await exigirAdmin();
  await db.from("leads").update({ contatado_em: new Date().toISOString() }).eq("id", s(form, "id"));
  revalidatePath("/admin/leads");
}

/** Gera o link de uso único para o aluno criar a senha (para enviar por WhatsApp ou testar). */
export async function gerarLinkAcesso(userId: string): Promise<{ link: string; telefone: string | null; nome: string | null } | { erro: string }> {
  const { db } = await exigirAdmin();
  const { data: p } = await db.from("profiles").select("email, nome, telefone").eq("id", userId).single();
  if (!p) return { erro: "aluno não encontrado" };
  try {
    const { linkDeSenha } = await import("@/lib/acesso");
    return { link: await linkDeSenha(p.email), telefone: p.telefone, nome: p.nome };
  } catch (e) {
    return { erro: String((e as Error).message ?? e) };
  }
}
