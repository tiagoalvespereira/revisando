"""Extrai dados/revisao-30-dias.json direto do PDF do volume.

Uso:  python3 scripts/extrair-volume.py "Revisando OAB 30 - 2027 - Volume completo.pdf"
Requer pdftotext (poppler-utils). Números de página = rodapé impresso "PÁG. N".
Rode de novo a cada nova edição do volume.
"""
import json, os, re, subprocess, sys

MATERIAS = {  # matérias de cada dia (para o simulado indicar onde revisar)
    1: ["Ética Profissional"], 2: ["Ética Profissional"], 3: ["Direito Constitucional"], 4: ["Direito Constitucional"],
    5: ["Direito Civil"], 6: ["Direito Civil"], 8: ["Processo Civil"], 9: ["Processo Civil"],
    10: ["Direito Penal"], 11: ["Direito Penal"], 12: ["Processo Penal"], 13: ["Processo Penal"],
    15: ["Filosofia do Direito", "Direitos Humanos", "Direito Eleitoral", "Direito Financeiro", "Direito Previdenciário"],
    16: ["Direito Administrativo"], 17: ["Direito Administrativo"], 18: ["Direito Tributário"], 19: ["Direito Tributário"],
    20: ["Direito do Trabalho"], 22: ["ECA", "Direito do Consumidor", "Direito Ambiental", "Direito Internacional"],
    23: ["Direito do Trabalho"], 24: ["Processo do Trabalho"], 25: ["Processo do Trabalho"], 26: ["Direito Empresarial"],
    27: ["Ética Profissional"],
}
REVISAO_GERAL = {7, 14, 21, 28}
MEGA = {15, 22}

def main(pdf):
    txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    pags = txt.split("\f")
    total = max(i for i in range(len(pags)) if re.search(r"PÁG\. ?%d\b" % i, pags[i]))
    for i in range(1, total + 1):
        assert re.search(r"PÁG\. ?%d\b" % i, pags[i]), f"rodapé da página {i} não confere"

    # Sumário: "DIA 01   ___/___   Título" com continuação nas linhas seguintes
    sumario = next(p for p in pags if "Sumário dos 30 dias" in p)
    titulos, atual = {}, None
    for linha in sumario.splitlines():
        m = re.match(r"\s*DIA (\d{2})\s+_+/_+\s+(.*)", linha)
        if m:
            atual = int(m.group(1)); titulos[atual] = m.group(2).strip()
        elif atual and linha.strip() and not linha.startswith("Revisando ·") and len(linha) - len(linha.lstrip()) > 30:
            titulos[atual] += " " + linha.strip()

    inicios = [i for i in range(1, total + 1) if re.search(r"R E V I S A N D O\s*OA B 3 0", pags[i])]
    assert len(inicios) == 30, f"esperava 30 aberturas de dia, achei {len(inicios)}"
    fins = [x - 1 for x in inicios[1:]] + [total]

    dias = []
    for d, (a, b) in enumerate(zip(inicios, fins), start=1):
        texto = " ".join(pags[a:b + 1])
        q = next((i for i in range(a, b + 1) if "Questões do dia" in pags[i]), None)
        g = next((i for i in range(a, b + 1) if re.search(r"^\s*\d{2} · [ABCD]\s", pags[i], re.M)), None)
        nq = len(set(re.findall(r"QUESTÃO (\d{2})\b", texto)))
        estrelas = len(re.findall(r"★\s*P\s*O\s*N\s*T\s*O\s*E\s*S\s*T\s*R", texto))
        titulo = titulos[d]
        dias.append({
            "dia": d,
            "conteudo": titulo,
            "materias": MATERIAS.get(d, []),
            "fase": "base" if d <= 14 else "virada" if d <= 21 else "reta",
            "tipo": "revisao" if d in REVISAO_GERAL else "mega" if d in MEGA else "vespera" if d == 30 else "conteudo",
            "pagina_inicial": a, "pagina_final": b,
            "pagina_questoes": q, "pagina_gabarito": g,
            "questoes": nq, "pontos_estrategicos": estrelas,
            "pdf": f"Revisando OAB 30 - Dia {d:02d}.pdf",
        })

    saida = {"exemplo": False, "produto": "30-dias", "fonte": os.path.basename(pdf), "paginas": total,
             "total_questoes": sum(x["questoes"] for x in dias), "total_pontos": sum(x["pontos_estrategicos"] for x in dias), "dias": dias}
    destino = os.path.join(os.path.dirname(__file__), "..", "dados", "revisao-30-dias.json")
    json.dump(saida, open(destino, "w"), ensure_ascii=False, indent=1)
    print(f"ok: {total} páginas, {saida['total_questoes']} questões, {saida['total_pontos']} pontos estratégicos")

if __name__ == "__main__":
    main(sys.argv[1])
