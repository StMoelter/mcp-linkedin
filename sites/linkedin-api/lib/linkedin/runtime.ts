import {env} from 'cloudflare:workers';
import {createHandler, type Config} from './core';
import {D1Store} from './store';
export function configuration(): Config {
  return {origin:env.SITE_ORIGIN??'',clientId:env.LINKEDIN_CLIENT_ID,clientSecret:env.LINKEDIN_CLIENT_SECRET,encryptionKey:env.TOKEN_ENCRYPTION_KEY??'',apiVersion:env.LINKEDIN_API_VERSION,store:new D1Store(env.DB!),fetch:globalThis.fetch};
}
export function handle(request:Request) { return createHandler(configuration())(request); }
