'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type TelegramKind = 'filed' | 'star_surge' | 'hn_front' | 'github_found' | 'hn_found';

export type Telegram = {
  id: string;
  ts: string; // 'HH:MM:SS' UTC
  kind: TelegramKind;
  text: string;
  arxivId: string | null;
};

const KIND_COLOR: Record<TelegramKind, string> = {
  star_surge: '#b1342a',
  hn_front: '#7a4f0c',
  github_found: '#214a8a',
  hn_found: '#7a4f0c',
  filed: '#16110b',
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(
    d.getUTCMinutes(),
  ).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;
}

export function Telegrams({
  initial,
  userId,
}: {
  initial: Telegram[];
  userId: string | null;
}) {
  const [items, setItems] = useState<Telegram[]>(initial);
  const [pulse, setPulse] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    function prepend(t: Telegram) {
      setItems((prev) => {
        if (prev.find((x) => x.id === t.id)) return prev;
        return [t, ...prev].slice(0, 12);
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }

    const ch = supabase
      .channel('telegrams')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'papers' },
        (payload) => {
          const p = payload.new as { arxiv_id: string; title: string; created_at: string };
          prepend({
            id: `filed:${p.arxiv_id}`,
            ts: fmtTime(p.created_at ?? new Date().toISOString()),
            kind: 'filed',
            text: `new · ${truncate(p.title, 48)}`,
            arxivId: p.arxiv_id,
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'paper_links' },
        (payload) => {
          const l = payload.new as { id: number; arxiv_id: string; source: string; external_id: string; discovered_at: string };
          if (l.source === 'github' && l.external_id !== 'none') {
            prepend({
              id: `gh:${l.id}`,
              ts: fmtTime(l.discovered_at ?? new Date().toISOString()),
              kind: 'github_found',
              text: `code found · gh/${truncate(l.external_id, 28)}`,
              arxivId: l.arxiv_id,
            });
          } else if (l.source === 'hn') {
            prepend({
              id: `hn:${l.id}`,
              ts: fmtTime(l.discovered_at ?? new Date().toISOString()),
              kind: 'hn_found',
              text: `posted on Hacker News`,
              arxivId: l.arxiv_id,
            });
          }
        },
      )
      .subscribe();

    if (userId) {
      const alertsCh = supabase
        .channel(`telegrams:alerts:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_alerts',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const a = payload.new as {
              id: number;
              arxiv_id: string;
              alert_type: string;
              payload: { stars_gained?: number; ratio?: number };
              created_at: string;
            };
            if (a.alert_type === 'star_surge') {
              const gained = a.payload?.stars_gained ?? 0;
              const ratio = a.payload?.ratio;
              prepend({
                id: `alert:${a.id}`,
                ts: fmtTime(a.created_at),
                kind: 'star_surge',
                text: `+${gained} ★ in 1h${ratio ? ` · ${ratio}× baseline` : ''}`,
                arxivId: a.arxiv_id,
              });
            }
          },
        )
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
        supabase.removeChannel(alertsCh);
      };
    }

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId]);

  return (
    <aside aria-label="Telegrams">
      <div className="flex items-center justify-between border-b border-ink-rule pb-1 font-mono text-ticker uppercase tracking-kicker">
        <span>Live Activity</span>
        <span
          className="h-1.5 w-1.5 rounded-full transition"
          style={{
            background: pulse ? '#b1342a' : '#bdb29b',
            boxShadow: pulse ? '0 0 6px #b1342a' : 'none',
          }}
          aria-hidden
        />
      </div>
      <ol className="mt-1">
        {items.length === 0 ? (
          <li className="py-3 text-meta italic text-ink-mute">
            — quiet for now —
          </li>
        ) : (
          items.map((t) => {
            const inner = (
              <span className="block telegram-in border-b border-dotted border-ink-rule py-1.5 leading-snug">
                <span className="font-mono text-ticker text-ink-mute">{t.ts} ─ </span>
                <span
                  className="text-[12px]"
                  style={{
                    color: KIND_COLOR[t.kind],
                    fontWeight: t.kind === 'star_surge' ? 700 : 400,
                  }}
                >
                  {t.text}
                </span>
                {t.arxivId && (
                  <span className="font-mono text-ticker text-ink-mute"> · {t.arxivId}</span>
                )}
              </span>
            );
            return (
              <li key={t.id}>
                {t.arxivId ? (
                  <Link
                    href={`/paper/${encodeURIComponent(t.arxivId)}`}
                    className="almanac-link block transition hover:bg-paper-2"
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })
        )}
      </ol>
    </aside>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
