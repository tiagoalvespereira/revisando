import "server-only";
import { notFound } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioDaSessao } from "@/lib/auth";

/** Garante que quem chama é admin. Retorna o cliente service role para o resto da operação. */
export async function exigirAdmin() {
  const supabase = await supabaseServidor();
  const user = await usuarioDaSessao(supabase);
  if (!user) notFound();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!data?.is_admin) notFound();
  return { db: supabaseAdmin(), adminId: user.id };
}
export const reais = (c: number | null | undefined) => c == null ? "—" : (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (d: string | null | undefined) => d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";
