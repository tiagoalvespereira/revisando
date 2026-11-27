(function () {
  "use strict";
  var C = window.REVISANDO || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- matérias (as 20 da 1ª fase) ----------
  var MATERIAS = [
    "Ética Profissional", "Filosofia do Direito", "Direito Constitucional", "Direitos Humanos",
    "Direito Eleitoral", "Direito Internacional", "Direito Financeiro", "Direito Tributário",
    "Direito Administrativo", "Direito Ambiental", "Direito Civil", "ECA",
    "Direito do Consumidor", "Direito Empresarial", "Processo Civil", "Direito Penal",
    "Processo Penal", "Direito Previdenciário", "Direito do Trabalho", "Processo do Trabalho"
  ];
  var ul = $("#materias");
  if (ul) ul.innerHTML = MATERIAS.map(function (m, i) {
    return "<li><b>" + String(i + 1).padStart(2, "0") + "</b>" + m + "</li>";
  }).join("");

  // ---------- data da prova: vem do Admin (/api/provas); troca sozinha depois de cada prova ----------
  var DIA = 86400000;
  var prova = null;
  var fmtCurta = function (t) { return new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }); };
  var fmtLonga = function (t) { return new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }); };
  var fmtExtenso = function (t) { return new Date(t).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }); };

  function tick() {
    if (!prova) return 0;
    var ms = Math.max(0, prova - Date.now());
    var d = Math.floor(ms / DIA), h = Math.floor(ms % DIA / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
    var map = { d: d, h: h, m: m, s: s };
    $$("[data-c]").forEach(function (el) { el.textContent = String(map[el.getAttribute("data-c")]).padStart(2, "0"); });
    var b = $("#barra-dias"); if (b) b.textContent = d;
    return d;
  }

  function aplicarProva(iso) {
    var leg = $("#contagem-legenda"), cont = $("#contagem"), barra = $("#barra-fixa .info");
    if (!iso) {
      prova = null;
      if (cont) cont.hidden = true;
      if (leg) leg.textContent = "Próxima prova: data em breve.";
      if (barra) barra.innerHTML = "<b>OAB 2027</b>revise com estratégia";
      $$("[data-prova-curta]").forEach(function (el) { el.textContent = "a prova"; });
      var f0 = $("#final-data"); if (f0) f0.textContent = "A próxima prova está chegando.";
      return;
    }
    prova = new Date(iso).getTime();
    if (cont) cont.hidden = false;
    if (leg) leg.textContent = "até a 1ª fase, em " + fmtLonga(prova) + ".";
    $$("[data-prova-curta]").forEach(function (el) { el.textContent = fmtLonga(prova); });
    var f = $("#final-data"); if (f) f.textContent = "A prova é em " + fmtExtenso(prova) + ".";
    var dias = tick();
    var rec = $("#recomendacao");
    if (rec && dias > 0) {
      if (dias >= 30) rec.textContent = "Faltam " + dias + " dias: dá tempo de fazer os 30 dias completos. Para terminar antes da prova, comece até " + fmtCurta(prova - 30 * DIA) + ". Pague com Pix, cartão parcelado ou boleto.";
      else if (dias >= 15) rec.textContent = "Faltam " + dias + " dias: o plano de 15 dias cabe inteiro até a prova. Pague com Pix, cartão parcelado ou boleto.";
    }
  }

  aplicarProva(C.dataProva || null); // valor provisório até a resposta do servidor
  setInterval(tick, 1000);
  fetch("/api/provas").then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && "proxima" in j) aplicarProva(j.proxima); })
    .catch(function () {});

  // ---------- planos: preços e links de checkout ----------
  var planos = C.planos || {};
  $$("[data-plano]").forEach(function (card) {
    var cfg = planos[card.getAttribute("data-plano")] || {};
    var preco = $(".preco", card);
    if (preco) {
      preco.innerHTML = cfg.preco
        ? '<span class="valor">R$ ' + cfg.preco + "</span>" + (cfg.parcelas ? '<span class="parc">à vista no Pix ou ' + cfg.parcelas + "</span>" : "")
        : '<span class="breve">Preço em breve</span>';
    }
    var btn = $("[data-checkout]", card);
    if (btn) {
      if (cfg.checkout) { btn.href = cfg.checkout; btn.removeAttribute("aria-disabled"); }
      else { btn.removeAttribute("href"); btn.setAttribute("aria-disabled", "true"); btn.textContent = "Vendas abrem em breve"; }
    }
  });

  $$("[data-garantia]").forEach(function (el) { el.textContent = C.garantiaDias || 7; });
  if (C.acessoAte) { var a = $("#acesso-ate"); a.hidden = false; a.textContent = "Acesso à área do aluno até " + C.acessoAte + "."; }

  var insta = $("#link-insta");
  if (insta && C.instagram) insta.href = "https://instagram.com/" + C.instagram;

  var ct = C.contato || {}, partes = [];
  if (ct.whatsapp) partes.push('<a href="https://wa.me/' + ct.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a>');
  if (ct.email) partes.push('<a href="mailto:' + ct.email + '">' + ct.email + "</a>");
  if (partes.length) $("#contato-rodape").innerHTML = "Suporte: " + partes.join(" · ");

  // ---------- barra fixa no celular (aparece depois da abertura, some na seção de planos) ----------
  var barra = $("#barra-fixa"), abertura = $(".abertura"), secPlanos = $("#planos");
  if (barra && "IntersectionObserver" in window) {
    var vendoAbertura = true, vendoPlanos = false;
    var atualizar = function () { barra.classList.toggle("visivel", !vendoAbertura && !vendoPlanos); };
    new IntersectionObserver(function (e) { vendoAbertura = e[0].isIntersecting; atualizar(); }).observe(abertura);
    new IntersectionObserver(function (e) { vendoPlanos = e[0].isIntersecting; atualizar(); }, { threshold: 0.15 }).observe(secPlanos);
  }

  // ---------- formulário da isca (WhatsApp) ----------
  var form = $("#form-isca"), msg = $("#msg-isca");
  var campoZap = form && form.whatsapp;
  if (campoZap) campoZap.addEventListener("input", function () {
    // máscara (61) 99999-9999
    var d = campoZap.value.replace(/\D/g, "").slice(0, 11), f = d;
    if (d.length > 2) f = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 7) f = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
    campoZap.value = f;
  });
  if (form) form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var nome = form.nome.value.trim(), zap = campoZap.value.replace(/\D/g, ""), ok = form.consentimento.checked;
    msg.style.color = "";
    if (nome.length < 2) return erro("Informe seu nome.");
    if (zap.length < 10 || zap.length > 11) return erro("Informe o WhatsApp com DDD.");
    if (!ok) return erro("Para receber o material, aceite a política de privacidade.");
    var botao = $("button", form), rotuloBotao = $(".btn-texto", botao) || botao;
    botao.disabled = true; rotuloBotao.textContent = "Enviando...";
    fetch((C.isca && C.isca.endpoint) || "/api/isca", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome, whatsapp: zap, consentimento: true })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.j.erro || "Não foi possível enviar.");
        form.reset();
        if (r.j.modo === "automatico") {
          msg.textContent = "Pronto! A amostra grátis de 3 dias está chegando no seu WhatsApp.";
        } else if (r.j.link) {
          msg.innerHTML = 'Cadastro feito. Agora toque em <a href="' + r.j.link + '" target="_blank" rel="noopener" style="color:inherit;font-weight:800">abrir o WhatsApp</a> e envie a mensagem para receber o PDF.';
          window.location.href = r.j.link;
        } else {
          msg.textContent = "Cadastro feito. Você vai receber a amostra grátis de 3 dias no seu WhatsApp.";
        }
      })
      .catch(function (e) { erro(e.message || "Não foi possível enviar. Tente de novo."); })
      .finally(function () { botao.disabled = false; rotuloBotao.textContent = "Quero a amostra grátis"; });
  });
  function erro(t) { msg.textContent = t; msg.style.color = "#5a0d0d"; }
})();
