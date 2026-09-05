(() => {
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu]');
  const nav = document.querySelector('[data-nav]');

  const syncHeader = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  menuButton?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }));

  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    revealItems.forEach((item) => observer.observe(item));
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;
      const value = target.textContent.trim();
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = 'Скопировано';
      } catch (_) {
        const range = document.createRange();
        range.selectNodeContents(target);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        button.textContent = 'Текст выделен';
      }
      setTimeout(() => { button.textContent = 'Скопировать'; }, 1800);
    });
  });

  const form = document.querySelector('[data-diagnostic]');
  if (!form) return;

  const progress = document.querySelector('[data-progress]');
  const progressText = document.querySelector('[data-progress-text]');
  const result = document.querySelector('[data-result]');
  const questions = [...form.querySelectorAll('fieldset[data-question]')];

  const updateProgress = () => {
    const answered = questions.filter((question) => question.querySelector('input:checked')).length;
    const percent = Math.round((answered / questions.length) * 100);
    if (progress) progress.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${answered} из ${questions.length}`;
  };
  form.addEventListener('change', updateProgress);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const missing = questions.find((question) => !question.querySelector('input:checked'));
    if (missing) {
      missing.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      missing.querySelector('input')?.focus();
      return;
    }

    let score = 0;
    questions.forEach((_, index) => { score += Number(data.get(`q${index + 1}`) || 0); });
    const subject = String(data.get('subject') || 'предмет');
    const grade = String(data.get('grade') || 'класс не указан');
    let title;
    let summary;
    let actions;
    if (score <= 6) {
      title = 'База есть. Нужна точная настройка.';
      summary = 'Главный риск — не объём знаний, а отдельные повторяющиеся ошибки и стратегия экзамена.';
      actions = ['Сделать один вариант в условиях времени', 'Разделить ошибки на знание, модель, вычисление и внимание', 'На неделю выбрать один тип ошибки'];
    } else if (score <= 13) {
      title = 'Нужна система, пока есть время.';
      summary = 'Подготовка идёт, но часть усилий теряется: нет устойчивой карты тем, ритма или разбора ошибок.';
      actions = ['Провести входной срез по темам', 'Составить двухнедельный план вместо плана на год', 'Завести журнал повторяющихся ошибок'];
    } else {
      title = 'Сначала стабилизируем ситуацию.';
      summary = 'Разрыв между целью и текущим процессом велик. Полезнее начать с диагностики и короткого антикризисного плана, а не добавлять случайные занятия.';
      actions = ['Зафиксировать реальный текущий балл', 'Выбрать темы с максимальной отдачей', 'На две недели задать измеримый ритм и сделать повторный срез'];
    }

    const message = `Андрей, прошли диагностику. ${subject}, ${grade}. Риск: ${score} из 20. Нужен план подготовки.`;
    const vkUrl = `https://vk.ru/andrupsy?w=mail&text=${encodeURIComponent(message)}`;
    result.innerHTML = `
      <p class="result-score">${score}<small>/20</small></p>
      <h2>${title}</h2>
      <p>${summary}</p>
      <ol>${actions.map((action) => `<li>${action}</li>`).join('')}</ol>
      <div class="result-actions">
        <a class="button button-primary" href="${vkUrl}" target="_blank" rel="noopener">Отправить результат Андрею</a>
        <a class="button button-quiet" href="prompts.html">Взять учебные промпты</a>
      </div>`;
    result.classList.add('visible');
    result.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
})();
