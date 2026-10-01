# HoloLearn AI

> **Touch Knowledge. Explore Reality.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebGL2](https://img.shields.io/badge/WebGL2-GPU%20Transform%20Feedback-cyan.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Local%20Hand%20Tracking-orange.svg)](https://developers.google.com/mediapipe)
[![Tests: Playwright](https://img.shields.io/badge/Tests-43%20Passed-brightgreen.svg)](#testing--verification)

**HoloLearn AI** is an AI-powered interactive 3D holographic learning laboratory where learners explore anatomy, biology, engineering, and world architecture through glowing GPU particle simulations controlled entirely by bare hands.

Built upon the technical foundation of Akbar Sheikh's **WonderSnap**, HoloLearn AI transforms raw particle manipulation into an educational platform with adaptive AI tutoring, structured guided learning tracks, interactive anatomy simulations, and gamified spatial quizzes.

---

## Pedagogical Philosophy

```
  SEE                  TOUCH                 EXPLORE               UNDERSTAND
┌──────────────┐     ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Holographic │ ──> │ Bare-Hand    │  ──> │ Exploded     │  ──> │ Multi-Level  │
│  GPU Field   │     │ Interactions │      │ Anatomies    │      │ AI Tutoring  │
└──────────────┘     └──────────────┘      └──────────────┘      └──────────────┘
```

Traditional STEM education relies on static 2D textbook diagrams or passive 3D model viewers. HoloLearn AI replaces passive observation with **embodied spatial interaction**:
1. **See**: Observe complex systems as shimmering fields of 200,000+ GPU particles.
2. **Touch**: Use intuitive hand gestures to summon, sculpt, rotate, and slice open structures in 3D space.
3. **Explore**: Explode organs and machines into constituent components, pulling out sub-assemblies with a pinch gesture.
4. **Understand**: Query the multimodal **Holo Tutor** across three educational depth levels (Beginner, Intermediate, Advanced) and validate mastery with spatial pointing quizzes.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             HoloLearn AI Client                             │
│                                                                             │
│  ┌──────────────────────┐  Landmarks   ┌─────────────────────────────────┐  │
│  │   MediaPipe Hands    │ ───────────> │        Controller & FSM         │  │
│  │ (Client WebAssembly) │              │  IDLE → SPHERE → FORMED → ...   │  │
│  └──────────────────────┘              └─────────────────────────────────┘  │
│             │                                           │                   │
│             ▼                                           ▼                   │
│  ┌──────────────────────┐              ┌─────────────────────────────────┐  │
│  │  Spatial Gestures    │              │    WebGL2 Transform Feedback    │  │
│  │  Pinch / Point / Rot │              │   200,000 Particles @ 60 FPS    │  │
│  └──────────────────────┘              └─────────────────────────────────┘  │
│             │                                           │                   │
│             ▼                                           ▼                   │
│  ┌──────────────────────┐              ┌─────────────────────────────────┐  │
│  │  Holo Tutor HUD &    │ <──────────> │   Zero-Dependency Node Server   │  │
│  │  Guided Lessons      │   /api/tutor │   (Gemini 2.5 / OpenAI / Local) │  │
│  └──────────────────────┘              └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Bare-Hand Gesture Interaction

All computer vision inference executes **locally in your browser** via MediaPipe Tasks Vision. Video frames are never recorded, transmitted, or uploaded.

| Gesture | Visual | Action in HoloLearn AI |
| :--- | :---: | :--- |
| **Snap** | 🫰 | **Summon / Dissolve**: Releases particle field or dissolves current model back to ambient stardust. |
| **Fist** | ✊ | **Assemble**: Streams particles into solid 3D educational model. |
| **Open Hand** | ✋ | **Exploded View**: Continuously expands model components outward as fingers separate. |
| **Twist Hand** | 🔄 | **Orientation**: Twisting wrist rotates model yaw; raising/lowering hand adjusts pitch. |
| **Two Hands** | 🙌 | **Bimanual Zoom**: Spreading hands apart magnifies; bringing them together zooms out. |
| **Point** | ☝ | **Inspect Component**: Aim index finger at component label to lock focus and show details. |
| **Pinch** | 🤏 | **Pull Out**: Pinch thumb and index finger to isolate a component in exploded focus. |
| **Peace** | ✌ | **Next Model**: Jumps sequentially to next educational experience in the catalog. |

---

## WebGL2 GPU Particle Simulation Engine

HoloLearn AI executes high-throughput particle physics directly on the GPU using **WebGL2 Transform Feedback**:

- **Double-Buffered Ping-Pong VBOs**: Swaps read/write position and velocity buffers each frame with zero CPU readback during simulation.
- **Physics Stages**:
  - `idle`: Vector noise curl field simulating cosmic stardust.
  - `sphere`: Swirling spherical containment shell ($r \approx 0.82$).
  - `formed`: Spring-mass damping converging particles to target 3D coordinates.
  - `exploded`: Linear displacement along vector normals modulated by hand openness.
  - `cut`: Hardware discard clipping against a spatial plane ($x > x_{\text{cut}}$) for **Holo X-Ray** cross-sections.
  - `dissolve`: Explosive tangential dispersion with decaying alpha.
- **Performance**: Sustains 60 FPS with 200,000+ particles on integrated GPUs (Intel Iris Xe / AMD Radeon) and dedicated GPUs.

---

## 3D Educational Catalog (33 Models)

HoloLearn AI includes 33 procedurally sampled 3D models with annotated sub-components:

### 🫀 Anatomy
- **Human Heart (Flagship)**: Four chambers, aorta, pulmonary arteries, valves, myocardial wall differential, synchronized 72 BPM cardiac pulse with streaming blood flow particles.
- **Human Brain**: Cerebrum, cerebellum, brainstem, frontal lobe, temporal lobe, corpus callosum.
- **Human Eye**: Cornea, iris, crystalline lens, vitreous humor, retina, optic nerve.
- **Lungs & Respiratory Tree**: Trachea, bronchi, bronchial branches, alveolar sacs with breathing expansion.
- **Kidney**: Renal cortex, medulla, renal pyramids, renal pelvis, ureter.
- **Human Skull, Ear, Tooth, Hand Bones**.

### 🔬 Biology
- **DNA Double Helix**: Phosphodiester backbone, base pairs (A-T, G-C) with major and minor grooves.
- **Animal Cell**: Nucleus, nucleolus, mitochondria, endoplasmic reticulum, Golgi apparatus, lysosomes.
- **Plant Cell**: Rigid cellulose cell wall, large central vacuole, chloroplasts.
- **Chloroplast & Mitochondria**: Thylakoid grana, stroma, cristae, inner mitochondrial matrix.
- **Bacteriophage & Coronavirus**: Capsid geometry, spike proteins, viral genome.

### ⚙️ Engineering & Machines
- **Turbofan Jet Engine**: Multi-stage fan, low/high pressure compressors, combustion chamber, turbine stages.
- **Inline-4 Engine & Supercharged HEMI V8**: Pistons, connecting rods, crankshaft, camshaft, blower.
- **Electric Motor**: Rotor, stator, copper windings, commutators.
- **Mechanical Watch**: Balance wheel, escapement gear, mainspring barrel, gear train.
- **Robotic Arm & Drone**: Articulated servos, carbon fiber frame, brushless quad motors.

### 🏛️ Landmarks & Vehicles
- **Wonders of the World**: Eiffel Tower, Colosseum, Taj Mahal, Parthenon, Great Pyramid, Turtle Tower.
- **Vehicles**: Formula 1 Sports Car, Apollo Saturn V Rocket, Steam Locomotive, Nuclear Submarine.

---

## Flagship Experience: The Human Heart

The flagship Human Heart model provides an interactive cardiovascular physiology lab:

```
          [Deoxygenated Blood]              [Oxygenated Blood]
       Vena Cava ──> Right Atrium       Pulmonary Veins ──> Left Atrium
                          │                                     │
                          ▼                                     ▼
                   Right Ventricle                       Left Ventricle
                          │                                     │
                          ▼ (Low Pressure: 25 mmHg)             ▼ (High Pressure: 120 mmHg)
                   Pulmonary Artery                           Aorta
                          │                                     │
                          ▼                                     ▼
                    LUNGS (Oxygenation)                  BODY (Systemic)
```

- **Dynamic Cardiac Pulse**: Oscillates at 72 BPM with realistic ventricular contraction (*systole*) and filling (*diastole*).
- **Dual-Loop Hemodynamics**: Highlighting pressure gradients between systemic circulation (requiring thick left ventricular myocardium) and low-pressure pulmonary circulation.
- **Interactive Dissection**: Pinch to extract the left ventricle; activate Holo X-Ray to reveal the bicuspid and tricuspid valves.
- **Guided Lesson**: Step-by-step tutorial guiding students from initial summon through valve mechanics and clinical pathology (e.g. left ventricular hypertrophy).

---

## Adaptive AI Tutor Layer

The server features a lightweight endpoint (`POST /api/tutor`) that supports **Google Gemini API** (`gemini-2.5-flash`), **OpenAI API**, or local offline fallback.

### Learning Levels
- **Beginner**: Accessible vocabulary, intuitive analogies (e.g. comparing the heart to a dual-chambered bicycle pump), clear concepts for K-12.
- **Intermediate**: Standard scientific and anatomical terminology, physiological mechanisms, cause-and-effect relationships for high school and undergrads.
- **Advanced**: Hemodynamics, vascular compliance, biochemical mechanisms, histological layers, clinical pathology, and diagnostic considerations.

### Safe Offline Operation
If no API keys are present in `.env`, HoloLearn AI operates completely offline, serving pre-compiled educational insights and displaying:
```
AI TUTOR UNAVAILABLE - Add an AI provider key to enable interactive explanations.
```

---

## Controls & Keyboard Fallbacks

HoloLearn AI is fully operable via keyboard and mouse when a webcam is unavailable:

| Key | Function | Key | Function |
| :---: | :--- | :---: | :--- |
| <kbd>Space</kbd> | Summon / Dissolve particle field | <kbd>Q</kbd> | Start / Stop Holo Quiz challenge |
| <kbd>F</kbd> | Assemble 3D model | <kbd>M</kbd> | Toggle voice recognition & speech |
| <kbd>O</kbd> / <kbd>E</kbd> | Toggle Exploded View | <kbd>K</kbd> | Record WebM session video locally |
| <kbd>V</kbd> / <kbd>→</kbd> | Next educational model | <kbd>X</kbd> | Toggle Holo X-Ray cutting plane |
| <kbd>←</kbd> | Previous educational model | <kbd>D</kbd> | Run automated flagship demo |
| <kbd>R</kbd> | Toggle continuous auto-rotation | <kbd>C</kbd> | Toggle webcam tracking |
| <kbd>L</kbd> | Toggle 3D component labels | <kbd>H</kbd> | Toggle Keyboard & Gesture Guide |
| <kbd>G</kbd> | Toggle hand-to-model rotation gain | <kbd>Esc</kbd> | Deselect component / close modals |

**Mouse Controls**:
- **Left Click + Drag**: Orbit model yaw and pitch.
- **Scroll Wheel**: Adjust exploded view separation (or camera zoom).
- **Hover / Click**: Inspect component details and show educational card.

---

## Local Setup & Quickstart

### Prerequisites
- **Node.js**: Version 18.0 or higher.
- Modern WebGL2-compatible browser (Google Chrome, Microsoft Edge, Brave, Firefox).
- Webcam (optional, recommended for hand tracking).

### Installation

1. **Clone repository**:
   ```bash
   git clone https://github.com/AkbarSheikh-debug/wondersnap.git hololearn-ai
   cd hololearn-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment (Optional for AI Tutor)**:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini or OpenAI API key:
   ```env
   PORT=5173
   GEMINI_API_KEY=your_gemini_api_key_here
   # OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the local server**:
   ```bash
   npm start
   ```
   Open your browser at:
   ```
   http://localhost:5173
   ```

---

## Testing & Verification

HoloLearn AI features comprehensive end-to-end and component tests executed with Playwright against real GPU shaders:

```bash
# Run the complete test suite (43 tests across 7 test suites)
npm test

# Run individual test suites
npx playwright test tests/hololearn.spec.js   # HoloLearn AI features & API
npx playwright test tests/features.spec.js    # Heartbeat, Zoom, Quiz, Voice, Video
npx playwright test tests/app.spec.js         # Full end-to-end interaction stories
npx playwright test tests/models.spec.js      # Procedural geometry & sampling
npx playwright test tests/gpu.spec.js         # WebGL2 shader pipelines & buffers
npx playwright test tests/logic.spec.js       # State machine & gesture classifiers
npx playwright test tests/camera.spec.js      # Video feed & MediaPipe landmark loop
```

---

## Privacy & Security

- **100% Local Inference**: Hand landmark detection runs directly inside the browser using WebAssembly. Camera streams never leave the client.
- **Zero Third-Party Tracking**: No telemetry, tracking pixels, or external analytics.
- **Secure Server Proxy**: AI queries pass through a zero-dependency server that keeps your API keys secure on the backend.

---

## Acknowledgments & Attribution

HoloLearn AI is developed from the open-source **WonderSnap** project created by **Akbar Sheikh**:
- Original WonderSnap Repository: [https://github.com/AkbarSheikh-debug/wondersnap](https://github.com/AkbarSheikh-debug/wondersnap)
- Original Author: Akbar Sheikh
- License: MIT License (see [LICENSE](LICENSE))

We extend our deep gratitude to Akbar Sheikh for creating the high-performance WebGL2 transform feedback particle architecture and synthetic hand testing pipeline that made HoloLearn AI possible.
