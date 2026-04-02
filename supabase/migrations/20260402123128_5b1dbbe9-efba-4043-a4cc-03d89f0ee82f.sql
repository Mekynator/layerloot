
-- 1. chat_conversations
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  page text,
  campaign_id text,
  language text DEFAULT 'en',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  message_count integer NOT NULL DEFAULT 0,
  outcome text NOT NULL DEFAULT 'unknown',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chat conversations" ON public.chat_conversations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role inserts conversations" ON public.chat_conversations
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anon insert conversations" ON public.chat_conversations
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Auth insert conversations" ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. chat_analytics_events
CREATE TABLE public.chat_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  page text,
  campaign_id text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read analytics events" ON public.chat_analytics_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon insert analytics events" ON public.chat_analytics_events
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Auth insert analytics events" ON public.chat_analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role insert analytics events" ON public.chat_analytics_events
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

-- 3. chat_knowledge_base
CREATE TABLE public.chat_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage knowledge base" ON public.chat_knowledge_base
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read active knowledge base" ON public.chat_knowledge_base
  FOR SELECT TO public
  USING (is_active = true);

-- Indexes for performance
CREATE INDEX idx_chat_events_session ON public.chat_analytics_events(session_id);
CREATE INDEX idx_chat_events_type ON public.chat_analytics_events(event_type);
CREATE INDEX idx_chat_events_created ON public.chat_analytics_events(created_at);
CREATE INDEX idx_chat_conversations_session ON public.chat_conversations(session_id);
CREATE INDEX idx_chat_conversations_created ON public.chat_conversations(created_at);
CREATE INDEX idx_chat_conversations_outcome ON public.chat_conversations(outcome);
