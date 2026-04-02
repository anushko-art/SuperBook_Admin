CREATE TABLE IF NOT EXISTS public.subtopics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    slug VARCHAR,
    source_markdown TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.subtopics 
    FOR SELECT USING (true);
