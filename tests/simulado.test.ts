import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Testa a regra de correção sem depender do Next (mesma lógica de lib/dados.ts)
const s = JSON.parse(readFileSync(new URL("../dados/simulado-1.json", import.meta.url), "utf8"));
const r30 = JSON.parse(readFileSync(new URL("../dados/revisao-30-dias.json", import.meta.url), "utf8"));
const r15 = JSON.parse(readFileSync(new URL("../dados/revisao-15-dias.json", import.meta.url), "utf8"));

function corrigir(sim: typeof s, respostas: Record<string, string>) {
  const porMateria: Record<string, { acertos: number; total: number }> = {};
  let acertos = 0;
  for (const q of sim.questoes) {
    const m = (porMateria[q.materia] ??= { acertos: 0, total: 0 });
    m.total++;
    if (respostas[String(q.numero)] === q.gabarito) { m.acertos++; acertos++; }
  }
  return { acertos, porMateria };
}

test("simulado tem 80 questões numeradas de 1 a 80 e faixas de matéria coerentes", () => {
  assert.equal(s.questoes.length, 80);
  s.questoes.forEach((q: { numero: number }, i: number) => assert.equal(q.numero, i + 1));
  for (const m of s.materias) {
    const [a, b] = m.questoes;
    for (let n = a; n <= b; n++) assert.equal(s.questoes[n - 1].materia, m.materia);
  }
});

test("todas certas = 80; em branco = 0; por matéria soma o total", () => {
  const todas = Object.fromEntries(s.questoes.map((q: { numero: number; gabarito: string }) => [q.numero, q.gabarito]));
  assert.equal(corrigir(s, todas).acertos, 80);
  const r = corrigir(s, {});
  assert.equal(r.acertos, 0);
  assert.equal(Object.values(r.porMateria).reduce((t, m) => t + m.total, 0), 80);
});

test("cronogramas: dias em sequência, sem buracos, até a última página", () => {
  for (const c of [r30, r15]) {
    let esperado = c.dias[0].pagina_inicial;
    for (const d of c.dias) { assert.equal(d.pagina_inicial, esperado); esperado = d.pagina_final + 1; }
    assert.equal(esperado - 1, c.paginas);
  }
  assert.equal(r30.dias.length, 30);
  assert.equal(r15.dias.length, 15);
});

test("volume de 30: totais do briefing (196 questões, 318 pontos estratégicos)", () => {
  assert.equal(r30.total_questoes, 196);
  assert.equal(r30.total_pontos, 318);
  for (const d of r30.dias.filter((x: { tipo: string }) => x.tipo === "revisao")) assert.ok([7, 14, 21, 28].includes(d.dia));
});

test("regra de acesso aos simulados: 30 dias libera 1 e 2; 15 dias só o 2", async () => {
  // Mesma regra de lib/dados.ts (simuladosLiberados) e do banco (pode_ver_simulado)
  const regra = (s: string[]) => (s.includes("30-dias") || s.includes("simulados") ? [1, 2] : s.includes("15-dias") ? [2] : []);
  assert.deepEqual(regra(["30-dias"]), [1, 2]);
  assert.deepEqual(regra(["15-dias"]), [2]);
  assert.deepEqual(regra(["30-dias", "15-dias"]), [1, 2]);
  assert.deepEqual(regra(["3-dias"]), []);
  assert.deepEqual(regra([]), []);
});
