import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {Miniflare,database,origin} from './support/fixture.mjs';
import {randomSecret} from '../lib/linkedin/crypto.ts';
const paths={server:fileURLToPath(new URL('../dist/server/',import.meta.url)),client:fileURLToPath(new URL('../dist/client/',import.meta.url))};
let posts=0;
let uncertain=false;
const outbound=[];
const mf=new Miniflare({
 name:'linkedin-e2e',
 modules:readdirSync(paths.server,{recursive:true}).filter(file=>/\.(m?js)$/.test(file)).sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b)).map(file=>({type:'ESModule',path:path.join(paths.server,file)})),modulesRoot:paths.server,
 modulesRules:[{type:'ESModule',include:['**/*.js','**/*.mjs']}],
 compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
 assets:{workerName:'linkedin-e2e',directory:paths.client,binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}},d1Databases:['DB'],
 bindings:{SITE_ORIGIN:origin,LINKEDIN_CLIENT_ID:'e2e-client',LINKEDIN_CLIENT_SECRET:'e2e-secret',TOKEN_ENCRYPTION_KEY:randomSecret(),LINKEDIN_API_VERSION:'202605'},
 outboundService:async request=>{
  outbound.push(request.url);
  const url=new URL(request.url);
  if(url.href==='https://www.linkedin.com/oauth/v2/accessToken'){
   const parameters=new URLSearchParams(await request.text());
   assert.equal(parameters.get('client_secret'),'e2e-secret');assert.equal(parameters.get('redirect_uri'),origin+'/auth/linkedin/callback');
   return Response.json({access_token:'token-'+parameters.get('code'),expires_in:3600,scope:'openid profile w_member_social'});
  }
  const token=request.headers.get('authorization')?.replace('Bearer token-','');
  assert.ok(['alice','bob'].includes(token));
  if(url.href==='https://api.linkedin.com/v2/userinfo')return Response.json({sub:'member-'+token,name:'Name '+token});
  if(url.href==='https://api.linkedin.com/rest/posts'){
   const body=await request.json();assert.equal(body.author,'urn:li:person:member-'+token);assert.equal(body.visibility,'PUBLIC');posts++;
   if(uncertain)return new Response(null,{status:503});
   return new Response(null,{status:201,headers:{'x-restli-id':'urn:li:share:'+posts}});
  }
  assert.fail('E2E forbids unexpected outbound traffic: '+url.origin);
 }
});
const db=await database(mf);
test.after(()=>mf.dispose());
test.beforeEach(async()=>{await db.batch(['linkedin_connections','linkedin_oauth_states','linkedin_post_requests'].map(table=>db.prepare('DELETE FROM '+table)));posts=0;uncertain=false;outbound.length=0;});
function send(path,user='alice',options={}){
 const {headers,...rest}=options;
 return mf.dispatchFetch(origin+path,{...rest,redirect:'manual',headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test'}:{}),...headers}});
}
async function rpc(method,params={},user='alice'){
 const response=await send('/mcp',user,{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
 return {response,body:await response.json()};
}
async function connect(user){
 const start=await send('/auth/linkedin/start',user,{method:'POST',headers:{origin}});assert.equal(start.status,303,await start.clone().text());
 const auth=new URL(start.headers.get('location'));assert.equal(auth.origin,'https://www.linkedin.com');
 const cookie=start.headers.get('set-cookie').split(';')[0];assert.match(start.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
 const callback='/auth/linkedin/callback?state='+auth.searchParams.get('state')+'&code='+user;
 const response=await send(callback,user,{headers:{cookie}});assert.equal(response.status,303,JSON.stringify({body:await response.clone().text(),outbound}));assert.equal(response.headers.get('location'),origin+'/?result=connected');
 return {callback,cookie};
}
test('E2E: built Worker renders login and exposes exactly the expected tools',async()=>{
 const page=await send('/',null);assert.equal(page.status,200,await page.clone().text());assert.match(await page.text(),/Mit ChatGPT anmelden/);
 const {body}=await rpc('tools/list',{},null);assert.deepEqual(body.result.tools.map(t=>t.name),['linkedin_connection_status','linkedin_profile','linkedin_publish_post']);
 const denied=await rpc('tools/call',{name:'linkedin_profile',arguments:{}},null);assert.equal(denied.response.status,401);assert.equal(denied.body.result.isError,true);
});
test('E2E: OAuth, profile, UI, publication, replay, and disconnect through built HTTP routes',async()=>{
 const flow=await connect('alice');
 const profile=await rpc('tools/call',{name:'linkedin_profile',arguments:{}});assert.deepEqual(profile.body.result.structuredContent,{sub:'member-alice',name:'Name alice'});
 const page=await send('/');assert.equal(page.status,200,await page.clone().text());assert.match(await page.text(),/Name alice/);
 const args={text:'Approved E2E text',request_id:'e2e-publication-001',confirmed:true};
 const first=await rpc('tools/call',{name:'linkedin_publish_post',arguments:args});assert.equal(first.body.result.structuredContent.post_urn,'urn:li:share:1');
 const repeat=await rpc('tools/call',{name:'linkedin_publish_post',arguments:args});assert.equal(repeat.body.result.structuredContent.duplicate_request,true);assert.equal(posts,1);
 assert.equal((await send(flow.callback,'alice',{headers:{cookie:flow.cookie}})).status,403);
 const row=await db.prepare('SELECT encrypted_tokens FROM linkedin_connections WHERE user_id=?').bind('alice').first();assert.equal(row.encrypted_tokens.includes('token-alice'),false);
 const disconnected=await send('/auth/linkedin/disconnect','alice',{method:'POST',headers:{origin}});assert.equal(disconnected.status,303);
 const status=await send('/api/linkedin/status');assert.equal((await status.json()).connected,false);
});
test('E2E: two user identities keep OAuth, profiles, tokens, and publications isolated',async()=>{
 const start=await send('/auth/linkedin/start','alice',{method:'POST',headers:{origin}});const auth=new URL(start.headers.get('location'));const cookie=start.headers.get('set-cookie').split(';')[0];
 const callback='/auth/linkedin/callback?state='+auth.searchParams.get('state')+'&code=alice';
 assert.equal((await send(callback,'bob',{headers:{cookie}})).status,403);
 assert.equal((await send(callback,'alice',{headers:{cookie}})).status,303);
 await connect('bob');
 for(const user of ['alice','bob']){
  const profile=await rpc('tools/call',{name:'linkedin_profile',arguments:{}},user);assert.equal(profile.body.result.structuredContent.name,'Name '+user);
  const result=await rpc('tools/call',{name:'linkedin_publish_post',arguments:{text:'Separate publication',request_id:'e2e-shared-request',confirmed:true}},user);assert.equal(result.body.result.isError,false);
 }
 assert.equal(posts,2);
 await send('/auth/linkedin/disconnect','alice',{method:'POST',headers:{origin}});
 assert.equal((await (await send('/api/linkedin/status','bob')).json()).connected,true);
 assert.equal((await (await send('/api/linkedin/status','alice')).json()).connected,false);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM linkedin_connections').first()).count,1);
});
test('E2E: foreign origins cannot initiate OAuth or disconnect an account',async()=>{
 await connect('bob');
 for(const path of ['/auth/linkedin/start','/auth/linkedin/disconnect'])assert.equal((await send(path,'bob',{method:'POST',headers:{origin:'https://evil.test'}})).status,403);
 assert.equal((await (await send('/api/linkedin/status','bob')).json()).connected,true);
});

test('E2E: OAuth denial and missing browser cookie leave the account disconnected',async()=>{
 const start=await send('/auth/linkedin/start','alice',{method:'POST',headers:{origin}});
 const state=new URL(start.headers.get('location')).searchParams.get('state');
 assert.equal((await send('/auth/linkedin/callback?state='+state+'&code=alice')).status,403);
 const denied=await send('/auth/linkedin/callback?state='+state+'&error=access_denied','alice',{headers:{cookie:start.headers.get('set-cookie').split(';')[0]}});
 assert.equal(denied.status,303);assert.equal(denied.headers.get('location'),origin+'/?result=declined');
 assert.equal((await (await send('/api/linkedin/status')).json()).connected,false);assert.equal(outbound.length,0);
});
test('E2E: uncertain publication never triggers a second outbound attempt',async()=>{
 await connect('alice');uncertain=true;
 const args={text:'Approved uncertain text',request_id:'e2e-uncertain-request',confirmed:true};
 const first=await rpc('tools/call',{name:'linkedin_publish_post',arguments:args});assert.equal(first.body.result.isError,true);
 const repeat=await rpc('tools/call',{name:'linkedin_publish_post',arguments:args});assert.equal(JSON.parse(repeat.body.result.content[0].text).error,'publication_outcome_requires_manual_check');assert.equal(posts,1);
});
test('E2E: concurrent identical requests create exactly one publication',async()=>{
 await connect('alice');
 const params={name:'linkedin_publish_post',arguments:{text:'Concurrent approved text',request_id:'e2e-concurrent-request',confirmed:true}};
 const results=await Promise.all(Array.from({length:8},()=>rpc('tools/call',params)));
 assert.equal(posts,1);assert.ok(results.some(result=>result.body.result.structuredContent?.post_urn));
 for(const {body} of results)if(body.result.isError)assert.ok(['publication_in_progress','publication_outcome_requires_manual_check'].includes(JSON.parse(body.result.content[0].text).error));
 assert.equal((await db.prepare('SELECT status FROM linkedin_post_requests WHERE user_id=? AND request_id=?').bind('alice',params.arguments.request_id).first()).status,'published');
});
test('E2E: expiry and confirmation checks stop publication before reaching LinkedIn',async()=>{
 await connect('alice');
 const denied=await rpc('tools/call',{name:'linkedin_publish_post',arguments:{text:'Unapproved',request_id:'e2e-unapproved-request',confirmed:false}});assert.equal(denied.body.result.isError,true);assert.equal(posts,0);
 await db.prepare('UPDATE linkedin_connections SET expires_at=0 WHERE user_id=?').bind('alice').run();
 const expired=await rpc('tools/call',{name:'linkedin_profile',arguments:{}});assert.equal(JSON.parse(expired.body.result.content[0].text).error,'linkedin_reconnect_required');
 assert.equal((await (await send('/api/linkedin/status')).json()).requires_reconnect,true);
 assert.match(await (await send('/')).text(),/Deine Anmeldung muss erneuert werden/);assert.equal(posts,0);
});
