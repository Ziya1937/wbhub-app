-- Доп. виды оборудования и места хранения
insert into equipment_types (name) values
  ('Огнетушитель'),
  ('Фонарь'),
  ('Самоспасатель'),
  ('Громкоговоритель'),
  ('Каска'),
  ('Микроволновка'),
  ('Холодильник'),
  ('Чайник'),
  ('Рация'),
  ('Кулер')
on conflict (name) do nothing;

insert into storage_locations (name) values
  ('Парковка'),
  ('Столовая'),
  ('Пост охраны'),
  ('Квадрат сортировки')
on conflict (name) do nothing;

-- Ремонт теперь можно создать пустым (ЛО/передача заполняются после)
alter table repairs alter column lo_name drop not null;
