// Utilidades de fechas y exportación a calendario (.ics)
export const WEEKDAYS_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
export const WEEKDAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const pad = (n) => String(n).padStart(2, '0');

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, days) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Días que faltan de `from` a `to`. Negativo si `to` ya pasó. */
export function diffDays(from, to) {
  return Math.round((fromISO(to) - fromISO(from)) / 86400000);
}

export function fmtLong(iso) {
  return fromISO(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function fmtMedium(iso) {
  return fromISO(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtShort(iso) {
  return fromISO(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export function fmtNumeric(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

export function monthLabel(year, month) {
  const name = MONTHS[month];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

/** 0 = lunes … 6 = domingo */
export function weekdayMonday(iso) {
  return (fromISO(iso).getDay() + 6) % 7;
}

/** Matriz de 6 semanas (42 celdas ISO) para el mes dado. */
export function monthMatrix(year, month) {
  const first = new Date(year, month, 1, 12);
  const start = new Date(first);
  start.setDate(start.getDate() - ((first.getDay() + 6) % 7));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ iso: toISO(d), inMonth: d.getMonth() === month, day: d.getDate() });
  }
  return cells;
}

export function relativeLabel(iso, today = todayISO()) {
  const n = diffDays(today, iso);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  if (n > 1) return `en ${n} días`;
  return `hace ${Math.abs(n)} días`;
}

export function countdownLabel(iso, today = todayISO()) {
  const n = diffDays(today, iso);
  if (n === 0) return '¡Es hoy!';
  if (n === 1) return 'Falta 1 día';
  if (n > 1) return `Faltan ${n} días`;
  return 'Ya pasó';
}

/* ------------------------------------------------------------------ */
/* Exportación a calendario (.ics) para que el iPad avise solo         */
/* ------------------------------------------------------------------ */

function escapeICS(text) {
  return String(text == null ? '' : text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// RFC 5545: las líneas no deberían superar los 75 octetos (UTF-8).
// Las líneas largas se cortan y continúan con un espacio inicial.
function fold(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts = [];
  let current = '';
  let limit = 75;
  for (const char of line) {
    if (encoder.encode(current + char).length > limit && current) {
      parts.push(current);
      current = char;
      limit = 74;
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

function stampUTC(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildICS(exams, subjects, calendarName = 'Exámenes') {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mi Estudio//Examenes//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const exam of exams) {
    const subject = byId.get(exam.subjectId);
    const subjectName = subject ? subject.name : 'Examen';
    const summary = `${subjectName}: ${exam.title || 'Examen'}`;
    const description = [
      exam.topics && exam.topics.length ? `Temas: ${exam.topics.join(' · ')}` : '',
      exam.notes || '',
      'Agregado desde Mi Estudio',
    ].filter(Boolean).join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:exam-${exam.id}@mi-estudio`);
    lines.push(`DTSTAMP:${stampUTC()}`);
    lines.push(`DTSTART;VALUE=DATE:${exam.date.replace(/-/g, '')}`);
    lines.push(`DTEND;VALUE=DATE:${addDays(exam.date, 1).replace(/-/g, '')}`);
    lines.push(fold(`SUMMARY:${escapeICS(summary)}`));
    if (description) lines.push(fold(`DESCRIPTION:${escapeICS(description)}`));
    lines.push(`CATEGORIES:${escapeICS(subjectName)}`);
    // Aviso 2 días antes a las 18:00 y 1 día antes a las 18:00
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(fold(`DESCRIPTION:${escapeICS(`Faltan 2 días para ${summary}`)}`));
    lines.push('TRIGGER:-P2DT6H');
    lines.push('END:VALARM');
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(fold(`DESCRIPTION:${escapeICS(`Mañana es ${summary}`)}`));
    lines.push('TRIGGER:-PT6H');
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
