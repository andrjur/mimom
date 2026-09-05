(function () {
  const quizzes = document.querySelectorAll('[data-article-quiz]');

  quizzes.forEach((quiz) => {
    const questions = [...quiz.querySelectorAll('fieldset')];
    const counter = quiz.querySelector('[data-quiz-counter]');
    const bar = quiz.querySelector('[data-quiz-bar]');
    const submit = quiz.querySelector('[data-quiz-submit]');
    const reset = quiz.querySelector('[data-quiz-reset]');
    const resultBox = quiz.querySelector('[data-quiz-result]');
    const errorBox = quiz.querySelector('[data-quiz-error]');
    const templates = [...quiz.querySelectorAll('template[data-profile]')];

    const update = () => {
      const answered = questions.filter((question) => question.querySelector('input:checked')).length;
      if (counter) counter.textContent = `${answered} из ${questions.length}`;
      if (bar) bar.style.width = `${Math.round((answered / questions.length) * 100)}%`;
      if (submit) submit.disabled = answered !== questions.length;
      if (errorBox) errorBox.textContent = '';
    };

    quiz.addEventListener('change', update);

    quiz.addEventListener('submit', (event) => {
      event.preventDefault();
      const answers = questions.map((question) => question.querySelector('input:checked'));
      if (answers.some((answer) => !answer)) {
        if (errorBox) errorBox.textContent = 'Ответьте на все вопросы — тогда появится расшифровка.';
        questions.find((question) => !question.querySelector('input:checked'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const scores = {};
      answers.forEach((answer) => {
        answer.value.split(',').forEach((profile) => {
          scores[profile] = (scores[profile] || 0) + 1;
        });
      });

      const order = templates.map((template) => template.dataset.profile);
      const winner = order.reduce((best, profile) => {
        if (!best || (scores[profile] || 0) > (scores[best] || 0)) return profile;
        return best;
      }, '');
      const template = templates.find((item) => item.dataset.profile === winner);

      if (resultBox && template) {
        resultBox.replaceChildren(template.content.cloneNode(true));
        resultBox.classList.add('is-visible');
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    reset?.addEventListener('click', () => {
      quiz.reset();
      resultBox?.classList.remove('is-visible');
      resultBox?.replaceChildren();
      update();
      quiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    update();
  });
})();
