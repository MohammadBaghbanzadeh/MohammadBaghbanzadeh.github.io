import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize,dateInTehran} from '../scripts/activity.mjs';
import {encryptActivity,decryptActivity} from '../assets/activity-crypto.js';
import {fromBase64,toBase64} from '../assets/crypto.js';
test('activity groups by Tehran date, deduplicates commits and excludes future/old dates', () => {
  const rows=[{sha:'a'.repeat(40),date:'2026-10-14T21:00:00Z',message:'Update experiment'}, {sha:'a'.repeat(40),date:'2026-10-14T21:00:00Z',message:'Duplicate'}, {sha:'b'.repeat(40),date:'2026-10-14T20:00:00Z',message:'Earlier day'}, {sha:'c'.repeat(40),date:'2024-01-01T00:00:00Z',message:'Too old'}, {sha:'d'.repeat(40),date:'2026-10-16T12:00:00Z',message:'Future'}];
  const result=summarize(rows,new Date('2026-10-15T12:00:00Z'));
  assert.equal(dateInTehran(rows[0].date),'2026-10-15');
  assert.deepEqual(result.days.map(d=>[d.date,d.count]),[['2026-10-14',1],['2026-10-15',1]]);
  assert.equal(result.metric,'commits');
});
test('activity can be encrypted without access to the report password, but requires private key to read', async () => {
  const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
  const pub=await crypto.subtle.exportKey('jwk',pair.publicKey),priv=await crypto.subtle.exportKey('jwk',pair.privateKey);
  const data={version:1,days:[{date:'2026-10-15',count:2,commits:[{message:'گزارش خصوصی'}]}]};
  const envelope=await encryptActivity(data,pub);
  assert.deepEqual(await decryptActivity(envelope,priv),data);
  assert.ok(!JSON.stringify(envelope).includes('گزارش خصوصی'));
  await assert.rejects(()=>decryptActivity(envelope,pub));
  const bytes=fromBase64(envelope.ciphertext);bytes[0]^=1;
  await assert.rejects(()=>decryptActivity({...envelope,ciphertext:toBase64(bytes)},priv));
});
