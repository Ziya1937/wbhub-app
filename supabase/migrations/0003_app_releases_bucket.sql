-- Публичный бакет для раздачи файлов автообновления (electron-updater, generic provider)
insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do nothing;

create policy "anon_read_app_releases" on storage.objects
  for select to anon using (bucket_id = 'app-releases');
