"use server";
import { redirect } from "next/navigation";
import { alunoAtual, meusProdutos } from "@/lib/aluno";
import { corrigir, PRODUTOS_COM_SIMULADO, simuladoDados } from "@/lib/dados";

export async function enviarSimulado(n: number, respostas: Record<string, string>) {
  const { supabase, user } = await alunoAtual();
  const s = simuladoDados(n);
  if (!s) throw new Error("simulado inexistente");
  if (!(await meusProdutos()).some((p) => p.tem && PRODUTOS_COM_SIMULADO.includes(p.slug))) throw new Error("sem acesso");

  // Aceita só números de questão válidos e letras A–D.
  const limpas: Record<string, string> = {};
  for (const q of s.questoes) {
    const r = respostas[String(q.numero)];
    if (r && /^[ABCD]$/.test(r)) limpas[String(q.numero)] = r;
  }
  const { acertos, porMateria } = corrigir(s, limpas);
  const { error } = await supabase.from("simulado_respostas").insert({ user_id: user.id, simulado: n, respostas: limpas, acertos, por_materia: porMateria });
  if (error) throw error;
  redirect(`/area/simulado/${n}`);
}
