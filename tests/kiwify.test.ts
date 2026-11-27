import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { interpretarEvento, verificarAssinatura } from "../lib/kiwify.ts";

const TOKEN = "token-de-teste";
const exemplo = {
  order_id: "abc-123",
  order_status: "paid",
  webhook_event_type: "order_approved",
  payment_method: "pix",
  Product: { product_id: "prod-30", product_name: "Revisão 30 dias" },
  Customer: { full_name: "Maria Souza", email: "Maria@Exemplo.com ", mobile: "+5561999999999", CPF: "12345678900" },
  Commissions: { charge_amount: 29700 },
};

test("assinatura válida é aceita", () => {
  const corpo = JSON.stringify(exemplo);
  const sig = createHmac("sha1", TOKEN).update(corpo).digest("hex");
  assert.equal(verificarAssinatura(corpo, sig, TOKEN), true);
});

test("assinatura válida com corpo formatado é aceita", () => {
  const corpo = JSON.stringify(exemplo, null, 2);
  const sig = createHmac("sha1", TOKEN).update(JSON.stringify(exemplo)).digest("hex");
  assert.equal(verificarAssinatura(corpo, sig, TOKEN), true);
});

test("assinatura errada, ausente ou corpo adulterado é recusada", () => {
  const corpo = JSON.stringify(exemplo);
  const sig = createHmac("sha1", TOKEN).update(corpo).digest("hex");
  assert.equal(verificarAssinatura(corpo, "0".repeat(40), TOKEN), false);
  assert.equal(verificarAssinatura(corpo, null, TOKEN), false);
  assert.equal(verificarAssinatura(corpo.replace("29700", "1"), sig, TOKEN), false);
  assert.equal(verificarAssinatura(corpo, sig, ""), false);
});

test("evento pago é interpretado", () => {
  const e = interpretarEvento(exemplo);
  assert.equal(e.status, "paid");
  assert.equal(e.email, "maria@exemplo.com");
  assert.equal(e.kiwifyProductId, "prod-30");
  assert.equal(e.valorCentavos, 29700);
  assert.equal(e.idEvento, "abc-123:paid");
});

test("reembolso e chargeback geram eventos distintos do pagamento", () => {
  assert.equal(interpretarEvento({ ...exemplo, order_status: "refunded" }).idEvento, "abc-123:refunded");
  assert.equal(interpretarEvento({ ...exemplo, order_status: "chargedback" }).status, "chargeback");
});

test("payload sem e-mail ou com status desconhecido falha", () => {
  assert.throws(() => interpretarEvento({ ...exemplo, Customer: {} }));
  assert.throws(() => interpretarEvento({ ...exemplo, order_status: "xyz", webhook_event_type: undefined }));
});
