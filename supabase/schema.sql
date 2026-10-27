-- ============================================================
--  OrderBoard — Supabase schema
--  Paste this whole file into:  Supabase Dashboard > SQL Editor > New query > Run
--  Safe to re-run: it drops and recreates everything.
-- ============================================================

-- ---------- clean slate ----------
drop table if exists order_events cascade;
drop table if exists order_items  cascade;
drop table if exists orders       cascade;
drop table if exists app_config   cascade;
drop sequence if exists order_no_seq;

-- ---------- order numbers start at 101 (#101, #102, ...) ----------
create sequence order_no_seq start with 101;

-- ---------- orders ----------
create table orders (
  id              bigint primary key generated always as identity,
  order_no        integer not null default nextval('order_no_seq'),
  order_date      date    not null default current_date,
  due_date        date    not null default current_date,
  due_time        time,
  customer_name   text    not null,
  customer_phone  text,
  order_name      text,
  notes           text,
  urgent          boolean not null default false,
  status          text    not null default 'new'
                  check (status in ('new','cooking','done','cancelled')),
  created_by      text,
  updated_by      text,          -- who last changed the status (for the log)
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  completed_by    text,
  whatsapp_sent_at timestamptz
);

create index orders_status_idx on orders (status);
create index orders_due_idx    on orders (due_date, due_time);
create index orders_created_idx on orders (created_at desc);

-- ---------- line items (one order -> many items) ----------
create table order_items (
  id        bigint primary key generated always as identity,
  order_id  bigint not null references orders(id) on delete cascade,
  qty       numeric(10,2) not null default 1,
  unit      text   not null default 'lb',
  item_en   text   not null,
  item_pa   text,
  note      text,
  position  integer not null default 0
);

create index order_items_order_idx on order_items (order_id);

-- ---------- events: comments + full audit log ----------
create table order_events (
  id         bigint primary key generated always as identity,
  order_id   bigint not null references orders(id) on delete cascade,
  kind       text   not null default 'comment'
             check (kind in ('created','comment','status','edited','whatsapp')),
  body       text,
  author     text,
  lang       text default 'en',
  created_at timestamptz not null default now()
);

create index order_events_order_idx on order_events (order_id, created_at);

-- ---------- app-wide settings (single row) ----------
create table app_config (
  id               integer primary key default 1 check (id = 1),
  whatsapp_phone   text,
  whatsapp_apikey  text,
  shop_name        text default 'Sweet Shop',
  default_lang     text default 'pa',
  updated_at       timestamptz not null default now()
);

insert into app_config (id) values (1);

-- ============================================================
--  Triggers: automatically write the audit log
-- ============================================================

create or replace function log_order_created() returns trigger as $$
begin
  insert into order_events (order_id, kind, body, author)
  values (new.id, 'created', 'Order created', coalesce(new.created_by, 'front desk'));
  return new;
end;
$$ language plpgsql;

create trigger trg_log_order_created
  after insert on orders
  for each row execute function log_order_created();

create or replace function log_status_change() returns trigger as $$
begin
  if new.status is distinct from old.status then
    insert into order_events (order_id, kind, body, author)
    values (new.id, 'status', old.status || ' -> ' || new.status,
            coalesce(new.updated_by, 'kitchen'));

    -- stamp timings automatically
    if new.status = 'cooking' and new.started_at is null then
      new.started_at := now();
    end if;
    if new.status = 'done' and new.completed_at is null then
      new.completed_at := now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_log_status_change
  before update on orders
  for each row execute function log_status_change();

-- ============================================================
--  Row Level Security
--  No login screen, so the public "anon" key is allowed full access.
--  See the Security section of README.md before going live.
-- ============================================================

alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table order_events enable row level security;
alter table app_config   enable row level security;

create policy anon_all_orders on orders
  for all to anon using (true) with check (true);
create policy anon_all_items on order_items
  for all to anon using (true) with check (true);
create policy anon_all_events on order_events
  for all to anon using (true) with check (true);
create policy anon_all_config on app_config
  for all to anon using (true) with check (true);

-- Supabase normally grants these automatically, but being explicit means this
-- script also works on a project where those defaults were changed.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on orders, order_items, order_events, app_config to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ============================================================
--  Realtime: push changes to every open screen instantly
-- ============================================================

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table order_events;

-- ============================================================
--  Handy view for the log / exports
-- ============================================================

create or replace view order_log with (security_invoker = on) as
select
  o.id,
  o.order_no,
  o.order_date,
  o.due_date,
  o.due_time,
  o.customer_name,
  o.customer_phone,
  o.order_name,
  o.status,
  o.urgent,
  o.created_at,
  o.completed_at,
  o.completed_by,
  o.whatsapp_sent_at,
  (select string_agg(trim_scale(i.qty) || ' ' || i.unit || ' ' || i.item_en, ', ' order by i.position)
     from order_items i where i.order_id = o.id) as items,
  (select count(*) from order_events e
     where e.order_id = o.id and e.kind = 'comment')  as comment_count
from orders o;

-- The view is created after the grants above, so it needs its own.
grant select on order_log to anon, authenticated;

-- Done. You should see "Success. No rows returned".
