import test from 'node:test';
import assert from 'node:assert/strict';
import * as tf from '@tensorflow/tfjs';
import {validateDataset,trainClassifier} from '../src/learning.js';
import {serializeClassifier,deserializeClassifier} from '../src/project.js';
await tf.setBackend('cpu');
const data=()=>[0,1,2].map((label)=>({name:['Крышка есть','Крышки нет','Объекта нет'][label],samples:Array.from({length:4},()=>({feature:tf.oneHot(tf.scalar(label,'int32'),3)}))}));
const dispose=classes=>classes.forEach(c=>c.samples.forEach(s=>s.feature.dispose()));

test('incomplete or ambiguous labels cannot train a misleading classifier',()=>{
  const classes=data();
  try {assert.equal(validateDataset(classes).length,3);classes[2].name='крышка есть';assert.throws(()=>validateDataset(classes),/различаться/);classes[2].name='Пусто';classes[2].samples.splice(0,2).forEach(s=>s.feature.dispose());assert.throws(()=>validateDataset(classes),/три примера/);}finally{dispose(classes);}
});
test('real training separates three classes and cancellation leaves no head or training tensors',async()=>{
  const classes=data();const before=tf.memory().numTensors;let cancel=false;
  const stopped=await trainClassifier(classes,{epochs:10,cancelled:()=>cancel,onEpochEnd:()=>{cancel=true;}});
  assert.equal(stopped,null);assert.equal(tf.memory().numTensors,before);
  const head=await trainClassifier(classes,{epochs:25});
  try {for(let i=0;i<3;i++){
    const prediction=tf.tidy(()=>head.predict(classes[i].samples[0].feature.expandDims()));
    const scores=Array.from(await prediction.data());prediction.dispose();
    assert.equal(scores.indexOf(Math.max(...scores)),i);assert.ok(scores[i]>.9);
  }}finally{head.dispose();dispose(classes);}
});
test('saved classifier round-trips without including example images and rejects other formats',async()=>{
  const head=tf.sequential({layers:[tf.layers.dense({inputShape:[1280],units:64,activation:'relu'}),tf.layers.dense({units:3,activation:'softmax'})]});
  const input=tf.ones([1,1280]);let restored;
  try {
    const text=await serializeClassifier(head,['Целая','Сломанная','Нет']);assert.ok(!text.includes('data:image'));
    restored=await deserializeClassifier(text);assert.deepEqual(restored.labels,['Целая','Сломанная','Нет']);
    const a=head.predict(input),b=restored.head.predict(input);assert.deepEqual(Array.from(await a.data()),Array.from(await b.data()));a.dispose();b.dispose();
    await assert.rejects(deserializeClassifier('{"format":"teachable-machine"}'),/другой формат/);
    const corrupt=JSON.parse(text);corrupt.labels=['Одинаковый','одинаковый','Нет'];await assert.rejects(deserializeClassifier(JSON.stringify(corrupt)));
  } finally {input.dispose();head.dispose();restored?.head.dispose();}
});
