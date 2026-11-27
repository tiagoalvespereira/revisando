import "server-only";
import type { Arquivo } from "@/lib/aluno";
import type { DiaCard } from "@/components/Cronograma";
import { cronogramaDe, dataCurta, dataDoDia, paginaArquivo } from "@/lib/dados";

/** Monta os cards do cronograma de um produto com os links certos para os PDFs. */
export function cardsDoCronograma(slug: string, arquivos: Arquivo[], volume30Id: string | null | undefined, dataProva: string | null): { cards: DiaCard[]; exemplo: boolean } | null {
  const c = cronogramaDe(slug);
  if (!c) return null;
  const desl = c.deslocamento ?? 1;
  const principal = arquivos.find((a) => a.tipo === "volume" || a.tipo === "caderno" || a.tipo === "isca");
  const porDia = new Map(arquivos.filter((a) => a.tipo === "dia" && a.dia).map((a) => [a.dia!, a.id]));
  const ler = (pag: number) => (principal ? `/area/ler/${principal.id}?pagina=${paginaArquivo(pag, desl)}` : null);

  const cards = c.dias.map((d) => {
    const detalhes = [`Págs. ${d.pagina_inicial}–${d.pagina_final}`];
    if (d.questoes) detalhes.push(`${d.questoes} questões`);
    if (d.pontos_estrategicos) detalhes.push(`${d.pontos_estrategicos} ★`);
    // Questões: no próprio material (30 e 3 dias) ou no volume de 30 (plano de 15 dias)
    let questoesLink: string | null = null;
    if (d.questoes_no_volume?.length) {
      questoesLink = volume30Id ? `/area/ler/${volume30Id}?pagina=${paginaArquivo(d.questoes_no_volume[0][0])}` : null;
      detalhes.push(`questões no volume: págs. ${d.questoes_no_volume.map(([a, b]) => `${a}–${b}`).join(" e ")}`);
    } else if (d.pagina_questoes) {
      questoesLink = ler(d.pagina_questoes);
    }
    return {
      dia: d.dia,
      conteudo: d.conteudo,
      fase: d.fase ?? null,
      revisao: d.tipo === "revisao",
      especial: d.tipo === "mega" ? "Mega resumo" : d.tipo === "vespera" ? "Véspera" : d.tipo === "revisao" ? "Revisão geral" : null,
      paginas: detalhes.join(" · "),
      data: dataProva && !c.sem_datas ? dataCurta(dataDoDia(dataProva, c.dias.length, d.dia)) : "",
      lerNoVolume: ler(d.pagina_inicial),
      pdfDoDia: porDia.has(d.dia) ? `/area/ler/${porDia.get(d.dia)}` : null,
      questoes: questoesLink,
    };
  }) satisfies DiaCard[];
  return { cards, exemplo: c.exemplo };
}

/** Próximo dia não concluído. */
export function diaDeHoje(total: number, concluidos: number[]) {
  const feitos = new Set(concluidos);
  for (let d = 1; d <= total; d++) if (!feitos.has(d)) return d;
  return null;
}
