export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getQuestionById, updateQuestion, setQuestionActive } from '@/lib/questions/api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const question = await getQuestionById(id);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (err) {
    console.error('GET /api/admin/questions/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle is_active toggle separately for simplicity
    if (typeof body.is_active === 'boolean' && Object.keys(body).length === 1) {
      await setQuestionActive(id, body.is_active);
    } else {
      await updateQuestion(id, body);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/admin/questions/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await setQuestionActive(id, false);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/questions/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
