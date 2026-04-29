'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Stamp } from './Stamp';
import type { SubscriptionType, UserSubscription } from '@research-pulse/shared';

const ARTICLE_LABELS: Record<SubscriptionType, { roman: string; title: string; descriptor: string; color: 'red' | 'blue' | 'brown' }> = {
  keyword: {
    roman: 'I',
    title: 'Keywords',
    descriptor:
      'Show papers whose title or abstract contains any of these words.',
    color: 'red',
  },
  author: {
    roman: 'II',
    title: 'Authors',
    descriptor:
      'Show every new paper by these authors.',
    color: 'blue',
  },
  category: {
    roman: 'III',
    title: 'arXiv Categories',
    descriptor:
      'Pull new papers from these arXiv categories. Click to toggle.',
    color: 'brown',
  },
};

export function SubscriptionManager({
  userId,
  email,
  initialSubscriptions,
  availableCategories,
  suggestedKeywords,
}: {
  userId: string;
  email: string;
  initialSubscriptions: UserSubscription[];
  availableCategories: string[];
  suggestedKeywords: string[];
}) {
  const [subs, setSubs] = useState(initialSubscriptions);
  const [draftKeyword, setDraftKeyword] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  function values(type: SubscriptionType) {
    return subs.filter((s) => s.sub_type === type).map((s) => s.value);
  }

  function add(type: SubscriptionType, value: string) {
    const trimmed = value.trim();
    if (!trimmed || values(type).includes(trimmed)) return;

    startTransition(async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({ user_id: userId, sub_type: type, value: trimmed })
        .select()
        .single();
      if (!error && data) {
        setSubs((prev) => [...prev, data as UserSubscription]);
        setSavedAt(new Date().toISOString());
      }
      router.refresh();
    });
  }

  function remove(type: SubscriptionType, value: string) {
    startTransition(async () => {
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('sub_type', type)
        .eq('value', value);
      setSubs((prev) => prev.filter((s) => !(s.sub_type === type && s.value === value)));
      setSavedAt(new Date().toISOString());
      router.refresh();
    });
  }

  return (
    <>
      <Article type="keyword">
        <p className="m-0 mb-2.5 font-serif italic text-[15px] text-[#3a342b]">
          {ARTICLE_LABELS.keyword.descriptor}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {values('keyword').map((k) => (
            <Stamp key={k} color="red" onRemove={() => remove('keyword', k)}>
              {k}
            </Stamp>
          ))}
          <span className="font-mono text-meta text-ink-mute" style={{ padding: '4px 10px' }}>
            +
          </span>
          <input
            value={draftKeyword}
            onChange={(e) => setDraftKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                add('keyword', draftKeyword);
                setDraftKeyword('');
              }
            }}
            placeholder="add term, then ↵"
            className="border-b border-dotted border-ink-rule bg-transparent font-serif italic text-[16px] outline-none placeholder:text-ink-mute"
            style={{ width: 200, padding: '2px 0' }}
          />
        </div>
        {suggestedKeywords.length > 0 && (
          <div className="mt-3.5">
            <div className="mb-1.5 font-mono text-ticker uppercase tracking-mono-uc text-ink-mute">
              suggested
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedKeywords
                .filter((k) => !values('keyword').includes(k))
                .slice(0, 24)
                .map((k) => (
                  <button
                    key={k}
                    onClick={() => add('keyword', k)}
                    className="font-mono text-meta text-ink-mute transition hover:text-almanac-red"
                    style={{ border: '1px dotted #bdb29b', padding: '2px 8px' }}
                  >
                    + {k}
                  </button>
                ))}
            </div>
          </div>
        )}
      </Article>

      <Article type="author">
        <p className="m-0 mb-2.5 font-serif italic text-[15px] text-[#3a342b]">
          {ARTICLE_LABELS.author.descriptor}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {values('author').map((a) => (
            <Stamp key={a} color="blue" onRemove={() => remove('author', a)}>
              {a}
            </Stamp>
          ))}
          <span className="font-mono text-meta text-ink-mute" style={{ padding: '4px 10px' }}>
            +
          </span>
          <input
            value={draftAuthor}
            onChange={(e) => setDraftAuthor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                add('author', draftAuthor);
                setDraftAuthor('');
              }
            }}
            placeholder="add author, then ↵"
            className="border-b border-dotted border-ink-rule bg-transparent font-serif italic text-[16px] outline-none placeholder:text-ink-mute"
            style={{ width: 220, padding: '2px 0' }}
          />
        </div>
      </Article>

      <Article type="category">
        <p className="m-0 mb-2.5 font-serif italic text-[15px] text-[#3a342b]">
          {ARTICLE_LABELS.category.descriptor}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {availableCategories.map((c) => {
            const on = values('category').includes(c);
            return on ? (
              <Stamp key={c} color="brown" onRemove={() => remove('category', c)}>
                {c}
              </Stamp>
            ) : (
              <button
                key={c}
                onClick={() => add('category', c)}
                className="font-mono text-meta text-ink-mute transition hover:text-almanac-brown"
                style={{ border: '1px dotted #bdb29b', padding: '4px 10px' }}
              >
                + {c}
              </button>
            );
          })}
        </div>
      </Article>

      <div className="mt-6 flex items-center justify-between border-t-[3px] border-double border-ink-rule pt-3.5">
        <div className="font-serif italic text-[15px] text-ink-mute">
          Signed in as&nbsp;
          <span className="font-serif font-semibold not-italic text-ink">
            {email.split('@')[0]}
          </span>
          &nbsp;· {email}
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="font-mono text-ticker text-ink-mute">
              {isPending ? 'saving…' : 'saved ✓'}
            </span>
          )}
          <span className="font-mono text-meta uppercase tracking-[0.2em] text-ink-mute">
            changes save automatically
          </span>
        </div>
      </div>
    </>
  );
}

const ALT_BG: Record<string, boolean> = { keyword: true, category: true };

function Article({
  type,
  children,
}: {
  type: 'keyword' | 'author' | 'category';
  children: React.ReactNode;
}) {
  const meta = ARTICLE_LABELS[type];
  const tinted = ALT_BG[type] ?? false;
  return (
    <section
      className="mt-3.5 border border-ink-rule p-4.5"
      style={{
        background: tinted ? '#e9e2d2' : 'transparent',
        padding: '14px 18px',
      }}
    >
      <div className="mb-2 font-mono text-ticker uppercase tracking-kicker">
        Article {meta.roman} · {meta.title}
      </div>
      {children}
    </section>
  );
}
