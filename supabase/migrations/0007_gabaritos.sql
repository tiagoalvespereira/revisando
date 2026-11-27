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
