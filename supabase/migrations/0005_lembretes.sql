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
