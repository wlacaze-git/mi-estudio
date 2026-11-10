// Estado de la app + persistencia local (localStorage).
import { seedState } from './seed.js';
import { addDays, diffDays, todayISO } from './dates.js';

const KEY = 'miEstudio.v1';
const REGISTRY_KEY = 'miEstudio.profiles';
const STATE_KEY = (id) => `miEstudio.v1.${id}`;
const listeners = new Set();

let state = null;

function newProfileId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

/**
 * Lista de personas (perfiles) guardadas en este dispositivo.
 * Si venía la versión de un solo perfil, la migra al primero.
 */
export function ensureRegistry() {
  let registry = readJSON(REGISTRY_KEY, null);
  const valid = registry && Array.isArray(registry.profiles) && registry.profiles.length > 0;
  if (!valid) {
    const legacy = readJSON(KEY, null);
    const id = newProfileId();
    const name = String((legacy && legacy.student) || '').trim() || 'Estudiante';
    registry = { profiles: [{ id, name }], active: id };
    if (legacy) localStorage.setItem(STATE_KEY(id), JSON.stringify(legacy));
    writeRegistry(registry);
    if (legacy) localStorage.removeItem(KEY);
  }
  if (!registry.profiles.some((p) => p.id === registry.active)) {
    registry.active = registry.profiles[0].id;
    writeRegistry(registry);
  }
  return registry;
}

export function listProfiles() {
  return ensureRegistry().profiles;
}

export function activeProfileId() {
  return ensureRegistry().active;
}

export function activeProfile() {
  const registry = ensureRegistry();
  return registry.profiles.find((p) => p.id === registry.active) || registry.profiles[0];
}

export function profileNameOf(id) {
  const profile = listProfiles().find((p) => p.id === id);
  return profile ? profile.name : 'Estudiante';
}

/** Datos guardados de una persona (para limpiar sus fotos, por ejemplo). */
export function profileStateOf(id) {
  const raw = readJSON(STATE_KEY(id), null);
  return raw ? migrate(raw) : null;
}

export function switchProfile(id) {
  const registry = ensureRegistry();
  if (!registry.profiles.some((p) => p.id === id)) return null;
  registry.active = id;
  writeRegistry(registry);
  const raw = readJSON(STATE_KEY(id), null);
  state = raw ? migrate(raw) : seedState();
  save();
  notify();
  return activeProfile();
}

export function createProfile(name) {
  const registry = ensureRegistry();
  const clean = String(name || '').trim().slice(0, 40) || 'Estudiante';
  const id = newProfileId();
  registry.profiles.push({ id, name: clean });
  registry.active = id;
  writeRegistry(registry);

  const base = seedState();
  state = {
    ...base,
    student: clean,
    subjects: [],
    exams: [],
    questions: [],
    notes: [],
    attempts: [],
    planDone: {},
    daysStudied: [],
    xp: 0,
    cardsSeen: 0,
    settings: { showDemo: false, onboarded: true },
  };
  save();
  notify();
  return id;
}

export function renameProfile(id, name) {
  const registry = ensureRegistry();
  const profile = registry.profiles.find((p) => p.id === id);
  if (!profile) return;
  profile.name = String(name || '').trim().slice(0, 40) || 'Estudiante';
  writeRegistry(registry);
}

export function deleteProfile(id) {
  const registry = ensureRegistry();
  if (registry.profiles.length <= 1) return false;
  const removingActive = registry.active === id;
  registry.profiles = registry.profiles.filter((p) => p.id !== id);
  if (!registry.profiles.some((p) => p.id === registry.active)) {
    registry.active = registry.profiles[0].id;
  }
  writeRegistry(registry);
  localStorage.removeItem(STATE_KEY(id));
  if (removingActive) {
    const raw = readJSON(STATE_KEY(registry.active), null);
    state = raw ? migrate(raw) : seedState();
    save();
    notify();
  }
  return true;
}

function migrate(raw) {
  const base = seedState();
  const next = { ...base, ...raw };
  next.subjects = Array.isArray(raw.subjects) ? raw.subjects : base.subjects;
  next.exams = Array.isArray(raw.exams) ? raw.exams : [];
  next.questions = Array.isArray(raw.questions) ? raw.questions : [];
  next.notes = (Array.isArray(raw.notes) ? raw.notes : []).map((note) => ({
    ...note,
    images: Array.isArray(note.images) ? note.images : [],
  }));
  next.attempts = Array.isArray(raw.attempts) ? raw.attempts : [];
  next.planDone = raw.planDone && typeof raw.planDone === 'object' ? raw.planDone : {};
  next.daysStudied = Array.isArray(raw.daysStudied) ? raw.daysStudied : [];
  next.xp = Number.isFinite(raw.xp) ? raw.xp : 0;
  next.cardsSeen = Number(raw.cardsSeen) || 0;
  next.settings = { showDemo: true, ...(raw.settings || {}) };
  return next;
}

export function load() {
  try {
    const registry = ensureRegistry();
    const raw = readJSON(STATE_KEY(registry.active), null);
    state = raw ? migrate(raw) : seedState();
    if (!raw) save();
  } catch (err) {
    console.warn('No se pudo leer el guardado, arranco con datos de ejemplo.', err);
    state = seedState();
  }
  return state;
}

export function getState() {
  return state || load();
}

export function save() {
  try {
    const registry = ensureRegistry();
    localStorage.setItem(STATE_KEY(registry.active), JSON.stringify(state));
  } catch (err) {
    console.warn('No se pudo guardar', err);
    throw err;
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(state);
}

/** Aplica cambios, guarda y avisa a la UI. */
export function update(mutator) {
  const result = mutator(state);
  save();
  notify();
  return result;
}

export function replaceState(next) {
  state = migrate(next);
  save();
  notify();
}

export function resetToSeed() {
  state = seedState();
  save();
  notify();
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/* --------------------------- Consultas --------------------------- */

export function subjectsSorted(s = getState()) {
  return [...s.subjects].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function subjectById(id, s = getState()) {
  return s.subjects.find((x) => x.id === id) || null;
}

export function examsSorted(s = getState()) {
  return [...s.exams].sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)));
}

export function upcomingExams(s = getState(), today = todayISO()) {
  return examsSorted(s).filter((e) => diffDays(today, e.date) >= 0);
}

export function pastExams(s = getState(), today = todayISO()) {
  return examsSorted(s).filter((e) => diffDays(today, e.date) < 0).reverse();
}

export function questionsOf(subjectId, s = getState()) {
  return s.questions.filter((q) => q.subjectId === subjectId);
}

export function notesSorted(s = getState()) {
  return [...(s.notes || [])].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export function notesOf(subjectId, s = getState()) {
  return notesSorted(s).filter((n) => n.subjectId === subjectId);
}

/** 0..1 según aciertos históricos de la materia. */
export function masteryOf(subjectId, s = getState()) {
  const qs = questionsOf(subjectId, s);
  let right = 0;
  let total = 0;
  for (const q of qs) {
    const st = q.stats || {};
    right += st.correct || 0;
    total += (st.correct || 0) + (st.wrong || 0);
  }
  return total === 0 ? 0 : right / total;
}

export function wrongQuestions(subjectId, s = getState()) {
  return s.questions.filter((q) => {
    if (subjectId && q.subjectId !== subjectId) return false;
    const st = q.stats || {};
    return (st.wrong || 0) > (st.correct || 0);
  });
}

/**
 * Plan de estudio: reparte los temas entre hoy y la víspera del examen.
 * Devuelve items {topic, date, key, done}.
 */
export function studyPlan(exam, s = getState(), today = todayISO()) {
  const days = diffDays(today, exam.date);
  const topics = (exam.topics || []).filter(Boolean);
  if (days < 0) return { status: 'pasado', items: [] };
  if (!topics.length) return { status: days === 0 ? 'hoy' : 'pendiente', items: [] };

  const buckets = Math.max(days, 1);
  const items = topics.map((topic, i) => {
    const offset = days === 0 ? 0 : Math.min(Math.floor((i * buckets) / topics.length), buckets - 1);
    const date = addDays(today, offset);
    const key = `${exam.id}|${date}|${i}`;
    return { topic, date, key, done: Boolean(s.planDone && s.planDone[key]) };
  });
  return { status: days === 0 ? 'hoy' : 'pendiente', items };
}

/** Tareas de estudio para una fecha concreta, de todos los exámenes futuros. */
export function tasksForDate(iso, s = getState()) {
  const out = [];
  for (const exam of upcomingExams(s)) {
    const plan = studyPlan(exam, s);
    for (const item of plan.items) {
      if (item.date === iso) out.push({ ...item, exam });
    }
  }
  return out;
}

export function togglePlanItem(key, done) {
  return update((s) => {
    if (done) s.planDone[key] = true;
    else delete s.planDone[key];
  });
}

export function streak(s = getState(), today = todayISO()) {
  const days = new Set(s.daysStudied || []);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function markStudied(iso = todayISO()) {
  return update((s) => {
    if (!s.daysStudied.includes(iso)) s.daysStudied.push(iso);
  });
}

export function recordAttempt(attempt) {
  return update((s) => {
    s.attempts.unshift(attempt);
    s.attempts = s.attempts.slice(0, 40);
    for (const ans of attempt.answers) {
      const q = s.questions.find((x) => x.id === ans.questionId);
      if (!q) continue;
      q.stats = q.stats || { correct: 0, wrong: 0, lastSeen: null };
      if (ans.correct) q.stats.correct += 1;
      else q.stats.wrong += 1;
      q.stats.lastSeen = new Date().toISOString();
    }
    if (!s.daysStudied.includes(attempt.date)) s.daysStudied.push(attempt.date);
  });
}

export function exportJSON() {
  return JSON.stringify({ ...getState(), exportedAt: new Date().toISOString() }, null, 2);
}

/* --------------------------- Progreso / XP --------------------------- */

export function addXp(amount) {
  const value = Math.max(0, Math.round(Number(amount) || 0));
  if (!value) return;
  update((s) => { s.xp = (s.xp || 0) + value; });
}

/** Nivel actual y progreso dentro del nivel. */
export function levelInfo(xp = getState().xp || 0) {
  let level = 1;
  let need = 80;
  let base = 0;
  while (xp >= base + need) {
    base += need;
    level += 1;
    need = 80 + 60 * (level - 1);
  }
  return {
    level,
    xp,
    base,
    need,
    inLevel: xp - base,
    progress: Math.max(0, Math.min(1, (xp - base) / need)),
  };
}

export function studyStats(s = getState()) {
  let correct = 0;
  let wrong = 0;
  for (const q of s.questions) {
    correct += q.stats?.correct || 0;
    wrong += q.stats?.wrong || 0;
  }
  const total = correct + wrong;
  return {
    correct,
    wrong,
    total,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    cards: s.cardsSeen || 0,
    notes: (s.notes || []).length,
    days: (s.daysStudied || []).length,
    exams: s.exams.length,
    questions: s.questions.length,
  };
}

/** Logros calculados a partir de los datos reales (no se guardan). */
export function achievements(s = getState(), today = todayISO()) {
  const stats = studyStats(s);
  const tasks = tasksForDate(today, s);
  const planDone = tasks.length > 0 && tasks.every((t) => t.done);
  const bestMock = (s.attempts || []).some((a) => a.total >= 5 && a.percent === 100);
  const streakNow = streak(s, today);

  return [
    { id: 'first-practice', emoji: '🎓', title: 'Primer paso', desc: 'Completá tu primera práctica.', done: (s.attempts || []).length >= 1 },
    { id: 'ten-correct', emoji: '✅', title: 'Diez aciertos', desc: 'Acertá 10 preguntas.', done: stats.correct >= 10 },
    { id: 'fifty-correct', emoji: '🏅', title: 'Cincuenta aciertos', desc: 'Acertá 50 preguntas.', done: stats.correct >= 50 },
    { id: 'streak-3', emoji: '🔥', title: 'Racha de 3', desc: 'Estudiá 3 días seguidos.', done: streakNow >= 3 },
    { id: 'streak-7', emoji: '⚡', title: 'Racha de 7', desc: 'Estudiá 7 días seguidos.', done: streakNow >= 7 },
    { id: 'first-cards', emoji: '🃏', title: 'Primera tarjeta', desc: 'Repasá con tarjetas.', done: stats.cards >= 1 },
    { id: 'cards-20', emoji: '🧠', title: 'Veinte tarjetas', desc: 'Repasá 20 tarjetas.', done: stats.cards >= 20 },
    { id: 'notes-3', emoji: '✍️', title: 'Escritora', desc: 'Guardá 3 apuntes.', done: stats.notes >= 3 },
    { id: 'mock-perfect', emoji: '🎯', title: 'Examen perfecto', desc: 'Sacá 100% en un examen simulado.', done: bestMock },
    { id: 'organized', emoji: '📅', title: 'Organizada', desc: 'Cargá 3 exámenes en el calendario.', done: stats.exams >= 3 },
    { id: 'all-tasks', emoji: '☑️', title: 'Todo al día', desc: 'Completá todas las tareas de hoy.', done: planDone },
    { id: 'days-10', emoji: '🌱', title: 'Diez días', desc: 'Estudiá en 10 días distintos.', done: stats.days >= 10 },
  ];
}
