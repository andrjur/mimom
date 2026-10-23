import reviews from '../content/one-layer-reviews.json';
const approvedReviews = reviews.filter(review => review.status === 'approved' && review.publicationConsent === true);

export default function OneLayerFeedback() {
  return <section className="layerFeedback" id="feedback" aria-labelledby="feedback-title">
    <div className="feedbackIntro">
      <p className="overline">ПОПРОБОВАЛИ? РАССКАЖИТЕ, КАК ЭТО БЫЛО</p>
      <h2 id="feedback-title">Можно возвращаться.<br/>И каждый раз замечать своё.</h2>
      <p>Практику можно делать бесплатно сколько угодно раз. Если пользуетесь без доната, моя просьба: оставьте честный отзыв. Даже если ничего не изменилось или что-то не подошло.</p>
      <p>Поддержка добровольная. Положительный отзыв не является условием доступа.</p>
      <ol className="feedbackSteps"><li>Заполните короткую форму.</li><li>Проверьте текст и откройте личный чат с Андреем.</li><li>Нажмите «Отправить» в Telegram.</li></ol>
      <p className="feedbackHint">Форма готовит сообщение, но не отправляет его автоматически. Без Telegram можно скопировать текст и сохранить его у себя.</p>
      <div className="feedbackModeration"><strong>Сначала лично, потом решение.</strong><p>Отзыв придёт Андрею в личный чат @Andreyjurievich. На сайте он появится только после проверки Андреем и только если вы отдельно разрешили публикацию. Контакт и переписка не публикуются.</p></div>
      <img className="feedbackPracticeQr" src="/assets/support/one-layer-qr.svg" width="164" height="164" loading="lazy" alt="QR-код: открыть бесплатную практику на indikov.ru/one-layer/"/>
      <a className="textLink" href="/assets/support/one-layer-qr.png" download="one-layer-qr.png">Скачать QR практики для сохранения или видео</a>
    </div>
    <div className="feedbackFormBox">
      <form data-layer-feedback="" hidden>
        <label htmlFor="feedback-name">Как подписать отзыв? <span>Необязательно</span></label>
        <input id="feedback-name" name="name" maxLength="60" autoComplete="nickname" placeholder="Имя, псевдоним или оставьте пустым"/>
        <label htmlFor="feedback-result">После практики</label>
        <select id="feedback-result" name="result" required defaultValue=""><option value="" disabled>Выберите свой вариант</option><option>Стало немного яснее</option><option>Стало спокойнее</option><option>Пока без изменений</option><option>Не подошло</option><option>Другое</option></select>
        <label htmlFor="feedback-text">Что заметили? <span>Обязательно, от 10 символов</span></label>
        <textarea id="feedback-text" name="text" required minLength="10" maxLength="1200" rows="5" placeholder="С чем начали, что заметили после? Что было полезно, непонятно или не подошло?" aria-describedby="feedback-private-hint"/>
        <p className="feedbackHint" id="feedback-private-hint">Не указывайте диагнозы, чужие имена и подробности, которыми не готовы делиться. Не нужно присылать личные заметки из упражнения.</p>
        <label className="feedbackCheck"><input type="checkbox" name="publish"/><span>Разрешаю Андрею опубликовать этот текст на indikov.ru после проверки, с указанным именем или анонимно. Это необязательно.</span></label>
        <p className="feedbackHint">Если не поставить галочку, отзыв только для личного чтения. Можно написать Андрею об отзыве и попросить не публиковать или убрать уже опубликованный текст.</p>
        <button className="btn primary" type="submit">Подготовить отзыв для Telegram</button>
      </form>
      <noscript><p>Для формы нужен JavaScript. Можно <a className="textLink" href="https://t.me/Andreyjurievich">написать отзыв Андрею в Telegram</a>. Укажите, разрешаете ли публикацию. По умолчанию отзыв остаётся личным.</p></noscript>
      <section className="feedbackDraft" data-feedback-draft-box="" hidden aria-labelledby="feedback-draft-title"><h3 id="feedback-draft-title">Текст готов. Ещё не отправлен.</h3><label htmlFor="feedback-draft">Проверьте сообщение</label><textarea id="feedback-draft" rows="10" readOnly/><div className="feedbackDraftActions"><button className="btn line" type="button" data-feedback-copy="">Скопировать текст</button><a className="btn primary" href="https://t.me/Andreyjurievich" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-feedback-telegram="">Открыть чат и отправить самому</a></div><p className="feedbackHint">Получатель: @Andreyjurievich. В Telegram нажмите «Отправить». Если текст не подставился, скопируйте его кнопкой выше и вставьте в чат.</p><p data-feedback-status="" role="status" aria-live="polite"></p></section>
    </div>
    <div className="feedbackPublished"><p className="overline">ОПУБЛИКОВАНО С РАЗРЕШЕНИЯ АВТОРОВ</p><h3>Опыт участников</h3>{approvedReviews.length ? approvedReviews.map(review => <figure key={review.id}><blockquote>{review.text}</blockquote><figcaption>{review.name || 'Анонимно'} · {review.date}</figcaption></figure>) : <p>Здесь пока нет опубликованных отзывов. Новые сообщения сначала получает Андрей, они не появляются на странице автоматически.</p>}</div>
  </section>;
}
