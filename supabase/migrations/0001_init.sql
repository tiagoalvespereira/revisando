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
