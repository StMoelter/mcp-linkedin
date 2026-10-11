import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../lib/linkedin/core.ts';
import {randomSecret,seal,unseal} from '../lib/linkedin/crypto.ts';
import {D1Store} from '../lib/linkedin/store.ts';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const origin='https://example.test';
const key=randomSecret();
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
const db=await mf.getD1Database('DB');
const migration=await readFile(new URL('../drizzle/0000_amusing_purifiers.sql',import.meta.url),'utf8');
for(const sql of migration.split('--> statement-breakpoint')) if(sql.trim()) await db.prepare(sql.trim()).run();
const store=new D1Store(db);
let calls=[];
let postFails=false;
const upstream=async(url,init)=>{
  calls.push({url,init});
  if(url.includes('accessToken')) return Response.json({access_token:'private-access',expires_in:3600,scope:'openid profile w_member_social'});
  if(url.includes('userinfo')) return Response.json({sub:'member123',name:'Example Member'});
  if(url.includes('/rest/posts')) {
    if(postFails) throw new Error('sensitive upstream details');
    return new Response(null,{status:201,headers:{'x-restli-id':'urn:li:share:123'}});
  }
  assert.fail('Unexpected external destination');
};
const config={origin,clientId:'client-id',clientSecret:'private-client-secret',encryptionKey:key,store,fetch:upstream};
const handle=createHandler(config);
function request(path,userId='alice',options={}) {
  const {headers,...rest}=options;
  return new Request(origin+path,{...rest,headers:{...(userId?{'oai-authenticated-user-id':userId}:{}),...headers}});
}
async function tool(name,args={},userId='alice') {
  const response=await handle(request('/mcp',userId,{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));
  const body=await response.json();
  return {response,result:body.result,data:JSON.parse(body.result.content[0].text)};
}
async function connect(userId) {
  const start=await handle(request('/auth/linkedin/start',userId,{method:'POST',headers:{origin}}));
  assert.equal(start.status,303);
  const authorization=new URL(start.headers.get('location'));
  assert.equal(authorization.searchParams.get('redirect_uri'),origin+'/auth/linkedin/callback');
  assert.equal(authorization.searchParams.get('scope'),'openid profile w_member_social');
  const cookie=start.headers.get('set-cookie').split(';')[0];
  const callback='/auth/linkedin/callback?code=example-code&state='+authorization.searchParams.get('state');
  return {cookie,callback};
}
test.after(()=>mf.dispose());
test('MCP discovery lists exactly three LinkedIn tools',async()=>{
  const response=await handle(request('/mcp',null,{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}));
  assert.deepEqual((await response.json()).result.tools.map(t=>t.name),['linkedin_connection_status','linkedin_profile','linkedin_publish_post']);
});
test('missing trusted identity fails closed for tools and OAuth',async()=>{
  const before=calls.length;
  for(const name of ['linkedin_connection_status','linkedin_profile','linkedin_publish_post']) assert.equal((await tool(name,{},null)).response.status,401);
  assert.equal((await handle(request('/auth/linkedin/callback?code=x&state=x',null))).status,401);
  assert.equal(calls.length,before);
});
test('unconfigured application reports setup requirement without external calls',async()=>{
  const response=await createHandler({...config,clientSecret:undefined})(request('/api/linkedin/status'));
  assert.deepEqual(await response.json(),{configured:false,connected:false,connect_url:origin});
});
test('OAuth start rejects foreign and absent origins',async()=>{
  for(const headers of [{origin:'https://evil.test'},{}]) assert.equal((await handle(request('/auth/linkedin/start','alice',{method:'POST',headers}))).status,403);
});
test('OAuth state binds user and browser, expires, and cannot be replayed',async()=>{
  const flow=await connect('alice');
  const before=calls.length;
  assert.equal((await handle(request(flow.callback,'bob',{headers:{cookie:flow.cookie}}))).status,403);
  assert.equal((await handle(request(flow.callback,'alice',{headers:{cookie:'__Host-linkedin-oauth=wrong'}}))).status,403);
  assert.equal(calls.length,before);
  assert.equal((await handle(request(flow.callback,'alice',{headers:{cookie:flow.cookie}}))).status,303);
  assert.equal((await handle(request(flow.callback,'alice',{headers:{cookie:flow.cookie}}))).status,403);
  const expired=await connect('expired');
  await db.prepare('UPDATE linkedin_oauth_states SET expires_at=0 WHERE user_id=?').bind('expired').run();
  assert.equal((await handle(request(expired.callback,'expired',{headers:{cookie:expired.cookie}}))).status,403);
});
test('stored tokens are encrypted and decryption is bound to the Sites user',async()=>{
  const connection=await store.connection('alice');
  assert.ok(connection);
  assert.equal(connection.encryptedTokens.includes('private-access'),false);
  assert.equal((await unseal(connection.encryptedTokens,key,'alice')).accessToken,'private-access');
  await assert.rejects(unseal(connection.encryptedTokens,key,'bob'));
  assert.equal(await store.connection('bob'),null);
  const status=await tool('linkedin_connection_status');
  assert.equal(status.data.connected,true);
  assert.equal(JSON.stringify(status.data).includes('private-access'),false);
  assert.equal((await tool('linkedin_profile',{},'bob')).data.error,'linkedin_not_connected');
  assert.equal((await tool('linkedin_profile')).data.sub,'member123');
});
test('publication requires exact confirmation and current user permission',async()=>{
  const before=calls.length;
  for(const args of [{text:'Hello',request_id:'publish-request-001'},{text:'Hello',request_id:'publish-request-001',confirmed:false},{text:'Hello',request_id:'short',confirmed:true},{text:'Hello',request_id:'publish-request-001',confirmed:true,author:'bob'}]) assert.equal((await tool('linkedin_publish_post',args)).result.isError,true);
  assert.equal(calls.length,before);
});
test('publication is deduplicated, uses the connected author, and rejects changed content',async()=>{
  const args={text:'Hello world',request_id:'publish-request-001',confirmed:true};
  const first=await tool('linkedin_publish_post',args);
  assert.equal(first.data.post_urn,'urn:li:share:123');
  const payload=JSON.parse(calls.at(-1).init.body);
  assert.equal(payload.author,'urn:li:person:member123');
  assert.equal(payload.commentary,'Hello world');
  const before=calls.length;
  assert.equal((await tool('linkedin_publish_post',args)).data.duplicate_request,true);
  assert.equal((await tool('linkedin_publish_post',{...args,text:'Changed'})).data.error,'request_id_conflict');
  assert.equal(calls.length,before);
});
test('uncertain publication is recorded and never automatically retried',async()=>{
  postFails=true;
  const args={text:'Uncertain',request_id:'publish-request-002',confirmed:true};
  assert.equal((await tool('linkedin_publish_post',args)).data.error,'linkedin_unavailable');
  const before=calls.length;
  assert.equal((await tool('linkedin_publish_post',args)).data.error,'publication_outcome_requires_manual_check');
  assert.equal(calls.length,before);
  postFails=false;
});
test('atomic claims prevent concurrent duplicate publications and isolate users',async()=>{
  assert.deepEqual((await Promise.all([store.claimPost('alice','concurrent-request','hash'),store.claimPost('alice','concurrent-request','hash')])).sort(),[false,true]);
  assert.equal(await store.claimPost('bob','concurrent-request','hash'),true);
  await store.completePost('alice','concurrent-request','published','urn:li:share:999');
  assert.equal((await store.post('bob','concurrent-request')).status,'pending');
});
test('expired access without refresh requires reconnection',async()=>{
  const c=await store.connection('alice');
  await store.saveConnection({...c,expiresAt:0});
  assert.equal((await tool('linkedin_profile')).data.error,'linkedin_reconnect_required');
});
test('disconnect removes only the authenticated user tokens and retains deduplication history',async()=>{
  await store.saveConnection({userId:'bob',encryptedTokens:await seal({accessToken:'bob-token'},key,'bob'),expiresAt:Date.now()+3600000,scopes:'openid profile',memberId:'bob',displayName:'Bob'});
  assert.equal((await handle(request('/auth/linkedin/disconnect','alice',{method:'POST',headers:{origin}}))).status,303);
  assert.equal(await store.connection('alice'),null);
  assert.ok(await store.connection('bob'));
  assert.equal((await store.post('alice','publish-request-001')).status,'published');
});
