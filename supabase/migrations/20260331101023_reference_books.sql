CREATE TABLE IF NOT EXISTS public.reference_books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    author VARCHAR,
    publisher VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reference_chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_book_id UUID NOT NULL REFERENCES public.reference_books(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    markdown_text TEXT,
    mapped_chapter_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reference_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_chapter_id UUID NOT NULL REFERENCES public.reference_chapters(id) ON DELETE CASCADE,
    image_path VARCHAR NOT NULL,
    caption TEXT,
    page INTEGER,
    storage_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reference_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.reference_books FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.reference_chapters FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.reference_images FOR SELECT USING (true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('reference_images', 'reference_images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access for Reference Images Objects" ON storage.objects FOR SELECT USING (bucket_id = 'reference_images');
