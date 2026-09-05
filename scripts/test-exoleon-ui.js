'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class FakeClassList {
  constructor(node) { this.node = node; }
  _set() { return new Set(String(this.node.className || '').split(/\s+/).filter(Boolean)); }
  contains(name) { return this._set().has(name); }
  toggle(name, force) {
    const values = this._set();
    const enabled = force === undefined ? !values.has(name) : force;
    if (enabled) values.add(name); else values.delete(name);
    this.node.className = [...values].join(' ');
    return enabled;
  }
}

class FakeNode {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this._text = '';
    this.classList = new FakeClassList(this);
  }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() { this.focused = true; }
  closest() { return null; }
  set textContent(value) { this._text = String(value); if (value === '') this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent || '').join(''); }
  set innerHTML(value) { this._text = String(value); this.children = []; }
  get innerHTML() { return this._text; }
}

const ids = [
  'exo-toggle', 'exo-panel', 'exo-msgs', 'exo-in', 'exo-go', 'exo-close',
  'exo-quick', 'exo-lead', 'exo-status', 'exo-invite', 'exoleon', 'exo-link-copy',
];
const nodes = Object.fromEntries(ids.map(id => [id, new FakeNode()]));
nodes['exo-panel'].className = 'open';
nodes['exo-go'].textContent = 'ANALIZAR';

const document = {
  getElementById(id) { return nodes[id] || null; },
  createElement(tagName) { return new FakeNode(tagName); },
  createTextNode(text) { const node = new FakeNode('#text'); node.textContent = text; return node; },
};

const fetchCalls = [];
async function fetch(url) {
  fetchCalls.push(url);
  if (url.endsWith('/health')) return { ok: true, json: async () => ({ ok: true }) };
  await new Promise(resolve => setTimeout(resolve, 20));
  return {
    ok: true,
    json: async () => ({ ok: true, result: 'Detecté un **proceso repetitivo**. ¿Cuántas horas ocupa cada semana?', engine: 'anthropic' }),
  };
}

class FakeIntersectionObserver {
  constructor(callback) { this.callback = callback; }
  observe() { this.callback([{ isIntersecting: true }]); }
  disconnect() { this.disconnected = true; }
}

const window = {
  dataLayer: [],
  IntersectionObserver: FakeIntersectionObserver,
  open() {},
};

const html = fs.readFileSync('public/index.html', 'utf8');
const marker = '<!-- ExoLeón conversation controller: UI lives in #exoleon -->';
const start = html.indexOf('<script>', html.indexOf(marker)) + '<script>'.length;
const end = html.indexOf('</script>', start);
assert(start > '<script>'.length && end > start, 'ExoLeón controller script not found');

const context = {
  window,
  document,
  fetch,
  IntersectionObserver: FakeIntersectionObserver,
  AbortController,
  FormData: class {},
  performance,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  console,
};
vm.runInNewContext(html.slice(start, end), context);

(async () => {
  nodes['exo-in'].value = 'Quiero automatizar reportes';
  const pendingRequest = nodes['exo-go'].listeners.click({ type: 'click' });

  assert.equal(nodes['exo-go'].textContent, 'PROCESANDO');
  assert.equal(nodes['exo-panel'].attributes['aria-busy'], 'true');
  assert(nodes['exo-msgs'].children.some(node => node.className.includes('pending')), 'Pending response bubble should render immediately');

  await pendingRequest;

  const answer = nodes['exo-msgs'].children.at(-1);
  assert.equal(answer.className, 'exo-m bot');
  assert(answer.children.some(node => node.tagName === 'STRONG' && node.textContent === 'proceso repetitivo'), 'Safe bold formatting should be rendered');
  assert(!answer.textContent.includes('**'), 'Raw markdown markers should not remain visible');
  assert.equal(nodes['exo-go'].textContent, 'ENVIAR');
  assert.equal(nodes['exo-panel'].attributes['aria-busy'], undefined);
  assert(fetchCalls.some(url => url.endsWith('/health')), 'VBC warm-up should run near the ExoLeón section');
  assert(fetchCalls.some(url => url.endsWith('/exo/chat')), 'Chat request should reach VBC');
  assert(window.dataLayer.some(entry => entry.event === 'exo_response_ms'), 'Client response latency should be tracked');
  console.log('ExoLeón responsive-feedback contract passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
