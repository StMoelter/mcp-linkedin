import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {env,platform} from './support/platform.mjs';
import {fixture,origin} from './support/fixture.mjs';
import {getChatGPTUser,requireChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../app/chatgpt-auth.ts';
import {configuration} from '../lib/linkedin/runtime.ts';
import Home from '../app/page.tsx';
import Layout,{metadata} from '../app/layout.tsx';
import {getDb} from '../db/index.ts';
const f=await fixture();
test.after(()=>f.mf.dispose());
test.beforeEach(async()=>{await f.reset();for(const k of Object.keys(env))delete env[k];platform.requestHeaders=new Headers();});
function user(extra={}){platform.requestHeaders=new Headers({'oai-authenticated-user-id':'alice','oai-authenticated-user-email':'alice@example.test',...extra});}
function ready(){Object.assign(env,{SITE_ORIGIN:origin,LINKEDIN_CLIENT_ID:'client',LINKEDIN_CLIENT_SECRET:'secret',TOKEN_ENCRYPTION_KEY:f.key,LINKEDIN_API_VERSION:'202605',DB:f.db});}
async function page(result){return renderToStaticMarkup(await Home({searchParams:Promise.resolve({result})}));}
test('ChatGPT identity requires ID and email and safely decodes verified names',async()=>{
 assert.equal(await getChatGPTUser(),null);platform.requestHeaders=new Headers({'oai-authenticated-user-id':'alice'});assert.equal(await getChatGPTUser(),null);
 user();assert.deepEqual(await getChatGPTUser(),{userId:'alice',displayName:'alice@example.test',email:'alice@example.test',fullName:null});
 user({'oai-authenticated-user-full-name':'Alice%20Example','oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8'});assert.equal((await getChatGPTUser()).displayName,'Alice Example');
 user({'oai-authenticated-user-full-name':'%ZZ','oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8'});assert.equal((await getChatGPTUser()).fullName,null);
 user({'oai-authenticated-user-full-name':'Alice'});assert.equal((await getChatGPTUser()).fullName,null);
 assert.equal((await requireChatGPTUser('/')).userId,'alice');platform.requestHeaders=new Headers();await assert.rejects(requireChatGPTUser('/account'),/Redirect: \/signin-with-chatgpt\?return_to=%2Faccount/);
});
test('authentication return paths prevent open redirects and reserved auth loops',()=>{
 assert.equal(chatGPTSignInPath('/account?q=1#section'),'/signin-with-chatgpt?return_to=%2Faccount%3Fq%3D1%23section');
 for(const path of ['https://evil.test','//evil.test','/\\evil.test','/\\[bad]','/signin-with-chatgpt','/signout-with-chatgpt','/callback','/\ud800']){
  const result=chatGPTSignInPath(path);assert.ok(result.startsWith('/signin-with-chatgpt?return_to='));if(path!=='/\ud800')assert.equal(result,'/signin-with-chatgpt?return_to=%2F');
 }
 assert.equal(chatGPTSignOutPath(),'/signout-with-chatgpt?return_to=%2F');assert.equal(chatGPTSignOutPath('/account'),'/signout-with-chatgpt?return_to=%2Faccount');
});
test('runtime uses environment values and defaults and requires D1 for the Drizzle adapter',()=>{
 const empty=configuration();assert.equal(empty.origin,'');assert.equal(empty.encryptionKey,'');assert.throws(getDb,/Cloudflare D1 binding/);
 ready();assert.equal(configuration().origin,origin);assert.ok(getDb());
});
test('minimal UI renders anonymous login, setup requirement, and callback address',async()=>{
 assert.match(await page(),/Mit ChatGPT anmelden/);user();env.SITE_ORIGIN=origin;assert.match(await page(),/Die LinkedIn-App muss noch eingerichtet werden/);assert.match(await page(),/https:\/\/example.test\/auth\/linkedin\/callback/);
});
test('UI renders connection lifecycle, reconnection, errors, and safe notices',async()=>{
 user();ready();assert.match(await page(),/Verbinde dein eigenes LinkedIn-Konto/);
 await f.seed();assert.match(await page('connected'),/LinkedIn wurde verbunden/);assert.match(await page(),/Verbindung entfernen/);assert.match(await page(),/Member alice/);
 await f.seed('alice',{expiresAt:0});assert.match(await page(),/Deine Anmeldung muss erneuert werden/);
 assert.match(await page('disconnected'),/Die gespeicherte Verbindung wurde entfernt/);assert.match(await page('declined'),/Die LinkedIn-Verbindung wurde abgebrochen/);assert.doesNotMatch(await page('<script>'),/<script>/);
 env.DB={prepare(){throw new Error('private');}};assert.match(await page(),/Die Verbindung konnte nicht geladen werden/);
});
test('page layout retains German document language and LinkedIn metadata',()=>{
 const html=renderToStaticMarkup(Layout({children:React.createElement('p',null,'test')}));assert.match(html,/<html lang="de">/);assert.match(html,/<p>test<\/p>/);assert.equal(metadata.title,'LinkedIn API');
});
test('route exports pass actual requests through the runtime adapter',async()=>{
 ready();
 for(const [path,module,method] of [
  ['/mcp','../app/mcp/route.ts','POST'],
  ['/api/linkedin/status','../app/api/linkedin/status/route.ts','GET'],
  ['/auth/linkedin/start','../app/auth/linkedin/start/route.ts','POST'],
  ['/auth/linkedin/callback','../app/auth/linkedin/callback/route.ts','GET'],
  ['/auth/linkedin/disconnect','../app/auth/linkedin/disconnect/route.ts','POST']]){
  const route=await import(module);const options={method,headers:{origin}};if(path==='/mcp')options.body=JSON.stringify({jsonrpc:'2.0',id:1,method:'ping'});
  const r=await route[method](f.request(path,'alice',options));assert.ok([200,303,403].includes(r.status));
 }
 const mcp=await import('../app/mcp/route.ts');assert.equal((await mcp.GET(f.request('/mcp'))).status,405);
});
