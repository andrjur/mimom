import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {LIMITS, validateDataset, trainClassifier, normalizeFeature, drawDemo} from './learning.js';
import {serializeClassifier, deserializeClassifier} from './project.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#lab-preview');
const video = $('#lab-video');
let nextId = 0;
const makeClass = name => ({id: ++nextId, name, samples: []});
const state = {classes: ['Крышка есть', 'Крышки нет', 'Объекта нет'].map(makeClass), encoder: null, loading: null, head: null,
  busy: '', stream: null, source: '', demoKind: 0, demoStep: 100, changedBackground: false, cancel: false, prediction: null, lastPrediction: 0};
const status = text => {$('#lab-status').textContent = text;};
const message = text => {$('#lab-message').textContent = text;};
const create = (tag, text, className) => {const el = document.createElement(tag);if(text !== undefined)el.textContent=text;if(className)el.className=className;return el;};
function releaseHead() {
  const previous = state.head;state.head = null;
  if (previous) {if(state.prediction) state.prediction.finally(() => previous.dispose());else previous.dispose();}
  $('#lab-save').disabled = true;
}
function changed() {releaseHead();renderScores();$('#lab-progress').value=0;$('#lab-training-status').textContent='Примеры изменились. Обучите модель на текущем наборе.';}
function resetDataset(names) {
  releaseHead();state.classes.forEach(item=>item.samples.forEach(sample=>sample.feature.dispose()));
  state.classes=names.map(makeClass);renderClasses();renderScores();$('#lab-progress').value=0;
}
function renderScores(values) {
  const target = $('#lab-scores');target.replaceChildren();
  state.classes.forEach((item, i) => {
    const row=create('div',undefined,'lab-score'), label=create('div',undefined,'lab-score-label');
    label.append(create('span', item.name || 'Без названия'), create('strong', values ? (values[i]*100).toFixed(1).replace('.',',')+'%' : 'Пока нет модели'));
    const bar=create('div',undefined,'lab-score-track'),fill=create('div',undefined,'lab-score-fill');
    fill.style.width=values?(values[i]*100)+'%':'0%';fill.style.background=['#34586b','#b76840','#58756a','#74659b','#9b7d37','#4c7f8a'][i];
    bar.append(fill);row.append(label,bar);target.append(row);
  });
}
function controls() {
  const busy=Boolean(state.busy);
  document.querySelectorAll('[data-lab-mutate]').forEach(el=>{el.disabled=busy;});
  document.querySelectorAll('[data-lab-capture]').forEach(el=>{el.disabled=busy||!state.stream;});
  document.querySelectorAll('[data-lab-remove]').forEach(el=>{el.disabled=busy||state.classes.length<=2;});
  $('#lab-add').disabled=busy||state.classes.length>=LIMITS.classes;
  $('#lab-stop-camera').disabled=!state.stream;
  $('#lab-cancel').hidden=!['recording','training','demo','upload'].includes(state.busy);
  $('#lab-save').disabled=busy||!state.head;
  $('#lab-test-file').disabled=busy||!state.head;
  $('#lab-live').disabled=busy||!state.stream;
  $('#lab-train').disabled=busy||state.classes.some(c=>c.samples.length<3);
}
function renderClasses() {
  const target=$('#lab-classes');target.replaceChildren();
  state.classes.forEach(item=>{
    const card=create('article',undefined,'lab-class');
    const top=create('div',undefined,'lab-class-top'),input=create('input');
    input.type='text';input.maxLength=60;input.value=item.name;input.setAttribute('aria-label','Название класса '+(state.classes.indexOf(item)+1));input.dataset.labMutate='';
    input.addEventListener('input',()=>{item.name=input.value;changed();});
    const count=create('span',item.samples.length+' кадров','lab-count');top.append(input,count);
    const actions=create('div',undefined,'lab-class-actions'),capture=create('button','Записать 10 кадров'),upload=create('label',undefined,'lab-file');
    capture.type='button';capture.dataset.labCapture='';capture.addEventListener('click',()=>collect(item));
    const file=create('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.multiple=true;file.dataset.labMutate='';file.setAttribute('aria-label','Добавить фотографии в класс '+item.name);
    const fileText=create('span','Добавить фото');upload.append(fileText,file);file.addEventListener('change',()=>uploadSamples(item,Array.from(file.files)));
    actions.append(capture,upload);
    const thumbs=create('div',undefined,'lab-thumbnails');item.samples.slice(-5).forEach(sample=>{const img=create('img');img.src=sample.thumbnail;img.alt='Собранный пример для класса '+item.name;thumbs.append(img);});
    const footer=create('div',undefined,'lab-class-footer'),clear=create('button','Очистить примеры'),remove=create('button','Удалить класс');
    clear.type=remove.type='button';clear.dataset.labMutate='';remove.dataset.labRemove='';
    clear.addEventListener('click',()=>{if(state.busy)return;item.samples.forEach(sample=>sample.feature.dispose());item.samples=[];changed();renderClasses();});
    remove.addEventListener('click',()=>{if(state.busy||state.classes.length<=2)return;item.samples.forEach(sample=>sample.feature.dispose());state.classes=state.classes.filter(c=>c!==item);changed();renderClasses();});
    footer.append(clear,remove);card.append(top,actions,thumbs,footer);target.append(card);
  });controls();
}
async function work(kind, fn) {
  if(state.busy)return;
  state.busy=kind;state.cancel=false;message('');controls();
  try {await fn();} catch(error) {console.error(error);message(error.message || 'Не удалось выполнить действие. Попробуйте другой файл или обновите страницу.');}
  finally {state.busy='';state.cancel=false;controls();}
}
async function encoder() {
  if(state.encoder)return state.encoder;
  if(!state.loading) state.loading=(async()=>{
    status('Загружаются компоненты обучения. При первом запуске это может занять время.');
    await tf.ready();
    if(!['webgl','cpu'].includes(tf.getBackend()))await tf.setBackend('cpu');
    const model=await mobilenet.load({version:2,alpha:1,modelUrl:new URL('model/model.json',location.href).href,inputRange:[0,1]});
    state.encoder=model;status('Обучение готово. Кадры обрабатываются только в этом браузере.');return model;
  })().catch(error=>{state.loading=null;throw new Error('Не удалось загрузить компоненты обучения. Проверьте соединение и повторите. '+error.message);});
  return state.loading;
}
function copyFrame(source) {
  const result=document.createElement('canvas');result.width=result.height=224;
  const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height;
  const side=Math.min(w,h);
  if(!side)throw new Error('Кадр ещё не готов. Дождитесь изображения.');
  result.getContext('2d').drawImage(source,(w-side)/2,(h-side)/2,side,side,0,0,224,224);
  return result;
}
async function addSample(item,source) {
  if(item.samples.length>=LIMITS.samplesPerClass)throw new Error('В одном классе можно оставить до 100 кадров. Для продолжения очистите ненужный набор.');
  const image=copyFrame(source),feature=normalizeFeature(await encoder(),image);
  try {await feature.data();item.samples.push({feature,thumbnail:image.toDataURL('image/jpeg',0.55)});}catch(error){feature.dispose();throw error;}
}
async function collect(item) {
  if(!state.stream)return;
  await work('recording',async()=>{
    changed();
    for(let n=0;n<10&&!state.cancel&&state.stream;n++){
      await addSample(item,video);renderClasses();status('Сбор примеров: '+item.name+'. Меняйте ракурс, сохраняя объект в квадрате.');
      await new Promise(resolve=>setTimeout(resolve,130));
    }
    status('Кадры собраны. Добавьте разные ракурсы и примеры для остальных классов.');
  });
}
async function uploadSamples(item,files) {
  if(!files.length)return;
  await work('upload',async()=>{
    if(files.length+item.samples.length>LIMITS.samplesPerClass)throw new Error('Для одного класса доступно до 100 кадров. Выберите меньше файлов.');
    if(files.some(file=>file.size>LIMITS.imageBytes))throw new Error('Размер одной фотографии должен быть не больше 15 МБ.');
    await encoder();changed();let skipped=0,added=0;
    for(const file of files){
      if(state.cancel)break;
      let image;
      try {image=await createImageBitmap(file);await addSample(item,image);added++;}catch(error){skipped++;console.warn('Image could not be read',error);}finally{image?.close();}
      renderClasses();await tf.nextFrame();
    }
    status('В класс «'+item.name+'» добавлено фотографий: '+added+'.'+(skipped?' Не удалось прочитать файлов: '+skipped+'. Используйте JPG, PNG или WebP.':''));
  });
}
function stopCamera() {
  state.stream?.getTracks().forEach(track=>track.stop());state.stream=null;video.srcObject=null;
  if(state.source==='camera')state.source='';
  if(state.busy==='recording')state.cancel=true;
  $('#lab-camera-state').textContent='Камера выключена';controls();
}
$('#lab-start-camera').addEventListener('click',()=>work('camera',async()=>{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Камера доступна на HTTPS или localhost. Можно добавить фотографии или открыть демо без камеры.');
  await encoder();
  if(state.stream){state.source='camera';return;}
  let stream;
  try {stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:{ideal:'environment'}},audio:false});}
  catch(error){throw new Error(error.name==='NotAllowedError'?'Доступ к камере не предоставлен. Разрешите его в настройках браузера или добавьте фотографии.':'Не удалось открыть камеру. Проверьте, доступна ли она в другом приложении, или добавьте фотографии.');}
  try {video.srcObject=stream;await video.play();state.stream=stream;state.source='camera';$('#lab-camera-state').textContent='Камера включена. Микрофон не используется';status('Камера готова. Запишите примеры для каждого класса.');}
  catch(error){stream.getTracks().forEach(track=>track.stop());video.srcObject=null;throw error;}
}));
$('#lab-stop-camera').addEventListener('click',stopCamera);
$('#lab-live').addEventListener('click',()=>{if(state.stream){state.source='camera';message('');}});
$('#lab-cancel').addEventListener('click',()=>{state.cancel=true;message('Останавливаем текущую операцию. Уже собранные кадры останутся в наборе.');});
$('#lab-add').addEventListener('click',()=>{if(state.busy||state.classes.length>=LIMITS.classes)return;state.classes.push(makeClass('Новый класс '+state.classes.length));changed();renderClasses();});
$('#lab-reset').addEventListener('click',()=>{if(state.busy)return;resetDataset(state.classes.map(item=>item.name));$('#lab-training-status').textContent='Набор очищен. Названия классов сохранены.';status('Примеры и обученная модель очищены. Можно собрать новый набор.');});
$('#lab-preset').addEventListener('change',event=>{
  if(state.busy)return;
  const names=event.target.value==='toothpick'?['Целая','Сломанная','Зубочистки нет']:['Крышка есть','Крышки нет','Объекта нет'];
  resetDataset(names);if(state.source==='demo')state.source='';$('#lab-demo-controls').hidden=true;
  $('#lab-training-status').textContent='Новый набор. Добавьте примеры в каждый класс.';status('Новый набор готов. Названия классов можно изменить.');
});
$('#lab-demo').addEventListener('click',()=>work('demo',async()=>{
  await encoder();stopCamera();releaseHead();state.classes.forEach(c=>c.samples.forEach(s=>s.feature.dispose()));
  state.classes=['Круг','Квадрат','Пустой кадр'].map(makeClass);state.source='demo';state.changedBackground=false;$('#lab-demo-background').checked=false;
  $('#lab-preset').value='';
  $('#lab-demo-controls').hidden=false;
  const picture=document.createElement('canvas');picture.width=picture.height=224;
  for(let kind=0;kind<3;kind++)for(let n=0;n<8&&!state.cancel;n++){
    drawDemo(picture,kind,n);await addSample(state.classes[kind],picture);renderClasses();status('Подготовка учебных рисунков: '+state.classes.reduce((sum,c)=>sum+c.samples.length,0)+' из 24.');await tf.nextFrame();
  }
  state.demoKind=0;renderScores();status('Демо использует синтетические рисунки. Нажмите «Обучить модель», затем переключайте фигуры и фон.');
}));
document.querySelectorAll('[data-lab-demo-kind]').forEach(button=>button.addEventListener('click',()=>{state.demoKind=Number(button.dataset.labDemoKind);state.demoStep++;state.source='demo';}));
$('#lab-demo-background').addEventListener('change',event=>{state.changedBackground=event.target.checked;});
$('#lab-train').addEventListener('click',()=>work('training',async()=>{
  validateDataset(state.classes);releaseHead();renderScores();$('#lab-progress').value=0;
  const epochs=Number($('#lab-epochs').value);
  const head=await trainClassifier(state.classes,{epochs,cancelled:()=>state.cancel,onEpochEnd:(epoch,total)=>{
    $('#lab-progress').value=epoch/total*100;$('#lab-training-status').textContent='Обучение: '+epoch+' из '+total+' проходов.';
  }});
  if(!head){$('#lab-training-status').textContent='Обучение остановлено. Можно изменить примеры и начать заново.';return;}
  state.head=head;$('#lab-training-status').textContent='Модель обучена на собранных примерах. Теперь проверьте её на новых кадрах.';status('Проверяйте новые ракурсы, пустую руку и другой фон. Высокий процент не гарантирует верный ответ.');
}));
$('#lab-test-file').addEventListener('change',event=>work('test',async()=>{
  const file=event.target.files[0];if(!file||!state.head)return;
  if(file.size>LIMITS.imageBytes)throw new Error('Выберите фотографию размером до 15 МБ.');
  const image=await createImageBitmap(file);const picture=copyFrame(image);image.close();
  state.source='photo';canvas.getContext('2d').drawImage(picture,0,0);await predict();
}));
$('#lab-save').addEventListener('click',()=>work('export',async()=>{
  if(!state.head)return;
  const project=await serializeClassifier(state.head,state.classes.map(c=>c.name));
  const url=URL.createObjectURL(new Blob([project],{type:'application/json'}));const link=create('a');link.href=url;link.download='indikov-image-model.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  message('Файл модели подготовлен. Он содержит названия классов и обученные веса, без фотографий. Это формат данного стенда, не экспорт Teachable Machine.');
}));
$('#lab-import').addEventListener('change',event=>work('import',async()=>{
  const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw new Error('Файл модели должен быть не больше 5 МБ.');
  await encoder();let project;
  try {project=await deserializeClassifier(await file.text());}catch(error){throw new Error('Не удалось открыть модель. '+error.message);}
  resetDataset(project.labels);state.head=project.head;$('#lab-preset').value='';$('#lab-training-status').textContent='Сохранённая модель открыта. Можно проверять новые кадры. Обучающие фотографии в файле отсутствуют.';
  message('Модель открыта. Чтобы обучить её заново, сначала добавьте примеры во все классы.');event.target.value='';
}));
async function predict() {
  const head=state.head;if(!head||!state.encoder||state.prediction)return;
  state.prediction=(async()=>{
    let result;
    try {result=tf.tidy(()=>head.predict(normalizeFeature(state.encoder,canvas).expandDims()));const values=Array.from(await result.data());if(state.head===head)renderScores(values);}
    catch(error){message('Не удалось проверить кадр. Обучите модель заново.');console.error(error);}
    finally {result?.dispose();}
  })();
  try {await state.prediction;} finally {state.prediction=null;}
}
function frame(time) {
  if(state.source==='camera'&&state.stream&&video.readyState>=2){const side=Math.min(video.videoWidth,video.videoHeight);canvas.getContext('2d').drawImage(video,(video.videoWidth-side)/2,(video.videoHeight-side)/2,side,side,0,0,224,224);}
  else if(state.source==='demo')drawDemo(canvas,state.demoKind,state.demoStep,state.changedBackground);
  if(state.source&&state.head&&!state.busy&&time-state.lastPrediction>220){state.lastPrediction=time;void predict();}
  requestAnimationFrame(frame);
}
window.addEventListener('pagehide',()=>{stopCamera();state.cancel=true;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.busy==='recording')state.cancel=true;});
const placeholder=canvas.getContext('2d');placeholder.fillStyle='#e7ece5';placeholder.fillRect(0,0,224,224);placeholder.fillStyle='#34586b';placeholder.font='15px Arial';placeholder.textAlign='center';placeholder.fillText('Здесь появится кадр',112,108);placeholder.fillText('из камеры или файла',112,130);
renderClasses();renderScores();requestAnimationFrame(frame);
status('Выберите камеру, фотографии или демо без камеры. Изображения останутся в этом браузере.');
