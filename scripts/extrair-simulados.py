"""Gera dados/simulado-1.json e dados/simulado-2.json a partir dos PDFs de gabarito comentado.

Uso:
  python3 scripts/extrair-simulados.py "Simulado Estrategico 1 - Gabarito comentado.pdf" "Simulado Estrategico 2 - Gabarito comentado.pdf"

Lê do PDF: a grade "Gabarito" (01 A ... 80 B) e a tabela "Análise de desempenho"
(matéria, faixa de questões e "Onde revisar no volume"). Requer pdftotext (poppler-utils).
"""
import json, os, re, subprocess, sys

AQUI = os.path.join(os.path.dirname(__file__), "..", "dados")


def texto(pdf):
    return subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout


def extrair(pdf):
    t = texto(pdf)
    ini = t.index("Gabarito")
    fim = t.index("Análise de desempenho")
    pares = re.findall(r"\b(\d{2})\s+([ABCD])\b", t[ini:fim])
    gab = {int(n): l for n, l in pares}
    assert sorted(gab) == list(range(1, 81)), f"{pdf}: gabarito incompleto ({len(gab)} questões)"

    tabela = t[fim:]
    linhas = tabela.splitlines()
    materias = []
    for i, linha in enumerate(linhas):
        m = re.match(r"\s{0,6}(\S.*?\S)\s{2,}(\d{2})[–-](\d{2})\s+_+\s*/\s*(\d+)\s+(.*)$", linha)
        if not m:
            continue
        nome, a, b, qtd, onde = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
        # linhas seguintes: continuação do nome (à esquerda) e/ou do "onde revisar" (bem recuado)
        j = i + 1
        while j < len(linhas) and linhas[j].strip() and not re.search(r"\d{2}[–-]\d{2}\s+_", linhas[j]):
            recuo = len(linhas[j]) - len(linhas[j].lstrip())
            partes = re.split(r"\s{3,}", linhas[j].strip())
            if recuo <= 6:
                nome += " " + partes[0]
                if len(partes) > 1:
                    onde += " " + " ".join(partes[1:])
            elif recuo > 40:
                onde += " " + linhas[j].strip()
            else:
                break
            j += 1
        assert b - a + 1 == qtd, f"{pdf}: {nome} faixa {a}-{b} diferente de {qtd}"
        dias = [{"dia": int(d), "pagina": int(p)} for d, p in re.findall(r"Dia (\d{1,2}) \(págs?\. (\d+)", onde)]
        materias.append({"materia": nome, "questoes": [a, b], "volume": dias})
    total = sum(m["questoes"][1] - m["questoes"][0] + 1 for m in materias)
    assert total == 80, f"{pdf}: tabela de matérias soma {total}, não 80"
    return gab, materias


# Nome no simulado -> nome usado nos cronogramas (para achar o dia no plano de 15 dias)
ALIAS = {
    "Direito Processual Civil": "Processo Civil",
    "Direito Processual Penal": "Processo Penal",
    "Direito Processual do Trabalho": "Processo do Trabalho",
    "Direito da Criança e do Adolescente": "ECA",
}


def main(pdfs):
    v15 = json.load(open(f"{AQUI}/revisao-15-dias.json"))
    for n, pdf in enumerate(pdfs, start=1):
        gab, materias = extrair(pdf)
        saida_materias, questoes = [], []
        for m in materias:
            chave = ALIAS.get(m["materia"], m["materia"])
            r15 = [{"dia": d["dia"], "pagina": d["pagina_inicial"]} for d in v15["dias"] if chave in d.get("materias", [])]
            saida_materias.append({"materia": m["materia"], "questoes": m["questoes"], "onde_revisar": {"30-dias": m["volume"], "15-dias": r15}})
            for q in range(m["questoes"][0], m["questoes"][1] + 1):
                questoes.append({"numero": q, "materia": m["materia"], "gabarito": gab[q]})
        questoes.sort(key=lambda x: x["numero"])
        json.dump({"exemplo": False, "simulado": n, "dias_antes_da_prova": 20 if n == 1 else 7, "meta": 40, "margem": 48,
                   "fonte": os.path.basename(pdf), "materias": saida_materias, "questoes": questoes},
                  open(f"{AQUI}/simulado-{n}.json", "w"), ensure_ascii=False, indent=1)
        print(f"simulado {n}: 80 respostas, {len(saida_materias)} matérias")


if __name__ == "__main__":
    main(sys.argv[1:3])
