export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { MultiAgentOrchestrator, type ConversationMessage } from '@/lib/multiagent-orchestrator';

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  let body: {
    question?: string;
    conversationHistory?: ConversationMessage[];
    studentLevel?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { question, conversationHistory = [], studentLevel = 'intermediate' } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  try {
    // Instantiate per-request (avoids stale env at module init time)
    const orchestrator = new MultiAgentOrchestrator(apiKey);

    // Extract previously bolded terms from assistant messages as topic hints
    const previousTopics = conversationHistory
      .filter((m) => m.role === 'assistant')
      .flatMap((m) => {
        const bolded = m.content.match(/\*\*([^*]{2,40})\*\*/g) ?? [];
        return bolded.map((b) => b.replace(/\*\*/g, '').trim());
      })
      .slice(-10);

    const conversationContext = {
      messages: conversationHistory,
      previousTopics,
      studentLevel: (['beginner', 'intermediate', 'advanced'].includes(studentLevel)
        ? studentLevel
        : 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
    };

    const answer = await orchestrator.orchestrateResponse(question.trim(), conversationContext);
    return NextResponse.json(answer);
  } catch (err) {
    console.error('[super-chat] Orchestrator error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
