import type { SupabaseClient } from '@supabase/supabase-js';
import type { Paper, UserSubscription } from '@research-pulse/shared';

const ROMAN_MAJOR = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
const ROMAN_MINOR = ['III','IV','V','VI','VII','VIII','IX'];

export type DrawnCard = {
  paper: Paper;
  roman: string;
  position: 'past' | 'present' | 'future';
  reversed: boolean;
};

export type TodayReading = {
  dateLabel: string;        // 'TUESDAY · 28 APRIL 2026'
  drawnAt: string;          // '09:00 UTC'
  past: DrawnCard;
  present: DrawnCard;
  future: DrawnCard;
  minor: Array<{ paper: Paper; roman: string }>;
  interpretation: string;
};

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function dawnWindow(now: Date): { from: Date; to: Date; label: string; drawnAt: string } {
  const dawn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0));
  let to: Date;
  if (now.getTime() >= dawn.getTime()) to = dawn;
  else to = new Date(dawn.getTime() - 24 * 3600 * 1000);
  const from = new Date(to.getTime() - 24 * 3600 * 1000);
  const dayName = to.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase();
  const dom = to.getUTCDate();
  const month = to.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }).toUpperCase();
  const year = to.getUTCFullYear();
  return {
    from,
    to,
    label: `${dayName} · ${dom} ${month} ${year}`,
    drawnAt: '09:00 UTC',
  };
}

const INTERPRETATIONS = [
  'The Star rises in the present — the workshop is loud, the wires hum with discovery. Behind, an older theme echoes still; ahead, the Wheel turns reversed, leaner and quieter.',
  'A Tower in the present cracks the day open: the assumptions of last week look frail in the new light. The Hermit, behind, kept counsel; the Lovers, reversed, advise patience.',
  'The Sun in the present, plainly. The Moon, behind, kept the field guessing; the Wheel ahead reverses with grace. Brightness follows brightness today — a rare, generous reading.',
  'Strength rises now and the field aligns. What was hidden in yesterday’s notebook becomes citation. What waits ahead is reversed only because the room is too small for it.',
  'The Magician in the present — small tools, large effects. Past as Empress; future, the Hanged One reversed: a stalled idea shaking loose. The week tilts toward synthesis.',
  'Death in the present — a pleasant card, despite the name. An old benchmark falls; the Hierophant, behind, ratifies; the Star ahead promises a clean mathematics.',
  'The Fool in the present, undeterred. Justice held the line behind; the Chariot reversed runs ahead, slower than expected. The day rewards the curious over the aggressive.',
];

function pickInterpretation(seed: number, present: Paper, past: Paper, future: Paper): string {
  const base = INTERPRETATIONS[seed % INTERPRETATIONS.length];
  // Try a small substitution: lift the dominant theme of the present card
  const themeOf = (p: Paper) => {
    const c = p.primary_category;
    if (c.startsWith('cs.CL')) return 'language';
    if (c.startsWith('cs.CV')) return 'vision';
    if (c.startsWith('cs.LG')) return 'learning';
    if (c.startsWith('cs.AI')) return 'reasoning';
    if (c.startsWith('stat.ML')) return 'statistics';
    return 'inquiry';
  };
  const intro = `In the present, ${themeOf(present)}; behind, ${themeOf(past)}; ahead, ${themeOf(future)}. `;
  return intro + base;
}

export async function fetchTodayReading(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<TodayReading | null> {
  const now = new Date();
  const { from, to, label, drawnAt } = dawnWindow(now);

  let candidatePool: Paper[] = [];

  if (userId) {
    const { data: subRows } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId);
    const subs = (subRows ?? []) as UserSubscription[];

    const keywords = subs.filter((s) => s.sub_type === 'keyword').map((s) => s.value);
    const authors = subs.filter((s) => s.sub_type === 'author').map((s) => s.value);
    const categories = subs.filter((s) => s.sub_type === 'category').map((s) => s.value);

    if (keywords.length || authors.length || categories.length) {
      const orFilters: string[] = [];
      for (const cat of categories) orFilters.push(`categories.cs.{${cat}}`);
      for (const kw of keywords) {
        const safe = kw.replace(/[%,]/g, '');
        orFilters.push(`title.ilike.%${safe}%`);
        orFilters.push(`abstract.ilike.%${safe}%`);
      }
      for (const a of authors) orFilters.push(`authors.cs.{${a}}`);

      const { data } = await supabase
        .from('papers')
        .select('*')
        .or(orFilters.join(','))
        .gte('published_at', from.toISOString())
        .lte('published_at', to.toISOString())
        .order('pulse_score', { ascending: false })
        .limit(50);
      candidatePool = (data ?? []) as Paper[];
    }
  }

  if (candidatePool.length < 3) {
    const { data } = await supabase
      .from('papers')
      .select('*')
      .gte('published_at', from.toISOString())
      .lte('published_at', to.toISOString())
      .order('pulse_score', { ascending: false })
      .limit(50);
    candidatePool = (data ?? []) as Paper[];
  }

  if (candidatePool.length < 3) {
    const { data } = await supabase
      .from('papers')
      .select('*')
      .order('pulse_score', { ascending: false })
      .limit(50);
    candidatePool = (data ?? []) as Paper[];
  }

  if (candidatePool.length < 3) return null;

  const dateKey = `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, '0')}-${String(to.getUTCDate()).padStart(2, '0')}`;
  const seed = hashSeed(`${dateKey}:${userId ?? 'guest'}`);
  const rng = makeRng(seed);

  const major = pickN(candidatePool, 3, rng);
  const remaining = candidatePool.filter((p) => !major.includes(p));
  const minor = pickN(remaining, 5, rng);

  const reservedRomans = new Set<string>();
  function pickRoman(): string {
    let r = ROMAN_MAJOR[Math.floor(rng() * ROMAN_MAJOR.length)];
    let guard = 0;
    while (reservedRomans.has(r) && guard++ < 30) {
      r = ROMAN_MAJOR[Math.floor(rng() * ROMAN_MAJOR.length)];
    }
    reservedRomans.add(r);
    return r;
  }

  const past: DrawnCard = {
    paper: major[0],
    roman: pickRoman(),
    position: 'past',
    reversed: false,
  };
  const present: DrawnCard = {
    paper: major[1],
    roman: pickRoman(),
    position: 'present',
    reversed: false,
  };
  const future: DrawnCard = {
    paper: major[2],
    roman: pickRoman(),
    position: 'future',
    reversed: rng() < 0.5,
  };

  return {
    dateLabel: label,
    drawnAt,
    past,
    present,
    future,
    minor: minor.map((p, i) => ({ paper: p, roman: ROMAN_MINOR[i] })),
    interpretation: pickInterpretation(seed, present.paper, past.paper, future.paper),
  };
}
