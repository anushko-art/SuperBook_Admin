import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '@/lib/db';

const MODEL = 'gemini-2.0-flash';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/images/[id]/ai-alt
 *
 * Uses Gemini Vision to analyze the image and generate:
 * - alt_text: concise accessibility description (1 sentence)
 * - description: detailed educational context (2–4 sentences)
 * - caption: short figure caption
 *
 * Reads the image file from disk and sends as inline data to Gemini.
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  const [img] = await query<{
    file_path: string; file_name: string;
    topic_title: string | null; subject: string | null;
  }>(
    `SELECT li.file_path, li.file_name,
            t.title AS topic_title,
            tb.subject
     FROM learning_images li
     LEFT JOIN topics t ON li.topic_id = t.id
     LEFT JOIN chapters c ON li.chapter_id = c.id
     LEFT JOIN textbooks tb ON c.textbook_id = tb.id
     WHERE li.id = $1`,
    [id]
  );
  if (!img) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  // Read the physical file
  const absPath = path.join(process.cwd(), 'public', img.file_path);
  let imageData: Buffer;
  try {
    imageData = await readFile(absPath);
  } catch {
    return NextResponse.json({ error: 'Image file not found on disk' }, { status: 404 });
  }

  // Determine MIME type from extension
  const ext = path.extname(img.file_name).toLowerCase().slice(1);
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml',
  };
  const mimeType = mimeMap[ext] ?? 'image/jpeg';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const context = [
      img.subject ? `Subject: ${img.subject}` : '',
      img.topic_title ? `Topic: ${img.topic_title}` : '',
    ].filter(Boolean).join('. ');

    const prompt = `You are an educational content assistant analyzing a textbook image.
${context ? `Context: ${context}.` : ''}

Analyze this image and respond with ONLY a valid JSON object:
{
  "alt_text": "Concise one-sentence accessibility description of the image.",
  "description": "2-4 sentence educational explanation of what the image shows and its significance.",
  "caption": "Short figure caption (under 15 words)."
}

No markdown fences. No extra text.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageData.toString('base64'),
        },
      },
      prompt,
    ]);

    const raw = result.response.text().trim();
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const generated = JSON.parse(clean) as {
      alt_text: string;
      description: string;
      caption: string;
    };

    return NextResponse.json({ ok: true, ...generated });
  } catch (err) {
    console.error('AI alt generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
