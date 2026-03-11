import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'qwen3-embedding:8b';

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Ollama embed error: ${res.status}`);
  const data = await res.json();
  return data.embedding as number[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '6'), 20);

  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  try {
    const embedding = await getEmbedding(q);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const chunks = await query<{
      id: string;
      part: string;
      chapter_num: number;
      chapter_title: string;
      section: string;
      section_title: string;
      content: string;
      has_images: boolean;
      has_equations: boolean;
      word_count: number;
      image_paths: string[] | null;
      similarity: number;
    }>(
      `SELECT id, part, chapter_num, chapter_title,
              section, section_title, content,
              has_images, has_equations, word_count, image_paths,
              1 - (COALESCE(multimodal_embedding, text_embedding) <=> $1::vector) AS similarity
       FROM textbook_chunks
       ORDER BY similarity DESC
       LIMIT $2`,
      [vectorLiteral, limit]
    );

    return NextResponse.json({ chunks, query: q });
  } catch (err) {
    console.error('RAG search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
