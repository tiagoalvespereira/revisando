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
