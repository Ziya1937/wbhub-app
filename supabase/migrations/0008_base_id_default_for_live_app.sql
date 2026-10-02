-- Срочный фикс: уже установленная версия приложения не знает про base_id и не передаёт его.
-- Даём колонке значение по умолчанию, чтобы текущая версия продолжала работать без изменений,
-- пока новая версия с поддержкой мультибазы не выйдет релизом.
alter table equipment_items alter column base_id set default 'default';
alter table employees alter column base_id set default 'default';
alter table issuances alter column base_id set default 'default';
alter table defects alter column base_id set default 'default';
alter table repairs alter column base_id set default 'default';
alter table transfers alter column base_id set default 'default';
alter table inventories alter column base_id set default 'default';
