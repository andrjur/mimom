import * as tf from '@tensorflow/tfjs';

export const LIMITS = {classes: 6, samplesPerClass: 100, imageBytes: 15 * 1024 * 1024};
export function validateDataset(classes) {
  if (classes.length < 2 || classes.length > LIMITS.classes) throw new Error('Нужно от двух до шести классов.');
  const names = classes.map(c => c.name.trim());
  if (names.some(name => !name)) throw new Error('Назовите каждый класс.');
  if (new Set(names.map(name => name.toLocaleLowerCase('ru'))).size !== names.length) throw new Error('Названия классов должны различаться.');
  if (classes.some(c => c.samples.length < 3)) throw new Error('Добавьте хотя бы три примера в каждый класс. Для своего объекта лучше собрать 30–50 разных кадров.');
  return names;
}

export async function trainClassifier(classes, {epochs = 30, onEpochEnd, cancelled = () => false} = {}) {
  validateDataset(classes);
  const samples = classes.flatMap((c, i) => c.samples.map(sample => ({feature: sample.feature, label: i})));
  const width = samples[0].feature.size;
  if (samples.some(sample => sample.feature.size !== width)) throw new Error('Примеры имеют несовместимый формат. Очистите набор и соберите его заново.');
  const xs = tf.stack(samples.map(sample => sample.feature));
  const ys = tf.tidy(() => tf.oneHot(tf.tensor1d(samples.map(sample => sample.label), 'int32'), classes.length));
  const head = tf.sequential();
  const optimizer = tf.train.adam(0.01);
  head.add(tf.layers.dense({inputShape: [width], units: 64, activation: 'relu'}));
  head.add(tf.layers.dense({units: classes.length, activation: 'softmax'}));
  head.compile({optimizer, loss: 'categoricalCrossentropy'});
  try {
    await head.fit(xs, ys, {epochs, batchSize: Math.min(16, samples.length), shuffle: true, yieldEvery: 'batch', callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (cancelled()) head.stopTraining = true;
        await onEpochEnd?.(epoch + 1, epochs, logs);
        await tf.nextFrame();
      }
    }});
    if (cancelled()) {head.dispose(); return null;}
    return head;
  } catch (error) {head.dispose(); throw error;}
  finally {xs.dispose(); ys.dispose(); optimizer.dispose();}
}

export function normalizeFeature(encoder, image) {
  return tf.tidy(() => {
    const raw = encoder.infer(image, true).flatten();
    return raw.div(raw.norm().add(1e-7));
  });
}

export function drawDemo(canvas, kind, variation = 0, changedBackground = false) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.fillStyle = changedBackground ? '#394655' : '#eee9dd';
  ctx.fillRect(0, 0, size, size);
  const jitter = ((variation * 13) % 19) - 9;
  const x = size / 2 + jitter;
  const y = size / 2 + ((variation * 7) % 15) - 7;
  const radius = size * (0.22 + (variation % 3) * 0.012);
  ctx.fillStyle = variation % 2 ? '#ba633b' : '#b16b45';
  if (kind === 0) {ctx.beginPath();ctx.arc(x, y, radius, 0, Math.PI * 2);ctx.fill();}
  if (kind === 1) ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
