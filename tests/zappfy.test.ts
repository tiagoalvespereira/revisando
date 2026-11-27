import { test } from "node:test";
import assert from "node:assert/strict";
import { configZappfy, problemaZappfy, requisicaoZappfy } from "../lib/zappfy.ts";

const c = configZappfy({ ZAPPFY_URL: "https://api.zappfy.io/", ZAPPFY_APIKEY: "tok" })!;

test("config: endereço + token; tira a barra final", () => {
  assert.equal(c.url, "https://api.zappfy.io");
  assert.equal(c.token, "tok");
  assert.equal(configZappfy({ ZAPPFY_URL: "https://api.zappfy.io" }), null);
});

test("texto: POST /send/text com cabeçalho token e {number, text} (documentação oficial)", () => {
  const r = requisicaoZappfy(c, "texto", { para: "5561999998888", texto: "Olá" });
  assert.equal(r.url, "https://api.zappfy.io/send/text");
  assert.equal((r.init.headers as Record<string, string>).token, "tok");
  assert.deepEqual(JSON.parse(r.init.body as string), { number: "5561999998888", text: "Olá" });
});

test("documento: POST /send/media com PDF por URL", () => {
  const r = requisicaoZappfy(c, "documento", { para: "5561999998888", url: "https://x/a.pdf", arquivo: "a.pdf", legenda: "oi" });
  assert.equal(r.url, "https://api.zappfy.io/send/media");
  assert.deepEqual(JSON.parse(r.init.body as string), { number: "5561999998888", type: "document", file: "https://x/a.pdf", docName: "a.pdf", text: "oi" });
});

test("URL sem https é recusada com diagnóstico claro", () => {
  const e = { ZAPPFY_URL: "8dbec37c-99e2", ZAPPFY_APIKEY: "k" };
  assert.equal(configZappfy(e), null);
  assert.match(problemaZappfy(e)!, /https:\/\/api\.zappfy\.io/);
  assert.equal(problemaZappfy({ ZAPPFY_URL: "https://api.zappfy.io", ZAPPFY_APIKEY: "k" }), null);
});
