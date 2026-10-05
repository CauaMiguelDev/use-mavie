-- USE MAVIÊ: proteção dos dados. Rode uma vez no Supabase (SQL Editor > New query > Run), depois do setup.sql.
-- Pode rodar de novo sem risco: não altera peças, pedidos nem fotos.
--
-- 1. Cópia de segurança automática: toda vez que o painel salva, a versão anterior vai para store_history.
-- 2. Bloqueia salvar um catálogo vazio por engano.
-- 3. Ninguém apaga as linhas do catálogo e dos pedidos (nem pela API, nem por engano no SQL Editor).
-- 4. Fotos enviadas não podem ser apagadas nem substituídas pela API.

create table if not exists public.store_history (
  id bigserial primary key,
  saved_at timestamptz not null default now(),
  version int,
  catalog jsonb, -- versão anterior do catálogo (peças, categorias, vitrine)
  admin jsonb    -- versão anterior dos pedidos e movimentações
);
alter table public.store_history enable row level security; -- sem políticas: só visível aqui no Supabase

create or replace function public.keep_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'store_state' then
    if jsonb_array_length(coalesce(new.catalog -> 'products', '[]')) = 0
       and jsonb_array_length(coalesce(old.catalog -> 'products', '[]')) > 0 then
      raise exception 'Catálogo vazio bloqueado: as peças não foram apagadas.' using errcode = '23514';
    end if;
    insert into store_history (version, catalog) values (old.version, old.catalog);
  else
    insert into store_history (admin) values (old.data);
  end if;
  -- Guarda 180 dias, e nunca menos que as 300 cópias mais recentes.
  delete from store_history
    where saved_at < now() - interval '180 days'
      and id < (select min(id) from (select id from store_history order by id desc limit 300) recent);
  return new;
end $$;

create or replace function public.block_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Os dados da loja não podem ser apagados.' using errcode = '42501';
end $$;

drop trigger if exists keep_history on public.store_state;
create trigger keep_history before update on public.store_state for each row execute function public.keep_history();
drop trigger if exists keep_history on public.admin_state;
create trigger keep_history before update on public.admin_state for each row execute function public.keep_history();

drop trigger if exists block_delete on public.store_state;
create trigger block_delete before delete on public.store_state for each row execute function public.block_delete();
drop trigger if exists block_truncate on public.store_state;
create trigger block_truncate before truncate on public.store_state for each statement execute function public.block_delete();
drop trigger if exists block_delete on public.admin_state;
create trigger block_delete before delete on public.admin_state for each row execute function public.block_delete();
drop trigger if exists block_truncate on public.admin_state;
create trigger block_truncate before truncate on public.admin_state for each statement execute function public.block_delete();

-- O painel só envia fotos novas (nome único); trocar ou apagar fica desligado.
drop policy if exists "admin troca fotos" on storage.objects;
drop policy if exists "admin apaga fotos" on storage.objects;

-- Para voltar uma versão (só se precisar): veja as cópias com
--   select id, saved_at, version, jsonb_array_length(catalog -> 'products') as pecas from store_history where catalog is not null order by id desc;
-- e restaure a escolhida (troque 123 pelo id):
--   update store_state set catalog = (select catalog from store_history where id = 123), version = version + 1 where id = 1;
