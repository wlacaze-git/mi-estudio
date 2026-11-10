// Perla: la compañera de estudio. Responde con los datos reales de la app.
import { countdownLabel, fmtLong, relativeLabel, todayISO } from './dates.js';
import {
  averageGrade, classesToday, notesSorted, studyPlan, subjectById, tasksForDate, upcomingExams,
} from './store.js';

function subjectName(plan, state) {
  const subject = subjectById(plan.subjectId, state);
  return subject ? subject.name : 'Materia';
}

function listPlans(state) {
  const plans = upcomingExams(state).slice(0, 3);
  if (!plans.length) return 'No tenés exámenes ni tests agendados. Podés crear uno en Calendario → + Nuevo plan.';
  return `Esto es lo que se viene:\n${plans.map((plan) => `• ${plan.title} (${subjectName(plan, state)}) — ${relativeLabel(plan.date)}`).join('\n')}`;
}

function listTasks(state) {
  const tasks = tasksForDate(todayISO(), state);
  if (!tasks.length) return 'Hoy no tenés tareas del plan. Podés practicar con tarjetas o crear un plan nuevo.';
  return `Para hoy tenés:\n${tasks.slice(0, 6).map((task) => `• ${task.topic} (${subjectName(task.exam, state)})`).join('\n')}`;
}

function listGrades(state) {
  const graded = (state.exams || []).filter((plan) => Number.isFinite(plan.grade)).slice(-5).reverse();
  const average = averageGrade(state);
  if (!graded.length) return 'Todavía no tengo notas tuyas. Cuando te tomen un examen o test, contame la nota y la guardo.';
  return `Tus últimas notas:\n${graded.map((plan) => `• ${plan.title}: ${plan.grade}`).join('\n')}${average != null ? `\nPromedio: ${average}` : ''}`;
}

function listClasses(state) {
  const classes = classesToday(todayISO(), state);
  if (!classes.length) return 'Hoy no hay clases en tu horario.';
  return `Hoy tenés:\n${classes.map((clase) => `• ${clase.start}–${clase.end} ${subjectName({ subjectId: clase.subjectId }, state)}${clase.teacher ? ' (' + clase.teacher + ')' : ''}`).join('\n')}`;
}

function listNotes(state, query) {
  const notes = notesSorted(state);
  if (!notes.length) return 'Todavía no hay apuntes guardados. Podés crearlos en Apuntes.';
  if (query) {
    const lower = query.toLowerCase();
    const found = notes.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(lower));
    if (found.length) {
      return `Encontré esto en tus apuntes:\n${found.slice(0, 3).map((note) => `• ${note.title}: ${String(note.body).replace(/\s+/g, ' ').slice(0, 120)}…`).join('\n')}`;
    }
  }
  return `Tenés ${notes.length} apuntes: ${notes.slice(0, 5).map((note) => note.title).join(' · ')}.`;
}

export function welcomeText(state) {
  const next = upcomingExams(state)[0];
  const base = '¡Hola! Soy Perla 🐆 tu compañera de estudio. Puedo mirar tus exámenes, tu horario, tus apuntes y tus notas.';
  return next
    ? `${base}\n\nLo próximo: ${next.title} (${subjectName(next, state)}), ${relativeLabel(next.date)}.`
    : `${base}\n\nTodavía no tenés exámenes agendados.`;
}

export function gradeQuestion(plan, state) {
  return `Antes de empezar: ¿qué nota te sacaste en "${plan.title}" (${subjectName(plan, state)})?`;
}

export function buildReply(state, text, attachments = {}) {
  const t = String(text || '').toLowerCase();
  const images = attachments.images || [];
  const notes = attachments.notes || [];
  const videos = attachments.youtube || [];

  if (notes.length) {
    return `Guardé ${notes.length === 1 ? 'el apunte' : 'los apuntes'} "${notes.map((note) => note.title).join(', ')}". Cuando quieras te hago preguntas de esa materia.`;
  }
  if (videos.length) {
    return 'Guardé el video. Miralo y después contame qué te quedó, así lo repasamos juntos.';
  }
  if (images.length) {
    return 'Guardé la foto en nuestro chat. Por ahora no puedo leer imágenes solita, pero queda guardada para que la mires cuando quieras.';
  }

  if (/^(hola|hey|holaa|buenas|buen día|buen dia)/.test(t)) {
    return `¡Hola! ¿En qué te ayudo? Podés preguntarme por tus exámenes, tus notas, tu horario o tus apuntes.`;
  }
  if (/(examen|exámenes|test|prueba|rendir)/.test(t)) return listPlans(state);
  if (/(hoy|estudiar|tarea|repasar)/.test(t)) return listTasks(state);
  if (/(nota|notas|promedio|me fue)/.test(t)) return listGrades(state);
  if (/(horario|clase|clases|profe)/.test(t)) return listClasses(state);
  if (/(apunte|apuntes|resumen)/.test(t)) return listNotes(state);
  if (/(gracias|genial|buenísimo|buenisimo)/.test(t)) return '¡De nada! Seguí así 💪';

  const words = t.split(/\s+/).filter((word) => word.length >= 5);
  if (words.length) {
    const found = listNotes(state, words[0]);
    if (found.startsWith('Encontré')) return found;
  }

  return 'Puedo ayudarte con tus exámenes, tus notas, el horario y tus apuntes. Probá con “¿qué examen tengo?”, “¿qué estudio hoy?” o “¿cómo me fue?”. Para charlas libres necesito que me conecten una IA (todavía no la tengo).';
}

export function gradeSummaryLine(plan, state) {
  return `${plan.title} · ${fmtLong(plan.date)} · nota ${plan.grade}`;
}

export function planCountdown(plan) {
  return plan.date ? countdownLabel(plan.date) : 'sin fecha';
}

export function studyProgress(plan, state) {
  const data = studyPlan(plan, state);
  return `${data.items.filter((item) => item.done).length}/${data.items.length}`;
}
