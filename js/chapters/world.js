// Chapter 5: out in the world. The same headphones in four places, and what transparency mode does.
// Bars show the sound level in eight pitch bands outside (orange) and at your ear (teal). The spectra are
// illustrative shapes (low-heavy for a plane or car, mid-heavy for people), not measurements.
import { THREE, M, box } from '../kit.js';
import { approach } from '../kit.js';
import { COL, passive, active, makeCup } from '../phones.js';

const BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
const ENVS = {
  plane: { n: 'Aircraft cabin', lv: [86, 84, 78, 72, 68, 64, 60, 54], say: 'A constant roar, mostly low. This is the home ground of ANC, and the reason it was invented for pilots.' },
  car: { n: 'Car on a road', lv: [80, 76, 68, 64, 62, 58, 54, 48], say: 'Engine and tyre rumble sit low and steady. Cars use the same trick with their own speakers and microphones.' },
  office: { n: 'Open office', lv: [44, 48, 54, 58, 58, 54, 48, 40], say: 'Voices and keyboards live in the middle and top. Steady air-conditioning goes; talk mostly does not.' },
  street: { n: 'City street', lv: [64, 66, 68, 70, 72, 72, 68, 60], say: 'A mix: traffic rumble goes, but horns, sirens and sudden sounds are not predictable.' },
};
const MODES = { off: 'Passive only', anc: 'ANC on', trans: 'Transparency' };
const lvlAt = (env, i, mode) => {
  const o = ENVS[env].lv[i], f = BANDS[i];
  if (mode === 'trans') return o - 2; // the outer mics play the sound back to you
  const red = passive(f) + (mode === 'anc' ? active(f, 'hy', 40) : 0);
  return o - red;
};
const sum = (a) => 10 * Math.log10(a.reduce((x, v) => x + Math.pow(10, v / 10), 0));
const H_PER_DB = 0.075, FLOOR = 20;

export default {
  id: 'world',
  short: 'On a plane, in a car',
  title: 'Planes, cars and transparency',
  subtitle: 'The same headphones, four places, and a mode that hears for you.',
  view: { pos: [0, 3.8, 14.5], target: [0, 2.3, 0] },
  learn: `<p>Active noise control began with <b>aircraft</b>, where pilots sat in a steady roar for hours. It has since moved into the cabin, into the car and into the earbud. Wherever the noise is <b>low, loud and steady</b>, it works well.</p>
    <p>Each bar here is one pitch band, from deep (left) to shrill (right). Orange is the outside level and teal is what reaches your ear. On a plane the left bars drop hugely. In an open office, where the problem is voices and keyboards, there is much less to remove.</p>
    <p><b>Transparency mode</b> flips the idea around. The outer microphones, which usually feed the anti-noise, now play the outside sound into the cups, so you can hear an announcement or a person talking while the headphones are on. Some products also let your own voice through so you do not sound muffled.</p>
    <p class="tip"><b>Try it:</b> pick a place, then switch between <b>passive only</b>, <b>ANC</b> and <b>transparency</b>. Notice which bars move.</p>
    <p class="note">The levels are illustrative shapes in decibels (dB), not measurements of a real place or product.</p>`,
  terms: [
    { t: 'Transparency mode', d: 'The outer microphones play the outside sound into the ear cups so you can hear your surroundings.' },
    { t: 'Pitch band', d: 'A slice of the frequency range, such as 125 Hz or 2 kHz, used to describe how loud a sound is at each pitch.' },
    { t: 'Active headset', d: 'A headset with microphones and electronics that cancel noise, first used by aircrew.' },
    { t: 'Road noise cancelling', d: 'A car system that uses microphones and the audio speakers (and sometimes sensors on the body) to cancel low drone.' },
  ],
  defaults: { env: 'plane', mode: 'anc' },
  controls: [
    { key: 'env', type: 'seg', label: 'Where you are', options: Object.entries(ENVS).map(([v, o]) => ({ v, label: o.n })) },
    { key: 'mode', type: 'seg', label: 'Headphones', options: Object.entries(MODES).map(([v, label]) => ({ v, label })) },
  ],
  quiz: [
    { q: 'Why was ANC first built for pilots?', options: ['It is a fashion item', 'Aircraft noise is loud, low and steady, which ANC handles well', 'Planes are silent', 'Pilots cannot wear foam'], answer: 1, why: 'Engine drone is exactly the kind of noise anti-noise can cancel.' },
    { q: 'What does transparency mode do?', options: ['Turns the music off', 'Plays outside sound in through the outer microphones', 'Cancels more noise', 'Makes the cups clear'], answer: 1, why: 'The microphones that normally listen for noise now pass it through so you can hear it.' },
    { q: 'In which place does ANC help the least?', options: ['An aircraft cabin', 'A car on a motorway', 'A chatty open office', 'A train'], answer: 2, why: 'Voices and keyboard taps are mid-pitched and irregular. There is less steady low noise to cancel.' },
  ],
  reel: [
    { ms: 5400, caption: 'On a plane the roar is low and steady, so cancelling takes most of it away.', set: { env: 'plane', mode: 'off' }, anim: { mode: ['off', 'anc'] }, view: { pos: [0, 3.5, 13.5], target: [0, 2.3, 0] }, spin: 0 },
    { ms: 5200, caption: 'Transparency flips it round. The outer microphones play the world back in, so you can hear a voice.', set: { env: 'office', mode: 'anc' }, anim: { mode: ['anc', 'trans'] }, view: { pos: [0, 3.5, 13.5], target: [0, 2.3, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    const root = new THREE.Group(); stage.root.add(root);
    const out = [], ear = [];
    const base = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.1, 3), M.plastic(0x1a1f2b)); base.position.set(0, -0.05, 0); root.add(base);
    BANDS.forEach((f, i) => {
      const x = (i - 3.5) * 1.75;
      const a = box(0.6, 1, 0.9, M.glow(COL.noise)), b = box(0.6, 1, 0.9, M.glow(COL.anti));
      a.position.x = x - 0.36; b.position.x = x + 0.36; root.add(a, b); out.push(a); ear.push(b);
      stage.label(f >= 1000 ? f / 1000 + 'k' : String(f), [x, -0.5, 0.7], root);
    });
    stage.label('Pitch band (Hz): deep ← → shrill', [0, -1.15, 0.7], root);
    const lo = { o: 0, e: 0 };
    const cup = makeCup(1.1); cup.position.set(-8.3, 6, 0); cup.rotation.y = -0.6; root.add(cup);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 30), M.glow(COL.amber, { side: THREE.DoubleSide, transparent: true })); ring.position.set(-8.3 - 0.6, 6.7, 0.6); root.add(ring);
    let t = 0;
    const cur = new Array(8).fill(0);
    const place = (instant) => (dt, st) => {
      for (let i = 0; i < 8; i++) {
        const o = ENVS[st.env].lv[i], e = lvlAt(st.env, i, st.mode);
        cur[i] = instant ? e : approach(cur[i], e, 6, dt);
        const ho = Math.max(0.04, (o - FLOOR) * H_PER_DB), he = Math.max(0.04, (cur[i] - FLOOR) * H_PER_DB);
        out[i].scale.y = ho; out[i].position.y = ho / 2; ear[i].scale.y = he; ear[i].position.y = he / 2;
        ear[i].material.color.setHex(st.mode === 'trans' ? COL.lime : COL.anti);
      }
    };
    const step = place(false), snap = place(true);
    snap(0, s);
    const cupMics = (st) => { cup.micOut.material.color.setHex(st.mode === 'off' ? 0x5a5f6e : COL.amber); cup.micOut.scale.setScalar(st.mode === 'trans' ? 1.5 + Math.sin(t * 8) * 0.3 : st.mode === 'anc' ? 1.2 : 0.7); ring.visible = st.mode === 'trans'; ring.scale.setScalar(1 + ((t * 1.5) % 1)); ring.material.opacity = 1 - ((t * 1.5) % 1); };
    return {
      update(dt, st) { t += dt; step(dt, st); cupMics(st); },
      readout(st) {
        const E = ENVS[st.env], o = sum(E.lv), e = sum(BANDS.map((_, i) => lvlAt(st.env, i, st.mode)));
        return `<div class="big">${E.n}</div><p class="r-say">${st.mode === 'trans' ? 'Transparency: the world is played back in, a little quieter than outside.' : E.say}</p>
          <div class="row"><span>Outside (all bands)</span><b>about ${Math.round(o)} dB</b></div>
          <div class="row"><span>At your ear</span><b>about ${Math.round(e)} dB</b></div>
          <div class="row"><span>Difference</span><b>${Math.round(o - e)} dB quieter</b></div>`;
      },
    };
  },
};
