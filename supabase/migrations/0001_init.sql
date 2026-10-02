-- Учёт ТСД: базовая схема

create extension if not exists "pgcrypto";

create table equipment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table equipment_models (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references equipment_types(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (type_id, name)
);

create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create type equipment_status as enum ('in_stock', 'issued', 'lost', 'in_repair', 'defective', 'transferred');

create table equipment_items (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references equipment_models(id) on delete restrict,
  serial_number text not null unique,
  status equipment_status not null default 'in_stock',
  storage_location_id uuid references storage_locations(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on equipment_items (storage_location_id);

create table employees (
  id uuid primary key default gen_random_uuid(),
  badge_code text not null unique,
  created_at timestamptz not null default now()
);

create table issuances (
  id uuid primary key default gen_random_uuid(),
  equipment_item_id uuid not null references equipment_items(id) on delete restrict,
  employee_id uuid not null references employees(id) on delete restrict,
  issued_at timestamptz not null default now(),
  returned_at timestamptz,
  status text not null default 'active' check (status in ('active', 'returned'))
);
create index on issuances (equipment_item_id);
create index on issuances (employee_id);

create table defects (
  id uuid primary key default gen_random_uuid(),
  issuance_id uuid references issuances(id) on delete set null,
  equipment_item_id uuid not null references equipment_items(id) on delete restrict,
  reported_employee_code text, -- id/табельный номер сотрудника, вписывается вручную, не обязательно существующий бейдж
  note text,
  explanation_file_url text,
  created_at timestamptz not null default now()
);
create index on defects (equipment_item_id);

create table inventories (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references equipment_types(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed'))
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references inventories(id) on delete cascade,
  equipment_item_id uuid not null references equipment_items(id) on delete cascade,
  scanned boolean not null default false,
  scanned_at timestamptz,
  unique (inventory_id, equipment_item_id)
);
create index on inventory_items (inventory_id);

create table repairs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transfer_code text,
  lo_name text not null,
  photo_url text
);

create table repair_items (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references repairs(id) on delete cascade,
  equipment_item_id uuid not null references equipment_items(id) on delete cascade,
  unique (repair_id, equipment_item_id)
);
create index on repair_items (repair_id);

create table transfers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transfer_code text,
  lo_name text not null
);

create table transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references transfers(id) on delete cascade,
  equipment_item_id uuid not null references equipment_items(id) on delete cascade,
  unique (transfer_id, equipment_item_id)
);
create index on transfer_items (transfer_id);

-- Внутренний инструмент без публичного доступа из интернета: permissive-доступ по anon key.
alter table equipment_types enable row level security;
alter table equipment_models enable row level security;
alter table storage_locations enable row level security;
alter table equipment_items enable row level security;
alter table employees enable row level security;
alter table issuances enable row level security;
alter table defects enable row level security;
alter table inventories enable row level security;
alter table inventory_items enable row level security;
alter table repairs enable row level security;
alter table repair_items enable row level security;
alter table transfers enable row level security;
alter table transfer_items enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'equipment_types','equipment_models','storage_locations','equipment_items','employees',
    'issuances','defects','inventories','inventory_items','repairs','repair_items',
    'transfers','transfer_items'
  ])
  loop
    execute format('create policy "anon_all_%1$s" on %1$s for all to anon using (true) with check (true)', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('equipment-files', 'equipment-files', true)
on conflict (id) do nothing;

create policy "anon_read_equipment_files" on storage.objects
  for select to anon using (bucket_id = 'equipment-files');
create policy "anon_write_equipment_files" on storage.objects
  for insert to anon with check (bucket_id = 'equipment-files');

-- Виды оборудования и места хранения по умолчанию
insert into equipment_types (name) values
  ('ТСД'),
  ('Напалечный сканер'),
  ('Настольный сканер'),
  ('ЗУ оборудования'),
  ('Планшет'),
  ('Компьютер'),
  ('Клавиатура'),
  ('Мышка'),
  ('Термопринтер'),
  ('Принтер'),
  ('Телевизор'),
  ('Вентилятор'),
  ('Электророхля'),
  ('Ручная рохля'),
  ('Электроштабелёр'),
  ('Стационарный подъёмник'),
  ('ЗУ техники')
on conflict (name) do nothing;

insert into storage_locations (name) values
  ('ХАБ'),
  ('Кабинет'),
  ('Стеллаж хранения (второй этаж)'),
  ('Столы ПУ'),
  ('Стол старшего отгрузки'),
  ('Стол старшего вход. потока'),
  ('Стол старшего исход. потока'),
  ('Стеллаж хранения ТМЦ'),
  ('Отдел оформления')
on conflict (name) do nothing;
