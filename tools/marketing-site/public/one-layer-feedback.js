(() => {
  'use strict';
  const form = document.querySelector('[data-layer-feedback]');
  if (!form) return;
  const box = document.querySelector('[data-feedback-draft-box]');
  const draft = document.querySelector('#feedback-draft');
  const link = document.querySelector('[data-feedback-telegram]');
  const status = document.querySelector('[data-feedback-status]');
  form.hidden = false;
  const value = name => form.elements.namedItem(name).value.trim();
  const clearDraft = () => {
    box.hidden = true;
    draft.value = '';
    link.href = 'https://t.me/Andreyjurievich';
    status.textContent = '';
  };
  form.addEventListener('input', clearDraft);
  form.addEventListener('change', clearDraft);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const field = form.elements.namedItem('text');
    field.setCustomValidity(value('text').length < 10 ? 'Напишите хотя бы 10 символов, не считая пробелов по краям.' : '');
    if (!form.reportValidity()) return;
    const publish = form.elements.namedItem('publish').checked;
    const text = [
      'Отзыв о практике «Один слой»',
      'https://indikov.ru/one-layer/',
      '',
      'Подпись: ' + (value('name') || 'Анонимно'),
      'После практики: ' + value('result'),
      '',
      value('text'),
      '',
      publish
        ? 'Разрешаю опубликовать указанный выше текст на indikov.ru после проверки Андреем, с выбранной подписью. Контакт и переписку не публиковать.'
        : 'Только для личного чтения. Публикацию НЕ разрешаю.'
    ].join('\n');
    draft.value = text;
    link.href = 'https://t.me/Andreyjurievich?text=' + encodeURIComponent(text);
    box.hidden = false;
    status.textContent = 'Сообщение ещё не отправлено. Откройте Telegram, проверьте получателя и нажмите «Отправить».';
    box.scrollIntoView({ behavior: 'auto', block: 'center' });
    draft.focus({ preventScroll: true });
  });
  form.elements.namedItem('text').addEventListener('input', () => {
    form.elements.namedItem('text').setCustomValidity('');
  });
  document.querySelector('[data-feedback-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(draft.value);
      status.textContent = 'Текст скопирован, но ещё не отправлен. Вставьте его в чат с @Andreyjurievich.';
    } catch {
      draft.focus();
      draft.select();
      status.textContent = 'Не удалось скопировать автоматически. Текст выделен: скопируйте вручную и вставьте в личный чат.';
    }
  });
})();
