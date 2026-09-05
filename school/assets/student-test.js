(() => {
  const form = document.querySelector('[data-student-test]');
  if (!form) return;

  const questions = [...form.querySelectorAll('.student-question')];
  const progress = document.querySelector('[data-student-progress]');
  const progressText = document.querySelector('[data-student-progress-text]');
  const submit = document.querySelector('[data-student-submit]');
  const error = document.querySelector('[data-student-error]');
  const result = document.querySelector('[data-student-result]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const profiles = {
    planner: {
      title: 'Навигатор',
      lead: 'Тебе легче учиться, когда видны маршрут, критерии и следующий шаг. Сильная сторона — управляемость; риск — слишком долго готовить идеальную систему вместо старта.',
      actions: ['Выбери три главные задачи недели, остальные оставь в резерве.', 'Перед решением запиши алгоритм в 3–5 коротких шагов.', 'В пятницу отметь не часы, а темы, которые уже решаются без помощи.']
    },
    practitioner: {
      title: 'Практик',
      lead: 'Ты быстрее понимаешь через действие: пример, попытку и исправление ошибки. Сильная сторона — реальный навык; риск — решать много похожего и не замечать общей идеи.',
      actions: ['Начинай тему с одной задачи-пробы, даже если пока не знаешь способ.', 'После решения объясни вслух, почему сработал каждый шаг.', 'Добавь одну новую задачу, где привычный шаблон нужно изменить.']
    },
    researcher: {
      title: 'Исследователь',
      lead: 'Тебя включает смысл: связи, необычные вопросы и понимание «почему». Сильная сторона — глубокая картина; риск — уйти в интересные детали и не закрепить базовый навык.',
      actions: ['Перед темой найди один вопрос, на который действительно хочется ответить.', 'После объяснения реши две обычные задачи без подсказки.', 'Сделай карту: идея → правило → пример → типичная ошибка.']
    },
    sprinter: {
      title: 'Спринтер',
      lead: 'Тебе помогает короткий интенсивный фокус, быстрый отклик и ощущение вызова. Сильная сторона — мощный старт; риск — зависеть от настроения и откладывать длинные задачи.',
      actions: ['Работай циклами по 15 минут и заранее называй цель каждого цикла.', 'Первый спринт делай настолько маленьким, чтобы невозможно было отказаться.', 'После трёх спринтов запиши один результат и один следующий шаг.']
    }
  };

  const update = () => {
    const answered = questions.filter((question) => question.querySelector('input:checked')).length;
    progress.style.width = `${Math.round((answered / questions.length) * 100)}%`;
    progressText.textContent = `${answered} из ${questions.length}`;
    submit.disabled = answered !== questions.length;
    error.textContent = '';
  };

  form.addEventListener('change', update);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const selected = questions.map((question) => question.querySelector('input:checked'));
    if (selected.some((item) => !item)) {
      error.textContent = 'Осталось ответить на несколько вопросов.';
      return;
    }

    const scores = { planner: 0, practitioner: 0, researcher: 0, sprinter: 0 };
    selected.forEach((item) => { scores[item.value] += 1; });
    const order = ['planner', 'practitioner', 'researcher', 'sprinter'];
    const winner = order.reduce((best, key) => scores[key] > scores[best] ? key : best, order[0]);
    const profile = profiles[winner];
    const shareText = `Мой текущий учебный режим — «${profile.title}». На этой неделе попробую: ${profile.actions.join(' ')}`;

    result.innerHTML = `
      <p class="student-result__eyebrow">Твой текущий учебный режим</p>
      <h2>${profile.title}</h2>
      <p class="student-result__lead">${profile.lead}</p>
      <ol class="student-result__grid">${profile.actions.map((action) => `<li>${action}</li>`).join('')}</ol>
      <div class="student-result__actions">
        <button class="button button-gold" type="button" data-copy-student>Скопировать результат</button>
        <a class="button button-quiet" href="prompts.html">Взять промпты для учёбы</a>
        <a class="button button-quiet" href="diagnostics.html">Диагностика подготовки</a>
      </div>
      <p class="student-copy-status" data-student-copy-status></p>`;
    result.classList.add('visible');
    result.querySelector('[data-copy-student]').addEventListener('click', async () => {
      const status = result.querySelector('[data-student-copy-status]');
      try {
        await navigator.clipboard.writeText(shareText);
        status.textContent = 'Скопировано. Можно отправить себе или родителю.';
      } catch (_) {
        status.textContent = shareText;
      }
    });
    result.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });

  update();
})();

