// Chapter 2: destructive interference. Anti-noise is the noise flipped upside down. Where the two meet,
// a peak lands on a trough and the air stays still. A small timing error leaves a remainder, and it hurts
// high pitches most, because a fixed delay is a bigger slice of a short wave.
// Everything drawn is a sum of sine waves; the "noise" can be a pure tone or a hum with two overtones.
import { THREE, M, box } from '../kit.js';
import { COL, Trace, db, clamp, fmtHz } from '../phones.js';

const SHAPES = { tone: [[1, 1]], hum: [[1, 1], [2, 0.55], [3, 0.35]] };
const N = 220, X0 = -6.5, LEN = 13;

// Residual amplitude (relative to the noise) for gain g and timing error expressed as a phase φ at the fundamental.
function residual(shape, g, phi) {
  const parts = SHAPES[shape]; let a = 0, b = 0;
  for (let i = 0; i < 64; i++) {
    const x = (i / 64) * Math.PI * 2; let n = 0, m = 0;
    for (const [h, amp] of parts) { n += amp * Math.sin(h * x); m += amp * Math.sin(h * x) - g * amp * Math.sin(h * (x - phi)); }
    a += n * n; b += m * m;
  }
  return Math.sqrt(b / a);
}

export default {
  id: 'cancel',
  short: 'Cancelling a wave',
  title: 'Sound plus anti-sound is quiet',
  subtitle: 'Add a flipped copy of the noise and the two waves erase each other.',
  view: { pos: [0, 1.2, 15], target: [1.3, 0.6, 0] },
  learn: `<p>Two sound waves in the same place simply <b>add</b>. Where a squeeze meets a squeeze the sound gets louder. Where a squeeze meets a stretch, they cancel. That is <b>destructive interference</b>.</p>
    <p>A noise-cancelling headphone listens to the noise and plays a copy of it <b>upside down</b>, called <b>anti-noise</b>. The copy has to match in two ways. It must be the same <b>size</b>, and it must be exactly <b>opposite in phase</b>, which is the same as being in step with the noise but flipped. The top trace is the noise, the middle one is the anti-noise, and the bottom one is what you hear.</p>
    <p>Real timing is never perfect, and a delay is a fraction of a cycle. A delay of 10° at the pitch you are looking at leaves only about <b>15 dB</b> of cancelling, a sixth of the original sound. Switch to the <b>hum with overtones</b> and see how the same delay is a larger phase error for each higher overtone, so the high parts survive.</p>
    <p class="tip"><b>Try it:</b> press <b>Perfect flip</b>, then nudge the <b>timing error</b> by only a few degrees. Then change the <b>size</b> and watch the bar on the right.</p>`,
  terms: [
    { t: 'Destructive interference', d: 'When two waves meet and a peak of one lines up with a trough of the other, so they cancel.' },
    { t: 'Anti-noise', d: 'A copy of the noise with its phase reversed, played so that it cancels the noise at your ear.' },
    { t: 'Phase', d: 'Where a wave is in its cycle. A 180° shift turns peaks into troughs; the timing error is measured the same way.' },
    { t: 'Decibel (dB)', d: 'A logarithmic scale for loudness. Cutting a sound to half its pressure takes off about 6 dB; to a tenth, 20 dB.' },
  ],
  defaults: { err: 0, gain: 1, shape: 'tone', on: true, freq: 200 },
  controls: [
    { key: 'on', type: 'toggle', label: 'Anti-noise on' },
    { key: 'err', type: 'range', label: 'Timing error', min: 0, max: 180, step: 1, fmt: (v) => Math.round(v) + '°', hint: 'How late the anti-noise is, as a slice of one cycle. 180° means it adds to the noise instead.' },
    { key: 'gain', type: 'range', label: 'Size of the anti-noise', min: 0, max: 1.6, step: 0.01, fmt: (v) => Math.round(v * 100) + '% of the noise' },
    { key: 'shape', type: 'seg', label: 'What the noise is', options: [{ v: 'tone', label: 'One pure tone' }, { v: 'hum', label: 'Hum with overtones' }] },
    { key: 'p', type: 'buttons', label: 'Shortcuts', items: [{ label: 'Perfect flip', act: (s) => { s.err = 0; s.gain = 1; s.on = true; } }, { label: 'Backwards (adds)', act: (s) => { s.err = 180; s.gain = 1; s.on = true; } }] },
  ],
  quiz: [
    { q: 'What is anti-noise?', options: ['Silence recorded in a quiet room', 'A copy of the noise, upside down', 'A very high pitched sound', 'A quieter version of the noise in phase'], answer: 1, why: 'Playing the noise with its phase reversed makes peaks meet troughs, so they cancel.' },
    { q: 'The anti-noise is the right shape but arrives half a cycle late. What happens?', options: ['Perfect cancelling', 'It adds to the noise and makes it louder', 'Nothing at all', 'It becomes quieter'], answer: 1, why: 'Half a cycle late turns the flipped copy back into the same shape as the noise, and the two add.' },
    { q: 'For the same small delay, which sound is cancelled worse?', options: ['A low hum', 'A high pitch', 'They are the same', 'It depends on the loudness'], answer: 1, why: 'A fixed delay is a bigger fraction of a short wave, so the phase error grows with pitch.' },
  ],
  reel: [
    { ms: 5400, caption: 'Anti-noise is the noise flipped upside down. Peak meets trough and the air goes still.', set: { err: 170, gain: 1, shape: 'tone', on: true }, anim: { err: [170, 0] }, view: { pos: [0, 1.2, 14], target: [1.3, 0.6, 0] }, spin: 0 },
    { ms: 5200, caption: 'But it must arrive on time. A tiny delay and the quiet leaks back, high pitches first.', set: { err: 0, gain: 1, shape: 'hum', on: true }, anim: { err: [0, 50] }, view: { pos: [0, 1.2, 14], target: [1.3, 0.6, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    const root = new THREE.Group(); stage.root.add(root);
    const rows = [
      { y: 3.1, color: COL.noise, name: 'The noise', tr: null },
      { y: 0.6, color: COL.anti, name: 'The anti-noise (flipped)', tr: null },
      { y: -1.9, color: COL.sum, name: 'What you hear', tr: null },
    ];
    rows.forEach((r) => {
      r.tr = new Trace(stage, N, { color: r.color, width: r === rows[2] ? 4.5 : 3 }); root.add(r.tr.obj);
      const base = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 0.6, 0.02), M.ghost(0xffffff, 0.2)); base.position.set(0, r.y, -0.02); root.add(base);
      stage.label(r.name, [X0 + 0.2, r.y + 1.15, 0], root, r === rows[1] ? 'hot' : '');
    });
    const bar = box(0.7, 1, 0.7, M.glow(COL.anti)); root.add(bar);
    const barBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5, 0.9), M.ghost(0xffffff, 0.06)); barBox.position.set(8.2, 0.6, 0); root.add(barBox);
    stage.label('Loudness at your ear', [8.2, 3.5, 0], root);
    let t = 0;
    const colAnti = new THREE.Color(COL.anti), colBad = new THREE.Color(COL.noise);
    function draw(st) {
      const parts = SHAPES[st.shape], k = (2 * Math.PI) / (14 * (150 / st.freq)) , phi = (st.err * Math.PI) / 180, g = st.on ? st.gain : 0;
      const w = 2 * Math.PI * 0.55; // visual speed: a bit over half a cycle per second
      const fn = (x, part) => { let v = 0; for (const [h, a] of parts) { const ang = h * (k * x - w * t); v += part === 0 ? a * Math.sin(ang) : part === 1 ? -g * a * Math.sin(h * (k * x - w * t - phi)) : 0; } return v; };
      const scale = 0.62 / (st.shape === 'hum' ? 1.5 : 1);
      rows[0].tr.set((i) => { const x = X0 + (i / (N - 1)) * LEN; return [x, rows[0].y + scale * fn(x, 0), 0]; });
      rows[1].tr.set((i) => { const x = X0 + (i / (N - 1)) * LEN; return [x, rows[1].y + scale * fn(x, 1), 0]; });
      rows[2].tr.set((i) => { const x = X0 + (i / (N - 1)) * LEN; return [x, rows[2].y + scale * (fn(x, 0) + fn(x, 1)), 0]; });
      const r = residual(st.shape, g, phi);
      const h = Math.max(0.04, Math.min(r, 1.7) * 2.2);
      bar.scale.y = h; bar.position.set(8.2, -1.9 + h / 2 + 0.0, 0);
      bar.material.color.copy(colAnti).lerp(colBad, clamp(r, 0, 1));
      return r;
    }
    let res = draw(s);
    return {
      update(dt, st) { t += dt; res = draw(st); },
      readout(st) {
        const phi = (st.err * Math.PI) / 180, r = residual(st.shape, st.on ? st.gain : 0, phi), d = -db(r);
        const msg = !st.on ? 'Anti-noise is off. You hear the noise.' : r > 1.02 ? 'Worse than doing nothing: the anti-noise adds to the noise.' : d > 20 ? 'Deep cancelling.' : d > 8 ? 'A good cut, but you can still hear it.' : d > 1 ? 'Only a little quieter.' : 'No real change.';
        return `<div class="big">${!st.on ? '0 dB' : r > 1.02 ? '+' + (-d).toFixed(0) + ' dB louder' : d > 40 ? 'Over 40 dB quieter' : d.toFixed(0) + ' dB quieter'}</div><p class="r-say">${msg}</p>
          <div class="row"><span>Left over</span><b>${Math.round(Math.min(r, 9.99) * 100)}% of the noise</b></div>`;
      },
    };
  },
};
