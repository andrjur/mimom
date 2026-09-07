# Worker типировщика

Worker выдаёт 4 анализа и 10 поясняющих вопросов анонимному браузеру, принимает коды пополнения и запускает 24 независимые проверки плюс итоговый синтез. В исходнике нет ключа: общий ключ Knyazev AI подключается только через Cloudflare Secret. Пользовательский BYOK-ключ приходит на время конкретного запроса и не записывается в D1, R2 или логи.

## Что такое Worker простыми словами

GitHub Pages умеет отдавать HTML, CSS и JavaScript, но любой ключ внутри этих файлов виден посетителю. Worker — маленький сервер Cloudflare между страницей и нейросетью:

`браузер → indikov.ru/api/typist/* → Worker → модель`

Страница просит сделать анализ. Worker проверяет лимит, достаёт секретный ключ из закрытого хранилища Cloudflare, обращается к модели и возвращает только результат. Значение секрета нельзя прочитать из кода страницы.

## Настройка в новом интерфейсе Cloudflare

### 1. Создать Worker

1. Откройте **Cloudflare dashboard → Compute → Workers & Pages**.
2. Нажмите **Create application**.
3. Выберите **Start with Hello World**.
4. Имя: `indikov-typist-api`.
5. Нажмите **Deploy**. Это создаст пустую заготовку.
6. Откройте её и нажмите **Edit code**.
7. Замените пример кодом из `worker.js`, затем нажмите **Deploy**.

### 2. Создать D1 для попыток и кодов

1. Слева: **Storage & Databases → D1 SQL database → Create database**.
2. Имя: `indikov-typist`.
3. В консоли базы выполните `schema.sql`.
4. Вернитесь в Worker → **Bindings → Add binding → D1 database**.
5. Variable name: `DB`; database: `indikov-typist`.

### 3. Создать R2 для временного аудио

1. Слева: **Storage & Databases → R2 object storage → Create bucket**.
2. Имя: `indikov-typist-debug`.
3. Worker → **Bindings → Add binding → R2 bucket**.
4. Variable name: `DEBUG_BUCKET`; bucket: `indikov-typist-debug`.
5. В настройках bucket добавьте lifecycle rule: удалять все объекты через 7 дней.

### 4. Добавить постоянный Secret

1. Worker → **Settings → Variables and Secrets → Add**.
2. Type: **Secret**.
3. Variable name: `KNYAZEV_API_KEY`.
4. Value: вставьте новый ключ Knyazev AI.
5. Нажмите **Deploy**.

Если старый ключ когда-либо попадал в код, ZIP или публичный Worker, его нужно отозвать в Knyazev AI и создать новый. В переписку ключ присылать не надо.

### 5. Подключить адрес сайта

1. Worker → **Settings → Domains & Routes → Add**.
2. Выберите **Route**.
3. Zone: `indikov.ru`.
4. Route: `indikov.ru/api/typist/*`.
5. Сохраните. Другие страницы продолжит отдавать GitHub Pages.

Сначала проверьте адрес `https://indikov.ru/api/typist/health`: ожидается JSON с `"ok": true`.

### Что означает маршрут простыми словами

Страница находится на GitHub Pages, а серверная функция — в Cloudflare. Маршрут говорит Cloudflare: «только запросы, начинающиеся с `/api/typist/`, передавай Worker; всё остальное оставь сайту». Поэтому `https://indikov.ru/sociotyper/` продолжает открываться как статическая страница, а `https://indikov.ru/api/typist/analyze` выполняется как серверный код.

В клиенте уже стоит относительный адрес `/api/typist`. При настроенном маршруте переменная `VITE_TYPIST_API_BASE` не нужна. Полный URL Worker — запасной вариант, если маршрут пока не настроен:

```powershell
$env:VITE_TYPIST_API_BASE='https://ВАШ-WORKER.ВАШ-СУБДОМЕН.workers.dev/api/typist'
npm run build
```

Не нужно одновременно привязывать маршрут и вшивать полный URL: для продакшна на `indikov.ru` предпочтительнее маршрут.

### Развёртывание через Wrangler

CLI должен быть авторизован в вашем Cloudflare-аккаунте:

```powershell
cd cloudflare-worker
npx wrangler login
npx wrangler d1 create indikov-typist
npx wrangler r2 bucket create indikov-typist-debug
```

Вставьте выданный `database_id` в копию `wrangler.example.jsonc`, затем:

```powershell
npx wrangler d1 execute indikov-typist --remote --file schema.sql
npx wrangler secret put KNYAZEV_API_KEY
npx wrangler deploy --config wrangler.example.jsonc
```

Маршрут `indikov.ru/api/typist/*` уже записан в примере конфигурации. Привязка D1 нужна не только для кодов и попыток: таблица `provider_request_slots` удерживает общий серверный ключ в пределах 10 обращений в минуту даже при нескольких посетителях.

## Секреты

В Cloudflare: **Workers & Pages → indikov-typist-api → Settings → Variables and Secrets → Add → Secret**.

- `KNYAZEV_API_KEY` — новый ключ Knyazev AI. Не используйте ключ, опубликованный в чате.
- `OMNI_API_KEY` — необязательный ключ модели, которая принимает аудио.
- `OMNI_BASE_URL` и `OMNI_MODEL` — адрес и имя аудиомодели.

Секреты никогда не добавляются в GitHub, `worker.js` или скриншоты.

## Хранение для отладки

- D1 хранит только счётчики, коды и метаданные.
- R2 хранит анкету, Markdown-отчёт, полный JSON этапов и исходное аудио в отдельных папках по отправкам.
- На R2 нужно включить lifecycle rule: удалить все объекты через 7 дней.
- Письмо содержит только имя, срок и путь в R2; аудио не отправляется вложением.

Чтобы перестать сохранять новые анкеты: поменять `STORE_DEBUG_PAYLOADS` на `false` и развернуть новую версию. Чтобы удалить старые материалы раньше срока — удалить объекты `debug/` в R2.

Для почтовых уведомлений сначала включите **Email Routing** для `indikov.ru`, подтвердите адрес `a9507652513@gmail.com`, затем добавьте Worker binding типа **Send Email** с именем `NOTIFY_EMAIL`. Отправитель `typist@indikov.ru`, получатель — только подтверждённый адрес. Письмо не содержит анкету или аудио.

## Где смотреть запросы, контекст и промпты

### В панели Cloudflare

1. Откройте **Workers & Pages**.
2. Выберите Worker `indikov-typist-public-demo` или будущий `indikov-typist-api`.
3. Откройте **Logs → Live** для потока в реальном времени либо **Observability** для сохранённых логов.
4. Сделайте типирование с включённой галочкой согласия на отладку.
5. В результате раскройте блок «Что именно проверяет ИИ» и скопируйте `ID запроса`.
6. В логах отфильтруйте поле `traceId` по этому значению. Будут видны события `typist.analysis.start`, 24 проверки `probe:*`, `final-synthesis` и `typist.analysis.complete`.

### Из терминала

Из папки проекта выполните:

```powershell
npx wrangler tail indikov-typist-api --format pretty
```

Для временной демоверсии сначала заберите Worker в свой аккаунт Cloudflare по выданной ссылке Claim. Пока окно `tail` открыто, выполните типирование в браузере.

`LOG_PROMPTS=true` разрешает полный диагностический вывод, но сам текст и полный промпт попадают в лог только при включённом пользователем согласии на отладку. Без согласия пишутся структура, этап, модель, длительность и размеры контекста. API-ключ не логируется никогда. После отладки поставьте `LOG_PROMPTS=false`; на бесплатном плане сохранённые Workers Logs держатся ограниченное время.

## Продажи и продление

Регистрация на первом этапе не нужна. После ручной оплаты вы открываете `code-generator.html`, создаёте одноразовый код и выполняете готовую SQL-команду в D1. Пользователь вводит код в плашку на сайте. Код переносит пакет на анонимный cookie этого браузера и второй раз не работает.

Компромисс MVP: при очистке cookie пакет пропадёт с устройства. Для редких случаев вы вручную выдаёте замену. Telegram Login имеет смысл добавлять позднее, когда таких обращений станет заметно много; до этого регистрация ухудшит конверсию сильнее, чем поможет.

## Маршрут

После проверки добавить route `indikov.ru/api/typist/*` к Worker. Остальные адреса продолжит обслуживать GitHub Pages.
