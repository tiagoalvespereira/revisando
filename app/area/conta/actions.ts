"use server";
import { revalidatePath } from "next/cache";
import { alunoAtual } from "@/lib/aluno";

export type Estado = { erro?: string; ok?: string } | null;

export async function salvarDados(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, user } = await alunoAtual();
  const nome = String(form.get("nome") ?? "").trim().slice(0, 120);
  const cpf = String(form.get("cpf") ?? "").replace(/\D/g, "");
  const telefone = String(form.get("telefone") ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  if (cpf && cpf.length !== 11) return { erro: "CPF deve ter 11 números." };
  const { error } = await supabase.from("profiles").update({ nome: nome || null, cpf: cpf || null, telefone: telefone || null }).eq("id", user.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/area");
  return { ok: "Dados salvos." };
}

export async function trocarSenha(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, user } = await alunoAtual();
  const atual = String(form.get("atual") ?? "");
  const nova = String(form.get("nova") ?? "");
  if (nova.length < 8) return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  const { error: e1 } = await supabase.auth.signInWithPassword({ email: user.email!, password: atual });
  if (e1) return { erro: "Senha atual incorreta." };
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return { erro: "Não foi possível trocar a senha." };
  return { ok: "Senha alterada." };
}
