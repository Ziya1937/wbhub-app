# Учёт ТСД

Desktop-приложение (Windows, Electron) для учёта выдачи/сдачи оборудования: инвентарь с серийными номерами, выдача и сдача под бейдж, фиксация дефектов, инвентаризации и отправка в ремонт.

## Стек

Electron + Vite + React + TypeScript, Tailwind CSS, Supabase (Postgres + Storage). Серийники и бейджи вводятся через USB/Bluetooth сканер штрихкода, который работает как клавиатура — достаточно держать фокус в поле сканирования.

## Настройка

1. Создайте проект в [Supabase](https://supabase.com).
2. Примените миграцию `supabase/migrations/0001_init.sql` (SQL Editor или `supabase db push`).
3. Скопируйте `.env.local.example` в `.env.local` и впишите `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` из настроек проекта (Project Settings → API).
4. Установите зависимости: `npm install`.

## Запуск

```bash
npm run electron:dev
```

Поднимет Vite dev-сервер и откроет Electron-окно с hot-reload интерфейса.

Запустить только веб-версию в браузере (для отладки UI):

```bash
npm run dev
```

## Сборка Windows-инсталлятора

```bash
npm run dist
```

Соберёт рендерер и main-процесс, затем упакует `.exe` (nsis) в папку `release/`.

## Структура

- `electron/` — главный процесс Electron (`main.ts`) и preload.
- `src/pages/` — пять экранов: Выдача, Инвентарь, История оборудования, Инвент, На ремонт.
- `src/lib/queries.ts` — все обращения к Supabase.
- `src/components/ScanInput.tsx` — поле для сканера штрихкода.
- `supabase/migrations/` — SQL-схема.
