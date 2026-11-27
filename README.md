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

1. **Supabase**: crie o projeto. No SQL Editor, rode `supabase/migrations/0001_init.sql` e depois `supabase/seed.sql`.
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

## Teste antes de vender

- [ ] Compra de teste na Kiwify: o aluno aparece em `/admin/alunos` com o produto certo e o e-mail chega.
- [ ] Pelo celular: entrar, abrir o volume, ir para a página do Dia 13 e baixar o PDF (conferir a marca d'água).
- [ ] Reembolso de teste: o acesso some do painel do aluno.
- [ ] Cadastro na isca da landing: chega o e-mail e a Revisão de 3 dias aparece.

## Comandos

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes do webhook
npm run typecheck
```

## Próximas etapas (briefing, seção 8)

- Cronograma interativo com progresso: precisa de `dados/revisao-30-dias.json` e `revisao-15-dias.json`. A tabela `progress` já existe.
- Simulado online com correção por matéria: precisa de `dados/simulado-1.json` e `simulado-2.json`. A tabela `simulado_respostas` já existe.
- Limite de 2 dispositivos simultâneos.
- E-mails de nutrição para os leads da isca.
- Foto do professor em `public/landing/img/autor-3x4.jpg`, ícone em `public/landing/img/icone.svg`, imagem de compartilhamento em `public/landing/img/og.jpg` e logos SVG oficiais.
