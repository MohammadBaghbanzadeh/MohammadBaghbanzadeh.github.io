import {toBase64, fromBase64} from './crypto.js';
const aad = new TextEncoder().encode('mb-activity:v1');
export async function encryptActivity(payload, publicJwk) {
  const publicKey = await crypto.subtle.importKey('jwk', publicJwk, {name:'RSA-OAEP',hash:'SHA-256'}, false, ['encrypt']);
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey('raw',secret,{name:'AES-GCM'},false,['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,new TextEncoder().encode(JSON.stringify(payload)));
  const wrapped = await crypto.subtle.encrypt({name:'RSA-OAEP'},publicKey,secret);
  return {version:1,cipher:'RSA-OAEP-256+AES-256-GCM',iv:toBase64(iv),key:toBase64(new Uint8Array(wrapped)),ciphertext:toBase64(new Uint8Array(ciphertext))};
}
export async function decryptActivity(envelope, privateJwk) {
  if (envelope?.version !== 1 || envelope.cipher !== 'RSA-OAEP-256+AES-256-GCM') throw new Error('Unsupported activity data');
  const privateKey = await crypto.subtle.importKey('jwk',privateJwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
  const raw = await crypto.subtle.decrypt({name:'RSA-OAEP'},privateKey,fromBase64(envelope.key));
  const key = await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);
  const result = await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(envelope.iv),additionalData:aad},key,fromBase64(envelope.ciphertext));
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(result));
}
