// Arranque, navegación y eventos de Mi Estudio.
import {
  getState, load, replaceState, subscribe, subjectById,
  update, uid, achievements, addXp, levelInfo,
  activeProfile, activeProfileId, createProfile, deleteProfile, pastPlansWithoutGrade, planStations,
  profileStateOf, renameProfile, switchProfile, upcomingExams,
} from './js/store.js';
import { addDays, buildICS, fmtLong, todayISO, diffDays } from './js/dates.js';
import {
  buildSession, answerCurrent, currentItem, nextQuestion, buildAttempt,
  buildFlashcards, currentCard, answerCard, cardSummary, buildStationSession,
} from './js/quiz.js';
import {
  esc, toast, openModal, closeModal, isModalOpen, downloadFile,
} from './js/ui.js';
import { animalAvatar, animalForLevel, orderedAnimals } from './js/animals.js';
import { buildReply, gradeQuestion, welcomeText } from './js/perla.js';
import { bindToCurrentProfile, downloadNow, initCloud, onCloudChange, pushNow, schedulePush, signIn, signOut } from './js/cloud.js';
import {
  blobToDataURL, dataURLToBlob, deleteImage, deleteImages, getImageBlob,
  hydrate, imageUrl, putImage, saveFile,
} from './js/images.js';
import * as views from './js/views.js';

const state = load();
const viewEl = document.getElementById('view');
const brandSub = document.getElementById('brand-sub');
const navButtons = [...document.querySelectorAll('.nav [data-view], .mobile-nav [data-view]')];

const SUBJECT_COLORS = ['#ec4899', '#3b82f6', '#ef4444', '#eab308', '#8b5cf6', '#166534', '#22c55e', '#38bdf8', '#f97316', '#14b8a6', '#c084fc', '#d946ef', '#92400e', '#6b7280', '#111827'];

const DAY_NUMBERS = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5 };

function parseScheduleText(text) {
  const entries = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const dayMatch = line.toLowerCase().match(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes)\b/);
    if (!dayMatch) continue;
    const dayKey = dayMatch[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const day = DAY_NUMBERS[dayKey];
    if (!day) continue;
    const time = line.match(/(\d{1,2})[:.](\d{2})\s*(?:-|–|—|a|hasta)\s*(\d{1,2})[:.](\d{2})/i);
    if (!time) continue;
    const start = String(time[1]).padStart(2, '0') + ':' + time[2];
    const end = String(time[3]).padStart(2, '0') + ':' + time[4];
    let rest = line.replace(time[0], ' ').replace(/\s+/g, ' ').trim();
    rest = rest.replace(/^(lunes|martes|mi[eé]rcoles|jueves|viernes)\b/i, ' ').replace(/\s+/g, ' ').trim();
    rest = rest.replace(/^[·•\-\s]+/, '').trim();
    let subjectName = rest;
    let teacher = '';
    const parts = rest.split(/\s*[-–—]\s*/);
    if (parts.length > 1) {
      subjectName = parts[0].trim();
      teacher = parts.slice(1).join(' - ').trim();
    }
    if (!subjectName) continue;
    entries.push({ day, start, end, subjectName, teacher });
  }
  return entries;
}

const route = { view: 'hoy', subjectId: null };
let quizSession = null;
let cardsSession = null;
let noteFilter = '';
let calMonth = { year: new Date().getFullYear(), month: new Date().getMonth() };
let modal = null;
let recordedSessions = new Set();
let noteDraft = null;
let planDraft = null;
let perlaDraft = { images: [], notes: [], youtube: [] };

/* ----------------------------- Render ----------------------------- */

function render() {
  const current = getState();
  const today = todayISO();
  let html = '';

  if (route.view === 'hoy') {
    html = views.renderHoy(current, { today });
  } else if (route.view === 'calendario') {
    html = views.renderCalendario(current, { today, month: calMonth });
  } else if (route.view === 'materias') {
    html = views.renderMaterias(current);
  } else if (route.view === 'subject') {
    const subject = subjectById(route.subjectId, current);
    html = subject ? views.renderSubjectDetail(current, subject) : views.renderMaterias(current);
  } else if (route.view === 'practica') {
    html = views.renderPractica(current, { today });
  } else if (route.view === 'horario') {
    html = views.renderHorario(current, { today });
  } else if (route.view === 'apuntes') {
    html = views.renderApuntes(current, { subjectId: noteFilter || null });
  } else if (route.view === 'quiz') {
    html = views.renderQuiz(quizSession, current);
  } else if (route.view === 'tarjetas') {
    html = views.renderFlashcards(cardsSession, current);
  } else if (route.view === 'planes') {
    html = views.renderPlanes(current, { today });
  } else if (route.view === 'camino' && route.planId) {
    const plan = current.exams.find((item) => item.id === route.planId);
    html = plan ? views.renderCamino(current, plan, { today }) : views.renderPlanes(current, { today });
  } else if (route.view === 'leccion' && route.planId && route.stationKey) {
    const plan = current.exams.find((item) => item.id === route.planId);
    const station = plan ? planStations(plan, current, today).stations.find((item) => item.key === route.stationKey) : null;
    html = plan && station
      ? views.renderLeccion(current, plan, station, { today })
      : views.renderPlanes(current, { today });
  } else if (route.view === 'pizarra' && route.planId && route.stationKey) {
    const plan = current.exams.find((item) => item.id === route.planId);
    const station = plan ? planStations(plan, current, today).stations.find((item) => item.key === route.stationKey) : null;
    html = plan && station
      ? views.renderPizarra(current, plan, station)
      : views.renderPlanes(current, { today });
  } else if (route.view === 'perla') {
    html = views.renderPerla(current, { draft: perlaDraft });
  } else if (route.view === 'perfil') {
    html = views.renderPerfil(current, { today });
  } else if (route.view === 'ajustes') {
    html = views.renderAjustes(current);
  }

  viewEl.innerHTML = html;
  hydrate(viewEl);
  document.body.dataset.view = route.view;
  if (route.view === 'perla') {
    const box = document.getElementById('perla-messages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  const activeView = route.view === 'subject' ? 'materias'
    : route.view === 'tarjetas' ? 'practica'
      : (route.view === 'camino' || route.view === 'leccion' || route.view === 'pizarra') || (route.view === 'quiz' && quizSession && quizSession.station) ? 'planes'
        : route.view;
  for (const btn of navButtons) {
    btn.classList.toggle('is-active', btn.dataset.view === activeView);
  }

  const name = (current.student || '').trim();
  brandSub.textContent = name ? `El espacio de ${name}` : 'Calendario y práctica';
  document.title = name ? `Mi Estudio · ${name}` : 'Mi Estudio';

  const avatarInitials = document.getElementById('nav-avatar-initials');
  const avatarLevel = document.getElementById('nav-avatar-level');
  const currentLevel = levelInfo(current.xp || 0).level;
  if (avatarInitials) avatarInitials.innerHTML = animalAvatar(animalForLevel(currentLevel, current.settings && current.settings.animalOrder));
  if (avatarLevel) avatarLevel.textContent = currentLevel;
  checkAnimal(currentLevel);

  checkBadges(current, today);
}

// Avisa cuando el nivel le cambia el animal.
let lastAnimalId = null;
function checkAnimal(level) {
  const animal = animalForLevel(level);
  if (lastAnimalId === null) {
    lastAnimalId = animal.id;
    return;
  }
  if (animal.id !== lastAnimalId) {
    lastAnimalId = animal.id;
    toast(`¡Nuevo animal: ${animal.name}!`);
  }
}

/* Avisa cuando se desbloquea un logro nuevo (la primera vez no avisa). */
let knownBadges = null;
function checkBadges(state, today) {
  const unlocked = achievements(state, today).filter((b) => b.done).map((b) => b.id);
  if (knownBadges === null) {
    knownBadges = new Set(unlocked);
    return;
  }
  const fresh = unlocked.filter((id) => !knownBadges.has(id));
  if (!fresh.length) return;
  fresh.forEach((id) => knownBadges.add(id));
  const badge = achievements(state, today).find((b) => b.id === fresh[0]);
  if (badge) toast(`🏅 Logro desbloqueado: ${badge.title}`);
}

function go(next) {
  Object.assign(route, next);
  closeModal();
  window.scrollTo({ top: 0, behavior: 'auto' });
  render();
  viewEl.focus({ preventScroll: true });
}

/* ----------------------------- Modales ----------------------------- */

function showModal(kind, payload = {}) {
  modal = { kind, payload };
  const current = getState();
  let html = '';
  let label = 'Ventana';

  if (kind === 'plan') {
    html = views.renderPlanWizard(current, planDraft);
    label = 'Plan de estudio';
  } else if (kind === 'plan-view') {
    html = views.renderPlanView(current, payload.plan);
    label = 'Plan';
  } else if (kind === 'subject') {
    html = views.renderSubjectForm(current, payload);
    label = payload.subject ? 'Editar materia' : 'Agregar materia';
  } else if (kind === 'question') {
    html = views.renderQuestionForm(current, payload);
    label = 'Pregunta';
  } else if (kind === 'day') {
    html = views.renderDaySheet(current, payload.date);
    label = 'Día';
  } else if (kind === 'confirm') {
    html = views.renderConfirm(payload);
    label = 'Confirmar';
  } else if (kind === 'note') {
    html = views.renderNoteForm(current, payload);
    label = payload.note ? 'Editar apunte' : 'Nuevo apunte';
  } else if (kind === 'note-view') {
    html = views.renderNoteView(current, payload.note);
    label = 'Apunte';
  } else if (kind === 'profile') {
    html = views.renderProfileForm();
    label = 'Agregar persona';
  } else if (kind === 'clase') {
    html = views.renderClaseForm(current, payload);
    label = payload.clase ? 'Editar clase' : 'Agregar clase';
  } else if (kind === 'import-schedule') {
    html = views.renderImportSchedule();
    label = 'Importar horario';
  } else if (kind === 'note-picker') {
    html = views.renderNotePicker(current);
    label = 'Elegir apunte';
  } else if (kind === 'youtube') {
    html = views.renderYouTubeForm();
    label = 'Video de YouTube';
  } else if (kind === 'grade') {
    html = views.renderGradeModal(payload.plan);
    label = 'Nota del examen';
  } else if (kind === 'onboarding') {
    html = views.renderOnboarding();
    label = 'Bienvenida';
  }

  openModal(html, { label });
  if (kind === 'note') {
    startNoteDraft(payload.note);
    hydrate(document.getElementById('modal-root'));
  }
  if (kind === 'note-view') hydrate(document.getElementById('modal-root'));
  if (kind === 'plan' || kind === 'plan-view') hydrate(document.getElementById('modal-root'));
  if (kind === 'perla') hydrate(document.getElementById('modal-root'));
}

/* --------------------------- Fotos de apuntes --------------------------- */

function startNoteDraft(note) {
  const ids = ((note && note.images) || []).map((photo) => photo.id);
  noteDraft = {
    ids,
    originalIds: new Set(ids),
    newIds: new Set(),
    removedIds: new Set(),
  };
}

/** Si se cierra el editor sin guardar, borra las fotos recién agregadas. */
function discardNoteDraft() {
  if (!noteDraft) return;
  const pending = [...noteDraft.newIds];
  noteDraft = null;
  if (pending.length) deleteImages(pending);
}

/* ------------------------- Plan de estudio ------------------------- */

function openPlanWizard(plan = null, { date = '' } = {}) {
  const today = todayISO();
  planDraft = {
    id: plan ? plan.id : null,
    step: 1,
    type: plan ? plan.type || 'examen' : 'examen',
    subjectId: plan ? plan.subjectId : ((getState().subjects[0] || {}).id || ''),
    title: plan ? plan.title : '',
    topicsText: plan ? (plan.topics || []).join('\n') : '',
    topicsCount: plan ? (plan.topics || []).length : 0,
    date: plan ? plan.date || '' : (date || addDays(today, 7)),
    notes: plan ? plan.notes || '' : '',
    images: plan ? (plan.photos || []).map((photo) => photo.id) : [],
    newImages: new Set(),
    removedImages: new Set(),
  };
  showModal('plan');
}

function renderPlanModal() {
  const html = views.renderPlanWizard(getState(), planDraft);
  openModal(html, { label: 'Plan de estudio' });
  hydrate(document.getElementById('modal-root'));
}

function discardPlanDraft() {
  if (!planDraft) return;
  const pending = [...planDraft.newImages];
  planDraft = null;
  if (pending.length) deleteImages(pending);
}

/* ----------------------------- My Perla ----------------------------- */

function perlaMessage(role, text, extra = {}) {
  return {
    id: uid('pm'),
    role,
    text: text || '',
    at: new Date().toISOString(),
    images: [],
    notes: [],
    youtube: [],
    ...extra,
  };
}

function activePerlaChat(s = getState()) {
  const chats = (s.perla && s.perla.chats) || [];
  return chats.find((chat) => chat.id === s.perla.activeId) || null;
}

function ensurePerlaChat() {
  const s = getState();
  if (!s.perla) s.perla = { chats: [], activeId: null };
  if (!s.perla.chats.length) {
    update((state) => {
      const id = uid('chat');
      state.perla.chats.push({
        id,
        title: 'Nuevo chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      state.perla.activeId = id;
    });
  } else if (!s.perla.chats.some((chat) => chat.id === s.perla.activeId)) {
    update((state) => { state.perla.activeId = state.perla.chats[0].id; });
  }
}

function addPerlaMessage(message) {
  update((s) => {
    const chat = s.perla.chats.find((item) => item.id === s.perla.activeId);
    if (!chat) return;
    chat.messages.push(message);
    chat.messages = chat.messages.slice(-80);
    chat.updatedAt = new Date().toISOString();
    if (message.role === 'user' && (!chat.title || chat.title === 'Nuevo chat')) {
      chat.title = message.text.trim().slice(0, 40) || 'Foto o apunte';
    }
  });
}

function openPerla() {
  ensurePerlaChat();
  const current = getState();
  const chat = activePerlaChat(current);
  if (!chat || chat.messages.length) return;
  const pending = pastPlansWithoutGrade(current);
  if (pending.length) {
    const plan = pending[0];
    addPerlaMessage(perlaMessage('perla', gradeQuestion(plan, current), { kind: 'grade', planId: plan.id }));
  } else {
    addPerlaMessage(perlaMessage('perla', welcomeText(current)));
  }
}

function sendPerla(text) {
  const message = perlaMessage('user', text, {
    images: [...perlaDraft.images],
    notes: [...perlaDraft.notes],
    youtube: [...perlaDraft.youtube],
  });
  const hasContent = message.text.trim() || message.images.length || message.notes.length || message.youtube.length;
  if (!hasContent) return;
  perlaDraft = { images: [], notes: [], youtube: [] };
  addPerlaMessage(message);
  render();
  setTimeout(() => {
    const reply = buildReply(getState(), text, message);
    addPerlaMessage(perlaMessage('perla', reply));
    render();
  }, 450);
}

function answerGrade(planId, grade) {
  update((s) => {
    const plan = s.exams.find((p) => p.id === planId);
    if (plan) {
      plan.grade = grade;
      plan.gradeAsked = true;
    }
    const chat = (s.perla.chats || []).find((item) => item.id === s.perla.activeId);
    if (!chat) return;
    const question = chat.messages.find((m) => m.kind === 'grade' && m.planId === planId && !m.answered);
    if (question) question.answered = true;
    chat.messages.push(perlaMessage('user', grade == null ? 'No me acuerdo.' : `Me saqué un ${grade}.`));
    if (grade != null && grade < 6) {
      chat.messages.push(perlaMessage('perla', 'No pasa nada, para eso estamos. Ese tema lo podemos repasar con preguntas.'));
    } else if (grade != null) {
      chat.messages.push(perlaMessage('perla', '¡Bien! La guardé en tus notas.'));
    }
    const pending = pastPlansWithoutGrade(s);
    if (pending.length) {
      const nextPlan = pending[0];
      chat.messages.push(perlaMessage('perla', gradeQuestion(nextPlan, s), { kind: 'grade', planId: nextPlan.id }));
    } else {
      chat.messages.push(perlaMessage('perla', 'Listo, ya tengo tus notas guardadas. ¿Qué querés hacer ahora?'));
    }
    chat.messages = chat.messages.slice(-80);
  });
}

function speak(text) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    toast('Este dispositivo no puede leer en voz alta', 'warn');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 4000));
  utterance.lang = 'es-ES';
  utterance.rate = 0.98;
  window.speechSynthesis.speak(utterance);
}

function openLightbox(url) {
  if (!url) return;
  document.getElementById('lightbox')?.remove();
  const box = document.createElement('div');
  box.id = 'lightbox';
  box.className = 'lightbox';
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Foto del apunte';
  box.appendChild(img);
  box.addEventListener('click', () => box.remove());
  document.body.appendChild(box);
}

/* ----------------------------- Acciones ----------------------------- */

function startQuiz({ subjectId = null, mode = 'practice', questionIds = null, count = 10 } = {}) {
  const session = buildSession({ subjectId, mode, questionIds, count });
  if (!session) {
    toast('No hay preguntas para practicar todavía', 'warn');
    return;
  }
  quizSession = session;
  go({ view: 'quiz' });
}

function recordIfNeeded() {
  if (!quizSession || !quizSession.finished) return;
  if (recordedSessions.has(quizSession.id)) return;
  recordedSessions.add(quizSession.id);
  const attempt = buildAttempt(quizSession);
  update((s) => {
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
    s.xp = (s.xp || 0) + 15;
    if (quizSession.station) {
      s.planDone[quizSession.station.key] = true;
      const plan = s.exams.find((item) => item.id === quizSession.station.planId);
      if (plan) {
        plan.scores = plan.scores || {};
        plan.scores[quizSession.station.key] = attempt.percent;
      }
    }
  });
}

function recordCardsIfNeeded() {
  if (!cardsSession || !cardsSession.finished) return;
  if (recordedSessions.has(cardsSession.id)) return;
  recordedSessions.add(cardsSession.id);
  const results = [...cardsSession.results];
  update((s) => {
    for (const result of results) {
      const question = s.questions.find((q) => q.id === result.questionId);
      if (!question) continue;
      question.stats = question.stats || { correct: 0, wrong: 0, lastSeen: null };
      if (result.ok) question.stats.correct += 1;
      else question.stats.wrong += 1;
      question.stats.lastSeen = new Date().toISOString();
    }
    const today = todayISO();
    if (!s.daysStudied.includes(today)) s.daysStudied.push(today);
    s.xp = (s.xp || 0) + 10;
  });
}

function startFlashcards({ subjectId = null, questionIds = null } = {}) {
  const session = buildFlashcards({ subjectId, questionIds });
  if (!session) {
    toast('No hay preguntas para armar tarjetas todavía', 'warn');
    return;
  }
  cardsSession = session;
  go({ view: 'tarjetas' });
}

function shareExam(examId) {
  const current = getState();
  const exam = current.exams.find((e) => e.id === examId);
  if (!exam) return;
  const subject = subjectById(exam.subjectId, current);
  const topics = (exam.topics || []).filter(Boolean);
  const text = [
    `📅 ${subject ? subject.name : 'Examen'}: ${exam.title}`,
    `🗓️ ${fmtLong(exam.date)}`,
    topics.length ? `📚 Temas: ${topics.join(' · ')}` : '',
    exam.notes ? `📝 ${exam.notes}` : '',
  ].filter(Boolean).join('\n');

  if (navigator.share) {
    navigator.share({ title: `Examen de ${subject ? subject.name : ''}`, text }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
}

function exportCalendar() {
  const current = getState();
  const dated = current.exams.filter((plan) => plan.date);
  if (!dated.length) {
    toast('Los planes sin fecha no van a la agenda', 'warn');
    return;
  }
  const ics = buildICS(dated, current.subjects, 'Exámenes');
  downloadFile('examenes.ics', ics, 'text/calendar');
  toast('Archivo .ics descargado. Abrilo para sumarlo al Calendario del iPad.');
}

async function exportBackup() {
  const current = getState();
  const images = {};
  const photosToSave = [
    ...(current.notes || []).flatMap((note) => note.images || []),
    ...(current.exams || []).flatMap((plan) => plan.photos || []),
    ...(current.schedulePhotoId ? [{ id: current.schedulePhotoId }] : []),
    ...(current.avatarPhotoId ? [{ id: current.avatarPhotoId }] : []),
  ];
  for (const photo of photosToSave) {
    try {
      const blob = await getImageBlob(photo.id);
      if (blob) images[photo.id] = await blobToDataURL(blob);
    } catch { /* si falta una foto, seguimos */ }
  }
  const payload = { ...current, images, exportedAt: new Date().toISOString() };
  downloadFile(`mi-estudio-backup-${todayISO()}.json`, JSON.stringify(payload, null, 2));
  const count = Object.keys(images).length;
  toast(count ? `Backup descargado (con ${count} foto${count === 1 ? '' : 's'})` : 'Backup descargado');
}

async function importBackup(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.subjects) || !Array.isArray(data.questions)) {
      throw new Error('Formato inválido');
    }
    const imageMap = data.images && typeof data.images === 'object' ? data.images : {};
    delete data.images;
    for (const [id, dataUrl] of Object.entries(imageMap)) {
      try {
        await putImage(id, await dataURLToBlob(dataUrl));
      } catch { /* una foto rota no frena la importación */ }
    }
    replaceState(data);
    go({ view: 'apuntes' });
    toast('Backup importado');
  } catch (err) {
    console.error(err);
    toast('No pude leer ese archivo', 'warn');
  }
}

function deleteExam(id) {
  const current = getState();
  const exam = current.exams.find((e) => e.id === id);
  showModal('confirm', {
    title: '¿Borrar este examen?',
    text: exam ? `"${exam.title}" (${fmtLong(exam.date)}) se va a borrar del calendario.` : 'Se va a borrar del calendario.',
    confirmLabel: 'Borrar examen',
    action: 'confirm-delete-exam',
    id,
  });
}

function deleteQuestion(id) {
  showModal('confirm', {
    title: '¿Borrar esta pregunta?',
    text: 'La pregunta y su historial de respuestas se van a borrar.',
    confirmLabel: 'Borrar pregunta',
    action: 'confirm-delete-question',
    id,
  });
}

function deleteSubject(id) {
  const current = getState();
  const subject = subjectById(id, current);
  const qs = current.questions.filter((q) => q.subjectId === id).length;
  const exams = current.exams.filter((e) => e.subjectId === id).length;
  showModal('confirm', {
    title: `¿Borrar ${subject ? subject.name : 'la materia'}?`,
    text: `También se van a borrar ${qs} pregunta(s) y ${exams} examen(es) de esa materia.`,
    confirmLabel: 'Borrar materia',
    action: 'confirm-delete-subject',
    id,
  });
}

/* --------------------------- Delegación --------------------------- */

document.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'close-modal' && el.classList.contains('modal-backdrop') && event.target !== el) return;

  switch (action) {
    case 'nav':
      if (el.dataset.view === 'perla') openPerla();
      go({ view: el.dataset.view, subjectId: el.dataset.id || null });
      return;
    case 'close-modal':
      closeModal();
      return;
    case 'open-subject':
      go({ view: 'subject', subjectId: el.dataset.id });
      return;
    case 'add-exam': {
      if (isModalOpen()) closeModal();
      openPlanWizard(null, { date: el.dataset.date || '' });
      return;
    }
    case 'edit-exam': {
      const exam = getState().exams.find((e) => e.id === el.dataset.id);
      if (exam) { closeModal(); openPlanWizard(exam); }
      return;
    }
    case 'open-pizarra': {
      const plan = getState().exams.find((item) => item.id === el.dataset.plan);
      if (!plan) return;
      const station = planStations(plan).stations.find((item) => item.key === el.dataset.key);
      if (!station) return;
      go({ view: 'pizarra', planId: plan.id, stationKey: station.key });
      return;
    }
    case 'read-lesson': {
      const box = document.getElementById('pizarra-text') || document.querySelector('.leccion-card');
      const text = (box && box.innerText || '').trim();
      if (!text) {
        toast('No hay texto para leer todavía', 'warn');
        return;
      }
      speak(text);
      return;
    }
    case 'stop-reading':
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    case 'open-camino':
      go({ view: 'camino', planId: el.dataset.id });
      return;
    case 'open-station': {
      const plan = getState().exams.find((item) => item.id === el.dataset.plan);
      if (!plan) return;
      const station = planStations(plan).stations.find((item) => item.key === el.dataset.key);
      if (!station) return;
      go({ view: 'leccion', planId: plan.id, stationKey: station.key });
      return;
    }
    case 'open-plan': {
      const plan = getState().exams.find((e) => e.id === el.dataset.id);
      if (plan) showModal('plan-view', { plan });
      return;
    }
    case 'plan-type': {
      if (!planDraft) return;
      planDraft.type = el.dataset.type;
      planDraft.step = 2;
      renderPlanModal();
      return;
    }
    case 'plan-back': {
      if (!planDraft) return;
      planDraft.step = Math.max(1, (planDraft.step || 1) - 1);
      renderPlanModal();
      return;
    }
    case 'remove-plan-photo': {
      const id = el.dataset.id;
      if (!planDraft) return;
      planDraft.images = planDraft.images.filter((x) => x !== id);
      if (planDraft.newImages.has(id)) {
        planDraft.newImages.delete(id);
        deleteImage(id);
      } else {
        planDraft.removedImages.add(id);
      }
      el.closest('.photo-thumb')?.remove();
      return;
    }
    case 'delete-exam':
      deleteExam(el.dataset.id);
      return;
    case 'add-subject':
      showModal('subject');
      return;
    case 'edit-subject': {
      const subject = subjectById(el.dataset.id);
      if (subject) showModal('subject', { subject });
      return;
    }
    case 'delete-subject':
      deleteSubject(el.dataset.id);
      return;
    case 'add-question':
      closeModal();
      showModal('question', { subjectId: el.dataset.subject || null });
      return;
    case 'edit-question': {
      const q = getState().questions.find((x) => x.id === el.dataset.id);
      if (q) showModal('question', { question: q });
      return;
    }
    case 'delete-question':
      deleteQuestion(el.dataset.id);
      return;
    case 'add-option': {
      const form = el.closest('form');
      const editor = form.querySelector('[data-option-editor]');
      const count = editor.querySelectorAll('.option-row').length;
      if (count >= 6) { toast('Máximo 6 opciones', 'warn'); return; }
      const letters = 'ABCDEFGH';
      const row = document.createElement('div');
      row.className = 'option-row';
      row.innerHTML = `
        <label class="option-radio">
          <input type="radio" name="correct" value="${count}">
          <span>${letters[count]}</span>
        </label>
        <input type="text" class="opt-input" placeholder="Opción ${letters[count]}">
        <button type="button" class="icon-btn" data-action="remove-option" aria-label="Quitar opción">✕</button>`;
      editor.appendChild(row);
      return;
    }
    case 'remove-option': {
      const row = el.closest('.option-row');
      const editor = row.parentElement;
      if (editor.querySelectorAll('.option-row').length <= 2) { toast('Dejá al menos 2 opciones', 'warn'); return; }
      row.remove();
      return;
    }
    case 'select-day':
      showModal('day', { date: el.dataset.date });
      return;
    case 'cal-shift': {
      const delta = Number(el.dataset.delta);
      const next = new Date(calMonth.year, calMonth.month + delta, 1);
      calMonth = { year: next.getFullYear(), month: next.getMonth() };
      render();
      return;
    }
    case 'cal-today': {
      const now = new Date();
      calMonth = { year: now.getFullYear(), month: now.getMonth() };
      render();
      return;
    }
    case 'start-quiz': {
      const subjectId = el.dataset.subject || null;
      const mode = el.dataset.mode || 'practice';
      closeModal();
      startQuiz({ subjectId, mode });
      return;
    }
    case 'answer': {
      if (!quizSession) return;
      const item = currentItem(quizSession);
      if (!item || item.ok !== null) return;
      answerCurrent(quizSession, Number(el.dataset.index));
      addXp(item.ok ? 10 : 3);
      render();
      return;
    }
    case 'next-question': {
      if (!quizSession) return;
      nextQuestion(quizSession);
      if (quizSession.finished) recordIfNeeded();
      render();
      return;
    }
    case 'quit-quiz':
      quizSession = null;
      go({ view: 'practica' });
      return;
    case 'retry-wrong': {
      if (!quizSession) return;
      const ids = quizSession.items.filter((i) => !i.ok).map((i) => i.question.id);
      startQuiz({ questionIds: ids, mode: 'practice' });
      return;
    }
    case 'start-station': {
      const plan = getState().exams.find((item) => item.id === el.dataset.plan);
      if (!plan) return;
      const station = planStations(plan).stations.find((item) => item.key === el.dataset.key);
      if (!station) return;
      const session = buildStationSession(plan, station, { count: 12 });
      if (!session) {
        toast('No hay preguntas de esta materia todavía', 'warn');
        return;
      }
      quizSession = session;
      go({ view: 'quiz' });
      return;
    }
    case 'start-flashcards':
      closeModal();
      startFlashcards({ subjectId: el.dataset.subject || null });
      return;
    case 'flip-card':
      if (!cardsSession) return;
      cardsSession.flipped = !cardsSession.flipped;
      render();
      return;
    case 'card-answer': {
      if (!cardsSession) return;
      const knew = el.dataset.ok === '1';
      answerCard(cardsSession, knew);
      update((s) => {
        s.cardsSeen = (s.cardsSeen || 0) + 1;
        s.xp = (s.xp || 0) + (knew ? 6 : 2);
      });
      if (cardsSession.finished) recordCardsIfNeeded();
      render();
      return;
    }
    case 'quit-cards':
      cardsSession = null;
      go({ view: 'practica' });
      return;
    case 'retry-cards': {
      if (!cardsSession) return;
      const ids = cardsSession.results.filter((r) => !r.ok).map((r) => r.questionId);
      startFlashcards({ questionIds: ids });
      return;
    }
    case 'add-note':
      closeModal();
      showModal('note', { subjectId: el.dataset.subject || null });
      return;
    case 'view-note': {
      const note = getState().notes.find((n) => n.id === el.dataset.id);
      if (note) showModal('note-view', { note });
      return;
    }
    case 'edit-note': {
      const note = getState().notes.find((n) => n.id === el.dataset.id);
      if (note) { closeModal(); showModal('note', { note }); }
      return;
    }
    case 'remove-note-photo': {
      const id = el.dataset.id;
      if (!noteDraft) return;
      noteDraft.ids = noteDraft.ids.filter((x) => x !== id);
      if (noteDraft.newIds.has(id)) {
        noteDraft.newIds.delete(id);
        deleteImage(id);
      } else {
        noteDraft.removedIds.add(id);
      }
      el.closest('.photo-thumb')?.remove();
      return;
    }
    case 'open-photo':
      imageUrl(el.dataset.imageId).then(openLightbox).catch(() => {});
      return;
    case 'delete-note': {
      const note = getState().notes.find((n) => n.id === el.dataset.id);
      if (!note) return;
      showModal('confirm', {
        title: '¿Borrar este apunte?',
        text: `"${note.title}" se va a borrar para siempre.`,
        confirmLabel: 'Borrar apunte',
        action: 'confirm-delete-note',
        id: note.id,
      });
      return;
    }
    case 'confirm-delete-note': {
      const id = el.dataset.id;
      const note = getState().notes.find((n) => n.id === id);
      const photos = ((note && note.images) || []).map((photo) => photo.id);
      update((s) => { s.notes = s.notes.filter((n) => n.id !== id); });
      closeModal();
      if (photos.length) deleteImages(photos);
      toast('Apunte borrado');
      return;
    }
    case 'filter-notes':
      noteFilter = el.dataset.subject || '';
      render();
      return;
    case 'add-class':
      closeModal();
      showModal('clase', { day: el.dataset.day ? Number(el.dataset.day) : null });
      return;
    case 'import-schedule':
      showModal('import-schedule');
      return;
    case 'remove-avatar-photo': {
      const photoId = getState().avatarPhotoId;
      update((s) => { s.avatarPhotoId = null; });
      if (photoId) deleteImage(photoId);
      toast('Personaje quitado');
      return;
    }
    case 'delete-schedule-photo': {
      const photoId = getState().schedulePhotoId;
      update((s) => { s.schedulePhotoId = null; });
      if (photoId) deleteImage(photoId);
      toast('Foto del horario quitada');
      return;
    }
    case 'edit-class': {
      const clase = (getState().schedule || []).find((c) => c.id === el.dataset.id);
      if (clase) { closeModal(); showModal('clase', { clase }); }
      return;
    }
    case 'delete-class': {
      const clase = (getState().schedule || []).find((c) => c.id === el.dataset.id);
      if (!clase) return;
      const subject = subjectById(clase.subjectId);
      showModal('confirm', {
        title: '¿Borrar esta clase?',
        text: `${subject ? subject.name : 'Materia'} · ${views.dayName(clase.day)} de ${clase.start} a ${clase.end}${clase.teacher ? ' (' + clase.teacher + ')' : ''}`,
        confirmLabel: 'Borrar clase',
        action: 'confirm-delete-class',
        id: clase.id,
      });
      return;
    }
    case 'confirm-delete-class':
      update((s) => { s.schedule = (s.schedule || []).filter((c) => c.id !== el.dataset.id); });
      closeModal();
      toast('Clase borrada');
      return;
    case 'new-perla-chat': {
      update((s) => {
        const id = uid('chat');
        s.perla.chats.push({
          id,
          title: 'Nuevo chat',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        s.perla.activeId = id;
      });
      openPerla();
      render();
      return;
    }
    case 'open-perla-chat':
      update((s) => { s.perla.activeId = el.dataset.id; });
      render();
      return;
    case 'cloud-signin': {
      const provider = el.dataset.provider || 'google';
      try {
        await signIn(provider);
      } catch (error) {
        toast(error.message || 'No se pudo iniciar sesión', 'warn');
      }
      return;
    }
    case 'cloud-signout':
      try {
        await signOut();
        toast('Sesión cerrada');
        render();
      } catch (error) {
        toast(error.message || 'No se pudo cerrar sesión', 'warn');
      }
      return;
    case 'cloud-push':
      try {
        await pushNow();
        toast('Guardado en la nube');
      } catch (error) {
        toast(error.message || 'No se pudo guardar en la nube', 'warn');
      }
      render();
      return;
    case 'cloud-pull': {
      if (!window.confirm('¿Bajar los datos de la nube? Se reemplaza lo guardado en este dispositivo.')) return;
      try {
        await downloadNow();
        toast('Datos bajados de la nube');
      } catch (error) {
        toast(error.message || 'No se pudo bajar de la nube', 'warn');
      }
      render();
      return;
    }
    case 'cloud-bind':
      bindToCurrentProfile();
      toast('Este perfil ahora sincroniza');
      render();
      return;
    case 'perla-quick':
      sendPerla(el.dataset.text || '');
      return;
    case 'perla-attach-note':
      showModal('note-picker');
      return;
    case 'perla-pick-note': {
      const note = getState().notes.find((n) => n.id === el.dataset.id);
      if (note && !perlaDraft.notes.some((n) => n.id === note.id)) {
        perlaDraft.notes.push({ id: note.id, title: note.title });
      }
      closeModal();
      render();
      return;
    }
    case 'perla-youtube':
      showModal('youtube');
      return;
    case 'perla-remove-image':
      perlaDraft.images = perlaDraft.images.filter((id) => id !== el.dataset.id);
      render();
      return;
    case 'perla-remove-note':
      perlaDraft.notes = perlaDraft.notes.filter((note) => note.id !== el.dataset.id);
      render();
      return;
    case 'perla-remove-youtube':
      perlaDraft.youtube = perlaDraft.youtube.filter((video) => video.videoId !== el.dataset.id);
      render();
      return;
    case 'perla-grade':
      answerGrade(el.dataset.plan, Number(el.dataset.grade));
      return;
    case 'perla-grade-skip':
      answerGrade(el.dataset.plan, null);
      return;
    case 'edit-grade': {
      const plan = getState().exams.find((p) => p.id === el.dataset.id);
      if (plan) showModal('grade', { plan });
      return;
    }
    case 'set-grade': {
      update((s) => {
        const plan = s.exams.find((p) => p.id === el.dataset.id);
        if (plan) { plan.grade = Number(el.dataset.grade); plan.gradeAsked = true; }
        const chat = (s.perla.chats || []).find((item) => item.id === s.perla.activeId);
        const question = chat && chat.messages.find((m) => m.kind === 'grade' && m.planId === el.dataset.id && !m.answered);
        if (question) question.answered = true;
      });
      closeModal();
      toast('Nota guardada');
      return;
    }
    case 'clear-grade':
      update((s) => {
        const plan = s.exams.find((p) => p.id === el.dataset.id);
        if (plan) plan.grade = null;
      });
      closeModal();
      toast('Nota borrada');
      return;
    case 'add-profile':
      showModal('profile');
      return;
    case 'switch-profile': {
      const profile = switchProfile(el.dataset.id);
      if (!profile) return;
      quizSession = null;
      cardsSession = null;
      knownBadges = null;
      lastAnimalId = null;
      closeModal();
      go({ view: 'hoy' });
      toast(`Ahora usa la app ${profile.name}`);
      return;
    }
    case 'delete-profile':
      showModal('confirm', {
        title: '¿Borrar a esta persona?',
        text: 'Se borran sus materias, exámenes, preguntas, apuntes y todo su progreso de este iPad. No se puede deshacer.',
        confirmLabel: 'Borrar persona',
        action: 'confirm-delete-profile',
        id: el.dataset.id,
      });
      return;
    case 'confirm-delete-profile': {
      const target = profileStateOf(el.dataset.id);
      const photos = [
        ...((target && target.notes) || []).flatMap((note) => (note.images || []).map((photo) => photo.id)),
        ...((target && target.exams) || []).flatMap((plan) => (plan.photos || []).map((photo) => photo.id)),
        ...((target && target.schedulePhotoId) ? [target.schedulePhotoId] : []),
        ...((target && target.avatarPhotoId) ? [target.avatarPhotoId] : []),
      ];
      const removed = deleteProfile(el.dataset.id);
      closeModal();
      if (photos.length) deleteImages(photos);
      if (removed) {
        knownBadges = null;
        lastAnimalId = null;
        toast('Persona borrada');
        render();
      } else {
        toast('Tiene que quedar al menos una persona', 'warn');
      }
      return;
    }
    case 'toggle-task': {
      const key = el.dataset.key;
      const done = el.dataset.done === '1';
      update((s) => {
        if (done) {
          delete s.planDone[key];
        } else {
          s.planDone[key] = true;
          s.xp = (s.xp || 0) + 8;
        }
      });
      return;
    }
    case 'share-exam':
      shareExam(el.dataset.id);
      return;    case 'export-ics':
      exportCalendar();
      return;
    case 'export-json':
      exportBackup();
      return;
    case 'clear-demo':
      showModal('confirm', {
        title: '¿Borrar los datos de ejemplo?',
        text: 'Se van a borrar solo las materias, exámenes, preguntas y apuntes de ejemplo. Lo que hayas cargado vos queda.',
        confirmLabel: 'Borrar ejemplos',
        action: 'confirm-clear-demo',
      });
      return;
    case 'confirm-clear-demo':
      update((s) => {
        s.exams = s.exams.filter((e) => !e.demo);
        s.questions = s.questions.filter((q) => !q.demo);
        s.notes = (s.notes || []).filter((n) => !n.demo);
        s.schedule = (s.schedule || []).filter((c) => !c.demo);
        const used = new Set(s.exams.map((e) => e.subjectId).concat(s.questions.map((q) => q.subjectId)));
        s.subjects = s.subjects.filter((sub) => !(['mat', 'his', 'bio'].includes(sub.id) && !used.has(sub.id)));
        s.settings.showDemo = false;
      });
      closeModal();
      toast('Datos de ejemplo borrados');
      return;
    case 'reset-app':
      showModal('confirm', {
        title: '¿Empezar de cero?',
        text: 'Se borran todas las materias, exámenes, preguntas y resultados de este dispositivo. No se puede deshacer.',
        confirmLabel: 'Sí, borrar todo',
        action: 'confirm-reset',
      });
      return;
    case 'confirm-reset': {
      const photos = [
        ...(getState().notes || []).flatMap((note) => (note.images || []).map((photo) => photo.id)),
        ...(getState().exams || []).flatMap((plan) => (plan.photos || []).map((photo) => photo.id)),
        ...(getState().schedulePhotoId ? [getState().schedulePhotoId] : []),
        ...(getState().avatarPhotoId ? [getState().avatarPhotoId] : []),
      ];
      update((s) => {
        s.student = '';
        s.subjects = [];
        s.exams = [];
        s.questions = [];
        s.notes = [];
        s.attempts = [];
        s.planDone = {};
        s.daysStudied = [];
        s.xp = 0;
        s.cardsSeen = 0;
      });
      closeModal();
      if (photos.length) deleteImages(photos);
      quizSession = null;
      cardsSession = null;
      knownBadges = null;
      lastAnimalId = null;
      go({ view: 'hoy' });
      toast('Listo, empezamos de cero');
      return;
    }
    case 'confirm-delete-exam': {
      const plan = getState().exams.find((e) => e.id === el.dataset.id);
      const planPhotos = ((plan && plan.photos) || []).map((photo) => photo.id);
      update((s) => { s.exams = s.exams.filter((e) => e.id !== el.dataset.id); });
      closeModal();
      if (planPhotos.length) deleteImages(planPhotos);
      toast('Plan borrado');
      return;
    }
    case 'confirm-delete-question':
      update((s) => { s.questions = s.questions.filter((q) => q.id !== el.dataset.id); });
      closeModal();
      toast('Pregunta borrada');
      return;
    case 'confirm-delete-subject': {
      const id = el.dataset.id;
      update((s) => {
        s.subjects = s.subjects.filter((x) => x.id !== id);
        s.exams = s.exams.filter((e) => e.subjectId !== id);
        s.questions = s.questions.filter((q) => q.subjectId !== id);
      });
      closeModal();
      go({ view: 'materias' });
      toast('Materia borrada');
      return;
    }
    default:
      return;
  }
});

/* ------------------------------ Forms ------------------------------ */

document.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.form;
  const data = new FormData(form);

  if (kind === 'exam') {
    const title = String(data.get('title') || '').trim();
    const date = String(data.get('date') || '').trim();
    const subjectId = String(data.get('subjectId') || '');
    if (!title || !date || !subjectId) { toast('Completá materia, título y fecha', 'warn'); return; }
    const topics = String(data.get('topics') || '')
      .split('\n').map((t) => t.trim()).filter(Boolean);
    const notes = String(data.get('notes') || '').trim();
    const id = form.dataset.id;
    update((s) => {
      if (id) {
        const exam = s.exams.find((e) => e.id === id);
        if (exam) Object.assign(exam, { subjectId, title, date, topics, notes, demo: false });
      } else {
        s.exams.push({ id: uid('ex'), subjectId, title, date, topics, notes });
      }
    });
    closeModal();
    toast(id ? 'Examen actualizado' : 'Examen agregado');
    return;
  }

  if (kind === 'subject') {
    const name = String(data.get('name') || '').trim();
    const emoji = String(data.get('emoji') || '').trim() || '📘';
    const color = String(data.get('color') || '#ec4899');
    if (!name) { toast('Poné un nombre', 'warn'); return; }
    const id = form.dataset.id;
    update((s) => {
      if (id) {
        const subject = s.subjects.find((x) => x.id === id);
        if (subject) Object.assign(subject, { name, emoji, color });
      } else {
        s.subjects.push({ id: uid('sub'), name, emoji, color });
      }
    });
    closeModal();
    toast(id ? 'Materia actualizada' : 'Materia agregada');
    return;
  }

  if (kind === 'question') {
    const text = String(data.get('text') || '').trim();
    const subjectId = String(data.get('subjectId') || '');
    const topic = String(data.get('topic') || '').trim();
    const explanation = String(data.get('explanation') || '').trim();
    if (!text || !subjectId) { toast('Completá la pregunta y la materia', 'warn'); return; }

    const rows = [...form.querySelectorAll('.option-row')];
    const values = rows.map((row) => (row.querySelector('.opt-input')?.value || '').trim());
    const checked = form.querySelector('input[name="correct"]:checked');
    if (!checked) { toast('Marcá cuál es la opción correcta', 'warn'); return; }
    const checkedRow = checked.closest('.option-row');
    const checkedIndex = rows.indexOf(checkedRow);

    const kept = [];
    values.forEach((value, index) => { if (value) kept.push({ value, index }); });
    if (kept.length < 2) { toast('Cargá al menos 2 opciones', 'warn'); return; }
    const correct = kept.findIndex((item) => item.index === checkedIndex);
    if (correct === -1) { toast('La opción correcta no puede estar vacía', 'warn'); return; }

    const id = form.dataset.id;
    update((s) => {
      const payload = {
        subjectId, topic, text,
        options: kept.map((item) => item.value),
        correct,
        explanation,
      };
      if (id) {
        const q = s.questions.find((x) => x.id === id);
        if (q) Object.assign(q, payload, { demo: false });
      } else {
        s.questions.push({ id: uid('q'), ...payload, stats: { correct: 0, wrong: 0, lastSeen: null } });
      }
    });
    closeModal();
    toast(id ? 'Pregunta actualizada' : 'Pregunta agregada');
    return;
  }

  if (kind === 'note') {
    const title = String(data.get('title') || '').trim();
    const body = String(data.get('body') || '').trim();
    const subjectId = String(data.get('subjectId') || '');
    const images = noteDraft ? [...noteDraft.ids] : [];
    const removedPhotos = noteDraft ? [...noteDraft.removedIds] : [];
    if (!title || !subjectId) { toast('Completá materia y título', 'warn'); return; }
    if (!body && !images.length) { toast('Escribí el apunte o agregá una foto', 'warn'); return; }

    const payloadImages = images.map((imageId) => ({ id: imageId }));
    const id = form.dataset.id;
    const now = new Date().toISOString();
    update((s) => {
      if (id) {
        const note = s.notes.find((n) => n.id === id);
        if (note) Object.assign(note, { subjectId, title, body, images: payloadImages, updatedAt: now, demo: false });
      } else {
        s.notes.push({ id: uid('note'), subjectId, title, body, images: payloadImages, createdAt: now, updatedAt: now });
      }
    });
    noteDraft = null;
    closeModal();
    if (removedPhotos.length) deleteImages(removedPhotos);
    toast(id ? 'Apunte actualizado' : 'Apunte guardado');
    return;
  }

  if (kind === 'clase') {
    let subjectId = String(data.get('subjectId') || '');
    const newSubjectName = String(data.get('newSubject') || '').trim();
    const day = Number(data.get('day'));
    const start = String(data.get('start') || '');
    const end = String(data.get('end') || '');
    const teacher = String(data.get('teacher') || '').trim();
    const room = String(data.get('room') || '').trim();
    if (!subjectId || !start || !end) { toast('Completá materia y horario', 'warn'); return; }
    if (subjectId === '__new' && !newSubjectName) { toast('Poné el nombre de la materia nueva', 'warn'); return; }
    if (end <= start) { toast('La hora de fin tiene que ser posterior al inicio', 'warn'); return; }
    const id = form.dataset.id;
    update((s) => {
      if (subjectId === '__new') {
        const createdSubject = {
          id: uid('sub'),
          name: newSubjectName,
          emoji: '📘',
          color: SUBJECT_COLORS[s.subjects.length % SUBJECT_COLORS.length],
        };
        s.subjects.push(createdSubject);
        subjectId = createdSubject.id;
      }
      if (id) {
        const clase = (s.schedule || []).find((c) => c.id === id);
        if (clase) Object.assign(clase, { subjectId, day, start, end, teacher, room, demo: false });
      } else {
        s.schedule = s.schedule || [];
        s.schedule.push({ id: uid('c'), subjectId, day, start, end, teacher, room });
      }
    });
    closeModal();
    toast(id ? 'Clase actualizada' : 'Clase agregada');
    return;
  }

  if (kind === 'plan-step2') {
    const subjectId = String(data.get('subjectId') || '');
    const title = String(data.get('title') || '').trim();
    const topicsText = String(data.get('topics') || '');
    if (!subjectId || !title) { toast('Completá materia y tema', 'warn'); return; }
    if (!planDraft) return;
    planDraft.subjectId = subjectId;
    planDraft.title = title;
    planDraft.topicsText = topicsText;
    const topics = topicsText.split('\n').map((line) => line.trim()).filter(Boolean);
    planDraft.topicsCount = topics.length || 1;
    planDraft.step = 3;
    renderPlanModal();
    return;
  }

  if (kind === 'plan-step3') {
    if (!planDraft) return;
    const id = form.dataset.id || planDraft.id;
    const dated = planDraft.type !== 'estudio';
    const date = String(data.get('date') || '').trim();
    if (dated && !date) { toast('Poné la fecha del plan', 'warn'); return; }
    let topics = planDraft.topicsText.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!topics.length) topics = [planDraft.title];
    const payload = {
      subjectId: planDraft.subjectId,
      type: planDraft.type,
      title: planDraft.title,
      date: dated ? date : '',
      topics,
      notes: planDraft.notes || '',
      photos: planDraft.images.map((imageId) => ({ id: imageId })),
    };
    const removed = [...planDraft.removedImages];
    update((s) => {
      if (id) {
        const plan = s.exams.find((e) => e.id === id);
        if (plan) Object.assign(plan, payload, { demo: false });
      } else {
        s.exams.push({ id: uid('plan'), ...payload });
      }
    });
    planDraft = null;
    closeModal();
    if (removed.length) deleteImages(removed);
    toast(id ? 'Plan actualizado' : 'Plan creado');
    return;
  }

  if (kind === 'import-schedule') {
    const entries = parseScheduleText(data.get('text'));
    if (!entries.length) { toast('No encontré clases en ese texto', 'warn'); return; }
    let created = 0;
    update((s) => {
      s.schedule = s.schedule || [];
      for (const entry of entries) {
        let subject = s.subjects.find((sub) => sub.name.toLowerCase() === entry.subjectName.toLowerCase());
        if (!subject) {
          subject = {
            id: uid('sub'),
            name: entry.subjectName,
            emoji: '📘',
            color: SUBJECT_COLORS[s.subjects.length % SUBJECT_COLORS.length],
          };
          s.subjects.push(subject);
        }
        const duplicate = s.schedule.some((c) => Number(c.day) === entry.day && c.start === entry.start && c.subjectId === subject.id);
        if (duplicate) continue;
        s.schedule.push({
          id: uid('c'),
          subjectId: subject.id,
          day: entry.day,
          start: entry.start,
          end: entry.end,
          teacher: entry.teacher,
          room: '',
        });
        created += 1;
      }
    });
    closeModal();
    toast(created ? `${created} clase${created === 1 ? '' : 's'} importada${created === 1 ? '' : 's'}` : 'No había clases nuevas');
    return;
  }

  if (kind === 'youtube') {
    const url = String(data.get('url') || '').trim();
    const title = String(data.get('title') || '').trim();
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
    if (!match) { toast('Ese link no parece de YouTube', 'warn'); return; }
    perlaDraft.youtube.push({ url, videoId: match[1], title: title || 'Video de YouTube' });
    closeModal();
    render();
    return;
  }

  if (kind === 'perla') {
    const text = String(data.get('text') || '').trim();
    sendPerla(text);
    return;
  }

  if (kind === 'name') {
    const student = String(data.get('student') || '').trim();
    update((s) => { s.student = student; });
    renameProfile(activeProfileId(), student);
    toast('Guardado');
    render();
    return;
  }

  if (kind === 'profile') {
    const name = String(data.get('name') || '').trim();
    if (!name) { toast('Poné un nombre', 'warn'); return; }
    createProfile(name);
    quizSession = null;
    cardsSession = null;
    knownBadges = null;
    lastAnimalId = null;
    closeModal();
    go({ view: 'hoy' });
    toast(`¡Hola, ${name}!`);
    return;
  }

  if (kind === 'onboarding') {
    const student = String(data.get('student') || '').trim();
    update((s) => { s.student = student; s.settings.onboarded = true; });
    if (student) renameProfile(activeProfileId(), student);
    closeModal();
    toast(`¡Bienvenida${student ? ', ' + student : ''}!`);
    render();
  }
});

document.addEventListener('change', (event) => {
  const input = event.target.closest('input[data-action="import-json"]');
  if (input && input.files && input.files[0]) {
    importBackup(input.files[0]);
    input.value = '';
  }
});

// Foto del horario y "materia nueva" desde el formulario de clase.
document.addEventListener('change', async (event) => {
  const photoInput = event.target.closest('input[data-role="schedule-photo"]');
  if (photoInput) {
    const file = (photoInput.files || [])[0];
    photoInput.value = '';
    if (!file) return;
    try {
      const saved = await saveFile(file);
      const previous = getState().schedulePhotoId;
      update((s) => { s.schedulePhotoId = saved.id; });
      if (previous) deleteImage(previous);
      toast('Foto del horario guardada');
    } catch (err) {
      console.error(err);
      toast('No pude subir esa foto', 'warn');
    }
    return;
  }

  const subjectSelect = event.target.closest('form[data-form="clase"] select[name="subjectId"]');
  if (subjectSelect) {
    const field = subjectSelect.closest('form').querySelector('[data-new-subject]');
    if (field) {
      field.hidden = subjectSelect.value !== '__new';
      if (!field.hidden) field.querySelector('input')?.focus();
    }
  }
});

// Fotos de apuntes y de planes: se achican, se guardan y se muestran al instante.
document.addEventListener('change', async (event) => {
  const noteInput = event.target.closest('input[data-role="note-photo"]');
  const planInput = event.target.closest('input[data-role="plan-photo"]');
  const input = noteInput || planInput;
  if (!input) return;
  const isNote = Boolean(noteInput);
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length) return;
  if (!(isNote ? noteDraft : planDraft)) return;
  const grid = document.querySelector('[data-photo-grid]');
  if (!grid) return;

  let processing = grid.querySelector('.photo-processing');
  if (!processing) {
    processing = document.createElement('div');
    processing.className = 'photo-processing';
    processing.textContent = 'Procesando…';
    grid.appendChild(processing);
  }

  for (const file of files) {
    if (!file.type || !file.type.startsWith('image/')) continue;
    try {
      const saved = await saveFile(file);
      const draft = isNote ? noteDraft : planDraft;
      if (!draft) {
        deleteImage(saved.id);
        continue;
      }
      if (isNote) {
        draft.ids.push(saved.id);
        draft.newIds.add(saved.id);
      } else {
        draft.images.push(saved.id);
        draft.newImages.add(saved.id);
      }

      const figure = document.createElement('figure');
      figure.className = 'photo-thumb';
      figure.dataset.id = saved.id;

      const img = document.createElement('img');
      img.dataset.imageId = saved.id;
      img.dataset.loaded = '1';
      img.src = saved.url;
      img.alt = isNote ? 'Foto del apunte' : 'Foto del plan';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'photo-remove';
      remove.dataset.action = isNote ? 'remove-note-photo' : 'remove-plan-photo';
      remove.dataset.id = saved.id;
      remove.setAttribute('aria-label', 'Quitar foto');
      remove.textContent = '✕';

      figure.append(img, remove);
      grid.insertBefore(figure, processing);
    } catch (err) {
      console.error(err);
      toast('No pude agregar esa foto', 'warn');
    }
  }
  processing.remove();
});

document.addEventListener('modal:closed', () => { discardNoteDraft(); discardPlanDraft(); });

// Elegir el animal de cada nivel (se intercambian si ya estaba usado).
document.addEventListener('change', (event) => {
  const select = event.target.closest('select[data-action="set-level-animal"]');
  if (!select) return;
  const levelIndex = Number(select.dataset.level);
  const animalId = select.value;
  update((s) => {
    const ids = orderedAnimals(s.settings.animalOrder).map((animal) => animal.id);
    const existing = ids.indexOf(animalId);
    if (existing !== -1 && existing !== levelIndex) {
      const other = ids[levelIndex];
      ids[levelIndex] = animalId;
      ids[existing] = other;
    } else {
      ids[levelIndex] = animalId;
    }
    s.settings.animalOrder = ids;
  });
});

// Foto del personaje del perfil (se habilita desde el nivel 8).
document.addEventListener('change', async (event) => {
  const input = event.target.closest('input[data-role="avatar-photo"]');
  if (!input) return;
  const file = (input.files || [])[0];
  input.value = '';
  if (!file) return;
  try {
    const saved = await saveFile(file);
    const previous = getState().avatarPhotoId;
    update((s) => { s.avatarPhotoId = saved.id; });
    if (previous) deleteImage(previous);
    toast('Personaje actualizado');
  } catch (err) {
    console.error(err);
    toast('No pude subir esa foto', 'warn');
  }
});

// Fotos que se mandan a Perla en el chat.
document.addEventListener('change', async (event) => {
  const input = event.target.closest('input[data-role=perla-photo]');
  if (!input) return;
  const file = (input.files || [])[0];
  input.value = '';
  if (!file) return;
  try {
    const saved = await saveFile(file);
    perlaDraft.images.push(saved.id);
    render();
  } catch (err) {
    console.error(err);
    toast('No pude subir esa foto', 'warn');
  }
});

// Buscar dentro de los apuntes sin volver a dibujar (para no perder el foco).
document.addEventListener('input', (event) => {
  const search = event.target.closest('[data-role="note-search"]');
  if (!search) return;
  const term = search.value.trim().toLowerCase();
  let visible = 0;
  for (const card of document.querySelectorAll('.note-card')) {
    const haystack = card.dataset.search || card.textContent.toLowerCase();
    const show = !term || haystack.includes(term);
    card.hidden = !show;
    if (show) visible += 1;
  }
  const empty = document.querySelector('.notes-empty');
  if (empty) empty.hidden = visible > 0;
});

/* ----------------------------- Teclado ----------------------------- */

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isModalOpen()) {
    closeModal();
    return;
  }
  if (isModalOpen()) return;
  if (route.view === 'tarjetas' && cardsSession && !cardsSession.finished) {
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      cardsSession.flipped = !cardsSession.flipped;
      render();
      return;
    }
    if (cardsSession.flipped && (event.key === '1' || event.key === '2')) {
      event.preventDefault();
      answerCard(cardsSession, event.key === '2');
      if (cardsSession.finished) recordCardsIfNeeded();
      render();
      return;
    }
    return;
  }
  if (route.view !== 'quiz' || !quizSession) return;
  const item = currentItem(quizSession);
  if (!item) return;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

  if (item.ok === null && /^[1-9]$/.test(event.key)) {
    const index = Number(event.key) - 1;
    if (index < item.options.length) {
      answerCurrent(quizSession, index);
      render();
    }
  } else if (item.ok !== null && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    nextQuestion(quizSession);
    if (quizSession.finished) recordIfNeeded();
    render();
  }
});

/* --------------------------- Arranque --------------------------- */

// Cualquier cambio en los datos vuelve a dibujar la vista actual.
subscribe(() => {
  render();
  schedulePush();
});

render();

if (!state.student && !state.settings.onboarded) {
  showModal('onboarding');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker no registrado', err);
    });
  });
}

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && route.view === 'hoy') render();
});

