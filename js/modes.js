/* Game mode metadata and difficulty curve. No data imports here. */
import { getLang } from './i18n.js';
export const MODES = {
  flags: {
    id: 'flags',
    icon: 'flag',
    accent: '#f7b83d',
    accentSoft: 'rgba(247,184,61,.14)',
    nameZh: '国旗挑战', nameEn: 'Flags of the World',
    nameEs: 'Banderas del mundo', nameFr: 'Drapeaux du monde',
    shortZh: '国旗', shortEn: 'Flags', shortEs: 'Banderas', shortFr: 'Drapeaux',
    descZh: '看国名，在旗帜中选出正确的一面。',
    descEn: 'Read the country name and pick its flag.',
    descEs: 'Lee el nombre del país y elige su bandera.',
    descFr: 'Lisez le nom du pays et choisissez son drapeau.',
    tagZh: '经典', tagEn: 'Classic', tagEs: 'Clásico', tagFr: 'Classique',
    askZh: '选出正确的国旗', askEn: 'Pick the correct flag',
    askEs: 'Elige la bandera correcta', askFr: 'Choisissez le bon drapeau',
    altTextZh: 'United States', altTextEn: '美国',
    color: 'gold',
  },
  capitals: {
    id: 'capitals',
    icon: 'landmark',
    accent: '#3bdcb4',
    accentSoft: 'rgba(59,220,180,.14)',
    nameZh: '首都挑战', nameEn: 'Capitals',
    nameEs: 'Capitales', nameFr: 'Capitales',
    shortZh: '首都', shortEn: 'Capitals', shortEs: 'Capitales', shortFr: 'Capitales',
    descZh: '这个国家的首都，你能脱口而出吗？',
    descEn: 'Can you name the capital of every country?',
    descEs: '¿Puedes decir la capital de cualquier país?',
    descFr: 'Saurez-vous nommer la capitale de chaque pays ?',
    tagZh: '必学', tagEn: 'Essential', tagEs: 'Esencial', tagFr: 'Essentiel',
    askZh: '这个国家的首都是？', askEn: 'What is the capital?',
    askEs: '¿Cuál es la capital?', askFr: 'Quelle est la capitale ?',
    color: 'teal',
  },
  countries: {
    id: 'countries',
    icon: 'map',
    accent: '#5aa9ff',
    accentSoft: 'rgba(90,169,255,.14)',
    nameZh: '国家挑战', nameEn: 'Countries of the World',
    nameEs: 'Países del mundo', nameFr: 'Pays du monde',
    shortZh: '国家', shortEn: 'Countries', shortEs: 'Países', shortFr: 'Pays',
    descZh: '看国旗和地图位置，认出这个国家。',
    descEn: 'Use the flag and map location to identify the country.',
    descEs: 'Usa la bandera y la ubicación en el mapa para identificar el país.',
    descFr: 'Utilisez le drapeau et la position sur la carte pour identifier le pays.',
    tagZh: '地理', tagEn: 'Geography', tagEs: 'Geografía', tagFr: 'Géographie',
    askZh: '这是哪个国家？', askEn: 'Which country is this?',
    askEs: '¿Qué país es este?', askFr: 'Quel est ce pays ?',
    color: 'blue',
  },
  population: {
    id: 'population',
    icon: 'users',
    accent: '#a98cff',
    accentSoft: 'rgba(169,140,255,.14)',
    nameZh: '人口挑战', nameEn: 'Population',
    nameEs: 'Población', nameFr: 'Population',
    shortZh: '人口', shortEn: 'Population', shortEs: 'Población', shortFr: 'Population',
    descZh: '比一比，哪个国家的人口更多？',
    descEn: 'Compare the numbers — which country has more people?',
    descEs: 'Compara las cifras: ¿qué país tiene más habitantes?',
    descFr: 'Comparez les chiffres : quel pays compte le plus d’habitants ?',
    tagZh: '数据', tagEn: 'Data', tagEs: 'Datos', tagFr: 'Données',
    askZh: '哪个国家人口更多？', askEn: 'Which country has a larger population?',
    askEs: '¿Qué país tiene más habitantes?', askFr: 'Quel pays compte le plus d’habitants ?',
    color: 'violet',
  },
  independence: {
    id: 'independence',
    icon: 'calendar',
    accent: '#ff7e8b',
    accentSoft: 'rgba(255,126,139,.14)',
    nameZh: '独立日', nameEn: 'Independence Day',
    nameEs: 'Día de la Independencia', nameFr: 'Jour de l’indépendance',
    shortZh: '历史', shortEn: 'History', shortEs: 'Historia', shortFr: 'Histoire',
    descZh: '从日期出发，追溯一个国家的独立时刻。',
    descEn: 'Trace a country’s independence day from the date.',
    descEs: 'Descubre qué país celebra su independencia en esa fecha.',
    descFr: 'Retrouvez le pays qui célèbre son indépendance à cette date.',
    tagZh: '历史', tagEn: 'History', tagEs: 'Historia', tagFr: 'Histoire',
    askZh: '哪个国家在这一天庆祝独立？', askEn: 'Which country celebrates independence on this day?',
    askEs: '¿Qué país celebra su independencia ese día?', askFr: 'Quel pays célèbre son indépendance ce jour-là ?',
    color: 'rose',
  },
};

export const MODE_ORDER = ['flags', 'capitals', 'countries', 'population', 'independence'];

export const LEVELS = [
  { n: 1, zh: '启程', en: 'Departure', es: 'Partida', fr: 'Départ', q: 10, secs: 16, options: 6, tiers: [1], mult: 1.0 },
  { n: 2, zh: '漫游', en: 'Wander', es: 'Paseo', fr: 'Balade', q: 10, secs: 15, options: 8, tiers: [1, 2], mult: 1.1 },
  { n: 3, zh: '深入', en: 'Explore', es: 'Explorar', fr: 'Explorer', q: 10, secs: 14, options: 8, tiers: [2], mult: 1.2 },
  { n: 4, zh: '挑战', en: 'Challenge', es: 'Desafío', fr: 'Défi', q: 10, secs: 13, options: 10, tiers: [2, 3], mult: 1.32 },
  { n: 5, zh: '极限', en: 'Extreme', es: 'Extremo', fr: 'Extrême', q: 10, secs: 12, options: 10, tiers: [3], mult: 1.45 },
  { n: 6, zh: '大师', en: 'Master', es: 'Maestro', fr: 'Maître', q: 10, secs: 10, options: 10, tiers: [1, 2, 3], mult: 1.6 },
];

export function levelConfig(level) {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, (level || 1) - 1))];
}

export const DAILY = { count: 12, hearts: 3, secs: 14 };
export const TOURNAMENT = { count: 15, hearts: 4, secs: 10, stages: [5, 5, 5] };

export function modeOf(id) { return MODES[id] || null; }

export function modeText(m, field) {
  const suffix = { zh: 'Zh', en: 'En', es: 'Es', fr: 'Fr' }[getLang()] || 'En';
  return m[`${field}${suffix}`] || m[`${field}En`] || '';
}

export function levelText(l) {
  const suffix = { zh: 'zh', en: 'en', es: 'es', fr: 'fr' }[getLang()] || 'en';
  return l[suffix] || l.en;
}
