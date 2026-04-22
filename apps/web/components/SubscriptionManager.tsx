'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
      <div className="flex gap-2 border-b border-white/10">
        {(['keyword', 'author', 'category'] as SubscriptionType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${
              tab === t ? 'border-b-2 border-accent-500 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {t}s ({values(t).length})
          </button>
        ))}
      </div>

      {tab === 'keyword' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={draftKeyword}
              onChange={(e) => setDraftKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  add('keyword', draftKeyword);
                  setDraftKeyword('');
                }
              }}
              placeholder="e.g. diffusion, mamba, RLHF"
              className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                add('keyword', draftKeyword);
                setDraftKeyword('');
              }}
              disabled={isPending || !draftKeyword.trim()}
              className="rounded-md bg-accent-600 px-3 py-2 text-sm text-white hover:bg-accent-700 disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <ChipList values={values('keyword')} onRemove={(v) => remove('keyword', v)} />
          {suggestedKeywords.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/50">
                Trending in recent papers
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedKeywords
                  .filter((k) => !values('keyword').includes(k))
                  .slice(0, 30)
                  .map((k) => (
                    <button
                      key={k}
                      onClick={() => add('keyword', k)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-white/70 hover:border-accent-500/50 hover:text-white"
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
            <input
              value={draftAuthor}
              onChange={(e) => setDraftAuthor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  add('author', draftAuthor);
                  setDraftAuthor('');
                }
              }}
              placeholder="e.g. Yann LeCun (exact name as on arXiv)"
              className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                add('author', draftAuthor);
                setDraftAuthor('');
              }}
              disabled={isPending || !draftAuthor.trim()}
              className="rounded-md bg-accent-600 px-3 py-2 text-sm text-white hover:bg-accent-700 disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <ChipList values={values('author')} onRemove={(v) => remove('author', v)} />
        </div>
      )}

      {tab === 'category' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((c) => {
              const on = values('category').includes(c);
              return (
                <button
                  key={c}
                  onClick={() => (on ? remove('category', c) : add('category', c))}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${
                    on
                      ? 'border-accent-500 bg-accent-500/20 text-accent-200'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {on ? '✓ ' : ''}
                  {c}
                </button>
              );
            })}
          </div>
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
    return <div className="text-sm text-white/40">Nothing added yet.</div>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-xs"
        >
          {v}
          <button
            onClick={() => onRemove(v)}
            className="text-white/60 hover:text-white"
            aria-label="Remove"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
