export const env={};
export const platform={requestHeaders:new Headers()};
export async function headers(){return platform.requestHeaders;}
export function redirect(location){throw new Error('Redirect: '+location);}
