CREATE TABLE public.markus_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,80}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 200),
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 3000),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markus_skills TO authenticated;
GRANT ALL ON public.markus_skills TO service_role;
ALTER TABLE public.markus_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY markus_skills_read ON public.markus_skills FOR SELECT TO authenticated USING (is_active OR public.is_current_user_owner());
CREATE POLICY markus_skills_owner_insert ON public.markus_skills FOR INSERT TO authenticated WITH CHECK (public.is_current_user_owner());
CREATE POLICY markus_skills_owner_update ON public.markus_skills FOR UPDATE TO authenticated USING (public.is_current_user_owner()) WITH CHECK (public.is_current_user_owner());
CREATE POLICY markus_skills_owner_delete ON public.markus_skills FOR DELETE TO authenticated USING (public.is_current_user_owner());
CREATE TRIGGER markus_skills_updated BEFORE UPDATE ON public.markus_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.markus_skills (slug, title, body, prompt, sort_order) VALUES
('ask-markus','Ask Markus anything','Get answers from his videos, coaching calls and lessons.','I have a question about protecting my family wealth. Answer it the way Markus teaches it in his videos, coaching calls and lessons, and tell me which video or lesson it comes from when you can. My question is: ',0),
('asset-map','Map my assets','List what you own and where it sits, step by step.','Help me map every asset my family owns. Ask me one question at a time, then give me a clear list grouped by type and how each one is titled.',10),
('exposure-check','Find what is exposed','Spot assets open to lawsuits, probate and estate taxes.','Run an exposure check on my family wealth. Ask me what you need, then show which assets are open to lawsuits, probate or estate taxes and what to look at first.',20),
('trust-explainer','Explain trusts simply','Revocable, irrevocable and private trusts in plain English.','Explain the main types of trusts in plain English, how they differ, and which questions I should ask to know what fits my family.',30),
('document-review','Review a document','Paste a policy, deed or statement and get the key points.','I want you to review a document for me. Tell me what to paste, then explain the key points, what is missing, and what questions I should ask.',40),
('family-meeting','Plan a family meeting','An agenda to talk about the plan with your family.','Help me plan a family meeting about our wealth and legacy. Give me a simple agenda, talking points, and how to bring the next generation in.',50),
('heir-ready','Get my heirs ready','What your family needs to know if something happened tomorrow.','If something happened to me tomorrow, what would my family need to know and where would they find it? Help me build that checklist.',60),
('business-succession','Protect my business','Keep your business running and in the family.','Help me think through protecting my business and passing it down. Ask me about it, then outline the main risks and next steps.',70),
('tax-questions','Prep for my CPA or attorney','The right questions to bring to your advisors.','Help me prepare for a meeting with my CPA or estate attorney. Ask what the meeting is about, then give me a short list of the best questions to bring.',80),
('trust-fit','Is a trust right for me?','See which kind of trust fits your family and why.','Help me figure out if a trust makes sense for my family. Ask me a few questions about what we own and our goals, then explain which kind of trust Markus would point me toward and why.',90),
('lawsuit-protection','Protect assets from lawsuits','How Markus keeps family wealth out of reach of lawsuits.','Teach me how Markus protects family assets from lawsuits and creditors. Ask what I own, then walk me through the steps he teaches in plain English.',100),
('llc-setup','Set up my LLCs the right way','Holding companies, series LLCs and operating agreements.','Explain how Markus teaches families to use LLCs, holding companies, series LLCs and operating agreements. Ask about my businesses and properties, then show me a simple structure to talk through with my attorney.',110),
('real-estate','Protect my real estate','How to hold your home and rental properties.','Help me protect my real estate. Ask what properties I own and how they are titled today, then explain how Markus teaches families to hold a home and rental properties.',120),
('family-office','Build my family office','Run your family wealth like a business.','Help me build a simple family office the way Markus teaches it. Ask about my family, then give me the roles, meetings and systems to start with.',130),
('next-generation','Teach my kids about wealth','Raise heirs who keep and grow what you build.','Help me teach my children about money, trusts and our family legacy the way Markus teaches it. Ask their ages, then give me a simple plan for each one.',140),
('common-mistakes','Avoid common mistakes','The planning mistakes Markus sees families make most.','What are the biggest estate planning and asset protection mistakes Markus sees families make? Ask a little about my situation, then tell me which ones I should watch out for.',150),
('call-recap','Top coaching call questions','How Markus answers the questions families ask most.','What are the most common questions families ask Markus on his coaching calls, and how does he answer them? Give me the top ones in plain English.',160);

ALTER TABLE public.markus_knowledge_sources DROP CONSTRAINT IF EXISTS markus_knowledge_sources_platform_check;
ALTER TABLE public.markus_knowledge_sources ADD CONSTRAINT markus_knowledge_sources_platform_check CHECK (platform IN ('youtube','instagram','tiktok','linkedin','fathom','google_drive'));
INSERT INTO public.markus_knowledge_sources (platform, profile_url, enabled, config)
VALUES ('google_drive','https://drive.google.com',true,'{"folders":[]}')
ON CONFLICT (platform, profile_url) DO NOTHING;

-- Match any meaningful word in the question (not every word) and return the most relevant parts of long sources.
CREATE OR REPLACE FUNCTION public.search_markus_knowledge(search_text text)
RETURNS TABLE(title text, source_url text, published_at timestamptz, content text)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH words AS (
    SELECT DISTINCT w FROM regexp_split_to_table(lower(left(coalesce(search_text,''), 4000)), '[^a-z0-9]+') AS w
    WHERE length(w) > 2 LIMIT 40
  ), q AS (
    SELECT to_tsquery('english', string_agg(w, ' | ')) AS query FROM words
  ), hits AS (
    SELECT d.title, d.source_url, d.published_at, d.content,
      ts_rank(to_tsvector('english', d.content), q.query) AS rank, q.query
    FROM public.markus_knowledge_documents d
    JOIN public.markus_knowledge_sources s ON s.id = d.source_id
    CROSS JOIN q
    WHERE q.query IS NOT NULL AND d.status = 'approved' AND s.enabled AND d.available_at <= now()
      AND to_tsvector('english', d.content) @@ q.query
    ORDER BY rank DESC, d.published_at DESC NULLS LAST
    LIMIT 6
  )
  SELECT h.title, h.source_url, h.published_at,
    CASE WHEN length(h.content) <= 7000 THEN h.content
      ELSE left(ts_headline('english', h.content, h.query, 'MaxFragments=6, MaxWords=80, MinWords=30, StartSel="", StopSel="", FragmentDelimiter=" ... "'), 7000)
    END
  FROM hits h
  ORDER BY h.rank DESC, h.published_at DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.search_markus_knowledge(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_markus_knowledge(text) TO service_role;