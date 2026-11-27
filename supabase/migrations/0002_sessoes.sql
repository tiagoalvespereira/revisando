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
