-- ============================================================
--  Order Board — migration: choose a WhatsApp sender
--  Run this ONCE in Supabase > SQL Editor if you already ran schema.sql.
--
--  Safe: it only ADDS columns. It does not touch your existing orders.
--  (Do NOT re-run schema.sql for this — that script drops and recreates
--   the tables, which would delete every order you have.)
-- ============================================================

alter table app_config add column if not exists wa_provider     text;
alter table app_config add column if not exists wa_function_url text;

-- "edge"      = Supabase Edge Function -> Meta WhatsApp Cloud API
-- "callmebot" = the old free relay
-- "off"       = no automatic send; front desk taps to send
update app_config
   set wa_provider = coalesce(wa_provider, 'edge')
 where id = 1;

select wa_provider, wa_function_url from app_config where id = 1;
