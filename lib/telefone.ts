/** Normaliza um celular brasileiro para o formato do WhatsApp: 55 + DDD + número (12 ou 13 dígitos). */
export function normalizarWhatsapp(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (!/^55[1-9]\d\d{8,9}$/.test(d)) return null;
  const ddd = Number(d.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;
  // Celular com 9 dígitos precisa começar com 9
  if (d.length === 13 && d[4] !== "9") return null;
  return d;
}

export function formatarWhatsapp(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : d;
}

/** Link de conversa no WhatsApp com texto pronto. */
export const linkWhatsapp = (numero: string, texto: string) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
