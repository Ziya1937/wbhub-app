-- Инсталлятор весит ~120 МБ — поднимаем лимит размера файла для бакета релизов
update storage.buckets
set file_size_limit = 314572800 -- 300 MB
where id = 'app-releases';
