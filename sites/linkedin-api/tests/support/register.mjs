import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const platform=new URL('./platform.mjs',import.meta.url).href;
registerHooks({
 resolve(specifier,context,next){
  if(['cloudflare:workers','next/headers','next/navigation'].includes(specifier))return {url:platform,shortCircuit:true};
  if(specifier.startsWith('@/'))specifier=new URL('../../'+specifier.slice(2),import.meta.url).href;
  if(specifier.startsWith('.')||specifier.startsWith('file:')){
   const url=new URL(specifier,context.parentURL);
   for(const extension of ['.ts','.tsx'])if(existsSync(fileURLToPath(url)+extension))return {url:url.href+extension,shortCircuit:true};
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.endsWith('.css'))return {format:'module',shortCircuit:true,source:'export default {};'};
  if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{fileName:fileURLToPath(url),compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,inlineSourceMap:true,inlineSources:true}}).outputText};
  return next(url,context);
 }
});
