import React, { useMemo, useState } from 'react';
import { AudioLines, Check, CheckCircle2, ChevronRight, KeyRound, LoaderCircle, Share2, ShieldCheck, Trash2, X } from 'lucide-react';
import type { ApiConnection, ByokSettings, ConnectionPolicy } from '../typistTypes';
import { validateByok } from '../services/typistApi';

type Provider = {
  id: ByokSettings['provider'];
  icon: string;
  name: string;
  hint: string;
  keyUrl: string;
  baseUrl: string;
  model: string;
  placeholder: string;
  accent: string;
  screenTitle: string;
  createLabel: string;
  desktop: string[];
  phone: string[];
  models: Array<{ label: string; value: string }>;
};

const PROVIDERS: Provider[] = [
  {
    id: 'just', icon: '✦', name: 'JustDoWork', hint: 'Три недорогие модели для быстрых опытов: Luna, Terra и Sol.',
    keyUrl: 'https://api.justwoker.icu/dashboard/overview', baseUrl: 'https://api.justwoker.icu/v1', model: 'gpt-5.6-luna', placeholder: 'sk-…', accent: '#18b7a5',
    screenTitle: 'JustDoWork → API-ключи', createLabel: 'Создать API-ключ',
    desktop: ['Откройте JustDoWork и войдите в аккаунт.', 'Создайте API-ключ в разделе «Ключи API».', 'Скопируйте ключ и вставьте его ниже.'],
    phone: ['Откройте JustDoWork и меню аккаунта.', 'Перейдите в «Ключи API» и создайте ключ.', 'Скопируйте ключ и вернитесь сюда.'],
    models: [{ label: 'Luna · дешевле всего', value: 'gpt-5.6-luna' }, { label: 'Terra · баланс', value: 'gpt-5.6-terra' }, { label: 'Sol · точнее', value: 'gpt-5.6-sol' }]
  },
  {
    id: 'routerai', icon: '◉', name: 'RouterAI', hint: 'Для экономных опытов: Mercury 2.5. Качество типирования проверяем отдельно.',
    keyUrl: 'https://routerai.ru', baseUrl: 'https://routerai.ru/api/v1', model: 'inception/mercury-2.5', placeholder: 'sk-…', accent: '#3865ef',
    screenTitle: 'RouterAI → Ключи', createLabel: 'Создать API-ключ',
    desktop: ['Откройте личный кабинет RouterAI → Ключи.', 'Создайте API-ключ с лимитом расходов.', 'Вставьте ключ; для запросов нужен доступный баланс.'],
    phone: ['Войдите в RouterAI и откройте «Ключи».', 'Создайте и скопируйте API-ключ.', 'Вернитесь сюда и вставьте ключ.'],
    models: [{ label: 'Mercury 2.5 · экономный эксперимент', value: 'inception/mercury-2.5' }]
  },
  {
    id: 'knyazev', icon: '⚡', name: 'Knyazev AI / Gonka', hint: 'Экстрадешёвый провайдер длинных запросов от наших друзей.',
    keyUrl: 'https://knyazevai.work/ai-api/', baseUrl: 'https://knyazevai.work/v1', model: 'minimax-2.7', placeholder: 'kn_live_…', accent: '#c77822',
    screenTitle: 'AI API → API-ключи', createLabel: 'Создать ключ',
    desktop: ['Откройте AI API и войдите в аккаунт.', 'В блоке «API-ключи» нажмите «Создать ключ».', 'Скопируйте kn_live_… и вставьте ниже.'],
    phone: ['Откройте ссылку и прокрутите до блока AI API.', 'В «API-ключах» нажмите «Создать ключ».', 'Нажмите «Копировать», вернитесь сюда и вставьте ключ.'],
    models: [{ label: 'MiniMax 2.7 · стабильно', value: 'minimax-2.7' }, { label: 'DeepSeek V4 Flash · глубже', value: 'deepseek-v4-flash' }, { label: 'Kimi 2.6 · альтернативный взгляд', value: 'kimi-2.6' }]
  },
  {
    id: 'gemini', icon: '✦', name: 'Google Gemini', hint: 'Удобный ключ и мультимодальные модели Google.',
    keyUrl: 'https://aistudio.google.com/app/apikey', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.6-flash', placeholder: 'AIza…', accent: '#4f7cff',
    screenTitle: 'Google AI Studio → API keys', createLabel: 'Create API key',
    desktop: ['Откройте Google AI Studio и войдите в Google.', 'Нажмите «Create API key» и выберите проект.', 'Скопируйте ключ и вставьте ниже.'],
    phone: ['Откройте AI Studio; при необходимости включите версию для ПК.', 'Нажмите «Create API key» и подтвердите проект.', 'Удерживайте ключ, скопируйте и вставьте ниже.'],
    models: [{ label: 'Flash · быстро', value: 'gemini-3.6-flash' }, { label: 'Pro · точнее', value: 'gemini-3.1-pro' }]
  },
  {
    id: 'openai', icon: '◎', name: 'OpenAI API', hint: 'Ключ API оплачивается отдельно от подписки ChatGPT.',
    keyUrl: 'https://platform.openai.com/api-keys', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', placeholder: 'sk-…', accent: '#26a17b',
    screenTitle: 'Platform → API keys', createLabel: 'Create new secret key',
    desktop: ['Откройте страницу API keys в Platform.', 'Нажмите «Create new secret key».', 'Скопируйте ключ сразу: повторно он не показывается.'],
    phone: ['Откройте Platform и войдите в аккаунт.', 'В API keys нажмите «Create new secret key».', 'Скопируйте ключ и вернитесь на эту вкладку.'],
    models: [{ label: 'Mini · экономно', value: 'gpt-4.1-mini' }, { label: 'Полная модель', value: 'gpt-4.1' }]
  },
  {
    id: 'anthropic', icon: 'A', name: 'Anthropic Claude', hint: 'Ключ API оплачивается отдельно от подписки Claude.',
    keyUrl: 'https://console.anthropic.com/settings/keys', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-fable-5-1', placeholder: 'sk-ant-…', accent: '#d8784d',
    screenTitle: 'Console → API Keys', createLabel: 'Create Key',
    desktop: ['Откройте Console → Settings → API Keys.', 'Нажмите «Create Key» и дайте ключу имя.', 'Скопируйте sk-ant-… и вставьте ниже.'],
    phone: ['Откройте Console и разверните меню.', 'Выберите API Keys → Create Key.', 'Скопируйте ключ, пока он виден, и вставьте ниже.'],
    models: [{ label: 'Fable 5.1 · глубоко', value: 'claude-fable-5-1' }, { label: 'Своя модель', value: '' }]
  },
  {
    id: 'openrouter', icon: '⇆', name: 'OpenRouter', hint: 'Один ключ для большого каталога моделей.',
    keyUrl: 'https://openrouter.ai/settings/keys', baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash', placeholder: 'sk-or-…', accent: '#7657ff',
    screenTitle: 'Settings → Keys', createLabel: 'Create API key',
    desktop: ['Откройте Settings → Keys.', 'Нажмите «Create API key» и задайте лимит.', 'Скопируйте sk-or-… и вставьте ниже.'],
    phone: ['Откройте OpenRouter и меню профиля.', 'Выберите Keys → Create API key.', 'Скопируйте ключ и вставьте ниже.'],
    models: [{ label: 'Gemini Flash', value: 'google/gemini-2.5-flash' }, { label: 'Автовыбор', value: 'openrouter/auto' }]
  },
  {
    id: 'custom', icon: '＋', name: 'Другой API', hint: 'Любой OpenAI-совместимый сервис: укажите адрес и модель.',
    keyUrl: '', baseUrl: '', model: '', placeholder: 'Ваш API-ключ', accent: '#b45f2c',
    screenTitle: 'Ваш сервис → API keys', createLabel: 'Создать ключ',
    desktop: ['Откройте кабинет вашего провайдера.', 'Создайте ключ с лимитом расходов.', 'Вставьте ключ и раскройте «Расширенные настройки».'],
    phone: ['Откройте кабинет провайдера в браузере.', 'Создайте и скопируйте ограниченный ключ.', 'Вставьте ключ, Base URL и название модели.'],
    models: []
  }
];

interface Props {
  open: boolean;
  value: ByokSettings;
  onChange: (value: ByokSettings) => void;
  onClose: () => void;
}

export const ApiSetupSheet: React.FC<Props> = ({ open, value, onChange, onClose }) => {
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [validation, setValidation] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [validationText, setValidationText] = useState('');
  const [shareText, setShareText] = useState('Попросить друга поделиться API');
  const connections = value.connections || [];
  const selected = useMemo(() => PROVIDERS.find(p => p.id === value.provider) || PROVIDERS[0], [value.provider]);
  if (!open) return null;

  const selectProvider = (id: ByokSettings['provider']) => {
    const provider = PROVIDERS.find(p => p.id === id)!;
    setValidation('idle');
    onChange({ ...value, provider: id, baseUrl: provider.baseUrl, model: provider.model });
  };

  const changeKey = (key: string) => {
    setValidation('idle');
    setValidationText('');
    onChange({ ...value, key: key.trim() });
  };

  const checkKey = async () => {
    setValidation('checking');
    setValidationText('Проверяем соединение…');
    try {
      const result = await validateByok(value);
      const model = result.model || value.model;
      const next: ApiConnection = {
        id: `${value.provider}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: selected.name,
        provider: value.provider,
        key: value.key,
        baseUrl: value.baseUrl,
        model,
        policy: 'system',
        omniCapable: /(?:gemini|gpt-4o-audio|omni)/i.test(model),
        effort: value.effort
      };
      onChange({ ...value, mode: 'byok', model, connections: [...connections.filter(item => !(item.provider === next.provider && item.baseUrl === next.baseUrl)), next] });
      setValidation('ok');
      setValidationText(`Ключ работает и добавлен. Доступна модель: ${model}`);
    } catch (error) {
      setValidation('error');
      setValidationText(error instanceof Error ? error.message : 'Не удалось проверить ключ.');
    }
  };

  const shareRequest = async () => {
    const text = `Можешь поделиться ограниченным API-ключом для НейроТипировщика? Подойдут Knyazev AI, Gemini, OpenAI, Claude, OpenRouter или другой OpenAI-совместимый API. Открыть: ${location.href}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Доступ к НейроТипировщику', text });
      else await navigator.clipboard.writeText(text);
      setShareText(navigator.share ? 'Запрос отправлен' : 'Текст запроса скопирован');
    } catch { /* пользователь закрыл системное окно */ }
  };

  const steps = device === 'desktop' ? selected.desktop : selected.phone;
  const changePolicy = (id: string, policy: ConnectionPolicy) => onChange({ ...value, mode: 'byok', connections: connections.map(item => item.id === id ? { ...item, policy } : item) });
  const removeConnection = (id: string) => {
    const next = connections.filter(item => item.id !== id);
    onChange({ ...value, mode: next.length ? 'byok' : 'included', connections: next });
  };

  return (
    <div className="tw-sheet-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="tw-sheet" role="dialog" aria-modal="true" aria-label="Подключение своего API">
        <div className="tw-sheet-head">
          <div>
            <span className="tw-kicker">Свой API · без лимита сайта</span>
            <h2>Подключение своего API</h2>
            <p>Если у вас или у друга есть любой API — Knyazev AI, Gemini, OpenAI, Claude, OpenRouter или совместимый сервис — подключите его за минуту.</p>
          </div>
          <button className="tw-icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </div>

        <div className="tw-mode-switch" aria-label="Источник оплаты">
          <button className={value.mode === 'included' ? 'is-active' : ''} onClick={() => onChange({ ...value, mode: 'included' })}>4 попытки от сайта</button>
          <button className={value.mode === 'byok' ? 'is-active' : ''} onClick={() => onChange({ ...value, mode: 'byok' })}>Свой ключ</button>
        </div>

        {value.mode === 'included' ? (
          <div className="tw-included-card">
            <div className="tw-big-check"><Check size={24} /></div>
            <div><strong>Ничего настраивать не нужно</strong><p>Первые 4 анализа оплачивает сайт. Нажмите «Анализировать» — запрос уйдёт через защищённый Worker.</p></div>
          </div>
        ) : (
          <>
            <section className="tw-omni-control">
              <div><AudioLines size={20} /><span><b>OMNI-анализ аудио</b><small>По умолчанию включён. Сработает через совместимую аудиомодель; текстовые модели не «слышат».</small></span></div>
              <button role="switch" aria-checked={value.omniEnabled !== false} className={value.omniEnabled !== false ? 'is-on' : ''} onClick={() => onChange({ ...value, omniEnabled: value.omniEnabled === false })}><i /></button>
            </section>

            {connections.length > 0 && <section className="tw-connected-apis">
              <div className="tw-connected-head"><b>Уже подключены</b><span>{connections.filter(item => item.policy !== 'off').length} активных</span></div>
              {connections.map(connection => <article key={connection.id}>
                <div><span>{connection.provider === 'knyazev' ? '⚡' : connection.omniCapable ? '◉' : '•'}</span><p><b>{connection.label}</b><small>{connection.model} · ключ ••••{connection.key.slice(-4)}</small></p></div>
                <select value={connection.policy} onChange={event => changePolicy(connection.id, event.target.value as ConnectionPolicy)} aria-label={`Режим ${connection.label}`}>
                  <option value="always">Всегда</option><option value="random">Рандом</option><option value="system">На волю системы</option><option value="off">Выключить</option>
                </select>
                <button title="Удалить API" onClick={() => removeConnection(connection.id)}><Trash2 size={15} /></button>
              </article>)}
              <p><b>Всегда</b> — провайдер получает гарантированную долю; <b>Рандом</b> — участвует в жеребьёвке; <b>Система</b> — выбор по доступности и типу задачи.</p>
            </section>}

            <span className="tw-field-label">1. Выберите сервис</span>
            <div className="tw-provider-grid">
              {PROVIDERS.map(provider => (
                <button key={provider.id} className={`${value.provider === provider.id ? 'is-active' : ''} ${provider.id === 'knyazev' ? 'is-friend' : ''}`} onClick={() => selectProvider(provider.id)}>
                  <i>{provider.icon}</i><span>{provider.name}{provider.id === 'knyazev' && <small>ДРУЗЬЯ · ЭКСТРАДЁШЕВО</small>}</span>
                </button>
              ))}
            </div>
            <p className="tw-field-hint">{selected.hint} {selected.id === 'knyazev' && <a href="https://knyazevai.work/ai-api/" target="_blank" rel="noreferrer">Почему так дёшево?</a>}</p>

            <label className="tw-field-label" htmlFor="api-key">2. Вставьте ключ</label>
            <div className={`tw-key-row ${validation}`}>
              <div className="tw-key-input"><KeyRound size={18} /><input id="api-key" type="password" autoComplete="off" value={value.key} placeholder={selected.placeholder} onChange={e => changeKey(e.target.value)} /></div>
              <button onClick={checkKey} disabled={!value.key || validation === 'checking'}>{validation === 'checking' ? <LoaderCircle className="tw-spin" size={18} /> : 'Проверить'}</button>
            </div>
            {validationText && <p className={`tw-validation ${validation}`}>{validation === 'ok' && <CheckCircle2 size={16} />}{validationText}</p>}

            {selected.id === 'knyazev' && <div className="tw-knyazev-mix-note">
               <strong>Микс включён автоматически</strong>
               <span><i>MiniMax 2.7</i><i>DeepSeek V4 Flash</i><i>Kimi 2.6</i></span>
              <p>Каждая из 24 проверок получает модель псевдослучайно. На диаграмме будет видно, какая модель обрабатывает каждый квадрат. Итоговый синтез собирает MiniMax 2.7.</p>
            </div>}
            {selected.id !== 'knyazev' && selected.models.length > 0 && <div className="tw-model-pills" aria-label="Выбор модели">
              {selected.models.map(model => <button key={model.label} className={value.model === model.value ? 'is-active' : ''} onClick={() => onChange({ ...value, model: model.value })}>{model.label}</button>)}
            </div>}
            <p className="tw-token-note">Полный режим делает 24 короткие независимые проверки и один итоговый синтез. Запросы идут очередями не быстрее 10 в минуту.</p>
            <p className="tw-security-note"><ShieldCheck size={17} /> Ключ хранится только в этой вкладке браузера и передаётся через Worker выбранному сервису. Worker не записывает его в отчёт или базу.</p>

            <details className="tw-advanced">
              <summary>Расширенные настройки</summary>
              <label>Base URL<input value={value.baseUrl} onChange={e => onChange({ ...value, baseUrl: e.target.value })} /></label>
              <label>Точное название модели<input value={value.model} onChange={e => onChange({ ...value, model: e.target.value })} /></label>
              {value.provider === 'anthropic' && <label>Глубина анализа<select value={value.effort || 'high'} onChange={e => onChange({ ...value, effort: e.target.value as ByokSettings['effort'] })}><option value="low">low · быстрее</option><option value="medium">medium</option><option value="high">high · рекомендуется</option><option value="xhigh">xhigh</option><option value="max">max · максимум</option></select></label>}
            </details>

            <div className="tw-guide-tabs">
              <button className={device === 'desktop' ? 'is-active' : ''} onClick={() => setDevice('desktop')}>Компьютер</button>
              <button className={device === 'phone' ? 'is-active' : ''} onClick={() => setDevice('phone')}>Телефон</button>
            </div>
            <div className={`tw-mini-guide ${device}`} style={{ '--provider-accent': selected.accent } as React.CSSProperties}>
              <div className="tw-mini-browser">
                <div className="tw-mini-browser-bar"><i /><i /><i /><span>{device === 'phone' ? selected.name : selected.keyUrl.replace(/^https?:\/\//, '').split('/')[0]}</span></div>
                <div className="tw-mini-browser-body">
                  <div className="tw-mini-nav">{selected.icon}<br />API</div>
                  <div className="tw-mini-panel"><b>{selected.screenTitle}</b><button>＋ {selected.createLabel}</button><div className="tw-mini-key">•••••••••••• <span>Копировать</span></div></div>
                </div>
              </div>
              <ol>{steps.map((step, index) => <li key={step}><span>{index + 1}</span><div>{step}</div></li>)}</ol>
            </div>
            {selected.keyUrl && <a className="tw-open-provider" href={selected.keyUrl} target="_blank" rel="noreferrer">Открыть страницу ключей <ChevronRight size={16} /></a>}

            <button className="tw-share-api" onClick={shareRequest}><Share2 size={17} /> {shareText}</button>
          </>
        )}

        <div className="tw-sheet-footer">
          <button className="tw-primary" onClick={onClose} disabled={value.mode === 'byok' && !value.key && !connections.length}>Готово</button>
          <small>Подписка на чат обычно не включает API. Создавайте отдельный ключ и ставьте лимит расходов.</small>
        </div>
      </aside>
    </div>
  );
};
