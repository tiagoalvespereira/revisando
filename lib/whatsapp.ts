import "server-only";
import { configZappfy } from "@/lib/zappfy";

/**
 * WhatsApp Cloud API (Meta). Opcional: sem as variáveis abaixo, a isca usa o modo "conversa"
 * (o lead é levado para o WhatsApp de atendimento com a mensagem pronta).
 *
 * WHATSAPP_TOKEN            token permanente do usuário de sistema (Meta Business)
 * WHATSAPP_PHONE_NUMBER_ID  ID do número que envia
 * WHATSAPP_TEMPLATE_ISCA    modelo aprovado com cabeçalho DOCUMENTO e {{1}} = nome no corpo
 */

/** Meta (API oficial) configurada? */
export const metaConfigurada = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
/** Algum provedor de WhatsApp configurado? A Zappfy tem preferência. */
export const whatsappAutomatico = () => Boolean(configZappfy()) || metaConfigurada();

export async function enviarDocumentoModelo(para: string, nome: string, urlDocumento: string, nomeArquivo: string) {
  const versao = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const r = await fetch(`https://graph.facebook.com/${versao}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_ISCA ?? "revisao_3_dias",
        language: { code: "pt_BR" },
        components: [
          { type: "header", parameters: [{ type: "document", document: { link: urlDocumento, filename: nomeArquivo } }] },
          { type: "body", parameters: [{ type: "text", text: nome.split(" ")[0] }] },
        ],
      },
    }),
  });
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

/**
 * Lembrete diário por WhatsApp. Precisa de um modelo aprovado na Meta (WHATSAPP_TEMPLATE_LEMBRETE),
 * em pt_BR, com 4 variáveis no corpo: {{1}} primeiro nome, {{2}} dia (ex.: "13 de 30"),
 * {{3}} conteúdo do dia, {{4}} link do material.
 */
export async function enviarLembreteWhatsapp(para: string, nome: string | null, dia: string, conteudo: string, link: string) {
  const versao = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const r = await fetch(`https://graph.facebook.com/${versao}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_LEMBRETE ?? "lembrete_estudo",
        language: { code: "pt_BR" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: (nome ?? "aluno").split(" ")[0] },
            { type: "text", text: dia },
            { type: "text", text: corta(conteudo, 200) },
            { type: "text", text: link },
          ],
        }],
      },
    }),
  });
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${(await r.text()).slice(0, 300)}`);
}
