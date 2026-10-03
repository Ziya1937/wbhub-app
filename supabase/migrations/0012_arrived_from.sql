-- Откуда прибыло оборудование (заполняется при приёмке перемещения)
alter table equipment_items add column arrived_from text;

notify pgrst, 'reload schema';
