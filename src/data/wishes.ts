import type { BirthdayWish } from '../simulation/shorelineEngine';

export interface BirthdayDetailsInput {
  name?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
  /** HH:MM (24h) or h:MM AM/PM */
  birthTime?: string;
}

export interface BirthdayDetails {
  name: string;
  age: number;
  /** e.g. "20th" */
  ageOrdinal: string;
  /** e.g. "5:42 AM" */
  timeLabel: string;
  /** e.g. "28 October" */
  dateLabel: string;
  /** e.g. "28 Oct" */
  dateShort: string;
  /** Birth moment in the viewer's local time zone (ms since epoch) */
  bornAtMs: number;
}

export const CREATOR_NAME = 'Ganeshan';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function toOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function parseBirthTime(raw: string | undefined): { hours24: number; minutes: number } {
  const match = raw?.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return { hours24: 0, minutes: 0 };
  let hours24 = Number(match[1]) % 24;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === 'pm' && hours24 < 12) hours24 += 12;
  if (meridiem === 'am' && hours24 === 12) hours24 = 0;
  return { hours24, minutes: Math.min(59, Number(match[2])) };
}

function formatBirthTime(hours24: number, minutes: number): string {
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  return `${hours24 % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** 175320 -> "175,320" (locale-independent so the carved glyphs are predictable) */
function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Resolves the .env details into carve-ready labels. The age is taken from the
 * birthday occurrence closest to `now`, so it reads right both just before and
 * just after the big day.
 */
export function resolveBirthdayDetails(
  input: BirthdayDetailsInput,
  now: Date
): BirthdayDetails {
  const name = input.name?.trim() || 'My Love';
  const dateMatch = input.birthDate?.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  const birthYear = dateMatch ? Number(dateMatch[1]) : now.getFullYear() - 20;
  const monthIdx = dateMatch ? Math.min(11, Math.max(0, Number(dateMatch[2]) - 1)) : now.getMonth();
  const day = dateMatch ? Number(dateMatch[3]) : now.getDate();

  let age = now.getFullYear() - birthYear;
  let closestGap = Infinity;
  for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    const gap = Math.abs(new Date(year, monthIdx, day).getTime() - now.getTime());
    if (gap < closestGap) {
      closestGap = gap;
      age = year - birthYear;
    }
  }

  const { hours24, minutes } = parseBirthTime(input.birthTime);

  return {
    name,
    age,
    ageOrdinal: toOrdinal(age),
    timeLabel: formatBirthTime(hours24, minutes),
    dateLabel: `${day} ${MONTHS[monthIdx]}`,
    dateShort: `${day} ${MONTHS[monthIdx].slice(0, 3)}`,
    bornAtMs: new Date(birthYear, monthIdx, day, hours24, minutes).getTime(),
  };
}

interface WishTemplate {
  /** Carved into the sand: letters, digits, space and ! ? , . ' - & : ♥ ★ only */
  text: string;
  subtitle: string;
  /** Shown beneath the sand, any characters allowed */
  note: string;
  /** Uses the {sinceHours}/{sinceMinutes}/{sinceSeconds} counter, so it is refilled at carve time */
  live?: boolean;
}

/**
 * Placeholders: {name} {age} {ageth} {time} {date} {dateShort} {from}
 * and, for live wishes, {sinceHours} {sinceMinutes} {sinceSeconds}.
 */
export const WISH_TEMPLATES: WishTemplate[] = [
  {
    text: 'Happy Birthday,\nMy love ♥',
    subtitle: 'The First Wave',
    note: 'The ocean has been practising all year just to write your name today. Happy {ageth} birthday, my love.',
  },
  {
    text: 'Prettier than\nevery sunset ♥',
    subtitle: 'Prettier Than Sunsets',
    note: "I've watched so many sunsets on this shore, and not one of them comes close to you. Happy birthday, beautiful. 🌅",
  },
  {
    text: 'Happy Birthday\nen chellam ♥',
    subtitle: 'En Chellam',
    note: 'Un sirippu dhaan en ulagame. Indha naal muzhusum unakku mattum dhaan, di. 💕',
  },
  {
    text: "It's been {sinceHours} hours,\n{sinceMinutes} minutes & {sinceSeconds} seconds\nsince you came ♥",
    subtitle: 'The Moment You Arrived',
    note: 'At {time} on {date}, the world got a little luckier. Years later, I got the luckiest. ✨',
    live: true,
  },
  {
    text: 'Oru devadai\nporandha naal ★',
    subtitle: 'Devadai Porandha Naal',
    note: '{date}, {time} — andha nimisham oru devadai bhoomikku vandhaa. Adhu nee dhaan di. 😇',
  },
  {
    text: 'Make a wish.\nI already got mine',
    subtitle: 'Already Mine',
    note: 'Close your eyes and wish for anything you want. Mine came true the day you walked into my life.',
  },
  {
    text: 'Nilambari,\nun kobam kooda azhagu',
    subtitle: 'En Nilambari',
    note: 'Ellaarum Nilambari-ku bayappaduvaanga... naan mattum un kobathukkum fan dhaan. Happy birthday, en Nilambari 😏👑',
  },
  {
    text: 'Un kannula dhaan\nen ulagam irukku',
    subtitle: 'Un Kannula',
    note: 'Andha oru paarvai podhum di, en naal muzhusum azhagaagidum. Un kannula dhaan naan tholanju poiten. 💫',
  },
  {
    text: 'Your name in the sand,\nyou in my heart ♥',
    subtitle: 'On Every Shore',
    note: "And every time the waves wash it away, I'll just write it again. Forever sounds about right. 🌊",
  },
  {
    text: 'Nee illama\nnaan illa di ♥',
    subtitle: 'Nee Illama',
    note: 'Kaalaila un good morning-la aarambichu, raathiri un kural-la dhaan en naal mudiyudhu. Nee illama naan illa di, en uyire. ❤️',
  },
  {
    text: 'Un sirippu podhum,\nvera edhuvum venam',
    subtitle: 'Un Sirippu',
    note: 'Endha beach-um, endha sunset-um un sirippukku munnadi thothu dhaan pogum. Adhu podhum enakku, eppovume. ♥',
  },
  {
    text: 'Birthday girl,\nwhatever you want ♥',
    subtitle: 'Birthday Girl Rules',
    note: "Today you're the boss: your favourite food, your playlist, your way. And yes, I come included with the gift. 😘",
  },
  {
    text: '{age} vayasu aanaalum\nnee en kutti dhaan',
    subtitle: 'En Chella Kutti',
    note: 'Ulagathukku nee periya ponnu aagalaam, aana enakku eppovume nee en chella kutti dhaan. 🥹',
  },
  {
    text: 'Still my favourite\nhello ♥',
    subtitle: 'Favourite Hello',
    note: 'Every time my phone lights up with your name, I smile like an idiot. Happy birthday to my favourite notification. 💗',
  },
  {
    text: 'Cake venuma,\nnaan venuma?',
    subtitle: 'Cake ah? Naan ah?',
    note: 'Cake venumna kudukkuren... aana main gift naan dhaan, okay va? 🎂😏',
  },
  {
    text: 'Lucky me,\nI get to love you ♥',
    subtitle: 'Lucky Me',
    note: 'Out of everyone in this world, I get to be the one who loves you. Still can\'t believe my luck. 🥂',
  },
  {
    text: 'Un kooda dhaan\nen full life',
    subtitle: 'Full Life',
    note: 'Indha birthday mattum illa — ella birthday-um un pakkathula dhaan irukkanum. Adhu dhaan en wish. 🤞',
  },
  {
    text: '{age} suits you,\nbut I suit you more',
    subtitle: 'Perfect Match',
    note: 'Turning {age} looks perfect on you. Me right beside you? Even better. 😉',
  },
  {
    text: 'Ennoda ellame\nneethan di ♥',
    subtitle: 'Ennoda Ellame',
    note: 'Happy {ageth} birthday, en kanmani. Innum nooru varusham un kooda ippadiye celebrate pannanum. 💞',
  },
  {
    text: 'From me to you,\nforever my love ♥',
    subtitle: 'From Me To You',
    note: 'Every wave, every wish, every line on this shore, all of it is from me to you. Happy {ageth} birthday, {name}. Forever yours, {from} ♥',
  },
];

function fillTemplate(template: string, details: BirthdayDetails, now: Date): string {
  const sinceSec = Math.max(0, Math.floor((now.getTime() - details.bornAtMs) / 1000));
  const values: Record<string, string> = {
    from: CREATOR_NAME,
    sinceHours: groupThousands(Math.floor(sinceSec / 3600)),
    sinceMinutes: String(Math.floor((sinceSec % 3600) / 60)),
    sinceSeconds: String(sinceSec % 60),
    name: details.name,
    age: String(details.age),
    ageth: details.ageOrdinal,
    time: details.timeLabel,
    date: details.dateLabel,
    dateShort: details.dateShort,
  };
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function buildBirthdayWishes(details: BirthdayDetails, now: Date): BirthdayWish[] {
  return WISH_TEMPLATES.map((template, i) => ({
    id: `wish-${i + 1}`,
    index: i + 1,
    text: fillTemplate(template.text, details, now),
    subtitle: fillTemplate(template.subtitle, details, now),
    note: fillTemplate(template.note, details, now),
    live: template.live,
  }));
}

/** Refills a live wish (e.g. the since-you-were-born counter) for the moment it starts carving */
export function refreshLiveWish(wish: BirthdayWish, details: BirthdayDetails, now: Date): BirthdayWish {
  if (!wish.live) return wish;
  const template = WISH_TEMPLATES[wish.index - 1];
  if (!template) return wish;
  return { ...wish, text: fillTemplate(template.text, details, now) };
}
