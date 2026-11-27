/*
 * CONFIGURAÇÃO DO SITE REVISANDO
 * Edite só este arquivo para trocar preços, links da Kiwify e contatos.
 * Tudo que estiver como null aparece no site como "em breve" ou fica oculto.
 */
window.REVISANDO = {
  // Data da prova (1ª fase). Formato ISO com fuso de Brasília.
  dataProva: "2027-01-10T13:00:00-03:00",

  planos: {
    "30-dias": {
      preco: "147,00",
      parcelas: null,       // ex.: "12x de 14,70"
      checkout: "https://pay.kiwify.com.br/9DTdX9t"
    },
    "15-dias": {
      preco: "97,00",
      parcelas: null,
      checkout: "https://pay.kiwify.com.br/3JuYzSE"
    }
  },

  // Isca grátis (Revisão de 3 dias)
  // Isca grátis (Revisão de 3 dias): o próprio sistema cria a conta e envia o acesso por e-mail.
  isca: { endpoint: "/api/isca" },

  garantiaDias: 7,                 // mínimo legal (art. 49 do CDC)
  acessoAte: null,                 // ex.: "10/02/2027". null oculta a frase.

  contato: {
    whatsapp: null,                // só números com DDI, ex.: "5561999999999"
    email: null                    // ex.: "contato@revisando.com.br"
  },

  instagram: "tiagoalves_ofc"
};
