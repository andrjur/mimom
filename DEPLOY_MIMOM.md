# Как обновить `indikov.ru` в репозитории `andrjur/mimom`

## Безопасный вариант через сайт GitHub

1. Откройте `https://github.com/andrjur/mimom`.
2. Перед заменой скачайте резервную копию: `Code → Download ZIP`.
3. Распакуйте архив `mimom-upload-only-v3.zip` на компьютере. В нём меньше 50 файлов и нет папки `/sociotyper/`, поэтому работающий типировщик останется на месте.
4. В репозитории откройте `Add file → Upload files`.
5. Перетащите **содержимое** распакованной папки в корень репозитория.
6. Убедитесь, что в списке есть `_posts`, `_layouts`, `articles`, `assets`, `school`, `materials`, а папка `sociotyper` не исчезла.
7. Нажмите `Commit changes`.
8. Откройте `Actions` или `Settings → Pages` и дождитесь зелёной сборки.

Проверочные адреса после публикации:

- `https://indikov.ru/`;
- `https://indikov.ru/school/`;
- `https://indikov.ru/school/student-test.html`;
- `https://indikov.ru/articles/`;
- `https://indikov.ru/articles/dom-v-lesu-kokologicheskiy-test/`;
- `https://indikov.ru/sociotyper/`.

## Что нельзя публиковать

- API-ключи, токены, файлы `.env`;
- ключ в JavaScript или HTML, даже если файл минифицирован;
- персональные монологи пользователей и записи голоса без отдельного согласия.

`CNAME` уже содержит `indikov.ru`. Статьи лежат в `_posts` и собираются GitHub Pages через Jekyll.
