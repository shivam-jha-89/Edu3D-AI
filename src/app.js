// HoloLearn AI (Browser): Touch Knowledge. Explore Reality.
// Hand gestures: snap -> particle burst, fist -> assemble model, open hand -> exploded view (component breakdown),
// twist -> rotate, ✌ -> next, ☝ point -> inspect component, pinch 🤏 -> pull out into exploded view, two hands -> zoom,
// snap -> dissolve. Plus Holo Tutor AI, Guided Lessons, Holo Quiz, Holo X-Ray cutaway, Voice control, Local Recording.
// MediaPipe (Hands) + WebGL2 (GPU particles via transform feedback) + Procedural Educational Models.
import { CATALOG, isMachine, buildModel } from './models/catalog.js';
import { Controller } from './logic/controller.js';
import { OPEN, FIST, PEACE, POINT, NONE } from './logic/gestures.js';
import { IDLE, SPHERE, FORMED, DISSOLVE, SIM } from './logic/state.js';
import { Renderer, perspective, mul4, translate4, rotY4, project } from './gl/renderer.js';
import { HandCamera } from './hands.js';
import { hand as synthHand } from './logic/synth.js';
import { rotX, rotY, matMul, matVec, deg } from './lib/vec.js';
import { parseCommand, Voice, speak, stopSpeaking, Recorder } from './features.js';
import { EDUCATION_REGISTRY, getEducationData, getComponentData, LEARNING_LEVELS, ACHIEVEMENTS } from './education.js';

const qs = new URLSearchParams(location.search);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const HAND_YAW_GAIN = 2.2;     // twisting hand by 45 deg turns model ~100 deg
const HAND_PITCH_GAIN = 2.5;   // raising / lowering hand by 10% tilts model ~14 deg
const DWELL_S = 0.45;          // point at a component this long to select it
const QUIZ_LEN = 5;

const CFG = {
  n: clamp(parseInt(qs.get('n'), 10) || 200000, 5000, 1000000),
  manual: qs.get('manual') === '1',             // tests: deterministic clock, frames only via advance()
  autostart: qs.get('autostart'),                // 'camera' | 'nocamera'
  start: clamp(parseInt(qs.get('model'), 10) || 0, 0, CATALOG.length - 1),
  dpr: qs.get('dpr') ? parseFloat(qs.get('dpr')) : Math.min(window.devicePixelRatio || 1, 2),
  trails: qs.get('trails') !== '0',
};

const HAND_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];
const POSE_UI = {
  [OPEN]: ['✋', 'Open hand'],
  [FIST]: ['✊', 'Fist'],
  [PEACE]: ['✌', 'Peace'],
  [POINT]: ['☝', 'Pointing'],
  other: ['🤚', 'Moving'],
  [NONE]: ['·', 'No hand'],
};
const rgbCss = (c, a = 1) => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;
const CATEGORIES = [...new Set(CATALOG.map((d) => d.category))];

// ---------------------------------------------------------------- model cache (worker-backed)
class ModelStore {
  constructor(n) {
    this.n = n; this.cache = new Map(); this.pending = new Map(); this.lru = []; this.nextId = 1; this.errors = [];
    try {
      this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => this.onResult(e.data);
      this.worker.onerror = (e) => {
        console.warn('model worker failed, building on main thread', e);
        this.worker = null;
        this.flushSync();
      };
    } catch { this.worker = null; }
  }
  get(i) { const m = this.cache.get(i); if (m) this.touch(i); return m || null; }
  touch(i) { this.lru = [i, ...this.lru.filter((k) => k !== i)]; while (this.lru.length > 6) this.cache.delete(this.lru.pop()); }
  request(i) {
    if (this.cache.has(i)) return Promise.resolve(this.cache.get(i));
    if (this.pending.has(i)) return this.pending.get(i).promise;
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    const job = { id: this.nextId++, promise, resolve, reject };
    this.pending.set(i, job);
    if (this.worker) this.worker.postMessage({ id: job.id, index: i, n: this.n });
    else setTimeout(() => this.buildSync(i), 0);
    return promise;
  }
  buildSync(i) {
    if (!this.pending.has(i)) return;
    try { const m = buildModel(i, this.n); this.onResult({ ...m, index: i }); }
    catch (e) { this.onResult({ index: i, error: String(e.stack || e) }); }
  }
  flushSync() { for (const i of [...this.pending.keys()]) this.buildSync(i); }
  onResult(d) {
    const job = this.pending.get(d.index);
    this.pending.delete(d.index);
    if (d.error) {
      this.errors.push(d.error);
      console.error('model build failed', CATALOG[d.index]?.name, d.error);
      job?.reject(new Error(d.error));
      return;
    }
    const m = { ...d, def: CATALOG[d.index] };
    this.cache.set(d.index, m); this.touch(d.index);
    job?.resolve(m);
  }
}

// ---------------------------------------------------------------- Holo Demo (automated showcase)
class Demo {
  constructor(app) {
    this.app = app; this.t0 = null; this.segs = []; this.cur = -1;
    const at = { cx: 0.2, cy: 0.55, s: 0.09 };
    const H = (pose, angle = 0) => () => synthHand({ ...at, pose, angle });
    const add = (dur, hand, onStart) => this.segs.push({ dur, hand, onStart });
    const snap = () => { add(0.13, H('snap_pressed')); add(0.3, H('snap_released')); };
    const pick = (i) => () => { app.ctl.state.index = i; app.ctl.state.targetDirty = true; app.store.request(i); };

    if (app.ctl.state.state !== IDLE) { snap(); add(1.5, () => null); }

    // Educational sequence: Landmarks -> Human Brain -> Flagship Human Heart -> Sports Car
    for (const name of ['Eiffel Tower', 'Human Brain', 'Human Heart', 'Sports Car']) {
      const i = CATALOG.findIndex((d) => d.name === name);
      add(0.4, () => null, pick(i));
      snap();
      add(1.4, H('open'));
      add(3.0, H('fist'));

      if (name === 'Human Heart') {
        // Flagship Heart Demo
        add(2.0, H('open'), () => app.toast('🫀 Flagship Showcase: Beating Human Heart'));
        add(2.6, (u) => synthHand({ ...at, pose: 'partial', f: u }));
        add(2.0, H('point'), () => {
          const lvIdx = app.model?.labels?.findIndex((l) => l.label.toLowerCase().includes('left ventricle'));
          if (lvIdx >= 0) app.selectPart(lvIdx, 'point');
        });
        add(1.8, H('pinch'), () => {
          app.pulled = true;
          app.toast('🤏 Left Ventricle pulled into Exploded View');
        });
        add(2.0, H('fist'), () => {
          app.toggleCut();
          app.toast('✂ Holo X-Ray: Internal cross-section revealed');
        });
        add(2.5, H('open'), () => {
          if (app.cut.on) app.toggleCut();
          app.askAITutor('Why is the left ventricle wall thicker than the right ventricle?', 'Left ventricle');
        });
        add(2.0, H('fist'));
      } else if (isMachine(i)) {
        add(2.6, (u) => synthHand({ ...at, pose: 'partial', f: u }));
        add(1.4, H('open'));
        add(3.2, (u) => synthHand({ ...at, pose: 'open', angle: 0.55 * Math.sin(u * Math.PI * 2) })); // twist to rotate
        add(2.2, (u) => synthHand({ ...at, pose: 'partial', f: 1 - u }));
        add(1.2, H('fist'));
      } else {
        add(1.5, H('fist'));
      }

      snap();
      add(1.6, () => null);
    }
  }

  tick(t) {
    if (this.t0 === null) this.t0 = t;
    let el = t - this.t0, i = 0;
    while (i < this.segs.length && el > this.segs[i].dur) { el -= this.segs[i].dur; i++; }
    if (i >= this.segs.length) { this.app.stopDemo(); return; }
    const s = this.segs[i];
    if (i !== this.cur) { this.cur = i; s.onStart?.(); }
    this.app.demoHand = s.hand(clamp(el / s.dur, 0, 1));
  }
}

// ---------------------------------------------------------------- HoloLearn App
class App {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.$ = $;
    this.canvas = $('gl'); this.overlay = $('overlay'); this.octx = this.overlay.getContext('2d');
    this.video = $('cam');
    this.renderer = new Renderer(this.canvas, CFG.n, { preserve: CFG.manual });
    this.ctl = new Controller(CATALOG.length, isMachine);
    this.ctl.state.index = CFG.start;
    this.store = new ModelStore(CFG.n);
    this.model = null; this.uploaded = -1; this.uploadT = 0;
    this.cam = null; this.camOn = false; this.hasVideo = false;
    this.color = [...CATALOG[CFG.start].color];
    this.explode = 0; this.manualExplode = 0; this.tintMix = 0; this.scale = 1;
    this.spin = 0; this.pitch = 0; this.grab = null; this.handRotate = true; this.handRotating = false;
    this.dragYaw = 0; this.autoRotate = true; this.labelsOn = true; this.trails = CFG.trails;
    this.zoom = 1; this.zoomTarget = 1; this.zoomGrab = null;
    this.pulse = 1; this.flow = 0; this.expHist = []; this.wasBusy = false;
    this.sel = -1; this.pulled = false; this.pullAmt = 0; this.hover = { li: -1, t0: 0 }; this.anchors = []; this.pointer = null; this.lostT = 0;
    this.quiz = null;
    this.cut = { on: false, x: 0.35, target: 0.35 };
    this.voice = new Voice((text) => this.voiceCommand(text)); this.voiceOn = false; this.spoken = []; this.lastHeard = '';
    this.recorder = new Recorder(this.canvas, this.overlay); this.lastRecording = null;
    this.t = 0; this.last = null; this.frames = 0; this.fps = 0; this._fpsN = 0; this._fpsT = 0;
    this.handSource = null; this.handSource2 = null; this.lastSynthT = -1; this.demo = null; this.demoHand = undefined;
    this.autoFormAt = null; this.hudTick = 0; this.lastIndexShown = -1; this.sliderActive = false;
    this.activeCat = CATALOG[CFG.start].category;
    this.gain = clamp(0.22 * Math.sqrt(250000 / CFG.n), 0.15, 0.6);

    // HoloLearn AI Educational State
    this.learningLevel = LEARNING_LEVELS.INTERMEDIATE;
    this.guidedLesson = null;
    this.achievements = ACHIEVEMENTS.map((a) => ({ ...a }));
    this.loadStoredData();
    this.aiAskedCount = 0;
    this.aiBusy = false;
    this.exploredModels = new Set();
    this.exploredParts = new Set();

    this.resize();
    addEventListener('resize', () => this.resize());
    this.buildUI();
    this.bindInput();
    this.store.request(CFG.start).then(() => this.prefetch());
  }

  loadStoredData() {
    try {
      const stored = localStorage.getItem('hololearn_achievements');
      if (stored) {
        const ids = new Set(JSON.parse(stored));
        this.achievements.forEach((a) => { if (ids.has(a.id)) a.unlocked = true; });
      }
      const lvl = localStorage.getItem('hololearn_level');
      if (lvl && Object.values(LEARNING_LEVELS).includes(lvl)) this.learningLevel = lvl;
    } catch {}
  }

  saveStoredData() {
    try {
      const ids = this.achievements.filter((a) => a.unlocked).map((a) => a.id);
      localStorage.setItem('hololearn_achievements', JSON.stringify(ids));
      localStorage.setItem('hololearn_level', this.learningLevel);
    } catch {}
  }

  prefetch() { this.store.request((this.ctl.state.index + 1) % CATALOG.length); }

  resize() {
    const w = innerWidth, h = innerHeight, dpr = CFG.dpr;
    for (const c of [this.canvas, this.overlay]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const aspect = w / h, wide = aspect > 1.25 && w > 820;
    this.offX = wide ? 0.9 * Math.min(1.15, aspect / 1.78) : 0;       // model positioned in right third for HUD balance
    this.offY = wide ? 0 : 0.22;
    this.dist = Math.max(3.4, 1.25 / (Math.tan((20 * Math.PI) / 180) * aspect));
    this.proj = perspective(40, aspect, 0.05, 30);
    this.projView = mul4(this.proj, translate4(this.offX, this.offY, -this.dist));
  }

  // ------------------------------------------------------------ frame update
  frame(t) {
    const dt = this.last === null ? 1 / 60 : clamp(t - this.last, 0, 1 / 30);
    this.last = t; this.t = t;
    const ctl = this.ctl, st = ctl.state;

    // 1. hand input
    ctl.aspect = this.cam?.running && this.video.videoWidth ? this.video.videoWidth / this.video.videoHeight : 1;
    if (this.cam?.running) {
      const hands = this.cam.poll();
      if (hands !== undefined) ctl.onHands(hands, t);
      if (this.cam.newFrame) { this.renderer.uploadVideo(this.video); this.cam.newFrame = false; this.hasVideo = true; }
    }
    if (this.demo) this.demo.tick(t);
    const src = this.demo ? () => this.demoHand ?? null : this.handSource;
    if (src && t - this.lastSynthT >= 1 / 30 - 1e-6) {
      this.lastSynthT = t;
      ctl.onHands([src(t), this.handSource2?.(t)].filter(Boolean), t);
    }
    if (this.autoFormAt !== null && t >= this.autoFormAt) {
      this.autoFormAt = null;
      if (st.state === SPHERE) ctl.keyPose(FIST, t);
    }
    ctl.tick(t);

    // 2. GPU buffer upload
    if (st.targetDirty) {
      const m = this.store.get(st.index);
      if (m) {
        this.renderer.setModel(m); this.model = m; this.uploaded = st.index; this.uploadT = t; st.targetDirty = false;
        this.manualExplode = this.quiz ? 1 : 0; this.sel = -1; this.pulled = false; this.zoomTarget = 1; this.prefetch();
        this.exploredModels.add(CATALOG[st.index].name);
        if (CATALOG[st.index].category === 'Anatomy') {
          const anatCount = [...this.exploredModels].filter((n) => CATALOG.find((c) => c.name === n)?.category === 'Anatomy').length;
          if (anatCount >= 5) this.unlockAchievement('anatomy_explorer');
        }
      } else this.store.request(st.index);
    }
    const ready = this.uploaded === st.index && !st.targetDirty;
    const machine = ready && isMachine(st.index);
    const formed = st.state === FORMED && ready;
    let mode = st.simMode(), formT = st.formT(t);
    if (st.state === FORMED && !ready) mode = SIM.sphere;
    if (formed) {
      formT = t - Math.max(st.tState, this.uploadT);
      this.unlockAchievement('first_discovery');
    }
    const vis = ctl.handVisible(t);
    const pointing = vis && (ctl.pose === POINT || ctl.rawPose === POINT);
    const busyHand = pointing || ctl.pinch;
    const twoHands = vis && ctl.secondVisible(t) && formed;

    // 3. Exploded view calculation
    let target = 0;
    if (formed && machine) {
      if (vis && ctl.landmarks && !busyHand && !twoHands) { target = smooth(0.12, 0.85, ctl.openness); this.manualExplode = target; }
      else target = this.manualExplode;
      this.expHist.push([t, target]);
      while (this.expHist[0][0] < t - 0.5) this.expHist.shift();
      if (busyHand && !this.wasBusy) { this.manualExplode = Math.max(...this.expHist.map((h) => h[1])); target = this.manualExplode; }
    } else this.expHist = [];
    this.wasBusy = busyHand;
    this.explode += (target - this.explode) * (1 - Math.exp(-dt * 7));
    if (Math.abs(this.explode - target) < 1e-4) this.explode = target;

    // 4. Zoom calculation
    if (twoHands) {
      const a = ctl.landmarks[9], b = ctl.second[9], spread = Math.hypot((a[0] - b[0]) * ctl.aspect, a[1] - b[1]);
      if (!this.zoomGrab) this.zoomGrab = { spread: Math.max(spread, 0.02), zoom: this.zoomTarget };
      this.zoomTarget = clamp((this.zoomGrab.zoom * spread) / this.zoomGrab.spread, 0.5, 2.6);
    } else this.zoomGrab = null;
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-dt * 8));

    // 5. Rotation
    const def = CATALOG[st.index];
    const handRot = this.handRotate && formed && vis && !!ctl.landmarks && !busyHand && !twoHands;
    if (handRot) {
      if (!this.grab) this.grab = { roll: ctl.roll, y: ctl.handY, spin: this.spin, pitch: this.pitch };
      const yaw = this.grab.spin + HAND_YAW_GAIN * wrapPi(ctl.roll - this.grab.roll);
      const pitch = clamp(this.grab.pitch + HAND_PITCH_GAIN * (ctl.handY - this.grab.y), -0.75, 0.75);
      const kr = 1 - Math.exp(-dt * 9);
      this.spin += (yaw - this.spin) * kr; this.pitch += (pitch - this.pitch) * kr;
    } else {
      this.grab = null;
      if (!(vis && (busyHand || twoHands))) {
        if (this.autoRotate && this.sel < 0) this.spin += dt * 0.35 * (1 - this.explode);
        if (this.explode > 0 && def.viewYaw !== undefined) {
          const d = ((((def.viewYaw - this.spin) % Math.PI) + Math.PI * 1.5) % Math.PI) - Math.PI / 2;
          this.spin += d * (1 - Math.exp(-dt * 3.5 * this.explode));
        }
        this.pitch *= Math.exp(-dt * 1.5);
      }
    }
    this.handRotating = handRot;
    const rot = matMul(rotX(deg(def.tilt || 0) + this.pitch), rotY(this.spin + this.dragYaw));

    // 6. Educational biological & mechanical simulation
    const life = formed ? smooth(0.5, 1.5, formT) : 0;
    let pulse = 1, flow = 0;
    if (def.pulse) {
      const p = ((t * def.pulse.bpm) / 60) % 1, g = (x) => Math.exp(-((x / 0.065) ** 2));
      pulse = 1 - def.pulse.amp * (g(p) + g(p - 1) + 0.6 * g(p - 0.3)); flow = 1;
    } else if (def.breath) {
      pulse = 1 + def.breath.amp * 0.5 * (1 - Math.cos((2 * Math.PI * t) / def.breath.period)); flow = 0.6;
    }
    this.pulse = 1 + (pulse - 1) * life; this.flow = flow * life;

    const m = ready ? this.model : null;
    this.scale = m ? 1 + (m.fitScale - 1) * this.explode : 1;
    const scale = this.scale * this.pulse;
    const exCenter = m ? m.exCenter : [0, 0, 0];
    this.projView = mul4(this.proj, translate4(this.offX * (1 - 0.45 * this.explode), this.offY, -this.dist / this.zoom));

    // 7. Component anchors, dwell picking, pinch pulling, quiz, cutaway
    this.computeAnchors(formed && machine && m, rot, exCenter, scale);
    this.updatePicking(t, pointing, formed && machine);
    this.pullAmt += ((this.pulled && this.sel >= 0 ? 1 : 0) - this.pullAmt) * (1 - Math.exp(-dt * 6));
    this.updateQuiz(t, formed && machine && m);
    this.updateGuidedLesson(t);

    if (this.cut.on) {
      if (vis && !busyHand && ctl.landmarks) {
        const c0 = project(this.projView, [0, 0, 0]), rr = this.globeRadiusPx();
        const px = this.toScreen([ctl.handX, ctl.handY])[0], cx = (c0[0] * 0.5 + 0.5) * this.overlay.width;
        this.cut.target = clamp((px - cx) / rr, -1.25, 1.25);
      }
      this.cut.x += (this.cut.target - this.cut.x) * (1 - Math.exp(-dt * 10));
    }

    const kick = st.consumeKick() ? 1 : 0;
    const sel = this.sel >= 0 && formed ? this.sel : -100;
    this.renderer.step({
      dt, time: t, mode, formT, kick, rot, sphereR: 0.85,
      explode: this.explode, scale, exCenter, sel, pull: [0, 0, 0.5 * this.pullAmt],
    });

    // 8. Colors & rendering
    const k = 1 - Math.exp(-dt * 4);
    for (let i = 0; i < 3; i++) this.color[i] += (def.color[i] - this.color[i]) * k;
    const tintT = machine && st.state === FORMED ? smooth(0.2, 1.4, formT) : 0;
    this.tintMix += (tintT - this.tintMix) * (1 - Math.exp(-dt * 5));
    const alpha = st.alpha(t);

    this.renderer.draw({
      projView: this.projView, globeMvp: mul4(this.projView, rotY4(0.1 * t)), color: this.color, tintMix: this.tintMix,
      alpha, trails: this.trails, trailLen: 0.06, pointPx: this.canvas.height * 0.012 * Math.sqrt(this.zoom), gain: this.gain,
      video: { has: this.hasVideo && this.camOn, dim: 0.65 }, sel, cutOn: this.cut.on && formed, cut: this.cut.x, flow: this.flow, time: t,
    });

    this.drawOverlay(t, machine, formT, pointing);
    this.recorder.frame();
    this.frames++; this._fpsN++;
    if (t - this._fpsT >= 1) { this.fps = this._fpsN / (t - this._fpsT); this._fpsN = 0; this._fpsT = t; }
    if (++this.hudTick % 3 === 0 || CFG.manual) this.updateHud(t, formT);
  }

  // ------------------------------------------------------------ anchors & picking
  globeRadiusPx() {
    const P = this.projView, c0 = project(P, [0, 0, 0]);
    return Math.abs((project(P, [0, 1, 0])[1] - c0[1]) * 0.5 * this.overlay.height);
  }

  computeAnchors(on, rot, exCenter, scale) {
    this.anchors = [];
    if (!on) return;
    const W = this.overlay.width, H = this.overlay.height, P = this.projView;
    this.model.labels.forEach((L, li) => {
      const s0 = clamp((this.explode - L.stage) / Math.max(1 - L.stage, 1e-3), 0, 1), s = s0 * s0 * (3 - 2 * s0);
      const q = [0, 1, 2].map((i) => (L.centroid[i] + L.offset[i] * s - exCenter[i] * this.explode) * scale);
      const w = matVec(rot, q);
      if (li === this.sel) w[2] += 0.5 * this.pullAmt;
      const [nx, ny] = project(P, w);
      this.anchors.push({ li, L, px: (nx * 0.5 + 0.5) * W, py: (0.5 - ny * 0.5) * H });
    });
  }

  nearestAnchor(x, y, maxPx) {
    let best = -1, bd = maxPx;
    for (const a of this.anchors) { const d = Math.hypot(a.px - x, a.py - y); if (d < bd) { bd = d; best = a.li; } }
    return best;
  }

  updatePicking(t, pointing, active) {
    const ctl = this.ctl, dpr = CFG.dpr;
    this.pointer = null;
    if (!active) { this.hover = { li: -1, t0: t }; return; }
    if (pointing && ctl.landmarks) {
      const [x, y] = this.toScreen(ctl.landmarks[8]);
      const li = this.nearestAnchor(x, y, 120 * dpr);
      if (li !== this.hover.li) this.hover = { li, t0: t };
      const prog = li >= 0 ? clamp((t - this.hover.t0) / DWELL_S, 0, 1) : 0;
      this.pointer = { x, y, li, prog };
      if (li >= 0 && prog >= 1 && li !== this.sel) this.selectPart(li, 'point');
      if (li >= 0) this.lostT = t;
      else if (t - this.lostT > 1.4 && this.sel >= 0 && !this.quiz) this.deselect();
    } else this.hover = { li: -1, t0: t };

    if (ctl.pinchStart) {
      ctl.pinchStart = false;
      if (this.sel >= 0) {
        this.pulled = !this.pulled;
        if (this.pulled) {
          this.exploredParts.add(`${this.ctl.state.index}:${this.sel}`);
          if (this.exploredParts.size >= 10) this.unlockAchievement('deep_investigation');
        }
        this.toast(this.pulled ? `🤏 Pulled out: ${this.model.labels[this.sel].label}` : '🤏 Put back');
      }
    }
  }

  selectPart(li, source = 'click') {
    if (!this.model || !this.model.labels[li]) return;
    if (this.quiz && !this.quiz.done && this.quiz.phase === 'ask') { this.answerQuiz(li); return; }
    this.sel = li; this.pulled = false;
    const L = this.model.labels[li];
    this.say(`${L.label}. ${L.info}.`);
    this.toast(`☝ ${L.label} — ${L.info}`);
  }

  deselect() { this.sel = -1; this.pulled = false; }
  say(text) { this.spoken.push(text); if (this.voiceOn) speak(text); }

  // ------------------------------------------------------------ Holo Quiz
  startQuiz() {
    const st = this.ctl.state;
    if (!isMachine(st.index)) this.selectModel(CATALOG.findIndex((d) => d.name === 'Human Brain'));
    else if (st.state !== FORMED) this.selectModel(st.index);
    this.quiz = { pending: true, total: QUIZ_LEN, asked: 0, score: 0, target: -1, phase: 'wait', nextAt: 0, done: false, feedback: '', seed: this.frames };
    this.manualExplode = 1;
    this.toast('🎓 Holo Quiz: point at the component I name');
  }

  stopQuiz() { this.quiz = null; this.deselect(); }

  updateQuiz(t, ready) {
    const q = this.quiz;
    if (!q || !ready) return;
    if (q.pending) {
      q.pending = false;
      const n = this.model.labels.length, order = [...Array(n).keys()];
      let s = (q.seed * 2654435761) >>> 0;
      for (let i = n - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
      q.order = order; this.manualExplode = 1; this.nextQuestion();
    }
    if (q.phase === 'feedback' && t >= q.nextAt) this.nextQuestion();
    if (q.done && t >= q.nextAt + 4) this.stopQuiz();
  }

  nextQuestion() {
    const q = this.quiz;
    this.deselect();
    if (q.asked >= q.total) {
      q.done = true; q.phase = 'done'; q.nextAt = this.t;
      q.feedback = `🏆 Holo Quiz Complete! Score ${q.score} / ${q.total} (${Math.round((q.score / q.total) * 100)}%)`;
      if (q.score === q.total) this.unlockAchievement('perfect_score');
      this.say(`Quiz complete. You scored ${q.score} out of ${q.total}.`);
      return;
    }
    q.target = q.order[q.asked % q.order.length]; q.asked++; q.phase = 'ask'; q.feedback = '';
    this.say(`Find the ${this.model.labels[q.target].label}`);
  }

  answerQuiz(li) {
    const q = this.quiz, L = this.model.labels;
    const ok = li === q.target;
    if (ok) q.score++;
    q.phase = 'feedback'; q.nextAt = this.t + 1.8;
    q.feedback = ok ? `✅ Correct! ${L[li].label}: ${L[li].info}` : `❌ That's the ${L[li].label}. Here is the ${L[q.target].label}.`;
    this.sel = q.target;
    this.say(ok ? `Correct! ${L[li].info}` : `No, that's the ${L[li].label}.`);
  }

  // ------------------------------------------------------------ Guided Learning Engine
  startGuidedLesson(idx = null) {
    if (idx !== null && idx >= 0 && idx < CATALOG.length) {
      this.selectModel(idx);
    }
    const def = CATALOG[this.ctl.state.index];
    const edu = getEducationData(def.name);
    const steps = edu.guidedLesson || [
      { step: 1, title: 'Summon Model', instruction: 'Snap fingers 🫰 or press Space to summon particles.', verify: (s) => s.state === 'formed' },
      { step: 2, title: 'Assemble Model', instruction: 'Make a fist ✊ or press F to form the 3D structure.', verify: (s) => s.state === 'formed' },
      { step: 3, title: 'Exploded View', instruction: 'Open your hand ✋ or press E to separate components.', verify: (s) => s.explode > 0.4 },
      { step: 4, title: 'Select Component', instruction: 'Point ☝ at any component to inspect its role.', verify: (s) => s.selected !== null },
      { step: 5, title: 'AI Exploration', instruction: 'Click "Ask AI" in the panel to learn from Holo Tutor.', verify: (s) => s.aiAsked },
    ];
    this.guidedLesson = { model: def.name, stepIdx: 0, steps, done: false, nextAt: 0 };
    const banner = this.$('guidedBanner');
    banner.hidden = false;
    this.updateGuidedBanner();
    this.toast(`📖 Guided Lesson: ${def.name}`);
  }

  advanceGuidedStep() {
    const gl = this.guidedLesson;
    if (!gl) return;
    if (gl.stepIdx < gl.steps.length - 1) {
      gl.stepIdx++;
      this.updateGuidedBanner();
    } else {
      gl.done = true;
      this.updateGuidedBanner();
    }
  }

  stopGuidedLesson() {
    this.guidedLesson = null;
    this.$('guidedBanner').hidden = true;
  }

  updateGuidedBanner() {
    const gl = this.guidedLesson;
    if (!gl) return;
    const banner = this.$('guidedBanner');
    const cur = gl.steps[gl.stepIdx];
    banner.querySelector('.g-title').textContent = `${gl.model} — ${cur.title}`;
    banner.querySelector('.g-prog').textContent = `STEP ${gl.stepIdx + 1} OF ${gl.steps.length}`;
    banner.querySelector('.g-inst').textContent = cur.instruction;
  }

  updateGuidedLesson(t) {
    const gl = this.guidedLesson;
    if (!gl || gl.done) return;
    const cur = gl.steps[gl.stepIdx];
    if (cur.verify && cur.verify(this.status())) {
      gl.stepIdx++;
      if (gl.stepIdx >= gl.steps.length) {
        gl.done = true;
        this.unlockAchievement('holo_master');
        this.toast(`🏆 Lesson Complete! Mastered ${gl.model}!`);
        this.say(`Lesson complete! Great job mastering the ${gl.model}.`);
        setTimeout(() => this.stopGuidedLesson(), 4000);
      } else {
        this.toast(`✨ Step Complete: ${cur.title}`);
        this.updateGuidedBanner();
      }
    }
  }

  // ------------------------------------------------------------ Holo Tutor (AI Tutor)
  async askAITutor(question, specificPart = null) {
    const def = CATALOG[this.ctl.state.index];
    const compName = specificPart || (this.sel >= 0 && this.model?.labels[this.sel]?.label) || '';
    const compData = compName ? getComponentData(def.name, compName) : {};
    const card = this.$('tutorCard');
    card.hidden = false;
    const resp = this.$('tutorResponse');
    resp.innerHTML = '<span style="color:var(--accent)">🤖 Consulting Holo Tutor neural model...</span>';
    this.aiBusy = true;

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: def.name,
          component: compName,
          question: question || (compName ? `What is the role of the ${compName}?` : `Explain the ${def.name}.`),
          level: this.learningLevel,
          metadata: compData,
        }),
      });
      const data = await res.json();
      this.aiAskedCount++;
      if (data.available) {
        resp.innerHTML = `<p>${data.answer.replace(/\n\n/g, '</p><p>')}</p>`;
        this.unlockAchievement('ai_scholar');
        this.toast('🤖 Holo Tutor responded');
      } else {
        resp.innerHTML = `<p style="color:var(--accent-gold)"><b>AI TUTOR UNAVAILABLE</b></p><p>${data.message || 'Add an AI provider key to enable interactive explanations.'}</p>`;
      }
    } catch {
      resp.innerHTML = '<p style="color:var(--warn)">AI Tutor network connection error.</p>';
    } finally {
      this.aiBusy = false;
    }
  }

  setLearningLevel(level) {
    if (!Object.values(LEARNING_LEVELS).includes(level)) return;
    this.learningLevel = level;
    document.querySelectorAll('.level-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.level === level);
    });
    this.saveStoredData();
    this.toast(`🎓 Learning Level: ${level.toUpperCase()}`);
  }

  // ------------------------------------------------------------ Achievements
  unlockAchievement(id) {
    const a = this.achievements.find((item) => item.id === id);
    if (a && !a.unlocked) {
      a.unlocked = true;
      this.saveStoredData();
      this.toast(`🏆 Achievement Unlocked: ${a.title}`);
      this.renderAchievements();
    }
  }

  renderAchievements() {
    const list = this.$('achieveList');
    if (!list) return;
    list.innerHTML = this.achievements.map((a) => `
      <li class="achieve-item ${a.unlocked ? 'unlocked' : ''}">
        <span class="achieve-icon">${a.icon}</span>
        <div class="achieve-info">
          <h4>${a.title} ${a.unlocked ? '✅' : '🔒'}</h4>
          <p>${a.desc}</p>
        </div>
      </li>
    `).join('');
  }

  // ------------------------------------------------------------ Voice Commands
  voiceCommand(text) {
    this.lastHeard = text;
    const acts = parseCommand(text, CATALOG, this.model && isMachine(this.uploaded) && this.uploaded === this.ctl.state.index ? this.model.labels : []);
    const st = this.ctl.state, done = [];
    for (const a of acts) {
      if (a.type === 'model') { this.selectModel(CATALOG.findIndex((d) => d.name === a.name)); done.push(a.name); }
      else if (a.type === 'part') { this.selectPart(a.index, 'voice'); done.push(this.model.labels[a.index].label); }
      else if (a.type === 'explode') { this.manualExplode = 1; done.push('explode'); }
      else if (a.type === 'assemble') { this.manualExplode = 0; done.push('assemble'); }
      else if (a.type === 'next') { this.selectModel(st.index + 1); done.push('next'); }
      else if (a.type === 'prev') { this.selectModel(st.index - 1); done.push('previous'); }
      else if (a.type === 'snap') { if (st.state === IDLE) this.ctl.keySnap(this.t); done.push('snap'); }
      else if (a.type === 'dissolve') { if (st.state !== IDLE) this.ctl.keySnap(this.t); done.push('dissolve'); }
      else if (a.type === 'quiz') { this.startQuiz(); done.push('quiz'); }
      else if (a.type === 'stopQuiz') { this.stopQuiz(); done.push('stop quiz'); }
      else if (a.type === 'cut') { this.toggleCut(); done.push('cut'); }
      else if (a.type === 'zoomIn') { this.zoomTarget = clamp(this.zoomTarget * 1.3, 0.5, 2.6); done.push('zoom in'); }
      else if (a.type === 'zoomOut') { this.zoomTarget = clamp(this.zoomTarget / 1.3, 0.5, 2.6); done.push('zoom out'); }
      else if (a.type === 'rotate') { this.toggle('autoRotate', 'bRotate'); done.push('rotate'); }
      else if (a.type === 'record') { this.toggleRecord(); done.push('record'); }
      else if (a.type === 'tutor') { this.askAITutor(text); done.push('tutor'); }
      else if (a.type === 'guided') { this.startGuidedLesson(); done.push('guided lesson'); }
      else if (a.type === 'describe') {
        const L = this.sel >= 0 && this.model?.labels[this.sel];
        this.say(L ? `${L.label}. ${L.info}.` : `${CATALOG[st.index].name}. ${CATALOG[st.index].fact || ''}`);
        done.push('describe');
      }
    }
    this.toast(`🎤 “${text}”${done.length ? ' → ' + done.join(', ') : ' (not understood)'}`);
    return done;
  }

  toggleVoice() {
    if (this.voiceOn) { this.voice.stop(); this.voiceOn = false; this.toast('🎤 Voice off'); }
    else {
      this.voiceOn = true;
      const ok = this.voice.start();
      this.toast(ok ? '🎤 Listening: say “show me the heart”, “explode”, “next”, “ask tutor”, “quiz”…' : '🎤 Speech recognition not supported; read aloud is active');
    }
    this.$('bVoice').classList.toggle('on', this.voiceOn);
  }

  // ------------------------------------------------------------ Cut-away & Video Recording
  toggleCut() {
    this.cut.on = !this.cut.on;
    this.$('bCut').classList.toggle('on', this.cut.on);
    if (this.cut.on) this.unlockAchievement('xray_vision');
    this.toast(this.cut.on ? '✂ Holo X-Ray: move hand or mouse left / right' : '✂ Holo X-Ray off');
  }

  async toggleRecord() {
    if (!Recorder.supported()) { this.toast('Recording is not supported in this browser'); return; }
    if (!this.recorder.on) { this.recorder.start(); this.$('bRec').classList.add('on'); this.toast('⏺ Recording session…'); return; }
    const blob = await this.recorder.stop();
    this.$('bRec').classList.remove('on');
    if (!blob) return;
    this.lastRecording = { size: blob.size, type: blob.type };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hololearn-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.webm`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    this.toast(`💾 Saved ${(blob.size / 1e6).toFixed(1)} MB video`);
  }

  // ------------------------------------------------------------ Overlay Drawing
  videoAspect() { return this.hasVideo && this.camOn && this.video.videoWidth ? this.video.videoWidth / this.video.videoHeight : 16 / 9; }
  toScreen([x, y]) {
    const W = this.overlay.width, H = this.overlay.height, va = this.videoAspect();
    if (va > W / H) { const dw = H * va; return [(x - 0.5) * dw + W / 2, y * H]; }
    const dh = W / va; return [x * W, (y - 0.5) * dh + H / 2];
  }
  toNorm([px, py]) {
    const W = this.overlay.width, H = this.overlay.height, va = this.videoAspect();
    if (va > W / H) { const dw = H * va; return [(px - W / 2) / dw + 0.5, py / H]; }
    const dh = W / va; return [px / W, (py - H / 2) / dh + 0.5];
  }
  drawHand(g, lm, col, dpr) {
    const P = lm.map((p) => this.toScreen(p));
    g.lineWidth = 2 * dpr; g.strokeStyle = col; g.globalAlpha = 0.75; g.shadowColor = col; g.shadowBlur = 10 * dpr;
    g.beginPath();
    for (const [a, b] of HAND_EDGES) { g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); }
    g.stroke();
    g.fillStyle = '#ffffff'; g.shadowBlur = 0;
    for (const p of P) { g.beginPath(); g.arc(p[0], p[1], 2.5 * dpr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  }

  drawOverlay(t, machine, formT, pointing) {
    const g = this.octx, W = this.overlay.width, H = this.overlay.height, dpr = CFG.dpr;
    g.clearRect(0, 0, W, H);
    const ctl = this.ctl;

    if (ctl.handVisible(t) && ctl.landmarks) {
      const col = ctl.pinch ? '#ffd166' : POSE_UI[ctl.pose] ? '#66e0ff' : '#ffffff';
      this.drawHand(g, ctl.landmarks, col, dpr);
      if (ctl.secondVisible(t) && ctl.second) this.drawHand(g, ctl.second, '#9b51e0', dpr);
    }
    if (this.pointer) {
      const { x, y, li, prog } = this.pointer;
      g.strokeStyle = '#5dffa0'; g.lineWidth = 2 * dpr; g.globalAlpha = 0.9;
      g.beginPath(); g.arc(x, y, 14 * dpr, 0, Math.PI * 2); g.stroke();
      if (li >= 0) {
        g.lineWidth = 4 * dpr; g.beginPath(); g.arc(x, y, 20 * dpr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); g.stroke();
        const a = this.anchors.find((q) => q.li === li);
        if (a) { g.setLineDash([4 * dpr, 4 * dpr]); g.beginPath(); g.moveTo(x, y); g.lineTo(a.px, a.py); g.stroke(); g.setLineDash([]); }
      }
      g.globalAlpha = 1;
    }
    if (this.cut.on && ctl.state.state === FORMED) {
      const c0 = project(this.projView, [0, 0, 0]), rr = this.globeRadiusPx();
      const x = (c0[0] * 0.5 + 0.5) * W + this.cut.x * rr, cy = (0.5 - c0[1] * 0.5) * H;
      g.strokeStyle = '#66e0ff'; g.globalAlpha = 0.65; g.setLineDash([8 * dpr, 6 * dpr]); g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.moveTo(x, cy - rr * 1.1); g.lineTo(x, cy + rr * 1.1); g.stroke(); g.setLineDash([]);
      g.globalAlpha = 0.95; g.fillStyle = '#66e0ff'; g.font = `600 ${12 * dpr}px ui-sans-serif, system-ui, sans-serif`; g.textAlign = 'center';
      g.fillText('✂ HOLO X-RAY', x, cy - rr * 1.1 - 8 * dpr); g.globalAlpha = 1;
    }
    if (!this.anchors.length) return;
    const showAll = this.labelsOn && this.explode > 0.15;
    const items = this.anchors.filter((a) => showAll || a.li === this.sel);
    if (!items.length) return;
    const alpha = showAll ? smooth(0.15, 0.45, this.explode) * smooth(0.6, 1.4, formT) : 1;
    const c0 = project(this.projView, [0, 0, 0]), cx = (c0[0] * 0.5 + 0.5) * W, rr = this.globeRadiusPx();

    [...items].sort((p, q) => p.px - q.px).forEach((it, i, arr) => {
      it.side = arr.length === 1 ? (it.px >= cx ? 1 : -1) : i < Math.floor(arr.length / 2) ? -1 : 1;
    });
    const big = `600 ${12 * dpr}px ui-sans-serif, system-ui, "Segoe UI", sans-serif`, small = `400 ${10.5 * dpr}px ui-sans-serif, system-ui, "Segoe UI", sans-serif`;
    g.textBaseline = 'middle';
    const card = this.$('partCard'), cardBottom = card.hidden ? 0 : (card.getBoundingClientRect().bottom + 14) * dpr;

    for (const side of [-1, 1]) {
      const col = items.filter((it) => it.side === side).sort((p, q) => p.py - q.py);
      const gap = 31 * dpr, top = side > 0 ? Math.max(110 * dpr, cardBottom) : 110 * dpr;
      col.forEach((it, i) => { it.ly = Math.max(it.py, i ? col[i - 1].ly + gap : top); });
      const over = col.length ? col[col.length - 1].ly - (H - 130 * dpr) : 0;
      if (over > 0) col.forEach((it) => { it.ly -= over; });
      for (const it of col) {
        const L = it.L, selected = it.li === this.sel, info = L.info;
        g.font = big; let tw = g.measureText(L.label).width;
        if (info) { g.font = small; tw = Math.max(tw, g.measureText(info).width); }
        const lx = side > 0 ? Math.min(cx + rr + 24 * dpr, W - tw - 16 * dpr) : Math.max(cx - rr - 24 * dpr, tw + 16 * dpr);
        const a = selected ? 1 : this.sel >= 0 ? alpha * 0.45 : alpha;
        g.globalAlpha = a * 0.6; g.strokeStyle = rgbCss(L.color); g.lineWidth = (selected ? 2 : 1) * dpr;
        g.beginPath(); g.moveTo(it.px, it.py); g.lineTo(lx - side * 6 * dpr, it.ly); g.lineTo(lx, it.ly); g.stroke();
        g.globalAlpha = a; g.fillStyle = rgbCss(L.color);
        g.beginPath(); g.arc(it.px, it.py, (selected ? 5 : 3) * dpr, 0, Math.PI * 2); g.fill();
        if (selected) { g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(it.px, it.py, 11 * dpr, 0, Math.PI * 2); g.stroke(); }
        g.font = big; g.fillStyle = selected ? '#ffffff' : '#eaf3ff'; g.textAlign = side > 0 ? 'left' : 'right';
        g.fillText(L.label, lx + side * 4 * dpr, info ? it.ly - 7 * dpr : it.ly);
        if (info) { g.font = small; g.fillStyle = 'rgba(190, 215, 245, 0.9)'; g.fillText(info, lx + side * 4 * dpr, it.ly + 8 * dpr); }
      }
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------ HUD update
  buildUI() {
    const tabs = this.$('catTabs'), chips = this.$('catChips');
    this.tabs = {}; this.chips = [];
    for (const c of CATEGORIES) {
      const b = document.createElement('button');
      b.className = 'tab'; b.textContent = `${c} · ${CATALOG.filter((d) => d.category === c).length}`; b.dataset.cat = c;
      b.addEventListener('click', () => this.showCategory(c));
      tabs.appendChild(b); this.tabs[c] = b;
    }
    CATALOG.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'chip'; b.dataset.index = i; b.dataset.cat = d.category;
      b.innerHTML = `<i style="color:${rgbCss(d.color)};background:${rgbCss(d.color)}"></i>${d.name}`;
      b.addEventListener('click', () => this.selectModel(i));
      chips.appendChild(b); this.chips[i] = b;
    });
    this.showCategory(this.activeCat);
    this.renderAchievements();
  }

  showCategory(c) {
    if (c === 'Wonders') c = 'Landmarks';
    if (c === 'Engines') c = 'Engineering';
    this.activeCat = c;
    for (const [k, b] of Object.entries(this.tabs)) b.classList.toggle('active', k === c);
    this.chips.forEach((b) => { b.hidden = b.dataset.cat !== c; });
  }

  guideItems(machine) {
    return [
      ['snap', '🫰', '<b>Snap</b> — summon particles / dissolve'],
      ['fist', '✊', machine ? '<b>Fist</b> — assemble model' : '<b>Fist</b> — form learning model'],
      ['open', '✋', machine ? '<b>Open slowly</b> — exploded view breakdown' : '<b>Open hand</b> — explore next model'],
      ['twist', '🔄', '<b>Twist / raise hand</b> — rotate & tilt model'],
      ...(machine ? [['point', '☝', '<b>Point</b> to inspect · <b>pinch</b> 🤏 to pull out']] : []),
      ['zoom', '🙌', '<b>Two hands</b> apart / together — zoom'],
      ['peace', '✌', '<b>Peace</b> — jump to next learning model'],
    ];
  }

  toast(msg) {
    const el = this.$('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), 2200);
  }

  updateHud(t, formT) {
    const st = this.ctl.state, def = CATALOG[st.index], $ = this.$, ctl = this.ctl;
    const isM = isMachine(st.index);
    if (this.lastIndexShown !== st.index) {
      this.lastIndexShown = st.index;
      $('cat').textContent = def.category; $('name').textContent = def.name; $('fact').textContent = def.fact || '';
      $('bigTitle').querySelector('.t').textContent = def.name; $('bigTitle').querySelector('.s').textContent = def.fact || '';
      $('explodeBox').hidden = !isM;
      this.chips.forEach((c, i) => c.classList.toggle('active', i === st.index));
      if (this.activeCat !== def.category) this.showCategory(def.category);
      this.guideKey = null;
    }
    const pill = $('statePill');
    if (pill.dataset.state !== st.state) { pill.dataset.state = st.state; pill.textContent = st.state; }
    const vis = ctl.handVisible(t), pose = vis ? (ctl.pinch ? 'pinch' : ctl.pose) : NONE;
    const [emo, label] = pose === 'pinch' ? ['🤏', 'Pinch'] : POSE_UI[pose] || POSE_UI.other;
    const pt = `${emo} ${label}${ctl.secondVisible(t) ? ' + 🖐' : ''}`;
    if ($('posePill').textContent !== pt) $('posePill').textContent = pt;
    const op = vis ? ctl.openness : 0;
    $('openBar').style.width = `${Math.round(op * 100)}%`; $('openPct').textContent = `${Math.round(op * 100)}%`;
    $('explodePct').textContent = `${Math.round(this.explode * 100)}%`;
    if (!this.sliderActive) $('explodeSlider').value = Math.round(this.explode * 100);
    const hot = st.state === IDLE || st.state === DISSOLVE ? 'snap' : st.state === SPHERE ? 'fist' : 'open';
    const gk = `${isM}|${hot}`;
    if (this.guideKey !== gk) {
      this.guideKey = gk;
      $('guide').innerHTML = this.guideItems(isM).map(([k, e, txt]) =>
        `<li class="${k === hot || (['peace', 'twist', 'point'].includes(k) && st.state === FORMED) ? 'hot' : ''}"><span class="e">${e}</span><span>${txt}</span></li>`
      ).join('');
    }
    $('bigTitle').classList.toggle('show', st.state === FORMED && formT > 0.8 && this.uploaded === st.index && this.explode < 0.15 && this.sel < 0 && !this.quiz);

    // Component card
    const card = $('partCard'), L = this.sel >= 0 && this.model?.labels[this.sel];
    card.hidden = !(L && st.state === FORMED && !this.quiz);
    if (L && card.dataset.key !== `${st.index}:${this.sel}`) {
      card.dataset.key = `${st.index}:${this.sel}`;
      card.querySelector('.swatch').style.background = rgbCss(L.color);
      card.querySelector('.pname').textContent = L.label;
      card.querySelector('.pinfo').textContent = L.info;
      const compMeta = getComponentData(def.name, L.label);
      card.querySelector('.pfact').textContent = compMeta.keyFact ? `💡 ${compMeta.keyFact}` : '';
      card.querySelector('.pobj').textContent = compMeta.learningObjective ? `🎯 Objective: ${compMeta.learningObjective}` : '';
      card.querySelector('.pmodel').textContent = `${def.name} · component ${this.sel + 1} of ${this.model.labels.length} (${compMeta.difficulty || 'Intermediate'})`;
    }
    card.classList.toggle('pulled', this.pulled);
    $('partPull').textContent = this.pulled ? '🤏 Put back' : '🤏 Pull out';

    // Quiz banner
    const qb = $('quiz'), q = this.quiz;
    qb.hidden = !q;
    if (q) {
      const target = q.target >= 0 && this.model?.labels[q.target];
      qb.querySelector('.q').textContent = q.done ? '🏆 Holo Quiz Complete' : target ? `🎓 Find: ${target.label}` : '🎓 Get ready…';
      qb.querySelector('.qs').textContent = `question ${Math.max(q.asked, 1)} / ${q.total} · score ${q.score}`;
      qb.querySelector('.qf').textContent = q.feedback || 'point at it with one finger ☝ (or click it)';
      qb.classList.toggle('good', q.feedback.startsWith('✅') || q.done);
      qb.classList.toggle('bad', q.feedback.startsWith('❌'));
    }

    const cam = this.cam?.running ? `cam <b>${this.cam.fps.toFixed(0)}</b> fps · hands ${this.cam.delegate} ${this.cam.detectMs.toFixed(0)} ms` : 'camera off';
    const extra = [
      Math.abs(this.zoom - 1) > 0.02 ? `zoom <b>${this.zoom.toFixed(2)}×</b>` : '',
      this.recorder.on ? `<span class="rec">● REC ${this.recorder.seconds().toFixed(0)} s</span>` : '',
      this.voiceOn ? '🎤 listening' : '',
    ].filter(Boolean).join(' · ');
    $('stats').innerHTML = `<b>${this.fps.toFixed(0)}</b> fps · <b>${(CFG.n / 1000).toFixed(0)}k</b> particles<br>${cam}${extra ? '<br>' + extra : ''}`;

    for (const e of st.events.splice(0)) {
      const name = CATALOG[st.index].name;
      if (e === 'snap') this.toast('🫰 Snap! Holographic particles materialized');
      else if (e === 'form') this.toast(isM ? `✊ Assembling: ${name}` : `✊ Forming ${name}`);
      else if (e === 'next') this.toast(`✌ Next Learning Model: ${name}`);
      else if (e === 'select') this.toast(`→ ${name}`);
      else if (e === 'dissolve') this.toast('💥 Dissolved into particle field');
    }
  }

  // ------------------------------------------------------------ Model Selection & Input Binding
  selectModel(i, autoForm = true) {
    const n = CATALOG.length;
    i = ((i % n) + n) % n;
    this.stopDemo();
    this.ctl.state.select(i, this.t);
    this.store.request(i);
    this.autoFormAt = autoForm ? this.t + 1.0 : null;
  }

  bindInput() {
    const $ = this.$, ctl = this.ctl;
    const now = () => this.t;
    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
      const k = e.key.toLowerCase(), st = ctl.state;
      if (k !== 'd') this.stopDemo();
      if (k === ' ') { e.preventDefault(); ctl.keySnap(now()); }
      else if (k === 'f') ctl.keyPose(FIST, now());
      else if (k === 'o') ctl.keyPose(OPEN, now());
      else if (k === 'v') ctl.keyPose(PEACE, now());
      else if (k === 'arrowright' || k === 'n') this.selectModel(st.index + 1);
      else if (k === 'arrowleft' || k === 'p') this.selectModel(st.index - 1);
      else if (k === 'e') this.manualExplode = this.manualExplode > 0.5 ? 0 : 1;
      else if (k === 'arrowup' || k === ']') { e.preventDefault(); this.manualExplode = clamp(this.manualExplode + 0.1, 0, 1); }
      else if (k === 'arrowdown' || k === '[') { e.preventDefault(); this.manualExplode = clamp(this.manualExplode - 0.1, 0, 1); }
      else if (k === '+' || k === '=') this.zoomTarget = clamp(this.zoomTarget * 1.15, 0.5, 2.6);
      else if (k === '-' || k === '_') this.zoomTarget = clamp(this.zoomTarget / 1.15, 0.5, 2.6);
      else if (k === '0') this.zoomTarget = 1;
      else if (k === 'x') this.toggleCut();
      else if (k === ',') this.cut.target = clamp(this.cut.target - 0.1, -1.25, 1.25);
      else if (k === '.') this.cut.target = clamp(this.cut.target + 0.1, -1.25, 1.25);
      else if (k === 'q') { if (this.quiz) this.stopQuiz(); else this.startQuiz(); }
      else if (k === 'm') this.toggleVoice();
      else if (k === 'k') this.toggleRecord();
      else if (k === 'i') this.voiceCommand('what is this');
      else if (k === 'j') { if (this.guidedLesson) this.stopGuidedLesson(); else this.startGuidedLesson(); }
      else if (k === 'a') { const t = $('tutorCard'); t.hidden = !t.hidden; }
      else if (k === 'escape') {
        if (this.quiz) this.stopQuiz();
        if (this.guidedLesson) this.stopGuidedLesson();
        $('tutorCard').hidden = true;
        $('help').hidden = true;
        $('achievements').hidden = true;
        this.deselect();
      }
      else if (k === 'r') this.toggle('autoRotate', 'bRotate');
      else if (k === 'g') { this.toggle('handRotate', 'bHandRot'); this.toast(`🔄 Hand rotation ${this.handRotate ? 'on' : 'off'}`); }
      else if (k === 'l') this.toggle('labelsOn', 'bLabels');
      else if (k === 't') this.trails = !this.trails;
      else if (k === 'c') this.toggleCamera();
      else if (k === 'd') this.toggleDemo();
      else if (k === 'h' || k === '?') $('help').hidden = !$('help').hidden;
    });

    $('bSnap').onclick = () => { this.stopDemo(); ctl.keySnap(now()); };
    $('bForm').onclick = () => { this.stopDemo(); ctl.keyPose(FIST, now()); };
    $('bOpen').onclick = () => {
      this.stopDemo();
      if (isMachine(ctl.state.index) && ctl.state.state === FORMED) this.manualExplode = this.manualExplode > 0.5 ? 0 : 1;
      else ctl.keyPose(OPEN, now());
    };
    $('bNext').onclick = () => { this.stopDemo(); ctl.keyPose(PEACE, now()); };
    $('bLabels').onclick = () => this.toggle('labelsOn', 'bLabels');
    $('bRotate').onclick = () => this.toggle('autoRotate', 'bRotate');
    $('bHandRot').onclick = () => this.toggle('handRotate', 'bHandRot');
    $('bCam').onclick = () => this.toggleCamera();
    $('bDemo').onclick = () => this.toggleDemo();
    $('bCut').onclick = () => this.toggleCut();
    $('bQuiz').onclick = () => { if (this.quiz) this.stopQuiz(); else this.startQuiz(); };
    $('bVoice').onclick = () => this.toggleVoice();
    $('bRec').onclick = () => this.toggleRecord();
    $('bHelp').onclick = () => { $('help').hidden = !$('help').hidden; };
    $('helpClose').onclick = () => { $('help').hidden = true; };
    $('bGuided').onclick = () => { if (this.guidedLesson) this.stopGuidedLesson(); else this.startGuidedLesson(); };
    $('guidedClose').onclick = () => this.stopGuidedLesson();
    $('bTutor').onclick = () => { const t = $('tutorCard'); t.hidden = !t.hidden; };
    $('tutorClose').onclick = () => { $('tutorCard').hidden = true; };
    $('bAchieve').onclick = () => { const a = $('achievements'); a.hidden = !a.hidden; if (!a.hidden) this.renderAchievements(); };
    $('achieveClose').onclick = () => { $('achievements').hidden = true; };

    $('partClose').onclick = () => this.deselect();
    $('partPull').onclick = () => {
      if (this.sel >= 0) {
        this.pulled = !this.pulled;
        if (this.pulled) {
          this.exploredParts.add(`${this.ctl.state.index}:${this.sel}`);
          if (this.exploredParts.size >= 10) this.unlockAchievement('deep_investigation');
        }
      }
    };
    $('partSpeak').onclick = () => {
      const L = this.model?.labels[this.sel];
      if (L) { this.spoken.push(`${L.label}. ${L.info}.`); speak(`${L.label}. ${L.info}.`); }
    };
    $('partAskAi').onclick = () => {
      const L = this.model?.labels[this.sel];
      if (L) this.askAITutor(`Explain the function and significance of the ${L.label}.`, L.label);
    };
    $('quizStop').onclick = () => this.stopQuiz();

    // AI Tutor events
    $('tutorSend').onclick = () => {
      const val = $('tutorInput').value.trim();
      if (val) { this.askAITutor(val); $('tutorInput').value = ''; }
    };
    $('tutorInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = $('tutorInput').value.trim();
        if (val) { this.askAITutor(val); $('tutorInput').value = ''; }
      }
    });
    document.querySelectorAll('.tutor-chip').forEach((btn) => {
      btn.onclick = () => {
        const prompt = btn.dataset.prompt;
        const L = this.sel >= 0 && this.model?.labels[this.sel];
        const q = L ? `${prompt} regarding the ${L.label}` : `${prompt} regarding the ${CATALOG[this.ctl.state.index].name}`;
        this.askAITutor(q);
      };
    });
    document.querySelectorAll('.level-btn').forEach((btn) => {
      btn.onclick = () => this.setLearningLevel(btn.dataset.level);
    });

    const slider = $('explodeSlider');
    slider.addEventListener('input', () => { this.sliderActive = true; this.manualExplode = slider.value / 100; });
    slider.addEventListener('change', () => { this.sliderActive = false; });
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || !isMachine(ctl.state.index)) this.zoomTarget = clamp(this.zoomTarget * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.5, 2.6);
      else this.manualExplode = clamp(this.manualExplode - Math.sign(e.deltaY) * 0.08, 0, 1);
    }, { passive: false });

    let drag = null;
    const px = (e) => [e.clientX * CFG.dpr, e.clientY * CFG.dpr];
    this.canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: this.dragYaw, moved: false }; this.canvas.setPointerCapture(e.pointerId); });
    this.canvas.addEventListener('pointermove', (e) => {
      if (drag) { if (Math.abs(e.clientX - drag.x) > 4) drag.moved = true; this.dragYaw = drag.yaw + (e.clientX - drag.x) * 0.008; }
      else if (this.cut.on && !this.ctl.handVisible(this.t)) {
        const c0 = project(this.projView, [0, 0, 0]), rr = this.globeRadiusPx();
        this.cut.target = clamp((px(e)[0] - (c0[0] * 0.5 + 0.5) * this.overlay.width) / rr, -1.25, 1.25);
      }
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (drag && !drag.moved && this.anchors.length) {
        const [x, y] = px(e), li = this.nearestAnchor(x, y, 70 * CFG.dpr);
        if (li >= 0) this.selectPart(li, 'click'); else if (!this.quiz) this.deselect();
      }
      drag = null;
    });
  }

  toggle(prop, btn) { this[prop] = !this[prop]; this.$(btn).classList.toggle('on', this[prop]); }

  async startCamera() {
    const msg = this.$('startMsg');
    try {
      this.cam = this.cam || new HandCamera(this.video);
      await this.cam.start((s) => { msg.textContent = s; if (s) this.toast(s); });
      this.camOn = true; this.$('bCam').classList.add('on');
      this.toast('📷 Camera active — show your hand to begin!');
      return true;
    } catch (e) {
      console.error(e);
      const text = e.name === 'NotAllowedError' ? 'Camera permission denied — keyboard and mouse fallbacks are fully active.'
        : e.name === 'NotFoundError' ? 'No webcam detected — keyboard, mouse and automated demo are ready.' : `Camera error: ${e.message}`;
      msg.textContent = text; this.toast(text);
      this.cam?.stop(); this.cam = null; this.camOn = false;
      return false;
    }
  }

  stopCamera() { this.cam?.stop(); this.cam = null; this.camOn = false; this.hasVideo = false; this.$('bCam').classList.remove('on'); this.toast('Camera off'); }
  toggleCamera() { if (this.camOn) this.stopCamera(); else this.startCamera(); }

  toggleDemo() {
    if (this.demo) this.stopDemo();
    else { this.demo = new Demo(this); this.$('bDemo').classList.add('on'); this.toast('▶ Flagship Demo — automated educational showcase'); }
  }
  stopDemo() {
    if (!this.demo) return;
    this.demo = null; this.demoHand = undefined; this.$('bDemo').classList.remove('on'); this.ctl.onHands([], this.t);
  }

  // ------------------------------------------------------------ Deterministic Stepping (Testing)
  setHand(h, h2) {
    if (h !== undefined) this.handSource = h === null ? () => null : typeof h === 'function' ? h : () => h;
    this.handSource2 = h2 ? (typeof h2 === 'function' ? h2 : () => h2) : null;
    this.lastSynthT = -1;
  }
  async advance(seconds, hand, hand2) {
    this.setHand(hand, hand2);
    const steps = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < steps; i++) {
      const st = this.ctl.state;
      if (st.targetDirty && !this.store.get(st.index)) await this.store.request(st.index);
      this.frame(this.t + 1 / 60);
    }
  }

  status() {
    const st = this.ctl.state, L = this.model?.labels || [], q = this.quiz;
    return {
      state: st.state, index: st.index, name: CATALOG[st.index].name, kind: CATALOG[st.index].kind, category: CATALOG[st.index].category, uploaded: this.uploaded,
      pose: this.ctl.pose, rawPose: this.ctl.rawPose, pinch: this.ctl.pinch, openness: this.ctl.openness, explode: this.explode, scale: this.scale,
      yaw: this.spin + this.dragYaw, pitch: this.pitch, handRotating: this.handRotating, roll: this.ctl.roll,
      zoom: this.zoom, twoHands: this.ctl.secondVisible(this.t), pulse: this.pulse, flow: this.flow,
      selected: this.sel >= 0 ? L[this.sel]?.label : null, pulled: this.pulled, pullAmt: this.pullAmt, pointing: !!this.pointer,
      cut: { ...this.cut }, labels: L.length, anchors: this.anchors.length, activeCat: this.activeCat,
      quiz: q ? { target: q.target >= 0 ? L[q.target]?.label : null, score: q.score, asked: q.asked, total: q.total, phase: q.phase, done: q.done, feedback: q.feedback } : null,
      voice: { on: this.voiceOn, supported: this.voice.supported, heard: this.lastHeard }, spoken: this.spoken.slice(-3), spokenCount: this.spoken.length,
      recording: this.recorder.on, lastRecording: this.lastRecording,
      tintMix: this.tintMix, alpha: st.alpha(this.t), t: this.t, fps: this.fps, n: CFG.n, frames: this.frames,
      learningLevel: this.learningLevel,
      aiAsked: this.aiAskedCount > 0,
      guidedLesson: this.guidedLesson ? { step: this.guidedLesson.stepIdx + 1, total: this.guidedLesson.steps.length, done: this.guidedLesson.done } : null,
      modelErrors: this.store.errors.length, gl: this.renderer.info,
      camera: this.cam ? { running: this.cam.running, fps: this.cam.fps, frames: this.cam.frames, delegate: this.cam.delegate, detectMs: this.cam.detectMs, videoW: this.video.videoWidth, videoH: this.video.videoHeight } : null,
    };
  }
}

// ---------------------------------------------------------------- boot
function boot() {
  let app;
  try { app = new App(); }
  catch (e) {
    console.error(e);
    document.getElementById('startMsg').textContent = `Cannot start: ${e.message}`;
    document.getElementById('bStartCam').disabled = true; document.getElementById('bStartNoCam').disabled = true;
    return;
  }
  const start = document.getElementById('start');
  const hideStart = () => { start.hidden = true; };
  document.getElementById('bStartCam').onclick = async () => { if (await app.startCamera()) hideStart(); };
  document.getElementById('bStartNoCam').onclick = () => { hideStart(); app.toast('Keyboard: Space = summon · F = assemble · O = explode · D = demo · H = help'); };
  if (CFG.autostart === 'camera') { hideStart(); app.startCamera(); }
  else if (CFG.autostart === 'nocamera' || CFG.manual) hideStart();

  const holoLearnApi = {
    app, CATALOG, CFG, synth: synthHand,
    ready: () => app.store.request(app.ctl.state.index),
    advance: (s, hand, hand2) => app.advance(s, hand, hand2),
    clearHand: () => { app.handSource = null; app.handSource2 = null; },
    select: (i, autoForm = false) => app.selectModel(i, autoForm),
    voice: (text) => app.voiceCommand(text),
    askTutor: (q, comp) => app.askAITutor(q, comp),
    startGuided: (idx) => app.startGuidedLesson(idx),
    startGuidedLesson: (idx) => app.startGuidedLesson(idx),
    getAchievements: () => app.achievements,
    EDUCATION_REGISTRY,
    LEARNING_LEVELS,
    ACHIEVEMENTS,
    anchor: (label) => { const a = app.anchors.find((q) => q.L.label === label); return a ? { x: a.px / CFG.dpr, y: a.py / CFG.dpr } : null; },
    pointAt: (x, y, s = 0.085) => { const [nx, ny] = app.toNorm([x * CFG.dpr, y * CFG.dpr]); return { cx: nx + 0.35 * s, cy: ny + 1.1 * s, s }; },
    status: () => app.status(),
    cloud: () => {
      const d = app.renderer.readParticles(CFG.n);
      let sum = 0, max = 0, finite = true, speed = 0;
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < CFG.n; i++) {
        const x = d[i * 6], y = d[i * 6 + 1], z = d[i * 6 + 2];
        if (!Number.isFinite(x + y + z)) finite = false;
        const r = Math.hypot(x, y, z); sum += r; max = Math.max(max, r);
        speed += Math.hypot(d[i * 6 + 3], d[i * 6 + 4], d[i * 6 + 5]);
        lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y); lo[2] = Math.min(lo[2], z);
        hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y); hi[2] = Math.max(hi[2], z);
      }
      return { meanR: sum / CFG.n, maxR: max, lo, hi, finite, meanSpeed: speed / CFG.n };
    },
  };

  // Expose both HoloLearn AI modern API and WonderSnap backwards-compatibility alias
  window.holoLearn = holoLearnApi;
  window.wonderSnap = holoLearnApi;

  if (!CFG.manual) {
    const loop = (ms) => { app.frame(ms / 1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}
boot();
