'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Module-level singleton so every component that calls createClient()
// gets the same reference. Without this, each render would produce a
// fresh client, useEffect([..., supabase]) would see new deps on every
// render, and realtime channels would be torn down and re-subscribed in
// a loop — causing duplicate queries and flickering subscriptions.
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}
