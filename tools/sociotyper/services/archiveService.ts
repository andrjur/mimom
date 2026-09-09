import { strToU8, zipSync } from 'fflate';
import type { PersonSession } from '../typistTypes';

const safeName = (value: string) => value.replace(/[^а-яёa-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'participant';

export function resultAsMarkdown(session: PersonSession) {
  const result = session.result;
  const lines = [
    `# Типирование: ${session.name}`,
    '',
    `Дата экспорта: ${new Date().toLocaleString('ru-RU')}`,
    `Источник результата: ${result?.source === 'ai' ? 'ИИ-анализ' : 'локальная предварительная гипотеза'}`,
    '',
    `## Основная гипотеза`,
    '',
    result ? `**${result.tim.name} (${result.tim.abbreviation})** — уверенность ${result.confidence}%` : 'Результата пока нет.',
    '',
    result?.summary || '',
    '',
    '## Сомнения',
    '',
    ...(result?.doubts?.length ? result.doubts.map(item => `- ${item}`) : ['- Не указаны']),
    '',
    '## Ответы',
    '',
    session.text || 'Ответы не введены.',
    '',
    '## Шкалы',
    '',
    '| Шкала | Вывод | Уверенность |',
    '|---|---|---:|',
    ...(result?.dichotomies || []).map(item => `| ${item.name} | ${item.result} | ${item.confidence}% |`),
    ''
  ];
  return lines.join('\n');
}

export async function downloadSessionArchive(session: PersonSession) {
  const entries: Record<string, Uint8Array> = {
    '00_README.md': strToU8(resultAsMarkdown(session)),
    '01_data.json': strToU8(JSON.stringify({ ...session, audio: session.audio.map(({ blob: _blob, ...audio }) => audio) }, null, 2))
  };
  for (let i = 0; i < session.audio.length; i += 1) {
    const audio = session.audio[i];
    if (!audio.blob) continue;
    const bytes = new Uint8Array(await audio.blob.arrayBuffer());
    entries[`audio/${String(i + 1).padStart(2, '0')}_${safeName(audio.name)}`] = bytes;
  }
  const zipped = zipSync(entries, { level: 6 });
  const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `typology_${safeName(session.name)}_${new Date().toISOString().slice(0, 10)}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
