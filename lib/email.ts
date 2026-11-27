import "server-only";

type Mensagem = { para: string; assunto: string; html: string; texto: string };

export async function enviarEmail(m: Mensagem): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_FROM ?? "Revisando <onboarding@resend.dev>";
  if (!chave) {
    console.warn(`[email] RESEND_API_KEY ausente. E-mail para ${m.para} não enviado.\n${m.texto}`);
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: [m.para], subject: m.assunto, html: m.html, text: m.texto }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function modelo(titulo: string, paragrafos: string[], botao: { texto: string; url: string }) {
  const corpo = paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#333">${esc(p)}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#F5F3EE;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#111;padding:20px 24px;font-family:'Arial Black',Arial,sans-serif;font-size:20px;color:#F5F3EE">
<span style="background:#FF6B1A;color:#111;padding:0 3px">REVISA</span>NDO</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-family:'Arial Black',Arial,sans-serif;font-size:22px;text-transform:uppercase;color:#111">${esc(titulo)}</h1>
${corpo}
<p style="margin:24px 0"><a href="${esc(botao.url)}" style="display:inline-block;background:#FF6B1A;color:#111;font-weight:bold;text-decoration:none;padding:15px 24px;border-radius:10px;text-transform:uppercase">${esc(botao.texto)}</a></p>
<p style="margin:0;font-size:13px;color:#777">Se o botão não abrir, copie este endereço no navegador:<br><span style="word-break:break-all">${esc(botao.url)}</span></p>
</td></tr>
<tr><td style="padding:16px 24px;background:#f0ede6;font-size:12px;color:#777">O link vale por 24 horas. Se você não fez este pedido, ignore este e-mail.</td></tr>
</table></td></tr></table></body></html>`;
}

export function emailBoasVindas(nome: string | null, produtos: string[], link: string, novo = true) {
  const ola = nome ? `Olá, ${nome.split(" ")[0]}.` : "Olá.";
  const lista = produtos.join(" e ");
  const paragrafos = [
    ola,
    `Seu acesso a ${lista} está liberado.`,
    novo
      ? "Clique no botão abaixo para criar sua senha e entrar na área do aluno. Depois é só usar seu e-mail e essa senha, no celular ou no computador."
      : "O novo material já aparece na sua área do aluno. Entre com o mesmo e-mail e senha de sempre.",
  ];
  const botao = novo ? "Criar minha senha" : "Entrar na área do aluno";
  return {
    assunto: "Seu acesso ao Revisando está liberado",
    html: modelo("Acesso liberado", paragrafos, { texto: botao, url: link }),
    texto: `${paragrafos.join("\n\n")}\n\n${botao}: ${link}`,
  };
}

export function emailRecuperacao(link: string) {
  const paragrafos = ["Recebemos um pedido para redefinir a senha da sua conta no Revisando.", "Clique no botão abaixo para criar uma nova senha."];
  return {
    assunto: "Redefinir sua senha no Revisando",
    html: modelo("Nova senha", paragrafos, { texto: "Criar nova senha", url: link }),
    texto: `${paragrafos.join("\n\n")}\n\n${link}`,
  };
}
