-- 주방 대기 큐·테이블 타이머(사용 중) — 서버 재시작 후 복원용

create table if not exists public.kitchen_orders (
  id text primary key,
  table_number text not null,
  items jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists kitchen_orders_created_idx on public.kitchen_orders (created_at asc);
create index if not exists kitchen_orders_table_idx on public.kitchen_orders (table_number);

create table if not exists public.table_live_state (
  table_number text primary key,
  timer_started_at timestamptz null,
  bonus_limit_minutes integer not null default 0,
  cover_qty integer not null default 0
);
