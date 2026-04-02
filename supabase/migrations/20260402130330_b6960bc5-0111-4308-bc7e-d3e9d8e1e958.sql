
-- Add keywords column to chat_knowledge_base for better matching
ALTER TABLE public.chat_knowledge_base ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';
ALTER TABLE public.chat_knowledge_base ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.chat_knowledge_base ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.chat_knowledge_base ADD COLUMN IF NOT EXISTS title text;

-- Create chat_response_feedback table for learning/optimization
CREATE TABLE IF NOT EXISTS public.chat_response_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  user_id uuid,
  message_index integer NOT NULL DEFAULT 0,
  rating text NOT NULL DEFAULT 'neutral',
  feedback_type text NOT NULL DEFAULT 'implicit',
  response_snippet text,
  page text,
  preset_used text,
  tone_used text,
  engagement_score numeric DEFAULT 0,
  follow_up_count integer DEFAULT 0,
  led_to_conversion boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_response_feedback ENABLE ROW LEVEL SECURITY;

-- Admins can read all feedback
CREATE POLICY "Admins read response feedback" ON public.chat_response_feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert feedback
CREATE POLICY "Anon insert response feedback" ON public.chat_response_feedback
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth insert response feedback" ON public.chat_response_feedback
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create chat_optimization_snapshots for tracking AI performance over time
CREATE TABLE IF NOT EXISTS public.chat_optimization_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_sessions integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  avg_engagement_score numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  top_performing_responses jsonb DEFAULT '[]',
  weak_responses jsonb DEFAULT '[]',
  suggested_adjustments jsonb DEFAULT '{}',
  applied boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_optimization_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage optimization snapshots" ON public.chat_optimization_snapshots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
