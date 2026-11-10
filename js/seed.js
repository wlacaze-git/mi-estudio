// Datos de ejemplo que se cargan la primera vez.
// Sirven para que la app se entienda desde el minuto cero: después se editan o se borran.
import { addDays, todayISO } from './dates.js';

export const DEMO_FLAG = 'demo';

export function seedState() {
  const today = todayISO();

  const subjects = [
    { id: 'mat', name: 'Matemática', emoji: '🧮', color: '#f43f5e' },
    { id: 'his', name: 'Historia', emoji: '🏛️', color: '#f59e0b' },
    { id: 'bio', name: 'Biología', emoji: '🧬', color: '#10b981' },
  ];

  const exams = [
    {
      id: 'ex-mat',
      subjectId: 'mat',
      title: 'Fracciones y ecuaciones',
      date: addDays(today, 6),
      topics: ['Fracciones equivalentes', 'Suma y resta de fracciones', 'Ecuaciones simples'],
      notes: 'Traer calculadora y regla.',
      demo: true,
    },
    {
      id: 'ex-his',
      subjectId: 'his',
      title: 'Revolución de Mayo',
      date: addDays(today, 12),
      topics: ['Causas internas y externas', 'Semana de Mayo', 'Primera Junta'],
      notes: '',
      demo: true,
    },
    {
      id: 'ex-bio',
      subjectId: 'bio',
      title: 'La célula',
      date: addDays(today, 19),
      topics: ['Partes de la célula', 'Membrana y núcleo', 'Fotosíntesis'],
      notes: '',
      demo: true,
    },
  ];

  const questions = [
    // Matemática
    {
      id: 'q-mat-1', subjectId: 'mat', topic: 'Suma y resta de fracciones', demo: true,
      text: '¿Cuánto es 1/2 + 1/4?',
      options: ['2/6', '1/6', '3/4', '2/4'], correct: 2,
      explanation: 'Con el mismo denominador (cuartos): 1/2 son 2/4, y 2/4 + 1/4 = 3/4.',
    },
    {
      id: 'q-mat-2', subjectId: 'mat', topic: 'Fracciones equivalentes', demo: true,
      text: '¿Qué fracción es equivalente a 2/3?',
      options: ['3/4', '4/6', '5/8', '2/6'], correct: 1,
      explanation: 'Si multiplicás numerador y denominador por el mismo número: 2/3 = 4/6.',
    },
    {
      id: 'q-mat-3', subjectId: 'mat', topic: 'Ecuaciones simples', demo: true,
      text: 'Si 3x = 12, ¿cuánto vale x?',
      options: ['3', '4', '9', '36'], correct: 1,
      explanation: 'Dividís los dos lados por 3: x = 12 ÷ 3 = 4.',
    },
    {
      id: 'q-mat-4', subjectId: 'mat', topic: 'Fracciones equivalentes', demo: true,
      text: '¿Cuál de estas fracciones es la más grande?',
      options: ['1/2', '3/5', '5/8', '2/3'], correct: 3,
      explanation: '2/3 ≈ 0,67 es mayor que 5/8 (0,625), 3/5 (0,6) y 1/2 (0,5).',
    },
    {
      id: 'q-mat-5', subjectId: 'mat', topic: 'Fracciones equivalentes', demo: true,
      text: '¿Cuánto es 2/3 de 9?',
      options: ['3', '6', '9', '12'], correct: 1,
      explanation: '9 ÷ 3 = 3 (un tercio), y 2 tercios son 3 × 2 = 6.',
    },
    // Historia
    {
      id: 'q-his-1', subjectId: 'his', topic: 'Semana de Mayo', demo: true,
      text: '¿En qué año ocurrió la Revolución de Mayo?',
      options: ['1806', '1810', '1816', '1820'], correct: 1,
      explanation: 'Fue en 1810, entre el 18 y el 25 de mayo, en Buenos Aires.',
    },
    {
      id: 'q-his-2', subjectId: 'his', topic: 'Primera Junta', demo: true,
      text: '¿Qué gobierno reemplazó al virrey el 25 de mayo de 1810?',
      options: ['La Primera Junta', 'El Congreso de Tucumán', 'La Junta Grande', 'El Cabildo Abierto'], correct: 0,
      explanation: 'El Cabildo Abierto del 22 de mayo votó la destitución del virrey Cisneros y se formó la Primera Junta.',
    },
    {
      id: 'q-his-3', subjectId: 'his', topic: 'Primera Junta', demo: true,
      text: '¿Quién presidió la Primera Junta?',
      options: ['Manuel Belgrano', 'Mariano Moreno', 'Cornelio Saavedra', 'José de San Martín'], correct: 2,
      explanation: 'Cornelio Saavedra fue su presidente; Mariano Moreno y Belgrano también eran miembros.',
    },
    {
      id: 'q-his-4', subjectId: 'his', topic: 'Causas internas y externas', demo: true,
      text: '¿Qué hecho de Europa influyó en la Revolución de Mayo?',
      options: ['La invasión napoleónica a España', 'La independencia de Estados Unidos', 'La Revolución Industrial', 'La caída del Imperio romano'], correct: 0,
      explanation: 'En 1808 Napoleón tomó el poder en España y dejó al rey preso: eso debilitó la autoridad del virrey.',
    },
    {
      id: 'q-his-5', subjectId: 'his', topic: 'Causas internas y externas', demo: true,
      text: '¿Quién creó el Ejército de los Andes?',
      options: ['Manuel Belgrano', 'José de San Martín', 'Martín Miguel de Güemes', 'Bernardino Rivadavia'], correct: 1,
      explanation: 'San Martín lo organizó en Cuyo para cruzar la cordillera y liberar Chile y Perú.',
    },
    // Biología
    {
      id: 'q-bio-1', subjectId: 'bio', topic: 'Partes de la célula', demo: true,
      text: '¿Cuál es la unidad básica de todos los seres vivos?',
      options: ['El átomo', 'La célula', 'El tejido', 'El órgano'], correct: 1,
      explanation: 'Todos los seres vivos están formados por una o más células.',
    },
    {
      id: 'q-bio-2', subjectId: 'bio', topic: 'Partes de la célula', demo: true,
      text: '¿Qué organela produce la energía de la célula?',
      options: ['El núcleo', 'La mitocondria', 'El ribosoma', 'La vacuola'], correct: 1,
      explanation: 'La mitocondria hace la respiración celular y genera energía (ATP).',
    },
    {
      id: 'q-bio-3', subjectId: 'bio', topic: 'Membrana y núcleo', demo: true,
      text: '¿Qué estructura controla qué entra y qué sale de la célula?',
      options: ['El núcleo', 'La membrana plasmática', 'El citoplasma', 'La mitocondria'], correct: 1,
      explanation: 'La membrana plasmática es selectiva: deja pasar algunas sustancias y otras no.',
    },
    {
      id: 'q-bio-4', subjectId: 'bio', topic: 'Fotosíntesis', demo: true,
      text: 'En la fotosíntesis, ¿qué gas liberan las plantas?',
      options: ['Dióxido de carbono', 'Oxígeno', 'Nitrógeno', 'Hidrógeno'], correct: 1,
      explanation: 'Las plantas toman dióxido de carbono y agua, y liberan oxígeno.',
    },
    {
      id: 'q-bio-5', subjectId: 'bio', topic: 'Membrana y núcleo', demo: true,
      text: '¿Dónde está guardado el material genético en una célula eucariota?',
      options: ['En el núcleo', 'En el lisosoma', 'En la vacuola', 'En el aparato de Golgi'], correct: 0,
      explanation: 'El ADN está en el núcleo, protegido por la envoltura nuclear.',
    },
  ];

  return {
    version: 1,
    student: '',
    createdAt: new Date().toISOString(),
    subjects,
    exams,
    questions,
    notes: [
      {
        id: 'n-mat',
        subjectId: 'mat',
        title: 'Fracciones: lo que más toma',
        body: 'Para sumar y restar fracciones necesito el mismo denominador.\n\nEjemplo: 1/2 + 1/4 → 1/2 es lo mismo que 2/4, entonces 2/4 + 1/4 = 3/4.\n\nTruco para comparar: si los denominadores son distintos, multiplico en cruz. 2/3 vs 5/8 → 2×8 = 16 y 5×3 = 15, entonces 2/3 es más grande.\n\nOjo con las equivalentes: 2/3 = 4/6 = 6/9 (multiplico arriba y abajo por el mismo número).',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        demo: true,
      },
      {
        id: 'n-his',
        subjectId: 'his',
        title: 'Semana de Mayo, día por día',
        body: '18 de mayo: se pide al virrey que convoque a un Cabildo Abierto.\n22 de mayo: Cabildo Abierto. Se vota si el virrey sigue o no. Gana el "no".\n23 de mayo: se forma una junta, pero el virrey intenta quedarse.\n24 de mayo: renuncia Cisneros.\n25 de mayo: asume la Primera Junta, presidida por Cornelio Saavedra.\n\nPara acordarme: 18 pide, 22 vota, 25 asume.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        demo: true,
      },
      {
        id: 'n-bio',
        subjectId: 'bio',
        title: 'La célula en 5 puntos',
        body: '1. La célula es la unidad más chica con vida.\n2. Membrana plasmática: controla qué entra y qué sale.\n3. Núcleo: guarda el ADN.\n4. Mitocondria: produce energía (respiración celular).\n5. Fotosíntesis (en plantas): toma CO2 y agua, y libera oxígeno.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        demo: true,
      },
    ],
    schedule: [
      { id: 'c-mat-lun', subjectId: 'mat', day: 1, start: '08:00', end: '09:20', teacher: 'Laura Gómez', room: '', demo: true },
      { id: 'c-his-lun', subjectId: 'his', day: 1, start: '09:30', end: '10:50', teacher: 'Diego Fernández', room: '', demo: true },
      { id: 'c-bio-mar', subjectId: 'bio', day: 2, start: '08:00', end: '09:20', teacher: 'Marina Ruiz', room: '', demo: true },
      { id: 'c-mat-mie', subjectId: 'mat', day: 3, start: '10:00', end: '11:20', teacher: 'Laura Gómez', room: '', demo: true },
      { id: 'c-bio-jue', subjectId: 'bio', day: 4, start: '08:00', end: '09:20', teacher: 'Marina Ruiz', room: '', demo: true },
      { id: 'c-his-vie', subjectId: 'his', day: 5, start: '09:30', end: '10:50', teacher: 'Diego Fernández', room: '', demo: true },
    ],
    attempts: [],
    planDone: {},
    daysStudied: [],
    settings: { showDemo: true },
  };
}

