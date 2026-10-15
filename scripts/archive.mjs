import {readFile, writeFile, mkdir, copyFile, chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {seal, unseal} from '../assets/crypto.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = resolve(root, '.private');
const catalogPath = resolve(local, 'catalog.json');
const passwordPath = resolve(local, 'password.txt');
const outputPath = resolve(root, 'data/archive.enc.json');
const [command, ...args] = process.argv.slice(2);
function flag(name) {const i = args.indexOf(name);return i < 0 ? undefined : args[i + 1];}
async function readPassword() {
  const password = (await readFile(passwordPath, 'utf8')).trim();
  if (password.length < 20) throw new Error('Use a strong password of at least 20 characters in .private/password.txt');
  return password;
}
async function build() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  if (!Array.isArray(catalog.reports) || !catalog.reports.length) throw new Error('No reports configured');
  const reports = [];
  for (const report of catalog.reports) {
    if (!Number.isInteger(report.week) || report.week < 1 || typeof report.title !== 'string') throw new Error('Invalid report entry');
    const path = resolve(local, report.source);
    if (!path.startsWith(local + '/')) throw new Error('Report sources must be inside .private');
    reports.push({week:report.week, title:report.title, summary:report.summary || '', html:await readFile(path, 'utf8')});
  }
  const documents = [];
  for (const document of catalog.documents || []) {
    const path = resolve(local, document.source);
    if (!path.startsWith(local + '/') || document.mime !== 'application/pdf' || typeof document.title !== 'string') throw new Error('Invalid document');
    const bytes = await readFile(path);
    if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF');
    documents.push({title:document.title, summary:document.summary || '', filename:document.filename || 'document.pdf', mime:document.mime, data:bytes.toString('base64')});
  }
  const envelope = await seal({version:1, title:catalog.title, description:catalog.description, reports, documents, ...(catalog.activity ? {activity:catalog.activity} : {})}, await readPassword());
  const check = await unseal(envelope, await readPassword());
  if (check.reports.length !== reports.length || check.reports.some((r,i) => r.html !== reports[i].html)) throw new Error('Archive verification failed');
  if (JSON.stringify(check.documents) !== JSON.stringify(documents)) throw new Error('Document verification failed');
  await mkdir(dirname(outputPath), {recursive:true});
  await writeFile(outputPath, JSON.stringify(envelope) + '\n');
  console.log(`Encrypted archive saved and verified (${reports.length} report(s)). No plaintext was published.`);
}
if (command === 'init') {
  const source = flag('--file');if (!source) throw new Error('Required: init --file /absolute/path/to/report.html');
  await mkdir(resolve(local, 'reports'), {recursive:true, mode:0o700});await chmod(local, 0o700);
  await writeFile(passwordPath, randomBytes(24).toString('base64url') + '\n', {flag:'wx', mode:0o600});
  await copyFile(source, resolve(local, 'reports/week-01.html'));
  await writeFile(catalogPath, JSON.stringify({title:'گزارش‌های هفتگی', description:'بخش خصوصی', reports:[{week:1, title:flag('--title') || 'هفتهٔ اول', summary:flag('--summary') || '', source:'reports/week-01.html'}]}, null, 2) + '\n', {flag:'wx', mode:0o600});
  await chmod(resolve(local,'reports/week-01.html'), 0o600);await build();
} else if (command === 'add') {
  const week = Number(flag('--week')), source = flag('--file'), title = flag('--title');
  if (!Number.isInteger(week) || week < 1 || !source || !title) throw new Error('Required: add --week N --file /path/report.html --title "..." [--summary "..."]');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  if (catalog.reports.some(report => report.week === week)) throw new Error('That week already exists; edit the local catalog explicitly to replace it.');
  const relative = `reports/week-${String(week).padStart(2,'0')}.html`;
  await copyFile(source, resolve(local, relative));await chmod(resolve(local, relative), 0o600);
  catalog.reports.push({week, title, summary:flag('--summary') || '', source:relative});
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', {mode:0o600});await build();
} else if (command === 'seal') await build();
else throw new Error('Usage: node scripts/archive.mjs init|add|seal');
