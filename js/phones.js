// Shared parts for HeadphonesClear: a cutaway ear cup, fat-line traces, canvas graphs, and a toy model of how
// well passive isolation and the three kinds of active noise control (ANC) work at each frequency.
//
// The model is a teaching sketch, not a measurement of any product. Its shapes follow the standard picture:
//  - passive isolation (foam, shell, seal) rises with frequency;
//  - feedforward ANC works while its electronics are quicker than the sound's trip from the outer microphone to the ear;
//  - feedback ANC is a control loop whose gain fades with frequency, and whose delay turns it into a booster
//    near the top of its range (and a howl if the delay is too long);
//  - the hybrid multiplies the two.
import { THREE, M, sphere, torus, rod, latheX, canvasTexture, clamp, lerp, smooth } from './kit.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export { clamp, lerp, smooth, THREE };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const COL = { noise: 0xff7a59, anti: 0x4fd1c5, sum: 0xf4f6fb, amber: 0xffb547, lime: 0xa3e635, violet: 0xc49bff, dim: 0x8f9bb5, cyan: 0x8ef0ff };
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');
export const C_AIR = 343; // m/s at about 20 °C
export const db = (r) => 20 * Math.log10(Math.max(r, 1e-5));
export const fmtHz = (f) => (f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1).replace(/\.0$/, '') + ' kHz' : Math.round(f) + ' Hz');
export const fmtLen = (m) => (m >= 1 ? m.toFixed(1) + ' m' : (m * 100).toFixed(m < 0.1 ? 1 : 0) + ' cm');

// ---------------------------------------------------------------- the toy ANC model
export const BUDGET_US = 100; // time between the outer mic hearing a sound and the anti-noise having to leave the driver (illustrative geometry)
const PASSIVE = [[20, 0.5], [50, 1], [100, 3], [250, 8], [500, 14], [1000, 20], [2000, 27], [4000, 35], [8000, 38], [16000, 38]];
export function passive(f, leak = false) {
  let v = PASSIVE[PASSIVE.length - 1][1];
  for (let i = 0; i < PASSIVE.length - 1; i++) {
    const [f0, a] = PASSIVE[i], [f1, b] = PASSIVE[i + 1];
    if (f <= f1) { v = lerp(a, b, clamp(Math.log(f / f0) / Math.log(f1 / f0), 0, 1)); break; }
  }
  return leak ? Math.max(0, v - 9 * Math.exp(-f / 1500) - 3) : v;
}
function loopG(f, L) { // feedback loop gain, as a complex number
  const w = 2 * Math.PI * f, mag = 8 / Math.sqrt(1 + (f / 250) ** 2), ph = -Math.atan(f / 250) - w * (L + 20) * 1e-6;
  return [mag * Math.cos(ph), mag * Math.sin(ph), mag, ph];
}
export function howls(L) { // would the feedback loop sing? (gain above 1 where the phase passes 180°)
  for (let f = 100; f <= 12000; f *= 1.04) { const g = loopG(f, L); if (g[2] >= 1 && g[3] <= -Math.PI) return true; }
  return false;
}
export function ffResidual(f, L) {
  const e = (Math.max(0, L - BUDGET_US) + 10) * 1e-6, g = 0.94 / Math.sqrt(1 + (f / 2500) ** 2);
  return Math.sqrt(1 + g * g - 2 * g * Math.cos(2 * Math.PI * f * e));
}
export function fbResidual(f, L) { const g = loopG(f, L); return 1 / Math.hypot(1 + g[0], g[1]); }
// How much quieter (dB, positive = quieter) the anti-noise alone makes a steady tone at f.
export function active(f, mode, L, leak = false) {
  if (mode === 'off') return 0;
  let r = mode === 'ff' ? ffResidual(f, L) : mode === 'fb' ? fbResidual(f, L) : ffResidual(f, L) * fbResidual(f, L);
  if ((mode === 'fb' || mode === 'hy') && howls(L)) r = Math.max(r, 3);
  let a = clamp(-db(r), -15, 42);
  if (leak) a *= 1 - 0.75 * Math.exp(-f / 1000);
  return a;
}
export const total = (f, mode, L, leak) => passive(f, leak) + active(f, mode, L, leak);

// ---------------------------------------------------------------- fat lines
// A polyline drawn as thick screen-space lines, rewritten each frame.
export class Trace {
  constructor(stage, n, { color = 0xffffff, width = 3, opacity = 1 } = {}) {
    this.n = n; this.arr = new Float32Array((n - 1) * 6);
    this.geo = new LineSegmentsGeometry(); this.geo.setPositions(new Float32Array((n - 1) * 6).fill(0.0001));
    this.mat = stage.lineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, worldUnits: false });
    this.obj = new LineSegments2(this.geo, this.mat); this.obj.frustumCulled = false;
  }
  // fn(i) → [x, y, z]
  set(fn) {
    const a = this.arr; let p = fn(0);
    for (let i = 1; i < this.n; i++) { const q = fn(i), o = (i - 1) * 6; a[o] = p[0]; a[o + 1] = p[1]; a[o + 2] = p[2]; a[o + 3] = q[0]; a[o + 4] = q[1]; a[o + 5] = q[2]; p = q; }
    const buf = this.geo.attributes.instanceStart.data; buf.array.set(a); buf.needsUpdate = true;
  }
  get visible() { return this.obj.visible; }
  set visible(v) { this.obj.visible = v; }
}

// ---------------------------------------------------------------- canvas graphs on a plane
export function graphPlane(wU, hU, pxW, pxH, draw) {
  const cv = canvasTexture(pxW, pxH, draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wU, hU), new THREE.MeshBasicMaterial({ map: cv.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
  mesh.redraw = cv.redraw; mesh.ctx = cv;
  return mesh;
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// Reduction-versus-frequency chart. curves: [{ fn(f) → dB quieter, color, dash, w, label }]. marker: Hz.
export function drawResponse(g, W, H, { curves, marker, ymin = -15, ymax = 60, flag = '', title = 'How much quieter it gets (dB)' }) {
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(7,8,12,.82)'; roundRect(g, 0, 0, W, H, 18); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2; roundRect(g, 1, 1, W - 2, H - 2, 18); g.stroke();
  const L = 64, R = 24, T = 44, B = 52, pw = W - L - R, ph = H - T - B, F0 = 20, F1 = 12000;
  const X = (f) => L + (Math.log(f / F0) / Math.log(F1 / F0)) * pw, Y = (v) => T + (1 - (v - ymin) / (ymax - ymin)) * ph;
  g.font = '500 20px Geist, system-ui, sans-serif'; g.fillStyle = '#a8aebf'; g.textAlign = 'left'; g.fillText(title, L, 28);
  g.font = '500 17px Geist Mono, monospace'; g.textAlign = 'center'; g.lineWidth = 1;
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) { g.strokeStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(X(f), T); g.lineTo(X(f), T + ph); g.stroke(); g.fillStyle = '#737a8e'; g.fillText(f >= 1000 ? f / 1000 + 'k' : f, X(f), H - 24); }
  g.textAlign = 'right';
  for (let v = Math.ceil(ymin / 10) * 10; v <= ymax; v += 10) { g.strokeStyle = v === 0 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(L + pw, Y(v)); g.stroke(); g.fillStyle = '#737a8e'; g.fillText(v, L - 8, Y(v) + 6); }
  g.textAlign = 'center'; g.fillStyle = '#737a8e'; g.fillText('Hz', L + pw / 2, H - 6);
  g.save(); g.beginPath(); g.rect(L, T - 4, pw, ph + 8); g.clip();
  for (const c of curves) {
    g.beginPath(); g.setLineDash(c.dash || []); g.strokeStyle = c.color; g.lineWidth = c.w || 4; g.lineJoin = 'round';
    for (let i = 0; i <= 120; i++) { const f = F0 * Math.pow(F1 / F0, i / 120), v = clamp(c.fn(f), ymin - 5, ymax + 5); i ? g.lineTo(X(f), Y(v)) : g.moveTo(X(f), Y(v)); }
    g.stroke(); g.setLineDash([]);
  }
  g.restore();
  if (marker) {
    const x = X(clamp(marker, F0, F1)); g.strokeStyle = '#ffb547'; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); g.setLineDash([]);
    for (const c of curves) { if (!c.dot) continue; const v = clamp(c.fn(marker), ymin, ymax); g.fillStyle = c.color; g.beginPath(); g.arc(x, Y(v), 7, 0, 7); g.fill(); }
  }
  let lx = L + 8; g.textAlign = 'left'; g.font = '500 17px Geist, system-ui, sans-serif';
  for (const c of curves) { if (!c.label) continue; g.fillStyle = c.color; g.fillRect(lx, T + 8, 22, 4); g.fillStyle = '#c9cfdd'; g.fillText(c.label, lx + 30, T + 15); lx += 46 + g.measureText(c.label).width; }
  if (flag) { g.font = '600 28px Geist, system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ff6b6b'; g.fillText(flag, L + pw / 2, T + ph / 2 + 8); }
}

// ---------------------------------------------------------------- the ear cup
// Axis along X; the ear is on the +X side. Scale s. Open (see-through) so the insides show.
export function makeCup(s = 1, { shell = 0x9bb0d0 } = {}) {
  const g = new THREE.Group();
  const shellM = latheX([[-0.95, 0], [-0.9, 0.6], [-0.7, 1.0], [-0.2, 1.15], [0.1, 1.12], [0.1, 1.0], [-0.15, 1.02], [-0.65, 0.88], [-0.82, 0.55], [-0.86, 0]], M.clear(shell, 0.26, { roughness: 0.2 }), { seg: 48 });
  const cushion = torus(1.0, 0.2, M.matte(0x3a4150), 56); cushion.rotation.y = Math.PI / 2; cushion.position.x = 0.14;
  const driver = new THREE.Group(); driver.position.x = -0.35;
  const magnet = rod(-0.22, -0.02, 0.38, 0.38, M.metal(0x8a93a6)), basket = rod(-0.02, 0.06, 0.82, 0.82, M.metal(0x58607a), 40, true);
  const cone = latheX([[0.06, 0.82], [0.0, 0.5], [-0.04, 0.18], [-0.04, 0]], M.plastic(0xdfe6f3, { side: THREE.DoubleSide }), { seg: 40 });
  driver.add(magnet, basket, cone); driver.cone = cone;
  const micOut = sphere(0.1, M.glow(COL.amber), 14); micOut.position.set(-0.84, 0.62, 0);
  const micIn = sphere(0.09, M.glow(COL.violet), 14); micIn.position.set(0.02, 0.48, 0);
  g.add(shellM, cushion, driver, micOut, micIn);
  g.driver = driver; g.micOut = micOut; g.micIn = micIn;
  g.scale.setScalar(s);
  return g;
}
// A small ear canal and drum, axis along X, starting at x0.
export function makeEar(x0, len = 1.2, r = 0.16) {
  const g = new THREE.Group();
  const canal = rod(x0, x0 + len, r, r, M.clear(0xf0b9a0, 0.3, { roughness: 0.6 }), 24, true);
  const drum = rod(x0 + len, x0 + len + 0.03, r * 0.95, r * 0.95, M.glow(COL.amber), 24);
  g.add(canal, drum); g.drum = drum; g.drumX = x0 + len;
  return g;
}
