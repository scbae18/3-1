-- Supabase SQL Editor에서 한 번 실행하거나, CLI 마이그레이션으로 적용하세요.
-- 서버는 service_role 키로 접속하므로 RLS는 선택 사항입니다.

create table if not exists public.shop_settings (
  id integer primary key default 1 check (id = 1),
  default_limit_minutes integer not null default 90,
  extension_minutes integer not null default 60,
  sold_out_ids integer[] not null default '{}'
);

insert into public.shop_settings (id, default_limit_minutes, extension_minutes, sold_out_ids)
values (1, 90, 60, '{}')
on conflict (id) do nothing;

create table if not exists public.reservations (
  id text primary key,
  name text not null,
  party_size integer not null,
  phone text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists reservations_active_created_idx
  on public.reservations (created_at asc)
  where deleted_at is null;

create table if not exists public.order_events (
  id text primary key,
  table_number text not null,
  items jsonb not null,
  total_amount integer not null,
  created_at timestamptz not null default now()
);

create index if not exists order_events_created_idx on public.order_events (created_at asc);
