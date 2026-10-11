import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {D1Store} from '../../lib/linkedin/store.ts';
import {seal,randomSecret,hash} from '../../lib/linkedin/crypto.ts';
import {createHandler} from '../../lib/linkedin/core.ts';
const require=createRequire(import.meta.url);
export const {Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
export const origin='https://example.test';
export async function database(mf){
 const db=await mf.getD1Database('DB');
 const sql=await readFile(new URL('../../drizzle/0000_amusing_purifiers.sql',import.meta.url),'utf8');
 for(const statement of sql.split('--> statement-breakpoint'))if(statement.trim())await db.prepare(statement.trim()).run();
 return db;
}
export async function fixture(){
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 const db=await database(mf),store=new D1Store(db),key=randomSecret();
 let reply=()=>Response.json({sub:'member123',name:'Member'});
 const calls=[];
 const config={origin,clientId:'test-client',clientSecret:'test-secret',encryptionKey:key,store,fetch:async(url,init)=>{calls.push({url,init});return reply(url,init);}};
 function request(path,user='alice',options={}){const {headers,...rest}=options;return new Request(origin+path,{...rest,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...headers}});}
 async function tool(name,args={},user='alice',override={}){
  const response=await createHandler({...config,...override})(request('/mcp',user,{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));
  const body=await response.json();return {response,result:body.result,data:JSON.parse(body.result.content[0].text)};
 }
 async function seed(user='alice',extra={},tokens={accessToken:'access-'+user}){await store.saveConnection({userId:user,encryptedTokens:await seal(tokens,key,user),expiresAt:Date.now()+3600000,scopes:'openid profile w_member_social',memberId:'member-'+user,displayName:'Member '+user,...extra});}
 async function callback(query='code=code',override={},cookie='nonce',user='alice'){
  await store.saveState({stateHash:await hash('state'),userId:'alice',nonceHash:await hash('nonce'),expiresAt:Date.now()+600000});
  return createHandler({...config,...override})(request('/auth/linkedin/callback?state=state&'+query,user,{headers:cookie?{cookie:'__Host-linkedin-oauth='+cookie}:{}}));
 }
 async function reset(){await db.batch(['linkedin_connections','linkedin_oauth_states','linkedin_post_requests'].map(t=>db.prepare('DELETE FROM '+t)));calls.length=0;reply=()=>Response.json({sub:'member123',name:'Member'});}
 return {mf,db,store,key,config,request,tool,seed,callback,reset,calls,setReply(fn){reply=fn;}};
}
