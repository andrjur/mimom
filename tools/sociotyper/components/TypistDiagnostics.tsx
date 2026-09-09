import React, { useMemo, useState } from 'react';
import { Download, ScrollText } from 'lucide-react';
import type { ProbeResult } from '../typistTypes';

export const LogConsole: React.FC<{ logs?: string[]; name: string }> = ({ logs = [], name }) => {
  const save = () => {
    const blob = new Blob([logs.join('\n')], { type: 'application/x-ndjson;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name.replace(/[^a-zа-я0-9_-]+/gi, '_')}-typist-logs.ndjson`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return <section className="tw-log-console">
    <header><span><ScrollText size={15} /> Живой журнал · до 1 МБ</span><button onClick={save} disabled={!logs.length}><Download size={14} /> Сохранить логи</button></header>
    <pre>{logs.length ? logs.join('\n') : '{"status":"waiting","message":"Журнал появится после запуска"}'}</pre>
  </section>;
};

export const ProbeArchive: React.FC<{ probes?: ProbeResult[] }> = ({ probes = [] }) => {
  const [selected, setSelected] = useState<ProbeResult | null>(null);
  const rows = useMemo(() => Array.from({ length: 24 }, (_, index) => probes[index] || ({
    probeId: `empty-${index}`, label: `Проверка ${index + 1}`, status: 'warning', error: 'Ответ не получен'
  } as ProbeResult)), [probes]);
  return <section className="tw-probe-archive">
    <header><div><b>24 независимые проверки</b><span>Наведите или нажмите на квадрат — откроется сырой JSON ответа.</span></div><small>{probes.filter(item => item.status === 'done').length}/24</small></header>
    <div className="tw-probe-archive-grid">
      {rows.map((probe, index) => <button
        key={`${probe.probeId}-${index}`}
        className={`${probe.status} model-${String(probe.model || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        onMouseEnter={() => setSelected(probe)} onFocus={() => setSelected(probe)} onClick={() => setSelected(probe)}
        aria-label={`${index + 1}. ${probe.label}`}
      ><span>{index + 1}</span><i>{probe.model?.includes('kimi') ? 'K' : probe.model?.includes('deepseek') ? 'D' : probe.model?.includes('minimax') ? 'M' : '•'}</i></button>)}
    </div>
    {selected && <div className="tw-probe-json"><b>{selected.label} · {selected.provider || 'провайдер'} · {selected.model || 'модель'}</b><pre>{JSON.stringify(selected, null, 2)}</pre></div>}
  </section>;
};
