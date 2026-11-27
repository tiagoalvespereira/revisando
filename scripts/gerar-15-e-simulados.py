"""Gera dados/revisao-15-dias.json (a partir do Cronograma Estratégico 15 dias) e os simulados.

Rode depois de scripts/extrair-volume.py. As páginas das questões no volume são
calculadas a partir de revisao-30-dias.json (e não copiadas do PDF do cronograma).

Os simulados ainda não existem: simulado-N.json sai com "exemplo": true e gabarito
fictício. Quando os simulados ficarem prontos, preencha GABARITO_1 e GABARITO_2.
"""
import json, os, random

AQUI = os.path.join(os.path.dirname(__file__), "..", "dados")
v30 = json.load(open(f"{AQUI}/revisao-30-dias.json"))
D = {d["dia"]: d for d in v30["dias"]}

# Cronograma Estratégico 15 dias: (conteúdo, caderno ini, caderno fim, pontos ★, dias de origem no volume)
C15 = [
    ("Ética Profissional", 1, 6, 12, [1, 2]),
    ("Ética (reta final) + Direito Constitucional", 7, 12, 11, [27, 3]),
    ("Direito Constitucional + Direito Civil", 13, 19, 13, [4, 5]),
    ("Direito Civil + Direito Processual Civil", 20, 27, 13, [6, 8]),
    ("Direito Processual Civil + Direito Penal", 28, 34, 14, [9, 10]),
    ("Direito Penal + Direito Processual Penal", 35, 40, 13, [11, 12]),
    ("Revisão geral estratégica 1", 41, 47, 0, []),
    ("Direito Processual Penal + Direito Administrativo", 48, 54, 13, [13, 16]),
    ("Direito Administrativo + Direito Tributário", 55, 61, 13, [17, 18]),
    ("Direito Tributário + Direito do Trabalho", 62, 68, 13, [19, 20]),
    ("Direito do Trabalho + Direito Processual do Trabalho", 69, 74, 13, [23, 24]),
    ("Direito Processual do Trabalho + Direito Empresarial", 75, 80, 13, [25, 26]),
    ("Mega Resumo I + Mega Resumo II", 81, 87, 18, [15, 22]),
    ("Revisão geral estratégica 2", 88, 94, 0, []),
    ("Véspera: pegadinhas top, estratégia de prova e checklist", 95, 100, 0, []),
]

def faixa_questoes(dia):
    d = D[dia]
    if not d["pagina_gabarito"]:
        return None
    ini = d["pagina_questoes"] or d["pagina_inicial"]
    return [ini, d["pagina_gabarito"] - 1] if ini < d["pagina_gabarito"] else [ini, ini]

dias15 = []
for i, (conteudo, a, b, estrelas, origem) in enumerate(C15, start=1):
    dias15.append({
        "dia": i, "conteudo": conteudo,
        "fase": "base" if i <= 7 else "virada" if i <= 13 else "reta",
        "tipo": "revisao" if i in (7, 14) else "vespera" if i == 15 else "conteudo",
        "pagina_inicial": a, "pagina_final": b, "pontos_estrategicos": estrelas,
        "dias_origem_30": origem,
        "materias": sorted({m for o in origem for m in D[o]["materias"]}),
        "questoes_no_volume": [f for f in (faixa_questoes(o) for o in origem) if f],
        "questoes": sum(D[o]["questoes"] for o in origem),
    })
json.dump({"exemplo": False, "produto": "15-dias", "paginas": 100, "dias": dias15},
          open(f"{AQUI}/revisao-15-dias.json", "w"), ensure_ascii=False, indent=1)

# Distribuição oficial da prova (página 1 do volume)
DIST = [("Ética Profissional", 8), ("Filosofia do Direito", 2), ("Direito Constitucional", 6), ("Direitos Humanos", 2),
        ("Direito Eleitoral", 2), ("Direito Internacional", 2), ("Direito Financeiro", 2), ("Direito Tributário", 5),
        ("Direito Administrativo", 5), ("Direito Ambiental", 2), ("Direito Civil", 6), ("ECA", 2),
        ("Direito do Consumidor", 2), ("Direito Empresarial", 4), ("Processo Civil", 6), ("Direito Penal", 6),
        ("Processo Penal", 6), ("Direito Previdenciário", 2), ("Direito do Trabalho", 5), ("Processo do Trabalho", 5)]
assert sum(n for _, n in DIST) == 80

GABARITO_1 = None  # ex.: "ABCDA..." (80 letras) quando o Simulado 1 estiver pronto
GABARITO_2 = None

def onde(materia):
    r30 = [{"dia": d["dia"], "pagina": d["pagina_inicial"]} for d in v30["dias"] if materia in d["materias"]]
    r15 = [{"dia": d["dia"], "pagina": d["pagina_inicial"]} for d in dias15 if materia in d["materias"]]
    return {"30-dias": r30, "15-dias": r15}

for n, gab in ((1, GABARITO_1), (2, GABARITO_2)):
    rnd = random.Random(n)
    questoes, materias, q = [], [], 1
    for materia, qtd in DIST:
        materias.append({"materia": materia, "questoes": [q, q + qtd - 1], "onde_revisar": onde(materia)})
        for _ in range(qtd):
            questoes.append({"numero": q, "materia": materia, "gabarito": gab[q - 1] if gab else rnd.choice("ABCD")})
            q += 1
    json.dump({"exemplo": gab is None, "simulado": n, "dias_antes_da_prova": 20 if n == 1 else 7, "meta": 40, "margem": 48,
               "materias": materias, "questoes": questoes},
              open(f"{AQUI}/simulado-{n}.json", "w"), ensure_ascii=False, indent=1)
print("ok")
