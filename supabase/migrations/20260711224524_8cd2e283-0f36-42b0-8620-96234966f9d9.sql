-- Restrict Realtime subscriptions: only authenticated users may subscribe, and only to
-- topics prefixed with their own auth.uid() (e.g. "user:<uid>:notifications").
-- Without this, any authenticated user could subscribe to any channel.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read own topic" ON realtime.messages;
CREATE POLICY "authenticated can read own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic LIKE ('user:' || auth.uid()::text || ':%')
  OR topic LIKE ('public:%')
);

DROP POLICY IF EXISTS "authenticated can send own topic" ON realtime.messages;
CREATE POLICY "authenticated can send own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic LIKE ('user:' || auth.uid()::text || ':%')
);