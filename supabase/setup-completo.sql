-- Revisando: preparação completa do banco (gerado de supabase/migrations + seed.sql).
-- Supabase > SQL Editor > New query > cole tudo > Run. Rode uma única vez num projeto novo.

-- ===== supabase/migrations/0001_init.sql =====
-- Revisando: esquema inicial
-- Rode no SQL Editor do Supabase (ou `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- perfis
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text not null,
  cpf text,
  telefone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------- produtos
-- vitrine: 'venda'   = aparece bloqueado com botão de compra para quem não tem
--          'em_breve'= aparece bloqueado com selo "em breve"
--          'oculto'  = só aparece para quem tem acesso
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  icone text not null default 'livro',      -- livro | calendario | alvo | balanca | raio | trofeu | documento
  preco_centavos integer,
  checkout_url text,                          -- link do checkout Kiwify (upsell na área do aluno)
  acesso_ate date,                            -- data-limite de acesso; null = sem prazo
  vitrine text not null default 'venda' check (vitrine in ('venda','em_breve','oculto')),
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Um produto da Kiwify pode liberar 1 ou mais produtos do sistema (ex.: combo 30 + 15).
create table public.kiwify_products (
  kiwify_product_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (kiwify_product_id, product_id)
);

create table public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  titulo text not null,
  storage_path text not null,                 -- caminho no bucket privado "materiais"
  tipo text not null check (tipo in ('volume','dia','caderno','simulado','cronograma','isca')),
  dia integer,                                -- para tipo = 'dia'
  ordem integer not null default 0,
  atualizado_em timestamptz not null default now()
);
create index product_files_product_idx on public.product_files (product_id, ordem);

-- ---------------------------------------------------------------- vendas e acesso
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kiwify_product_id text,
  gateway text not null default 'kiwify',
  gateway_id text not null,
  status text not null check (status in ('pending','paid','refunded','chargeback','refused')),
  valor_centavos integer,
  metodo text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gateway, gateway_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  origem text not null check (origem in ('compra','manual','isca')),
  order_id uuid references public.orders(id) on delete set null,
  valido_ate timestamptz,
  revogado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null,
  dia integer not null,
  concluido_em timestamptz not null default now(),
  primary key (user_id, product_slug, dia)
);

create table public.simulado_respostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  simulado integer not null,
  respostas jsonb not null,
  acertos integer not null,
  por_materia jsonb not null,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  consentimento_lgpd boolean not null,
  origem text not null default 'isca-3-dias',
  created_at timestamptz not null default now()
);
create index leads_email_idx on public.leads (lower(email));

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  event_id text not null,
  payload jsonb not null,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  erro text,
  unique (gateway, event_id)
);

-- ---------------------------------------------------------------- funções
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.has_access(p_product uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = auth.uid() and e.product_id = p_product
      and e.revogado_em is null
      and (e.valido_ate is null or e.valido_ate > now())
  );
$$;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.kiwify_products enable row level security;
alter table public.product_files enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.progress enable row level security;
alter table public.simulado_respostas enable row level security;
alter table public.leads enable row level security;
alter table public.webhook_events enable row level security;

-- O aluno vê e edita só o próprio perfil (sem poder virar admin: ver trigger abaixo).
create policy "perfil: ler o próprio" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "perfil: editar o próprio" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Vitrine é pública (a landing e a área do aluno mostram os produtos).
create policy "produtos: ler ativos" on public.products for select using (ativo or public.is_admin());

-- Arquivos: só os metadados de produtos que o aluno tem. O PDF em si só sai por URL assinada do servidor.
create policy "arquivos: ler se tiver acesso" on public.product_files for select
  using (public.has_access(product_id) or public.is_admin());

create policy "pedidos: ler os próprios" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "acessos: ler os próprios" on public.entitlements for select using (user_id = auth.uid() or public.is_admin());

create policy "progresso: tudo no próprio" on public.progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "simulado: tudo no próprio" on public.simulado_respostas for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- leads, webhook_events e kiwify_products: sem políticas = só o service role (servidor) acessa.

-- Impede que o aluno altere is_admin ou e-mail pelo cliente.
create or replace function public.protege_profile() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger protege_profile before update on public.profiles
  for each row execute function public.protege_profile();

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('materiais', 'materiais', false)
on conflict (id) do update set public = false;
-- Nenhuma política em storage.objects para este bucket: só o servidor (service role) lê e grava.

-- ---------------------------------------------------------------- rate limit do login
create table public.login_tentativas (
  id bigint generated always as identity primary key,
  chave text not null,               -- 'email:...' ou 'ip:...'
  criado_em timestamptz not null default now()
);
create index login_tentativas_idx on public.login_tentativas (chave, criado_em desc);
alter table public.login_tentativas enable row level security;

-- ===== supabase/migrations/0002_sessoes.sql =====
-- Limite de dispositivos simultâneos por aluno.
create table public.sessoes (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dispositivo text,
  criado_em timestamptz not null default now(),
  revogada_em timestamptz
);
create index sessoes_user_idx on public.sessoes (user_id, criado_em desc);
alter table public.sessoes enable row level security;
-- Sem políticas: só o servidor (service role) lê e grava.

-- ===== supabase/migrations/0003_leads_whatsapp.sql =====
-- Isca por WhatsApp: o lead deixa nome + WhatsApp e recebe a Revisão de 3 dias no WhatsApp.
alter table public.leads alter column email drop not null;
alter table public.leads add column if not exists whatsapp text;
alter table public.leads add column if not exists envio text not null default 'pendente'
  check (envio in ('pendente', 'enviado', 'falhou', 'manual'));
alter table public.leads add column if not exists envio_erro text;
alter table public.leads add column if not exists contatado_em timestamptz;
create index if not exists leads_whatsapp_idx on public.leads (whatsapp);

-- ===== supabase/seed.sql =====
-- Produtos e arquivos iniciais. Preços: 30 dias R$ 147, 15 dias R$ 97 (editáveis no /admin).
-- acesso_ate: sugestão do briefing (30 dias depois da prova). Ajuste no /admin.

insert into public.products (slug, nome, descricao, icone, preco_centavos, acesso_ate, vitrine, ordem) values
  ('30-dias', 'Revisão estratégica de 30 dias', 'Volume completo, os 30 dias separados, 2 simulados e cronogramas.', 'livro', 14700, '2027-02-10', 'venda', 1),
  ('15-dias', 'Revisão estratégica de 15 dias', 'Caderno estratégico de 15 dias, 2 simulados e cronograma.', 'raio', 9700, '2027-02-10', 'venda', 2),
  ('3-dias',  'Revisão de 3 dias estratégica', 'Amostra estratégica: os temas que a FGV mais cobra, um por matéria, em 3 dias, para estudar quando quiser.', 'alvo', 0, '2027-02-10', 'oculto', 9)
on conflict (slug) do nothing;

-- Arquivos do plano de 30 dias
with p as (select id from public.products where slug = '30-dias')
insert into public.product_files (product_id, titulo, storage_path, tipo, dia, ordem)
select p.id, v.titulo, v.path, v.tipo, v.dia, v.ordem from p, (values
  ('Volume completo', '30-dias/volume-completo.pdf', 'volume', null::int, 0),
  ('Simulado Estratégico 1 (20 dias antes)', 'comum/simulado-1.pdf', 'simulado', null, 40),
  ('Simulado Estratégico 2 (7 dias antes)', 'comum/simulado-2.pdf', 'simulado', null, 41),
  ('Cronograma estratégico de 30 dias', '30-dias/cronograma-30-dias.pdf', 'cronograma', null, 50),
  ('Cronograma em branco', '30-dias/cronograma-em-branco.pdf', 'cronograma', null, 51),
  ('Cronograma calendário (prova 10/01/2027)', '30-dias/cronograma-calendario.pdf', 'cronograma', null, 52)
) as v(titulo, path, tipo, dia, ordem);

with p as (select id from public.products where slug = '30-dias')
insert into public.product_files (product_id, titulo, storage_path, tipo, dia, ordem)
select p.id, 'Dia ' || lpad(d::text, 2, '0'), '30-dias/dias/dia-' || lpad(d::text, 2, '0') || '.pdf', 'dia', d, d
from p, generate_series(1, 30) d;

-- Arquivos do plano de 15 dias
with p as (select id from public.products where slug = '15-dias')
insert into public.product_files (product_id, titulo, storage_path, tipo, dia, ordem)
select p.id, v.titulo, v.path, v.tipo, null, v.ordem from p, (values
  ('Caderno estratégico de 15 dias', '15-dias/caderno-15-dias.pdf', 'caderno', 0),
  ('Simulado Estratégico 1 (20 dias antes)', 'comum/simulado-1.pdf', 'simulado', 40),
  ('Simulado Estratégico 2 (7 dias antes)', 'comum/simulado-2.pdf', 'simulado', 41),
  ('Cronograma estratégico de 15 dias', '15-dias/cronograma-15-dias.pdf', 'cronograma', 50)
) as v(titulo, path, tipo, ordem);

-- Isca
with p as (select id from public.products where slug = '3-dias')
insert into public.product_files (product_id, titulo, storage_path, tipo, ordem)
select p.id, 'Revisão de 3 dias estratégica', '3-dias/revisao-3-dias.pdf', 'isca', 0 from p;

-- Depois de criar os produtos na Kiwify, ligue o ID de cada um (Kiwify > Produto > ID) aqui:
-- insert into public.kiwify_products values ('ID_KIWIFY_30', (select id from products where slug='30-dias'));
-- insert into public.kiwify_products values ('ID_KIWIFY_15', (select id from products where slug='15-dias'));
-- Combo: duas linhas com o mesmo ID da Kiwify, uma para cada produto.

-- ===== supabase/migrations/0004_simulados.sql =====
-- Simulados Estratégicos como produto próprio, com regra de acesso:
--   Revisão de 30 dias  -> Simulado 1 e Simulado 2
--   Revisão de 15 dias  -> só o Simulado 2
--   Produto "simulados" (venda avulsa ou liberação manual) -> os dois

-- 1. Produto
insert into public.products (slug, nome, descricao, icone, acesso_ate, vitrine, ordem)
values ('simulados', 'Simulados Estratégicos', 'Simulado 1 (20 dias antes) e Simulado 2 (7 dias antes), 80 questões cada, com cartão-resposta online.', 'alvo', '2027-02-10', 'oculto', 3)
on conflict (slug) do nothing;

-- 2. Arquivos de simulado passam a ter o número do simulado
alter table public.product_files add column if not exists simulado smallint check (simulado in (1, 2));

-- Os PDFs saem dos planos de 30 e 15 dias e ficam só no produto "simulados"
-- (mesmo caminho no storage: o que já foi enviado continua valendo).
delete from public.product_files
where tipo = 'simulado' and product_id in (select id from public.products where slug in ('30-dias', '15-dias'));

insert into public.product_files (product_id, titulo, storage_path, tipo, simulado, ordem)
select p.id, v.titulo, v.caminho, 'simulado', v.n, v.n
from public.products p, (values
  ('Simulado Estratégico 1 (20 dias antes)', 'comum/simulado-1.pdf', 1),
  ('Simulado Estratégico 2 (7 dias antes)', 'comum/simulado-2.pdf', 2)
) as v(titulo, caminho, n)
where p.slug = 'simulados'
  and not exists (select 1 from public.product_files f where f.product_id = p.id and f.simulado = v.n);

-- 3. Regra de acesso
create or replace function public.tem_produto(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.products p where p.slug = p_slug and public.has_access(p.id));
$$;

create or replace function public.pode_ver_simulado(n int) returns boolean
language sql stable security definer set search_path = public as $$
  select public.tem_produto('simulados')
      or public.tem_produto('30-dias')
      or (n = 2 and public.tem_produto('15-dias'));
$$;

drop policy if exists "arquivos: ler se tiver acesso" on public.product_files;
create policy "arquivos: ler se tiver acesso" on public.product_files for select
  using (
    public.has_access(product_id)
    or (simulado is not null and public.pode_ver_simulado(simulado))
    or public.is_admin()
  );

-- ===== supabase/migrations/0005_lembretes.sql =====
-- Lembretes diários de estudo (WhatsApp e e-mail), no horário escolhido pelo aluno.

create table if not exists public.lembretes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ativo boolean not null default true,
  hora smallint not null default 7 check (hora between 0 and 23),   -- horário de Brasília
  por_whatsapp boolean not null default true,
  por_email boolean not null default true,
  whatsapp text,                                                     -- 55 + DDD + número
  consentimento_em timestamptz not null default now(),
  ultimo_envio date,                                                 -- evita enviar duas vezes no mesmo dia
  ultimo_erro text,
  atualizado_em timestamptz not null default now()
);
create index if not exists lembretes_hora_idx on public.lembretes (hora) where ativo;

alter table public.lembretes enable row level security;

drop policy if exists "lembretes: o próprio aluno" on public.lembretes;
create policy "lembretes: o próprio aluno" on public.lembretes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "lembretes: admin lê" on public.lembretes;
create policy "lembretes: admin lê" on public.lembretes for select using (public.is_admin());

-- ===== supabase/migrations/0006_configuracoes.sql =====
-- Configurações editáveis no Admin (ex.: datas das provas). Só o servidor lê e grava.
create table if not exists public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.configuracoes enable row level security;

-- Datas da 1ª fase (horário de Brasília). O sistema usa sempre a próxima que ainda não passou.
insert into public.configuracoes (chave, valor)
values ('datas_prova', '["2027-01-10T13:00:00-03:00"]'::jsonb)
on conflict (chave) do nothing;

-- ===== supabase/migrations/0007_gabaritos.sql =====
-- Cada simulado passa a ter 2 PDFs: o caderno de questões (para resolver) e o gabarito comentado (após corrigir).
update public.product_files
set titulo = 'Simulado Estratégico ' || simulado || ' · Caderno de questões (' || case simulado when 1 then '20' else '7' end || ' dias antes)'
where tipo = 'simulado' and storage_path in ('comum/simulado-1.pdf', 'comum/simulado-2.pdf');

insert into public.product_files (product_id, titulo, storage_path, tipo, simulado, ordem)
select p.id, v.titulo, v.caminho, 'simulado', v.n, 10 + v.n
from public.products p, (values
  ('Simulado Estratégico 1 · Gabarito comentado', 'comum/simulado-1-gabarito.pdf', 1),
  ('Simulado Estratégico 2 · Gabarito comentado', 'comum/simulado-2-gabarito.pdf', 2)
) as v(titulo, caminho, n)
where p.slug = 'simulados'
  and not exists (select 1 from public.product_files f where f.storage_path = v.caminho);

-- ===== Primeiro administrador =====
-- Depois de rodar este arquivo: Authentication > Users > Add user > Create new user
-- (seu e-mail + senha, marque "Auto Confirm User"). Depois rode, trocando o e-mail:
--   insert into public.profiles (id, email, nome, is_admin)
--   select id, email, 'Tiago Alves Pereira', true from auth.users where email = 'SEU_EMAIL'
--   on conflict (id) do update set is_admin = true;
