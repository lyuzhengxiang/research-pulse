'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { SubscriptionType, UserSubscription } from '@research-pulse/shared';

export function SubscriptionManager({
  userId,
  initialSubscriptions,
  availableCategories,
  suggestedKeywords,
}: {
  userId: string;
  initialSubscriptions: UserSubscription[];
  availableCategories: string[];
  suggestedKeywords: string[];
}) {
  const [subs, setSubs] = useState(initialSubscriptions);
  const [tab, setTab] = useState<SubscriptionType>('keyword');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  function values(type: SubscriptionType) {
    return subs.filter((s) => s.sub_type === type).map((s) => s.value);
  }

  async function add(type: SubscriptionType, value: string) {
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
      }
      router.refresh();
    });
  }

  async function remove(type: SubscriptionType, value: string) {
    startTransition(async () => {
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('sub_type', type)
        .eq('value', value);
      setSubs((prev) => prev.filter((s) => !(s.sub_type === type && s.value === value)));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-border">
        {(['keyword', 'author', 'category'] as SubscriptionType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-xs uppercase tracking-[0.2em] transition border-b-2',
              tab === t
                ? 'border-up text-up'
                : 'border-transparent text-ink-dim hover:text-ink',
            )}
          >
            {t}.{values(t).length}
          </button>
        ))}
      </div>

      {tab === 'keyword' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <span className="self-center text-sm text-ink-dim">$</span>
            <input
              value={draftKeyword}
              onChange={(e) => setDraftKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  add('keyword', draftKeyword);
                  setDraftKeyword('');
                }
              }}
              placeholder="add_keyword  # e.g. diffusion, mamba, RLHF"
              className="flex-1 border border-border bg-bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-up focus:outline-none"
            />
            <button
              onClick={() => {
                add('keyword', draftKeyword);
                setDraftKeyword('');
              }}
              disabled={isPending || !draftKeyword.trim()}
              className="border border-up/60 bg-up/10 px-4 py-2 text-xs tracking-wider text-up transition hover:bg-up/20 disabled:opacity-30"
            >
              ADD
            </button>
          </div>
          <ChipList values={values('keyword')} onRemove={(v) => remove('keyword', v)} />
          {suggestedKeywords.length > 0 && (
            <div className="space-y-2 pt-3">
              <div className="text-xs uppercase tracking-[0.2em] text-ink-dim">
                // trending tokens in recent papers
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedKeywords
                  .filter((k) => !values('keyword').includes(k))
                  .slice(0, 30)
                  .map((k) => (
                    <button
                      key={k}
                      onClick={() => add('keyword', k)}
                      className="border border-border bg-bg-surface px-2 py-0.5 text-xs text-ink-dim transition hover:border-up/40 hover:text-up"
                    >
                      + {k}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'author' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <span className="self-center text-sm text-ink-dim">$</span>
            <input
              value={draftAuthor}
              onChange={(e) => setDraftAuthor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  add('author', draftAuthor);
                  setDraftAuthor('');
                }
              }}
              placeholder="add_author  # exact name as on arXiv (e.g. Yann LeCun)"
              className="flex-1 border border-border bg-bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-up focus:outline-none"
            />
            <button
              onClick={() => {
                add('author', draftAuthor);
                setDraftAuthor('');
              }}
              disabled={isPending || !draftAuthor.trim()}
              className="border border-up/60 bg-up/10 px-4 py-2 text-xs tracking-wider text-up transition hover:bg-up/20 disabled:opacity-30"
            >
              ADD
            </button>
          </div>
          <ChipList values={values('author')} onRemove={(v) => remove('author', v)} />
        </div>
      )}

      {tab === 'category' && (
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((c) => {
            const on = values('category').includes(c);
            return (
              <button
                key={c}
                onClick={() => (on ? remove('category', c) : add('category', c))}
                className={cn(
                  'border px-4 py-2 text-sm tracking-wider transition',
                  on
                    ? 'border-up/60 bg-up/10 text-up'
                    : 'border-border bg-bg-surface text-ink-dim hover:text-ink hover:border-bright',
                )}
              >
                {on ? '● ' : '○ '}
                {c}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChipList({
  values,
  onRemove,
}: {
  values: string[];
  onRemove: (v: string) => void;
}) {
  if (values.length === 0) {
    return <div className="text-sm text-ink-muted">// nothing added yet</div>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1.5 border border-up/40 bg-up/10 px-2 py-0.5 text-sm text-up"
        >
          {v}
          <button
            onClick={() => onRemove(v)}
            className="text-ink-dim transition hover:text-danger"
            aria-label="Remove"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
