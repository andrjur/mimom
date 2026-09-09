import React, { useRef } from 'react';
import { Download, MessageCircleMore, Upload } from 'lucide-react';
import type { PersonaMode, TypistPersona } from '../typistTypes';

export const PERSONA_PRESETS: Record<Exclude<PersonaMode, 'custom'>, TypistPersona> = {
  kind: { mode: 'kind', name: 'Благожелательный спутник', emoji: '☀️', instructions: 'Говори тепло, уважительно и понятно. Поддерживай любопытство, но не скрывай сомнения и не приукрашивай вывод.' },
  troll: { mode: 'troll', name: 'Добрый тролль', emoji: '🧌', instructions: 'Добавляй игровую иронию и лёгкие подколы над идеями, но не оскорбляй человека. Диагностические факты, проценты и оговорки передавай буквально.' },
  dry: { mode: 'dry', name: 'Сухой архивариус', emoji: '📐', instructions: 'Отвечай нейтрально, кратко и структурно. Без метафор, эмоциональной оценки и мотивационной риторики.' }
};

export const DEFAULT_PERSONA = PERSONA_PRESETS.kind;

interface Props { value: TypistPersona; onChange: (value: TypistPersona) => void; }

export const PersonaStudio: React.FC<Props> = ({ value, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const selectMode = (mode: PersonaMode) => onChange(mode === 'custom' ? { mode, name: 'Мой персонаж', emoji: '🎭', instructions: '' } : PERSONA_PRESETS[mode]);
  const exportPersona = () => {
    const blob = new Blob([JSON.stringify({ format: 'indikov-persona', version: 1, persona: value }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${value.name.replace(/[^а-яёa-z0-9]+/gi, '-').toLowerCase() || 'persona'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importPersona = async (file?: File) => {
    if (!file || file.size > 64 * 1024) return;
    try {
      const parsed = JSON.parse(await file.text());
      const source = parsed?.persona || parsed;
      if (typeof source?.name !== 'string' || typeof source?.instructions !== 'string') return;
      onChange({ mode: 'custom', name: source.name.slice(0, 60), emoji: String(source.emoji || '🎭').slice(0, 8), instructions: source.instructions.slice(0, 1500) });
    } catch { /* Невалидный JSON не меняет текущего персонажа. */ }
  };

  return <section className="tw-persona-studio">
    <div className="tw-persona-heading"><MessageCircleMore size={20} /><div><span className="tw-kicker">Режим общения</span><b>{value.emoji} {value.name}</b><small>Это только интерпретатор формулировок. Он не меняет типирование, признаки и проценты.</small></div></div>
    <div className="tw-persona-modes" role="radiogroup" aria-label="Персонаж пояснений">
      {(['kind', 'troll', 'dry', 'custom'] as PersonaMode[]).map(mode => {
        const persona = mode === 'custom' ? { emoji: '🎭', name: 'Свой персонаж' } : PERSONA_PRESETS[mode];
        return <button key={mode} role="radio" aria-checked={value.mode === mode} className={value.mode === mode ? 'is-active' : ''} onClick={() => selectMode(mode)}><span>{persona.emoji}</span>{persona.name}</button>;
      })}
    </div>
    {value.mode === 'custom' && <div className="tw-persona-editor">
      <label>Имя персонажа<input value={value.name} maxLength={60} onChange={event => onChange({ ...value, name: event.target.value })} /></label>
      <label>Знак<input value={value.emoji} maxLength={8} onChange={event => onChange({ ...value, emoji: event.target.value })} /></label>
      <label>Как он говорит<textarea value={value.instructions} maxLength={1500} onChange={event => onChange({ ...value, instructions: event.target.value })} placeholder="Например: объясняет как добрый преподаватель, использует короткие аналогии…" /></label>
    </div>}
    <div className="tw-persona-files"><button onClick={exportPersona}><Download size={15} /> Экспорт персонажа</button><button onClick={() => fileRef.current?.click()}><Upload size={15} /> Импорт персонажа</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={event => { void importPersona(event.target.files?.[0]); event.currentTarget.value = ''; }} /></div>
  </section>;
};
