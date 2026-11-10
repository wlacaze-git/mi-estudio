// Motor de práctica: elige preguntas, arma la sesión y calcula el resultado.
import { getState, questionsOf, uid } from './store.js';
import { todayISO } from './dates.js';

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Prioriza las preguntas que más le costaron y las que todavía no vio. */
function weightOf(question) {
  const st = question.stats || { correct: 0, wrong: 0 };
  const seen = (st.correct || 0) + (st.wrong || 0);
  if (seen === 0) return 2.2;
  const accuracy = (st.correct || 0) / seen;
  return Math.max(0.15, 1.6 - accuracy * 1.3);
}

function weightedPick(questions, count) {
  const pool = questions.map((q) => ({ q, w: weightOf(q) }));
  const picked = [];
  while (picked.length < count && pool.length) {
    const total = pool.reduce((acc, item) => acc + item.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) { idx = i; break; }
    }
    picked.push(pool[idx].q);
    pool.splice(idx, 1);
  }
  return picked;
}

export function candidateQuestions({ subjectId = null, onlyWrong = false } = {}) {
  const s = getState();
  let pool = subjectId ? questionsOf(subjectId, s) : [...s.questions];
  if (onlyWrong) {
    pool = pool.filter((q) => {
      const st = q.stats || {};
      return (st.wrong || 0) > (st.correct || 0);
    });
  }
  return pool.filter((q) => q.text && Array.isArray(q.options) && q.options.length >= 2);
}

export function buildSession({ subjectId = null, mode = 'practice', count = 10, questionIds = null } = {}) {
  const onlyWrong = mode === 'review';
  let pool = candidateQuestions({ subjectId, onlyWrong });
  if (Array.isArray(questionIds) && questionIds.length) {
    const all = candidateQuestions({});
    const byId = new Map(all.map((q) => [q.id, q]));
    pool = questionIds.map((id) => byId.get(id)).filter(Boolean);
  }
  if (!pool.length) return null;

  const chosen = Array.isArray(questionIds) && questionIds.length
    ? pool
    : weightedPick(pool, Math.min(count, pool.length));
  const items = chosen.map((question) => {
    const options = shuffle(
      question.options.map((text, i) => ({ text, correct: i === question.correct }))
    );
    return { question, options, chosenIndex: null, ok: null };
  });

  return {
    id: uid('session'),
    mode,
    subjectId,
    startedAt: new Date().toISOString(),
    items,
    index: 0,
    finished: false,
  };
}

export function currentItem(session) {
  return session.items[session.index] || null;
}

export function answerCurrent(session, optionIndex) {
  const item = currentItem(session);
  if (!item || item.ok !== null) return session;
  item.chosenIndex = optionIndex;
  item.ok = Boolean(item.options[optionIndex] && item.options[optionIndex].correct);
  return session;
}

export function nextQuestion(session) {
  if (session.index < session.items.length - 1) {
    session.index += 1;
  } else {
    session.finished = true;
  }
  return session;
}

export function sessionResult(session) {
  const total = session.items.length;
  const correct = session.items.filter((i) => i.ok).length;
  return {
    total,
    correct,
    percent: total ? Math.round((correct / total) * 100) : 0,
    answers: session.items.map((i) => ({
      questionId: i.question.id,
      text: i.question.text,
      correct: Boolean(i.ok),
      chosen: i.chosenIndex != null ? i.options[i.chosenIndex].text : null,
      expected: i.options.find((o) => o.correct)?.text || '',
      explanation: i.question.explanation || '',
    })),
  };
}

export function buildAttempt(session) {
  const result = sessionResult(session);
  const subjectId = session.subjectId
    || (session.items[0] ? session.items[0].question.subjectId : null);
  return {
    id: session.id,
    date: todayISO(),
    subjectId,
    mode: session.mode,
    total: result.total,
    correct: result.correct,
    percent: result.percent,
    answers: result.answers.map((a) => ({ questionId: a.questionId, correct: a.correct })),
  };
}

export function gradeMessage(percent) {
  if (percent === 100) return { emoji: '🏆', title: '¡Perfecto!', text: 'Todas bien. Esto ya lo tenés.' };
  if (percent >= 80) return { emoji: '🎉', title: '¡Muy bien!', text: 'Ya casi lo dominás. Repasá lo que falló y listo.' };
  if (percent >= 60) return { emoji: '👍', title: '¡Bien!', text: 'Vas por buen camino. Otra vuelta y queda.' };
  if (percent >= 40) return { emoji: '💪', title: 'A seguir', text: 'Todavía hay temas para repasar. Probá de nuevo las que fallaste.' };
  return { emoji: '📚', title: 'A estudiar', text: 'No pasa nada: mirá las explicaciones y volvé a intentar.' };
}

/* ------------------------- Tarjetas de estudio ------------------------- */

/** Arma tarjetas (pregunta al frente, respuesta atrás) a partir del banco de preguntas. */
export function buildFlashcards({ subjectId = null, count = 10, questionIds = null } = {}) {
  let pool = candidateQuestions({ subjectId });
  if (Array.isArray(questionIds) && questionIds.length) {
    const all = candidateQuestions({});
    const byId = new Map(all.map((q) => [q.id, q]));
    pool = questionIds.map((id) => byId.get(id)).filter(Boolean);
  }
  if (!pool.length) return null;
  const chosen = Array.isArray(questionIds) && questionIds.length
    ? pool
    : weightedPick(pool, Math.min(count, pool.length));
  return {
    id: uid('cards'),
    subjectId,
    items: chosen.map((q) => ({
      questionId: q.id,
      subjectId: q.subjectId,
      front: q.text,
      back: q.options[q.correct] || '',
      explanation: q.explanation || '',
    })),
    index: 0,
    flipped: false,
    finished: false,
    results: [],
  };
}

export function currentCard(session) {
  return session && !session.finished ? session.items[session.index] || null : null;
}

export function answerCard(session, knew) {
  const card = currentCard(session);
  if (!card) return session;
  session.results.push({ questionId: card.questionId, ok: Boolean(knew) });
  if (session.index < session.items.length - 1) {
    session.index += 1;
    session.flipped = false;
  } else {
    session.finished = true;
  }
  return session;
}

export function cardSummary(session) {
  const total = session.items.length;
  const known = session.results.filter((r) => r.ok).length;
  return { total, known, percent: total ? Math.round((known / total) * 100) : 0 };
}

/* --------------------- Estaciones del camino --------------------- */

export function stationPool(plan, station) {
  const s = getState();
  const subjectQuestions = s.questions.filter((q) => q.subjectId === plan.subjectId);
  if (station.final) return { matching: subjectQuestions, rest: [] };
  const topic = String(station.topic || '').toLowerCase();
  const matching = subjectQuestions.filter((q) => {
    const value = String(q.topic || '').toLowerCase();
    return value && (value.includes(topic) || topic.includes(value));
  });
  const rest = subjectQuestions.filter((q) => !matching.includes(q));
  return { matching, rest };
}

export function stationQuestions(plan, station) {
  const { matching, rest } = stationPool(plan, station);
  return [...matching, ...rest];
}

export function buildStationSession(plan, station, { count = 12 } = {}) {
  const { matching, rest } = stationPool(plan, station);
  const ordered = [...shuffle(matching), ...shuffle(rest)];
  if (!ordered.length) return null;
  const chosen = [];
  while (chosen.length < count) {
    for (const question of shuffle(ordered)) {
      if (chosen.length >= count) break;
      chosen.push(question);
    }
  }
  const items = chosen.map((question) => {
    const options = shuffle(
      question.options.map((text, i) => ({ text, correct: i === question.correct }))
    );
    return { question, options, chosenIndex: null, ok: null };
  });
  return {
    id: uid('station'),
    mode: 'station',
    subjectId: plan.subjectId,
    station: { planId: plan.id, key: station.key, topic: station.topic, final: station.final },
    items,
    index: 0,
    finished: false,
  };
}
