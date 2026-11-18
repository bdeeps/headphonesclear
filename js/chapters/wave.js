// Chapter 1: sound is a pressure wave, and a speaker driver makes one.
// Air molecules are drawn as dots in a tube. A moving cone shoves the dots, they bunch up (high pressure) and spread
// out (low pressure), and the pattern travels at the speed of sound. The picture is slowed about 500 times and one
// world unit stands for 20 cm, so you can watch a wave that really crosses a room in a few milliseconds.
import { THREE, M, box, rod, latheX, sphere, swarm } from '../kit.js';
import { COL, Trace, V, C_AIR, fmtHz, fmtLen, clamp } from '../phones.js';

const UNIT = 0.2, CV = 3.5, NX = 96, NY = 5, NZ = 5, X0 = -6, DX = 0.17;
const NOTES = [['Low hum', 110], ['Middle C', 262], ['A 440', 440], ['Voice', 1000], ['Whistle', 2000]];

export default {
  id: 'wave',
  short: 'Sound is a push',
  title: 'Sound is air being pushed',
  subtitle: 'A speaker cone shoves the air. The shove travels to your ear.',
  view: { pos: [0, 4.2, 15], target: [0.5, 0.6, 0] },
  learn: `<p>Sound is not a thing that flies through the air. It is a <b>pattern of pressure</b>. A <b>speaker cone</b> moves forward and squeezes the air in front of it, then moves back and leaves a gap. Each shove nudges the next layer of air, so the squeezes and gaps travel outward as a <b>wave</b> while the air itself only wobbles to and fro.</p>
    <p>The inside of a headphone is a tiny speaker, called a <b>driver</b>. A coil of wire sits in the field of a magnet. Current through the coil makes it push or pull, and the coil is glued to a light cone, so the cone follows the music, moving up to a few tenths of a millimetre.</p>
    <p>Two numbers describe a wave: how fast it repeats (<b>frequency</b>, in hertz) and how far apart the squeezes are (<b>wavelength</b>). At room temperature sound moves at about 343 m/s, so wavelength = 343 ÷ frequency. A deep 100 Hz hum is 3.4 m long. A 2 kHz whistle is 17 cm.</p>
    <p class="tip"><b>Try it:</b> slide the pitch down and up. Notice the wavelength change in the readout. Keep that number in mind: it decides what noise cancelling can and cannot do.</p>
    <p class="note">The picture is slowed by about 500× and shows a row of air dots, not real molecules.</p>`,
  terms: [
    { t: 'Pressure wave', d: 'Squeezed and stretched air that moves outward, passing a push from one layer of air to the next.' },
    { t: 'Frequency', d: 'How many squeezes pass each second, in hertz (Hz). Higher frequency sounds higher in pitch.' },
    { t: 'Wavelength', d: 'The distance between one squeeze and the next. Equal to the speed of sound divided by frequency.' },
    { t: 'Driver', d: 'The tiny speaker in a headphone: a coil in a magnetic field, attached to a light cone.' },
  ],
  defaults: { pitch: 262, loud: 0.7 },
  controls: [
    { key: 'pitch', type: 'log', label: 'Pitch', min: 100, max: 2000, fmt: (v) => fmtHz(v) },
    { key: 'loud', type: 'range', label: 'Loudness', min: 0, max: 1, step: 0.01, fmt: (v) => (v < 0.05 ? 'Silent' : Math.round(v * 100) + '%') },
    { key: 'n', type: 'buttons', label: 'Jump to a sound', items: NOTES.map(([label, f]) => ({ label, act: (s) => { s.pitch = f; } })) },
  ],
  quiz: [
    { q: 'What actually travels from a speaker to your ear?', options: ['Air itself, blown across the room', 'A pattern of squeezed and stretched air', 'Electricity', 'Tiny sound particles'], answer: 1, why: 'The air only wobbles locally. The squeeze-and-stretch pattern is what moves.' },
    { q: 'About how long is the wavelength of a 100 Hz hum?', options: ['3 cm', '34 cm', '3.4 m', '340 m'], answer: 2, why: 'Wavelength is 343 m/s divided by 100 Hz, which is about 3.4 metres.' },
    { q: 'What makes the cone of a headphone driver move?', options: ['A coil of wire in a magnetic field', 'A tiny fan', 'Heat', 'A vibrating crystal only'], answer: 0, why: 'Current in the voice coil is pushed by the magnet, and the coil moves the cone.' },
  ],
  reel: [
    { ms: 5600, caption: 'Sound is air being pushed. The cone shoves, the air bunches, and the bunch travels to your ear.', set: { pitch: 200, loud: 0.75 }, anim: { pitch: [200, 900, true] }, view: { pos: [0, 3.5, 13.5], target: [0.5, 0.6, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    const root = new THREE.Group(); stage.root.add(root);
    // driver, cut open, axis along X
    const dr = new THREE.Group(); dr.position.x = -7.4;
    const magnet = rod(-0.9, -0.2, 0.55, 0.55, M.metal(0x8a93a6)), pole = rod(-0.2, 0.25, 0.2, 0.2, M.metal(0xb9bec8));
    const basket = rod(-0.2, 0.0, 1.1, 1.1, M.metal(0x58607a), 40, true);
    const coil = rod(0.0, 0.25, 0.38, 0.38, M.plastic(0xb87333), 24, true);
    const cone = latheX([[0.55, 1.3], [0.3, 1.0], [0.1, 0.5], [0.0, 0.4]], M.plastic(0xdfe6f3, { side: THREE.DoubleSide }), { seg: 40 });
    const coneG = new THREE.Group(); coneG.add(cone, coil); dr.add(magnet, pole, basket, coneG); root.add(dr);
    stage.label('Voice coil + magnet', [-7.4, -1.9, 0], root);
    // the air
    const dots = swarm(NX * NY * NZ, new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }));
    dots.castShadow = false; dots.frustumCulled = false;
    const cols = new Float32Array(NX * NY * NZ * 3);
    dots.instanceColor = new THREE.InstancedBufferAttribute(cols, 3);
    root.add(dots);
    const cLow = new THREE.Color(0x3b6ea8), cHigh = new THREE.Color(0xff7a59), tmp = new THREE.Color();
    // pressure trace above the tube
    const trace = new Trace(stage, 200, { color: COL.sum, width: 3 });
    root.add(trace.obj);
    stage.label('Pressure along the tube', [-5.6, 3.4, 0], root);
    const ear = sphere(0.5, M.plastic(0xf0b9a0), 24); ear.scale.set(0.6, 1, 0.8); ear.position.set(10.3, 0, 0); root.add(ear);
    stage.label('Your ear', [10.3, 1.2, 0], root);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(17.5, 1.1, 1.1), M.ghost(0x8fb0ff, 0.06)); tube.position.set(2.7, 0, 0); root.add(tube);
    let t = 0;
    const kOf = (f) => (2 * Math.PI * f) / (C_AIR / UNIT);
    function draw(st) {
      const k = kOf(st.pitch), w = CV * k, A = st.loud * Math.min(0.5, 0.85 / k) * 0.8, ph = w * t;
      let n = 0;
      for (let i = 0; i < NX; i++) {
        const x0 = X0 + i * DX, env = clamp((x0 - X0) / 1.2, 0, 1);
        const xi = A * env * Math.sin(k * (x0 - X0) - ph + Math.PI), comp = clamp(0.5 + 0.5 * Math.cos(k * (x0 - X0) - ph + Math.PI) * Math.min(1, st.loud * 1.3), 0, 1);
        tmp.copy(cLow).lerp(cHigh, comp);
        for (let y = 0; y < NY; y++) for (let z = 0; z < NZ; z++) {
          dots.place(n, [x0 + xi, (y - 2) * 0.22, (z - 2) * 0.22]);
          cols[n * 3] = tmp.r; cols[n * 3 + 1] = tmp.g; cols[n * 3 + 2] = tmp.b; n++;
        }
      }
      dots.done(); dots.instanceColor.needsUpdate = true;
      coneG.position.x = A * Math.sin(-ph + Math.PI) * 0.9 - A * 0.0;
      trace.set((i) => { const x = X0 + (i / 199) * 17; const env = clamp((x - X0) / 1.2, 0, 1); return [x, 2.6 + 0.6 * (st.loud) * env * Math.cos(k * (x - X0) - ph + Math.PI), 0]; });
      ear.position.x = 10.3 + A * Math.sin(k * (10.3 - X0) - ph + Math.PI) * 0.6;
    }
    draw(s);
    return {
      update(dt, st) { t += dt; draw(st); },
      readout(st) {
        const lam = C_AIR / st.pitch;
        return `<div class="big">${fmtHz(st.pitch)}</div>
          <div class="row"><span>Wavelength</span><b>${fmtLen(lam)}</b></div>
          <div class="row"><span>One squeeze every</span><b>${(1000 / st.pitch).toFixed(st.pitch > 500 ? 2 : 1)} ms</b></div>
          <div class="row"><span>Speed of sound</span><b>about 343 m/s</b></div>`;
      },
    };
  },
};
