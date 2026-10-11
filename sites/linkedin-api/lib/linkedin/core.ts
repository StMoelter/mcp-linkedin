import {hash, randomSecret, seal, unseal} from './crypto.ts';
import type {Connection, Store} from './store.ts';
export type Config = {origin:string; clientId?:string; clientSecret?:string; encryptionKey:string; apiVersion?:string; store:Store; fetch:typeof fetch};
type Tokens = {accessToken:string; refreshToken?:string; refreshExpiresAt?:number};
type Profile = {sub:string; name?:string; given_name?:string; family_name?:string; picture?:string; email?:string};
class Failure extends Error {
  code:string; status:number;
  constructor(code:string,status=400) { super(code); this.code=code; this.status=status; }
}
const requestedScopes = 'openid profile w_member_social';
const cookies = (request:Request) => Object.fromEntries((request.headers.get('cookie')??'').split(';').map(v=>v.trim().split('=')));
const cookie = (nonce:string,maxAge=600) => `__Host-linkedin-oauth=${nonce}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const isObject = (v:unknown):v is Record<string,unknown> => typeof v==='object' && v!==null && !Array.isArray(v);
export const toolList = [
  {name:'linkedin_connection_status',description:'Check your LinkedIn connection and granted permissions. No credentials are returned.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
  {name:'linkedin_profile',description:'Read the basic profile of the LinkedIn account you connected.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}},
  {name:'linkedin_publish_post',description:'Publish a public text post on your own connected LinkedIn profile. Call only after the user approves the exact text. Supply a stable request_id for the same publication. Never retry an uncertain publication with a new request_id.',inputSchema:{type:'object',properties:{text:{type:'string',minLength:1,maxLength:3000},request_id:{type:'string',minLength:16,maxLength:100},confirmed:{type:'boolean',const:true}},required:['text','request_id','confirmed'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:true}}
];
export function configured(config:Config) { return !!(config.clientId && config.clientSecret && config.encryptionKey && /^https:\/\//.test(config.origin)); }
export function createHandler(config:Config) {
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  function user(request:Request) {
    const id=request.headers.get('oai-authenticated-user-id');
    if (!id) throw new Failure('authentication_required',401);
    return id;
  }
  function ready() { if (!configured(config)) throw new Failure('linkedin_app_not_configured',503); }
  function sameOrigin(request:Request) {
    if(request.headers.get('origin')!==config.origin) throw new Failure('invalid_origin',403);
  }
  const redirectUri=()=>`${config.origin}/auth/linkedin/callback`;
  async function api(url:string,init:RequestInit):Promise<Response> {
    try { return await config.fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(20000)}); }
    catch { throw new Failure('linkedin_unavailable',502); }
  }
  async function profile(accessToken:string):Promise<Profile> {
    const response=await api('https://api.linkedin.com/v2/userinfo',{headers:{Authorization:`Bearer ${accessToken}`}});
    if(!response.ok) throw new Failure(response.status===401?'linkedin_reconnect_required':'linkedin_profile_failed',response.status===401?409:502);
    const body:unknown=await response.json();
    if(!isObject(body) || typeof body.sub!=='string' || !body.sub || !/^[a-zA-Z0-9_-]+$/.test(body.sub)) throw new Failure('invalid_linkedin_profile',502);
    return {sub:body.sub,...Object.fromEntries(['name','given_name','family_name','picture','email'].filter(k=>typeof body[k]==='string').map(k=>[k,body[k]]))};
  }
  async function exchange(parameters:Record<string,string>) {
    const response=await api('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...parameters,client_id:config.clientId!,client_secret:config.clientSecret!})});
    if(!response.ok) throw new Failure('linkedin_authorization_failed',409);
    const body:unknown=await response.json();
    if(!isObject(body) || typeof body.access_token!=='string' || !body.access_token || typeof body.expires_in!=='number' || body.expires_in<=0 || !Number.isFinite(body.expires_in)) throw new Failure('invalid_linkedin_token_response',502);
    const tokens:Tokens={accessToken:body.access_token};
    if(typeof body.refresh_token==='string' && body.refresh_token) {
      tokens.refreshToken=body.refresh_token;
      if(typeof body.refresh_token_expires_in==='number' && body.refresh_token_expires_in>0) tokens.refreshExpiresAt=Date.now()+body.refresh_token_expires_in*1000;
    }
    return {tokens,expiresAt:Date.now()+body.expires_in*1000,scope:typeof body.scope==='string'?body.scope:undefined};
  }
  async function authorized(userId:string):Promise<{connection:Connection;tokens:Tokens}> {
    ready();
    let connection=await config.store.connection(userId);
    if(!connection) throw new Failure('linkedin_not_connected',409);
    let tokens=await unseal<Tokens>(connection.encryptedTokens,config.encryptionKey,userId);
    if(connection.expiresAt<=Date.now()+30000) {
      if(!tokens.refreshToken || (tokens.refreshExpiresAt && tokens.refreshExpiresAt<=Date.now())) throw new Failure('linkedin_reconnect_required',409);
      const refreshed=await exchange({grant_type:'refresh_token',refresh_token:tokens.refreshToken});
      tokens={...tokens,...refreshed.tokens};
      connection={...connection,expiresAt:refreshed.expiresAt,scopes:refreshed.scope??connection.scopes,encryptedTokens:await seal(tokens,config.encryptionKey,userId)};
      await config.store.saveConnection(connection);
    }
    return {connection,tokens};
  }
  async function callTool(request:Request,name:unknown,args:unknown) {
    const userId=user(request);
    if(!isObject(args)) throw new Failure('invalid_arguments');
    if(name==='linkedin_connection_status') {
      if(Object.keys(args).length) throw new Failure('invalid_arguments');
      if(!configured(config)) return {configured:false,connected:false,connect_url:config.origin};
      const c=await config.store.connection(userId);
      return {configured:true,connected:!!c,requires_reconnect:!!c && c.expiresAt<=Date.now(),...(c?{name:c.displayName,expires_at:new Date(c.expiresAt).toISOString(),scopes:c.scopes.split(' ')}:{}),connect_url:config.origin};
    }
    if(name==='linkedin_profile') {
      if(Object.keys(args).length) throw new Failure('invalid_arguments');
      const {tokens}=await authorized(userId);
      return profile(tokens.accessToken);
    }
    if(name!=='linkedin_publish_post') throw new Failure('unknown_tool');
    if(Object.keys(args).some(k=>!['text','request_id','confirmed'].includes(k)) || args.confirmed!==true || typeof args.text!=='string' || !args.text.trim() || args.text.length>3000 || typeof args.request_id!=='string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(args.request_id)) throw new Failure('publication_requires_confirmed_text_and_request_id');
    const {connection,tokens}=await authorized(userId);
    if(!connection.scopes.split(' ').includes('w_member_social')) throw new Failure('linkedin_post_permission_missing',403);
    const text=args.text;
    const contentHash=await hash(text);
    const existing=await config.store.post(userId,args.request_id);
    if(existing) {
      if(existing.contentHash!==contentHash) throw new Failure('request_id_conflict',409);
      if(existing.status==='published' && existing.postUrn) return {post_urn:existing.postUrn,url:`https://www.linkedin.com/feed/update/${existing.postUrn}/`,duplicate_request:true};
      throw new Failure('publication_outcome_requires_manual_check',409);
    }
    if(!await config.store.claimPost(userId,args.request_id,contentHash)) throw new Failure('publication_in_progress',409);
    try {
      const version=config.apiVersion??'202605';
      if(!/^\d{6}$/.test(version)) throw new Failure('invalid_api_version',503);
      const commentary=text.replace(/[\\|{}@\[\]()*<>#_~]/g,'\\$&');
      const response=await api('https://api.linkedin.com/rest/posts',{method:'POST',headers:{Authorization:`Bearer ${tokens.accessToken}`,'Content-Type':'application/json','LinkedIn-Version':version,'X-Restli-Protocol-Version':'2.0.0'},body:JSON.stringify({author:`urn:li:person:${connection.memberId}`,commentary,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false})});
      const urn=response.headers.get('x-restli-id');
      if(response.status!==201 || !urn || !/^urn:li:(share|ugcPost):\d+$/.test(urn)) throw new Failure('linkedin_publication_not_confirmed',502);
      await config.store.completePost(userId,args.request_id,'published',urn);
      return {post_urn:urn,url:`https://www.linkedin.com/feed/update/${urn}/`};
    } catch(e) {
      await config.store.completePost(userId,args.request_id,'unknown');
      throw e;
    }
  }
  async function mcp(request:Request) {
    let message:unknown;
    try { message=await request.json(); } catch { return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400); }
    if(!isObject(message) || message.jsonrpc!=='2.0' || typeof message.method!=='string' || (message.id!==undefined && typeof message.id!=='string' && typeof message.id!=='number' && message.id!==null)) return json({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}},400);
    if(message.id===undefined) return new Response(null,{status:202});
    const reply=(result:unknown)=>json({jsonrpc:'2.0',id:message.id,result});
    if(message.method==='server/discover') return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
    if(message.method==='initialize') return reply({protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'linkedin-api',version:'1.0.0'}});
    if(message.method==='tools/list') return reply({tools:toolList});
    if(message.method==='ping') return reply({});
    if(message.method!=='tools/call') return json({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}});
    try {
      const params=isObject(message.params)?message.params:{};
      const result=await callTool(request,params.name,params.arguments??{});
      return reply({content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false});
    } catch(e) {
      const known=e instanceof Failure;
      return json({jsonrpc:'2.0',id:message.id,result:{content:[{type:'text',text:JSON.stringify({error:known?e.code:'internal_error'})}],isError:true}},known&&e.status===401?401:200);
    }
  }
  return async function handle(request:Request):Promise<Response> {
    try {
      const path=new URL(request.url).pathname;
      if(path==='/mcp') return request.method==='POST'?mcp(request):new Response(null,{status:405,headers:{Allow:'POST'}});
      const userId=user(request);
      if(path==='/api/linkedin/status' && request.method==='GET') return json(await callTool(request,'linkedin_connection_status',{}));
      if(path==='/auth/linkedin/start' && request.method==='POST') {
        sameOrigin(request); ready();
        const state=randomSecret(),nonce=randomSecret();
        await config.store.saveState({stateHash:await hash(state),userId,nonceHash:await hash(nonce),expiresAt:Date.now()+600000});
        const url=new URL('https://www.linkedin.com/oauth/v2/authorization');
        url.search=new URLSearchParams({response_type:'code',client_id:config.clientId!,redirect_uri:redirectUri(),state,scope:requestedScopes}).toString();
        return new Response(null,{status:303,headers:{Location:url.toString(),'Set-Cookie':cookie(nonce),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
      }
      if(path==='/auth/linkedin/callback' && request.method==='GET') {
        ready();
        const url=new URL(request.url),state=url.searchParams.get('state'),nonce=cookies(request)['__Host-linkedin-oauth'];
        if(!state || !nonce || !await config.store.consumeState(await hash(state),userId,await hash(nonce),Date.now())) throw new Failure('invalid_or_expired_oauth_state',403);
        if(url.searchParams.has('error')) return new Response(null,{status:303,headers:{Location:config.origin+'/?result=declined','Set-Cookie':cookie('',0),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
        const code=url.searchParams.get('code');
        if(!code) throw new Failure('missing_authorization_code');
        const result=await exchange({grant_type:'authorization_code',code,redirect_uri:redirectUri()});
        const member=await profile(result.tokens.accessToken);
        const connection={userId,encryptedTokens:await seal(result.tokens,config.encryptionKey,userId),expiresAt:result.expiresAt,scopes:result.scope??requestedScopes,memberId:member.sub,displayName:member.name??member.sub};
        await config.store.saveConnection(connection);
        return new Response(null,{status:303,headers:{Location:config.origin+'/?result=connected','Set-Cookie':cookie('',0),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
      }
      if(path==='/auth/linkedin/disconnect' && request.method==='POST') {
        sameOrigin(request);
        await config.store.disconnect(userId);
        return new Response(null,{status:303,headers:{Location:config.origin+'/?result=disconnected','Set-Cookie':cookie('',0),'Cache-Control':'no-store'}});
      }
      return json({error:'not_found'},404);
    } catch(e) {
      return json({error:e instanceof Failure?e.code:'internal_error'},e instanceof Failure?e.status:500);
    }
  };
}
