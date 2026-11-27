/** Regras das datas de prova (sem dependências, para testar). */
export const DATAS_PADRAO = ["2027-01-10T13:00:00-03:00"];

/** A prova "vale" até o fim do dia dela; depois, passa a valer a próxima da lista. */
export function proximaProva(datas: string[], agora = Date.now()): string | null {
  const validas = datas
    .map((d) => ({ d, t: new Date(d).getTime() }))
    .filter((x) => !Number.isNaN(x.t))
    .sort((a, b) => a.t - b.t);
  return validas.find((x) => x.t + 11 * 3_600_000 > agora)?.d ?? null; // 13h + 11h = fim do dia
}

/** "10/01/2027" -> ISO às 13h de Brasília (horário de início da prova). */
export function dataBRparaISO(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m;
  const iso = `${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}T13:00:00-03:00`;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) || t.getUTCDate() !== Number(d) ? null : iso;
}

export const isoParaDataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
