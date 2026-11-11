// Vistas de la app: devuelven HTML y la app se encarga de los eventos.
import { esc, initials, progressRing, hexToRgba } from './ui.js';
import {
  addDays, countdownLabel, diffDays, fmtLong, fmtMedium, fmtNumeric, fmtShort,
  monthLabel, monthMatrix, relativeLabel, todayISO, WEEKDAYS_SHORT,
} from './dates.js';
import {
  achievements, activeProfileId, classesOfDay, classesToday, examsSorted, levelInfo,
  listProfiles, masteryOf, notesOf, notesSorted, pastExams, questionsOf, scheduleSorted,
  planStations, streak, studyPlan, studyStats, subjectById, subjectsSorted, tasksForDate,
  undatedPlans, upcomingExams, wrongQuestions, xpForLevel,
} from './store.js';
import { gradeMessage, cardSummary, stationQuestions } from './quiz.js';
import { ANIMALS, animalAvatar, animalForLevel, orderedAnimals } from './animals.js';
import { cloudSnapshot } from './cloud.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const PLAN_KINDS = {
  examen: { label: 'Examen', emoji: '📝', hint: 'Con fecha y cuenta regresiva' },
  test: { label: 'Test', emoji: '🧪', hint: 'Un control corto con fecha' },
  estudio: { label: 'Solo estudiar', emoji: '📚', hint: 'Sin fecha, a tu ritmo' },
};

export function planKind(plan) {
  return PLAN_KINDS[plan && plan.type] || PLAN_KINDS.examen;
}

const ICON_EDIT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>';
const ICON_PERSON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"></circle><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"></path></svg>';

function subjectStyle(subject) {
  const color = subject ? subject.color : '#ec4899';
  return `--subject:${color};--subject-soft:${hexToRgba(color, 0.12)};--subject-line:${hexToRgba(color, 0.28)}`;
}

function subjectChip(subject) {
  if (!subject) return '<span class="subject-chip">Materia</span>';
  return `<span class="subject-chip" style="${subjectStyle(subject)}"><span class="dot"></span>${esc(subject.emoji || '📘')} ${esc(subject.name)}</span>`;
}

function emptyState({ emoji, title, text, actionLabel, actionAttrs }) {
  return `
    <div class="empty">
      <div class="empty-emoji">${emoji}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${actionLabel ? `<button class="btn btn-primary" ${actionAttrs}>${esc(actionLabel)}</button>` : ''}
    </div>`;
}

function scoreTone(percent) {
  if (percent >= 80) return 'good';
  if (percent >= 55) return 'mid';
  return 'low';
}

/* ============================== HOY ============================== */

export function renderHoy(state, { today }) {
  const name = (state.student || '').trim();
  const upcoming = upcomingExams(state, today);
  const next = upcoming[0] || null;
  const nextSubject = next ? subjectById(next.subjectId, state) : null;
  const tasks = tasksForDate(today, state);
  const week = upcoming.filter((e) => diffDays(today, e.date) <= 7);
  const studied = streak(state, today);
  const level = levelInfo(state.xp || 0);

  const heroSub = next
    ? `Lo que viene: <strong>${esc(nextSubject ? nextSubject.name : 'examen')}</strong> ${esc(relativeLabel(next.date, today))}.`
    : 'Todavía no hay exámenes cargados. Cargá el primero y armamos el plan.';

  const heroActions = `
    <div class="hero-actions">
      ${next
        ? `<button type="button" class="btn btn-primary" data-action="start-quiz" data-subject="${esc(next.subjectId)}">Practicar ${esc(nextSubject ? nextSubject.name : '')}</button>`
        : `<button type="button" class="btn btn-primary" data-action="add-exam">Cargar un examen</button>`}
      <button type="button" class="btn btn-ghost" data-action="nav" data-view="calendario">Ver calendario</button>
    </div>`;

  const hero = `
    <section class="hero">
      <div class="hero-main">
        <p class="eyebrow">${esc(fmtLong(today))}</p>
        <h1>${name ? `Hola, ${esc(name)}` : 'Hola'} <span class="wave" aria-hidden="true">👋</span></h1>
        <p class="hero-sub">${heroSub}</p>
        ${heroActions}
      </div>
      <div class="hero-side">
        <div class="hero-level">
          <div class="level-ring">
            ${progressRing(level.progress, '#9d174d', 58, 6)}
            <span>Nv ${level.level}</span>
          </div>
          <div class="hero-level-copy">
            <strong>${level.xp} XP</strong>
            <small>${level.need - level.inLevel} XP para el nivel ${level.level + 1}</small>
          </div>
        </div>
        <div class="streak ${studied ? 'is-hot' : ''}">
          <span class="streak-flame" aria-hidden="true">${studied ? '🔥' : '🌱'}</span>
          <strong>${studied}</strong>
          <small>${studied === 1 ? 'día seguido' : 'días seguidos'}</small>
        </div>
      </div>
    </section>`;

  const nextPanel = next
    ? `
      <section class="card exam-spotlight" style="${subjectStyle(nextSubject)}">
        <div class="card-head">
          <span class="kind-chip">${planKind(next).emoji} ${esc(planKind(next).label)}</span>
          ${subjectChip(nextSubject)}
          <span class="countdown">${esc(countdownLabel(next.date, today))}</span>
        </div>
        <h2 class="card-title">${esc(next.title)}</h2>
        <p class="muted">${esc(fmtLong(next.date))}</p>
        ${renderTopics(next, state)}
        <div class="card-actions">
          <button type="button" class="btn btn-soft" data-action="open-plan" data-id="${esc(next.id)}">Ver plan</button>
          <button type="button" class="btn btn-soft" data-action="start-quiz" data-subject="${esc(next.subjectId)}">Practicar</button>
          <button type="button" class="btn btn-plain" data-action="share-exam" data-id="${esc(next.id)}">Compartir</button>
          <button type="button" class="btn btn-plain" data-action="export-ics">A la agenda</button>
        </div>
      </section>`
    : `<section class="card">${emptyState({
        emoji: '🗓️',
        title: 'Sin exámenes a la vista',
        text: 'Cuando cargues una fecha, acá vas a ver la cuenta regresiva y el plan de repaso.',
        actionLabel: 'Agregar examen',
        actionAttrs: 'data-action="add-exam"',
      })}</section>`;

  const tasksDone = tasks.filter((t) => t.done).length;
  const todayPlans = (state.exams || []).filter((plan) => plan.date === today);
  const tasksPanel = `
    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Para hoy</h2>
        ${todayPlans.length
          ? `<span class="pill">${todayPlans.length} ${todayPlans.length === 1 ? 'examen/test' : 'exámenes/tests'}</span>`
          : (tasks.length ? `<span class="pill">${tasksDone}/${tasks.length}</span>` : '')}
      </div>
      ${todayPlans.length ? `
        <ul class="today-plans">
          ${todayPlans.map((plan) => {
            const kind = planKind(plan);
            const sub = subjectById(plan.subjectId, state);
            return `
              <li class="today-plan" data-action="open-plan" data-id="${esc(plan.id)}" role="button" tabindex="0">
                <span class="kind-chip">${kind.emoji} ${esc(kind.label)} hoy</span>
                <div class="today-plan-body">
                  <strong>${esc(plan.title)}</strong>
                  <small>${esc(sub ? sub.name : '')}</small>
                </div>
                <span class="icon-btn" aria-hidden="true">›</span>
              </li>`;
          }).join('')}
        </ul>` : ''}
      ${tasks.length
        ? `<ul class="task-list">${tasks.map((task) => {
            const sub = subjectById(task.exam.subjectId, state);
            return `
              <li class="task ${task.done ? 'is-done' : ''}">
                <button type="button" class="task-check" data-action="toggle-task" data-key="${esc(task.key)}" data-done="${task.done ? '1' : '0'}" aria-label="${task.done ? 'Marcar como pendiente' : 'Marcar como hecho'}">
                  ${task.done ? '✓' : ''}
                </button>
                <div class="task-body">
                  <span class="task-topic">${esc(task.topic)}</span>
                  <span class="task-meta">${esc(sub ? sub.name : '')} · ${esc(task.exam.title)}</span>
                </div>
              </li>`;
          }).join('')}</ul>`
        : (todayPlans.length
          ? '<p class="muted small">Hoy tenés examen/test. No hay tareas de repaso cargadas: podés practicar con preguntas o tarjetas.</p>'
          : `<p class="muted small">Hoy no hay nada agendado. Podés adelantar repaso o practicar libremente.</p>
             <div class="card-actions"><button type="button" class="btn btn-soft" data-action="start-quiz" data-mode="mock">Hacer una práctica libre</button></div>`)}
    </section>`;

  const reminderDays = [1, 2, 3, 4, 5, 6, 7]
    .map((offset) => {
      const date = addDays(today, offset);
      return {
        date,
        tasks: tasksForDate(date, state),
        events: state.exams.filter((plan) => plan.date === date),
      };
    })
    .filter((day) => day.tasks.length || day.events.length);

  const weekPanel = reminderDays.length
    ? `
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">Próximos días</h2>
          <button type="button" class="btn btn-plain btn-small" data-action="nav" data-view="calendario">Ver calendario</button>
        </div>
        <div class="reminder-days">
          ${reminderDays.map((day) => `
            <div class="reminder-day">
              <div class="reminder-date">
                <strong>${esc(String(Number(day.date.slice(8, 10))))}</strong>
                <span>${esc(relativeLabel(day.date, today))}</span>
              </div>
              <ul class="reminder-items">
                ${day.events.map((plan) => {
                  const sub = subjectById(plan.subjectId, state);
                  const kind = planKind(plan);
                  return `
                    <li class="reminder-event" style="${subjectStyle(sub)}" data-action="open-plan" data-id="${esc(plan.id)}" role="button" tabindex="0">
                      <span class="kind-chip">${kind.emoji} ${esc(kind.label)}</span>
                      <span class="reminder-text">${esc(plan.title)}</span>
                      <small>${esc(sub ? sub.name : '')}</small>
                    </li>`;
                }).join('')}
                ${day.tasks.map((task) => {
                  const sub = subjectById(task.exam.subjectId, state);
                  return `
                    <li class="reminder-task ${task.done ? 'is-done' : ''}">
                      <button type="button" class="task-check" data-action="toggle-task" data-key="${esc(task.key)}" data-done="${task.done ? '1' : '0'}" aria-label="${task.done ? 'Marcar como pendiente' : 'Marcar como hecho'}">${task.done ? '✓' : ''}</button>
                      <span class="reminder-text">${esc(task.topic)}</span>
                      <small>${esc(sub ? sub.name : '')}</small>
                    </li>`;
                }).join('')}
              </ul>
            </div>`).join('')}
        </div>
      </section>`
    : '';

  const subjects = subjectsSorted(state).filter((s) => questionsOf(s.id, state).length);
  const progressPanel = subjects.length
    ? `
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">Cómo venís</h2>
          <button type="button" class="btn btn-plain btn-small" data-action="nav" data-view="materias">Materias</button>
        </div>
        <ul class="mastery-list">
          ${subjects.map((subject) => {
            const value = masteryOf(subject.id, state);
            const pct = Math.round(value * 100);
            const answered = questionsOf(subject.id, state).some((q) => q.stats);
            return `
              <li class="mastery-row" style="${subjectStyle(subject)}">
                <span class="mastery-emoji">${esc(subject.emoji || '📘')}</span>
                <div class="mastery-body">
                  <div class="mastery-top"><span>${esc(subject.name)}</span><span class="muted small">${answered ? pct + '%' : 'sin practicar'}</span></div>
                  <div class="bar"><i style="width:${answered ? pct : 0}%"></i></div>
                </div>
              </li>`;
          }).join('')}
        </ul>
      </section>`
    : '';

  return `
    ${hero}
    <div class="grid-2">${nextPanel}${tasksPanel}</div>
    ${renderFreePlans(state)}
    ${renderTodayClasses(state, { today })}
    ${weekPanel}
    ${progressPanel}
  `;
}

function renderFreePlans(state) {
  const plans = undatedPlans(state);
  if (!plans.length) return '';
  return `
    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Solo por estudiar</h2>
        <button type="button" class="btn btn-plain btn-small" data-action="add-exam">+ Nuevo plan</button>
      </div>
      <ul class="agenda">
        ${plans.map((plan) => {
          const subject = subjectById(plan.subjectId, state);
          const planData = studyPlan(plan, state);
          const done = planData.items.filter((item) => item.done).length;
          return `
            <li class="agenda-item" style="${subjectStyle(subject)}" data-action="open-plan" data-id="${esc(plan.id)}" role="button" tabindex="0">
              <div class="agenda-date"><strong>${planData.items.length}</strong><span>temas</span></div>
              <div class="agenda-body">
                <span class="agenda-title">${esc(plan.title)}</span>
                <span class="agenda-meta">${esc(subject ? subject.name : 'Materia')} · ${done}/${planData.items.length} repasados · sin fecha</span>
              </div>
              <span class="icon-btn" aria-hidden="true">›</span>
            </li>`;
        }).join('')}
      </ul>
    </section>`;
}

function renderTopics(exam, state) {
  if (!exam.topics || !exam.topics.length) {
    return `<p class="muted small">Sin temas cargados todavía.</p>`;
  }
  const plan = studyPlan(exam, state);
  const done = plan.items.filter((i) => i.done).length;
  return `
    <div class="topics">
      <div class="topics-head">
        <span class="label">Temas</span>
        ${plan.items.length ? `<span class="muted small">${done}/${plan.items.length} repasados</span>` : ''}
      </div>
      <ul class="topic-list">
        ${exam.topics.map((topic) => `<li>${esc(topic)}</li>`).join('')}
      </ul>
    </div>`;
}

/* ========================= CALENDARIO ========================= */

export function renderCalendario(state, { today, month }) {
  const cells = monthMatrix(month.year, month.month);
  const byDate = new Map();
  for (const exam of state.exams) {
    if (!exam.date) continue;
    if (!byDate.has(exam.date)) byDate.set(exam.date, []);
    byDate.get(exam.date).push(exam);
  }

  const upcoming = upcomingExams(state, today).slice(0, 5);

  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">Calendario</p>
        <h1 class="page-title">Tus exámenes</h1>
      </div>
      <button type="button" class="btn btn-primary" data-action="add-exam">+ Nuevo plan</button>
    </section>

    <section class="card calendar-card">
      <div class="cal-head">
        <div class="cal-title">
          <h2>${esc(monthLabel(month.year, month.month))}</h2>
        </div>
        <div class="cal-nav">
          <button type="button" class="icon-btn" data-action="cal-shift" data-delta="-1" aria-label="Mes anterior">‹</button>
          <button type="button" class="btn btn-plain btn-small" data-action="cal-today">Hoy</button>
          <button type="button" class="icon-btn" data-action="cal-shift" data-delta="1" aria-label="Mes siguiente">›</button>
        </div>
      </div>

      <div class="cal-weekdays" aria-hidden="true">
        ${WEEKDAYS_SHORT.map((d) => `<span>${esc(d)}</span>`).join('')}
      </div>

      <div class="cal-grid" role="grid">
        ${cells.map((cell) => {
          const exams = byDate.get(cell.iso) || [];
          const shown = exams.slice(0, 2);
          const hidden = exams.length - shown.length;
          return `
            <div class="cal-day ${cell.inMonth ? '' : 'is-out'} ${cell.iso === today ? 'is-today' : ''} ${exams.length ? 'has-exams' : ''}"
                 role="gridcell" tabindex="0" data-action="select-day" data-date="${cell.iso}"
                 aria-label="${esc(fmtLong(cell.iso))}${exams.length ? ', ' + exams.length + ' examen(es)' : ''}">
              <span class="cal-num">${cell.day}</span>
              <div class="cal-chips">
                ${shown.map((exam) => {
                  const sub = subjectById(exam.subjectId, state);
                  return `<span class="cal-chip" style="${subjectStyle(sub)}" title="${esc(exam.title)}"><i></i>${esc(sub ? sub.name : '')}</span>`;
                }).join('')}
                ${hidden > 0 ? `<span class="cal-more">+${hidden}</span>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="cal-legend">
        ${state.subjects.map((s) => `<span class="legend-item" style="${subjectStyle(s)}"><i></i>${esc(s.name)}</span>`).join('')}
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Próximos exámenes y tests</h2>
      </div>
      ${upcoming.length
        ? `<ul class="agenda">${upcoming.map((exam) => {
            const sub = subjectById(exam.subjectId, state);
            const kind = planKind(exam);
            return `
              <li class="agenda-item" style="${subjectStyle(sub)}">
                <div class="agenda-date">
                  <strong>${esc(String(Number(exam.date.slice(8, 10))))}</strong>
                  <span>${esc(fmtShort(exam.date).split(' ').slice(1).join(' '))}</span>
                </div>
                <div class="agenda-body">
                  <span class="agenda-title">${esc(exam.title)}</span>
                  <span class="agenda-meta">${kind.emoji} ${esc(kind.label)} · ${esc(sub ? sub.name : '')} · ${esc(relativeLabel(exam.date, today))}</span>
                </div>
                <button type="button" class="btn btn-plain btn-small" data-action="open-plan" data-id="${esc(exam.id)}">Ver plan</button>
              </li>`;
          }).join('')}</ul>`
        : `<p class="muted">No hay exámenes futuros cargados.</p>`}
    </section>

    ${pastExams(state, today).length ? `
      <section class="card">
        <h2 class="card-title">Ya pasaron</h2>
        <ul class="agenda is-muted">
          ${pastExams(state, today).slice(0, 5).map((exam) => {
            const sub = subjectById(exam.subjectId, state);
            return `
              <li class="agenda-item" style="${subjectStyle(sub)}">
                <div class="agenda-date"><strong>${esc(String(Number(exam.date.slice(8, 10))))}</strong><span>${esc(fmtShort(exam.date).split(' ').slice(1).join(' '))}</span></div>
                <div class="agenda-body">
                  <span class="agenda-title">${esc(exam.title)}</span>
                  <span class="agenda-meta">${esc(sub ? sub.name : '')} · ${esc(relativeLabel(exam.date, today))}</span>
                </div>
              </li>`;
          }).join('')}
        </ul>
      </section>` : ''}
  `;
}

export function renderDaySheet(state, date) {
  const exams = examsSorted(state).filter((e) => e.date === date);
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">${esc(relativeLabel(date))}</p>
        <h2>${esc(fmtLong(date))}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    ${exams.length
      ? `<ul class="sheet-list">${exams.map((exam) => {
          const sub = subjectById(exam.subjectId, state);
          const plan = studyPlan(exam, state);
          const done = plan.items.filter((i) => i.done).length;
          return `
            <li class="sheet-item" style="${subjectStyle(sub)}">
              <div class="sheet-top">
                <span class="kind-chip">${planKind(exam).emoji} ${esc(planKind(exam).label)}</span>
                ${subjectChip(sub)}
                <span class="countdown">${esc(countdownLabel(exam.date))}</span>
              </div>
              <h3>${esc(exam.title)}</h3>
              ${exam.topics && exam.topics.length ? `<p class="muted small">Temas: ${esc(exam.topics.join(' · '))}</p>` : ''}
              ${plan.items.length ? `<p class="muted small">Plan: ${done}/${plan.items.length} temas repasados</p>` : ''}
              ${exam.notes ? `<p class="note">${esc(exam.notes)}</p>` : ''}
              <div class="sheet-actions">
                <button type="button" class="btn btn-soft btn-small" data-action="open-plan" data-id="${esc(exam.id)}">Ver plan</button>
                <button type="button" class="btn btn-plain btn-small" data-action="start-quiz" data-subject="${esc(exam.subjectId)}">Practicar</button>
                <button type="button" class="btn btn-plain btn-small" data-action="edit-exam" data-id="${esc(exam.id)}">Editar</button>
                <button type="button" class="btn btn-plain btn-small" data-action="share-exam" data-id="${esc(exam.id)}">Compartir</button>
                <button type="button" class="btn btn-danger btn-small" data-action="delete-exam" data-id="${esc(exam.id)}">Borrar</button>
              </div>
            </li>`;
        }).join('')}</ul>`
      : `<p class="muted">Ese día no hay exámenes.</p>`}
    <div class="modal-foot">
      <button type="button" class="btn btn-primary btn-block" data-action="add-exam" data-date="${esc(date)}">+ Agregar plan este día</button>
    </div>`;
}

/* ========================== HORARIO ========================== */

export const DAYS = [
  { n: 1, name: 'Lunes', short: 'Lun' },
  { n: 2, name: 'Martes', short: 'Mar' },
  { n: 3, name: 'Miércoles', short: 'Mié' },
  { n: 4, name: 'Jueves', short: 'Jue' },
  { n: 5, name: 'Viernes', short: 'Vie' },
];

export function dayName(number) {
  const day = DAYS.find((d) => d.n === Number(number));
  return day ? day.name : 'Lunes';
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function classCard(clase, state, todayNumber, nowMinutes) {
  const subject = subjectById(clase.subjectId, state);
  const isNow = Number(clase.day) === todayNumber
    && nowMinutes >= toMinutes(clase.start)
    && nowMinutes < toMinutes(clase.end);
  return `
    <div class="class-card ${isNow ? 'is-now' : ''}" style="${subjectStyle(subject)}" data-action="edit-class" data-id="${esc(clase.id)}" role="button" tabindex="0">
      <span class="class-time">${esc(clase.start)}–${esc(clase.end)}${isNow ? '<em>ahora</em>' : ''}</span>
      <span class="class-subject">${esc(subject ? subject.emoji || '📘' : '📘')} ${esc(subject ? subject.name : 'Materia')}</span>
      ${clase.teacher ? `<span class="class-teacher">${ICON_PERSON} ${esc(clase.teacher)}</span>` : ''}
      ${clase.room ? `<span class="class-room">${esc(clase.room)}</span>` : ''}
    </div>`;
}

export function renderHorario(state, { today }) {
  const all = scheduleSorted(state);
  const todayNumber = new Date(`${today}T12:00:00`).getDay();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const days = DAYS;

  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">Horario</p>
        <h1 class="page-title">Tu semana</h1>
        <p class="muted small">Tocá una clase para cambiar la materia, el profe o el horario.</p>
      </div>
      <button type="button" class="btn btn-primary" data-action="add-class">+ Agregar clase</button>
    </section>

    <section class="card schedule-photo-card">
      <div class="card-head">
        <h2 class="card-title">Foto del horario</h2>
        <button type="button" class="btn btn-plain btn-small" data-action="import-schedule">Importar texto</button>
      </div>
      ${state.schedulePhotoId ? `
        <div class="schedule-photo">
          <button type="button" class="schedule-photo-btn" data-action="open-photo" data-image-id="${esc(state.schedulePhotoId)}" aria-label="Ver la foto del horario">
            <img data-image-id="${esc(state.schedulePhotoId)}" alt="Foto del horario">
          </button>
          <div class="schedule-photo-actions">
            <label class="btn btn-plain btn-small file-btn">
              Cambiar foto
              <input type="file" accept="image/*" data-role="schedule-photo">
            </label>
            <button type="button" class="btn btn-soft btn-small" data-action="ai-schedule">✨ Leer con IA</button>
            <button type="button" class="btn btn-danger btn-small" data-action="delete-schedule-photo">Quitar</button>
          </div>
        </div>`
      : `<label class="schedule-photo-empty">
          <input type="file" accept="image/*" data-role="schedule-photo" hidden>
          <span class="btn btn-soft">📷 Subir foto del horario</span>
          <small class="muted">Guardala acá para consultarla mientras cargás las clases (o para importarla con texto).</small>
        </label>`}
    </section>

    ${all.length ? `
      <div class="schedule-scroll">
        <div class="schedule-board">
          ${days.map((day) => {
            const classes = classesOfDay(day.n, state);
            const isToday = day.n === todayNumber;
            return `
              <section class="day-col ${isToday ? 'is-today' : ''}">
                <header class="day-head">
                  <strong>${esc(day.name)}</strong>
                  <span>${classes.length ? `${classes.length} ${classes.length === 1 ? 'clase' : 'clases'}` : 'libre'}</span>
                </header>
                <div class="day-classes">
                  ${classes.map((clase) => classCard(clase, state, todayNumber, nowMinutes)).join('')}
                  <button type="button" class="add-class-mini" data-action="add-class" data-day="${day.n}" aria-label="Agregar clase el ${esc(day.name)}">+</button>
                </div>
              </section>`;
          }).join('')}
        </div>
      </div>` : `<section class="card">${emptyState({
            emoji: '🕒',
            title: 'Todavía no cargaste el horario',
            text: 'Agregá cada clase con la materia, el día, la hora y el nombre del profe. Después lo ves todo junto en la semana.',
            actionLabel: 'Cargar la primera clase',
            actionAttrs: 'data-action="add-class"',
          })}</section>`}
  `;
}

export function renderTodayClasses(state, { today }) {
  if (!scheduleSorted(state).length) return '';
  const classes = classesToday(today, state);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return `
    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Hoy en el cole</h2>
        <button type="button" class="btn btn-plain btn-small" data-action="nav" data-view="horario">Ver horario</button>
      </div>
      ${classes.length
        ? `<ul class="today-classes">${classes.map((clase) => {
            const subject = subjectById(clase.subjectId, state);
            const isNow = nowMinutes >= toMinutes(clase.start) && nowMinutes < toMinutes(clase.end);
            return `
              <li class="today-class ${isNow ? 'is-now' : ''}" style="${subjectStyle(subject)}">
                <span class="today-class-time">${esc(clase.start)}<i>${esc(clase.end)}</i></span>
                <div class="today-class-body">
                  <span class="today-class-subject">${esc(subject ? subject.emoji || '📘' : '📘')} ${esc(subject ? subject.name : 'Materia')}</span>
                  ${clase.teacher ? `<span class="today-class-meta">${esc(clase.teacher)}${clase.room ? ' · ' + esc(clase.room) : ''}</span>` : ''}
                </div>
                ${isNow ? '<span class="pill">Ahora</span>' : ''}
              </li>`;
          }).join('')}</ul>`
        : '<p class="muted small">Hoy no hay clases cargadas. Podés descansar o adelantar estudio.</p>'}
    </section>`;
}

export function renderClaseForm(state, { clase = null, day = null } = {}) {
  const editing = Boolean(clase);
  const value = clase || {
    subjectId: state.subjects[0]?.id || '',
    day: day != null ? Number(day) : 1,
    start: '08:00',
    end: '09:20',
    teacher: '',
    room: '',
  };
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">${editing ? 'Editar' : 'Nueva'}</p>
        <h2>${editing ? 'Editar clase' : 'Agregar clase'}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <form class="form" data-form="clase" data-id="${esc(clase ? clase.id : '')}">
      <div class="field-row">
        <label class="field">
          <span>Materia</span>
          <select name="subjectId" required>
            ${state.subjects.map((s) => `<option value="${esc(s.id)}" ${s.id === value.subjectId ? 'selected' : ''}>${esc(s.emoji || '📘')} ${esc(s.name)}</option>`).join('')}
            <option value="__new">＋ Nueva materia…</option>
          </select>
        </label>
        <label class="field">
          <span>Día</span>
          <select name="day" required>
            ${DAYS.map((d) => `<option value="${d.n}" ${Number(value.day) === d.n ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
          </select>
        </label>
      </div>
      <label class="field" data-new-subject hidden>
        <span>Nombre de la materia nueva</span>
        <input type="text" name="newSubject" placeholder="Ej.: Lengua" maxlength="40">
      </label>
      <div class="field-row">
        <label class="field">
          <span>Desde</span>
          <input type="time" name="start" value="${esc(value.start)}" required>
        </label>
        <label class="field">
          <span>Hasta</span>
          <input type="time" name="end" value="${esc(value.end)}" required>
        </label>
      </div>
      <label class="field">
        <span>Profesor/a</span>
        <input type="text" name="teacher" value="${esc(value.teacher || '')}" placeholder="Ej.: Laura Gómez" maxlength="60">
      </label>
      <label class="field">
        <span>Aula (opcional)</span>
        <input type="text" name="room" value="${esc(value.room || '')}" placeholder="Ej.: Aula 3" maxlength="30">
      </label>
      <div class="modal-foot">
        ${editing ? `<button type="button" class="btn btn-danger btn-small" data-action="delete-class" data-id="${esc(clase.id)}">Borrar clase</button>` : '<span></span>'}
        <div class="foot-right">
          <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">${editing ? 'Guardar cambios' : 'Agregar clase'}</button>
        </div>
      </div>
    </form>`;
}

export function renderImportSchedule() {
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">Importar</p>
        <h2>Importar horario</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <p class="muted small">Pegá el texto del horario, una clase por línea. Ejemplo: <strong>Lunes 08:00-09:20 Matemática - Laura Gómez</strong>.</p>
    <form class="form" data-form="import-schedule">
      <label class="field">
        <span>Texto del horario</span>
        <textarea name="text" rows="8" placeholder="Lunes 08:00-09:20 Matemática - Laura Gómez&#10;Martes 09:30-10:50 Historia - Diego Fernández"></textarea>
      </label>
      <p class="muted small">Si una materia no existe, se crea sola. También podés pegar el texto que copia iOS desde la foto del horario (Live Text).</p>
      <div class="modal-foot">
        <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">Importar clases</button>
      </div>
    </form>`;
}

/* ========================== MATERIAS ========================== */
export function renderMaterias(state) {
  const subjects = subjectsSorted(state);
  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">Materias</p>
        <h1 class="page-title">Qué estás estudiando</h1>
      </div>
      <button type="button" class="btn btn-primary" data-action="add-subject">+ Agregar materia</button>
    </section>
    ${subjects.length
      ? `<div class="subject-grid">${subjects.map((subject) => {
          const qs = questionsOf(subject.id, state);
          const examsCount = state.exams.filter((e) => e.subjectId === subject.id).length;
          const value = masteryOf(subject.id, state);
          const answered = qs.some((q) => q.stats);
          const pct = Math.round(value * 100);
          return `
            <div class="subject-card" style="${subjectStyle(subject)}" data-action="open-subject" data-id="${esc(subject.id)}" role="button" tabindex="0">
              <div class="subject-card-top">
                <span class="subject-emoji">${esc(subject.emoji || '📘')}</span>
                ${progressRing(value, subject.color, 54, 6)}
              </div>
              <h3>${esc(subject.name)}</h3>
              <p class="muted small">${qs.length} ${qs.length === 1 ? 'pregunta' : 'preguntas'} · ${examsCount} ${examsCount === 1 ? 'examen' : 'exámenes'}</p>
              <p class="mastery-caption">${answered ? `${pct}% de aciertos` : 'Todavía sin practicar'}</p>
              <div class="card-actions">
                <button type="button" class="btn btn-soft btn-small" data-action="start-quiz" data-subject="${esc(subject.id)}">Practicar</button>
                <span class="link-hint">Ver preguntas ›</span>
              </div>
            </div>`;
        }).join('')}</div>`
      : `<section class="card">${emptyState({
          emoji: '📚',
          title: 'Todavía no hay materias',
          text: 'Creá las materias que cursa y después cargale preguntas a cada una.',
          actionLabel: 'Agregar materia',
          actionAttrs: 'data-action="add-subject"',
        })}</section>`}
  `;
}

export function renderSubjectDetail(state, subject) {
  const qs = questionsOf(subject.id, state);
  const exams = examsSorted(state).filter((e) => e.subjectId === subject.id);
  const value = masteryOf(subject.id, state);
  const totalAnswers = qs.reduce((acc, q) => acc + ((q.stats?.correct || 0) + (q.stats?.wrong || 0)), 0);
  return `
    <button type="button" class="back" data-action="nav" data-view="materias">← Todas las materias</button>
    <section class="detail-head" style="${subjectStyle(subject)}">
      <span class="detail-emoji">${esc(subject.emoji || '📘')}</span>
      <div class="detail-copy">
        <h1>${esc(subject.name)}</h1>
        <p class="muted">${qs.length} ${qs.length === 1 ? 'pregunta' : 'preguntas'} · ${totalAnswers} ${totalAnswers === 1 ? 'respuesta' : 'respuestas'} · ${exams.length} ${exams.length === 1 ? 'examen' : 'exámenes'}</p>
      </div>
      <div class="detail-ring">
        ${progressRing(value, subject.color, 78, 8)}
        <span>${Math.round(value * 100)}%</span>
      </div>
    </section>

    <div class="detail-actions">
      <button type="button" class="btn btn-primary" data-action="start-quiz" data-subject="${esc(subject.id)}">Practicar</button>
      <button type="button" class="btn btn-soft" data-action="start-flashcards" data-subject="${esc(subject.id)}">Tarjetas</button>
      <button type="button" class="btn btn-plain" data-action="add-question" data-subject="${esc(subject.id)}">+ Nueva pregunta</button>
      <button type="button" class="btn btn-plain" data-action="edit-subject" data-id="${esc(subject.id)}">Editar materia</button>
    </div>

    ${renderSubjectNotes(state, subject)}

    ${exams.length ? `
      <section class="card">
        <h2 class="card-title">Planes de estudio</h2>
        <ul class="agenda">
          ${exams.map((exam) => {
            const kind = planKind(exam);
            return `
              <li class="agenda-item">
                ${exam.date
                  ? `<div class="agenda-date"><strong>${esc(String(Number(exam.date.slice(8, 10))))}</strong><span>${esc(fmtShort(exam.date).split(' ').slice(1).join(' '))}</span></div>`
                  : `<div class="agenda-date"><strong>${esc(kind.emoji)}</strong><span>sin fecha</span></div>`}
                <div class="agenda-body">
                  <span class="agenda-title">${esc(exam.title)}</span>
                  <span class="agenda-meta">${kind.emoji} ${esc(kind.label)}${exam.date ? ' · ' + esc(relativeLabel(exam.date)) : ' · a tu ritmo'}</span>
                </div>
                <button type="button" class="btn btn-plain btn-small" data-action="open-plan" data-id="${esc(exam.id)}">Ver plan</button>
              </li>`;
          }).join('')}
        </ul>
      </section>` : ''}

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Preguntas</h2>
        <span class="pill">${qs.length}</span>
      </div>
      ${qs.length
        ? `<ul class="question-list">${qs.map((q) => {
            const st = q.stats || {};
            return `
              <li class="question-row">
                <div class="question-body">
                  <span class="question-text">${esc(q.text)}</span>
                  <span class="question-meta">${q.topic ? esc(q.topic) + ' · ' : ''}${q.options.length} opciones
                    ${st.correct ? ` · <span class="ok">✓ ${st.correct}</span>` : ''}
                    ${st.wrong ? ` · <span class="bad">✗ ${st.wrong}</span>` : ''}
                  </span>
                </div>
                <div class="question-actions">
                  <button type="button" class="icon-btn" data-action="edit-question" data-id="${esc(q.id)}" aria-label="Editar pregunta">${ICON_EDIT}</button>
                  <button type="button" class="icon-btn danger" data-action="delete-question" data-id="${esc(q.id)}" aria-label="Borrar pregunta">${ICON_TRASH}</button>
                </div>
              </li>`;
          }).join('')}</ul>`
        : emptyState({
            emoji: '✏️',
            title: 'Sin preguntas todavía',
            text: 'Cargá preguntas de multiple choice sobre los temas que entran en el examen.',
            actionLabel: 'Nueva pregunta',
            actionAttrs: `data-action="add-question" data-subject="${esc(subject.id)}"`,
          })}
    </section>
  `;
}

/* =========================== PRÁCTICA =========================== */

export function renderPractica(state, { today }) {
  const totalQ = state.questions.length;
  const wrong = wrongQuestions(null, state);
  const attempts = state.attempts.slice(0, 6);
  const subjects = subjectsSorted(state).filter((s) => questionsOf(s.id, state).length);
  const notesCount = (state.notes || []).length;

  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">Práctica</p>
        <h1 class="page-title">A ver si aprendiste</h1>
      </div>
    </section>

    <div class="grid-3">
      <section class="card practice-hero">
        <span class="practice-emoji" aria-hidden="true">🎯</span>
        <h2>Examen simulado</h2>
        <p class="muted">10 preguntas mezcladas de todas las materias, como en un examen de verdad.</p>
        <button type="button" class="btn btn-primary" data-action="start-quiz" data-mode="mock" ${totalQ ? '' : 'disabled'}>Empezar</button>
      </section>
      <section class="card practice-hero">
        <span class="practice-emoji" aria-hidden="true">🃏</span>
        <h2>Tarjetas de estudio</h2>
        <p class="muted">Pregunta adelante, respuesta atrás. Ideal para repasar antes de dormir.</p>
        <button type="button" class="btn btn-soft" data-action="start-flashcards" ${totalQ ? '' : 'disabled'}>Repasar con tarjetas</button>
      </section>
      <section class="card practice-hero">
        <span class="practice-emoji" aria-hidden="true">🔁</span>
        <h2>Repasar las que fallé</h2>
        <p class="muted">${wrong.length ? `${wrong.length} ${wrong.length === 1 ? 'pregunta' : 'preguntas'} para volver a intentar.` : 'Cuando falles alguna, va a aparecer acá.'}</p>
        <button type="button" class="btn btn-soft" data-action="start-quiz" data-mode="review" ${wrong.length ? '' : 'disabled'}>Repasar</button>
      </section>
    </div>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Practicar por materia</h2>
        ${notesCount ? `<button type="button" class="btn btn-plain btn-small" data-action="nav" data-view="apuntes">Ver apuntes (${notesCount})</button>` : ''}
      </div>
      ${subjects.length
        ? `<div class="chip-row">${subjects.map((s) => `
            <button type="button" class="chip-btn" style="${subjectStyle(s)}" data-action="start-quiz" data-subject="${esc(s.id)}">
              <span>${esc(s.emoji || '📘')}</span>${esc(s.name)}
            </button>`).join('')}</div>`
        : `<p class="muted">Primero cargá materias y preguntas.</p>`}
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Últimos resultados</h2>
      </div>
      ${attempts.length
        ? `<ul class="attempt-list">${attempts.map((a) => {
            const sub = a.subjectId ? subjectById(a.subjectId, state) : null;
            const modeLabel = a.mode === 'mock' ? 'Examen simulado' : a.mode === 'review' ? 'Repaso' : 'Práctica';
            return `
              <li class="attempt-row">
                <div class="attempt-score ${scoreTone(a.percent)}">${a.percent}%</div>
                <div class="attempt-body">
                  <span class="attempt-title">${esc(sub ? sub.name : 'Mezcla')} · ${esc(modeLabel)}</span>
                  <span class="attempt-meta">${esc(fmtMedium(a.date))} · ${a.correct}/${a.total} bien</span>
                </div>
              </li>`;
          }).join('')}</ul>`
        : `<p class="muted">Todavía no hay resultados. Empezá con una práctica corta.</p>`}
    </section>
  `;
}

/* ============================ QUIZ ============================ */

export function renderQuiz(session, state) {
  if (!session) {
    return `<section class="card">${emptyState({
      emoji: '🤔',
      title: 'No hay preguntas para practicar',
      text: 'Cargá preguntas en alguna materia y volvé a intentar.',
      actionLabel: 'Ir a materias',
      actionAttrs: 'data-action="nav" data-view="materias"',
    })}</section>`;
  }
  if (session.finished) return renderQuizResult(session, state);

  const item = session.items[session.index];
  const subject = subjectById(item.question.subjectId, state);
  const answered = item.ok !== null;
  const progress = Math.round(((session.index + (answered ? 1 : 0)) / session.items.length) * 100);
  const modeLabel = session.mode === 'mock' ? 'Examen simulado' : session.mode === 'review' ? 'Repaso' : session.mode === 'station' ? 'Estación' : 'Práctica';

  return `
    <section class="quiz" style="${subjectStyle(subject)}">
      <div class="quiz-head">
        <button type="button" class="btn btn-plain btn-small" data-action="quit-quiz">← Salir</button>
        <div class="quiz-meta">
          <span class="subject-chip" style="${subjectStyle(subject)}"><span class="dot"></span>${esc(subject ? subject.name : 'Mezcla')}</span>
          <span class="muted small">${esc(modeLabel)}</span>
        </div>
        <span class="quiz-counter">${session.index + 1} / ${session.items.length}</span>
      </div>
      <div class="quiz-progress"><i style="width:${progress}%"></i></div>

      <div class="quiz-card">
        ${item.question.topic ? `<p class="eyebrow">${esc(item.question.topic)}</p>` : ''}
        <h1 class="quiz-question">${esc(item.question.text)}</h1>

        <div class="options">
          ${item.options.map((option, index) => {
            const isChosen = item.chosenIndex === index;
            let cls = '';
            if (answered) {
              if (option.correct) cls = 'is-correct';
              else if (isChosen) cls = 'is-wrong';
              else cls = 'is-dim';
            }
            return `
              <button type="button" class="option ${cls}" data-action="answer" data-index="${index}" ${answered ? 'disabled' : ''}>
                <span class="opt-letter">${LETTERS[index]}</span>
                <span class="opt-text">${esc(option.text)}</span>
                ${answered && option.correct ? '<span class="opt-mark">✓</span>' : ''}
                ${answered && isChosen && !option.correct ? '<span class="opt-mark">✗</span>' : ''}
              </button>`;
          }).join('')}
        </div>

        ${answered ? `
          <div class="feedback ${item.ok ? 'is-ok' : 'is-bad'}">
            <strong>${item.ok ? '¡Bien! 🎉' : `Casi: la correcta es "${esc(item.options.find((o) => o.correct).text)}"`}</strong>
            ${item.question.explanation ? `<p>${esc(item.question.explanation)}</p>` : ''}
          </div>
          <div class="quiz-foot">
            <button type="button" class="btn btn-primary btn-block" data-action="next-question">
              ${session.index === session.items.length - 1 ? 'Ver resultado' : 'Siguiente pregunta →'}
            </button>
          </div>` : `<p class="quiz-hint muted small">Elegí una opción. También podés usar las teclas 1–4.</p>`}
      </div>
    </section>`;
}

export function renderQuizResult(session, state) {
  const total = session.items.length;
  const correct = session.items.filter((i) => i.ok).length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const msg = gradeMessage(percent);
  const wrongItems = session.items.filter((i) => !i.ok);

  return `
    <section class="result">
      <div class="result-hero">
        <span class="result-emoji" aria-hidden="true">${msg.emoji}</span>
        <h1>${esc(msg.title)}</h1>
        <p class="muted">${esc(msg.text)}</p>
        <div class="result-score">
          <strong>${correct}</strong><span>/ ${total} bien</span>
        </div>
        <div class="result-bar"><i style="width:${percent}%"></i></div>
        <p class="muted small">${percent}% de aciertos</p>
      </div>

      <div class="result-actions">
        ${session.station
          ? `<button type="button" class="btn btn-primary" data-action="open-camino" data-id="${esc(session.station.planId)}">Volver al camino</button>
             <button type="button" class="btn btn-soft" data-action="open-station" data-plan="${esc(session.station.planId)}" data-key="${esc(session.station.key)}">Repetir estación</button>`
          : `${wrongItems.length ? `<button type="button" class="btn btn-primary" data-action="retry-wrong">Repetir las ${wrongItems.length} que fallé</button>` : ''}
             <button type="button" class="btn btn-soft" data-action="start-quiz" data-subject="${esc(session.subjectId || '')}" data-mode="practice">Practicar de nuevo</button>
             <button type="button" class="btn btn-plain" data-action="nav" data-view="practica">Volver a práctica</button>`}
      </div>

      <section class="card">
        <h2 class="card-title">Repaso de las respuestas</h2>
        <ul class="review-list">
          ${session.items.map((item, index) => `
            <li class="review-item ${item.ok ? 'is-ok' : 'is-bad'}">
              <span class="review-mark">${item.ok ? '✓' : '✗'}</span>
              <div class="review-body">
                <span class="review-q">${index + 1}. ${esc(item.question.text)}</span>
                <span class="review-a">Tu respuesta: ${esc(item.chosenIndex != null ? item.options[item.chosenIndex].text : '—')}</span>
                ${item.ok ? '' : `<span class="review-a strong">Correcta: ${esc(item.options.find((o) => o.correct).text)}</span>`}
                ${!item.ok && item.question.explanation ? `<span class="review-exp">${esc(item.question.explanation)}</span>` : ''}
              </div>
            </li>`).join('')}
        </ul>
      </section>
    </section>`;
}

/* ========================== APUNTES ========================== */

function noteDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function notePreview(body, max = 150) {
  const clean = String(body || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean;
}

function renderSubjectNotes(state, subject) {
  const notes = notesOf(subject.id, state);
  return `
    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Apuntes</h2>
        <button type="button" class="btn btn-soft btn-small" data-action="add-note" data-subject="${esc(subject.id)}">+ Nuevo apunte</button>
      </div>
      ${notes.length
        ? `<ul class="note-list">${notes.map((note) => noteRow(note, state, subject)).join('')}</ul>`
        : `<p class="muted small">Todavía no hay apuntes de ${esc(subject.name)}. Escribí un resumen y lo tenés siempre a mano.</p>`}
    </section>`;
}

function noteRow(note, state, subject) {
  const sub = subject || subjectById(note.subjectId, state);
  const photos = (note.images || []).length;
  return `
    <li class="note-card" style="${subjectStyle(sub)}" data-action="view-note" data-id="${esc(note.id)}" data-search="${esc((note.title + ' ' + note.body + ' ' + (sub ? sub.name : '')).toLowerCase())}" role="button" tabindex="0">
      <div class="note-card-top">
        ${subjectChip(sub)}
        <span class="note-card-meta">
          ${photos ? `<span class="photo-count">📷 ${photos}</span>` : ''}
          <span class="muted small">${esc(noteDate(note.updatedAt))}</span>
        </span>
      </div>
      <h3>${esc(note.title)}</h3>
      ${note.body ? `<p class="note-preview">${esc(notePreview(note.body))}</p>` : ''}
    </li>`;
}

export function renderApuntes(state, { subjectId = null } = {}) {
  const all = notesSorted(state);
  const filtered = subjectId ? all.filter((n) => n.subjectId === subjectId) : all;
  const subjectsWithNotes = subjectsSorted(state).filter((s) => all.some((n) => n.subjectId === s.id));
  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">Apuntes</p>
        <h1 class="page-title">Tus resúmenes</h1>
      </div>
      <button type="button" class="btn btn-primary" data-action="add-note">+ Nuevo apunte</button>
    </section>

    ${all.length ? `
      <section class="card">
        <div class="notes-toolbar">
          <input type="search" class="note-search" placeholder="Buscar en tus apuntes…" data-role="note-search" aria-label="Buscar apuntes">
          <div class="chip-row">
            <button type="button" class="filter-chip ${subjectId ? '' : 'is-active'}" data-action="filter-notes" data-subject="">Todas</button>
            ${subjectsWithNotes.map((s) => `
              <button type="button" class="filter-chip ${subjectId === s.id ? 'is-active' : ''}" style="${subjectStyle(s)}" data-action="filter-notes" data-subject="${esc(s.id)}">
                ${esc(s.emoji || '📘')} ${esc(s.name)}
              </button>`).join('')}
          </div>
        </div>
        ${filtered.length
          ? `<ul class="note-list">${filtered.map((note) => noteRow(note, state)).join('')}</ul>
             <p class="muted small notes-empty" hidden>No encontré apuntes con esa palabra.</p>`
          : `<p class="muted">No hay apuntes de esa materia todavía.</p>`}
      </section>`
      : `<section class="card">${emptyState({
          emoji: '📝',
          title: 'Guardá tus resúmenes acá',
          text: 'Escribí o pegá los apuntes de cada materia: sirven para estudiar y quedan siempre en el iPad.',
          actionLabel: 'Escribir el primero',
          actionAttrs: 'data-action="add-note"',
        })}</section>`}
  `;
}

export function renderNoteView(state, note) {
  const subject = subjectById(note.subjectId, state);
  const photos = note.images || [];
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">Apunte${subject ? ' · ' + esc(subject.name) : ''}</p>
        <h2>${esc(note.title)}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <p class="muted small">Actualizado el ${esc(noteDate(note.updatedAt))}</p>
    ${note.body ? `<div class="note-body">${esc(note.body)}</div>` : ''}
    ${photos.length ? `
      <div class="note-photos">
        ${photos.map((photo) => `
          <button type="button" class="note-photo" data-action="open-photo" data-image-id="${esc(photo.id)}" aria-label="Ver foto completa">
            <img data-image-id="${esc(photo.id)}" alt="Foto del apunte" loading="lazy">
          </button>`).join('')}
      </div>` : ''}
    <div class="modal-foot">
      <button type="button" class="btn btn-danger btn-small" data-action="delete-note" data-id="${esc(note.id)}">Borrar</button>
      <div class="foot-right">
        <button type="button" class="btn btn-plain" data-action="close-modal">Cerrar</button>
        <button type="button" class="btn btn-primary" data-action="edit-note" data-id="${esc(note.id)}">Editar</button>
      </div>
    </div>`;
}

export function renderNoteForm(state, { note = null, subjectId = '' } = {}) {
  const editing = Boolean(note);
  const value = note || { subjectId: subjectId || state.subjects[0]?.id || '', title: '', body: '', images: [] };
  const photos = value.images || [];
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">${editing ? 'Editar' : 'Nuevo'}</p>
        <h2>${editing ? 'Editar apunte' : 'Nuevo apunte'}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <form class="form" data-form="note" data-id="${esc(note ? note.id : '')}">
      <div class="field-row">
        <label class="field">
          <span>Materia</span>
          <select name="subjectId" required>
            ${state.subjects.map((s) => `<option value="${esc(s.id)}" ${s.id === value.subjectId ? 'selected' : ''}>${esc(s.emoji || '📘')} ${esc(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Título</span>
          <input type="text" name="title" value="${esc(value.title)}" placeholder="Ej.: Fracciones para el examen" required maxlength="90">
        </label>
      </div>
      <label class="field">
        <span>Apunte</span>
        <textarea name="body" rows="8" placeholder="Escribí o pegá acá tu resumen…">${esc(value.body)}</textarea>
        <small class="hint">Podés dejarlo vacío si el apunte es solo una foto.</small>
      </label>
      <div class="field">
        <span>Fotos</span>
        <div class="photo-grid" data-photo-grid>
          ${photos.map((photo) => `
            <figure class="photo-thumb" data-id="${esc(photo.id)}">
              <img data-image-id="${esc(photo.id)}" alt="Foto del apunte">
              <button type="button" class="photo-remove" data-action="remove-note-photo" data-id="${esc(photo.id)}" aria-label="Quitar foto">✕</button>
            </figure>`).join('')}
        </div>
        <label class="photo-add">
          <input type="file" accept="image/*" multiple data-role="note-photo" hidden>
          <span class="btn btn-soft btn-small">📷 Agregar foto</span>
        </label>
        <button type="button" class="btn btn-soft btn-small" data-action="ai-note">✨ Leer la foto con IA</button>
        <small class="hint">Podés sacar una foto en el momento o elegir de la galería. Se achican solas para ocupar poco lugar. “Leer con IA” completa el texto y el resumen desde la primera foto.</small>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Guardar cambios' : 'Guardar apunte'}</button>
      </div>
    </form>`;
}

/* ========================= TARJETAS ========================= */

export function renderFlashcards(session, state) {
  if (!session) {
    return `<section class="card">${emptyState({
      emoji: '🃏',
      title: 'No hay tarjetas todavía',
      text: 'Cargá preguntas en alguna materia y las tarjetas se arman solas.',
      actionLabel: 'Ir a materias',
      actionAttrs: 'data-action="nav" data-view="materias"',
    })}</section>`;
  }
  if (session.finished) return renderCardsSummary(session, state);

  const card = session.items[session.index];
  const subject = subjectById(card.subjectId, state);
  const progress = Math.round((session.index / session.items.length) * 100);
  const flipped = session.flipped;

  return `
    <section class="cards" style="${subjectStyle(subject)}">
      <div class="quiz-head">
        <button type="button" class="btn btn-plain btn-small" data-action="quit-cards">← Salir</button>
        <div class="quiz-meta">
          ${subjectChip(subject)}
          <span class="muted small">Tarjetas de estudio</span>
        </div>
        <span class="quiz-counter">${session.index + 1} / ${session.items.length}</span>
      </div>
      <div class="quiz-progress"><i style="width:${progress}%"></i></div>

      <button type="button" class="flashcard ${flipped ? 'is-flipped' : ''}" data-action="flip-card" aria-label="${flipped ? 'Ver la pregunta' : 'Tocar para ver la respuesta'}">
        <span class="flashcard-inner">
          <span class="flashcard-face flashcard-front">
            <span class="eyebrow">Pregunta</span>
            <strong class="flashcard-text">${esc(card.front)}</strong>
            <small class="flashcard-hint">Tocá la tarjeta para ver la respuesta</small>
          </span>
          <span class="flashcard-face flashcard-back">
            <span class="eyebrow">Respuesta</span>
            <strong class="flashcard-text">${esc(card.back)}</strong>
            ${card.explanation ? `<span class="flashcard-explanation">${esc(card.explanation)}</span>` : ''}
          </span>
        </span>
      </button>

      <div class="card-answer">
        <button type="button" class="btn btn-plain" data-action="card-answer" data-ok="0" ${flipped ? '' : 'disabled'}>No la sabía</button>
        <button type="button" class="btn btn-primary" data-action="card-answer" data-ok="1" ${flipped ? '' : 'disabled'}>La sabía</button>
      </div>
      ${flipped ? '' : '<p class="quiz-hint muted small">Primero mirá la respuesta y después marcá cómo te fue.</p>'}
    </section>`;
}

export function renderCardsSummary(session, state) {
  const { total, known, percent } = cardSummary(session);
  const missed = session.results.filter((r) => !r.ok).length;
  return `
    <section class="result">
      <div class="result-hero">
        <span class="result-emoji" aria-hidden="true">${missed === 0 ? '🏆' : '🧠'}</span>
        <h1>${missed === 0 ? '¡Las sabías todas!' : `Sabías ${known} de ${total}`}</h1>
        <p class="muted">${missed === 0 ? 'Guardá este momento: mañana repasá de nuevo para no olvidarlo.' : 'Repetí las que no sabías y en dos vueltas quedan.'}</p>
        <div class="result-score"><strong>${known}</strong><span>/ ${total} tarjetas</span></div>
        <div class="result-bar"><i style="width:${percent}%"></i></div>
        <p class="muted small">${percent}%</p>
      </div>
      <div class="result-actions">
        ${missed ? `<button type="button" class="btn btn-primary" data-action="retry-cards">Repetir las ${missed} que no sabía</button>` : ''}
        <button type="button" class="btn btn-soft" data-action="start-flashcards">Otra tanda</button>
        <button type="button" class="btn btn-plain" data-action="nav" data-view="practica">Volver a práctica</button>
      </div>
    </section>`;
}

/* =========================== PERFIL =========================== */

export function renderCloudCard() {
  const c = cloudSnapshot();
  if (!c.enabled) return '';
  const labels = {
    idle: 'Conectado',
    syncing: 'Sincronizando…',
    synced: 'Sincronizado',
    paused: 'Pausado',
    error: 'Con error',
    'signed-out': 'Sin cuenta',
    off: 'No disponible',
  };
  const when = c.lastSync
    ? new Date(c.lastSync).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  return `
    <section class="card cloud-card">
      <div class="card-head">
        <h2 class="card-title">Nube</h2>
        <span class="pill cloud-status is-${esc(c.status)}">${esc(labels[c.status] || c.status)}</span>
      </div>
      ${!c.user
        ? `
        <p class="muted small">Entrá con Google para guardar el progreso y las fotos en la nube, y recuperarlos en otro dispositivo.</p>
        <div class="cloud-actions">
          <button type="button" class="btn btn-primary" data-action="cloud-signin" data-provider="google">Entrar con Google</button>
          <button type="button" class="btn btn-plain" data-action="cloud-signin" data-provider="apple" disabled title="Se activa más adelante">Entrar con Apple</button>
        </div>`
        : `
        <p class="muted small">${esc(c.user.email || 'Cuenta conectada')}${when ? ' · último guardado: ' + esc(when) : ''}</p>
        ${c.status === 'paused' ? '<p class="muted small">Este perfil no es el que sincroniza. <button type="button" class="link-btn" data-action="cloud-bind">Usar este perfil</button></p>' : ''}
        ${c.error ? `<p class="cloud-error">${esc(c.error)}</p>` : ''}
        <div class="cloud-actions">
          <button type="button" class="btn btn-soft btn-small" data-action="cloud-push">Guardar ahora</button>
          <button type="button" class="btn btn-plain btn-small" data-action="cloud-pull">Bajar de la nube</button>
          <button type="button" class="btn btn-plain btn-small" data-action="cloud-signout">Cerrar sesión</button>
        </div>`}
    </section>`;
}

export function renderPerfil(state, { today }) {
  const name = (state.student || '').trim() || 'Estudiante';
  const level = levelInfo(state.xp || 0);
  const stats = studyStats(state);
  const badges = achievements(state, today);
  const unlocked = badges.filter((b) => b.done).length;
  const subjects = subjectsSorted(state).filter((s) => questionsOf(s.id, state).length);
  const xpToNext = level.need - level.inLevel;
  const profiles = listProfiles();
  const activeId = activeProfileId();
  const animalList = orderedAnimals(state.settings && state.settings.animalOrder);
  const currentIndex = Math.min(Math.max(level.level, 1) - 1, animalList.length - 1);
  const animal = animalList[currentIndex];
  const nextAnimal = animalList[currentIndex + 1] || null;
  const nextLevel = currentIndex + 2;
  const xpToAnimal = nextAnimal ? Math.max(0, xpForLevel(nextLevel) - (state.xp || 0)) : 0;

  return `
    <section class="profile-head">
      <div class="profile-avatar">
        ${state.avatarPhotoId
          ? `<img class="profile-photo" data-image-id="${esc(state.avatarPhotoId)}" alt="Mi personaje">`
          : animalAvatar(animal)}
        <i class="level-pill">Nv ${level.level}</i>
      </div>
      <div class="profile-copy">
        <p class="eyebrow">Perfil</p>
        <h1>${esc(name)}</h1>
        <p class="animal-line">Tu animal es <strong>${esc(animal.name)}</strong> · Nivel ${level.level}</p>
        <p class="muted small">${stats.total} respuestas · ${stats.accuracy}% de aciertos · ${stats.days} ${stats.days === 1 ? 'día' : 'días'} de estudio</p>
        <div class="xp-block">
          <div class="xp-bar"><i style="width:${Math.round(level.progress * 100)}%"></i></div>
          <span class="muted small">Nivel ${level.level} · ${level.inLevel}/${level.need} XP · faltan ${xpToNext} XP para el nivel ${level.level + 1}</span>
        </div>
      </div>
      <div class="profile-actions">
        <button type="button" class="btn btn-plain btn-small" data-action="nav" data-view="ajustes">Ajustes</button>
      </div>
    </section>

    ${renderCloudCard()}

    <div class="stat-grid">
      <div class="stat-tile"><strong>${stats.days}</strong><span>días de estudio</span></div>
      <div class="stat-tile"><strong>${stats.accuracy}%</strong><span>aciertos</span></div>
      <div class="stat-tile"><strong>${stats.total}</strong><span>respuestas</span></div>
      <div class="stat-tile"><strong>${stats.cards}</strong><span>tarjetas</span></div>
      <div class="stat-tile"><strong>${stats.notes}</strong><span>apuntes</span></div>
      <div class="stat-tile"><strong>${stats.exams}</strong><span>exámenes</span></div>
    </div>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Tu animal</h2>
        <span class="pill">Nivel ${level.level}</span>
      </div>
      <p class="muted small">Cuanto mejor te va, mejor es tu animal. Podés elegir qué animal va en cada nivel.</p>
      <div class="animal-ladder">
        ${animalList.map((item, index) => {
          const animalLevel = index + 1;
          const unlockedStep = level.level >= animalLevel;
          const current = index === currentIndex;
          return `
            <div class="animal-step ${unlockedStep ? 'is-unlocked' : ''} ${current ? 'is-current' : ''}">
              <span class="animal-circle">${item.svg}</span>
              <span class="animal-name">${esc(item.name)}</span>
              <span class="animal-level">${current ? 'Ahora' : 'Nv ' + animalLevel}</span>
            </div>`;
        }).join('')}
      </div>
      ${nextAnimal
        ? `<p class="muted small">El próximo es <strong>${esc(nextAnimal.name)}</strong>: te faltan ${xpToAnimal} XP (nivel ${nextLevel}).</p>`
        : '<p class="muted small">¡Llegaste al último animal del camino!</p>'}
      ${level.level >= 8 || state.avatarPhotoId ? `
        <div class="profile-photo-row">
          <div>
            <strong class="profile-photo-title">Tu personaje</strong>
            <p class="muted small">${level.level >= 8 ? 'Ya sos nivel 8: podés usar tu propia foto como personaje.' : 'Estás usando tu foto como personaje.'}</p>
          </div>
          <div class="profile-photo-actions">
            <label class="btn btn-plain btn-small file-btn">
              ${state.avatarPhotoId ? 'Cambiar foto' : 'Subir mi foto'}
              <input type="file" accept="image/*" data-role="avatar-photo">
            </label>
            ${state.avatarPhotoId ? '<button type="button" class="btn btn-danger btn-small" data-action="remove-avatar-photo">Quitar</button>' : ''}
          </div>
        </div>` : ''}
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Elegí tus animales</h2>
      </div>
      <p class="muted small">Cada nivel muestra un animal. Si elegís uno que ya está en otro nivel, se intercambian.</p>
      <div class="animal-picker">
        ${animalList.map((item, index) => `
          <label class="animal-pick">
            <span class="animal-pick-level">Nv ${index + 1}</span>
            <span class="animal-pick-circle">${item.svg}</span>
            <select data-action="set-level-animal" data-level="${index}" aria-label="Animal del nivel ${index + 1}">
              ${ANIMALS.map((option) => `<option value="${esc(option.id)}" ${option.id === item.id ? 'selected' : ''}>${esc(option.name)}</option>`).join('')}
            </select>
          </label>`).join('')}
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Logros</h2>
        <span class="pill">${unlocked} / ${badges.length}</span>
      </div>
      <ul class="badge-grid">
        ${badges.map((badge) => `
          <li class="badge ${badge.done ? 'is-done' : ''}">
            <span class="badge-emoji" aria-hidden="true">${badge.done ? badge.emoji : '🔒'}</span>
            <div class="badge-copy">
              <strong>${esc(badge.title)}</strong>
              <span>${esc(badge.desc)}</span>
            </div>
          </li>`).join('')}
      </ul>
    </section>

    ${subjects.length ? `
      <section class="card">
        <h2 class="card-title">Progreso por materia</h2>
        <ul class="mastery-list">
          ${subjects.map((subject) => {
            const value = masteryOf(subject.id, state);
            const pct = Math.round(value * 100);
            const answered = questionsOf(subject.id, state).some((q) => q.stats);
            return `
              <li class="mastery-row" style="${subjectStyle(subject)}">
                <span class="mastery-emoji">${esc(subject.emoji || '📘')}</span>
                <div class="mastery-body">
                  <div class="mastery-top"><span>${esc(subject.name)}</span><span class="muted small">${answered ? pct + '%' : 'sin practicar'}</span></div>
                  <div class="bar"><i style="width:${answered ? pct : 0}%"></i></div>
                </div>
              </li>`;
          }).join('')}
        </ul>
      </section>` : ''}

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Personas en este iPad</h2>
        <button type="button" class="btn btn-soft btn-small" data-action="add-profile">+ Agregar persona</button>
      </div>
      <ul class="profile-list">
        ${profiles.map((profile) => `
          <li class="profile-row ${profile.id === activeId ? 'is-active' : ''}">
            <span class="profile-mini">${esc(initials(profile.name))}</span>
            <div class="profile-row-copy">
              <strong>${esc(profile.name)}</strong>
              <small>${profile.id === activeId ? 'Usando la app ahora' : 'Tocá para entrar a su espacio'}</small>
            </div>
            ${profile.id === activeId
              ? '<span class="pill">Activa</span>'
              : `<button type="button" class="btn btn-plain btn-small" data-action="switch-profile" data-id="${esc(profile.id)}">Cambiar</button>
                 <button type="button" class="icon-btn danger" data-action="delete-profile" data-id="${esc(profile.id)}" aria-label="Borrar a ${esc(profile.name)}">✕</button>`}
          </li>`).join('')}
      </ul>
      <p class="muted small">Cada persona tiene sus materias, exámenes, preguntas, apuntes, XP y logros por separado. Todo se guarda en este iPad.</p>
    </section>

    <p class="muted small center">Ganás XP por cada respuesta, tarjeta y tarea completada. La racha sube cuando estudiás cada día.</p>
  `;
}

export function renderProfileForm() {
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">Nueva</p>
        <h2>Agregar persona</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <form class="form" data-form="profile">
      <label class="field">
        <span>¿Cómo se llama?</span>
        <input type="text" name="name" placeholder="Nombre" maxlength="40" required autocomplete="given-name">
      </label>
      <p class="muted small">Arranca con su espacio vacío: sus propias materias, exámenes, apuntes y progreso. Podés cambiar de persona cuando quieras desde el perfil.</p>
      <div class="modal-foot">
        <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear persona</button>
      </div>
    </form>`;
}

/* =========================== AJUSTES =========================== */

export function renderAjustes(state) {
  const demoCount = state.questions.filter((q) => q.demo).length
    + state.exams.filter((e) => e.demo).length
    + (state.notes || []).filter((n) => n.demo).length;
  const answered = state.attempts.length;
  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">Ajustes</p>
        <h1 class="page-title">Tu espacio</h1>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">¿Cómo te llamás?</h2>
      <p class="muted small">Se usa para saludarte en la pantalla de inicio.</p>
      <form class="inline-form" data-form="name">
        <input type="text" name="student" value="${esc(state.student || '')}" placeholder="Tu nombre" autocomplete="given-name" maxlength="40">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    </section>

    <section class="card">
      <h2 class="card-title">Tus datos</h2>
      <p class="muted small">Todo se guarda en este dispositivo. Hacé un backup de vez en cuando para no perder nada.</p>
      <div class="settings-actions">
        <button type="button" class="btn btn-soft" data-action="export-json">Descargar backup (.json)</button>
        <label class="btn btn-plain file-btn">
          Importar backup
          <input type="file" accept="application/json,.json" data-action="import-json">
        </label>
        <button type="button" class="btn btn-plain" data-action="export-ics">Exportar exámenes a la agenda (.ics)</button>
      </div>
      <p class="muted small">El archivo .ics se abre en la app Calendario del iPad y te avisa 2 días antes y la víspera de cada examen.</p>
    </section>

    <section class="card">
      <h2 class="card-title">Instalar en el iPad</h2>
      <ol class="steps">
        <li><span>Abrí esta página en <strong>Safari</strong>.</span></li>
        <li><span>Tocá el botón <strong>Compartir</strong> (el cuadrado con la flecha).</span></li>
        <li><span>Elegí <strong>“Agregar a pantalla de inicio”</strong>.</span></li>
        <li><span>Listo: queda como una app y funciona sin internet.</span></li>
      </ol>
    </section>

    <section class="card">
      <h2 class="card-title">Mantenimiento</h2>
      <p class="muted small">${answered} ${answered === 1 ? 'práctica realizada' : 'prácticas realizadas'} · ${state.questions.length} preguntas · ${state.exams.length} exámenes.</p>
      <div class="settings-actions">
        ${demoCount ? `<button type="button" class="btn btn-plain" data-action="clear-demo">Borrar los datos de ejemplo</button>` : ''}
        <button type="button" class="btn btn-danger" data-action="reset-app">Empezar de cero</button>
      </div>
    </section>

    <p class="muted small center">Mi Estudio · v1.0 · hecha para estudiar mejor 🙂</p>
  `;
}

/* ============================ FORMULARIOS ============================ */

export function renderPlanWizard(state, draft) {
  const step = draft.step || 1;
  const kind = PLAN_KINDS[draft.type] || PLAN_KINDS.examen;
  const subject = subjectById(draft.subjectId, state);
  const steps = `<div class="wizard-steps">${[1, 2, 3].map((n) => `<span class="${n === step ? 'is-active' : ''} ${n < step ? 'is-done' : ''}">${n}</span>`).join('')}</div>`;
  const head = `
    <div class="modal-head">
      <div>
        <p class="eyebrow">${draft.id ? 'Editar' : 'Nuevo'}</p>
        <h2>${draft.id ? 'Editar plan' : 'Plan de estudio'}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>`;

  if (step === 1) {
    return `${head}${steps}
      <p class="wizard-question">¿Para qué es este plan?</p>
      <div class="type-grid">
        ${Object.entries(PLAN_KINDS).map(([id, item]) => `
          <button type="button" class="type-card ${draft.type === id ? 'is-selected' : ''}" data-action="plan-type" data-type="${id}">
            <span class="type-emoji">${item.emoji}</span>
            <strong>${esc(item.label)}</strong>
            <small>${esc(item.hint)}</small>
          </button>`).join('')}
      </div>
      <p class="muted small">Después elegís la materia y el tema. Si es examen o test, al final ponés la fecha.</p>`;
  }

  if (step === 2) {
    return `${head}${steps}
      <p class="wizard-question">¿De qué materia y qué tema?</p>
      <form class="form" data-form="plan-step2">
        <label class="field">
          <span>Asignatura</span>
          <select name="subjectId" required>
            ${state.subjects.map((s) => `<option value="${esc(s.id)}" ${s.id === draft.subjectId ? 'selected' : ''}>${esc(s.emoji || '📘')} ${esc(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Tema de estudio</span>
          <input type="text" name="title" value="${esc(draft.title || '')}" placeholder="Ej.: Fracciones y ecuaciones" required maxlength="80">
        </label>
        <label class="field">
          <span>Temas para repartir (opcional)</span>
          <textarea name="topics" rows="3" placeholder="Uno por línea. Si lo dejás vacío usamos el tema de arriba.">${esc(draft.topicsText || '')}</textarea>
        </label>
        <div class="modal-foot">
          <button type="button" class="btn btn-plain" data-action="plan-back">Volver</button>
          <div class="foot-right">
            <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Siguiente</button>
          </div>
        </div>
      </form>`;
  }

  const dated = draft.type !== 'estudio';
  return `${head}${steps}
    <p class="wizard-question">${dated ? '¿Cuándo es?' : '¿Le agregás fotos?'}</p>
    <form class="form" data-form="plan-step3" data-id="${esc(draft.id || '')}">
      ${dated
        ? `<label class="field"><span>Fecha</span><input type="date" name="date" value="${esc(draft.date || '')}" required></label>`
        : `<p class="muted small">Este plan no tiene fecha: lo vas a encontrar en “Solo por estudiar” y en las tareas de cada día.</p>`}
      <div class="field">
        <span>Fotos (apuntes o fotos del libro)</span>
        <div class="photo-grid" data-photo-grid>
          ${(draft.images || []).map((id) => `
            <figure class="photo-thumb" data-id="${esc(id)}">
              <img data-image-id="${esc(id)}" alt="Foto del plan">
              <button type="button" class="photo-remove" data-action="remove-plan-photo" data-id="${esc(id)}" aria-label="Quitar foto">✕</button>
            </figure>`).join('')}
        </div>
        <label class="photo-add">
          <input type="file" accept="image/*" multiple data-role="plan-photo" hidden>
          <span class="btn btn-soft btn-small">📷 Agregar foto</span>
        </label>
        <small class="hint">Podés sacar una foto en el momento o elegir de la galería.</small>
      </div>
      <div class="plan-summary">
        <span>${kind.emoji} ${esc(kind.label)}</span>
        <span>${esc(subject ? subject.name : 'Materia')}</span>
        <span>${draft.topicsCount || 0} tema(s)</span>
        ${dated ? '' : '<span>sin fecha</span>'}
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-plain" data-action="plan-back">Volver</button>
        <div class="foot-right">
          <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">${draft.id ? 'Guardar cambios' : 'Crear plan'}</button>
        </div>
      </div>
    </form>`;
}

export function renderPlanView(state, plan) {
  const kind = planKind(plan);
  const subject = subjectById(plan.subjectId, state);
  const planData = studyPlan(plan, state);
  const photos = plan.photos || [];
  const done = planData.items.filter((item) => item.done).length;
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">${kind.emoji} ${esc(kind.label)}</p>
        <h2>${esc(plan.title)}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <div class="plan-meta">
      ${subjectChip(subject)}
      ${plan.date ? `<span class="countdown">${esc(countdownLabel(plan.date))}</span>` : '<span class="pill">Sin fecha</span>'}
    </div>
    ${plan.date ? `<p class="muted small">${esc(fmtLong(plan.date))}</p>` : ''}
    ${Number.isFinite(plan.grade) ? `<p class="plan-grade">Nota: <strong>${plan.grade}</strong></p>` : ''}
    ${plan.topics && plan.topics.length ? `
      <div class="topics">
        <div class="topics-head">
          <span class="label">Temas</span>
          <span class="muted small">${done}/${planData.items.length} repasados</span>
        </div>
        <ul class="topic-list">${plan.topics.map((topic) => `<li>${esc(topic)}</li>`).join('')}</ul>
      </div>` : ''}
    ${plan.notes ? `<p class="note">${esc(plan.notes)}</p>` : ''}
    ${photos.length ? `
      <div class="note-photos">
        ${photos.map((photo) => `
          <button type="button" class="note-photo" data-action="open-photo" data-image-id="${esc(photo.id)}" aria-label="Ver foto completa">
            <img data-image-id="${esc(photo.id)}" alt="Foto del plan" loading="lazy">
          </button>`).join('')}
      </div>` : ''}
    <div class="modal-foot">
      <button type="button" class="btn btn-danger btn-small" data-action="delete-exam" data-id="${esc(plan.id)}">Borrar</button>
      <div class="foot-right">
        ${plan.date ? `<button type="button" class="btn btn-plain" data-action="edit-grade" data-id="${esc(plan.id)}">${Number.isFinite(plan.grade) ? 'Cambiar nota' : 'Poner nota'}</button>` : ''}
        <button type="button" class="btn btn-plain" data-action="start-quiz" data-subject="${esc(plan.subjectId)}">Practicar</button>
        <button type="button" class="btn btn-primary" data-action="edit-exam" data-id="${esc(plan.id)}">Editar</button>
      </div>
    </div>`;
}

export function renderSubjectForm(state, { subject = null } = {}) {
  const editing = Boolean(subject);
  const palette = ['#ec4899', '#3b82f6', '#ef4444', '#eab308', '#8b5cf6', '#166534', '#22c55e', '#38bdf8', '#f97316', '#14b8a6', '#c084fc', '#d946ef', '#92400e', '#6b7280', '#111827'];
  const value = subject || { name: '', emoji: '📘', color: palette[0] };
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">${editing ? 'Editar' : 'Nueva'}</p>
        <h2>${editing ? 'Editar materia' : 'Agregar materia'}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <form class="form" data-form="subject" data-id="${esc(subject ? subject.id : '')}">
      <label class="field">
        <span>Nombre</span>
        <input type="text" name="name" value="${esc(value.name)}" placeholder="Ej.: Lengua" required maxlength="40">
      </label>
      <label class="field">
        <span>Emoji</span>
        <input type="text" name="emoji" value="${esc(value.emoji || '📘')}" maxlength="4" class="emoji-input">
      </label>
      <div class="field">
        <span>Color</span>
        <div class="swatches">
          ${palette.map((color) => `
            <label class="swatch" style="--c:${color}">
              <input type="radio" name="color" value="${color}" ${value.color === color ? 'checked' : ''}>
              <span></span>
            </label>`).join('')}
        </div>
      </div>
      <div class="modal-foot">
        ${editing ? `<button type="button" class="btn btn-danger btn-small" data-action="delete-subject" data-id="${esc(subject.id)}">Borrar materia</button>` : '<span></span>'}
        <div class="foot-right">
          <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">${editing ? 'Guardar' : 'Agregar'}</button>
        </div>
      </div>
    </form>`;
}

export function renderQuestionForm(state, { question = null, subjectId = '' } = {}) {
  const editing = Boolean(question);
  const value = question || {
    subjectId: subjectId || state.subjects[0]?.id || '',
    topic: '',
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: '',
  };
  const options = value.options && value.options.length >= 2 ? value.options : ['', '', '', ''];
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">${editing ? 'Editar' : 'Nueva'}</p>
        <h2>${editing ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <form class="form" data-form="question" data-id="${esc(question ? question.id : '')}">
      <div class="field-row">
        <label class="field">
          <span>Materia</span>
          <select name="subjectId" required>
            ${state.subjects.map((s) => `<option value="${esc(s.id)}" ${s.id === value.subjectId ? 'selected' : ''}>${esc(s.emoji || '📘')} ${esc(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Tema (opcional)</span>
          <input type="text" name="topic" value="${esc(value.topic || '')}" placeholder="Ej.: Fotosíntesis" maxlength="60">
        </label>
      </div>
      <label class="field">
        <span>Pregunta</span>
        <textarea name="text" rows="2" placeholder="¿Cuál es la unidad básica de los seres vivos?" required>${esc(value.text)}</textarea>
      </label>
      <div class="field">
        <span>Opciones (marcá la correcta)</span>
        <div class="option-editor" data-option-editor>
          ${options.map((opt, index) => `
            <div class="option-row">
              <label class="option-radio">
                <input type="radio" name="correct" value="${index}" ${index === value.correct ? 'checked' : ''}>
                <span>${LETTERS[index]}</span>
              </label>
              <input type="text" class="opt-input" value="${esc(opt)}" placeholder="Opción ${LETTERS[index] || index + 1}" maxlength="120">
            </div>`).join('')}
        </div>
        <button type="button" class="btn btn-plain btn-small" data-action="add-option">+ Agregar opción</button>
      </div>
      <label class="field">
        <span>Explicación (opcional)</span>
        <textarea name="explanation" rows="2" placeholder="Se muestra cuando la respuesta está mal.">${esc(value.explanation || '')}</textarea>
        <small class="hint">Una buena explicación es lo que más ayuda a aprender.</small>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Guardar' : 'Agregar pregunta'}</button>
      </div>
    </form>`;
}

export function renderOnboarding() {
  const cloud = cloudSnapshot();
  return `
    <div class="onboarding">
      <span class="onboarding-emoji" aria-hidden="true">🎒</span>
      <h2>¡Hola! Soy tu app de estudio</h2>
      <p class="muted">Te va a mostrar los exámenes que se vienen, te arma un plan de repaso y te hace preguntas para ver si aprendiste.</p>
      <form class="form" data-form="onboarding">
        <label class="field">
          <span>¿Cómo te llamás?</span>
          <input type="text" name="student" placeholder="Tu nombre" maxlength="40" autocomplete="given-name" required>
        </label>
        <button type="submit" class="btn btn-primary btn-block">Empezar</button>
      </form>
      ${cloud.enabled ? `
        <div class="onboarding-cloud">
          <span class="onboarding-or">o entrá directo</span>
          ${cloud.user
            ? `<p class="muted small">Ya estás conectado como <strong>${esc(cloud.user.email || '')}</strong>. Tocá “Empezar” y listo.</p>`
            : `<button type="button" class="btn btn-soft btn-block" data-action="cloud-signin" data-provider="google">Entrar con Google</button>
               <p class="muted small">Con Google guardamos tu progreso en la nube y lo recuperás en otro dispositivo.</p>`}
        </div>` : ''}
      <p class="muted small">Después podés cambiar todo desde Ajustes.</p>
    </div>`;
}

export function renderConfirm({ title, text, confirmLabel = 'Borrar', action, id = '', danger = true }) {
  return `
    <div class="modal-head">
      <h2>${esc(title)}</h2>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <p class="muted">${esc(text)}</p>
    <div class="modal-foot">
      <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="${esc(action)}" data-id="${esc(id)}">${esc(confirmLabel)}</button>
    </div>`;
}



export function renderAIHorario(clases) {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">IA</p>
        <h2>Horario leído</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <p class="muted small">Revisá que esté bien antes de agregarlo. Las materias nuevas se crean solas.</p>
    <ul class="ai-classes">
      ${clases.map((clase) => `
        <li>
          <span class="ai-day">${days[clase.dia - 1] || 'Día ' + clase.dia}</span>
          <span class="ai-time">${esc(clase.inicio)}–${esc(clase.fin)}</span>
          <span class="ai-subject">${esc(clase.materia)}</span>
          ${clase.profesor ? `<span class="ai-teacher">${esc(clase.profesor)}</span>` : ''}
        </li>`).join('')}
    </ul>
    <div class="modal-foot">
      <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
      <button type="button" class="btn btn-primary" data-action="ai-import-horario">Agregar ${clases.length} ${clases.length === 1 ? 'clase' : 'clases'}</button>
    </div>`;
}

/* ========================= MY PERLA ========================= */
function perlaAttachments(message) {
  const images = message.images || [];
  const notes = message.notes || [];
  const videos = message.youtube || [];
  return `
    ${images.length ? `<div class="perla-images">${images.map((id) => `<button type="button" class="perla-image" data-action="open-photo" data-image-id="${esc(id)}"><img data-image-id="${esc(id)}" alt="Foto enviada a Perla"></button>`).join('')}</div>` : ''}
    ${notes.length ? `<div class="perla-chips">${notes.map((note) => `<span class="perla-chip">📝 ${esc(note.title)}</span>`).join('')}</div>` : ''}
    ${videos.length ? `<div class="perla-videos">${videos.map((video) => `
      <a class="perla-video" href="${esc(video.url)}" target="_blank" rel="noopener">
        <img src="https://i.ytimg.com/vi/${esc(video.videoId)}/hqdefault.jpg" alt="" loading="lazy">
        <span>▶ ${esc(video.title || 'Video de YouTube')}</span>
      </a>`).join('')}</div>` : ''}
  `;
}

function gradeButtons(planId) {
  return `
    <div class="grade-picker">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => `<button type="button" class="grade-btn" data-action="perla-grade" data-plan="${esc(planId)}" data-grade="${grade}">${grade}</button>`).join('')}
      <button type="button" class="grade-skip" data-action="perla-grade-skip" data-plan="${esc(planId)}">No me acuerdo</button>
    </div>`;
}

function perlaMessage(message) {
  const isUser = message.role === 'user';
  return `
    <div class="perla-msg ${isUser ? 'is-user' : 'is-perla'}">
      ${isUser ? '' : '<img class="perla-msg-avatar" src="icons/logo-perla.png" alt="">'}
      <div class="perla-bubble">
        ${message.text ? `<p>${esc(message.text).replace(/\n/g, '<br>')}</p>` : ''}
        ${perlaAttachments(message)}
        ${message.kind === 'grade' && !message.answered ? gradeButtons(message.planId) : ''}
      </div>
    </div>`;
}

export function renderPerla(state, { draft = null } = {}) {
  const chats = (state.perla && state.perla.chats) || [];
  const activeChat = chats.find((chat) => chat.id === state.perla.activeId) || chats[0] || null;
  const messages = activeChat ? activeChat.messages : [];
  const sortedChats = [...chats].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  const graded = (state.exams || []).filter((plan) => Number.isFinite(plan.grade));
  const average = graded.length
    ? Math.round((graded.reduce((acc, plan) => acc + plan.grade, 0) / graded.length) * 10) / 10
    : null;
  const suggestions = ['¿Qué examen tengo?', '¿Qué estudio hoy?', '¿Cómo me fue?', '¿Qué clases tengo?'];

  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">My Perla</p>
        <h1 class="page-title">Hablá con Perla</h1>
        <p class="muted small">Tu compañera de estudio: puede mirar tus planes, tus notas, tu horario y tus apuntes.</p>
      </div>
    </section>

    <div class="perla-layout">
      <section class="perla-card">
        <header class="perla-head">
          <img class="perla-avatar" src="icons/logo-perla.png" alt="Perla">
          <div class="perla-head-copy">
            <strong>Perla</strong>
            <span>${activeChat ? esc(activeChat.title) : 'Guepardo de estudio'}</span>
          </div>
          <button type="button" class="btn btn-soft btn-small" data-action="new-perla-chat">+ Nuevo chat</button>
          <span class="perla-status">en línea</span>
        </header>

        <div class="perla-messages" id="perla-messages">
          ${messages.length
            ? messages.map((message) => perlaMessage(message)).join('')
            : '<p class="muted small perla-empty">Escribile algo a Perla para empezar.</p>'}
        </div>

        ${draft && (draft.images.length || draft.notes.length || draft.youtube.length) ? `
          <div class="perla-pending">
            ${draft.images.map((id) => `<span class="perla-pending-item"><img data-image-id="${esc(id)}" alt=""> <button type="button" data-action="perla-remove-image" data-id="${esc(id)}" aria-label="Quitar">✕</button></span>`).join('')}
            ${draft.notes.map((note) => `<span class="perla-pending-item">📝 ${esc(note.title)} <button type="button" data-action="perla-remove-note" data-id="${esc(note.id)}" aria-label="Quitar">✕</button></span>`).join('')}
            ${draft.youtube.map((video) => `<span class="perla-pending-item">▶ ${esc(video.title || 'Video')} <button type="button" data-action="perla-remove-youtube" data-id="${esc(video.videoId)}" aria-label="Quitar">✕</button></span>`).join('')}
          </div>` : ''}

        <form class="perla-composer" data-form="perla">
          <div class="perla-tools">
            <label class="icon-btn" title="Subir foto">
              <input type="file" accept="image/*" data-role="perla-photo" hidden>
              📷
            </label>
            <button type="button" class="icon-btn" data-action="perla-attach-note" title="Adjuntar apunte">📝</button>
            <button type="button" class="icon-btn" data-action="perla-youtube" title="Video de YouTube">▶</button>
          </div>
          <textarea name="text" rows="1" placeholder="Escribile a Perla…" maxlength="500"></textarea>
          <button type="submit" class="btn btn-primary">Enviar</button>
        </form>

        <div class="perla-suggestions">
          ${suggestions.map((text) => `<button type="button" class="perla-suggestion" data-action="perla-quick" data-text="${esc(text)}">${esc(text)}</button>`).join('')}
        </div>
      </section>

      <aside class="perla-side">
        <section class="card">
          <div class="card-head">
            <h2 class="card-title">Tus chats</h2>
            <button type="button" class="btn btn-soft btn-small" data-action="new-perla-chat">+ Nuevo</button>
          </div>
          ${chats.length
            ? `<ul class="chat-list">${sortedChats.map((chat) => `
                <li>
                  <button type="button" class="chat-item ${chat.id === (activeChat && activeChat.id) ? 'is-active' : ''}" data-action="open-perla-chat" data-id="${esc(chat.id)}">
                    <span class="chat-title">${esc(chat.title || 'Nuevo chat')}</span>
                    <small>${chat.messages.length} ${chat.messages.length === 1 ? 'mensaje' : 'mensajes'}</small>
                  </button>
                </li>`).join('')}</ul>`
            : '<p class="muted small">Todavía no hay chats.</p>'}
        </section>

        <section class="card">
          <div class="card-head">
            <h2 class="card-title">Mis notas</h2>
            ${average != null ? `<span class="pill">Promedio ${average}</span>` : ''}
          </div>
          ${graded.length
            ? `<ul class="grade-list">${graded.slice().reverse().map((plan) => {
                const subject = subjectById(plan.subjectId, state);
                return `
                  <li class="grade-row">
                    <span class="grade-number">${plan.grade}</span>
                    <div class="grade-body">
                      <strong>${esc(plan.title)}</strong>
                      <small>${esc(subject ? subject.name : 'Materia')} · ${esc(fmtShort(plan.date))}</small>
                    </div>
                    <button type="button" class="icon-btn" data-action="edit-grade" data-id="${esc(plan.id)}" aria-label="Cambiar nota">✎</button>
                  </li>`;
              }).join('')}</ul>`
            : '<p class="muted small">Todavía no cargaste notas. Cuando te tomen un examen, contale a Perla y queda guardada.</p>'}
        </section>

        <section class="card">
          <h2 class="card-title">Qué puedo hacer</h2>
          <ul class="perla-abilities">
            <li>📅 Ver tus exámenes y tests.</li>
            <li>📚 Decirte qué estudiar hoy.</li>
            <li>📝 Buscar en tus apuntes.</li>
            <li>🕒 Contarte tu horario del día.</li>
            <li>🏅 Guardar tus notas y el promedio.</li>
          </ul>
          <p class="muted small">Podés mandarle fotos, apuntes y videos de YouTube para tenerlos a mano en la charla.</p>
        </section>
      </aside>
    </div>`;
}

export function renderGradeModal(plan) {
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">Nota</p>
        <h2>${esc(plan.title)}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <p class="muted small">¿Qué nota te sacaste?</p>
    <div class="grade-picker is-modal" data-plan="${esc(plan.id)}">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => `<button type="button" class="grade-btn" data-action="set-grade" data-id="${esc(plan.id)}" data-grade="${grade}">${grade}</button>`).join('')}
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
      <button type="button" class="btn btn-danger btn-small" data-action="clear-grade" data-id="${esc(plan.id)}">Borrar nota</button>
    </div>`;
}

export function renderNotePicker(state) {
  const notes = notesSorted(state);
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">Adjuntar</p>
        <h2>Elegí un apunte</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    ${notes.length
      ? `<ul class="picker-list">${notes.map((note) => {
          const subject = subjectById(note.subjectId, state);
          return `
            <li>
              <button type="button" class="picker-item" data-action="perla-pick-note" data-id="${esc(note.id)}">
                <span class="picker-emoji">${esc(subject ? subject.emoji || '📘' : '📘')}</span>
                <span class="picker-copy"><strong>${esc(note.title)}</strong><small>${esc(subject ? subject.name : '')}</small></span>
              </button>
            </li>`;
        }).join('')}</ul>`
      : `<p class="muted">No hay apuntes todavía. Podés crearlos desde la sección Apuntes.</p>`}`;
}

export function renderYouTubeForm() {
  return `
    <div class="modal-head">
      <div>
        <p class="eyebrow">Video</p>
        <h2>Agregar video de YouTube</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Cerrar">✕</button>
    </div>
    <form class="form" data-form="youtube">
      <label class="field">
        <span>Link del video</span>
        <input type="url" name="url" placeholder="https://www.youtube.com/watch?v=..." required>
      </label>
      <label class="field">
        <span>Título (opcional)</span>
        <input type="text" name="title" placeholder="Ej.: Fracciones explicadas" maxlength="80">
      </label>
      <div class="modal-foot">
        <button type="button" class="btn btn-plain" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">Agregar</button>
      </div>
    </form>`;
}

/* ========================= PLANES / CAMINO ========================= */

function planStationData(state, plan, today) {
  const data = planStations(plan, state, today);
  return data.stations;
}

export function renderPlanes(state, { today }) {
  const plans = [...examsSorted(state)].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });

  return `
    <section class="page-head">
      <div>
        <p class="eyebrow">Planes</p>
        <h1 class="page-title">Tus caminos de estudio</h1>
        <p class="muted small">Cada plan es un camino con estaciones: una lección y preguntas por día, y un repaso final.</p>
      </div>
      <button type="button" class="btn btn-primary" data-action="add-exam">+ Nuevo plan</button>
    </section>

    ${plans.length
      ? `<div class="plan-grid">${plans.map((plan) => {
          const subject = subjectById(plan.subjectId, state);
          const kind = planKind(plan);
          const stations = planStationData(state, plan, today);
          const done = stations.filter((station) => station.done).length;
          const percent = stations.length ? Math.round((done / stations.length) * 100) : 0;
          return `
            <div class="plan-card" style="${subjectStyle(subject)}" data-action="open-camino" data-id="${esc(plan.id)}" role="button" tabindex="0">
              <div class="plan-card-top">
                <span class="kind-chip">${kind.emoji} ${esc(kind.label)}</span>
                <span class="muted small">${plan.date ? esc(relativeLabel(plan.date, today)) : 'sin fecha'}</span>
              </div>
              <h3>${esc(plan.title)}</h3>
              <p class="muted small">${esc(subject ? subject.name : 'Materia')} · ${done}/${stations.length} estaciones</p>
              <div class="path-dots">
                ${stations.map((station) => `<i class="${station.done ? 'is-done' : ''} ${station.final ? 'is-final' : ''}"></i>`).join('')}
              </div>
              <div class="plan-card-foot">
                <span class="plan-percent">${percent}%</span>
                <span class="link-hint">Abrir camino ›</span>
              </div>
            </div>`;
        }).join('')}</div>`
      : `<section class="card">${emptyState({
          emoji: '🗺️',
          title: 'Todavía no hay planes',
          text: 'Creá un plan de estudio y te armamos un camino con estaciones diarias hasta el examen.',
          actionLabel: 'Crear el primero',
          actionAttrs: 'data-action="add-exam"',
        })}</section>`}
  `;
}

export function renderCamino(state, plan, { today }) {
  const subject = subjectById(plan.subjectId, state);
  const kind = planKind(plan);
  const stations = planStationData(state, plan, today);
  const done = stations.filter((station) => station.done).length;
  const percent = stations.length ? Math.round((done / stations.length) * 100) : 0;
  const currentIndex = stations.findIndex((station) => !station.done);

  return `
    <button type="button" class="back" data-action="nav" data-view="planes">← Todos los planes</button>

    <section class="camino-head" style="${subjectStyle(subject)}">
      <div class="camino-top">
        <span class="kind-chip">${kind.emoji} ${esc(kind.label)}</span>
        ${subjectChip(subject)}
        <span class="countdown">${plan.date ? esc(countdownLabel(plan.date, today)) : 'a tu ritmo'}</span>
      </div>
      <h1>${esc(plan.title)}</h1>
      <p class="muted small">${plan.date ? esc(fmtLong(plan.date)) : 'Sin fecha'} · ${done}/${stations.length} estaciones completadas</p>
      <div class="camino-progress"><i style="width:${percent}%"></i></div>
      <div class="camino-actions">
        <button type="button" class="btn btn-plain btn-small" data-action="edit-exam" data-id="${esc(plan.id)}">Editar plan</button>
        ${plan.date ? `<button type="button" class="btn btn-plain btn-small" data-action="edit-grade" data-id="${esc(plan.id)}">${Number.isFinite(plan.grade) ? 'Nota: ' + plan.grade : 'Poner nota'}</button>` : ''}
        <button type="button" class="btn btn-plain btn-small" data-action="start-quiz" data-subject="${esc(plan.subjectId)}">Práctica libre</button>
      </div>
    </section>

    <ol class="path">
      ${stations.map((station, index) => {
        const count = stationQuestions(plan, station).length ? 12 : 0;
        const isCurrent = index === currentIndex;
        return `
          <li class="path-station ${station.done ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${station.final ? 'is-final' : ''}">
            <span class="path-dot">${station.done ? '✓' : index + 1}</span>
            <div class="path-card" style="${subjectStyle(subject)}">
              <div class="path-head">
                <span class="path-date">${station.final ? 'Estación final' : esc(fmtShort(station.date))}</span>
                <span class="path-count">${count} preguntas</span>
              </div>
              <strong>${esc(station.topic)}</strong>
              <small>${station.final ? 'Repaso de todo: todas las preguntas del plan.' : 'Primero la lección, después las preguntas.'}</small>
              <div class="path-actions">
                <button type="button" class="btn ${station.done ? 'btn-plain' : 'btn-soft'} btn-small" data-action="open-station" data-plan="${esc(plan.id)}" data-key="${esc(station.key)}">${station.done ? 'Repetir' : 'Empezar'}</button>
                ${Number.isFinite(station.score) ? `<span class="pill">${station.score}%</span>` : ''}
              </div>
            </div>
          </li>`;
      }).join('')}
    </ol>
  `;
}

function lessonNotes(state, plan, station) {
  const notes = notesOf(plan.subjectId, state);
  if (station.final) return notes;
  const topic = String(station.topic || '').toLowerCase();
  const matching = notes.filter((note) => {
    const text = `${note.title} ${note.body}`.toLowerCase();
    return topic && (text.includes(topic) || topic.includes(note.title.toLowerCase()));
  });
  return matching.length ? matching : [];
}

export function renderLeccion(state, plan, station, { today }) {
  const subject = subjectById(plan.subjectId, state);
  const notes = lessonNotes(state, plan, station);
  const available = stationQuestions(plan, station).length;
  const count = available ? 12 : 0;
  return `
    <button type="button" class="back" data-action="open-camino" data-id="${esc(plan.id)}">← Volver al camino</button>

    <section class="leccion-head" style="${subjectStyle(subject)}">
      <p class="eyebrow">${station.final ? 'Estación final' : 'Estación ' + (station.index + 1)} · ${esc(fmtShort(station.date))}</p>
      <h1>${esc(station.topic)}</h1>
      <p class="muted small">${esc(subject ? subject.name : '')} · ${count} preguntas para practicar</p>
    </section>

    <section class="card leccion-card">
      <h2 class="card-title">Lección</h2>
      ${notes.length
        ? notes.map((note) => `
            <article class="leccion-note">
              <h3>${esc(note.title)}</h3>
              ${note.body ? `<p>${esc(note.body)}</p>` : ''}
              ${(note.images || []).length ? `<div class="note-photos">${note.images.map((photo) => `<button type="button" class="note-photo" data-action="open-photo" data-image-id="${esc(photo.id)}"><img data-image-id="${esc(photo.id)}" alt="Foto del apunte"></button>`).join('')}</div>` : ''}
            </article>`).join('')
        : `<p class="muted">Todavía no hay un apunte de este tema. Podés escribirlo en <strong>Apuntes</strong> y aparece acá como lección.</p>
           ${(plan.photos || []).length ? `<p class="muted small">Mientras tanto, mirá las fotos que cargaste en el plan:</p><div class="note-photos">${plan.photos.map((photo) => `<button type="button" class="note-photo" data-action="open-photo" data-image-id="${esc(photo.id)}"><img data-image-id="${esc(photo.id)}" alt="Foto del plan"></button>`).join('')}</div>` : ''}`}
    </section>

    <div class="leccion-actions">
      <button type="button" class="btn btn-primary" data-action="start-station" data-plan="${esc(plan.id)}" data-key="${esc(station.key)}">Empezar las ${count} preguntas</button>
      ${available < 12 ? `<button type="button" class="btn btn-soft" data-action="ai-station-questions" data-plan="${esc(plan.id)}" data-key="${esc(station.key)}">✨ Generar 12 preguntas con IA</button>` : ''}
      <button type="button" class="btn btn-soft" data-action="read-lesson">🔊 Escuchar</button>
      <button type="button" class="btn btn-plain" data-action="open-pizarra" data-plan="${esc(plan.id)}" data-key="${esc(station.key)}">Ver en pizarra</button>
      ${available && available < 10 ? `<span class="muted small">Hay ${available} preguntas cargadas. Con “Generar con IA” se crean 12 a partir de tus apuntes.</span>` : ''}
    </div>
  `;
}

export function renderPizarra(state, plan, station) {
  const subject = subjectById(plan.subjectId, state);
  const notes = lessonNotes(state, plan, station);
  const text = notes.length
    ? notes.map((note) => `${note.title}. ${note.body || ''}`.trim()).join('\n\n')
    : `Todavía no hay un apunte de ${station.topic}. Escribilo en Apuntes y aparece en la pizarra.`;
  const count = stationQuestions(plan, station).length ? 12 : 0;

  return `
    <button type="button" class="back" data-action="open-station" data-plan="${esc(plan.id)}" data-key="${esc(station.key)}">← Volver a la lección</button>

    <section class="pizarra-wrap">
      <div class="pizarra">
        <p class="pizarra-eyebrow">${station.final ? 'Repaso general' : 'Estación ' + (station.index + 1)} · ${esc(subject ? subject.name : '')}</p>
        <h1>${esc(station.topic)}</h1>
        <div class="pizarra-body" id="pizarra-text">${esc(text).replace(/\n/g, '<br>')}</div>
      </div>
      <div class="pizarra-actions">
        <button type="button" class="btn btn-primary" data-action="read-lesson">🔊 Leer en voz alta</button>
        <button type="button" class="btn btn-plain" data-action="stop-reading">Parar</button>
        <button type="button" class="btn btn-soft" data-action="start-station" data-plan="${esc(plan.id)}" data-key="${esc(station.key)}">Empezar las ${count} preguntas</button>
      </div>
    </section>
  `;
}
