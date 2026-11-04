import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseCamera} from '../src/camera.js';

test('stopping releases every track and preserves examples and the trained classifier', () => {
  let stopped = 0, paused = 0;
  const classes = [{name: 'Крышка есть', samples: [{feature: {}}]}];
  const head = {trained: true};
  const state = {stream: {getTracks: () => [{stop: () => stopped++}, {stop: () => stopped++}]},
    source: 'camera', classes, head, busy: 'recording', cancel: false};
  const video = {srcObject: state.stream, pause: () => paused++};
  assert.equal(releaseCamera(state, video), true);
  assert.equal(stopped, 2);
  assert.equal(paused, 1);
  assert.equal(state.stream, null);
  assert.equal(video.srcObject, null);
  assert.equal(state.source, '');
  assert.equal(state.cancel, true);
  assert.equal(state.classes, classes);
  assert.equal(state.classes[0].samples.length, 1);
  assert.equal(state.head, head);
  assert.equal(releaseCamera(state, video), false);
  assert.equal(stopped, 2);
});

test('releasing a camera does not cancel model training or discard a test photo', () => {
  const state = {stream: null, source: 'photo', busy: 'training', cancel: false};
  releaseCamera(state, {pause() {}, srcObject: null});
  assert.equal(state.source, 'photo');
  assert.equal(state.busy, 'training');
  assert.equal(state.cancel, false);
});
