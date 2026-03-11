/**
 * Production-Hardened Multi-Agent SuperRAG Orchestrator
 *
 * All 10 issues from code review fixed:
 * 1. Embedding dimension validation + JSON.stringify for pgvector
 * 2. 8s AbortController timeout on Ollama
 * 3. JSON parse logging + _validateTaskAnalysis() type guard
 * 4. Image path validation (no traversal, extension allow-list)
 * 5. Conversation history capped (6 msgs × 150 chars)
 * 6. requestId per request, logs at every agent step
 * 7. 3-pattern misconception regex
 * 8. Empty chunks filtered before LLM
 * 9. Robust equation regex (matchAll + lookbehind)
 * 10. Sharpened system prompt
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  previousTopics: string[];
  studentLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface TaskAnalysis {
  intent: 'conceptual' | 'calculation' | 'visual' | 'derivation' | 'comparison';
  keywords: string[];
  requiresVisuals: boolean;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  preferredFormat: 'narrative' | 'stepwise' | 'visual';
}

interface RetrievedChunk {
  id: string;
  part: string;
  chapter_num: number;
  chapter_title: string;
  section: string;
  section_title: string;
  content: string;
  similarity: number;
  image_paths: string[] | null;
}

export interface RankedImage {
  path: string;
  caption: string;
  relevance: number;
  linkedChunkIds: string[];
}

export interface ExtractedEquation {
  latex: string;
  context: string;
  location: string;
}

interface MultimodalContext {
  textChunks: RetrievedChunk[];
  images: RankedImage[];
  equations: ExtractedEquation[];
}

export interface OrchestratorMetrics {
  taskAnalysisMs: number;
  textRetrieverMs: number;
  visualAnalysisMs: number;
  contextAssemblyMs: number;
  answerGenerationMs: number;
  totalMs: number;
}

export interface StructuredAnswer {
  narrative: string;
  images: RankedImage[];
  equations: Array<{ latex: string; context: string }>;
  sources: Array<{
    chapter_num: number;
    chapter_title: string;
    section: string;
    section_title: string;
    part: string;
    image_paths: string[];
    similarity: number;
  }>;
  misconceptions: string[];
  requestId: string;
  metrics: OrchestratorMetrics;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'qwen3-embedding:8b';
const GEMINI_MODEL = 'gemini-2.0-flash';
const EMBEDDING_DIM = 4096;
const EMBEDDING_TIMEOUT_MS = 8000;
const SIMILARITY_THRESHOLD = 0.50;
const VALID_IMG_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Agent 1: Task Analysis ───────────────────────────────────────────────────

class TaskAnalysisAgent {
  private genai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genai = new GoogleGenerativeAI(apiKey);
  }

  async analyzeIntent(
    question: string,
    context: ConversationContext,
    requestId: string
  ): Promise<TaskAnalysis> {
    const model = this.genai.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a Class 11 Physics intent classifier. Respond ONLY with valid JSON (no markdown fences):

Question: "${question}"
Recent topics: ${context.previousTopics.slice(-3).join(', ') || 'none'}
Student level: ${context.studentLevel}

{
  "intent": "conceptual|calculation|visual|derivation|comparison",
  "keywords": ["word1", "word2"],
  "requiresVisuals": true|false,
  "complexity": "beginner|intermediate|advanced",
  "preferredFormat": "narrative|stepwise|visual"
}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(jsonStr) as unknown;
      const validated = this._validateTaskAnalysis(parsed);
      console.log(`[${requestId}] Task analysis: ${validated.intent} (${validated.complexity})`);
      return validated;
    } catch (err) {
      console.error(`[${requestId}] Task analysis failed:`, err instanceof Error ? err.message : String(err));
      return {
        intent: 'conceptual',
        keywords: [],
        requiresVisuals: false,
        complexity: context.studentLevel,
        preferredFormat: 'narrative',
      };
    }
  }

  private _validateTaskAnalysis(data: unknown): TaskAnalysis {
    const INTENTS = ['conceptual', 'calculation', 'visual', 'derivation', 'comparison'] as const;
    const FORMATS = ['narrative', 'stepwise', 'visual'] as const;
    const COMPLEXITIES = ['beginner', 'intermediate', 'advanced'] as const;

    if (typeof data !== 'object' || data === null) {
      throw new Error('Task analysis response must be an object');
    }
    const obj = data as Record<string, unknown>;

    return {
      intent: (INTENTS.includes(obj.intent as typeof INTENTS[number]) ? obj.intent : 'conceptual') as TaskAnalysis['intent'],
      keywords: (Array.isArray(obj.keywords) ? obj.keywords as string[] : []).slice(0, 10),
      requiresVisuals: Boolean(obj.requiresVisuals),
      complexity: (COMPLEXITIES.includes(obj.complexity as typeof COMPLEXITIES[number]) ? obj.complexity : 'intermediate') as TaskAnalysis['complexity'],
      preferredFormat: (FORMATS.includes(obj.preferredFormat as typeof FORMATS[number]) ? obj.preferredFormat : 'narrative') as TaskAnalysis['preferredFormat'],
    };
  }
}

// ─── Agent 2: Text Retriever ──────────────────────────────────────────────────

class TextRetrieverAgent {
  async retrieveRelevantChunks(
    question: string,
    requestId: string,
    limit = 10
  ): Promise<RetrievedChunk[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

    try {
      const embedStart = Date.now();

      const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: question.slice(0, 512) }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as { embedding?: number[] };
      if (!data.embedding) throw new Error('No embedding in Ollama response');

      // Fix #1: validate dimension
      if (data.embedding.length !== EMBEDDING_DIM) {
        throw new Error(`Wrong embedding dim: ${data.embedding.length} (expected ${EMBEDDING_DIM})`);
      }

      console.log(`[${requestId}] Embedding: ${Date.now() - embedStart}ms (${EMBEDDING_DIM}d)`);

      return await this._queryWithRetry(data.embedding, limit, requestId);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Embedding timeout after ${EMBEDDING_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async _queryWithRetry(
    embedding: number[],
    limit: number,
    requestId: string,
    retries = 2
  ): Promise<RetrievedChunk[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Fix #1: use JSON.stringify for pgvector compatibility
        const rows = await query<RetrievedChunk>(
          `SELECT id, part, chapter_num, chapter_title,
                  section, section_title, content, image_paths,
                  1 - (COALESCE(multimodal_embedding, text_embedding) <=> $1::vector) AS similarity
           FROM textbook_chunks
           ORDER BY similarity DESC
           LIMIT $2`,
          [JSON.stringify(embedding), limit]
        );

        // Fix: apply threshold in TypeScript (not SQL alias in WHERE)
        const filtered = rows.filter((r) => r.similarity >= SIMILARITY_THRESHOLD);
        const result = filtered.length >= 2 ? filtered : rows.slice(0, 3);

        console.log(`[${requestId}] Retrieved ${result.length} chunks (attempt ${attempt + 1})`);
        return result;
      } catch (err) {
        lastError = err as Error;
        console.warn(`[${requestId}] DB query attempt ${attempt + 1} failed:`, lastError.message);
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError ?? new Error('Failed after retries');
  }
}

// ─── Agent 3: Visual Analyzer (pure JS) ──────────────────────────────────────

class VisualAnalyzerAgent {
  private static IMAGE_REF = /!\[([^\]]*)\]\(([^)]+)\)/g;

  analyzeImages(chunks: RetrievedChunk[], requestId: string): RankedImage[] {
    const seen = new Set<string>();
    const images: RankedImage[] = [];

    for (const chunk of chunks) {
      if (!chunk.image_paths || chunk.image_paths.length === 0) continue;

      // Extract captions from markdown alt-text
      const captionMap = new Map<string, string>();
      VisualAnalyzerAgent.IMAGE_REF.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = VisualAnalyzerAgent.IMAGE_REF.exec(chunk.content)) !== null) {
        const alt = m[1].trim();
        const filename = m[2].trim().split('/').pop() ?? m[2].trim();
        if (alt && alt.length < 200) captionMap.set(filename, alt);
      }

      // Fix #4: validate paths
      const validPaths = this._validatePaths(chunk.image_paths, requestId);

      for (const imgPath of validPaths) {
        const filename = imgPath.split('/').pop() ?? imgPath;
        if (seen.has(filename)) continue;
        seen.add(filename);

        images.push({
          path: `/textbook-images/${filename}`,   // enforce safe path
          caption: captionMap.get(filename) ?? `Figure from §${chunk.section}`,
          relevance: chunk.similarity,
          linkedChunkIds: [chunk.id],
        });
      }
    }

    images.sort((a, b) => b.relevance - a.relevance);
    const above = images.filter((i) => i.relevance > 0.55);
    const result = (above.length >= 1 ? above : images).slice(0, 5);
    console.log(`[${requestId}] Visual analysis: ${result.length} images`);
    return result;
  }

  private _validatePaths(paths: string[], requestId: string): string[] {
    return paths.filter((p): p is string => {
      if (typeof p !== 'string' || !p.trim()) return false;
      // Fix #4: no path traversal
      if (p.includes('..') || p.includes('//')) {
        console.warn(`[${requestId}] Rejected suspicious image path: ${p}`);
        return false;
      }
      const ext = p.toLowerCase().split('.').pop() ?? '';
      if (!VALID_IMG_EXTS.has(ext)) {
        console.warn(`[${requestId}] Rejected invalid extension: ${p}`);
        return false;
      }
      return true;
    });
  }
}

// ─── Agent 4: Context Assembler (pure JS) ─────────────────────────────────────

class ContextAssemblerAgent {
  assembleContext(chunks: RetrievedChunk[], images: RankedImage[], requestId: string): MultimodalContext {
    const equations = this._extractEquations(chunks, requestId);

    // Fix #8: filter empty chunks
    const validChunks = chunks.filter((c) => c.content && c.content.trim().length > 30);

    console.log(`[${requestId}] Context: ${validChunks.length} chunks, ${images.length} images, ${equations.length} equations`);
    return { textChunks: validChunks, images, equations };
  }

  private _extractEquations(chunks: RetrievedChunk[], requestId: string): ExtractedEquation[] {
    const equations: ExtractedEquation[] = [];

    for (const chunk of chunks) {
      // Fix #9: display equations with matchAll (handles multiline)
      for (const match of chunk.content.matchAll(/\$\$([\s\S]*?)\$\$/g)) {
        const latex = match[1].trim();
        if (!latex || latex.length < 2 || latex.length > 1000) continue;
        const start = Math.max(0, match.index! - 120);
        const end = Math.min(chunk.content.length, match.index! + match[0].length + 120);
        equations.push({
          latex,
          context: chunk.content.slice(start, end).replace(/\s+/g, ' ').trim(),
          location: `Ch.${chunk.chapter_num} §${chunk.section}`,
        });
      }

      // Fix #9: inline equations with lookbehind to avoid escaped $
      for (const match of chunk.content.matchAll(/(?<!\\)\$(?!\$)((?:(?!\$).)*?[^\s])(?<!\$)\$/g)) {
        const latex = match[1].trim();
        if (!latex || latex.length < 2 || latex.length > 500) continue;
        equations.push({
          latex,
          context: chunk.content
            .slice(Math.max(0, match.index! - 60), Math.min(chunk.content.length, match.index! + match[0].length + 60))
            .replace(/\s+/g, ' ').trim(),
          location: `Ch.${chunk.chapter_num} §${chunk.section}`,
        });
      }
    }

    // Deduplicate by latex string
    const seen = new Set<string>();
    const unique = equations.filter((eq) => {
      if (seen.has(eq.latex)) return false;
      seen.add(eq.latex);
      return true;
    });

    console.log(`[${requestId}] Equations: ${equations.length} raw, ${unique.length} unique`);
    return unique.slice(0, 8);
  }
}

// ─── Agent 5: Answer Generator ────────────────────────────────────────────────

class AnswerGeneratorAgent {
  private genai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genai = new GoogleGenerativeAI(apiKey);
  }

  async generateNarrative(
    question: string,
    context: MultimodalContext,
    conversationHistory: ConversationMessage[],
    taskAnalysis: TaskAnalysis,
    requestId: string
  ): Promise<string> {
    const model = this.genai.getGenerativeModel({ model: GEMINI_MODEL });

    // Fix #10: sharper system prompt
    const systemInstruction = `You are an expert Class 11 Physics tutor grounded in NCERT curriculum.

INTENT: ${taskAnalysis.intent} | FORMAT: ${taskAnalysis.preferredFormat} | LEVEL: ${taskAnalysis.complexity}

STRICT RULES — follow every one:
1. Start with a clear, direct answer to the exact question asked
2. Build understanding: simple → complex (scaffolding approach)
3. ALL mathematical expressions MUST use LaTeX: inline $a=b$, display $$a=b$$
4. Reference available figures naturally: "As shown in Fig 1..."
5. Include ONE real-world analogy (must be specific, not generic)
6. Mark misconceptions EXACTLY as: "> ⚠️ **Misconception:** [wrong belief students have]"
7. **Bold** all key physics terms on first use
8. For stepwise format: number each step with explicit transitions
9. Cite NCERT section when relevant (e.g., "Section 5.3 states...")
10. AVOID: "In conclusion", repetition, content not in textbook passages`;

    const passages = this._buildPassages(context.textChunks);
    const figures = context.images.map((img, i) => `Fig ${i + 1}: ${img.caption} (${img.path})`).join('\n');
    // Fix #5: capped history
    const history = this._summarizeHistory(conversationHistory);

    const userMessage = `Recent conversation:
${history}

TEXTBOOK PASSAGES:
${passages}

AVAILABLE FIGURES:
${figures || 'None for this topic.'}

QUESTION: ${question}

Generate a compelling, narrative-driven physics explanation.`;

    try {
      const genStart = Date.now();
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction,
      });
      const narrative = result.response.text();
      console.log(`[${requestId}] Answer: ${Date.now() - genStart}ms, ${narrative.length} chars`);
      return narrative;
    } catch (err) {
      console.error(`[${requestId}] Answer generation failed:`, err);
      throw err;
    }
  }

  // Fix #8: filter empty chunks
  private _buildPassages(chunks: RetrievedChunk[]): string {
    return chunks
      .filter((c) => c.content && c.content.trim().length > 30)
      .map(
        (c, i) =>
          `[${i + 1}] **Ch.${c.chapter_num} §${c.section} — ${c.section_title}** (${Math.round(c.similarity * 100)}% match)\n${c.content.slice(0, 900).trim()}`
      )
      .join('\n\n---\n\n');
  }

  // Fix #5: capped conversation history
  private _summarizeHistory(messages: ConversationMessage[]): string {
    if (messages.length === 0) return 'This is the first question.';
    const recent = messages.slice(-6);
    let out = '';
    for (const msg of recent) {
      const line = `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content.slice(0, 150)}`;
      if (out.length + line.length > 1500) break;
      out += line + '\n';
    }
    return out.trim() || 'This is the first question.';
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class MultiAgentOrchestrator {
  private taskAnalyzer: TaskAnalysisAgent;
  private textRetriever: TextRetrieverAgent;
  private visualAnalyzer: VisualAnalyzerAgent;
  private contextAssembler: ContextAssemblerAgent;
  private answerGenerator: AnswerGeneratorAgent;

  constructor(geminiApiKey: string) {
    this.taskAnalyzer = new TaskAnalysisAgent(geminiApiKey);
    this.textRetriever = new TextRetrieverAgent();
    this.visualAnalyzer = new VisualAnalyzerAgent();
    this.contextAssembler = new ContextAssemblerAgent();
    this.answerGenerator = new AnswerGeneratorAgent(geminiApiKey);
  }

  async orchestrateResponse(
    question: string,
    conversationContext: ConversationContext,
    requestId: string = generateRequestId()
  ): Promise<StructuredAnswer> {
    const totalStart = Date.now();
    const metrics: OrchestratorMetrics = {
      taskAnalysisMs: 0,
      textRetrieverMs: 0,
      visualAnalysisMs: 0,
      contextAssemblyMs: 0,
      answerGenerationMs: 0,
      totalMs: 0,
    };

    console.log(`[${requestId}] ─── ORCHESTRATION START ─── "${question.slice(0, 70)}..."`);

    try {
      // Fix #6: per-step timing
      const step1Start = Date.now();
      const [taskAnalysis, textChunks] = await Promise.all([
        this.taskAnalyzer.analyzeIntent(question, conversationContext, requestId),
        this.textRetriever.retrieveRelevantChunks(question, requestId),
      ]);
      metrics.taskAnalysisMs = Date.now() - step1Start;
      metrics.textRetrieverMs = metrics.taskAnalysisMs; // parallel, same wall clock

      if (textChunks.length === 0) {
        console.warn(`[${requestId}] No chunks found`);
        metrics.totalMs = Date.now() - totalStart;
        return {
          narrative: 'I could not find relevant content in the textbook for this question.',
          images: [], equations: [], sources: [], misconceptions: [],
          requestId, metrics,
        };
      }

      const step2Start = Date.now();
      const images = this.visualAnalyzer.analyzeImages(textChunks, requestId);
      metrics.visualAnalysisMs = Date.now() - step2Start;

      const step3Start = Date.now();
      const multimodalContext = this.contextAssembler.assembleContext(textChunks, images, requestId);
      metrics.contextAssemblyMs = Date.now() - step3Start;

      const step4Start = Date.now();
      const narrative = await this.answerGenerator.generateNarrative(
        question, multimodalContext, conversationContext.messages, taskAnalysis, requestId
      );
      metrics.answerGenerationMs = Date.now() - step4Start;
      metrics.totalMs = Date.now() - totalStart;

      console.log(`[${requestId}] ─── COMPLETE ─── ${metrics.totalMs}ms`, metrics);

      return this._formatForUI(narrative, multimodalContext, textChunks, requestId, metrics);
    } catch (err) {
      metrics.totalMs = Date.now() - totalStart;
      console.error(`[${requestId}] ─── FAILED ─── ${metrics.totalMs}ms`, err);
      throw new Error(`[${requestId}] ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private _formatForUI(
    narrative: string,
    context: MultimodalContext,
    chunks: RetrievedChunk[],
    requestId: string,
    metrics: OrchestratorMetrics
  ): StructuredAnswer {
    const misconceptions = this._extractMisconceptions(narrative);
    const sources = chunks.slice(0, 5).map((c) => ({
      chapter_num: c.chapter_num,
      chapter_title: c.chapter_title,
      section: c.section,
      section_title: c.section_title,
      part: c.part,
      image_paths: c.image_paths ?? [],
      similarity: Math.round(c.similarity * 100),
    }));

    console.log(`[${requestId}] Formatted: ${misconceptions.length} misconceptions, ${sources.length} sources`);

    return {
      narrative,
      images: context.images,
      equations: context.equations.map((eq) => ({ latex: eq.latex, context: eq.context })),
      sources,
      misconceptions,
      requestId,
      metrics,
    };
  }

  // Fix #7: 3-pattern misconception extraction
  private _extractMisconceptions(narrative: string): string[] {
    const results: string[] = [];
    const patterns = [
      />\s*⚠️\s*\*\*(?:Common )?Misconception:\*\*\s*([^\n]+)/gi,
      />\s*❌\s*([^\n]+)/gi,
      /⚠️\s*\*\*Misconception:\*\*\s*([^\n]+)/gi,
    ];

    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(narrative)) !== null) {
        const text = m[1].trim();
        if (text && text.length < 300 && !results.includes(text)) results.push(text);
      }
    }

    return Array.from(new Set(results)).slice(0, 5);
  }
}

export default MultiAgentOrchestrator;
