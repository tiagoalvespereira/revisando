import "server-only";
import r30 from "@/dados/revisao-30-dias.json";
import r15 from "@/dados/revisao-15-dias.json";
import r3 from "@/dados/revisao-3-dias.json";
import s1 from "@/dados/simulado-1.json";
import s2 from "@/dados/simulado-2.json";

export type Dia = {
  dia: number; conteudo: string; fase?: "base" | "virada" | "reta"; tipo?: "conteudo" | "revisao" | "mega" | "vespera";
  pagina_inicial: number; pagina_final: number; pagina_questoes?: number; pagina_gabarito?: number;
  dias_origem_30?: number[]; materias?: string[]; questoes?: number; pontos_estrategicos?: number;
  questoes_no_volume?: [number, number][];
};
/** deslocamento: quanto somar à página impressa para achar a página do arquivo (1 = capa sem número). */
export type Cronograma = { exemplo: boolean; produto: string; paginas: number; deslocamento?: number; dias: Dia[] };
type Revisar = { dia: number; pagina: number };
export type MateriaSimulado = { materia: string; questoes: [number, number]; onde_revisar: Record<string, Revisar[]> };
export type Simulado = {
  exemplo: boolean; simulado: number; dias_antes_da_prova: number; meta: number; margem: number;
  materias: MateriaSimulado[]; questoes: { numero: number; materia: string; gabarito: string }[];
};

const CRONOGRAMAS: Record<string, Cronograma> = {
  "30-dias": r30 as unknown as Cronograma,
  "15-dias": r15 as unknown as Cronograma,
  "3-dias": r3 as unknown as Cronograma,
};
const SIMULADOS: Record<number, Simulado> = { 1: s1 as unknown as Simulado, 2: s2 as unknown as Simulado };

export const cronogramaDe = (slug: string): Cronograma | null => CRONOGRAMAS[slug] ?? null;
export const simuladoDados = (n: number): Simulado | null => SIMULADOS[n] ?? null;
export const SIMULADOS_DISPONIVEIS = [1, 2];
/** Produtos que dão direito aos simulados. */
export const PRODUTOS_COM_SIMULADO = ["30-dias", "15-dias"];

/** Página do arquivo (com capa) a partir da página impressa no rodapé. */
export const paginaArquivo = (impressa: number, deslocamento = 1) => impressa + deslocamento;

/** Data sugerida para um dia do cronograma, terminando na véspera da prova. */
export function dataDoDia(dataProva: string, totalDias: number, dia: number) {
  const prova = new Date(dataProva);
  return new Date(prova.getTime() - (totalDias - dia + 1) * 86_400_000);
}
export function dataSimulado(dataProva: string, diasAntes: number) {
  return new Date(new Date(dataProva).getTime() - diasAntes * 86_400_000);
}
export const dataCurta = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

/** Correção: conta acertos no total e por matéria. */
export function corrigir(s: Simulado, respostas: Record<string, string>) {
  const porMateria: Record<string, { acertos: number; total: number }> = {};
  let acertos = 0;
  for (const q of s.questoes) {
    const m = (porMateria[q.materia] ??= { acertos: 0, total: 0 });
    m.total++;
    if (respostas[String(q.numero)] === q.gabarito) { m.acertos++; acertos++; }
  }
  return { acertos, porMateria };
}
