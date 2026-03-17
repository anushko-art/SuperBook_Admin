export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '@/lib/db';

const MODEL = 'gemini-2.0-flash';

const NANO_BANANA_SYSTEM_PROMPT = `Role:
You are the Nano-Banana Visual Architect, a specialized engine designed to convert raw educational text into high-fidelity, hallucination-proof JSON schemas for a React/Next.js rendering frontend.

Objective:
Analyze the provided input text (from a textbook selection), identify the most effective visual structure, and generate a strict JSON payload that defines the visual layout, content hierarchy, and styling without ambiguity.

Strict Rules (Hallucination Firewall):
1. Content Isolation: Never mix explanatory text with visual instructions. Text labels must be in "text" or "content" fields; visual instructions must be in "visual_style" or "icon" fields.
2. Explicit IDs: Every node, branch, or step must have a unique id.
3. No Markdown inside JSON string values.
4. Data-First Design: Preserve numbers, dates, and formulas exactly.
5. Visual Logic:
   - Process/Sequence → FLOWCHART_GENERATION
   - Hierarchy/Classification → MIND_MAP_GENERATION
   - Difference/Contrast → COMPARISON_TABLE
   - Chronology/History → TIMELINE_GENERATION
   - Fact Cluster/Key Points → INFOGRAPHIC_GENERATION

OUTPUT ONLY A SINGLE VALID JSON OBJECT. No conversational text. No markdown fences.

Component Schemas:

MIND_MAP_GENERATION:
{
  "componentType": "MIND_MAP_GENERATION",
  "fidelity": "high_fidelity_data",
  "data": {
    "root_node": { "id": "root", "text": "Central Topic", "visual_style": "central_topic_bold" },
    "branches": [
      {
        "id": "branch_1",
        "text": "Main Category",
        "visual_style": "branch_blue",
        "notes": "Optional subtext",
        "children": [
          { "id": "child_1", "text": "Sub-point", "note": "Detail" }
        ]
      }
    ]
  },
  "style_constraints": { "layout_mode": "radial_hierarchy", "theme": "educational_vibrant" }
}

FLOWCHART_GENERATION:
{
  "componentType": "FLOWCHART_GENERATION",
  "fidelity": "high_fidelity_data",
  "data": {
    "title": "Process Name",
    "nodes": [
      {
        "id": "step_1",
        "type": "process",
        "text": "Step Name",
        "subtext": "Action details",
        "visual_style": "rect_box_blue"
      }
    ],
    "edges": [
      { "source": "step_1", "target": "step_2", "label": "Optional Condition" }
    ]
  },
  "style_constraints": { "layout_mode": "vertical_flow", "theme": "educational_process" }
}

COMPARISON_TABLE:
{
  "componentType": "COMPARISON_TABLE",
  "fidelity": "high_fidelity_data",
  "data": {
    "title": "Topic A vs Topic B",
    "categories": ["Feature", "Topic A", "Topic B"],
    "rows": [
      {
        "id": "row_1",
        "feature": "Parameter Name",
        "item_a": "Value for A",
        "item_b": "Value for B",
        "visual_cue": "check_vs_cross"
      }
    ]
  },
  "style_constraints": { "layout_mode": "side_by_side_columns", "theme": "clean_comparison" }
}

INFOGRAPHIC_GENERATION:
{
  "componentType": "INFOGRAPHIC_GENERATION",
  "fidelity": "high_fidelity_data",
  "data": {
    "title": "Main Concept Title",
    "layout": "grid_cards",
    "sections": [
      {
        "id": "sec_1",
        "title": "Key Point 1",
        "content": "Explanation text.",
        "icon": "relevant_icon_name",
        "highlight": "Critical keyword"
      }
    ]
  },
  "style_constraints": { "theme": "modern_flat", "color_palette": "subject_specific" }
}`;

/**
 * POST /api/admin/generate/visual
 * Body: { topic_id?: string, text?: string, title?: string }
 *
 * Calls Gemini with the Nano-Banana Visual Architect prompt.
 * Saves visual_schema to global_generated_content.metadata.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    topic_id?: string;
    text?: string;
    title?: string;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  let inputText = body.text ?? '';
  let inputTitle = body.title ?? 'Untitled';
  let topicId = body.topic_id;

  // If topic_id provided, fetch source_markdown from DB
  if (topicId && !inputText) {
    const [topic] = await query<{ id: string; title: string; source_markdown: string | null }>(
      `SELECT id, title, source_markdown FROM topics WHERE id = $1`,
      [topicId]
    );
    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    inputText = topic.source_markdown ?? '';
    inputTitle = topic.title;
  }

  if (!inputText.trim()) {
    return NextResponse.json({ error: 'text or topic_id with content is required' }, { status: 400 });
  }

  try {
    const visualSchema = await callGeminiVisual(apiKey, inputTitle, inputText);

    // Persist to DB if topic_id provided
    if (topicId) {
      const [existing] = await query<{ id: string; metadata: Record<string, unknown> | null }>(
        `SELECT id, metadata FROM global_generated_content WHERE topic_id = $1 AND is_latest = true`,
        [topicId]
      );

      if (existing) {
        const currentMeta = existing.metadata ?? {};
        await query(
          `UPDATE global_generated_content SET metadata = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify({ ...currentMeta, visual_schema: visualSchema }), existing.id]
        );
      } else {
        await query(
          `INSERT INTO global_generated_content (topic_id, generation_model, is_latest, metadata)
           VALUES ($1, $2, true, $3)`,
          [topicId, MODEL, JSON.stringify({ visual_schema: visualSchema })]
        );
      }
    }

    return NextResponse.json({ ok: true, visual_schema: visualSchema });
  } catch (err) {
    console.error('Visual generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

async function callGeminiVisual(
  apiKey: string,
  title: string,
  text: string
): Promise<Record<string, unknown>> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: NANO_BANANA_SYSTEM_PROMPT,
  });

  const prompt = `Topic: "${title}"

Educational text to convert into a visual schema:
${text.slice(0, 5000)}

Analyze the content and choose the best visual type. Output ONLY the JSON object.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip markdown fences if present
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}
