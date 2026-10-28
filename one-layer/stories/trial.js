(() => {
  const form = document.querySelector('[data-story-trial]');
  const button = document.querySelector('[data-story-download]');
  if (!form || !button) return;
  button.addEventListener('click', () => {
    const data = new FormData(form);
    const lines = ['Мои наблюдения по практике «Один слой»', '', 'Эпизод: ' + (data.get('topic') || '')];
    for (let n = 1; n <= 3; n++) lines.push('', 'Проба ' + n + ': ' + (data.get('observation' + n) || ''));
    lines.push('', 'Можно изменить условия, сделать паузу или закончить.');
    const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'one-layer-observations.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector('[data-story-status]').textContent = 'Файл с наблюдениями подготовлен для скачивания. Записи со страницы никуда не отправлялись.';
  });
})();
