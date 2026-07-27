DROP POLICY IF EXISTS "system upd agent_sessions" ON public.agent_sessions;
CREATE POLICY "authorized upd agent_sessions" ON public.agent_sessions
  FOR UPDATE TO authenticated
  USING (public.is_authorized(auth.uid()))
  WITH CHECK (public.is_authorized(auth.uid()));