// Animales del avatar: cada nivel desbloquea uno mejor. Todos en tonos rosa.
// El orden va del más lento al más veloz; el guepardo (cheetah) es el mejor.

const C = {
  cream: '#f472b6',
  berry: '#9d174d',
  pink: '#ec4899',
  rose: '#fbcfe8',
  deep: '#831843',
  white: '#ffffff',
};

const eyes = (y = 32, r = 2.4) => `
  <circle cx="25" cy="${y}" r="${r}" fill="${C.berry}"/>
  <circle cx="39" cy="${y}" r="${r}" fill="${C.berry}"/>
  <circle cx="25.8" cy="${y - 0.9}" r="0.8" fill="${C.white}"/>
  <circle cx="39.8" cy="${y - 0.9}" r="0.8" fill="${C.white}"/>`;

const nose = (y = 39, fill = C.pink) => `
  <path d="M32 ${y}l-3.2 3.4h6.4z" fill="${fill}"/>
  <path d="M32 ${y + 3.4}v2.4" stroke="${C.berry}" stroke-width="1.6" stroke-linecap="round"/>`;

const svg = (inner) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

const caracol = svg(`
  <path d="M9 48c0-3.6 3.4-6 8-6h25c7 0 11 3 11 7 0 3.4-3.2 5.6-8 5.6H16c-4.4 0-7-2.4-7-6.6z" fill="${C.cream}"/>
  <circle cx="49" cy="40" r="7.4" fill="${C.cream}"/>
  <path d="M46.5 33.5l2.2-8M52 34l4-7" stroke="${C.cream}" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="48.2" cy="24" r="2.2" fill="${C.rose}"/>
  <circle cx="56.4" cy="25.6" r="2.2" fill="${C.rose}"/>
  <circle cx="49.6" cy="39" r="1.7" fill="${C.berry}"/>
  <circle cx="27" cy="33" r="14.5" fill="${C.cream}"/>
  <circle cx="27" cy="33" r="10.5" fill="none" stroke="${C.pink}" stroke-width="2.6"/>
  <circle cx="27" cy="33" r="6" fill="none" stroke="${C.pink}" stroke-width="2.6"/>
  <circle cx="27" cy="33" r="2" fill="${C.pink}"/>
`);

const gato = svg(`
  <path d="M13 31 16.5 9 30 19.5z" fill="${C.cream}"/>
  <path d="M51 31 47.5 9 34 19.5z" fill="${C.cream}"/>
  <path d="M17 27.5 19 13.5l8.6 6.4z" fill="${C.rose}"/>
  <path d="M47 27.5 45 13.5l-8.6 6.4z" fill="${C.rose}"/>
  <circle cx="32" cy="34" r="17.5" fill="${C.cream}"/>
  ${eyes(32)}
  ${nose(38, C.pink)}
  <path d="M14 33h9M14 38l9 2M50 33h-9M50 38l-9 2" stroke="${C.rose}" stroke-width="1.7" stroke-linecap="round"/>
`);

const perro = svg(`
  <ellipse cx="14.5" cy="31" rx="7.5" ry="13" fill="${C.pink}"/>
  <ellipse cx="49.5" cy="31" rx="7.5" ry="13" fill="${C.pink}"/>
  <circle cx="32" cy="33" r="16.5" fill="${C.cream}"/>
  <ellipse cx="32" cy="41" rx="10" ry="7.5" fill="${C.rose}"/>
  ${eyes(30)}
  <ellipse cx="32" cy="39.5" rx="4.4" ry="3.2" fill="${C.berry}"/>
  <path d="M32 42.5v3.4" stroke="${C.berry}" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M28 49c1.4 2.2 3 3 4 3s2.6-.8 4-3" fill="${C.pink}"/>
`);

const conejo = svg(`
  <rect x="20.5" y="5" width="8.4" height="27" rx="4.2" fill="${C.cream}"/>
  <rect x="35.1" y="5" width="8.4" height="27" rx="4.2" fill="${C.cream}"/>
  <rect x="23.4" y="9.5" width="2.8" height="16" rx="1.4" fill="${C.rose}"/>
  <rect x="37.8" y="9.5" width="2.8" height="16" rx="1.4" fill="${C.rose}"/>
  <circle cx="32" cy="38" r="16.5" fill="${C.cream}"/>
  ${eyes(36)}
  ${nose(42, C.pink)}
  <rect x="28.6" y="46" width="6.8" height="5.6" rx="1.6" fill="${C.white}"/>
  <path d="M32 46.2v5.2M28.8 46.2h6.4" stroke="${C.rose}" stroke-width="1.2"/>
`);

const zorro = svg(`
  <path d="M10 36 14 8l16 11z" fill="${C.pink}"/>
  <path d="M54 36 50 8 34 19z" fill="${C.pink}"/>
  <path d="M13.8 33 16 12.6l11 7.6z" fill="${C.rose}"/>
  <path d="M50.2 33 48 12.6l-11 7.6z" fill="${C.rose}"/>
  <path d="M32 12c11.4 0 18 10 18 20.4C50 44 42.4 51 32 51S14 44 14 32.4C14 22 20.6 12 32 12z" fill="${C.cream}"/>
  ${eyes(32)}
  ${nose(41, C.berry)}
  <path d="M22 39c2 3 4 4.4 6 4.4M42 39c-2 3-4 4.4-6 4.4" stroke="${C.rose}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M20 29c2.4-4 6-5 8-4M44 29c-2.4-4-6-5-8-4" stroke="${C.rose}" stroke-width="1.6" stroke-linecap="round"/>
`);

const jirafa = svg(`
  <path d="M26 22v-9M38 22v-9" stroke="${C.cream}" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="26" cy="10.5" r="3.2" fill="${C.pink}"/>
  <circle cx="38" cy="10.5" r="3.2" fill="${C.pink}"/>
  <ellipse cx="17" cy="26" rx="5.6" ry="3.6" fill="${C.rose}"/>
  <ellipse cx="47" cy="26" rx="5.6" ry="3.6" fill="${C.rose}"/>
  <ellipse cx="32" cy="30" rx="13" ry="13.5" fill="${C.cream}"/>
  <ellipse cx="32" cy="43" rx="13.5" ry="9.5" fill="${C.cream}"/>
  <circle cx="25" cy="24" r="2.6" fill="${C.pink}"/>
  <circle cx="38.5" cy="23" r="2.2" fill="${C.pink}"/>
  <circle cx="22" cy="36" r="2.4" fill="${C.pink}"/>
  <circle cx="42" cy="35" r="2.6" fill="${C.pink}"/>
  ${eyes(29, 2.2)}
  <ellipse cx="32" cy="45.5" rx="6.4" ry="4.2" fill="${C.rose}"/>
  <circle cx="29" cy="45" r="1.3" fill="${C.berry}"/>
  <circle cx="35" cy="45" r="1.3" fill="${C.berry}"/>
`);

const leon = svg(`
  <g fill="${C.pink}">
    ${Array.from({ length: 12 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 12;
      const cx = 32 + Math.cos(angle) * 19;
      const cy = 34 + Math.sin(angle) * 19;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7.2"/>`;
    }).join('')}
  </g>
  <circle cx="32" cy="34" r="17" fill="${C.cream}"/>
  <circle cx="22" cy="22" r="4.6" fill="${C.rose}"/>
  <circle cx="42" cy="22" r="4.6" fill="${C.rose}"/>
  ${eyes(32)}
  <path d="M32 38l-3 3h6z" fill="${C.deep}"/>
  <path d="M32 41v3.2" stroke="${C.berry}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M26 46c2 2 4 2.6 6 2.6s4-.6 6-2.6" stroke="${C.rose}" stroke-width="1.7" stroke-linecap="round"/>
`);

const guepardo = svg(`
  <circle cx="17.5" cy="20" r="5.6" fill="${C.pink}"/>
  <circle cx="46.5" cy="20" r="5.6" fill="${C.pink}"/>
  <circle cx="17.5" cy="20" r="2.6" fill="${C.rose}"/>
  <circle cx="46.5" cy="20" r="2.6" fill="${C.rose}"/>
  <circle cx="32" cy="34" r="17.5" fill="${C.cream}"/>
  <g fill="${C.berry}">
    <circle cx="23" cy="20.5" r="1.9"/>
    <circle cx="41" cy="20.5" r="1.9"/>
    <circle cx="19.5" cy="29" r="1.8"/>
    <circle cx="44.5" cy="29" r="1.8"/>
    <circle cx="26" cy="45" r="1.8"/>
    <circle cx="38" cy="45" r="1.8"/>
  </g>
  ${eyes(32)}
  <path d="M25 35.5c-1.4 3.6-1.8 6.2-1.4 8.4M39 35.5c1.4 3.6 1.8 6.2 1.4 8.4" stroke="${C.berry}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <ellipse cx="32" cy="43" rx="8" ry="5.4" fill="${C.white}"/>
  <path d="M32 40.6l-3 3.2h6z" fill="${C.deep}"/>
  <path d="M32 43.8v2.6" stroke="${C.berry}" stroke-width="1.5" stroke-linecap="round"/>
`);

export const ANIMALS = [
  { id: 'caracol', name: 'Caracol', level: 1, svg: caracol },
  { id: 'gato', name: 'Gato', level: 2, svg: gato },
  { id: 'perro', name: 'Perro', level: 3, svg: perro },
  { id: 'conejo', name: 'Conejo', level: 4, svg: conejo },
  { id: 'zorro', name: 'Zorro', level: 5, svg: zorro },
  { id: 'jirafa', name: 'Jirafa', level: 6, svg: jirafa },
  { id: 'leon', name: 'León', level: 7, svg: leon },
  { id: 'guepardo', name: 'Guepardo', level: 8, svg: guepardo },
];

export function orderedAnimals(order = null) {
  if (!Array.isArray(order) || !order.length) return ANIMALS;
  const mapped = order.map((id) => ANIMALS.find((animal) => animal.id === id)).filter(Boolean);
  return mapped.length === ANIMALS.length ? mapped : ANIMALS;
}

export function animalForLevel(level, order = null) {
  const list = orderedAnimals(order);
  const index = Math.min(Math.max(1, Number(level) || 1) - 1, list.length - 1);
  return list[index];
}

export function nextAnimalForLevel(level) {
  const value = Math.max(1, Number(level) || 1);
  return ANIMALS.find((animal) => animal.level > value) || null;
}

export function animalAvatar(animal, className = '') {
  return `<span class="animal-avatar ${className}" aria-hidden="true">${animal.svg}</span>`;
}
