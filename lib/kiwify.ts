import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook da Kiwify.
 * A Kiwify envia o corpo em JSON e o parâmetro `?signature=` na URL:
 * HMAC-SHA1 do corpo (JSON) com o token do webhook, em hexadecimal.
 */
export function verificarAssinatura(corpoBruto: string, assinatura: string | null, token: string): boolean {
  if (!assinatura || !token) return false;
  const candidatos = [corpoBruto];
  try {
    // Alguns envios chegam com espaçamento diferente do que foi assinado.
    candidatos.push(JSON.stringify(JSON.parse(corpoBruto)));
  } catch {
    return false;
  }
  const recebida = Buffer.from(assinatura.trim().toLowerCase(), "utf8");
  return candidatos.some((c) => {
    const esperada = Buffer.from(createHmac("sha1", token).update(c).digest("hex"), "utf8");
    return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
  });
}

export type StatusPedido = "pending" | "paid" | "refunded" | "chargeback" | "refused";

export type EventoKiwify = {
  pedidoId: string;
  status: StatusPedido;
  kiwifyProductId: string;
  produtoNome: string | null;
  email: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  valorCentavos: number | null;
  metodo: string | null;
  idEvento: string;
};

const STATUS: Record<string, StatusPedido> = {
  paid: "paid",
  approved: "paid",
  order_approved: "paid",
  refunded: "refunded",
  order_refunded: "refunded",
  chargedback: "chargeback",
  chargeback: "chargeback",
  waiting_payment: "pending",
  pix_created: "pending",
  billet_created: "pending",
  refused: "refused",
  order_rejected: "refused",
};

type Obj = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

export function interpretarEvento(payload: unknown): EventoKiwify {
  if (!payload || typeof payload !== "object") throw new Error("payload inválido");
  const p = payload as Obj;
  const produto = (p.Product ?? p.product ?? {}) as Obj;
  const cliente = (p.Customer ?? p.customer ?? {}) as Obj;
  const comissoes = (p.Commissions ?? {}) as Obj;

  const pedidoId = str(p.order_id) ?? str(p.order_ref);
  const kiwifyProductId = str(produto.product_id) ?? str(p.product_id);
  const email = str(cliente.email)?.toLowerCase() ?? null;
  const bruto = (str(p.order_status) ?? str(p.webhook_event_type) ?? "").toLowerCase();
  const status = STATUS[bruto];

  if (!pedidoId) throw new Error("order_id ausente");
  if (!kiwifyProductId) throw new Error("product_id ausente");
  if (!email) throw new Error("e-mail do cliente ausente");
  if (!status) throw new Error(`status desconhecido: ${bruto || "(vazio)"}`);

  const valor = comissoes.charge_amount;
  return {
    pedidoId,
    status,
    kiwifyProductId,
    produtoNome: str(produto.product_name),
    email,
    nome: str(cliente.full_name) ?? str(cliente.first_name),
    cpf: str(cliente.CPF) ?? str(cliente.cpf),
    telefone: str(cliente.mobile),
    valorCentavos: typeof valor === "number" ? Math.round(valor) : typeof valor === "string" && /^\d+$/.test(valor) ? Number(valor) : null,
    metodo: str(p.payment_method),
    // Mesmo pedido pode mudar de status (pago -> reembolsado): cada transição é um evento.
    idEvento: `${pedidoId}:${status}`,
  };
}
