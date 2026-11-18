// Chapter 3: where to put the microphones, and the race against time.
// Feedforward: a mic on the outside hears the noise before it reaches the ear and the chip has a head start.
// Feedback: a mic inside hears what is left and corrects it, which is always after the fact.
// Hybrid: both. The picture is slowed about 3,500 times, and one unit is about 3 cm. The response chart uses the toy model in phones.js.
import { THREE, M, sphere } from '../kit.js';
import { COL, V, makeCup, makeEar, graphPlane, drawResponse, active, howls, BUDGET_US, clamp, fmtHz } from '../phones.js';

const CV = 3, SLOW = 3567; // visual seconds of animation per real second ×1e-6 → 1 µs = SLOW µs of picture
const S_US = SLOW * 1e-6; // visual seconds per real microsecond
const X_SRC = -10, X_MIC = -1.85, X_DRV = -0.77, X_IN = 0.04, X_DRUM = 3.1, PERIOD = 8;
const MODES = { off: 'Off', ff: 'Feedforward', fb: 'Feedback', hy: 'Hybrid' };
const INFO = {
  off: 'No anti-noise. Only the foam and shell help.',
  ff: 'The outer microphone hears each wave about 100 microseconds before it reaches the ear. If the chip is quick, the anti-noise is ready on time.',
  fb: 'The inner microphone hears the wave only once it is at the ear. The anti-noise is always a little behind, so this works on steady sounds.',
  hy: 'Both loops together. The outer mic gets most of the noise and the inner mic cleans up what is left.',
};

export default {
  id: 'loop',
  short: 'Two microphones and a race',
  title: 'Feedforward, feedback, hybrid',
  subtitle: 'Where the microphone sits decides how much time the electronics get.',
  view: { pos: [-1.5, 0.6, 19], target: [-2.2, -1.6, 0] },
  learn: `<p>The anti-noise has a deadline. The noise reaches your ear a fraction of a second after the microphone hears it, and the copy must be there at the same moment. That is the <b>latency problem</b>: every step the signal takes (microphone, converter, filter, amplifier, driver) eats into the time available.</p>
    <p>With <b>feedforward</b> ANC, a microphone sits on the <b>outside</b>. It hears the noise a little before it reaches the ear, so the chip gets a head start. With <b>feedback</b> ANC, a microphone sits <b>inside</b> next to the ear and keeps measuring what is left. That corrects errors and tolerates a leaky fit, but it only reacts after the noise has arrived, and a loop with too much delay can <b>howl</b> like a microphone held to a speaker. A <b>hybrid</b> design uses both.</p>
    <p>In this model the head start is about <b>100 microseconds</b>, an illustrative figure for a cup of this size. Slide the <b>delay</b> past it and watch the chart. Cancelling collapses from the top of the frequency range downward.</p>
    <p class="tip"><b>Try it:</b> pick a type, then raise the electronics delay. Watch the orange and teal waves reach the eardrum, and see how the chart changes.</p>
    <p class="note">A simplified model. Real products use adaptive filters and many tricks beyond this.</p>`,
  terms: [
    { t: 'Feedforward ANC', d: 'An outer microphone measures the noise before it arrives, and the chip predicts the anti-noise from it.' },
    { t: 'Feedback ANC', d: 'An inner microphone measures what is left at the ear and the loop pushes it toward zero.' },
    { t: 'Hybrid ANC', d: 'Using a feedforward and a feedback microphone together.' },
    { t: 'Latency', d: 'The delay between a microphone hearing a sound and the driver playing the anti-noise.' },
  ],
  defaults: { mode: 'ff', lat: 40 },
  controls: [
    { key: 'mode', type: 'seg', label: 'Type of ANC', options: Object.entries(MODES).map(([v, label]) => ({ v, label })) },
    { key: 'lat', type: 'range', label: 'Electronics delay', min: 0, max: 300, step: 1, fmt: (v) => Math.round(v) + ' µs', hint: 'A microsecond is a millionth of a second. The sound has about 100 µs to spare in this model.' },
    { key: 'go', type: 'buttons', label: 'Replay', items: [{ label: 'Send the noise again', act: (s, inst) => inst.restart() }] },
  ],
  quiz: [
    { q: 'Where is the microphone in feedforward ANC?', options: ['Inside the cup next to the ear', 'On the outside of the cup', 'In the phone', 'It has none'], answer: 1, why: 'It listens to the noise before it gets to the ear, which gives the chip a head start.' },
    { q: 'What goes wrong if the electronics are too slow?', options: ['The battery runs flat', 'The anti-noise arrives late and stops cancelling, high pitches first', 'The music gets louder', 'Nothing, the delay is inaudible'], answer: 1, why: 'A late anti-noise is out of step, and the error is largest for short, high-pitched waves.' },
    { q: 'What is the weakness of feedback-only ANC?', options: ['It reacts after the noise has arrived and can howl if the loop is slow', 'It cannot cancel low sounds', 'It needs no battery', 'It only works outdoors'], answer: 0, why: 'The inner mic hears what is left, so it is always late, and a late loop with gain can squeal.' },
  ],
  reel: [
    { ms: 5600, caption: 'A microphone outside hears the noise first. The chip has about a tenth of a millisecond to flip it.', set: { mode: 'ff', lat: 30 }, act: (s, inst) => inst.restart(), view: { pos: [-1.5, 0.6, 17.5], target: [-2.2, -1.6, 0] }, spin: 0 },
    { ms: 5600, caption: 'Too slow, and the flipped copy lands late. Cancelling fades from the top of the range down.', set: { mode: 'hy', lat: 20 }, anim: { lat: [20, 160] }, act: (s, inst) => inst.restart(), view: { pos: [-1.5, 0.6, 17.5], target: [-2.2, -1.6, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    const root = new THREE.Group(); stage.root.add(root);
    const cup = makeCup(2.2); root.add(cup);
    const ear = makeEar(0.55, 2.5, 0.35); root.add(ear);
    const src = sphere(0.7, M.plastic(COL.noise), 24); src.position.set(X_SRC - 0.7, 0, 0); root.add(src);
    stage.label('Noise', [X_SRC - 0.7, 1.2, 0], root);
    stage.label('Outer mic', [X_MIC, 2.9, 0], root);
    stage.label('Inner mic', [0.1, 2.4, 0], root, 'hot');
    stage.label('Driver', [X_DRV, -2.8, 0], root);
    stage.label('Eardrum', [X_DRUM + 0.1, -0.9, 0], root);
    const disc = (color) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.05, 40), M.ghost(color, 0.5)); m.rotation.z = Math.PI / 2; root.add(m); return m; };
    const dN = disc(COL.noise), dA = disc(COL.anti), dA2 = disc(COL.anti);
    const flash = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 40), M.glow(COL.sum, { side: THREE.DoubleSide, transparent: true })); flash.rotation.y = Math.PI / 2; flash.position.set(X_DRUM + 0.05, 0, 0); root.add(flash);
    const graph = graphPlane(12.4, 4.8, 1000, 387, (g, W, H) => paint(g, W, H, s)); graph.position.set(-3.6, -6.4, 0); root.add(graph);
    function paint(g, W, H, st) {
      const howl = st.mode !== 'ff' && st.mode !== 'off' && howls(st.lat);
      drawResponse(g, W, H, {
        curves: [{ fn: (f) => active(f, st.mode, st.lat), color: '#4fd1c5', w: 5, label: 'Anti-noise: how much quieter' }], ymin: -15, ymax: 45,
        flag: howl ? 'HOWL: the loop is singing' : '', title: `${MODES[st.mode]}, ${Math.round(st.lat)} µs delay`,
      });
    }
    let t = 0, last = '';
    const set = (m, x, on, vis = true) => { m.position.x = x; m.visible = vis && on; };
    function frame(st) {
      const L = st.lat * S_US, tt = t % PERIOD;
      const ff = st.mode === 'ff' || st.mode === 'hy', fb = st.mode === 'fb' || st.mode === 'hy';
      const tn = (x) => (x - X_SRC) / CV; // when the noise front is at x
      const xNoise = X_SRC + CV * tt;
      set(dN, xNoise, true, xNoise < X_DRUM + 0.9);
      let a1 = null, a2 = null;
      if (ff) a1 = tn(X_MIC) + L;
      if (fb) a2 = tn(X_IN) + L;
      const place = (d, te) => { if (te === null) { d.visible = false; return; } const x = X_DRV + CV * (tt - te); d.visible = tt >= te && x < X_DRUM + 0.9; d.position.x = x; };
      place(dA, a1); place(dA2, a2);
      cup.micOut.scale.setScalar(ff ? 1 + (Math.abs(tt - tn(X_MIC)) < 0.35 ? 0.7 : 0) : 0.5); cup.micIn.scale.setScalar(fb ? 1 + (Math.abs(tt - tn(X_IN)) < 0.35 ? 0.7 : 0) : 0.5);
      cup.micOut.material.color.setHex(ff ? COL.amber : 0x5a5f6e); cup.micIn.material.color.setHex(fb ? COL.violet : 0x5a5f6e);
      cup.driver.cone.position.x = (dA.visible && tt - a1 < 0.3) || (dA2.visible && tt - a2 < 0.3) ? -0.05 : 0;
      // flash when anything reaches the drum
      const hits = [tn(X_DRUM)]; if (a1 !== null) hits.push(a1 + (X_DRUM - X_DRV) / CV); if (a2 !== null) hits.push(a2 + (X_DRUM - X_DRV) / CV);
      const near = Math.min(...hits.map((h) => Math.abs(tt - h)));
      flash.material.opacity = clamp(1 - near / 0.35, 0, 1); flash.scale.setScalar(1 + (1 - clamp(near / 0.35, 0, 1)) * 0.4);
      const key = st.mode + ':' + Math.round(st.lat);
      if (key !== last) { last = key; graph.redraw(st); }
    }
    frame(s);
    return {
      restart() { t = 0; },
      update(dt, st) { t += dt; frame(st); },
      readout(st) {
        const howl = (st.mode === 'fb' || st.mode === 'hy') && howls(st.lat);
        let lines = `<div class="big">${MODES[st.mode]}</div><p class="r-say">${INFO[st.mode]}</p>`;
        if (st.mode === 'ff' || st.mode === 'hy') {
          const late = st.lat - BUDGET_US;
          lines += `<div class="row"><span>Head start</span><b>${BUDGET_US} µs</b></div><div class="row"><span>Anti-noise is</span><b>${late <= 0 ? 'on time' : Math.round(late) + ' µs late'}</b></div>`;
        } else if (st.mode === 'fb') lines += `<div class="row"><span>Anti-noise is</span><b>always about ${Math.round(st.lat + 75)} µs late</b></div>`;
        let f = 20; while (f < 12000 && active(f, st.mode, st.lat) >= 10) f *= 1.05;
        if (st.mode !== 'off') lines += `<div class="row"><span>Cuts at least 10 dB up to</span><b>${active(20, st.mode, st.lat) < 10 ? 'nowhere' : fmtHz(Math.round(f / 10) * 10)}</b></div>`;
        if (howl) lines += `<div class="row"><span>Warning</span><b style="color:#ff6b6b">feedback howl</b></div>`;
        return lines;
      },
    };
  },
};
