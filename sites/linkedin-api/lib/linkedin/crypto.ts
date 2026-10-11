const encoder = new TextEncoder();
export function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decode(value: string): Uint8Array {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
}
export function randomSecret(): string { return encode(crypto.getRandomValues(new Uint8Array(32))); }
export async function hash(value: string): Promise<string> {
  return encode(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
async function key(secret: string) {
  const bytes = decode(secret);
  if (bytes.length !== 32) throw new Error('Invalid encryption key configuration');
  return crypto.subtle.importKey('raw', bytes as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value: unknown, secret: string, userId: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:encoder.encode(`linkedin:v1:${userId}`)}, await key(secret), encoder.encode(JSON.stringify(value)));
  return `v1.${encode(iv)}.${encode(new Uint8Array(data))}`;
}
export async function unseal<T>(value: string, secret: string, userId: string): Promise<T> {
  const [version, iv, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !ciphertext) throw new Error('Invalid encrypted token');
  const data = await crypto.subtle.decrypt({name:'AES-GCM', iv:decode(iv) as BufferSource, additionalData:encoder.encode(`linkedin:v1:${userId}`)}, await key(secret), decode(ciphertext) as BufferSource);
  return JSON.parse(new TextDecoder().decode(data)) as T;
}
