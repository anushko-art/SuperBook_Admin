import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

export async function POST(req: Request) {
  const { question } = await req.json() as { question: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  try {
    // 1. Embed the question
    const embedding = await getEmbedding(question);
    const vectorLiteral = `[${embedding.join(',')}]`;

    // 2. Retrieve top-5 most relevant chunks
    const chunks = await query<{
      id: string;
      part: string;
      chapter_num: number;
      chapter_title: string;
      section: string;
      section_title: string;
      content: string;
      image_paths: string[] | null;
      similarity: number;
    }>(
      `SELECT id, part, chapter_num, chapter_title,
              section, section_title, content, image_paths,
              1 - (COALESCE(multimodal_embedding, text_embedding) <=> $1::vector) AS similarity
       FROM textbook_chunks
       ORDER BY similarity DESC
       LIMIT 5`,
      [vectorLiteral]
    );

    if (!chunks.length) {
      return NextResponse.json({ answer: 'No relevant content found.', sources: [] });
    }

    // 3. Build context
    const context = chunks.map((c, i) =>
      `[${i + 1}] Chapter ${c.chapter_num}: ${c.chapter_title} — ${c.section_title}\n${c.content.slice(0, 800)}`
    ).join('\n\n---\n\n');

    // 4. Ask Gemini
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a helpful physics tutor for Class 11 students using NCERT textbooks.
Answer the student's question using ONLY the provided textbook passages.
Be clear, accurate, and educational. Use simple language suitable for Class 11.
If the passages don't contain enough information, say so honestly.

TEXTBOOK PASSAGES:
${context}

STUDENT QUESTION: ${question}

Provide a clear, concise answer. Reference the relevant section number(s) where appropriate.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    const sources = chunks.map(c => ({
      id: c.id,
      part: c.part,
      chapter_num: c.chapter_num,
      chapter_title: c.chapter_title,
      section: c.section,
      section_title: c.section_title,
      image_paths: c.image_paths ?? [],
      similarity: Math.round(c.similarity * 100),
    }));

    return NextResponse.json({ answer, sources });

  } catch (err) {
    console.error('RAG chat error:', err);
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 });
  }
}
