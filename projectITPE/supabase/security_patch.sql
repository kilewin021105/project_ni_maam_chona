-- ================================================================================
-- BCC Guidance System — Supabase security patch
-- Run this ONCE in the Supabase SQL Editor if you already ran schema.sql or update_patch.sql
-- from an earlier version. Those scripts created policies that let ANYONE holding the public
-- anon key read and change every table (including password hashes and SOAP notes).
--
-- After this patch:
--   * Row Level Security is ON for every table and there are no open policies, so the public
--     "anon" and "authenticated" roles get no rows.
--   * The Flask backend keeps working because it connects with the SERVICE ROLE key
--     (set SUPABASE_KEY in .env to the service_role secret, never the anon key).
--     The service role bypasses RLS. Never put that key in browser code.
-- ================================================================================

DO $$
DECLARE
    tbl text;
    pol record;
    tables text[] := ARRAY[
        'users', 'student_profiles', 'counselor_profiles', 'guidance_services', 'counselor_availability',
        'appointments', 'appointment_status_history', 'counseling_session_records', 'follow_up_tasks',
        'notifications', 'announcements', 'guidance_resources', 'appointment_feedback', 'audit_logs', 'system_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF to_regclass('public.' || tbl) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        -- Remove every existing policy on the table (the old ones all used USING (true))
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, tbl);
        END LOOP;
        -- Belt and braces: the browser-facing roles get no table privileges at all
        EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated;', tbl);
    END LOOP;
END $$;
