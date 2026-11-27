-- Produtos e arquivos iniciais. Preços: 30 dias R$ 147, 15 dias R$ 97 (editáveis no /admin).
-- acesso_ate: sugestão do briefing (30 dias depois da prova). Ajuste no /admin.

insert into public.products (slug, nome, descricao, icone, preco_centavos, acesso_ate, vitrine, ordem) values
  ('30-dias', 'Revisão estratégica de 30 dias', 'Volume completo, os 30 dias separados, 2 simulados e cronogramas.', 'livro', 14700, '2027-02-10', 'venda', 1),
  ('15-dias', 'Revisão estratégica de 15 dias', 'Caderno estratégico de 15 dias, 2 simulados e cronograma.', 'raio', 9700, '2027-02-10', 'venda', 2),
  ('3-dias',  'Revisão de 3 dias estratégica', 'Amostra grátis do método.', 'alvo', 0, '2027-02-10', 'oculto', 9)
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
