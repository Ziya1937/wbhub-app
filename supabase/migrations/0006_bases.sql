-- Мультибаза: каждая "база" — отдельный изолированный склад (ЛО).
-- Виды оборудования и МХ остаются общим справочником для всех баз.

create table bases (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{3,32}$'),
  name text not null,
  code_hash text not null,
  created_at timestamptz not null default now()
);
alter table bases enable row level security;
-- Никакого anon-доступа к самой таблице напрямую — только через RPC ниже
-- (иначе код/список баз можно было бы прочитать в обход экрана входа).

-- Существующие данные переносим в базу по умолчанию, код = текущий код удаления в приложении.
insert into bases (id, name, code_hash)
values ('default', 'Основная база', crypt('11235813', gen_salt('bf')));

alter table equipment_items add column base_id text references bases(id);
update equipment_items set base_id = 'default';
alter table equipment_items alter column base_id set not null;
create index on equipment_items (base_id);

alter table employees add column base_id text references bases(id);
update employees set base_id = 'default';
alter table employees alter column base_id set not null;
alter table employees drop constraint employees_badge_code_key;
alter table employees add constraint employees_badge_code_base_unique unique (badge_code, base_id);
create index on employees (base_id);

alter table issuances add column base_id text references bases(id);
update issuances set base_id = 'default';
alter table issuances alter column base_id set not null;
create index on issuances (base_id);

alter table defects add column base_id text references bases(id);
update defects set base_id = 'default';
alter table defects alter column base_id set not null;
create index on defects (base_id);

alter table repairs add column base_id text references bases(id);
update repairs set base_id = 'default';
alter table repairs alter column base_id set not null;
create index on repairs (base_id);

alter table transfers add column base_id text references bases(id);
update transfers set base_id = 'default';
alter table transfers alter column base_id set not null;
create index on transfers (base_id);

alter table inventories add column base_id text references bases(id);
update inventories set base_id = 'default';
alter table inventories alter column base_id set not null;
create index on inventories (base_id);

-- Создание базы: хеширует код, проверяет формат/длину.
create or replace function create_base(p_id text, p_name text, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Укажите название базы';
  end if;
  if p_code is null or length(p_code) < 4 then
    raise exception 'Код должен быть не короче 4 символов';
  end if;
  insert into bases (id, name, code_hash)
  values (p_id, trim(p_name), crypt(p_code, gen_salt('bf')));
end;
$$;

-- Проверка входа: сверяет код с хешем, ничего не раскрывает наружу.
create or replace function verify_base(p_id text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored text;
begin
  select code_hash into stored from bases where id = p_id;
  if stored is null then
    return false;
  end if;
  return stored = crypt(p_code, stored);
end;
$$;

-- Название базы по id (для шапки/бургер-меню) — без кода, не секрет.
create or replace function base_name(p_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select name from bases where id = p_id;
$$;

-- Сводка по всем базам: только агрегированные числа, без деталей по оборудованию.
create or replace function aggregate_counts()
returns table(base_id text, base_name text, type_name text, total bigint)
language sql
security definer
set search_path = public
as $$
  select b.id, b.name, coalesce(et.name, '—'), count(ei.id)
  from bases b
  left join equipment_items ei on ei.base_id = b.id
  left join equipment_models em on em.id = ei.model_id
  left join equipment_types et on et.id = em.type_id
  group by b.id, b.name, et.name
  order by b.name, et.name;
$$;

grant execute on function create_base(text, text, text) to anon;
grant execute on function verify_base(text, text) to anon;
grant execute on function base_name(text) to anon;
grant execute on function aggregate_counts() to anon;
