-- USE MAVIÊ: banco da loja. Rode uma vez no Supabase (SQL Editor > New query > Run).
-- Depois: crie o usuário painel@usemavie.com.br em Authentication > Users (Auto Confirm) com a senha do painel.

-- Catálogo público (a loja lê). Uma linha só; "version" evita que dois aparelhos sobrescrevam um ao outro.
create table if not exists public.store_state (
  id int primary key default 1 check (id = 1),
  catalog jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

-- Dados privados do painel: pedidos (com nome e telefone de clientes) e movimentações de estoque.
create table if not exists public.admin_state (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{"orders": [], "movements": [], "nextOrder": 1001}'
);

-- Quem pode mexer no painel.
create table if not exists public.admins (email text primary key);

alter table public.store_state enable row level security;
alter table public.admin_state enable row level security;
alter table public.admins enable row level security; -- sem políticas: ninguém lê pela API

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = lower(auth.jwt() ->> 'email'));
$$;

drop policy if exists "loja lê catálogo" on public.store_state;
create policy "loja lê catálogo" on public.store_state for select to anon, authenticated using (true);
drop policy if exists "admin altera catálogo" on public.store_state;
create policy "admin altera catálogo" on public.store_state for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin lê dados" on public.admin_state;
create policy "admin lê dados" on public.admin_state for select to authenticated using (public.is_admin());
drop policy if exists "admin altera dados" on public.admin_state;
create policy "admin altera dados" on public.admin_state for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Salva catálogo + dados do painel juntos (tudo ou nada). Falha se outro aparelho salvou antes.
create or replace function public.save_state(p_catalog jsonb, p_admin jsonb, p_version int) returns int
language plpgsql security invoker set search_path = public as $$
declare v int;
begin
  if not public.is_admin() then raise exception 'sem permissão' using errcode = '42501'; end if;
  update public.store_state set catalog = p_catalog, version = version + 1, updated_at = now()
    where id = 1 and version = p_version returning version into v;
  if v is null then raise exception 'conflito' using errcode = '40001'; end if;
  update public.admin_state set data = p_admin where id = 1;
  return v;
end $$;
revoke execute on function public.save_state(jsonb, jsonb, int) from anon;

-- Avisa a loja em tempo real quando o catálogo muda.
do $$ begin
  alter publication supabase_realtime add table public.store_state;
exception when duplicate_object then null; end $$;

-- Fotos dos produtos: leitura pública, envio só por admin.
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true) on conflict (id) do nothing;
drop policy if exists "admin envia fotos" on storage.objects;
create policy "admin envia fotos" on storage.objects for insert to authenticated with check (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "admin troca fotos" on storage.objects;
create policy "admin troca fotos" on storage.objects for update to authenticated using (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "admin apaga fotos" on storage.objects;
create policy "admin apaga fotos" on storage.objects for delete to authenticated using (bucket_id = 'produtos' and public.is_admin());

-- Dados iniciais (catálogo atual do site).
insert into public.store_state (id, catalog) values (1, $catalog${"categories":["Vestidos curtos","Vestidos longos","Conjuntos","Tops e bodies"],"products":[{"id":"longo-fenda-preto","name":"Vestido Longo Fenda Noir","category":"Vestidos longos","price":189.9,"image":"images/longo-fenda-preto.jpg","stock":{"P":1,"M":2,"G":1},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Longo Fenda","gallery":[],"focus":[40,25]},{"id":"babado-marrom","name":"Vestido Babado Cacau","category":"Vestidos curtos","price":149.9,"image":"images/babado-marrom.jpg","stock":{"P":1,"M":1,"G":1},"hidden":false,"color":"Cacau","colorHex":"#6b4532","model":"Vestido Babado","gallery":[],"focus":[52,15]},{"id":"recorte-azul","name":"Vestido Recorte Céu","category":"Vestidos longos","price":179.9,"image":"images/recorte-azul.jpg","stock":{"P":2,"M":2,"G":1},"hidden":false,"color":"Céu","colorHex":"#a9c8ec","model":"Vestido Recorte","gallery":[],"focus":[47,9]},{"id":"corset-marrom","name":"Corset Cacau","category":"Tops e bodies","price":119.9,"image":"images/corset-marrom.jpg","stock":{"P":1,"M":1,"G":0},"hidden":false,"color":"Cacau","colorHex":"#6b4532","model":"Corset","gallery":[],"focus":[43,31]},{"id":"costas-nuas-preto","name":"Vestido Costas Nuas","category":"Vestidos longos","price":189.9,"image":"images/costas-nuas-preto.jpg","stock":{"P":1,"M":1,"G":1},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Costas Nuas","gallery":[],"focus":[22,10]},{"id":"alcinha-preto","name":"Vestido Alcinha Noir","category":"Vestidos curtos","price":129.9,"image":"images/alcinha-preto.jpg","stock":{"P":2,"M":2,"G":2},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Alcinha","gallery":[],"focus":[47,7]},{"id":"midi-vinho","name":"Vestido Midi Bordô","category":"Vestidos longos","price":169.9,"image":"images/midi-vinho.jpg","stock":{"P":1,"M":2,"G":1},"hidden":false,"color":"Bordô","colorHex":"#6d1f2e","model":"Vestido Midi","gallery":[],"focus":[49,13]},{"id":"conjunto-recorte-preto","name":"Conjunto Recorte Noir","category":"Conjuntos","price":159.9,"image":"images/conjunto-recorte-preto.jpg","stock":{"P":1,"M":1,"G":1},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Conjunto Recorte","gallery":[],"focus":[44,12]},{"id":"body-renda-branco","name":"Body Renda Pérola","category":"Tops e bodies","price":99.9,"image":"images/body-renda-branco.jpg","stock":{"P":2,"M":2,"G":1},"hidden":false,"color":"Pérola","colorHex":"#efe8df","model":"Body Renda","gallery":[],"focus":[53,10]},{"id":"amarracao-preto","name":"Vestido Amarração","category":"Vestidos curtos","price":139.9,"image":"images/amarracao-preto.jpg","stock":{"P":0,"M":0,"G":0},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Amarração","gallery":[],"focus":[47,21]},{"id":"longo-azul","name":"Vestido Longo Decote Céu","category":"Vestidos longos","price":179.9,"image":"images/longo-azul.jpg","stock":{"P":1,"M":2,"G":1},"hidden":false,"color":"Céu","colorHex":"#a9c8ec","model":"Vestido Longo Decote","gallery":[],"focus":[48,13]},{"id":"drapeado-preto","name":"Vestido Drapeado Manga Longa","category":"Vestidos curtos","price":149.9,"image":"images/drapeado-preto.jpg","stock":{"P":1,"M":1,"G":0},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Drapeado Manga Longa","gallery":[],"focus":[53,28]},{"id":"conjunto-vinho","name":"Conjunto Saia Bordô","category":"Conjuntos","price":159.9,"image":"images/conjunto-vinho.jpg","stock":{"P":1,"M":1,"G":1},"hidden":false,"color":"Bordô","colorHex":"#6d1f2e","model":"Conjunto Saia","gallery":[],"focus":[50,30]},{"id":"um-ombro-preto","name":"Vestido Um Ombro Fenda","category":"Vestidos longos","price":189.9,"image":"images/um-ombro-preto.jpg","stock":{"P":0,"M":1,"G":0},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Um Ombro Fenda","gallery":[],"focus":[63,10]},{"id":"alcinha-marrom","name":"Vestido Alcinha Cacau","category":"Vestidos curtos","price":129.9,"image":"images/alcinha-marrom.jpg","stock":{"P":1,"M":2,"G":1},"hidden":false,"color":"Cacau","colorHex":"#6b4532","model":"Vestido Alcinha","gallery":[],"focus":[35,13]},{"id":"decote-v-preto","name":"Vestido Longo Decote V","category":"Vestidos longos","price":169.9,"image":"images/decote-v-preto.jpg","stock":{"P":2,"M":2,"G":1},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Longo Decote V","gallery":[],"focus":[37,12]},{"id":"conjunto-longo-preto","name":"Conjunto Saia Longa Noir","category":"Conjuntos","price":169.9,"image":"images/conjunto-longo-preto.jpg","stock":{"P":1,"M":1,"G":1},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Conjunto Saia Longa","gallery":[],"focus":[49,14]},{"id":"renda-preto","name":"Vestido Barra de Renda","category":"Vestidos curtos","price":149.9,"image":"images/renda-preto.jpg","stock":{"P":1,"M":2,"G":1},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Barra de Renda","gallery":[],"focus":[50,7]},{"id":"longo-vinho","name":"Vestido Longo Bordô","category":"Vestidos longos","price":179.9,"image":"images/longo-vinho.jpg","stock":{"P":1,"M":1,"G":0},"hidden":false,"color":"Bordô","colorHex":"#6d1f2e","model":"Vestido Longo","gallery":[],"focus":[45,12]},{"id":"godet-preto","name":"Vestido Godê Noir","category":"Vestidos curtos","price":129.9,"image":"images/godet-preto.jpg","stock":{"P":2,"M":2,"G":1},"hidden":false,"color":"Noir","colorHex":"#1c1719","model":"Vestido Godê","gallery":[],"focus":[47,18]},{"id":"recorte-branco-azul","name":"Vestido Recorte Bicolor","category":"Vestidos longos","price":179.9,"image":"images/recorte-branco-azul.jpg","stock":{"P":1,"M":1,"G":1},"hidden":false,"color":"Bicolor","colorHex":"#cfe0f3","model":"Vestido Recorte","gallery":[],"focus":[30,34]},{"id":"longo-fenda-marinho","name":"Vestido Longo Fenda Marinho","category":"Vestidos longos","price":189.9,"image":"images/longo-fenda-marinho.jpg","stock":{"P":1,"M":1,"G":0},"hidden":false,"color":"Marinho","colorHex":"#1f2a44","model":"Vestido Longo Fenda","gallery":[],"focus":[50,30]}],"updatedAt":"2026-10-01T00:00:00.000Z"}$catalog$::jsonb) on conflict (id) do nothing;
insert into public.admin_state (id) values (1) on conflict (id) do nothing;

-- Quem entra no painel (mesmo e-mail de ADMIN_EMAIL em app/supabase.ts).
insert into public.admins (email) values ('painel@usemavie.com.br') on conflict do nothing;
