import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export const AVISO_LEGAL =
  "Revisando · Proibida a reprodução, cópia, venda ou distribuição, total ou parcial, deste material sem autorização (Lei 9.610/98)";

/** Remove caracteres fora do WinAnsi (fonte padrão do PDF) para não quebrar o desenho do texto. */
const winAnsi = (s: string) => s.normalize("NFC").replace(/[^\x20-\x7E -ÿ·–—""'']/g, "");

export function mascararCpf(cpf: string | null | undefined) {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
}

export async function aplicarMarcaDagua(
  original: Uint8Array,
  aluno: { nome: string | null; email: string; cpf: string | null },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(original, { updateMetadata: false });
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const data = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  const cpf = mascararCpf(aluno.cpf);
  const ident = winAnsi([aluno.nome, cpf ?? aluno.email].filter(Boolean).join(" · "));
  const linhaRodape = winAnsi(`Licenciado para ${ident} · ${aluno.email} · baixado em ${data}`);
  const aviso = winAnsi(AVISO_LEGAL);

  for (const pagina of pdf.getPages()) {
    const { width, height } = pagina.getSize();
    const escala = Math.min(width, height) / 595; // A4 = 595pt de largura

    // Diagonal discreta no centro da página
    const tam = 22 * escala;
    const larg = negrito.widthOfTextAtSize(ident, tam);
    const ang = Math.atan2(height, width);
    pagina.drawText(ident, {
      x: width / 2 - (Math.cos(ang) * larg) / 2,
      y: height / 2 - (Math.sin(ang) * larg) / 2,
      size: tam,
      font: negrito,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.13,
      rotate: degrees((ang * 180) / Math.PI),
    });

    // Rodapé com identificação e aviso legal
    const t = 6.5 * escala;
    const caber = (s: string) => {
      let x = s;
      while (x.length > 10 && fonte.widthOfTextAtSize(x, t) > width - 24) x = x.slice(0, -2);
      return x === s ? s : x + "…";
    };
    pagina.drawText(caber(linhaRodape), { x: 12, y: 13 * escala, size: t, font: fonte, color: rgb(0.35, 0.35, 0.35), opacity: 0.85 });
    pagina.drawText(caber(aviso), { x: 12, y: 5 * escala, size: t, font: fonte, color: rgb(0.35, 0.35, 0.35), opacity: 0.85 });
  }

  pdf.setProducer("Revisando");
  pdf.setSubject(`Licenciado para ${aluno.email}`);
  return pdf.save({ useObjectStreams: true });
}
