-- ============================================================
--  OrderBoard — require a signed-in staff account
--
--  WHAT THIS DOES
--  Until now the public "anon" key could read and write every table, which
--  means anyone who found the site URL could too. This hands that access to
--  the "authenticated" role instead, so a request only works if it carries a
--  real Supabase session.
--
--  RUN THIS LAST. In order:
--    1. Publish the updated site (it has the sign-in screen).
--    2. Supabase -> Authentication -> Users -> Add user: make the staff
--       accounts, with "Auto Confirm User" ticked.
--    3. Supabase -> Authentication -> Sign In / Providers -> Email:
--       turn OFF "Allow new users to sign up".
--    4. Sign in on one screen and check you can see the board.
--    5. Then run this file.
--
--  Running it before step 4 will make the app show "not connected" until
--  somebody signs in. Nothing is lost either way, and it is reversible with
--  the rollback block at the bottom.
--
--  Safe to run twice. It does not touch a single row of your data.
-- ============================================================

-- ---------- 1. remove the open-to-everyone policies ----------
drop policy if exists anon_all_orders on orders;
drop policy if exists anon_all_items  on order_items;
drop policy if exists anon_all_events on order_events;
drop policy if exists anon_all_config on app_config;

-- ---------- 2. staff-only policies ----------
-- Every signed-in account is shop staff and may work any order; we are keeping
-- people off the board, not partitioning it. "to authenticated" is what makes
-- Postgres check for a session.
drop policy if exists staff_all_orders on orders;
drop policy if exists staff_all_items  on order_items;
drop policy if exists staff_all_events on order_events;
drop policy if exists staff_all_config on app_config;

create policy staff_all_orders on orders
  for all to authenticated using (true) with check (true);
create policy staff_all_items on order_items
  for all to authenticated using (true) with check (true);
create policy staff_all_events on order_events
  for all to authenticated using (true) with check (true);
create policy staff_all_config on app_config
  for all to authenticated using (true) with check (true);

-- ---------- 3. take the table privileges off anon ----------
-- RLS alone would already block it; removing the grant as well means a future
-- stray policy cannot quietly re-open the door.
revoke all on orders, order_items, order_events, app_config from anon;
revoke all on order_log from anon;
revoke all on all sequences in schema public from anon;

-- ---------- 4. make sure staff have everything they need ----------
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on orders, order_items, order_events, app_config to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on order_log to authenticated;

-- ---------- 5. check it ----------
-- Expect: every row says "authenticated", and nothing says "anon".
select tablename, policyname, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ============================================================
--  ROLLBACK — only if a sign-in problem is stopping the shop working.
--  This re-opens the board to anyone with the link, so put it back as soon
--  as the accounts are sorted out. Also set REQUIRE_LOGIN: false in config.js
--  while it is like this, otherwise the app still asks for a sign-in.
-- ============================================================
-- drop policy if exists staff_all_orders on orders;
-- drop policy if exists staff_all_items  on order_items;
-- drop policy if exists staff_all_events on order_events;
-- drop policy if exists staff_all_config on app_config;
-- create policy anon_all_orders on orders
--   for all to anon using (true) with check (true);
-- create policy anon_all_items on order_items
--   for all to anon using (true) with check (true);
-- create policy anon_all_events on order_events
--   for all to anon using (true) with check (true);
-- create policy anon_all_config on app_config
--   for all to anon using (true) with check (true);
-- grant select, insert, update, delete
--   on orders, order_items, order_events, app_config to anon;
-- grant usage, select on all sequences in schema public to anon;
-- grant select on order_log to anon;
