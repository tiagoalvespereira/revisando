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
