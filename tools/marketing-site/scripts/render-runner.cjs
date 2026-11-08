// Transform only project modules in memory. Avoid native directory traversal
// outside a restricted Windows workspace during a bundled build.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.join(root,'node_modules/esbuild'));
const original=require.extensions['.js'];
function compile(module,filename){
 if(filename.startsWith(root+path.sep)&&!filename.includes(path.sep+'node_modules'+path.sep)){
  const code=esbuild.transformSync(fs.readFileSync(filename,'utf8'),{loader:'jsx',format:'cjs',jsx:'automatic',sourcefile:filename,target:'node22'}).code;
  module._compile(code,filename);
 }else original(module,filename);
}
require.extensions['.js']=compile;
require.extensions['.jsx']=compile;
require('./render.jsx');
