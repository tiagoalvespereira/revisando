import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DATAS_PADRAO, proximaProva } from "@/lib/provas-regra";

/** Lista de datas cadastrada no Admin (cache de 10 min; o Admin limpa o cache ao salvar). */
export const datasProva = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const { data } = await supabaseAdmin().from("configuracoes").select("valor").eq("chave", "datas_prova").maybeSingle();
      const lista = Array.isArray(data?.valor) ? (data!.valor as string[]) : null;
      return lista?.length ? lista : DATAS_PADRAO;
    } catch {
      return DATAS_PADRAO;
    }
  },
  ["datas-prova"],
  { revalidate: 600, tags: ["provas"] },
);

/** Próxima prova (ISO) ou null se nenhuma data futura estiver cadastrada. */
export async function dataProvaAtual(): Promise<string | null> {
  return proximaProva(await datasProva());
}
