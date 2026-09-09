import assert from 'node:assert/strict';
import { normalizeRemoteResult } from '../services/typistApi';
import { toLegacyResult } from '../components/LegacyResultAdapter';
const normalized = normalizeRemoteResult({ result: { tim: { abbreviation: 'ИЛЭ', name: 'Дон Кихот' }, confidence: 0, alternatives: [{ probability: 0, confidence: 88 }] }, probeResults: [
 { probeId: 'reinin-si', label: 'Сенсорика / Интуиция', pole: 'insufficient', confidence: 0, evidence: [{ quote: 'люблю читать' }] },
 { probeId: 'reinin-cf', label: 'Беспечность / Предусмотрительность', pole: 'insufficient', confidence: 0 },
 { probeId: 'quadra-spirit', label: 'Дух квадры', leading: 'insufficient', confidence: 0 },
 { probeId: 'reinin-vs', label: 'Весёлость / Серьёзность', pole: 'Весёлость', confidence: 61 }
] });
assert.equal(normalized.confidence, 0);
assert.equal(normalized.alternatives[0].probability, 0);
const legacy = toLegacyResult(normalized);
assert.equal(legacy.dichotomies.length, 16);
assert.equal(legacy.dichotomies.find(d => d.name === 'Интуиция / Сенсорика')?.confidence, 0);
assert.match(legacy.dichotomies.find(d => d.name === 'Интуиция / Сенсорика')!.justification_pole1, /люблю читать/);
assert.equal(legacy.dichotomies.find(d => d.name === 'Субъективизм / Объективизм')?.result, 'Субъективизм');
assert.equal(legacy.dichotomies.find(d => d.name === 'Квадра')?.result, 'Недостаточно данных');
assert.equal(normalizeRemoteResult({}).confidence, 0);
console.log('PASS: zero is zero; missing is missing; 15 traits + quadra; aliases and evidence preserved');
