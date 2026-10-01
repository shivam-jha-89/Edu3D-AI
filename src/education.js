// HoloLearn AI - Educational Knowledge Architecture & Metadata Registry
// Powers Guided Learning, AI Tutor Context, Component Deep Dives, and Learning Analytics

export const LEARNING_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

export const ACHIEVEMENTS = [
  { id: 'first_discovery', title: 'FIRST DISCOVERY', icon: '🌟', desc: 'Materialize and explore your first 3D holographic model.', unlocked: false },
  { id: 'anatomy_explorer', title: 'ANATOMY EXPLORER', icon: '🫀', desc: 'Explore 5 anatomical models in the HoloLab.', unlocked: false },
  { id: 'deep_investigation', title: 'DEEP INVESTIGATION', icon: '🔬', desc: 'Pinch and pull out 10 components in exploded view.', unlocked: false },
  { id: 'xray_vision', title: 'HOLO X-RAY', icon: '✂️', desc: 'Use the cross-section cutting plane to inspect internal anatomy.', unlocked: false },
  { id: 'perfect_score', title: 'PERFECT SCORE', icon: '🏆', desc: 'Score 100% on a Holo Quiz challenge.', unlocked: false },
  { id: 'holo_master', title: 'HOLO MASTER', icon: '🎓', desc: 'Complete a step-by-step Guided Learning lesson.', unlocked: false },
  { id: 'ai_scholar', title: 'AI SCHOLAR', icon: '🤖', desc: 'Consult the Holo Tutor for deeper scientific understanding.', unlocked: false },
];

export const EDUCATION_REGISTRY = {
  'Human Heart': {
    category: 'Anatomy',
    difficulty: 'Intermediate',
    tagline: 'The Bio-Mechanical Engine of Human Circulation',
    overview: 'The human heart is a four-chambered muscular pump that contracts approximately 100,000 times per day, driving 7,000 liters of blood through a 60,000-mile vascular network.',
    objectives: [
      'Identify the 4 chambers (atria and ventricles) and their roles.',
      'Trace dual-circuit circulation: Pulmonary (lungs) vs Systemic (body).',
      'Understand the hydrodynamic action of heart valves preventing regurgitation.',
      'Explain why the left ventricle myocardium is 3× thicker than the right.',
    ],
    simulation: 'Synchronized cardiac cycle (72 BPM) with dual-chamber contraction and particle blood-flow streaming.',
    guidedLesson: [
      { step: 1, title: 'Summon Heart', instruction: 'Snap fingers 🫰 or press Space to activate the holographic particle field.', verify: (s) => s.state === 'formed' },
      { step: 2, title: 'Locate Left Ventricle', instruction: 'Point your finger ☝ at the lower right of the heart (Left Ventricle) until it glows.', targetPart: 'Left ventricle', verify: (s) => s.selected === 'Left ventricle' },
      { step: 3, title: 'Inspect Myocardium', instruction: 'Pinch your thumb and index finger 🤏 to pull the Left Ventricle into Exploded View.', verify: (s) => s.pulled && s.selected === 'Left ventricle' },
      { step: 4, title: 'Engage Holo X-Ray', instruction: 'Press "X" or the ✂ icon to slice open the heart and reveal the internal valves.', verify: (s) => s.cut.on },
      { step: 5, title: 'Observe Blood Flow', instruction: 'Notice the rhythmic pulsing light particles flowing from the ventricles into the Aorta.', verify: (s) => s.flow > 0.4 },
      { step: 6, title: 'Consult Holo Tutor', instruction: 'Click "Ask AI" in the component panel to learn why the left wall is thicker.', verify: (s) => s.aiAsked },
      { step: 7, title: 'Test Mastery', instruction: 'Click the 🎓 icon or press "Q" to complete the Holo Quiz.', verify: (s) => s.quiz && s.quiz.done },
    ],
    componentData: {
      'Left ventricle': {
        function: 'Pumps oxygenated blood under high pressure into the aorta and systemic circulation.',
        keyFact: 'Its muscular wall is ~3 times thicker than the right ventricle to overcome systemic vascular resistance.',
        learningObjective: 'Understand hydrostatic pressure differences between systemic and pulmonary circuits.',
        clinicalSignificance: 'Left ventricular hypertrophy (LVH) occurs in response to chronic hypertension.',
        difficulty: 'Intermediate',
        suggestedPrompts: [
          'Why is the left ventricle wall thicker than the right ventricle?',
          'What happens during left ventricular systole?',
          'How does the aortic valve coordinate with this chamber?',
        ],
      },
      'Right ventricle': {
        function: 'Receives deoxygenated blood from the right atrium and pumps it through the pulmonary valve into the lungs.',
        keyFact: 'Operates at a significantly lower systolic pressure (~25 mmHg vs ~120 mmHg in the left ventricle).',
        learningObjective: 'Differentiate low-pressure pulmonary circulation from systemic circulation.',
        difficulty: 'Intermediate',
      },
      'Aorta': {
        function: 'The primary systemic arterial conduit delivering oxygen-rich blood to all organs and limbs.',
        keyFact: 'Features an elastic recoil (Windkessel effect) that maintains continuous capillary blood flow during diastole.',
        learningObjective: 'Examine arterial elasticity and pressure dampening.',
        difficulty: 'Beginner',
      },
      'Pulmonary artery': {
        function: 'Transports deoxygenated venous blood from the right ventricle to pulmonary capillaries for oxygenation.',
        keyFact: 'The only postnatal human artery that transports deoxygenated blood.',
        learningObjective: 'Understand pulmonary gas exchange vascular anatomy.',
        difficulty: 'Intermediate',
      },
      'Left atrium': {
        function: 'Receives oxygen-rich blood returning from the pulmonary veins and loads the left ventricle.',
        keyFact: 'Supplies 20–30% of ventricular filling volume through the atrial kick.',
        learningObjective: 'Identify pulmonary venous drainage.',
        difficulty: 'Beginner',
      },
      'Right atrium': {
        function: 'Collects systemic deoxygenated blood from superior and inferior venae cavae.',
        keyFact: 'Houses the Sinoatrial (SA) node—the natural electrical pacemaker of the heart.',
        learningObjective: 'Explore cardiac pacemaker conduction origins.',
        difficulty: 'Intermediate',
      },
      'Heart valves': {
        function: 'Four passive fibrous cusps (mitral, tricuspid, aortic, pulmonary) enforcing unidirectional blood flow.',
        keyFact: 'Open and close purely due to fluid pressure gradients without active muscle contraction.',
        learningObjective: 'Master valvular hemodynamics.',
        difficulty: 'Intermediate',
      },
      'Coronary arteries': {
        function: 'Deliver oxygenated blood directly into the myocardium muscle tissue.',
        keyFact: 'Fill predominantly during ventricular diastole (relaxation) when myocardial compression drops.',
        learningObjective: 'Understand myocardial perfusion dynamics.',
        difficulty: 'Advanced',
      },
    },
  },

  'Human Brain': {
    category: 'Anatomy',
    difficulty: 'Advanced',
    tagline: 'The Master Neural Architect of Consciousness and Thought',
    overview: 'Containing approximately 86 billion neurons and 100 trillion synaptic connections, the brain processes perception, memory, emotion, and somatic regulation.',
    objectives: [
      'Locate and differentiate the 4 cerebral lobes.',
      'Identify the limbic circuitry (Hippocampus & Amygdala) responsible for memory consolidation.',
      'Understand the motor coordination mechanisms of the Cerebellum.',
      'Explore autonomic regulation within the Brainstem.',
    ],
    simulation: 'Neural network pulse conduction across cerebral sulci and gyri.',
    guidedLesson: [
      { step: 1, title: 'Form the Brain', instruction: 'Snap fingers 🫰 or press Space, then make a fist ✊ to form the brain.', verify: (s) => s.state === 'formed' },
      { step: 2, title: 'Explore Frontal Lobe', instruction: 'Point at the Frontal Lobe to inspect cognitive executive function.', targetPart: 'Frontal lobe', verify: (s) => s.selected === 'Frontal lobe' },
      { step: 3, title: 'Separate Hemispheres', instruction: 'Open your hand ✋ slowly or press "E" to separate the lobes in exploded view.', verify: (s) => s.explode > 0.5 },
      { step: 4, title: 'Find Hippocampus', instruction: 'Locate the Hippocampus nestled deep within the medial temporal structure.', targetPart: 'Hippocampus', verify: (s) => s.selected === 'Hippocampus' },
      { step: 5, title: 'Ask Holo Tutor', instruction: 'Ask Holo Tutor how long-term potentiation forms memories.', verify: (s) => s.aiAsked },
    ],
    componentData: {
      'Frontal lobe': {
        function: 'Executive decision-making, working memory, emotional regulation, and voluntary motor output.',
        keyFact: 'Houses the primary motor cortex and Broca’s area for speech production.',
        learningObjective: 'Understand executive prefrontal cortex dynamics.',
        difficulty: 'Intermediate',
      },
      'Hippocampus': {
        function: 'Critical for the consolidation of episodic memory from short-term into neocortical long-term storage.',
        keyFact: 'One of the few regions in the adult mammalian brain capable of neurogenesis (generating new neurons).',
        learningObjective: 'Master memory consolidation anatomy.',
        difficulty: 'Advanced',
      },
      'Cerebellum': {
        function: 'Fine-tunes motor coordination, equilibrium, postural balance, and procedural motor memory.',
        keyFact: 'Contains more than 50% of the entire brain’s neurons packed into only 10% of total brain volume.',
        learningObjective: 'Analyze motor error correction circuitry.',
        difficulty: 'Intermediate',
      },
      'Brainstem': {
        function: 'Regulates primitive autonomic survival functions including breathing rate, cardiac rhythm, and blood pressure.',
        keyFact: 'The gateway through which all ascending sensory and descending motor pathways pass.',
        learningObjective: 'Understand central vegetative autonomic pathways.',
        difficulty: 'Beginner',
      },
    },
  },

  'Kidney': {
    category: 'Anatomy',
    difficulty: 'Intermediate',
    tagline: 'Precision Filtration & Metabolic Homeostasis',
    overview: 'The kidneys extract nitrogenous wastes, regulate blood electrolyte concentrations, balance systemic pH, and govern arterial blood pressure via the renin-angiotensin-aldosterone system.',
    objectives: [
      'Differentiate the renal cortex from the medullary pyramids.',
      'Trace fluid passage from glomerulus through the nephron loop of Henle.',
      'Understand how the renal pelvis funnels urine into the ureter.',
    ],
    simulation: 'Continuous plasma filtration visualizer with medullary ray concentration.',
  },

  'DNA Double Helix': {
    category: 'Biology',
    difficulty: 'Beginner',
    tagline: 'The Molecular Code of All Known Terrestrial Life',
    overview: 'Deoxyribonucleic acid is a double-stranded, helical polymer made of repeating nucleotide subunits: Adenine, Thymine, Guanine, and Cytosine.',
    objectives: [
      'Identify Watson-Crick complementary base pairing rules (A-T, G-C).',
      'Explain the antiparallel 5-prime to 3-prime strand orientation.',
      'Analyze the structural significance of the major and minor grooves.',
    ],
    simulation: 'Molecular vibration with dynamic base pair bonding highlight.',
  },

  'Animal Cell': {
    category: 'Biology',
    difficulty: 'Beginner',
    tagline: 'The Fundamental Eukaryotic Unit of Living Organisms',
    overview: 'A membrane-enclosed microscopic metropolis where specialized organelles coordinate genetic transcription, protein synthesis, and metabolic energy production.',
    objectives: [
      'Distinguish the nucleus, mitochondria, endoplasmic reticulum, and Golgi apparatus.',
      'Understand oxidative phosphorylation in mitochondria producing cellular ATP.',
    ],
    simulation: 'Intracellular organelle cytoplasmic streaming.',
  },

  'Inline-4 Engine': {
    category: 'Engineering',
    difficulty: 'Intermediate',
    tagline: 'The Modern Industrial Four-Stroke Powertrain',
    overview: 'The most common modern automotive powertrain architecture, converting chemical fuel energy into rotary kinetic energy across four sequenced cylinders.',
    objectives: [
      'Master the 4 strokes of the Otto cycle: Intake, Compression, Power, Exhaust.',
      'Understand how the slider-crank mechanism transforms reciprocating piston velocity to crankshaft torque.',
      'Inspect dual overhead camshaft (DOHC) valve synchronization.',
    ],
    simulation: 'Four-cylinder firing order cycle (1-3-4-2) with reciprocating pistons.',
  },

  'Turbofan Jet Engine': {
    category: 'Engineering',
    difficulty: 'Advanced',
    tagline: 'High-Bypass Propulsion and the Thermodynamic Brayton Cycle',
    overview: 'Powering commercial global aviation, high-bypass turbofans accelerate a massive column of bypass air around a high-pressure core to achieve extraordinary fuel efficiency.',
    objectives: [
      'Trace airflow through fan blades, low/high-pressure compressors, combustor, and turbines.',
      'Explain the bypass ratio and why high-bypass designs produce quieter, more efficient thrust.',
    ],
    simulation: 'High-speed particle airflow acceleration through compression stages and exhaust nozzle.',
  },

  'Saturn V Rocket': {
    category: 'Vehicles',
    difficulty: 'Intermediate',
    tagline: 'The Colossal Heavy-Lift Booster of Lunar Exploration',
    overview: 'Standing 111 meters tall and weighing 2.8 million kilograms at launch, the Saturn V generated 34.5 million Newtons of sea-level thrust to deliver astronauts to the Moon.',
    objectives: [
      'Analyze the multi-stage architecture (S-IC, S-II, S-IVB).',
      'Understand cryogenic liquid oxygen (LOX) and liquid hydrogen (LH2) propellant dynamics.',
    ],
    simulation: 'Multi-stage separation and high-velocity propellant particle exhaust plume.',
  },

  'Mechanical Watch': {
    category: 'Machines',
    difficulty: 'Intermediate',
    tagline: 'Micro-Mechanical Mastery of Mechanical Timekeeping',
    overview: 'A battery-free precision instrument that measures the flow of time through a wound mainspring, a multiplying gear train, and a Swiss lever escapement oscillating at 28,800 vibrations per hour.',
    objectives: [
      'Understand energy release from the mainspring barrel.',
      'Analyze the role of the escapement pallet fork and hairspring balance wheel in dividing time into discrete beats.',
    ],
    simulation: 'Continuous gear train meshing and balance wheel tick oscillation.',
  },

  'Eiffel Tower': {
    category: 'Landmarks',
    difficulty: 'Beginner',
    tagline: 'Wrought-Iron Puddle Lattice Civil Engineering Masterpiece',
    overview: 'Engineered by Gustave Eiffel for the 1889 Exposition Universelle, this 330-meter monument pioneered wrought-iron truss construction engineered specifically to counteract extreme wind shear.',
    objectives: [
      'Analyze how the curved four-pillar lattice foundation dissipates dynamic aerodynamic drag.',
      'Explore thermal expansion variations and 19th-century metallurgical engineering.',
    ],
    simulation: 'Structural load vector distribution through pylons and arches.',
  },
};

/**
 * Return educational metadata for a given model name.
 */
export function getEducationData(modelName) {
  if (EDUCATION_REGISTRY[modelName]) return EDUCATION_REGISTRY[modelName];

  // Default fallback for any unlisted model
  return {
    category: 'Science',
    difficulty: 'Intermediate',
    tagline: 'Interactive 3D Science & Engineering Model',
    overview: `${modelName} rendered as an interactive particle hologram in the HoloLab.`,
    objectives: [
      'Explore components and spatial proportions in 3D.',
      'Inspect internal structural arrangements in exploded view.',
      'Observe simulated particle dynamics in real-time.',
    ],
    simulation: 'Interactive GPU particle field with adaptive lighting.',
  };
}

/**
 * Get detailed component explanation, function, and learning objective.
 */
export function getComponentData(modelName, componentName) {
  const model = EDUCATION_REGISTRY[modelName];
  if (model?.componentData?.[componentName]) {
    return model.componentData[componentName];
  }
  return {
    function: 'Integral functional component within the model assembly.',
    keyFact: 'Contributes to overall structural integrity and dynamic function.',
    learningObjective: `Understand the position and mechanical role of the ${componentName}.`,
    difficulty: model?.difficulty || 'Intermediate',
  };
}
