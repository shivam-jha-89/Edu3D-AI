// HoloLearn AI - Voice interaction, Spoken Descriptions, Command Parser, and Video Session Recording
// Clean, decoupled functional module for multi-modal educational interaction.

/** Spoken nicknames -> catalog names. */
export const ALIASES = {
  heart: 'Human Heart', brain: 'Human Brain', kidney: 'Kidney', kidneys: 'Kidney', lung: 'Lungs', lungs: 'Lungs',
  eye: 'Human Eye', eyes: 'Human Eye', ear: 'Human Ear', ears: 'Human Ear', tooth: 'Tooth (Molar)', teeth: 'Tooth (Molar)', molar: 'Tooth (Molar)',
  skull: 'Skull', skeleton: 'Skeleton', bones: 'Skeleton', body: 'Human Body', human: 'Human Body', dna: 'DNA Double Helix', helix: 'DNA Double Helix',
  cell: 'Animal Cell', car: 'Sports Car', motorcycle: 'Motorcycle', motorbike: 'Motorcycle', bike: 'Motorcycle', plane: 'Airliner',
  airplane: 'Airliner', aeroplane: 'Airliner', airliner: 'Airliner', jet: 'Turbofan Jet Engine', turbofan: 'Turbofan Jet Engine', rocket: 'Saturn V Rocket',
  saturn: 'Saturn V Rocket', watch: 'Mechanical Watch', battery: 'EV Battery Pack', v8: 'Supercharged HEMI V8', hemi: 'Supercharged HEMI V8',
  engine: 'Inline-4 Engine', radial: 'Radial Aircraft Engine', eiffel: 'Eiffel Tower', pyramid: 'Great Pyramid', colosseum: 'Colosseum',
  pisa: 'Leaning Tower of Pisa', taj: 'Taj Mahal', ben: 'Big Ben', liberty: 'Statue of Liberty', burj: 'Burj Khalifa', christ: 'Christ the Redeemer',
  redeemer: 'Christ the Redeemer', opera: 'Sydney Opera House', turtle: 'Turtle Tower',
};

const STOP = new Set(['the', 'and', 'of', 'lobe', 'lobes', 'part', 'parts', 'show', 'me', 'with', 'what', 'this', 'that']);
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

/**
 * Parse a spoken sentence into actionable HoloLearn AI commands.
 * Returns: [{type: 'model'|'part'|'explode'|'assemble'|'next'|'prev'|'snap'|'dissolve'|'quiz'|'stopQuiz'|'cut'|'zoomIn'|'zoomOut'|'rotate'|'describe'|'record'|'tutor'|'guided'}]
 */
export function parseCommand(text, catalog, labels = []) {
  const t = ` ${words(text).join(' ')} `, has = (...ws) => ws.some((w) => t.includes(` ${w} `));
  const acts = [];

  if (has('stop quiz', 'end quiz', 'quit quiz')) return [{ type: 'stopQuiz' }];
  if (has('quiz', 'test me', 'test my knowledge', 'challenge me')) return [{ type: 'quiz' }];
  if (has('ask ai', 'ask tutor', 'tutor me', 'explain to me', 'why is this', 'ai tutor')) acts.push({ type: 'tutor' });
  if (has('start guided', 'guided lesson', 'guided learning', 'teach me', 'guide me')) acts.push({ type: 'guided' });
  if (has('what is this', 'what is that', 'tell me', 'explain', 'describe', 'what does it do', 'read this', 'read aloud')) acts.push({ type: 'describe' });

  // A component part of the current model ("show me the left ventricle")
  let bestPart = -1, bestLen = 0;
  labels.forEach((L, i) => {
    let score = 0;
    for (const w of new Set(words(L.label))) {
      if (w.length >= 4 && !STOP.has(w) && t.includes(` ${w} `)) score += w.length;
    }
    if (score > bestLen) { bestLen = score; bestPart = i; }
  });

  // A model: exact name match first, then keyword alias
  let model = catalog.find((d) => t.includes(` ${words(d.name).join(' ')} `))?.name;
  if (!model) {
    for (const [k, v] of Object.entries(ALIASES)) {
      if (t.includes(` ${k} `)) { model = v; break; }
    }
  }

  if (bestPart >= 0 && (!model || bestLen >= 5)) acts.push({ type: 'part', index: bestPart });
  else if (model) acts.push({ type: 'model', name: model });

  if (has('explode', 'open', 'apart', 'inside', 'expand', 'break', 'disassemble')) acts.push({ type: 'explode' });
  else if (has('assemble', 'close', 'together', 'contract', 'collapse', 'build', 'combine')) acts.push({ type: 'assemble' });

  if (has('next')) acts.push({ type: 'next' });
  if (has('previous', 'go back', 'last one')) acts.push({ type: 'prev' });
  if (has('snap', 'summon', 'start', 'materialize')) acts.push({ type: 'snap' });
  if (has('dissolve', 'clear', 'vanish')) acts.push({ type: 'dissolve' });
  if (has('cut', 'slice', 'section', 'x-ray', 'x ray')) acts.push({ type: 'cut' });
  if (has('zoom in', 'bigger', 'closer')) acts.push({ type: 'zoomIn' });
  if (has('zoom out', 'smaller', 'further')) acts.push({ type: 'zoomOut' });
  if (has('rotate', 'spin')) acts.push({ type: 'rotate' });
  if (has('record', 'recording')) acts.push({ type: 'record' });

  return acts;
}

/** Continuous speech recognition (Chrome / Edge / Safari). */
export class Voice {
  constructor(onText) {
    this.SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    this.supported = !!this.SR;
    this.onText = onText;
    this.on = false;
    this.rec = null;
    this.last = '';
  }
  start() {
    if (!this.SR) return false;
    const rec = new this.SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      if (r.isFinal !== false) {
        this.last = r[0].transcript;
        this.onText(this.last);
      }
    };
    rec.onend = () => {
      if (this.on) {
        try { rec.start(); } catch { /* ignore if already active */ }
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.on = false;
    };
    this.rec = rec;
    this.on = true;
    try { rec.start(); } catch { /* ignore double start */ }
    return true;
  }
  stop() {
    this.on = false;
    try { this.rec?.stop(); } catch { /* ignore */ }
  }
}

/** Read text aloud via SpeechSynthesis with optional voice customization. */
export function speak(text, { rate = 1.0, pitch = 1.0, onEnd = null } = {}) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = pitch;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

/** Stop active speech synthesis. */
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/** Records the particle canvas + HUD overlay into a local WebM video file. */
export class Recorder {
  constructor(gl, overlay) {
    this.gl = gl;
    this.overlay = overlay;
    this.on = false;
    this.t0 = 0;
    this.track = null;
    this.chunks = [];
  }
  static supported() {
    return typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;
  }
  start() {
    const W = Math.min(this.gl.width || 1280, 1920);
    const H = Math.round((W * (this.gl.height || 720)) / (this.gl.width || 1280));
    this.comp = document.createElement('canvas');
    this.comp.width = W;
    this.comp.height = H;
    this.ctx = this.comp.getContext('2d');
    this.ctx.fillStyle = '#03050c';
    this.ctx.fillRect(0, 0, W, H);

    const stream = this.comp.captureStream(30);
    this.track = stream.getVideoTracks()[0] || null;

    const mimeCandidate = ['video/webm;codecs=vp8', 'video/webm', 'video/webm;codecs=vp9'].find((m) =>
      MediaRecorder.isTypeSupported(m)
    ) || '';
    this.type = mimeCandidate || 'video/webm';
    this.chunks = [];

    this.mr = new MediaRecorder(stream, mimeCandidate ? { mimeType: mimeCandidate } : undefined);
    this.mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.mr.start(200);
    this.on = true;
    this.t0 = performance.now();
  }

  /** Render frame into offscreen composite canvas. */
  frame() {
    if (!this.on || !this.ctx) return;
    const { ctx, comp } = this;
    ctx.drawImage(this.gl, 0, 0, comp.width, comp.height);
    ctx.drawImage(this.overlay, 0, 0, comp.width, comp.height);
    if (this.track?.requestFrame) {
      try { this.track.requestFrame(); } catch {}
    }
  }

  seconds() {
    return this.on ? (performance.now() - this.t0) / 1000 : 0;
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.on || !this.mr) { resolve(null); return; }
      this.on = false;
      this.frame();
      try {
        if (this.mr.state === 'recording') this.mr.requestData();
      } catch {}

      this.mr.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.type });
        resolve(blob);
      };

      try {
        this.mr.stop();
      } catch {
        resolve(new Blob(this.chunks, { type: this.type }));
      }
    });
  }
}
