-- pgcrypto на хостинге Supabase стоит в схеме extensions, а не public —
-- crypt()/gen_salt() не находились из-за search_path.
create or replace function create_base(p_id text, p_name text, p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function verify_base(p_id text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
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

grant execute on function create_base(text, text, text) to anon;
grant execute on function verify_base(text, text) to anon;

notify pgrst, 'reload schema';
