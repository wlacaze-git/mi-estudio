// Estado de la app + persistencia local (localStorage).
import { seedState } from './seed.js';
import { addDays, diffDays, todayISO } from './dates.js';

const KEY = 'miEstudio.v1';
const listeners = new Set();

let state = null;

function migrate(raw) {
  const base = seedState();
  const next = { ...base, ...raw };
  next.subjects = Array.isArray(raw.subjects) ? raw.subjects : base.subjects;
  next.exams = Array.isArray(raw.exams) ? raw.exams : [];
  next.questions = Array.isArray(raw.questions) ? raw.questions : [];
  next.notes = Array.isArray(raw.notes) ? raw.notes : [];
  next.attempts = Array.isArray(raw.attempts) ? raw.attempts : [];
  next.planDone = raw.planDone && typeof raw.planDone === 'object' ? raw.planDone : {};
  next.daysStudied = Array.isArray(raw.daysStudied) ? raw.daysStudied : [];
  next.settings = { showDemo: true, ...(raw.settings || {}) };
  return next;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : seedState();
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
    localStorage.setItem(KEY, JSON.stringify(state));
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
