-- Статус "в пути на другое ЛО" и заявки на приёмку между базами

alter type equipment_status add value if not exists 'in_transit';

alter table transfers add column dest_base_id text references bases(id);
alter table transfers add column status text not null default 'accepted'
  check (status in ('pending', 'accepted'));
alter table transfer_items add column accepted_at timestamptz;

-- Полная очистка базы (с историей). Вызывается только из других функций, наружу не открыта.
create or replace function _purge_base(p_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- товары, которые ехали в эту базу, возвращаются на отправителя
  update equipment_items set status = 'in_stock'
  where id in (
    select ti.equipment_item_id
    from transfer_items ti
    join transfers t on t.id = ti.transfer_id
    where t.dest_base_id = p_id and t.status = 'pending' and ti.accepted_at is null
  );
  delete from transfers where dest_base_id = p_id;
  delete from equipment_items where base_id = p_id;
  delete from employees where base_id = p_id;
  delete from repairs where base_id = p_id;
  delete from transfers where base_id = p_id;
  delete from inventories where base_id = p_id;
  delete from bases where id = p_id;
end;
$$;

revoke execute on function _purge_base(text) from public, anon;

create or replace function delete_base(p_id text, p_delete_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_delete_code is distinct from '11235813' then
    raise exception 'Неверный код удаления';
  end if;
  perform _purge_base(p_id);
end;
$$;

create or replace function set_base_code(p_id text, p_delete_code text, p_new_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_delete_code is distinct from '11235813' then
    raise exception 'Неверный код удаления';
  end if;
  if p_new_code is null or length(p_new_code) < 4 then
    raise exception 'Код должен быть не короче 4 символов';
  end if;
  update bases set code_hash = crypt(p_new_code, gen_salt('bf')) where id = p_id;
  if not found then
    raise exception 'База не найдена';
  end if;
end;
$$;

create or replace function list_bases()
returns table(id text, name text)
language sql
security definer
set search_path = public
as $$
  select b.id, b.name from bases b order by b.name;
$$;

grant execute on function delete_base(text, text) to anon;
grant execute on function set_base_code(text, text, text) to anon;
grant execute on function list_bases() to anon;

-- Переезд: все базы кроме основной удаляем полностью, основную переименовываем в «СЦ Самара» (id 117230)
do $$
declare
  r record;
begin
  for r in select id from bases where id <> 'default' loop
    perform _purge_base(r.id);
  end loop;
end $$;

insert into bases (id, name, code_hash)
values ('117230', 'СЦ Самара', crypt('11235813', gen_salt('bf')));

update equipment_items set base_id = '117230' where base_id = 'default';
update employees set base_id = '117230' where base_id = 'default';
update issuances set base_id = '117230' where base_id = 'default';
update defects set base_id = '117230' where base_id = 'default';
update repairs set base_id = '117230' where base_id = 'default';
update transfers set base_id = '117230' where base_id = 'default';
update inventories set base_id = '117230' where base_id = 'default';

delete from bases where id = 'default';

alter table equipment_items alter column base_id set default '117230';
alter table employees alter column base_id set default '117230';
alter table issuances alter column base_id set default '117230';
alter table defects alter column base_id set default '117230';
alter table repairs alter column base_id set default '117230';
alter table transfers alter column base_id set default '117230';
alter table inventories alter column base_id set default '117230';

notify pgrst, 'reload schema';
