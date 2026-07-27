
DO $$
DECLARE
  r record;
  tbl text;
  tables text[] := ARRAY[
    'audit_logs','webhook_logs','agent_actions','agent_decisions','agent_sessions',
    'ai_audit_logs','ai_optimization_logs','ai_optimization_jobs','chatbot_interactions',
    'supplier_sync_logs','api_quotes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR r IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=tbl AND cmd='INSERT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, tbl);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "authorized_users_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()))',
      tbl
    );
  END LOOP;
END $$;
