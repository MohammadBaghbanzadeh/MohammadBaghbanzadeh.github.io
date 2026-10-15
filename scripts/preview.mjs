// Allowlisted preview: never expose local credentials or Git metadata.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, dirname, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    if (path.split('/').some(part => part.startsWith('.')) || !/^\/(index\.html|vault\.html|assets\/|data\/(?:archive|activity)\.enc\.json|GML\/|AmortizedAnalysis\/|courses\/)/.test(path)) throw new Error('Not found');
    let target = resolve(root,'.'+path);
    if ((await stat(target)).isDirectory()) target = resolve(target,'index.html');
    if (!target.startsWith(root+sep) || !(await stat(target)).isFile()) throw new Error('Not found');
    res.writeHead(200, {'Content-Type':types[extname(target)] || 'application/octet-stream','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(await readFile(target));
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
