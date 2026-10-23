import support from '../content/support.json';
export default function SupportCard() {
  return <aside className="supportCard" id="support" aria-labelledby="support-title">
    <div className="supportCopy">
      <p className="overline">ДОБРОВОЛЬНАЯ ПОДДЕРЖКА · ДОСТУП УЖЕ ОТКРЫТ</p>
      <h2 id="support-title">Было полезно?<br/>Можно сказать спасибо.</h2>
      <p>Сначала попробуйте практику. Если хочется поддержать автора и новые материалы, ниже есть ЮMoney и перевод любой суммы по СБП. Донат не нужен для повторного доступа.</p>
      <div className="supportPhone"><span>СБП · ЛЮБАЯ СУММА</span><strong>{support.displayPhone}</strong><p>Банк получателя: <b>{support.bank}</b></p><p className="supportExact">Перевод любой суммы по СБП на номер +79684494137, Юмани банк.</p><button className="supportCopyButton" type="button" data-support-copy="" hidden>Скопировать номер</button><span className="supportCopyStatus" data-support-status="" role="status" aria-live="polite"></span></div>
      <details className="supportHow"><summary>Как перевести другую сумму по СБП</summary><p>В приложении своего банка откройте перевод по номеру телефона, введите <b>{support.displayPhone}</b>, выберите <b>ЮMoney</b> и свою сумму. Перед подтверждением проверьте получателя в банковском приложении. Если ЮMoney не предлагается, не выбирайте другой банк наугад: воспользуйтесь ссылкой ЮMoney или уточните у Андрея.</p><a href={support.helpUrl} target="_blank" rel="noopener noreferrer">Инструкция ЮMoney ↗</a></details>
      <a className="supportSave" href="#feedback">Вместо доната можно оставить честный отзыв ↓</a>
    </div>
    <div className="supportPayment">
      <div className="supportIcon" aria-hidden="true"><svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M24 39S7 29 7 17a9 9 0 0 1 17-4 9 9 0 0 1 17 4c0 12-17 22-17 22Z" stroke="currentColor" strokeWidth="2.5"/><path d="m19 23 4 4 7-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
      <p className="supportBrand">ЮMoney</p><h3>Сказать спасибо</h3><p>Размер поддержки выбираете вы.<br/>Можно вернуться после практики.</p>
      <img src="/assets/support/yoomoney-any-qr.svg" width="196" height="196" alt="QR-код: открыть ЮMoney по ссылке автора для добровольной поддержки" loading="lazy"/>
      <a className="btn supportPayButton" href={support.transferUrl} target="_blank" rel="noopener noreferrer" data-support-link="transfer">Поддержать через ЮMoney ↗</a>
      <small>QR и кнопка открывают страницу ЮMoney.<br/>Это не QR-платёж СБП. Сумму и получателя проверьте перед переводом.</small>
      <a className="supportFundLink" href={support.billUrl} target="_blank" rel="noopener noreferrer" data-support-link="bill">Ещё вариант: поддержать на 590 ₽ ↗</a>
      <a className="supportFundLink" href={support.fundraiseUrl} target="_blank" rel="noopener noreferrer" data-support-link="fundraise">Открыть страницу сбора ЮMoney ↗</a>
      <a className="supportFundLink" href="/assets/support/yoomoney-any-qr.png" download="support-yoomoney-qr.png">Скачать QR поддержки</a>
    </div>
  </aside>;
}
