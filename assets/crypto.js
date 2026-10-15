// Cross-runtime Web Crypto. No password or password verifier is shipped.
const encoder = new TextEncoder();
const context = encoder.encode('mb-private-workspace:v1');
export const ITERATIONS = 600000;
export function toBase64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export function fromBase64(text) {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0));
}
async function derive(password, salt, iterations, usage) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, usage);
}
export async function seal(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, ITERATIONS, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:context}, key, encoder.encode(JSON.stringify(payload)));
  return {version:1, kdf:'PBKDF2-SHA256', iterations:ITERATIONS, cipher:'AES-256-GCM', salt:toBase64(salt), iv:toBase64(iv), ciphertext:toBase64(new Uint8Array(ciphertext))};
}
export async function unseal(envelope, password) {
  if (envelope?.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.cipher !== 'AES-256-GCM' || envelope.iterations !== ITERATIONS) throw new Error('Unsupported archive');
  const salt = fromBase64(envelope.salt), iv = fromBase64(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid archive');
  const key = await derive(password, salt, envelope.iterations, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv, additionalData:context}, key, fromBase64(envelope.ciphertext));
  return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(plaintext));
}
