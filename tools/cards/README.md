# Репетитор.AI

Страница: https://indikov.ru/repetitor/cards/

Статика размещена на GitHub Pages. Отдельный Cloudflare Worker обслуживает персональные ключи ИИ и совместный трекер с взаимным согласием. Общего платного ключа нет. Ключи пользователей не сохраняются Worker.

Сборка в app: CARDS_BASE_PATH=/repetitor/cards/ и VITE_CARDS_API_BASE=/api/cards. Выполнить npm ci, npm run check, npm run build; скопировать содержимое dist в repetitor/cards.

Worker: worker/wrangler.jsonc. Перед изменением Worker пересобрать worker.mjs из TypeScript. Данные совместных трекеров хранятся в отдельном Durable Object TRACKER. Не удалять namespace при обновлении.

