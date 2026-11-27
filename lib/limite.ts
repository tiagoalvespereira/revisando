import "server-only";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

const JANELA_MIN = 15;
const MAX_POR_EMAIL = 8;
const MAX_POR_IP = 30;

export async function ipDoCliente() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
}

/** Registra uma tentativa e diz se ainda está dentro do limite. */
export async function dentroDoLimite(email: string, prefixo = "login"): Promise<boolean> {
  const db = supabaseAdmin();
  const ip = await ipDoCliente();
  const desde = new Date(Date.now() - JANELA_MIN * 60_000).toISOString();
  const chaves = [`${prefixo}:email:${email.toLowerCase()}`, `${prefixo}:ip:${ip}`];
  const [porEmail, porIp] = await Promise.all(
    chaves.map((c) => db.from("login_tentativas").select("id", { count: "exact", head: true }).eq("chave", c).gte("criado_em", desde)),
  );
  await db.from("login_tentativas").insert(chaves.map((chave) => ({ chave })));
  return (porEmail.count ?? 0) < MAX_POR_EMAIL && (porIp.count ?? 0) < MAX_POR_IP;
}
