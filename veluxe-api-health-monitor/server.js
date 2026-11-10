import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const dir = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.VELUXE_CONFIG || path.join(dir, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('Missing config.json. Copy config.example.json to config.json and configure your targets.');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const port = Number(process.env.PORT || config.port || 3000);
const interval = Math.max(10, Number(config.intervalSeconds || 60)) * 1000;
const retention = Math.min(10000, Math.max(10, Number(config.retention || 1000)));
const timeout = Math.max(500, Number(config.timeoutMs || 8000));
const targets = Array.isArray(config.targets) ? config.targets : [];
const history = Object.fromEntries(targets.map((t, i) => [String(i), []]));
let checking = false;

async function checkAll() {
  if (checking) return;
  checking = true;
  try {
    await Promise.all(targets.map(async (target, i) => {
      const start = performance.now();
      let status = null;
      let error = null;
      let ok = false;
      try {
        const url = new URL(target.url);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) endpoints are supported');
        const response = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeout), headers: { 'user-agent': 'VeluxeHealthMonitor/1.0' } });
        status = response.status;
        ok = status === Number(target.expectedStatus ?? 200);
      } catch (e) { error = e.message; }
      const sample = { time: new Date().toISOString(), ok, status, latencyMs: Math.round(performance.now() - start), error };
      const items = history[String(i)];
      items.push(sample);
      if (items.length > retention) items.splice(0, items.length - retention);
      console.log(`[${sample.time}] ${target.name}: ${ok ? 'UP' : 'DOWN'} ${status ?? error} ${sample.latencyMs}ms`);
    }));
  } finally { checking = false; }
}

const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method !== 'GET') { res.writeHead(405); return res.end('Method not allowed'); }
  if (url.pathname === '/api/status') {
    const data = targets.map((t, i) => {
      const samples = history[String(i)];
      const last = samples.at(-1) || null;
      const uptime = samples.length ? Math.round(samples.filter(s => s.ok).length / samples.length * 10000) / 100 : null;
      return { name: t.name, url: t.url, last, uptimePercent: uptime, checks: samples.length, history: samples.slice(-60) };
    });
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    return res.end(JSON.stringify({ generatedAt: new Date().toISOString(), intervalSeconds: interval / 1000, targets: data }));
  }
  if (url.pathname === '/style.css' || url.pathname === '/app.js') {
    const file = url.pathname === '/style.css' ? 'style.css' : 'app.js';
    res.writeHead(200, { 'content-type': file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8', 'x-content-type-options': 'nosniff' });
    return res.end(fs.readFileSync(path.join(dir, file)));
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'", 'x-content-type-options': 'nosniff' });
    return res.end(html);
  }
  res.writeHead(404); res.end('Not found');
});
server.listen(port, '0.0.0.0', () => console.log(`Veluxe Health Monitor listening on http://localhost:${port}`));
checkAll();
setInterval(checkAll, interval).unref();
