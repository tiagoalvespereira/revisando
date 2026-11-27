import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronogramaDe } from "@/lib/dados";
import { cardsDoCronograma, diaDeHoje } from "@/lib/cronograma";
import { env } from "@/lib/env";
import { dataProvaAtual } from "@/lib/provas";
import type { Arquivo } from "@/lib/aluno";

const ORDEM = ["30-dias", "15-dias", "3-dias"];

export type Lembrete = {
  nome: string | null;
  email: string;
  plano: string;
  dia: number;
  total: number;
  conteudo: string;
  detalhes: string;
  link: string;
};

/** Hora atual (0–23) e data (AAAA-MM-DD) em Brasília. */
export function agoraBrasilia(d = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const v = (t: string) => partes.find((p) => p.type === t)!.value;
  return { hora: Number(v("hour")), data: `${v("year")}-${v("month")}-${v("day")}` };
}

/** Monta o lembrete de hoje: próximo dia não concluído do plano principal do aluno. Null se não houver o que lembrar. */
export async function montarLembrete(userId: string): Promise<Lembrete | null> {
  const db = supabaseAdmin();
  const agora = new Date().toISOString();
  const [{ data: perfil }, { data: acessos }] = await Promise.all([
    db.from("profiles").select("nome, email, is_admin").eq("id", userId).single(),
    db.from("entitlements").select("valido_ate, products(id, slug, nome)").eq("user_id", userId).is("revogado_em", null),
  ]);
  if (!perfil) return null;

  type P = { id: string; slug: string; nome: string };
  const produtos = (acessos ?? [])
    .filter((a) => !a.valido_ate || a.valido_ate > agora)
    .map((a) => a.products as unknown as P)
    .filter((p) => p && cronogramaDe(p.slug))
    .sort((a, b) => ORDEM.indexOf(a.slug) - ORDEM.indexOf(b.slug));
  const produto = produtos[0];
  if (!produto) return null;

  const c = cronogramaDe(produto.slug)!;
  const [{ data: prog }, { data: arquivos }] = await Promise.all([
    db.from("progress").select("dia").eq("user_id", userId).eq("product_slug", produto.slug),
    db.from("product_files").select("id, product_id, titulo, tipo, dia, ordem, storage_path, atualizado_em").eq("product_id", produto.id),
  ]);
  const dia = diaDeHoje(c.dias.length, (prog ?? []).map((p) => p.dia as number));
  if (!dia) return null; // cronograma concluído

  const card = cardsDoCronograma(produto.slug, (arquivos ?? []) as Arquivo[], null, await dataProvaAtual())!.cards[dia - 1];
  const destino = card.pdfDoDia ?? card.lerNoVolume ?? `/area/cronograma?plano=${produto.slug}#dia-${dia}`;
  return {
    nome: perfil.nome,
    email: perfil.email,
    plano: produto.nome,
    dia,
    total: c.dias.length,
    conteudo: card.conteudo,
    detalhes: card.paginas,
    link: `${env.siteUrl}${destino}`,
  };
}

/** Texto curto (WhatsApp e prévia). */
export function textoLembrete(l: Lembrete) {
  const ola = l.nome ? `Bom estudo, ${l.nome.split(" ")[0]}!` : "Bom estudo!";
  return `${ola}\nHoje é o Dia ${String(l.dia).padStart(2, "0")} de ${l.total}: ${l.conteudo}\n${l.detalhes}\n\nAbra o material do dia: ${l.link}`;
}
