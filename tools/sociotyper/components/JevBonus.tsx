import React, { useEffect, useState } from 'react';
import type { ByokSettings, TypistResult } from '../typistTypes';
import { DEFAULT_API_BASE } from '../services/typistApi';

export const JevBonusSettings: React.FC<{ value: ByokSettings; onChange: (value: ByokSettings) => void }> = ({ value, onChange }) => {
  const [siteReady, setSiteReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${DEFAULT_API_BASE}/health`, { signal: controller.signal }).then(response => response.json()).then(data => setSiteReady(Boolean(data.jevReady))).catch(() => {});
    return () => controller.abort();
  }, []);
  const enabled = value.jev?.enabled !== false;
  const personal = Boolean(value.jev?.key || (value.mode === 'byok' && (value.provider === 'polza' && value.key || value.connections?.some(item => item.provider === 'polza' && item.policy !== 'off' && item.key))));
  return <section className="tw-jev-settings" aria-label="Дополнительная проверка Jev">
    <label className="tw-jev-switch"><input type="checkbox" checked={enabled} onChange={event => onChange({ ...value, jev: { ...value.jev, enabled: event.target.checked } })} /><span><b>Дополнительно проверить через Jev</b><small>Запускается параллельно. Сравним 15 признаков с основным анализом.</small></span></label>
    {enabled && <div className="tw-jev-access">
      <p>{personal ? 'Указан личный ключ Polza. Бонусный запрос оплачивается с вашего баланса.' : siteReady ? 'Бонусный запрос оплачивает сайт. Дополнительная попытка не списывается.' : 'Для запуска нужен ключ Polza.ai. Можно использовать тот же ключ, что и для основного анализа.'}</p>
      <label>Ключ Polza.ai для Jev<input type="password" autoComplete="off" value={value.jev?.key || ''} placeholder="Вставьте ключ Polza.ai" onChange={event => onChange({ ...value, jev: { enabled: true, key: event.target.value.trim() } })} /></label>
      <small>Текст и расшифровка будут дополнительно отправлены в Polza.ai. Ключ хранится в этой вкладке и временно на сервере в зашифрованном задании. Без доступного ключа основное типирование продолжится.</small>
      <a href="https://polza.ai/dashboard/api-keys" target="_blank" rel="noreferrer">Получить ключ Polza.ai</a>
    </div>}
  </section>;
};

export const JevBonusResult: React.FC<{ result?: TypistResult['jev'] }> = ({ result }) => {
  if (!result) return null;
  const reason = result.reason === 'disabled' ? 'Проверка отключена.' : result.reason === 'not_configured' ? 'Jev не запускался: нужен ключ Polza.ai.' : result.reason === 'JEV_BALANCE_REQUIRED' ? 'Для Jev нужно пополнить баланс Polza.ai.' : result.reason === 'JEV_AUTH_FAILED' ? 'Polza не приняла ключ для Jev. Проверьте ключ и доступ.' : result.reason === 'JEV_TIMEOUT' ? 'Jev не ответил вовремя. Основной результат сохранён.' : 'Jev сейчас недоступен. Основной результат сохранён.';
  return <section className="tw-jev-result" data-testid="jev-result">
    <h3>Дополнительный взгляд Jev</h3>
    {result.status !== 'done' ? <p>{reason}</p> : <>
      <p>Совпали: {result.agreement?.agree || 0}. Разошлись: {result.agreement?.disagree || 0}. Недостаточно данных для сравнения: {result.agreement?.unresolved || 0}.</p>
      <p className="tw-muted">Это отдельная оценка модели. Она не меняет основной рейтинг. Вероятности Jev не измеряют точность типирования человека.</p>
      <div className="tw-table-wrap"><table><thead><tr><th>Признак</th><th>Основной анализ</th><th>Jev</th></tr></thead><tbody>{result.rows?.map(row => <tr key={row.probeId} className={row.comparison === 'disagree' ? 'tw-jev-disagrees' : ''}><td>{row.label}</td><td>{row.mainPole === 'insufficient' ? 'Данных мало' : row.mainPole}</td><td>{row.pole === 'insufficient' ? 'Данных мало' : row.pole}</td></tr>)}</tbody></table></div>
      {result.costRub != null && <p>Стоимость Jev: {result.costRub.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ₽{result.payment === 'site' ? ' за счёт сайта' : ' с вашего баланса Polza.ai'}.</p>}
      {result.rows?.some(row => row.comparison === 'disagree') && <p>Расхождения полезно проверить на новых реальных историях.</p>}
    </>}
  </section>;
};
