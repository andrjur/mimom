import type { StoredAudio } from '../typistTypes';
import { fileToBase64 } from './typistApi';

export async function prepareAudio(item: StoredAudio, onProgress: (percent: number) => void) {
  if (!item.blob) throw new Error(`Файл ${item.name} недоступен. Прикрепите его ещё раз.`);
  onProgress(5);
  const bytes = await item.blob.arrayBuffer();
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await context.decodeAudioData(bytes); }
  catch { throw new Error(`Браузер не смог прочитать ${item.name}. Загрузите WAV или MP3.`); }
  finally { await context.close(); }
  const sampleRate = 16000;
  const length = Math.ceil(decoded.duration * sampleRate);
  if (length * 2 > 24 * 1024 * 1024) throw new Error(`Запись ${item.name} слишком длинная. Разделите её на части до 12 минут.`);
  onProgress(35);
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const word = (offset: number, value: string) => Array.from(value).forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  word(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); word(8, 'WAVE'); word(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767)), true));
  onProgress(80);
  return { name: item.name + '.wav', mimeType: 'audio/wav', base64: await fileToBase64(new Blob([buffer], { type: 'audio/wav' }), percent => onProgress(80 + percent * .2)) };
}
