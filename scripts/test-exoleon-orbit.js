'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class FakeClassList {
  constructor(node) { this.node = node; }
  values() { return new Set(String(this.node.className || '').split(/\s+/).filter(Boolean)); }
  contains(name) { return this.values().has(name); }
  add(...names) {
    const values = this.values();
    names.forEach(name => values.add(name));
    this.node.className = [...values].join(' ');
  }
  remove(...names) {
    const values = this.values();
    names.forEach(name => values.delete(name));
    this.node.className = [...values].join(' ');
  }
  toggle(name, force) {
    const values = this.values();
    const enabled = force === undefined ? !values.has(name) : force;
    if (enabled) values.add(name); else values.delete(name);
    this.node.className = [...values].join(' ');
    return enabled;
  }
}

class FakeNode {
  constructor() {
    this.className = '';
    this.listeners = {};
    this.properties = {};
    this.classList = new FakeClassList(this);
    this.style = {
      setProperty: (name, value) => { this.properties[name] = value; },
      getPropertyValue: name => this.properties[name] || '',
    };
  }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  setPointerCapture(pointerId) { this.pointerCapture = pointerId; }
}

const field = new FakeNode();
const visual = new FakeNode();
const capsule = new FakeNode();
const orbitState = new FakeNode();
const linkCopy = new FakeNode();
orbitState.textContent = 'AUTO';
linkCopy.textContent = 'CANAL DE PROYECTOS LISTO';
field.querySelector = selector => ({
  '.exo-visual': visual,
  '.exo-capsule-rig': capsule,
}[selector] || null);

const document = {
  getElementById(id) {
    return ({ exoleon: field, 'exo-orbit-state': orbitState, 'exo-link-copy': linkCopy })[id] || null;
  },
};

const reduce = {
  matches: false,
  addEventListener(type, listener) { if (type === 'change') this.listener = listener; },
};
const window = {
  matchMedia() { return reduce; },
};

let intersectionCallback;
class FakeIntersectionObserver {
  constructor(callback) { intersectionCallback = callback; }
  observe() { intersectionCallback([{ isIntersecting: true }]); }
}
window.IntersectionObserver = FakeIntersectionObserver;

const timeouts = new Map();
let timeoutId = 0;
function setTimeoutFake(callback) {
  timeoutId += 1;
  timeouts.set(timeoutId, callback);
  return timeoutId;
}
function clearTimeoutFake(id) { timeouts.delete(id); }
function flushTimeouts() {
  const pending = [...timeouts.values()];
  timeouts.clear();
  pending.forEach(callback => callback());
}

const html = fs.readFileSync('public/index.html', 'utf8');
const marker = '/* ExoLeón living field: visual-only, no network or user-data handling. */';
const markerAt = html.indexOf(marker);
const start = html.lastIndexOf('<script>', markerAt) + '<script>'.length;
const end = html.indexOf('</script>', markerAt);
assert(markerAt > -1 && start > '<script>'.length && end > start, 'ExoLeón living-field script not found');

vm.runInNewContext(html.slice(start, end), {
  window,
  document,
  IntersectionObserver: FakeIntersectionObserver,
  requestAnimationFrame(callback) { callback(); return 1; },
  cancelAnimationFrame() {},
  setTimeout: setTimeoutFake,
  clearTimeout: clearTimeoutFake,
  setInterval() { return 1; },
  clearInterval() {},
});

assert(field.classList.contains('is-online'), 'The orbital field should activate in the viewport');
assert(capsule.listeners.pointerdown && capsule.listeners.pointermove && capsule.listeners.keydown, 'Pointer and keyboard controls should be installed');

capsule.listeners.pointerdown({ pointerId: 7 });
assert(capsule.classList.contains('is-steering'), 'Pointer down should enter steering mode');
assert(capsule.classList.contains('is-boosted'), 'Pointer down should trigger capsule impulse');
assert.equal(orbitState.textContent, 'IMPULSO');

capsule.listeners.pointermove({ pointerId: 7, clientX: 100, clientY: 0 });
assert.equal(visual.style.getPropertyValue('--exo-shell-rx'), '7.00deg');
assert.equal(visual.style.getPropertyValue('--exo-shell-ry'), '10.00deg');
assert.equal(visual.style.getPropertyValue('--exo-glare-x'), '100.0%');

capsule.listeners.pointerup({ pointerId: 7 });
flushTimeouts();
assert(!capsule.classList.contains('is-steering'));
assert(!capsule.classList.contains('is-boosted'));
assert.equal(orbitState.textContent, 'AUTO');

let prevented = false;
capsule.listeners.keydown({ key: 'ArrowLeft', preventDefault() { prevented = true; } });
assert(prevented, 'Arrow controls should prevent page scrolling while the capsule has focus');
assert.equal(visual.style.getPropertyValue('--exo-shell-ry'), '-1.80deg');
assert.equal(orbitState.textContent, 'MANUAL');

capsule.listeners.keydown({ key: 'Enter', preventDefault() {} });
assert(capsule.classList.contains('is-boosted'), 'Enter should trigger capsule impulse');

intersectionCallback([{ isIntersecting: false }]);
assert(!capsule.classList.contains('is-boosted'), 'Leaving the viewport should stop the impulse');
assert.equal(orbitState.textContent, 'AUTO');
assert.equal(visual.style.getPropertyValue('--exo-shell-ry'), '0deg');
intersectionCallback([{ isIntersecting: true }]);

reduce.matches = true;
reduce.listener();
assert(!capsule.classList.contains('is-boosted'));
assert.equal(orbitState.textContent, 'ESTÁTICO');
assert.equal(visual.style.getPropertyValue('--exo-shell-ry'), '0deg');

console.log('ExoLeón orbital-capsule contract passed.');
