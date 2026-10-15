import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seal, unseal, fromBase64, toBase64} from '../assets/crypto.js';
test('archive round-trip preserves Persian metadata and exact HTML', async () => {
  const payload = {version:1, title:'آرشیو خصوصی', reports:[{week:1, title:'هفتهٔ اول', html:'<html><p>نتیجهٔ آزمایش</p></html>'}]};
  const password = 'test-only-random-strong-passphrase-2026';const sealed = await seal(payload, password);
  assert.deepEqual(await unseal(sealed, password), payload);
  const serialized = JSON.stringify(sealed);
  assert.ok(!serialized.includes(payload.title));assert.ok(!serialized.includes(password));assert.ok(!serialized.includes('html'));
  await assert.rejects(() => unseal(sealed, 'wrong-password'));
  const changed = fromBase64(sealed.ciphertext);changed[0] ^= 1;
  await assert.rejects(() => unseal({...sealed, ciphertext:toBase64(changed)}, password));
  await assert.rejects(() => unseal({...sealed, iterations:1}, password));
});
test('fresh encryption uses distinct salt, nonce and ciphertext', async () => {
  const a = await seal({test:1}, 'test-only-password');const b = await seal({test:1}, 'test-only-password');
  for (const key of ['salt','iv','ciphertext']) assert.notEqual(a[key],b[key]);
});
test('public pages and runtime contain no report metadata or password persistence', async () => {
  for (const file of ['index.html','vault.html','assets/vault.js','assets/crypto.js']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const privateTerm of ['آرشیو خصوصی','نتیجهٔ آزمایش','week-01.html']) assert.ok(!source.includes(privateTerm), `${file}: unexpected private fixture`);
  }
  const vault = await readFile(new URL('../assets/vault.js',import.meta.url),'utf8');assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(vault));
});
