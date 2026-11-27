/**
 * Zappfy (API no padrão Evolution): envio de WhatsApp por um número conectado via QR Code.
 * Variáveis: ZAPPFY_URL (ex.: https://api.zappfy.io), ZAPPFY_INSTANCIA (nome da instância), ZAPPFY_APIKEY.
 */
export type ConfigZappfy = { url: string; instancia: string; apikey: string };

export function configZappfy(e: Record<string, string | undefined> = process.env): ConfigZappfy | null {
  const url = e.ZAPPFY_URL?.trim().replace(/\/+$/, "");
  const instancia = e.ZAPPFY_INSTANCIA?.trim();
  const apikey = e.ZAPPFY_APIKEY?.trim();
  return url && /^https?:\/\//.test(url) && instancia && apikey ? { url, instancia, apikey } : null;
}

/** Diagnóstico sem revelar valores: o que falta ou está no formato errado. */
export function problemaZappfy(e: Record<string, string | undefined> = process.env): string | null {
  const url = e.ZAPPFY_URL?.trim();
  if (!url) return "falta ZAPPFY_URL (endereço da API, ex.: https://api.zappfy.io)";
  if (!/^https?:\/\//.test(url)) return "ZAPPFY_URL deve ser o endereço da API, começando com https:// (hoje contém outro valor)";
  if (!e.ZAPPFY_INSTANCIA?.trim()) return "falta ZAPPFY_INSTANCIA";
  if (!e.ZAPPFY_APIKEY?.trim()) return "falta ZAPPFY_APIKEY";
  return null;
}

/** Monta a requisição (separado para poder testar sem rede). */
export function requisicaoZappfy(c: ConfigZappfy, tipo: "texto" | "documento", dados: { para: string; texto?: string; url?: string; arquivo?: string; legenda?: string }) {
  const caminho = tipo === "texto" ? "sendText" : "sendMedia";
  const body = tipo === "texto"
    ? { number: dados.para, text: dados.texto ?? "", linkPreview: true }
    : { number: dados.para, mediatype: "document", mimetype: "application/pdf", media: dados.url, fileName: dados.arquivo ?? "documento.pdf", caption: dados.legenda ?? "" };
  return {
    url: `${c.url}/message/${caminho}/${encodeURIComponent(c.instancia)}`,
    init: { method: "POST", headers: { "Content-Type": "application/json", apikey: c.apikey }, body: JSON.stringify(body) },
  };
}

export async function enviarZappfy(c: ConfigZappfy, tipo: "texto" | "documento", dados: Parameters<typeof requisicaoZappfy>[2]) {
  const { url, init } = requisicaoZappfy(c, tipo, dados);
  const r = await fetch(url, init);
  if (!r.ok) {
    const corpo = (await r.text()).slice(0, 300).split(c.apikey).join("***");
    throw new Error(`Zappfy respondeu ${r.status}${r.status === 401 || r.status === 403 ? " (apikey ou instância incorreta)" : r.status === 404 ? " (instância não encontrada ou endereço errado)" : ""}: ${corpo}`);
  }
  return r.json().catch(() => ({}));
}
