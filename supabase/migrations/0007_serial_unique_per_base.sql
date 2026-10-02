-- Серийный номер должен быть уникален в рамках одной базы, а не глобально —
-- разные ЛО не должны мешать друг другу из-за совпавшего с/н.
alter table equipment_items drop constraint equipment_items_serial_number_key;
alter table equipment_items add constraint equipment_items_serial_base_unique unique (serial_number, base_id);
