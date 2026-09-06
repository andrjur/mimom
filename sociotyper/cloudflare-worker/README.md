# Worker типировщика

Worker выдаёт 4 анализа и 10 поясняющих вопросов анонимному браузеру, принимает коды пополнения и запускает четыре этапа анализа. Для срочного публичного демо в `worker.js` временно вшит отдельный ключ Knyazev AI. После ролика его нужно отозвать и удалить константу `TEMP_DEMO_KNYAZEV_KEY`; постоянную версию подключать через Worker Secret.

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

### 4. После ролика убрать временный ключ и добавить постоянный Secret

1. Worker → **Settings → Variables and Secrets → Add**.
2. Type: **Secret**.
3. Variable name: `KNYAZEV_API_KEY`.
4. Value: вставьте новый ключ Knyazev AI.
5. Удалите значение временной константы `TEMP_DEMO_KNYAZEV_KEY` из `worker.js`.
6. Нажмите **Deploy**.

Новый ключ нужно создавать только после отзыва опубликованного. В переписку его присылать не надо.

### 5. Подключить адрес сайта

1. Worker → **Settings → Domains & Routes → Add**.
2. Выберите **Route**.
3. Zone: `indikov.ru`.
4. Route: `indikov.ru/api/typist/*`.
5. Сохраните. Другие страницы продолжит отдавать GitHub Pages.

Сначала проверьте адрес `https://indikov.ru/api/typist/health`: ожидается JSON с `"ok": true`.

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

## Продажи и продление

Регистрация на первом этапе не нужна. После ручной оплаты вы открываете `code-generator.html`, создаёте одноразовый код и выполняете готовую SQL-команду в D1. Пользователь вводит код в плашку на сайте. Код переносит пакет на анонимный cookie этого браузера и второй раз не работает.

Компромисс MVP: при очистке cookie пакет пропадёт с устройства. Для редких случаев вы вручную выдаёте замену. Telegram Login имеет смысл добавлять позднее, когда таких обращений станет заметно много; до этого регистрация ухудшит конверсию сильнее, чем поможет.

## Маршрут

После проверки добавить route `indikov.ru/api/typist/*` к Worker. Остальные адреса продолжит обслуживать GitHub Pages.
