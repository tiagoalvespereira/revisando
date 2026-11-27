-- Isca por WhatsApp: o lead deixa nome + WhatsApp e recebe a Revisão de 3 dias no WhatsApp.
alter table public.leads alter column email drop not null;
alter table public.leads add column if not exists whatsapp text;
alter table public.leads add column if not exists envio text not null default 'pendente'
  check (envio in ('pendente', 'enviado', 'falhou', 'manual'));
alter table public.leads add column if not exists envio_erro text;
alter table public.leads add column if not exists contatado_em timestamptz;
create index if not exists leads_whatsapp_idx on public.leads (whatsapp);
