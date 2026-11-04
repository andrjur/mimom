// Release the device without changing collected samples or the trained model.
export function releaseCamera(state, video) {
  const stream = state.stream;
  state.stream = null;
  stream?.getTracks().forEach(track => track.stop());
  video.pause();
  video.srcObject = null;
  if (state.source === 'camera') state.source = '';
  if (state.busy === 'recording') state.cancel = true;
  return Boolean(stream);
}
