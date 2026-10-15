import {unseal, toBase64, fromBase64} from './crypto.js';
import {loadActivity, clearActivity} from './activity.js';
const $ = id => document.getElementById(id);
let archive = null, idleTimer, lastOpener, generation = 0, reportFont = '';
const documentUrls = new Set();
const digits = n => new Intl.NumberFormat('fa-IR').format(n);
const message = $('unlock-message');
function resetIdle() {
  clearTimeout(idleTimer);
  if (archive) idleTimer = setTimeout(() => lock('به‌دلیل بی‌کاری، بخش خصوصی دوباره قفل شد.'), 15 * 60 * 1000);
}
function closeReport() {
  $('report-frame').removeAttribute('srcdoc');
  $('report-viewer').hidden = true;
  $('viewer-title').textContent = '';
  document.body.classList.remove('viewer-open');
  $('main').inert = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  lastOpener?.focus();
}
function lock(reason = '') {
  generation++;
  clearTimeout(idleTimer);
  closeReport();
  archive = null;
  for (const url of documentUrls) URL.revokeObjectURL(url);
  documentUrls.clear();
  clearActivity();
  lastOpener = null;
  $('report-list').replaceChildren();
  for (const id of ['workspace-title','workspace-description','workspace-count']) $(id).textContent = '';
  $('workspace').hidden = true;
  $('locked-view').hidden = false;
  $('password').value = '';
  $('password').type = 'password';
  $('reveal-password').textContent = 'نمایش';
  $('reveal-password').setAttribute('aria-pressed','false');
  document.title = 'بخش خصوصی · محمد باغبان‌زاده';
  message.textContent = reason;
  $('password').focus();
}
function sandboxReport(html) {
  // Opaque-origin iframe: reports cannot access the host page, storage or keys.
  // Network requests are blocked, including report fonts/analytics/remote assets.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer">`;
  const font = reportFont ? `<style>@font-face{font-family:Vazirmatn;src:url(data:font/ttf;base64,${reportFont}) format('truetype');font-weight:100 900;font-display:swap}</style>` : '';
  const activity = `<script>(()=>{let last=0;for(const name of ['pointerdown','keydown','touchstart','scroll','mousemove'])document.addEventListener(name,()=>{const now=Date.now();if(now-last>10000){last=now;parent.postMessage('workspace-activity','*')}},{passive:true,capture:true})})()</script>`;
  // Remove remote resource hints/stylesheet links; no private report makes network requests.
  html = html.replace(/<link\b[^>]*>/gi, '');
  const documentHtml = /<head(?:\s[^>]*)?>/i.test(html) ? html.replace(/<head(?:\s[^>]*)?>/i, match => match + policy + font) : policy + font + html;
  return documentHtml.replace(/<\/body>/i, activity + '</body>');
}
async function openReport(report, opener) {
  const requestGeneration = generation;
  if (!reportFont) {
    try {
      const response = await fetch('assets/fonts/Vazirmatn-Regular.ttf');
      if (response.ok) reportFont = toBase64(new Uint8Array(await response.arrayBuffer()));
    } catch { /* System font fallback keeps the report readable offline. */ }
  }
  if (!archive || requestGeneration !== generation) return;
  lastOpener = opener;
  $('viewer-title').textContent = report.title;
  $('report-frame').title = report.title;
  $('report-frame').srcdoc = sandboxReport(report.html);
  $('report-viewer').hidden = false;
  $('main').inert = true;
  document.body.classList.add('viewer-open');
  $('close-report').focus();
  resetIdle();
}
function render(payload) {
  if (payload?.version !== 1 || typeof payload.title !== 'string' || !Array.isArray(payload.reports) || !payload.reports.length || payload.reports.some(r => !Number.isInteger(r.week) || typeof r.title !== 'string' || typeof r.html !== 'string' || typeof r.summary !== 'string')) throw new Error('Invalid content');
  if (payload.documents !== undefined && (!Array.isArray(payload.documents) || payload.documents.some(d => d.mime !== 'application/pdf' || typeof d.data !== 'string' || typeof d.title !== 'string'))) throw new Error('Invalid documents');
  archive = payload;
  $('workspace-title').textContent = 'پایان‌نامه';
  $('workspace-description').textContent = payload.description || '';
  $('workspace-count').textContent = '';
  function group(title, count) {
    const section = document.createElement('section');section.className = 'workspace-group';
    const heading = document.createElement('h2');heading.className = 'workspace-group-heading';
    const toggle = document.createElement('button');toggle.type = 'button';toggle.className = 'workspace-group-toggle';
    const label = document.createElement('span');label.textContent = title;
    const total = document.createElement('span');total.className = 'workspace-group-count';total.textContent = `${digits(count)} مورد`;
    const action = document.createElement('span');action.className = 'workspace-group-action';action.textContent = 'بازکردن +';
    const list = document.createElement('div');list.className = 'report-list';list.hidden = true;
    list.id = `workspace-group-${$('report-list').children.length}`;
    toggle.setAttribute('aria-controls', list.id);toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      list.hidden = !list.hidden;
      toggle.setAttribute('aria-expanded', String(!list.hidden));
      action.textContent = list.hidden ? 'بازکردن +' : 'جمع‌کردن −';
    });
    toggle.append(label, total, action);heading.append(toggle);
    section.append(heading, list);$('report-list').append(section);return list;
  }
  const proposals = (payload.documents || []).filter(d => d.category !== 'paper');
  const papers = (payload.documents || []).filter(d => d.category === 'paper');
  const documentList = proposals.length ? group('پروپوزال', proposals.length) : null;
  const weeklyList = group('گزارش‌های هفتگی پیاده‌سازی', payload.reports.length);
  const paperList = papers.length ? group('مقالات پایه و مرتبط', papers.length) : null;
  for (const documentFile of payload.documents || []) {
    const card = document.createElement('article');card.className = 'report-card';
    const type = document.createElement('span');type.className = 'report-number';type.textContent = 'PDF';type.dir = 'ltr';
    const copy = document.createElement('div');copy.className = 'report-copy';
    const title = document.createElement('h3');title.textContent = documentFile.title;title.dir = 'auto';
    const summary = document.createElement('p');summary.textContent = documentFile.summary || '';
    copy.append(title, summary);
    const actions = document.createElement('div');actions.className = 'report-actions';
    const url = URL.createObjectURL(new Blob([fromBase64(documentFile.data)], {type:'application/pdf'}));documentUrls.add(url);
    const view = document.createElement('a');view.className = 'button primary';view.href = url;view.target = '_blank';view.rel = 'noopener noreferrer';view.textContent = 'مشاهدهٔ PDF ↗';
    const download = document.createElement('a');download.className = 'button outline';download.href = url;download.download = (documentFile.filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');download.textContent = 'دانلود';
    actions.append(view, download);card.append(type, copy, actions);(documentFile.category === 'paper' ? paperList : documentList).append(card);
  }
  for (const report of [...payload.reports].sort((a,b) => a.week - b.week)) {
    const card = document.createElement('article');card.className = 'report-card';
    const number = document.createElement('span');number.className = 'report-number';number.textContent = digits(report.week).padStart(2,'۰');
    const copy = document.createElement('div');copy.className = 'report-copy';
    const title = document.createElement('h3');title.textContent = report.title;
    const summary = document.createElement('p');summary.textContent = report.summary;
    copy.append(title, summary);
    const actions = document.createElement('div');actions.className = 'report-actions';
    const view = document.createElement('button');view.type = 'button';view.className = 'button primary';view.textContent = 'مشاهدهٔ ارائه ←';view.addEventListener('click', () => openReport(report, view));
    actions.append(view);card.append(number, copy, actions);weeklyList.append(card);
  }
  $('locked-view').hidden = true;$('workspace').hidden = false;$('workspace-title').focus();resetIdle();
  loadActivity(payload.activity,$('workspace'));
}
$('unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('password');let password = input.value;input.value = '';
  if (!password) return;
  const attempt = ++generation;
  const button = $('unlock-button');button.disabled = true;message.textContent = 'در حال بازکردن…';
  try {
    if (!crypto.subtle) throw new Error('Secure browser required');
    const response = await fetch('data/archive.enc.json', {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
    if (!response.ok) throw new Error('Archive unavailable');
    const payload = await unseal(await response.json(), password);
    if (attempt !== generation) return;
    render(payload);message.textContent = '';
  } catch {
    if (attempt === generation) message.textContent = 'بخش باز نشد. رمز را بررسی کنید و دوباره تلاش کنید؛ در صورت تکرار، اتصال و مرورگر را بررسی کنید.';
  } finally {password = '';button.disabled = false;}
});
$('reveal-password').addEventListener('click', () => {
  const visible = $('password').type === 'password';$('password').type = visible ? 'text' : 'password';
  $('reveal-password').textContent = visible ? 'پنهان‌کردن' : 'نمایش';$('reveal-password').setAttribute('aria-pressed', String(visible));
});
$('lock-button').addEventListener('click', () => lock());
$('close-report').addEventListener('click', closeReport);
$('fullscreen-report').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else $('report-viewer').requestFullscreen?.().catch(() => {});
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('report-viewer').hidden) closeReport();
  if (e.key === 'Tab' && !$('report-viewer').hidden && document.activeElement === $('close-report') && !e.shiftKey) {e.preventDefault();$('report-frame').focus();}
});
for (const event of ['pointerdown','keydown','touchstart']) document.addEventListener(event, resetIdle, {passive:true});
window.addEventListener('pagehide', () => lock());
window.addEventListener('message', event => {
  if (event.source === $('report-frame').contentWindow && event.data === 'workspace-activity' && archive) resetIdle();
});
