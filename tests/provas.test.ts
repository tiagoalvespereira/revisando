import { test } from "node:test";
import assert from "node:assert/strict";
import { dataBRparaISO, proximaProva } from "../lib/provas-regra.ts";

const L = ["2027-01-10T13:00:00-03:00", "2027-06-20T13:00:00-03:00"];
const t = (s: string) => new Date(s).getTime();

test("antes da prova: usa a primeira", () => assert.equal(proximaProva(L, t("2026-11-27T12:00:00-03:00")), L[0]));
test("no dia da prova, à noite: ainda é a mesma", () => assert.equal(proximaProva(L, t("2027-01-10T22:00:00-03:00")), L[0]));
test("no dia seguinte: troca sozinha para a próxima", () => assert.equal(proximaProva(L, t("2027-01-11T08:00:00-03:00")), L[1]));
test("depois da última: null (mostra 'data em breve')", () => assert.equal(proximaProva(L, t("2027-07-01T08:00:00-03:00")), null));
test("ordem da lista não importa", () => assert.equal(proximaProva([L[1], L[0]], t("2026-12-01T08:00:00-03:00")), L[0]));
test("converte dd/mm/aaaa e recusa data inválida", () => {
  assert.equal(dataBRparaISO("10/01/2027"), "2027-01-10T13:00:00-03:00");
  assert.equal(dataBRparaISO("31/02/2027"), null);
  assert.equal(dataBRparaISO("2027-01-10"), null);
});
