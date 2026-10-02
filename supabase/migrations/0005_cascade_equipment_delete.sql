-- Удаление оборудования по коду должно реально удалять единицу вместе со всей историей,
-- а не упираться в ограничение внешнего ключа.
alter table issuances drop constraint issuances_equipment_item_id_fkey;
alter table issuances add constraint issuances_equipment_item_id_fkey
  foreign key (equipment_item_id) references equipment_items(id) on delete cascade;

alter table defects drop constraint defects_equipment_item_id_fkey;
alter table defects add constraint defects_equipment_item_id_fkey
  foreign key (equipment_item_id) references equipment_items(id) on delete cascade;
