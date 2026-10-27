import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { validateProbe, rankTypes, buildScoredResult, runCompactPipeline } from '../cloudflare-worker/compact-pipeline.js';
import { TIM_DEFINITIONS } from '../cloudflare-worker/tim-definitions.js';
import { resolveProvider, includedReady, textEndpoint, textRequestBody } from '../cloudflare-worker/providers.js';

const source = fs.readFileSync(new URL('../cloudflare-worker/worker.js', import.meta.url), 'utf8');
const scope = {};
vm.runInNewContext(source.slice(source.indexOf('const REININ_PROBES ='), source.indexOf('const delay =')) + ';this.definitions = ALL_PROBES;', scope);
const definitions = Array.from(scope.definitions);
const traits = definitions.filter(item => item.kind === 'reinin');
const poleFor = (type, probe) => probe.id === 'reinin-ms' ? (type['Субъективизм / Объективизм'] === 'Субъективизм' ? 'Весёлость' : 'Серьёзность') : type[probe.label] || type[probe.label.split(' / ').reverse().join(' / ')];
const material = traits.map((item, index) => `Реальный пример номер ${index + 1}: я сделал выбор в конкретной ситуации.`).join('\n');
const observations = abbreviation => traits.map((probe, index) => validateProbe({ probeId: probe.id, pole: poleFor(TIM_DEFINITIONS[abbreviation], probe), confidence: 95, evidence: [{ quote: material.split('\n')[index], observation: 'Тестовое наблюдение.' }] }, probe, material));

for (const abbreviation of Object.keys(TIM_DEFINITIONS)) {
  const score = rankTypes(observations(abbreviation), definitions);
  assert.equal(score.ranked[0].abbreviation, abbreviation, `table roundtrip ${abbreviation}`);
  assert.equal(score.resolved, true, abbreviation);
  assert.equal(score.ranked[0].score, 90, 'all 15 table poles align including reversed labels');
}
const unknown = buildScoredResult([], definitions);
assert.equal(unknown.tim.abbreviation, '');
assert.equal(unknown.confidence, 0);
assert.equal(unknown.alternatives.length, 0);
assert.equal(unknown.randomFallback, false);
assert.equal(unknown.observations.length, 0, 'Missing evidence cannot create a fallback quote');
assert.ok(unknown.nextQuestions.length);
const neutral = observations('ИЛЭ').map(item => ({ ...item, confidence: 50 }));
assert.equal(rankTypes(neutral, definitions).coverage, 0, '50 is neutral');
const fabricated = validateProbe({ probeId: traits[0].id, pole: traits[0].poleA, confidence: 100, evidence: [{ quote: 'Цитата, которой в источнике никогда не было.' }] }, traits[0], material);
assert.equal(fabricated.confidence, 0);
assert.equal(fabricated.pole, 'insufficient');
const reused = observations('ИЛЭ').map(item => ({ ...item, evidence: [{ quote: material.split('\n')[0], quoteVerified: true }] }));
assert.equal(rankTypes(reused, definitions).resolved, false, 'repeating one quote is not 15 independent observations');
const locked = rankTypes(observations('ИЛЭ'), definitions, { 'Экстраверсия / Интроверсия': 'Интроверсия' });
assert.ok(locked.ranked.every(row => TIM_DEFINITIONS[row.abbreviation]['Экстраверсия / Интроверсия'] === 'Интроверсия'));
assert.equal(rankTypes([], definitions, { 'Экстраверсия / Интроверсия': 'Интроверсия' }).resolved, false, 'locks do not create evidence');
const report = buildScoredResult(observations('ИЛЭ'), definitions, {}, { tim: { abbreviation: 'СЭЭ' }, observations: [{ quote: 'Придуманная цитата', observation: 'Нет' }] });
assert.equal(report.tim.abbreviation, 'ИЛЭ', 'writer cannot rerank');
assert.equal(report.observations.length, 4, 'Unsupported writer quotes fall back to verified excerpts');
assert.ok(report.observations.every(item => material.includes(item.quote)));
assert.equal(report.observations.some(item => item.quote === 'Придуманная цитата'), false);
assert.equal(buildScoredResult(reused, definitions).observations.length, 1, 'The same fallback quote is shown only once');

const dewiar = resolveProvider({}, { mode: 'byok', provider: 'dewiar', key: 'fixture-dewiar-key' });
assert.equal(textEndpoint(dewiar), 'https://dewiar.com/API/api');
assert.equal(textRequestBody(dewiar, dewiar.model, 'test').response_format, undefined);
assert.equal(textRequestBody(dewiar, dewiar.model, 'test').stream, false);
assert.equal(includedReady({ INCLUDED_PROVIDER: 'dewiar', KNYAZEV_API_KEY: 'fixture-key' }), false);
assert.equal(includedReady({ INCLUDED_PROVIDER: 'dewiar', DEWIAR_API_KEY: 'fixture-key' }), true);
for (const provider of ['polza', 'vsegpt']) assert.match(textEndpoint(resolveProvider({}, { mode: 'byok', provider, key: 'fixture-key' })), /\/v1\/chat\/completions$/);

let requests = 0, failReport = false, failGroup = false;
const events = [];
const fakeCall = async (_config, prompt) => {
  requests++;
  if (prompt.startsWith('Объясни только')) {
    assert.equal(prompt.includes(material), false, 'writer does not receive original transcript');
    if (failReport) throw new Error('UPSTREAM_524');
    return { observations: [{ quote: material.split('\n')[0], observation: 'Подтверждённое наблюдение.' }] };
  }
  const group = JSON.parse(prompt.match(/ШКАЛЫ: (.+)\n/)[1]);
  if (failGroup && group[0].id === 'reinin-ei') throw new Error('UPSTREAM_524');
  return { probes: group.map(probe => {
    const index = traits.findIndex(item => item.id === probe.id);
    return { probeId: probe.id, pole: index >= 0 ? poleFor(TIM_DEFINITIONS['ИЛЭ'], probe) : undefined, leading: 'Альфа', manifestation: 'mixed', confidence: 95, evidence: [{ quote: material.split('\n')[Math.max(0, index)], observation: 'Основание.' }] };
  }) };
};
const run = () => runCompactPipeline({ env: {}, providers: [dewiar], text: material, audioContext: '', locks: {}, definitions, diagnostics: { traceId: 'fixture' }, callModel: fakeCall, chooseProvider: items => items[0], claimSlot: async () => {}, emit: async (_env, _id, entry) => events.push(entry) });
let pipeline = await run();
assert.equal(requests, 5);
assert.equal(pipeline.probeResults.length, 24);
assert.equal(pipeline.result.tim.abbreviation, 'ИЛЭ');
assert.equal(pipeline.result.observations.length, 1);
assert.equal(events.filter(item => item.stage?.status === 'done').length, 25);
failReport = true;
pipeline = await run();
assert.equal(pipeline.result.tim.abbreviation, 'ИЛЭ', 'failed writer preserves computed result');
assert.equal(pipeline.result.observations.length, 4, 'Failed writer keeps verified excerpts visible');
assert.ok(pipeline.result.observations.every(item => material.includes(item.quote)));
assert.equal(pipeline.stages.at(-1).status, 'warning');
failGroup = true;
pipeline = await run();
assert.equal(pipeline.result.confidenceLevel, 'insufficient', 'failed basis pack cannot make a confident type');
assert.equal(pipeline.probeResults.filter(item => item.status === 'warning').length, 5);
console.log('PASS: 16 type roundtrips; neutral/missing/fabricated/reused evidence; locks; immutable ranking; 5 requests; partial failure; Dewiar endpoint and selected-provider readiness');
