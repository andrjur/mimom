import fs from 'node:fs';
import ts from '../app/node_modules/typescript/lib/typescript.js';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const ai=read('ai-rotation.ts').replace("import {createHash} from 'node:crypto';",'');
const social=read('social.ts');
const worker=read('worker.ts').replace(/import .* from '\.\/ai-rotation';\r?\n/,'').replace(/import .* from '\.\/social';\r?\n/,'');
fs.writeFileSync(new URL('worker.mjs',import.meta.url),ts.transpileModule(ai+'\n'+social+'\n'+worker,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
