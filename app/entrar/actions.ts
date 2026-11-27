"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { dentroDoLimite } from "@/lib/limite";
import { enviarRecuperacao } from "@/lib/acesso";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Estado = { erro?: string; ok?: string } | null;

const destinoSeguro = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/area";
};

export async function entrar(_: Estado, form: FormData): Promise<Estado> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const lembrar = form.get("lembrar") === "on";
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  if (!(await dentroDoLimite(email))) {
    return { erro: "Muitas tentativas. Aguarde 15 minutos ou use \"Esqueci minha senha\"." };
  }

  const store = await cookies();
  store.set("rv_lembrar", lembrar ? "1" : "0", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: lembrar ? 60 * 60 * 24 * 400 : undefined });

  const supabase = await supabaseServidor({ lembrar });
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect(destinoSeguro(form.get("volta")));
}

export async function pedirNovaSenha(_: Estado, form: FormData): Promise<Estado> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const resposta = { ok: "Se este e-mail tiver cadastro, você vai receber o link para criar uma nova senha em alguns minutos. Confira também o spam." };
  if (!email.includes("@")) return { erro: "Informe um e-mail válido." };
  if (!(await dentroDoLimite(email, "senha"))) return resposta;

  // Mesma resposta exista ou não a conta (não revela quem é aluno).
  const { data } = await supabaseAdmin().from("profiles").select("id").ilike("email", email).maybeSingle();
  if (data) {
    try { await enviarRecuperacao(email); } catch (e) { console.error("[senha]", e); }
  }
  return resposta;
}

export async function definirSenha(_: Estado, form: FormData): Promise<Estado> {
  const senha = String(form.get("senha") ?? "");
  const confirma = String(form.get("confirma") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirma) return { erro: "As senhas não conferem." };
  const supabase = await supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "O link expirou. Peça um novo em \"Esqueci minha senha\"." };
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: error.message.includes("different") ? "Use uma senha diferente da anterior." : "Não foi possível salvar a senha. Tente de novo." };
  redirect("/area");
}
