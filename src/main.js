import './style.css';
import { animate as animeAnimate, stagger } from 'animejs';

const canvas = document.querySelector('#simulation');
const context = canvas.getContext('2d');
const controls = {
  energy: document.querySelector('#energy'),
  size: document.querySelector('#size-ratio'),
  mass: document.querySelector('#mass-ratio'),
  opacity: document.querySelector('#tracer-opacity'),
};
const outputs = {
  energy: document.querySelector('#energy-value'),
  size: document.querySelector('#size-value'),
  mass: document.querySelector('#mass-value'),
  opacity: document.querySelector('#opacity-value'),
};
const colors = ['#125497', '#a72a22', '#9f501f', '#408000', '#8b8117', '#542437', '#53777a'];
const themeButton = document.querySelector('#theme-button');
const themeLabel = document.querySelector('#theme-label');
const themeIcon = themeButton.querySelector('.theme-icon');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const state = { width: 0, height: 0, energy: 1, sizeRatio: 0.15, massRatio: 0.06, opacity: 0.3, running: true, showPaths: true, lastTime: 0, drag: null };
const smallParticles = [];
const largeParticles = [];
const maxSmall = 270;

function randomNormal() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 2;
}

function makeParticle(x, y, radius, color, mass, small = false) {
  return { x, y, vx: randomNormal() * (small ? 0.65 : 0.12), vy: randomNormal() * (small ? 0.65 : 0.12), radius, color, mass, path: [] };
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  state.width = bounds.width;
  state.height = bounds.height;
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  seedParticles();
}

function seedParticles() {
  const area = state.width * state.height;
  const smallCount = Math.min(maxSmall, Math.max(65, Math.round(area / 1550)));
  const largeCount = Math.max(4, Math.min(10, Math.round(area / 42000)));
  smallParticles.length = 0;
  largeParticles.length = 0;
  const largeRadius = largeRadiusValue();
  const smallRadius = Math.max(2, largeRadius * state.sizeRatio);
  for (let i = 0; i < smallCount; i += 1) {
    smallParticles.push(makeParticle(Math.random() * state.width, Math.random() * state.height, smallRadius, '#8395aa', 1, true));
  }
  for (let i = 0; i < largeCount; i += 1) {
    const angle = (Math.PI * 2 * i) / largeCount;
    const orbit = Math.min(state.width, state.height) * 0.22;
    const x = state.width / 2 + Math.cos(angle) * orbit;
    const y = state.height / 2 + Math.sin(angle) * orbit;
    largeParticles.push(makeParticle(x, y, largeRadius, colors[i % colors.length], 1 / state.massRatio));
  }
}

function largeRadiusValue() {
  return Math.max(12, Math.min(30, Math.min(state.width, state.height) * 0.045));
}

function collide(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minDistance = a.radius + b.radius;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared === 0 || distanceSquared >= minDistance * minDistance) return;
  const distance = Math.sqrt(distanceSquared);
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;
  const totalMass = a.mass + b.mass;
  a.x -= nx * overlap * (b.mass / totalMass);
  a.y -= ny * overlap * (b.mass / totalMass);
  b.x += nx * overlap * (a.mass / totalMass);
  b.y += ny * overlap * (a.mass / totalMass);
  const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relativeVelocity < 0) {
    const impulse = (-2 * relativeVelocity) / (1 / a.mass + 1 / b.mass);
    a.vx -= (impulse * nx) / a.mass;
    a.vy -= (impulse * ny) / a.mass;
    b.vx += (impulse * nx) / b.mass;
    b.vy += (impulse * ny) / b.mass;
  }
}

function keepInBounds(particle) {
  if (particle.x < particle.radius) { particle.x = particle.radius; particle.vx = Math.abs(particle.vx); }
  if (particle.x > state.width - particle.radius) { particle.x = state.width - particle.radius; particle.vx = -Math.abs(particle.vx); }
  if (particle.y < particle.radius) { particle.y = particle.radius; particle.vy = Math.abs(particle.vy); }
  if (particle.y > state.height - particle.radius) { particle.y = state.height - particle.radius; particle.vy = -Math.abs(particle.vy); }
}

function step(delta) {
  const frame = Math.min(delta / 16.67, 2.5);
  for (const particle of smallParticles) {
    particle.x += particle.vx * state.energy * frame;
    particle.y += particle.vy * state.energy * frame;
    keepInBounds(particle);
  }
  for (const particle of largeParticles) {
    particle.x += particle.vx * state.energy * frame;
    particle.y += particle.vy * state.energy * frame;
    keepInBounds(particle);
    for (const small of smallParticles) collide(particle, small);
    particle.path.push({ x: particle.x, y: particle.y });
    if (particle.path.length > 110) particle.path.shift();
  }
}

function draw() {
  context.clearRect(0, 0, state.width, state.height);
  context.save();
  context.globalAlpha = state.opacity;
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--particle-small').trim();
  for (const particle of smallParticles) {
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  if (state.showPaths) {
    for (const particle of largeParticles) {
      if (particle.path.length < 2) continue;
      context.beginPath();
      context.moveTo(particle.path[0].x, particle.path[0].y);
      for (let i = 1; i < particle.path.length; i += 1) context.lineTo(particle.path[i].x, particle.path[i].y);
      context.strokeStyle = particle.color;
      context.globalAlpha = 0.42;
      context.lineWidth = 1.5;
      context.stroke();
    }
    context.globalAlpha = 1;
  }
  for (const particle of largeParticles) {
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fillStyle = particle.color;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--particle-outline').trim();
    context.stroke();
  }
}

function animate(time) {
  const delta = state.lastTime ? time - state.lastTime : 16.67;
  state.lastTime = time;
  if (state.running) step(delta);
  draw();
  requestAnimationFrame(animate);
}

function updateControlOutputs() {
  outputs.energy.value = `${Number(controls.energy.value).toFixed(1).replace('.', ',')}×`;
  outputs.size.value = `${Math.round(state.sizeRatio * 100)}%`;
  outputs.mass.value = `${Math.round(state.massRatio * 100)}%`;
  outputs.opacity.value = `${Math.round(state.opacity * 100)}%`;
}

controls.energy.addEventListener('input', () => {
  const nextEnergy = Number(controls.energy.value);
  const velocityScale = Math.sqrt(nextEnergy / state.energy);
  for (const particle of [...smallParticles, ...largeParticles]) { particle.vx *= velocityScale; particle.vy *= velocityScale; }
  state.energy = nextEnergy;
  updateControlOutputs();
});
controls.size.addEventListener('input', () => {
  state.sizeRatio = Number(controls.size.value);
  const radius = Math.max(2, largeRadiusValue() * state.sizeRatio);
  for (const particle of smallParticles) particle.radius = radius;
  updateControlOutputs();
});
controls.mass.addEventListener('input', () => {
  state.massRatio = Number(controls.mass.value);
  for (const particle of largeParticles) particle.mass = 1 / state.massRatio;
  updateControlOutputs();
});
controls.opacity.addEventListener('input', () => { state.opacity = Number(controls.opacity.value); updateControlOutputs(); });

function setTheme(theme, persist = true) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  themeButton.setAttribute('aria-pressed', String(isDark));
  themeButton.setAttribute('aria-label', `Włącz tryb ${isDark ? 'jasny' : 'ciemny'}`);
  themeLabel.textContent = isDark ? 'Tryb jasny' : 'Tryb ciemny';
  themeIcon.textContent = isDark ? '☀' : '☾';
  themeMeta.content = isDark ? '#101722' : '#f5f7fa';
  if (persist) {
    try { localStorage.setItem('brownian-motion-theme', isDark ? 'dark' : 'light'); } catch { /* Storage may be unavailable in private contexts. */ }
  }
}

const tabs = [...document.querySelectorAll('.nav-tab')];
const panels = [...document.querySelectorAll('[data-panel]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const quizQuestions = [
  {
    level: 'Łatwe',
    question: 'Co zaobserwował Robert Brown w 1827 roku?',
    options: ['Nieustanny, nieregularny ruch ziarenek pyłku w wodzie', 'Świecenie atomów pod mikroskopem', 'Parowanie wody z liści'],
    answer: 0,
    explanation: 'Brown zauważył, że ziarenka pyłku w wodzie poruszają się w sposób ciągły i nieregularny.',
  },
  {
    level: 'Łatwe',
    question: 'Co wprawia zawieszoną cząstkę w ruchy Browna?',
    options: ['Jej własna aktywność życiowa', 'Nierównomierne zderzenia z cząsteczkami płynu', 'Pole magnetyczne Ziemi'],
    answer: 1,
    explanation: 'Widoczna cząstka jest nieustannie i nierównomiernie uderzana przez cząsteczki płynu.',
  },
  {
    level: 'Łatwe',
    question: 'Co oznacza współczynnik dyfuzji D?',
    options: ['Jak szybko cząstki rozprzestrzeniają się w ośrodku', 'Gęstość cząstki', 'Temperaturę wrzenia płynu'],
    answer: 0,
    explanation: 'Współczynnik D opisuje tempo rozprzestrzeniania się cząstek.',
  },
  {
    level: 'Średnie',
    question: 'Jeśli czas ruchu wzrośnie czterokrotnie, jak zmieni się średni kwadrat przesunięcia ⟨x²⟩ = 2Dt?',
    options: ['Wzrośnie dwukrotnie', 'Wzrośnie czterokrotnie', 'Nie zmieni się'],
    answer: 1,
    explanation: 'Przy stałym D średni kwadrat przesunięcia jest proporcjonalny do czasu.',
  },
  {
    level: 'Średnie',
    question: 'Jak wzrost lepkości płynu wpływa na dyfuzję małej kulistej cząstki?',
    options: ['Przyspiesza dyfuzję', 'Nie wpływa na dyfuzję', 'Spowalnia dyfuzję'],
    answer: 2,
    explanation: 'Z równania Stokesa–Einsteina wynika, że D jest odwrotnie proporcjonalne do lepkości η.',
  },
  {
    level: 'Średnie',
    question: 'Dlaczego w dwuwymiarowej symulacji używamy zależności ⟨r²⟩ = 4Dt?',
    options: ['Bo ruch ma składowe w dwóch kierunkach, x i y', 'Bo cząstki mają zawsze cztery atomy', 'Bo czas mierzymy w dwóch jednostkach'],
    answer: 0,
    explanation: 'W 2D każda z dwóch osi wnosi 2Dt, razem daje to 4Dt.',
  },
  {
    level: 'Trudne',
    question: 'W równaniu Stokesa–Einsteina D = kᵦT/(6πηr), co stanie się z D, jeśli promień cząstki podwoi się, a pozostałe wielkości pozostaną stałe?',
    options: ['D podwoi się', 'D zmniejszy się o połowę', 'D pozostanie bez zmian'],
    answer: 1,
    explanation: 'D jest odwrotnie proporcjonalne do promienia r, więc jego podwojenie zmniejsza D o połowę.',
  },
  {
    level: 'Trudne',
    question: 'Dla tej samej temperatury, lepkości i promienia, jak zmieni się D po podwojeniu temperatury bezwzględnej?',
    options: ['D podwoi się', 'D zmniejszy się o połowę', 'D wzrośnie czterokrotnie'],
    answer: 0,
    explanation: 'D jest proporcjonalne do temperatury T, więc jej podwojenie podwaja współczynnik dyfuzji.',
  },
  {
    level: 'Trudne',
    question: 'Co wniósł Jean Perrin do badań nad ruchami Browna?',
    options: ['Odkrył elektron', 'Wykonał pomiary potwierdzające przewidywania Einsteina i dostarczyły dowodów na istnienie atomów', 'Wykazał, że pyłek porusza się, bo jest żywy'],
    answer: 1,
    explanation: 'Pomiary Perrina były zgodne z teorią Einsteina i stały się mocnym potwierdzeniem atomowej budowy materii.',
  },
];

const quizForm = document.querySelector('#quiz-form');
const quizQuestionsContainer = document.querySelector('#quiz-questions');
const quizResult = document.querySelector('#quiz-result');
const quizSubmit = document.querySelector('#quiz-submit');
const quizReset = document.querySelector('#quiz-reset');

function renderQuiz() {
  let previousLevel = '';
  quizQuestionsContainer.innerHTML = quizQuestions.map((item, index) => {
    const levelHeading = item.level !== previousLevel ? `<h3 class="quiz-level">Poziom: ${item.level}</h3>` : '';
    previousLevel = item.level;
    const questionId = `quiz-question-title-${index}`;
    const options = item.options.map((option, optionIndex) => `
      <label class="quiz-option">
        <input type="radio" name="question-${index}" value="${optionIndex}" />
        <span>${option}</span>
      </label>`).join('');
    return `${levelHeading}
      <article class="quiz-question" data-question="${index}" aria-labelledby="${questionId}">
        <h4 class="quiz-question-title" id="${questionId}"><span class="quiz-question-number">${index + 1}.</span> ${item.question}</h4>
        <div class="quiz-options" role="radiogroup" aria-labelledby="${questionId}">${options}</div>
        <p class="quiz-feedback" aria-live="polite"></p>
      </article>`;
  }).join('');
}

quizForm.addEventListener('submit', (event) => {
  event.preventDefault();
  let score = 0;
  let answered = 0;

  quizQuestions.forEach((item, index) => {
    const question = quizQuestionsContainer.querySelector(`[data-question="${index}"]`);
    const selected = quizForm.querySelector(`input[name="question-${index}"]:checked`);
    const feedback = question.querySelector('.quiz-feedback');
    const isCorrect = Number(selected?.value) === item.answer;
    question.classList.toggle('is-correct', isCorrect);
    question.classList.toggle('is-incorrect', Boolean(selected) && !isCorrect);
    feedback.textContent = selected
      ? `${isCorrect ? 'Dobrze!' : 'Nie tym razem.'} ${item.explanation}`
      : `Brak odpowiedzi. ${item.explanation}`;
    if (selected) answered += 1;
    if (isCorrect) score += 1;
    question.querySelectorAll('input').forEach((input) => { input.disabled = true; });
  });

  quizResult.textContent = `Wynik: ${score} z ${quizQuestions.length}. Udzielono odpowiedzi na ${answered} z ${quizQuestions.length} pytań.`;
  quizSubmit.hidden = true;
  quizReset.hidden = false;
});

quizReset.addEventListener('click', () => {
  quizForm.reset();
  quizResult.textContent = '';
  quizQuestionsContainer.querySelectorAll('.quiz-question').forEach((question) => {
    question.classList.remove('is-correct', 'is-incorrect');
    question.querySelector('.quiz-feedback').textContent = '';
    question.querySelectorAll('input').forEach((input) => { input.disabled = false; });
  });
  quizSubmit.hidden = false;
  quizReset.hidden = true;
});

renderQuiz();

function showPage(pageName, animatePage = true) {
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== pageName;
  });
  tabs.forEach((tab) => {
    const isActive = tab.dataset.page === pageName;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  const selectedPanel = panels.find((panel) => panel.dataset.panel === pageName);
  if (pageName === 'simulation') requestAnimationFrame(resize);
  if (animatePage && !reduceMotion && selectedPanel) {
    const animatedItems = selectedPanel.querySelectorAll('.article-hero, .timeline-card, .equation-card, .fact-card, .equation-note, .simulation-card, .controls-card, .page-footer, .quiz-question');
    if (animatedItems.length) {
      animeAnimate(animatedItems, {
        opacity: [0, 1],
        y: [16, 0],
        delay: stagger(55),
        duration: 420,
        ease: 'out(3)',
      });
    }
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showPage(tab.dataset.page));
  tab.addEventListener('keydown', (event) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[nextIndex].focus();
    showPage(tabs[nextIndex].dataset.page);
  });
});

let savedTheme = null;
try { savedTheme = localStorage.getItem('brownian-motion-theme'); } catch { /* Use the default theme when storage is unavailable. */ }
setTheme(savedTheme === 'dark' ? 'dark' : 'light', false);
themeButton.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

document.querySelector('#pause-button').addEventListener('click', (event) => {
  state.running = !state.running;
  event.currentTarget.textContent = state.running ? 'Wstrzymaj' : 'Wznów';
  event.currentTarget.setAttribute('aria-pressed', String(!state.running));
});
document.querySelector('#paths-button').addEventListener('click', (event) => {
  state.showPaths = !state.showPaths;
  event.currentTarget.textContent = state.showPaths ? 'Ukryj ślady' : 'Pokaż ślady';
  event.currentTarget.setAttribute('aria-pressed', String(state.showPaths));
  if (!state.showPaths) largeParticles.forEach((particle) => { particle.path.length = 0; });
});
document.querySelector('#download-button').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'brownian-motion.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

canvas.addEventListener('pointerdown', (event) => {
  const bounds = canvas.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  state.drag = largeParticles.find((particle) => Math.hypot(particle.x - x, particle.y - y) <= particle.radius + 8) || null;
  if (state.drag) canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!state.drag) return;
  const bounds = canvas.getBoundingClientRect();
  state.drag.x = event.clientX - bounds.left;
  state.drag.y = event.clientY - bounds.top;
  state.drag.vx = 0;
  state.drag.vy = 0;
});
canvas.addEventListener('pointerup', () => { state.drag = null; });
canvas.addEventListener('pointercancel', () => { state.drag = null; });
window.addEventListener('resize', resize);

updateControlOutputs();
showPage('history', false);
requestAnimationFrame(animate);
