import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarWhatsapp, formatarWhatsapp } from "../lib/telefone.ts";

test("aceita os formatos comuns de celular brasileiro", () => {
  for (const e of ["(61) 99999-8888", "61999998888", "+55 61 99999-8888", "55 61 999998888", "061999998888"]) {
    assert.equal(normalizarWhatsapp(e), "5561999998888", e);
  }
  assert.equal(normalizarWhatsapp("(61) 3333-4444"), "556133334444"); // fixo com WhatsApp Business
});

test("recusa números inválidos", () => {
  for (const e of ["", "123", "(00) 99999-8888", "6188888888888", "(61) 89999-8888", "abc"]) {
    assert.equal(normalizarWhatsapp(e), null, e);
  }
});

test("formata para exibição", () => {
  assert.equal(formatarWhatsapp("5561999998888"), "(61) 99999-8888");
});
