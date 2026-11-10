const $ = id => document.getElementById(id);
function node(tag, cls, value) { const el = document.createElement(tag); if(cls) el.className = cls; if(value !== undefined) el.textContent = value; return el; }
function card(target) {
  const el = node('article', 'card');
  const top = node('div', 'card-top');
  top.append(node('h3', '', target.name));
  top.append(node('span', 'badge' + (target.last?.ok ? ' up' : ''), target.last ? (target.last.ok ? '● ONLINE' : '● OFFLINE') : '● PENDING'));
  el.append(top, node('p', 'url', target.url));
  const stats = node('div', 'stats');
  for (const [label, val] of [['LATENCY', target.last ? `${target.last.latencyMs} ms` : '—'], ['UPTIME (OBSERVED)', target.uptimePercent === null ? '—' : `${target.uptimePercent}%`], ['CHECKS', String(target.checks)]]) {
    const box = node('div'); box.append(node('span', 'muted', label), node('strong', '', val)); stats.append(box);
  }
  el.append(stats);
  const bars = node('div', 'bars'); bars.setAttribute('aria-label', 'Last 60 checks, green is up and red is down');
  const samples = target.history || [];
  for(let i = 0; i < 60; i++) bars.append(node('span', 'bar ' + (i < 60 - samples.length ? 'none' : (samples[i - (60 - samples.length)]?.ok ? '' : 'down'))));
  el.append(bars);
  if(target.last?.error) el.append(node('p', '', 'Latest error: ' + target.last.error));
  return el;
}
async function refresh() {
  try {
    const response = await fetch('/api/status', {cache:'no-store'});
    if(!response.ok) throw Error(`HTTP ${response.status}`);
    const data = await response.json();
    $('total').textContent = data.targets.length;
    $('online').textContent = data.targets.filter(t => t.last?.ok).length;
    $('offline').textContent = data.targets.filter(t => t.last && !t.last.ok).length;
    $('updated').textContent = new Date(data.generatedAt).toLocaleTimeString();
    $('targets').replaceChildren(...data.targets.map(card));
    if(!data.targets.length) $('targets').append(node('p', '', 'No targets configured. Add endpoints to config.json.'));
  } catch(e) { $('targets').replaceChildren(node('p', '', `Unable to load status: ${e.message}`)); }
}
refresh(); setInterval(refresh, 10000);
