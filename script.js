'use strict';

/* =========================================================
   DONNÉES DU JEU
   ========================================================= */

const AVATARS = [
  { id: 'cat',   emoji: '🐱', name: 'Chat' },
  { id: 'fox',   emoji: '🦊', name: 'Renard' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'lion',  emoji: '🦁', name: 'Lion' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon des fractions', unlockXP: 600 },
];

const LEVELS = [
  { name: 'Débutant',          emoji: '🌱', minXP: 0 },
  { name: 'Apprenti',          emoji: '⭐', minXP: 100 },
  { name: 'Champion',          emoji: '🚀', minXP: 300 },
  { name: 'Roi des fractions', emoji: '👑', minXP: 600 },
];

const TOPICS = [
  { id: 'compare1',   emoji: '1️⃣', title: 'Comparer à 1' },
  { id: 'samedenom',  emoji: '2️⃣', title: 'Même dénominateur' },
  { id: 'samenum',    emoji: '3️⃣', title: 'Même numérateur' },
  { id: 'equivalent', emoji: '4️⃣', title: 'Fractions équivalentes' },
  { id: 'decompose',  emoji: '5️⃣', title: 'Décomposer une fraction' },
];

const BADGES = [
  { id: 'ten-correct',     emoji: '🏅', name: '10 réponses justes',
    test: s => s.totalCorrect >= 10 },
  { id: 'denom-champion',  emoji: '🏅', name: 'Champion du dénominateur',
    test: s => masteryPercent(s, 'samedenom') >= 100 },
  { id: 'pizza-king',      emoji: '🏅', name: 'Roi des pizzas',
    test: s => s.totalCorrect >= 50 },
  { id: 'equiv-expert',    emoji: '🏅', name: 'Expert des fractions équivalentes',
    test: s => masteryPercent(s, 'equivalent') >= 100 },
];

const VISUAL_THEMES = [
  { filled: '🍕', empty: '⬜' },
  { filled: '🟩', empty: '⬜' },
  { filled: '🍪', empty: '⬜' },
  { filled: '🍫', empty: '⬜' },
];

const NUM_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept',
                   'huit', 'neuf', 'dix', 'onze', 'douze'];
const DENOM_WORDS = {
  2: ['demi', 'demis'], 3: ['tiers', 'tiers'], 4: ['quart', 'quarts'],
  5: ['cinquième', 'cinquièmes'], 6: ['sixième', 'sixièmes'],
  7: ['septième', 'septièmes'], 8: ['huitième', 'huitièmes'],
  9: ['neuvième', 'neuvièmes'], 10: ['dixième', 'dixièmes'],
  11: ['onzième', 'onzièmes'], 12: ['douzième', 'douzièmes'],
};

/* =========================================================
   ÉTAT DU JOUEUR (sauvegardé dans localStorage)
   ========================================================= */

const STORAGE_KEY = 'superFractionsCE2';

function defaultState() {
  const progress = {};
  TOPICS.forEach(t => { progress[t.id] = { correct: 0, total: 0 }; });
  return {
    avatar: null,
    xp: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    progress,
    unlockedBadges: [],
    voiceEnabled: true,
    levelIndex: 0,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw);
    const fresh = defaultState();
    return Object.assign(fresh, saved, {
      progress: Object.assign(fresh.progress, saved.progress || {}),
    });
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function masteryPercent(s, topicId) {
  const p = s.progress[topicId];
  if (!p) return 0;
  return Math.min(100, p.correct * 10);
}

function levelForXP(xp) {
  let idx = 0;
  LEVELS.forEach((lvl, i) => { if (xp >= lvl.minXP) idx = i; });
  return idx;
}

/* =========================================================
   OUTILS : nombres et phrases en français
   ========================================================= */

function denomWord(den, plural) {
  const w = DENOM_WORDS[den] || [den + 'ième', den + 'ièmes'];
  return plural ? w[1] : w[0];
}

function fractionToWords(num, den) {
  const numWord = NUM_WORDS[num] !== undefined ? NUM_WORDS[num] : String(num);
  return `${numWord} ${denomWord(den, num > 1)}`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

/* =========================================================
   SYNTHÈSE VOCALE (Web Speech API)
   ========================================================= */

function speak(text) {
  if (!state.voiceEnabled) return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'fr-FR';
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

/* =========================================================
   VISUELS (pizzas / carrés en emojis)
   ========================================================= */

function renderFractionRow(container, num, den, theme) {
  container.innerHTML = '';
  container.classList.add('visual-row');
  for (let i = 0; i < den; i++) {
    const span = document.createElement('span');
    span.className = 'visual-cell';
    span.textContent = i < num ? theme.filled : theme.empty;
    span.style.animationDelay = (i * 70) + 'ms';
    container.appendChild(span);
  }
}

function renderFractionStack(container, fractions, theme) {
  // fractions: [{label, num, den}, ...]
  container.innerHTML = '';
  fractions.forEach(f => {
    const line = document.createElement('div');
    line.className = 'visual-line';
    if (f.label) {
      const label = document.createElement('span');
      label.className = 'visual-label';
      label.textContent = f.label;
      line.appendChild(label);
    }
    const row = document.createElement('span');
    renderFractionRow(row, f.num, f.den, theme);
    row.style.margin = '0';
    line.appendChild(row);
    container.appendChild(line);
  });
}

/* =========================================================
   GÉNÉRATEUR DE QUESTIONS (un générateur infini par notion)
   ========================================================= */

function genCompare1() {
  const den = randInt(2, 12);
  let num;
  const r = Math.random();
  if (r < 0.3) num = den;                       // cas d'égalité
  else if (r < 0.65) num = randInt(1, den - 1);  // < 1
  else num = randInt(den + 1, den + 4);          // > 1

  const correct = num < den ? '<' : (num > den ? '>' : '=');
  const theme = pick(VISUAL_THEMES);

  let explanation;
  if (correct === '<') {
    explanation = `${num} est plus petit que ${den}, donc ${num}/${den} est plus petit que 1.`;
  } else if (correct === '>') {
    explanation = `${num} est plus grand que ${den}, donc ${num}/${den} est plus grand que 1.`;
  } else {
    explanation = `Le numérateur et le dénominateur sont égaux (${num}), donc ${num}/${den} est égal à 1.`;
  }

  return {
    text: 'Compare :',
    fractionDisplay: `${num}/${den}  □  1`,
    visual: { type: 'single', num, den, theme },
    options: ['<', '=', '>'].map(v => ({ label: v, value: v })),
    correct,
    explanation,
    speech: `Compare ${fractionToWords(num, den)} et un.`,
  };
}

function genSameDenom() {
  const den = randInt(3, 12);
  let num1 = randInt(1, den);
  let num2 = randInt(1, den);
  while (num2 === num1) num2 = randInt(1, den);

  const correct = num1 < num2 ? '<' : (num1 > num2 ? '>' : '=');
  const theme = pick(VISUAL_THEMES);

  const explanation = `Le dénominateur est le même (${den}). On compare les numérateurs : ` +
    `${num1} ${correct} ${num2}, donc ${num1}/${den} ${correct} ${num2}/${den}.`;

  return {
    text: 'Compare :',
    fractionDisplay: `${num1}/${den}  □  ${num2}/${den}`,
    visual: {
      type: 'stack',
      theme,
      fractions: [
        { label: `${num1}/${den}`, num: num1, den },
        { label: `${num2}/${den}`, num: num2, den },
      ],
    },
    options: ['<', '=', '>'].map(v => ({ label: v, value: v })),
    correct,
    explanation,
    speech: `Compare ${fractionToWords(num1, den)} et ${fractionToWords(num2, den)}.`,
  };
}

function genSameNum() {
  const num = randInt(1, 6);
  let den1 = randInt(num + 1, 12);
  let den2 = randInt(num + 1, 12);
  while (den2 === den1) den2 = randInt(num + 1, 12);

  // Plus le dénominateur est petit, plus la fraction est grande.
  const correct = den1 < den2 ? '>' : (den1 > den2 ? '<' : '=');
  const theme = pick(VISUAL_THEMES);

  const explanation = `Le numérateur est le même (${num}). Plus le dénominateur est grand, ` +
    `plus les parts sont petites. Donc ${num}/${den1} ${correct} ${num}/${den2}.`;

  return {
    text: 'Compare :',
    fractionDisplay: `${num}/${den1}  □  ${num}/${den2}`,
    visual: {
      type: 'stack',
      theme,
      fractions: [
        { label: `${num}/${den1}`, num, den: den1 },
        { label: `${num}/${den2}`, num, den: den2 },
      ],
    },
    options: ['<', '=', '>'].map(v => ({ label: v, value: v })),
    correct,
    explanation,
    speech: `Compare ${fractionToWords(num, den1)} et ${fractionToWords(num, den2)}.`,
  };
}

function genEquivalent() {
  // fractions de base simples (forme irréductible)
  const bases = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 6], [5, 6]];
  const [bn, bd] = pick(bases);
  const k = randInt(2, 4);
  const correctFrac = `${bn * k}/${bd * k}`;
  const theme = pick(VISUAL_THEMES);

  // distracteurs : fractions proches mais non équivalentes
  const distractors = new Set();
  while (distractors.size < 2) {
    const dk = randInt(2, 5);
    let dn = bn * dk + pick([-1, 1, 2]);
    let dd = bd * dk;
    if (dn <= 0 || dn >= dd) continue;
    if (dn / dd === bn / bd) continue;
    const candidate = `${dn}/${dd}`;
    if (candidate !== correctFrac) distractors.add(candidate);
  }

  const options = shuffle([correctFrac, ...distractors]).map(v => ({ label: v, value: v }));

  const explanation = `${correctFrac} = ${bn}/${bd} car on a multiplié le numérateur ` +
    `et le dénominateur par ${k}.`;

  return {
    text: 'Trouve la fraction équivalente :',
    fractionDisplay: `${bn}/${bd} = ?`,
    visual: { type: 'single', num: bn, den: bd, theme },
    options,
    correct: correctFrac,
    explanation,
    speech: `Trouve une fraction équivalente à ${fractionToWords(bn, bd)}.`,
  };
}

function genDecompose() {
  const den = randInt(3, 8);
  const num = randInt(2, den - 1);
  const theme = pick(VISUAL_THEMES);

  const correct = `1/${den}`;
  const repeated = Array(num - 1).fill(`1/${den}`).join(' + ');

  // distracteurs : unités d'autres dénominateurs plausibles
  const distractorDens = new Set();
  while (distractorDens.size < 2) {
    const d = randInt(2, 9);
    if (d !== den) distractorDens.add(d);
  }
  const options = shuffle([correct, ...[...distractorDens].map(d => `1/${d}`)])
    .map(v => ({ label: v, value: v }));

  const explanation = `${num}/${den} est composé de ${num} parts de 1/${den}. ` +
    `Donc ${num}/${den} = ${repeated} + 1/${den}.`;

  return {
    text: `Complète la décomposition :`,
    fractionDisplay: `${num}/${den} = ${repeated} + ?`,
    visual: { type: 'single', num, den, theme },
    options,
    correct,
    explanation,
    speech: `Décompose la fraction ${fractionToWords(num, den)}.`,
  };
}

const GENERATORS = {
  compare1: genCompare1,
  samedenom: genSameDenom,
  samenum: genSameNum,
  equivalent: genEquivalent,
  decompose: genDecompose,
};

function generateQuestion(topicId) {
  return GENERATORS[topicId]();
}

/* =========================================================
   LEÇONS (contenu pédagogique fixe et illustré)
   ========================================================= */

function buildLessons() {
  return [
    {
      id: 'compare1',
      title: '1️⃣ Comparer une fraction à 1',
      num: 3, den: 8,
      fraction: '3/8',
      text: 'Trois parts sur huit sont colorées. Le numérateur (3) est plus petit que ' +
            'le dénominateur (8). La fraction 3/8 est donc plus petite que 1, comme une pizza ' +
            'à laquelle il manque des parts.',
      speech: 'Trois parts sur huit sont colorées. Trois huitièmes est plus petit que un.',
    },
    {
      id: 'samedenom',
      title: '2️⃣ Comparer des fractions de même dénominateur',
      num: 5, den: 8,
      fraction: '3/8 et 5/8',
      text: 'Quand deux fractions ont le même dénominateur, les parts sont de la même taille. ' +
            'Il suffit alors de comparer les numérateurs : 3 est plus petit que 5, ' +
            'donc 3/8 est plus petit que 5/8.',
      speech: 'Pour comparer trois huitièmes et cinq huitièmes, on compare juste les numérateurs trois et cinq.',
    },
    {
      id: 'samenum',
      title: '3️⃣ Comparer des fractions de même numérateur',
      num: 3, den: 5,
      fraction: '3/5 et 3/8',
      text: 'Quand deux fractions ont le même numérateur, attention : plus le dénominateur ' +
            'est grand, plus les parts sont petites ! 3/5 a des parts plus grandes que 3/8. ' +
            'Donc 3/5 est plus grand que 3/8.',
      speech: 'Avec le même numérateur, plus le dénominateur est grand, plus les parts sont petites.',
    },
    {
      id: 'equivalent',
      title: '4️⃣ Les fractions équivalentes',
      num: 2, den: 4,
      fraction: '1/2 = 2/4',
      text: 'Deux fractions sont équivalentes si elles représentent la même quantité. ' +
            '1/2 et 2/4 colorient la même surface : on a juste multiplié le numérateur et ' +
            'le dénominateur par le même nombre (ici 2).',
      speech: 'Un demi est équivalent à deux quarts : on multiplie le numérateur et le dénominateur par deux.',
    },
    {
      id: 'decompose',
      title: '5️⃣ Décomposer une fraction',
      num: 3, den: 4,
      fraction: '3/4 = 1/4 + 1/4 + 1/4',
      text: 'Une fraction peut se décomposer en somme de fractions plus simples. ' +
            '3/4, c\'est trois parts de 1/4 : 3/4 = 1/4 + 1/4 + 1/4.',
      speech: 'Trois quarts, c\'est un quart, plus un quart, plus un quart.',
    },
  ];
}

const LESSONS = buildLessons();

/* =========================================================
   GESTION DES ÉCRANS
   ========================================================= */

const screens = {};
document.querySelectorAll('.screen').forEach(el => { screens[el.id] = el; });

function showScreen(id) {
  Object.values(screens).forEach(el => el.classList.remove('active'));
  screens[id].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-target]').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.target));
});

/* =========================================================
   ÉCRAN D'ACCUEIL : sélection de l'avatar
   ========================================================= */

const avatarListEl = document.getElementById('avatar-list');
const btnStart = document.getElementById('btn-start');
const currentLevelNameEl = document.getElementById('current-level-name');

function isAvatarUnlocked(avatar) {
  return !avatar.unlockXP || state.xp >= avatar.unlockXP;
}

function renderAvatarSelect() {
  avatarListEl.innerHTML = '';
  AVATARS.forEach(avatar => {
    const unlocked = isAvatarUnlocked(avatar);
    const card = document.createElement('div');
    card.className = 'avatar-card' + (avatar.id === state.avatar ? ' selected' : '') +
                     (unlocked ? '' : ' locked');
    card.innerHTML = `<span class="emoji">${avatar.emoji}</span><span class="name">${avatar.name}</span>` +
      (unlocked ? '' : `<span class="lock-info">🔒 ${avatar.unlockXP} XP requis</span>`);
    if (unlocked) {
      card.addEventListener('click', () => {
        state.avatar = avatar.id;
        saveState();
        renderAvatarSelect();
        btnStart.disabled = false;
      });
    }
    avatarListEl.appendChild(card);
  });

  const lvl = LEVELS[levelForXP(state.xp)];
  currentLevelNameEl.textContent = `${lvl.emoji} ${lvl.name}`;
  btnStart.disabled = !state.avatar;
}

btnStart.addEventListener('click', () => {
  showScreen('screen-menu');
  renderMenu();
});

document.getElementById('btn-change-avatar').addEventListener('click', () => {
  showScreen('screen-home');
  renderAvatarSelect();
});

/* =========================================================
   MENU PRINCIPAL
   ========================================================= */

const playerAvatarEl = document.getElementById('player-avatar');
const playerXPEl = document.getElementById('player-xp');
const btnVoiceToggle = document.getElementById('btn-voice-toggle');

function renderMenu() {
  const avatar = AVATARS.find(a => a.id === state.avatar) || AVATARS[0];
  const lvl = LEVELS[levelForXP(state.xp)];
  playerAvatarEl.textContent = `${avatar.emoji} ${avatar.name}`;
  playerXPEl.textContent = `${lvl.emoji} ${lvl.name} · ${state.xp} XP`;
  btnVoiceToggle.textContent = state.voiceEnabled ? '🔊' : '🔇';
}

btnVoiceToggle.addEventListener('click', () => {
  state.voiceEnabled = !state.voiceEnabled;
  saveState();
  renderMenu();
  if (state.voiceEnabled) speak('Voix activée.');
});

/* =========================================================
   LEÇONS
   ========================================================= */

const lessonListEl = document.getElementById('lesson-list');
const lessonTitleEl = document.getElementById('lesson-title');
const lessonFractionEl = document.getElementById('lesson-fraction');
const lessonVisualEl = document.getElementById('lesson-visual');
const lessonTextEl = document.getElementById('lesson-text');
const btnLessonSpeak = document.getElementById('btn-lesson-speak');
const btnLessonNext = document.getElementById('btn-lesson-next');

let currentLessonIndex = 0;

function renderLessonList() {
  lessonListEl.innerHTML = '';
  LESSONS.forEach((lesson, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<span class="badge-num">${lesson.title.split(' ')[0]}</span>` +
      `<span class="item-info"><span class="item-title">${lesson.title.replace(/^\S+\s/, '')}</span>` +
      `<span class="item-progress">Fraction : ${lesson.fraction}</span></span>`;
    item.addEventListener('click', () => openLesson(idx));
    lessonListEl.appendChild(item);
  });
}

function openLesson(idx) {
  currentLessonIndex = idx;
  const lesson = LESSONS[idx];
  lessonTitleEl.textContent = lesson.title;
  lessonFractionEl.textContent = lesson.fraction;
  lessonTextEl.textContent = lesson.text;
  renderFractionRow(lessonVisualEl, lesson.num, lesson.den, pick(VISUAL_THEMES));
  btnLessonNext.textContent = idx < LESSONS.length - 1 ? 'Suivant ➜' : '⬅ Retour à la liste';
  showScreen('screen-lesson-detail');
  speak(lesson.speech);
}

btnLessonSpeak.addEventListener('click', () => speak(LESSONS[currentLessonIndex].speech));

btnLessonNext.addEventListener('click', () => {
  if (currentLessonIndex < LESSONS.length - 1) {
    openLesson(currentLessonIndex + 1);
  } else {
    showScreen('screen-lessons');
  }
});

/* =========================================================
   SÉLECTION DE LA NOTION (mode entraînement)
   ========================================================= */

const gameTopicListEl = document.getElementById('game-topic-list');

function renderTopicList() {
  gameTopicListEl.innerHTML = '';
  TOPICS.forEach(topic => {
    const pct = masteryPercent(state, topic.id);
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<span class="badge-num">${topic.emoji}</span>` +
      `<span class="item-info"><span class="item-title">${topic.title}</span>` +
      `<span class="item-progress">Maîtrise : ${pct}%</span></span>`;
    item.addEventListener('click', () => startTraining(topic.id));
    gameTopicListEl.appendChild(item);
  });
}

/* =========================================================
   MODE ENTRAÎNEMENT
   ========================================================= */

const gameTopicNameEl = document.getElementById('game-topic-name');
const gameScoreEl = document.getElementById('game-score');
const gameQuestionEl = document.getElementById('game-question');
const gameVisualEl = document.getElementById('game-visual');
const gameFractionDisplayEl = document.getElementById('game-fraction-display');
const gameAnswersEl = document.getElementById('game-answers');
const gameFeedbackEl = document.getElementById('game-feedback');
const feedbackTitleEl = document.getElementById('feedback-title');
const feedbackExplanationEl = document.getElementById('feedback-explanation');
const btnNextQuestion = document.getElementById('btn-next-question');

let trainingState = null; // { topicId, sessionScore, question }

function startTraining(topicId) {
  trainingState = { topicId, sessionScore: 0 };
  const topic = TOPICS.find(t => t.id === topicId);
  gameTopicNameEl.textContent = `${topic.emoji} ${topic.title}`;
  showScreen('screen-game');
  nextTrainingQuestion();
}

function renderQuestionVisual(visualEl, fractionEl, q) {
  fractionEl.textContent = q.fractionDisplay;
  visualEl.innerHTML = '';
  if (q.visual.type === 'single') {
    renderFractionRow(visualEl, q.visual.num, q.visual.den, q.visual.theme);
  } else if (q.visual.type === 'stack') {
    renderFractionStack(visualEl, q.visual.fractions, q.visual.theme);
  }
}

function nextTrainingQuestion() {
  gameFeedbackEl.classList.add('hidden');
  gameScoreEl.textContent = `⭐ ${trainingState.sessionScore}`;

  const q = generateQuestion(trainingState.topicId);
  trainingState.question = q;

  gameQuestionEl.textContent = q.text;
  renderQuestionVisual(gameVisualEl, gameFractionDisplayEl, q);

  gameAnswersEl.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => submitTrainingAnswer(opt.value, btn));
    gameAnswersEl.appendChild(btn);
  });

  speak(q.speech);
}

function submitTrainingAnswer(value, btnEl) {
  const q = trainingState.question;
  const correct = value === q.correct;

  // désactive tous les boutons et colore la bonne / la mauvaise réponse
  Array.from(gameAnswersEl.children).forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.correct) btn.classList.add('correct');
    else if (btn === btnEl && !correct) btn.classList.add('wrong');
  });

  recordAnswer(trainingState.topicId, correct);

  if (correct) {
    trainingState.sessionScore++;
    gameScoreEl.textContent = `⭐ ${trainingState.sessionScore}`;
    feedbackTitleEl.textContent = '🎉 Bravo !';
    feedbackTitleEl.className = 'feedback-title ok';
  } else {
    feedbackTitleEl.textContent = '❌ Pas tout à fait...';
    feedbackTitleEl.className = 'feedback-title ko';
  }
  feedbackExplanationEl.textContent = q.explanation;
  gameFeedbackEl.classList.remove('hidden');

  speak(correct ? 'Bravo ! ' + q.explanation : q.explanation);

  maybeShowVictory();
}

btnNextQuestion.addEventListener('click', nextTrainingQuestion);

/* =========================================================
   SUIVI DES RÉPONSES, XP, NIVEAUX, RÉCOMPENSES
   ========================================================= */

function recordAnswer(topicId, correct) {
  const xpBefore = state.xp;
  const levelBefore = levelForXP(state.xp);

  state.totalAnswered++;
  state.progress[topicId].total++;
  if (correct) {
    state.totalCorrect++;
    state.progress[topicId].correct++;
    state.xp += 10;
  }

  const newBadges = BADGES.filter(b => !state.unlockedBadges.includes(b.id) && b.test(state));
  newBadges.forEach(b => state.unlockedBadges.push(b.id));

  state.pendingLevelUp = levelForXP(state.xp) > levelBefore;
  state.pendingBadges = newBadges;
  state.pendingXPGain = state.xp - xpBefore;

  saveState();
}

function maybeShowVictory() {
  // Affiche l'écran de victoire toutes les 10 bonnes réponses, ou en cas de montée de niveau / badge
  const milestone = state.totalCorrect > 0 && state.totalCorrect % 10 === 0;
  if (milestone || state.pendingLevelUp || (state.pendingBadges && state.pendingBadges.length)) {
    showVictoryOverlay();
  }
}

/* =========================================================
   ÉCRAN DE VICTOIRE
   ========================================================= */

const overlayVictory = document.getElementById('overlay-victory');
const victoryStarsEl = document.getElementById('victory-stars');
const victoryXPEl = document.getElementById('victory-xp');
const victoryUnlockEl = document.getElementById('victory-unlock');
const victoryLevelUpEl = document.getElementById('victory-level-up');
const btnVictoryClose = document.getElementById('btn-victory-close');

function showVictoryOverlay() {
  const stars = Math.min(5, Math.max(1, Math.round(state.totalCorrect / 10)));
  victoryStarsEl.textContent = '⭐'.repeat(stars);
  victoryXPEl.textContent = `+${state.pendingXPGain || 10} XP`;

  if (state.pendingBadges && state.pendingBadges.length) {
    victoryUnlockEl.textContent = '🏅 Nouveau badge débloqué : ' +
      state.pendingBadges.map(b => b.name).join(', ');
    victoryUnlockEl.classList.remove('hidden');
  } else {
    victoryUnlockEl.classList.add('hidden');
  }

  if (state.pendingLevelUp) {
    const lvl = LEVELS[levelForXP(state.xp)];
    victoryLevelUpEl.textContent = `${lvl.emoji} Nouveau niveau débloqué : ${lvl.name} !`;
    victoryLevelUpEl.classList.remove('hidden');
    speak(`Bravo, tu passes au niveau ${lvl.name} !`);
  } else {
    victoryLevelUpEl.classList.add('hidden');
  }

  state.pendingLevelUp = false;
  state.pendingBadges = [];
  overlayVictory.classList.remove('hidden');
}

btnVictoryClose.addEventListener('click', () => {
  overlayVictory.classList.add('hidden');
  renderMenu();
  renderAvatarSelect();
});

/* =========================================================
   DÉFI CHRONO
   ========================================================= */

const challengeIntroEl = document.getElementById('challenge-intro');
const challengeActiveEl = document.getElementById('challenge-active');
const challengeResultEl = document.getElementById('challenge-result');
const btnStartChallenge = document.getElementById('btn-start-challenge');
const btnChallengeAgain = document.getElementById('btn-challenge-again');
const challengeTimerEl = document.getElementById('challenge-timer');
const challengeScoreEl = document.getElementById('challenge-score');
const challengeQuestionEl = document.getElementById('challenge-question');
const challengeVisualEl = document.getElementById('challenge-visual');
const challengeFractionDisplayEl = document.getElementById('challenge-fraction-display');
const challengeAnswersEl = document.getElementById('challenge-answers');
const challengeFinalScoreEl = document.getElementById('challenge-final-score');
const challengeFinalCommentEl = document.getElementById('challenge-final-comment');

let challenge = null; // { score, timeLeft, timerId, question, locked }

function resetChallengeView() {
  challengeIntroEl.classList.remove('hidden');
  challengeActiveEl.classList.add('hidden');
  challengeResultEl.classList.add('hidden');
}
resetChallengeView();

function startChallenge() {
  if (challenge && challenge.timerId) clearInterval(challenge.timerId);
  challenge = { score: 0, timeLeft: 60, locked: false };

  challengeIntroEl.classList.add('hidden');
  challengeResultEl.classList.add('hidden');
  challengeActiveEl.classList.remove('hidden');

  challengeScoreEl.textContent = `✅ ${challenge.score}`;
  challengeTimerEl.textContent = `⏱ ${challenge.timeLeft} s`;

  nextChallengeQuestion();

  challenge.timerId = setInterval(() => {
    challenge.timeLeft--;
    challengeTimerEl.textContent = `⏱ ${challenge.timeLeft} s`;
    if (challenge.timeLeft <= 0) endChallenge();
  }, 1000);
}

function nextChallengeQuestion() {
  const topic = pick(TOPICS);
  const q = generateQuestion(topic.id);
  challenge.question = q;
  challenge.topicId = topic.id;
  challenge.locked = false;

  challengeQuestionEl.textContent = q.text;
  renderQuestionVisual(challengeVisualEl, challengeFractionDisplayEl, q);

  challengeAnswersEl.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => submitChallengeAnswer(opt.value, btn));
    challengeAnswersEl.appendChild(btn);
  });
}

function submitChallengeAnswer(value, btnEl) {
  if (challenge.locked || challenge.timeLeft <= 0) return;
  challenge.locked = true;

  const q = challenge.question;
  const correct = value === q.correct;

  Array.from(challengeAnswersEl.children).forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.correct) btn.classList.add('correct');
    else if (btn === btnEl && !correct) btn.classList.add('wrong');
  });

  recordAnswer(challenge.topicId, correct);
  if (correct) {
    challenge.score++;
    challengeScoreEl.textContent = `✅ ${challenge.score}`;
  }

  setTimeout(() => {
    if (challenge.timeLeft > 0) nextChallengeQuestion();
  }, 700);
}

function endChallenge() {
  clearInterval(challenge.timerId);
  challengeActiveEl.classList.add('hidden');
  challengeResultEl.classList.remove('hidden');

  challengeFinalScoreEl.textContent = `${challenge.score} bonnes réponses`;

  let comment;
  if (challenge.score >= 15) comment = '🌟 Incroyable ! Tu es un champion des fractions !';
  else if (challenge.score >= 8) comment = '👏 Très bien joué, continue comme ça !';
  else comment = '💪 Bon début, entraîne-toi encore pour battre ton record !';
  challengeFinalCommentEl.textContent = comment;

  speak(`Temps écoulé ! Tu as eu ${challenge.score} bonnes réponses. ${comment}`);
  showVictoryOverlay();
}

btnStartChallenge.addEventListener('click', startChallenge);
btnChallengeAgain.addEventListener('click', () => {
  resetChallengeView();
  startChallenge();
});

// Quitter le défi en cours = arrêter le minuteur
document.querySelector('#screen-challenge .btn-back').addEventListener('click', () => {
  if (challenge && challenge.timerId) clearInterval(challenge.timerId);
  resetChallengeView();
});

/* =========================================================
   PROGRÈS ET RÉCOMPENSES
   ========================================================= */

const progressBarsEl = document.getElementById('progress-bars');
const badgeListEl = document.getElementById('badge-list');

function renderProgress() {
  progressBarsEl.innerHTML = '';
  TOPICS.forEach(topic => {
    const pct = masteryPercent(state, topic.id);
    const item = document.createElement('div');
    item.className = 'progress-item';
    item.innerHTML = `<div class="progress-label"><span>${topic.title}</span><span>${pct}%</span></div>` +
      `<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>`;
    progressBarsEl.appendChild(item);
  });

  badgeListEl.innerHTML = '';
  BADGES.forEach(badge => {
    const unlocked = state.unlockedBadges.includes(badge.id);
    const card = document.createElement('div');
    card.className = 'badge-card' + (unlocked ? '' : ' locked');
    card.innerHTML = `<span class="emoji">${badge.emoji}</span><span class="name">${badge.name}</span>`;
    badgeListEl.appendChild(card);
  });
}

/* =========================================================
   NAVIGATION : (re)peindre les écrans à chaque ouverture
   ========================================================= */

document.querySelectorAll('[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target === 'screen-lessons') renderLessonList();
    if (target === 'screen-game-select') renderTopicList();
    if (target === 'screen-progress') renderProgress();
    if (target === 'screen-menu') renderMenu();
    if (target === 'screen-challenge') resetChallengeView();
  });
});

/* =========================================================
   DÉMARRAGE
   ========================================================= */

renderAvatarSelect();
if (state.avatar) {
  showScreen('screen-menu');
  renderMenu();
} else {
  showScreen('screen-home');
}
