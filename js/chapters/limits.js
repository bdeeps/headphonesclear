// Chapter 4: what ANC cannot do. It cancels low, steady sounds, and foam and plastic handle the high ones.
// Left: the pressure of a passing wave beside an 8 cm ear cup. Anti-noise can keep only a patch about a tenth of a
// wavelength across quiet, so short waves slip through. Middle: the toy model of passive plus active reduction.
// Bottom: a scope that sweeps across a steady hum, a voice, a clap and a whistle, showing how long ANC needs to catch on.
import { THREE, M } from '../kit.js';
import { COL, graphPlane, drawResponse, passive, active, total, roundRect, C_AIR, fmtHz, fmtLen, clamp } from '../phones.js';

const TYPES = {
  hum: { n: 'Engine hum', f: 100, adapt: 1, say: 'Low, steady and repetitive. The chip locks on within a second and takes most of it away.' },
  voice: { n: 'Voices', f: 700, adapt: 0.4, say: 'Mid pitches that change all the time. The chip can only trim the steadiest parts; the shell and foam do the rest.' },
  clap: { n: 'A clap', f: 2000, adapt: 0.04, say: 'Sudden and brief. It is over before the chip has learned anything, so only the foam helps.' },
  whistle: { n: 'A shrill whistle', f: 3500, adapt: 0.9, say: 'Steady, but the wave is short. The patch of quiet is tiny and the delay matters more, so ANC barely helps.' },
};
const CUP_CM = 8, PXCM = 16;

const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
function noiseAt(type, tau) { // the sound at the cup, −1..1, as a sweep time tau (s)
  if (type === 'hum') return Math.sin(tau * 2 * Math.PI * 7);
  if (type === 'whistle') return Math.sin(tau * 2 * Math.PI * 17);
  if (type === 'voice') { const e = 0.55 + 0.45 * Math.sin(tau * 5.3 + Math.sin(tau * 2.2) * 2); return e * (0.6 * Math.sin(tau * 2 * Math.PI * 4 + Math.sin(tau * 3.1) * 3) + 0.4 * Math.sin(tau * 2 * Math.PI * 9.5)); }
  let v = 0; for (const t0 of [0.8, 2.3, 3.7]) { const d = tau - t0; if (d > 0) v += Math.exp(-d * 14) * Math.sin(d * 2 * Math.PI * 22) * (0.9 + 0.1 * hash(t0)); } return v;
}
const mix = (adaptMax, tau) => adaptMax * (1 - Math.exp(-tau / 0.55));

export default {
  id: 'limits',
  short: 'What it can’t do',
  title: 'Why hum goes and the rest stays',
  subtitle: 'Wavelength, speed and a sealed cup decide what ANC can touch.',
  view: { pos: [0, 0.2, 24], target: [0, 0.3, 0] },
  learn: `<p>Active noise control is best at <b>low, steady</b> sounds: the drone of a jet engine, the rumble of a train, the hum of a motor. There are two reasons.</p>
    <p>First, <b>wavelength</b>. Anti-noise only cancels noise where the two waves line up. Around the spot where the microphone listens, there is a patch, roughly a <b>tenth of a wavelength</b> across, where they do. A 100 Hz wave is 3.4 m long and the patch is bigger than your whole head. A 3 kHz wave is 11 cm long and the patch is about a centimetre, smaller than the cup. Second, <b>time</b>: a delay is a bigger part of a short wave, and a sudden sound such as a clap is over before an adaptive filter can learn it.</p>
    <p>High sounds are where <b>passive isolation</b> shines. Foam, a tight seal and a closed shell block short waves well, and they work from the moment you put them on. A good pair of headphones is both: shell and cushion for the highs, anti-noise for the lows. A loose seal lets the low sound leak around the cup, and that wrecks the ANC as well.</p>
    <p class="tip"><b>Try it:</b> go through the four sounds and watch the chart and the scope. Then turn on <b>Loose seal</b>.</p>
    <p class="note">An illustrative model of passive and active noise reduction. Real headphones differ from model to model.</p>`,
  terms: [
    { t: 'Passive isolation', d: 'Blocking sound with materials: the cushion, the seal and the shell. It works on every pitch, better on high ones.' },
    { t: 'Zone of quiet', d: 'The small region around the microphone where anti-noise cancels well, roughly a tenth of a wavelength across.' },
    { t: 'Adaptive filter', d: 'A filter that keeps adjusting itself to match the noise it hears. It learns from steady sounds and is slow on sudden ones.' },
    { t: 'Seal', d: 'How closely the cushion fits around your ear. A leak spoils low-frequency isolation and ANC.' },
  ],
  defaults: { type: 'hum', freq: 100, anc: true, leak: false },
  controls: [
    { key: 'type', type: 'seg', label: 'The sound', options: Object.entries(TYPES).map(([v, o]) => ({ v, label: o.n })) },
    { key: 'freq', type: 'log', label: 'Pitch', min: 30, max: 8000, fmt: (v) => fmtHz(v) },
    { key: 'anc', type: 'toggle', label: 'Noise cancelling on' },
    { key: 'leak', type: 'toggle', label: 'Loose seal', hint: 'Like glasses arms under the cushion, or a poor fit.' },
  ],
  onChange(s, key) { if (key === 'type') s.freq = TYPES[s.type].f; },
  quiz: [
    { q: 'Which sound does ANC cancel best?', options: ['A sudden clap', 'A steady low hum', 'A shrill whistle', 'A dog barking'], answer: 1, why: 'Low and steady means long waves, a big patch of quiet and an easy pattern to learn.' },
    { q: 'About how big is the “zone of quiet” around the microphone?', options: ['About 10 wavelengths', 'About a wavelength', 'About a tenth of a wavelength', 'It is the whole room'], answer: 2, why: 'A rough rule of thumb: roughly a tenth of a wavelength. Short waves leave a tiny zone.' },
    { q: 'What stops high sounds in headphones?', options: ['Anti-noise only', 'Passive isolation: foam, shell and seal', 'The battery', 'The music itself'], answer: 1, why: 'Cushions and shells block short waves well. That is why ANC headphones need both.' },
  ],
  reel: [
    { ms: 5400, caption: 'A deep hum is a wave metres long, so one microphone speaks for the whole ear. It is cancelled away.', set: { type: 'hum', freq: 100, anc: true, leak: false }, view: { pos: [0, 0.2, 22], target: [0, 0.3, 0] }, spin: 0 },
    { ms: 5400, caption: 'A shrill whistle or a clap is short and sudden. The foam does that job, and cancelling barely helps.', set: { type: 'clap', freq: 2000, anc: true, leak: false }, anim: { freq: [2000, 3500, true] }, view: { pos: [0, 0.2, 22], target: [0, 0.3, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    const root = new THREE.Group(); stage.root.add(root);
    let t = 0, tau = 0;
    const W = 768, H = 432;
    const field = graphPlane(12, 6.75, W, H, (g) => paintField(g, s)); field.position.set(0, 0.3, 0); root.add(field);
    const chart = graphPlane(12, 4.8, 1000, 400, (g, w, h) => paintChart(g, w, h, s)); chart.position.set(0, 6.55, 0); root.add(chart);
    const scope = graphPlane(12, 3.4, 960, 272, (g, w, h) => paintScope(g, w, h, s)); scope.position.set(0, -5.2, 0); root.add(scope);
    stage.label('Looking down on one ear cup (8 cm)', [-4.2, 3.9, 0], root);
    function lam(st) { return (C_AIR / st.freq) * 100; } // cm
    function paintField(g, st) {
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(7,8,12,.9)'; roundRect(g, 0, 0, W, H, 18); g.fill();
      g.save(); roundRect(g, 0, 0, W, H, 18); g.clip();
      const L = lam(st), ph = 2 * Math.PI * 0.4 * t;
      for (let x = 0; x < W; x += 3) {
        const p = Math.cos((2 * Math.PI * ((x - W / 2) / PXCM)) / L - ph);
        g.fillStyle = p > 0 ? `rgba(255,122,89,${(p * 0.62).toFixed(3)})` : `rgba(90,150,235,${(-p * 0.62).toFixed(3)})`; g.fillRect(x, 0, 3, H);
      }
      const cx = W / 2, cy = H / 2 - 18, R = (CUP_CM / 2) * PXCM;
      if (st.anc) { const zr = Math.max(2, (L / 10) * PXCM); g.strokeStyle = '#4fd1c5'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.arc(cx, cy, zr, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(79,209,197,.14)'; g.fill(); }
      g.fillStyle = 'rgba(20,23,32,.92)'; g.strokeStyle = '#c9cfdd'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#f0b9a0'; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.fill();
      if (st.anc) { g.strokeStyle = '#4fd1c5'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.stroke(); }
      g.font = '600 17px Geist, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#eef0f6'; g.fillText('cup', cx, cy - R - 8);
      // ruler: one wavelength
      const px = L * PXCM, y = H - 34, x0 = 24;
      g.strokeStyle = '#eef0f6'; g.fillStyle = '#eef0f6'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y); g.lineTo(Math.min(x0 + px, W - 24), y); g.stroke();
      g.beginPath(); g.moveTo(x0, y - 9); g.lineTo(x0, y + 9); g.stroke();
      g.textAlign = 'left'; g.font = '500 20px Geist, sans-serif';
      if (x0 + px > W - 24) { g.beginPath(); g.moveTo(W - 24, y - 9); g.lineTo(W - 10, y); g.lineTo(W - 24, y + 9); g.fill(); g.fillText(`One wavelength: ${fmtLen(L / 100)} (runs off the picture)`, x0, y - 16); }
      else { g.beginPath(); g.moveTo(x0 + px, y - 9); g.lineTo(x0 + px, y + 9); g.stroke(); g.fillText(`One wavelength: ${fmtLen(L / 100)}`, x0, y - 16); }
      if (st.anc) { g.textAlign = 'right'; g.fillStyle = '#4fd1c5'; g.fillText(`Zone of quiet ≈ ${fmtLen(L / 1000)} across`, W - 20, 34); }
      g.restore();
    }
    function curves(st) {
      const mode = st.anc ? 'hy' : 'off';
      return [
        { fn: (f) => passive(f, st.leak), color: '#ffb547', w: 4, dash: [10, 7], label: 'Foam and shell', dot: true },
        { fn: (f) => active(f, mode, 40, st.leak), color: '#4fd1c5', w: 4, label: 'Anti-noise', dot: true },
        { fn: (f) => total(f, mode, 40, st.leak), color: '#f4f6fb', w: 5, label: 'Both', dot: true },
      ];
    }
    function paintChart(g, w, h, st) { drawResponse(g, w, h, { curves: curves(st), marker: st.freq, ymin: -10, ymax: 70, title: 'How much quieter it gets, by pitch (dB)' }); }
    function paintScope(g, w, h, st) {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.86)'; roundRect(g, 0, 0, w, h, 18); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; roundRect(g, 1, 1, w - 2, h - 2, 18); g.stroke();
      const T = TYPES[st.type], pass = Math.pow(10, -passive(st.freq, st.leak) / 20) , rA = Math.pow(10, -active(st.freq, 'hy', 40, st.leak) / 20);
      const mid = h / 2 + 8, A = h * 0.32, X0 = 30, X1 = w - 24, span = 5, T1 = Math.min(tau, span);
      g.font = '500 17px Geist, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#a8aebf'; g.fillText('What reaches your ear, sweeping over time (shown against what the foam alone lets through)', 30, 26);
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.moveTo(X0, mid); g.lineTo(X1, mid); g.stroke();
      const line = (fn, color, wd) => { g.strokeStyle = color; g.lineWidth = wd; g.lineJoin = 'round'; g.beginPath(); const N = 600; for (let i = 0; i <= N; i++) { const ta = (i / N) * T1; const y = mid - A * fn(ta); i ? g.lineTo(X0 + (ta / span) * (X1 - X0), y) : g.moveTo(X0, y); } g.stroke(); };
      line((ta) => noiseAt(st.type, ta), '#ffb547', 3);
      if (st.anc) line((ta) => noiseAt(st.type, ta) * (1 - mix(T.adapt, ta) * (1 - rA)), '#f4f6fb', 3.5);
      g.textAlign = 'right'; g.fillStyle = '#ffb547'; g.fillText('foam only', X1, h - 12); if (st.anc) { g.fillStyle = '#f4f6fb'; g.fillText('with ANC   ', X1 - 100, h - 12); }
    }
    let q = '', acc = 0;
    return {
      update(dt, st) {
        t += dt; tau += dt; acc += dt;
        if (tau > 6.2) tau = 0;
        const key = st.type + st.freq.toFixed(0) + st.anc + st.leak;
        if (key !== q) { q = key; tau = 0; chart.redraw(); }
        field.redraw(); scope.redraw();
      },
      readout(st) {
        const T = TYPES[st.type], L = lam(st), p = passive(st.freq, st.leak), a = st.anc ? active(st.freq, 'hy', 40, st.leak) * (st.type === 'clap' || st.type === 'voice' ? Math.max(T.adapt, 0.1) : 1) : 0;
        return `<div class="big">${T.n}, ${fmtHz(st.freq)}</div><p class="r-say">${T.say}</p>
          <div class="row"><span>Wavelength is</span><b>${(L / CUP_CM).toFixed(L / CUP_CM < 10 ? 1 : 0)}× the cup</b></div>
          <div class="row"><span>Foam and shell</span><b>${p.toFixed(0)} dB</b></div>
          <div class="row"><span>Anti-noise adds</span><b>${st.anc ? Math.max(0, a).toFixed(0) + ' dB' : 'off'}</b></div>
          <div class="row"><span>Together (model)</span><b>${(p + Math.max(0, a)).toFixed(0)} dB quieter</b></div>`;
      },
    };
  },
};
