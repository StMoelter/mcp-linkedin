import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,origin} from './support/fixture.mjs';
import {createHandler,configured} from '../lib/linkedin/core.ts';
import {randomSecret,seal,unseal} from '../lib/linkedin/crypto.ts';
const f=await fixture();
test.after(()=>f.mf.dispose());
test.beforeEach(()=>f.reset());
const publication={text:'Hello',confirmed:true,request_id:'publication-request-001'};
async function error(name,args,expected,override={}){const r=await f.tool(name,args,'alice',override);assert.equal(r.result.isError,true);assert.equal(r.data.error,expected);return r;}
test('configuration requires every credential and an HTTPS origin',()=>{
 assert.equal(configured(f.config),true);
 for(const override of [{clientId:''},{clientSecret:''},{encryptionKey:''},{origin:'http://example.test'}])assert.equal(configured({...f.config,...override}),false);
});
test('encryption rejects malformed values, invalid keys, wrong keys, and tampering',async()=>{
 for(const value of ['','v2.a.b','v1..b','v1.a.'])await assert.rejects(unseal(value,f.key,'alice'));
 await assert.rejects(seal({},'AA','alice'),/Invalid encryption key/);
 const value=await seal({token:'test'},f.key,'alice');
 await assert.rejects(unseal(value,randomSecret(),'alice'));
 const parts=value.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);await assert.rejects(unseal(parts.join('.'),f.key,'alice'));
});
test('protocol handles discovery, initialization, ping, notifications, and GET',async()=>{
 const handle=createHandler(f.config);
 for(const [method,key] of [['server/discover','supportedVersions'],['initialize','serverInfo'],['ping',null]]){
  const r=await handle(f.request('/mcp',null,{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:'id',method})}));const body=await r.json();assert.equal(body.id,'id');if(key)assert.ok(body.result[key]);else assert.deepEqual(body.result,{});
 }
 assert.equal((await handle(f.request('/mcp',null,{method:'POST',body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})}))).status,202);
 const get=await handle(f.request('/mcp',null));assert.equal(get.status,405);assert.equal(get.headers.get('allow'),'POST');
 const r=await handle(f.request('/mcp',null,{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:null,method:'unknown'})}));assert.equal((await r.json()).error.code,-32601);
});
test('invalid JSON and invalid JSON-RPC envelopes fail before tool calls',async()=>{
 const handle=createHandler(f.config);
 const malformed=await handle(f.request('/mcp',null,{method:'POST',body:'{'}));assert.equal((await malformed.json()).error.code,-32700);
 for(const value of [null,[],{}, {jsonrpc:'1',method:'ping',id:1},{jsonrpc:'2.0',method:1,id:1},{jsonrpc:'2.0',method:'ping',id:{}},{jsonrpc:'2.0',method:'ping',id:true}]){
  const r=await handle(f.request('/mcp',null,{method:'POST',body:JSON.stringify(value)}));assert.equal(r.status,400);assert.equal((await r.json()).error.code,-32600);
 }
 assert.equal(f.calls.length,0);
});
test('invalid tool arguments and unknown tools return safe MCP errors',async()=>{
 for(const args of [[],1,'bad'])await error('linkedin_profile',args,'invalid_arguments');
 for(const name of ['linkedin_profile','linkedin_connection_status'])await error(name,{extra:true},'invalid_arguments');
 await error('unknown',{},'unknown_tool');
 for(const params of [null,{}, {name:'linkedin_connection_status'},{name:'linkedin_connection_status',arguments:null}]){
  const r=await createHandler(f.config)(f.request('/mcp','alice',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params})}));
  assert.equal(r.status,200);const body=await r.json();assert.equal(body.result.isError,!(params?.name));
 }
});
test('status distinguishes disconnected, current, and expired connections without exposing tokens',async()=>{
 assert.equal((await f.tool('linkedin_connection_status')).data.connected,false);
 await f.seed();assert.equal((await f.tool('linkedin_connection_status')).data.requires_reconnect,false);
 await f.seed('alice',{expiresAt:0});assert.equal((await f.tool('linkedin_connection_status')).data.requires_reconnect,true);
 const r=await createHandler(f.config)(f.request('/api/linkedin/status'));assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).connected,true);
});
test('missing app configuration rejects OAuth and profile access',async()=>{
 await error('linkedin_profile',{},'linkedin_app_not_configured',{clientId:''});
 const r=await createHandler({...f.config,clientId:''})(f.request('/auth/linkedin/start','alice',{method:'POST',headers:{origin}}));assert.equal(r.status,503);
});
test('OAuth rejects missing state and cookie, denial clears cookie, and missing code fails',async()=>{
 let r=await createHandler(f.config)(f.request('/auth/linkedin/callback?code=x'));assert.equal(r.status,403);
 r=await f.callback('code=x',{},null);assert.equal(r.status,403);
 r=await f.callback('error=access_denied');assert.equal(r.status,303);assert.equal(r.headers.get('location'),origin+'/?result=declined');assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
 r=await f.callback('');assert.equal(r.status,400);assert.equal((await r.json()).error,'missing_authorization_code');assert.equal(f.calls.length,0);
});
test('token exchange rejects upstream failure and invalid token payloads',async()=>{
 f.setReply(()=>new Response('sensitive',{status:400}));let r=await f.callback();assert.equal((await r.json()).error,'linkedin_authorization_failed');
 for(const body of [null,[],{}, {access_token:1,expires_in:3600},{access_token:'',expires_in:3600},{access_token:'a',expires_in:'3600'},{access_token:'a',expires_in:0},{access_token:'a',expires_in:-1}]){
  f.setReply(()=>Response.json(body));r=await f.callback();assert.equal((await r.json()).error,'invalid_linkedin_token_response');assert.equal(await f.store.connection('alice'),null);
 }
 f.setReply(()=>new Response('not JSON'));r=await f.callback();assert.deepEqual(await r.json(),{error:'internal_error'});
});
test('OAuth persists optional refresh, fallback scope, and fallback profile name',async()=>{
 for(const refresh of [{},{refresh_token:1},{refresh_token:''},{refresh_token:'refresh'},{refresh_token:'refresh',refresh_token_expires_in:0},{refresh_token:'refresh',refresh_token_expires_in:3600}]){
  f.setReply(url=>url.includes('accessToken')?Response.json({access_token:'access',expires_in:3600,...refresh}):Response.json({sub:'member',name:undefined}));
  assert.equal((await f.callback()).status,303);const c=await f.store.connection('alice');assert.equal(c.displayName,'member');assert.equal(c.scopes,'openid profile w_member_social');
  const tokens=await unseal(c.encryptedTokens,f.key,'alice');assert.equal(tokens.refreshToken,typeof refresh.refresh_token==='string'&&refresh.refresh_token?refresh.refresh_token:undefined);
  if(refresh.refresh_token_expires_in>0)assert.ok(tokens.refreshExpiresAt>Date.now());
 }
});
test('profile handles authorization failures, invalid subjects, and whitelists fields',async()=>{
 await f.seed();
 for(const [status,code] of [[401,'linkedin_reconnect_required'],[403,'linkedin_profile_failed'],[500,'linkedin_profile_failed']]){f.setReply(()=>new Response('private',{status}));await error('linkedin_profile',{},code);}
 for(const profile of [null,[],{}, {sub:1},{sub:''},{sub:'../bad'}]){f.setReply(()=>Response.json(profile));await error('linkedin_profile',{},'invalid_linkedin_profile');}
 f.setReply(()=>Response.json({sub:'member',name:'Member',given_name:'Given',family_name:'Family',picture:'https://example.test/image',email:'example@example.test',secret:'private'}));
 const r=await f.tool('linkedin_profile');assert.equal(r.data.given_name,'Given');assert.equal(r.data.secret,undefined);
});
test('expired refresh cannot authorize and successful refresh updates encrypted tokens and scopes',async()=>{
 await f.seed('alice',{expiresAt:0},{accessToken:'old',refreshToken:'refresh',refreshExpiresAt:1});await error('linkedin_profile',{},'linkedin_reconnect_required');assert.equal(f.calls.length,0);
 for(const response of [{access_token:'new',expires_in:3600},{access_token:'new',expires_in:3600,scope:'openid profile',refresh_token:'new-refresh',refresh_token_expires_in:7200}]){
  await f.seed('alice',{expiresAt:0},{accessToken:'old',refreshToken:'refresh'});
  f.setReply(url=>url.includes('accessToken')?Response.json(response):Response.json({sub:'member'}));
  assert.equal((await f.tool('linkedin_profile')).data.sub,'member');const c=await f.store.connection('alice');const tokens=await unseal(c.encryptedTokens,f.key,'alice');assert.equal(tokens.accessToken,'new');assert.equal(tokens.refreshToken,response.refresh_token??'refresh');assert.equal(c.scopes,response.scope??'openid profile w_member_social');
  const exchange=f.calls.findLast(c=>c.url.includes('accessToken'));assert.equal(exchange.init.body.get('grant_type'),'refresh_token');assert.equal(f.calls.at(-1).init.headers.Authorization,'Bearer new');
 }
});
test('publication validation rejects every invalid input before reaching LinkedIn',async()=>{
 for(const patch of [{confirmed:false},{text:1},{text:''},{text:' '},{text:'x'.repeat(3001)},{request_id:1},{request_id:'invalid'},{extra:true}])await error('linkedin_publish_post',{...publication,...patch},'publication_requires_confirmed_text_and_request_id');
 assert.equal(f.calls.length,0);
 await f.seed('alice',{scopes:'openid profile'});await error('linkedin_publish_post',publication,'linkedin_post_permission_missing');
});
test('pending records and concurrent claims prevent outbound publication',async()=>{
 await f.seed();await f.store.claimPost('alice',publication.request_id,'different');await error('linkedin_publish_post',publication,'request_id_conflict');
 await f.reset();await f.seed();const {hash}=await import('../lib/linkedin/crypto.ts');await f.store.claimPost('alice',publication.request_id,await hash(publication.text));await error('linkedin_publish_post',publication,'publication_outcome_requires_manual_check');
 const rejectingStore=Object.create(f.store);rejectingStore.post=async()=>null;rejectingStore.claimPost=async()=>false;
 await error('linkedin_publish_post',publication,'publication_in_progress',{store:rejectingStore});assert.equal(f.calls.length,0);
});
test('publication validates version and response, escapes text, and preserves uncertain outcomes',async()=>{
 await f.seed();await error('linkedin_publish_post',publication,'invalid_api_version',{apiVersion:'bad'});assert.equal(f.calls.length,0);
 for(const response of [new Response(null,{status:400}),new Response(null,{status:201}),new Response(null,{status:201,headers:{'x-restli-id':'bad'}})]){
  await f.reset();await f.seed();f.setReply(()=>response);await error('linkedin_publish_post',publication,'linkedin_publication_not_confirmed');assert.equal((await f.store.post('alice',publication.request_id)).status,'unknown');
 }
 await f.reset();await f.seed();f.setReply(()=>new Response(null,{status:201,headers:{'x-restli-id':'urn:li:ugcPost:456'}}));
 const r=await f.tool('linkedin_publish_post',{...publication,text:'Hello @member #topic (text)'},'alice',{apiVersion:'202605'});assert.equal(r.data.post_urn,'urn:li:ugcPost:456');assert.equal(JSON.parse(f.calls.at(-1).init.body).commentary,'Hello \\@member \\#topic \\(text\\)');
});
test('internal failures are redacted at API and MCP boundaries',async()=>{
 const broken=Object.create(f.store);broken.connection=async()=>{throw new Error('private secret');};
 const r=await error('linkedin_profile',{},'internal_error',{store:broken});assert.equal(r.response.status,200);
 const response=await createHandler({...f.config,store:broken})(f.request('/api/linkedin/status'));assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'internal_error'});
});
test('authenticated unknown routes fail with 404 and wrong methods do not mutate data',async()=>{
 const handle=createHandler(f.config);for(const path of ['/unknown','/auth/linkedin/start','/auth/linkedin/disconnect'])assert.equal((await handle(f.request(path))).status,404);
 const r=await handle(f.request('/auth/linkedin/disconnect','alice',{method:'POST',headers:{origin:'https://evil.test'}}));assert.equal(r.status,403);
});
test('LinkedIn redirects are rejected without forwarding credentials to another destination',async()=>{
 await f.seed();f.setReply(()=>new Response(null,{status:302,headers:{location:'https://evil.test'}}));
 await error('linkedin_profile',{},'linkedin_unavailable');assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.redirect,'manual');
});
