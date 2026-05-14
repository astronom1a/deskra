-- Supabase Data API hardening for new-project behavior:
-- grants make objects reachable, RLS policies still decide visible rows.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- Views must run with the caller's RLS context.
alter view if exists v_tumpuk_kapling_per_jenis set (security_invoker = true);
alter view if exists v_penomoran_kapling set (security_invoker = true);
alter view if exists v_sabuk_kapling set (security_invoker = true);
alter view if exists v_slaghammer set (security_invoker = true);

-- The migration runner RPC is intentionally service-role only.
revoke execute on function run_sql(text) from public;
revoke execute on function run_sql(text) from anon;
revoke execute on function run_sql(text) from authenticated;
grant execute on function run_sql(text) to service_role;
