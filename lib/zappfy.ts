/**
 * Zappfy (API no padrão Evolution): envio de WhatsApp por um número conectado via QR Code.
 * Variáveis: ZAPPFY_URL (ex.: https://api.zappfy.io), ZAPPFY_INSTANCIA (nome da instância), ZAPPFY_APIKEY.
 */
export type ConfigZappfy = { url: string; instancia: string; apikey: string };

export function configZappfy(e: Record<string, string | undefined> = process.env): ConfigZappfy | null {
  const url = e.ZAPPFY_URL?.trim().replace(/\/+$/, "");
  const instancia = e.ZAPPFY_INSTANCIA?.trim();
  const apikey = e.ZAPPFY_APIKEY?.trim();
  return url && instancia && apikey ? { url, instancia, apikey } : null;
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
  if (!r.ok) throw new Error(`Zappfy ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json().catch(() => ({}));
}
