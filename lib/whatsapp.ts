import "server-only";

/**
 * WhatsApp Cloud API (Meta). Opcional: sem as variáveis abaixo, a isca usa o modo "conversa"
 * (o lead é levado para o WhatsApp de atendimento com a mensagem pronta).
 *
 * WHATSAPP_TOKEN            token permanente do usuário de sistema (Meta Business)
 * WHATSAPP_PHONE_NUMBER_ID  ID do número que envia
 * WHATSAPP_TEMPLATE_ISCA    modelo aprovado com cabeçalho DOCUMENTO e {{1}} = nome no corpo
 */
export const whatsappAutomatico = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

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
