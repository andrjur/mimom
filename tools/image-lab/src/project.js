import * as tf from '@tensorflow/tfjs';
export async function serializeClassifier(head, labels) {
  let project;
  await head.save(tf.io.withSaveHandler(async artifacts => {
    const chunks=Array.isArray(artifacts.weightData)?artifacts.weightData:[artifacts.weightData];
    const data=new Uint8Array(chunks.reduce((n,chunk)=>n+chunk.byteLength,0));let offset=0;
    for(const chunk of chunks){data.set(new Uint8Array(chunk),offset);offset+=chunk.byteLength;}
    let binary='';for(let n=0;n<data.length;n+=8192)binary+=String.fromCharCode(...data.subarray(n,n+8192));
    project={format:'indikov-image-lab-v1',labels,baseModel:'mobilenet-v2-1.0-224',modelTopology:artifacts.modelTopology,weightSpecs:artifacts.weightSpecs,weightData:btoa(binary)};
    return {modelArtifactsInfo:tf.io.getModelArtifactsInfoForJSON(artifacts)};
  }));
  return JSON.stringify(project);
}
export async function deserializeClassifier(text) {
  if(text.length>5*1024*1024)throw new Error('Файл модели слишком большой. Допустимо до 5 МБ.');
  const project=JSON.parse(text);
  const fail=()=>{throw new Error('Нужен файл модели, сохранённый в этом стенде. Экспорт Google Teachable Machine имеет другой формат.');};
  if(project.format!=='indikov-image-lab-v1'||project.baseModel!=='mobilenet-v2-1.0-224')fail();
  if(!Array.isArray(project.labels)||project.labels.length<2||project.labels.length>6||project.labels.some(label=>typeof label!=='string'||!label.trim()||label.length>60))fail();
  if(new Set(project.labels.map(label=>label.trim().toLocaleLowerCase('ru'))).size!==project.labels.length)fail();
  const topology=project.modelTopology;
  const layers=topology?.config?.layers;
  if(topology?.class_name!=='Sequential'||!Array.isArray(layers)||layers.length!==2||layers.some(layer=>layer.class_name!=='Dense'))fail();
  if(layers[0].config.units!==64||layers[0].config.activation!=='relu'||layers[1].config.units!==project.labels.length||layers[1].config.activation!=='softmax')fail();
  if(layers[0].config.batch_input_shape?.[1]!==1280||!Array.isArray(project.weightSpecs)||project.weightSpecs.length!==4||typeof project.weightData!=='string')fail();
  const binary=atob(project.weightData), bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  const expected=(1280*64+64+64*project.labels.length+project.labels.length)*4;
  if(bytes.length!==expected)fail();
  const head=await tf.loadLayersModel(tf.io.fromMemory({modelTopology:topology,weightSpecs:project.weightSpecs,weightData:bytes.buffer}));
  if(head.inputs[0].shape[1]!==1280||head.outputs[0].shape[1]!==project.labels.length){head.dispose();fail();}
  return {head,labels:project.labels.map(label=>label.trim())};
}
