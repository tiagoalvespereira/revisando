# Revisando: área do aluno

Landing de vendas + área do aluno com login, leitor de PDF, download com marca d'água e painel do administrador.
A **Kiwify só faz o checkout**: cada pagamento chega por webhook e o sistema cria o aluno, libera o produto e envia o e-mail para criar a senha.

Stack: Next.js 15 (App Router) + Tailwind + Supabase (Auth, Postgres, Storage privado) + Resend. Deploy na Vercel.

## Como funciona

| Evento na Kiwify | O que o sistema faz |
|---|---|
| Compra aprovada | Cria o aluno (se não existir) com o e-mail da compra, libera o(s) produto(s) ligados ao ID da Kiwify e envia o e-mail "Criar minha senha" |
| Reembolso ou chargeback | Revoga o acesso que veio daquela compra |
| Pix/boleto gerado, recusado | Só registra o pedido |

- O webhook confere a assinatura (`?signature=`, HMAC-SHA1 com o token) e é idempotente: o mesmo evento chegando duas vezes não duplica nada.
- Produtos que o aluno não tem aparecem **bloqueados com cadeado** no painel, com o botão "Desbloquear" levando ao checkout da Kiwify (com o e-mail já preenchido). Isso é configurado por produto no `/admin`.
- Os PDFs ficam num bucket privado. O leitor busca trechos do arquivo por uma rota que confere login e acesso a cada pedido; a URL do storage nunca chega ao navegador.
- O download gera o PDF com marca d'água (nome, CPF mascarado ou e-mail e data) em todas as páginas, além do aviso da Lei 9.610/98.

## Configuração (uma vez)

1. **Supabase**: crie o projeto. No SQL Editor, rode em ordem os arquivos de `supabase/migrations/` (0001, 0002, 0003) e depois `supabase/seed.sql`.
   - Authentication > URL Configuration: em *Site URL*, coloque o domínio do site.
   - Authentication > Rate Limits: o login roda no servidor, então todas as tentativas saem do IP da Vercel. Aumente o limite de sign-in (o sistema já tem limite próprio por e-mail e por IP).
2. **Variáveis**: copie `.env.example` para `.env.local` e preencha. Na Vercel, cadastre as mesmas variáveis.
3. **Resend**: crie a conta, verifique o domínio e preencha `RESEND_API_KEY` e `EMAIL_FROM`. Sem a chave, os links de acesso aparecem só no log do servidor.
4. **Deploy na Vercel**: importe o repositório e use o deploy padrão.
5. **Primeiro admin**: entre uma vez com seu e-mail (use "Esqueci minha senha" depois de cadastrar seu usuário em Authentication > Users) e rode:
   `update profiles set is_admin = true where email = 'seu@email';`
   Se o perfil ainda não existir: `insert into profiles (id, email, is_admin) select id, email, true from auth.users where email = 'seu@email';`
6. **Kiwify**:
   - Crie os produtos (30 dias R$ 147, 15 dias R$ 97). Na entrega, deixe uma mensagem dizendo que o acesso chega por e-mail.
   - Apps > Webhooks > criar: URL `https://SEU-DOMINIO/api/webhooks/kiwify`. Eventos: compra aprovada, reembolso e chargeback (Pix/boleto gerado são opcionais). Copie o **token** para `KIWIFY_WEBHOOK_TOKEN`.
   - No `/admin/produtos`, abra cada produto e preencha o **ID do produto na Kiwify** e o **link do checkout**.
   - Em `public/landing/config.js`, coloque os links de checkout (`checkout`), o parcelamento e o contato.
7. **PDFs**: no `/admin/produtos`, use "Enviar PDF" em cada arquivo. O envio vai direto do navegador para o bucket privado. Para trocar de edição, envie de novo: substitui sem mexer nos alunos.

## Revisão grátis de 3 dias (isca por WhatsApp)

O formulário da landing pede nome + WhatsApp + aceite da LGPD e grava o lead. A entrega tem dois modos:

- **Conversa (padrão):** com `WHATSAPP_NUMERO_ATENDIMENTO` preenchido, o lead é levado para o seu WhatsApp com a mensagem "quero receber a Revisão de 3 dias" pronta. Você responde com o PDF (dica: no WhatsApp Business, salve o PDF como resposta rápida).
- **Automático:** preenchendo `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_TEMPLATE_ISCA`, o sistema envia o PDF com marca d'água (nome + WhatsApp) sozinho. Exige número na API oficial da Meta e um modelo de mensagem aprovado, categoria Marketing, idioma pt_BR, com **cabeçalho do tipo Documento** e `{{1}}` (primeiro nome) no corpo. Se o envio falhar, o lead cai no modo conversa.

No `/admin/leads`, cada lead tem o botão **Chamar no WhatsApp**, com a oferta das revisões de 30 e 15 dias já escrita (preço e link de checkout vêm do cadastro de produtos), e "Marcar contatado".

## Dados do cronograma e dos simulados (`dados/`)

- `revisao-30-dias.json` é extraído do PDF do volume: `python3 scripts/extrair-volume.py "Revisando OAB 30 - 2027 - Volume completo.pdf"`. Confere 30 dias, 196 questões e 318 pontos estratégicos. Rode de novo a cada nova edição.
- `revisao-15-dias.json` e os simulados: `python3 scripts/gerar-15-e-simulados.py`. As páginas das questões no volume são calculadas a partir do volume atual.
- `revisao-3-dias.json`: dias e páginas do PDF da revisão de 3 dias.
- **Simulados:** ainda não existem, então `simulado-1.json` e `simulado-2.json` saem com `"exemplo": true` e gabarito fictício. A área do aluno mostra um aviso vermelho enquanto for exemplo. Quando os simulados ficarem prontos, preencha `GABARITO_1`/`GABARITO_2` no script e rode de novo.

## Teste antes de vender

- [ ] Compra de teste na Kiwify: o aluno aparece em `/admin/alunos` com o produto certo e o e-mail chega.
- [ ] Pelo celular: entrar, abrir o volume, ir para a página do Dia 13 e baixar o PDF (conferir a marca d'água).
- [ ] Reembolso de teste: o acesso some do painel do aluno.
- [ ] Cadastro na isca da landing: o lead aparece em `/admin/leads` e o WhatsApp abre (ou o PDF chega, no modo automático).

## Comandos

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes do webhook
npm run typecheck
```

## Próximas etapas (briefing, seção 8)

- Gabarito real dos Simulados Estratégicos 1 e 2.
- Sequência automática de mensagens de venda para os leads (hoje é pelo botão no painel).
- Foto oficial do professor em `public/landing/img/autor-3x4.jpg`.
