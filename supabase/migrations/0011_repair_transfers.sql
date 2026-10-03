-- Ремонт теперь идёт через перемещение: тип перемещения и статус "в пути на ремонт"
alter type equipment_status add value if not exists 'in_transit_repair';

alter table transfers add column kind text not null default 'transfer'
  check (kind in ('transfer', 'repair'));

notify pgrst, 'reload schema';
