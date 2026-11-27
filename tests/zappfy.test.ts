import { test } from "node:test";
import assert from "node:assert/strict";
import { configZappfy, problemaZappfy, requisicaoZappfy } from "../lib/zappfy.ts";

const c = configZappfy({ ZAPPFY_URL: "https://api.zappfy.io/", ZAPPFY_INSTANCIA: "revisando", ZAPPFY_APIKEY: "chave" })!;

test("config exige as 3 variáveis e tira a barra final", () => {
  assert.equal(c.url, "https://api.zappfy.io");
  assert.equal(configZappfy({ ZAPPFY_URL: "x", ZAPPFY_INSTANCIA: "y" }), null);
});

test("texto: POST /message/sendText/{instancia} com apikey e {number, text}", () => {
  const r = requisicaoZappfy(c, "texto", { para: "5561999998888", texto: "Olá" });
  assert.equal(r.url, "https://api.zappfy.io/message/sendText/revisando");
  assert.equal((r.init.headers as Record<string, string>).apikey, "chave");
  const b = JSON.parse(r.init.body as string);
  assert.equal(b.number, "5561999998888");
  assert.equal(b.text, "Olá");
});

test("documento: POST /message/sendMedia/{instancia} com PDF por URL", () => {
  const r = requisicaoZappfy(c, "documento", { para: "5561999998888", url: "https://x/a.pdf", arquivo: "a.pdf", legenda: "oi" });
  assert.equal(r.url, "https://api.zappfy.io/message/sendMedia/revisando");
  const b = JSON.parse(r.init.body as string);
  assert.deepEqual([b.mediatype, b.mimetype, b.media, b.fileName, b.caption], ["document", "application/pdf", "https://x/a.pdf", "a.pdf", "oi"]);
});

test("URL sem https é recusada com diagnóstico claro", () => {
  const e = { ZAPPFY_URL: "8dbec37c-99e2", ZAPPFY_INSTANCIA: "i", ZAPPFY_APIKEY: "k" };
  assert.equal(configZappfy(e), null);
  assert.match(problemaZappfy(e)!, /https:\/\//);
  assert.equal(problemaZappfy({ ZAPPFY_URL: "https://api.zappfy.io", ZAPPFY_INSTANCIA: "i", ZAPPFY_APIKEY: "k" }), null);
});
