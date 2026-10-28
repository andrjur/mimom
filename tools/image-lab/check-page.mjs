import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(source,'../..');
const arg=process.argv.indexOf('--built'),root=arg<0?repo:path.resolve(repo,process.argv[arg+1]);
const html=fs.readFileSync(path.join(root,'image-lab/index.html'),'utf8');
for(const text of ['id="lab-classes"','id="lab-train"','id="lab-preview"','id="lab-demo"','id="lab-import"','src="lab.js"','href="lab.css"'])assert.ok(html.includes(text),text);
assert.ok(html.includes('audio')===false,'Microphone must not be requested by markup');
const sourceJs=fs.readFileSync(path.join(source,'src/app.js'),'utf8');
assert.ok(sourceJs.includes('audio:false')&&sourceJs.includes('getTracks().forEach(track=>track.stop())'));
assert.ok(!/localStorage|sessionStorage|sendBeacon|XMLHttpRequest/.test(sourceJs));
assert.ok(sourceJs.indexOf('getUserMedia({')>sourceJs.indexOf("$('#lab-start-camera').addEventListener('click'"));
const metadata=JSON.parse(fs.readFileSync(path.join(root,'image-lab/model/source.json'),'utf8'));
for(const file of metadata.files){const buffer=fs.readFileSync(path.join(root,'image-lab/model',file.file));assert.equal(buffer.length,file.bytes);assert.equal(createHash('sha256').update(buffer).digest('hex'),file.sha256);}
assert.ok(fs.existsSync(path.join(root,'image-lab/lab.js.LEGAL.txt')));
for(const file of ['src/app.js','src/learning.js','src/project.js','src/lab.css'])assert.ok(!fs.readFileSync(path.join(source,file),'utf8').includes(String.fromCharCode(8212)));
console.log('Passed: lab entry points, explicit camera action, microphone off, local image handling, model shards and bundled notices.');
