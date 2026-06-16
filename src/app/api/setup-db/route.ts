import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const queries = [
    `create table if not exists public.portfolio (
      id uuid default gen_random_uuid() primary key,
      user_id text not null,
      set_number text not null,
      set_name text,
      purchase_price numeric,
      condition text default 'sealed',
      intent text default 'undecided',
      notes text,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now()
    )`,
    `create table if not exists public.watchlist (
      id uuid default gen_random_uuid() primary key,
      user_id text not null,
      set_number text not null,
      set_name text,
      target_price numeric,
      created_at timestamp with time zone default now()
    )`,
    `create table if not exists public.alerts (
      id uuid default gen_random_uuid() primary key,
      user_id text not null,
      set_number text not null,
      set_name text,
      type text,
      message text,
      dismissed boolean default false,
      created_at timestamp with time zone default now()
    )`,
    `create table if not exists public.price_targets (
      id uuid default gen_random_uuid() primary key,
      user_id text not null,
      set_number text not null,
      set_name text,
      target_price numeric,
      target_type text default 'sell',
      achieved boolean default false,
      created_at timestamp with time zone default now()
    )`,
    `create table if not exists public.user_preferences (
      id uuid default gen_random_uuid() primary key,
      user_id text not null unique,
      goal text default 'investor',
      currency text default 'AUD',
      onboarding_completed boolean default false,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now()
    )`,
    `create index if not exists portfolio_user_id_idx on public.portfolio(user_id)`,
    `create index if not exists watchlist_user_id_idx on public.watchlist(user_id)`,
    `create index if not exists alerts_user_id_idx on public.alerts(user_id)`,
    `create index if not exists targets_user_id_idx on public.price_targets(user_id)`,
  ];

  const results = [];
  for (const query of queries) {
    const { error } = await supabaseAdmin.rpc("exec_sql", { sql: query }).single();
    results.push({ query: query.substring(0, 50), error: error?.message });
  }

  return Response.json({ results });
}
