/**
 * Zappfy: envio de WhatsApp por um número conectado via QR Code.
 * Documentação oficial (API reference): base https://api.zappfy.io, cabeçalho "token: <api-key>".
 *   Texto: POST /send/text   { number, text }
 *   Mídia: POST /send/media  { number, type: "document", file: <url>, docName, text }  (a confirmar no print da doc)
 * Variáveis: ZAPPFY_URL (https://api.zappfy.io) e ZAPPFY_APIKEY (token da instância).
 * O token identifica a instância; ZAPPFY_INSTANCIA não é usada.
 */
export type ConfigZappfy = { url: string; token: string };

export function configZappfy(e: Record<string, string | undefined> = process.env): ConfigZappfy | null {
  const url = e.ZAPPFY_URL?.trim().replace(/\/+$/, "");
  const token = e.ZAPPFY_APIKEY?.trim();
  return url && /^https?:\/\//.test(url) && token ? { url, token } : null;
}

/** Diagnóstico sem revelar valores: o que falta ou está no formato errado. */
export function problemaZappfy(e: Record<string, string | undefined> = process.env): string | null {
  const url = e.ZAPPFY_URL?.trim();
  if (!url) return "falta ZAPPFY_URL (use https://api.zappfy.io)";
  if (!/^https?:\/\//.test(url)) return "ZAPPFY_URL deve ser o endereço da API: https://api.zappfy.io (hoje contém outro valor)";
  if (!e.ZAPPFY_APIKEY?.trim()) return "falta ZAPPFY_APIKEY (o token da instância)";
  return null;
}

/** Monta a requisição (separado para poder testar sem rede). */
export function requisicaoZappfy(c: ConfigZappfy, tipo: "texto" | "documento", dados: { para: string; texto?: string; url?: string; arquivo?: string; legenda?: string }) {
  const caminho = tipo === "texto" ? "/send/text" : "/send/media";
  const body = tipo === "texto"
    ? { number: dados.para, text: dados.texto ?? "" }
    : { number: dados.para, type: "document", file: dados.url, docName: dados.arquivo ?? "documento.pdf", text: dados.legenda ?? "" };
  return {
    url: `${c.url}${caminho}`,
    init: { method: "POST", headers: { "Content-Type": "application/json", token: c.token }, body: JSON.stringify(body) },
  };
}

export async function enviarZappfy(c: ConfigZappfy, tipo: "texto" | "documento", dados: Parameters<typeof requisicaoZappfy>[2]) {
  const { url, init } = requisicaoZappfy(c, tipo, dados);
  const r = await fetch(url, init);
  if (!r.ok) {
    const corpo = (await r.text()).slice(0, 300).split(c.token).join("***");
    const dica = r.status === 401 ? " (token incorreto)" : r.status === 404 ? " (endereço não encontrado)" : r.status === 429 ? " (muitas mensagens seguidas, tente mais tarde)" : "";
    throw new Error(`Zappfy respondeu ${r.status}${dica}: ${corpo}`);
  }
  return r.json().catch(() => ({}));
}
