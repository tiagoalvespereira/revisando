"use server";
import { revalidatePath } from "next/cache";
import { alunoAtual, meusProdutos } from "@/lib/aluno";
import { cronogramaDe } from "@/lib/dados";

export async function marcarDia(slug: string, dia: number, concluido: boolean) {
  const { supabase, user } = await alunoAtual();
  const c = cronogramaDe(slug);
  if (!c || !c.dias.some((d) => d.dia === dia)) throw new Error("dia inválido");
  if (!(await meusProdutos()).some((p) => p.slug === slug && p.tem)) throw new Error("sem acesso");
  if (concluido) {
    await supabase.from("progress").upsert({ user_id: user.id, product_slug: slug, dia }, { onConflict: "user_id,product_slug,dia" });
  } else {
    await supabase.from("progress").delete().eq("user_id", user.id).eq("product_slug", slug).eq("dia", dia);
  }
  revalidatePath(`/area/produto/${slug}`);
  revalidatePath("/area");
}
