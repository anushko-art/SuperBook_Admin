'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { StatsBar } from '@/components/questions/bank/StatsBar';
import { BankFilterBar } from '@/components/questions/bank/BankFilterBar';
import { BankListPanel } from '@/components/questions/bank/BankListPanel';
import { BankDetailPanel } from '@/components/questions/bank/BankDetailPanel';
import type { Question, QuestionListFilter } from '@/lib/questions/types';

const PAGE_SIZE = 20;

const DEFAULT_FILTER: QuestionListFilter = {
  type: 'all',
  difficulty: 'all',
  is_active: true,
  limit: PAGE_SIZE,
  offset: 0,
};

export default function QuestionBankPage() {
  const [filter, setFilter] = useState<QuestionListFilter>(DEFAULT_FILTER);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedQ, setSelectedQ] = useState<Question | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchQuestions(f: QuestionListFilter, append = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set('search', f.search);
      if (f.type && f.type !== 'all') params.set('type', f.type);
      if (f.difficulty && f.difficulty !== 'all') params.set('difficulty', f.difficulty);
      if (f.topic_id) params.set('topic_id', f.topic_id);
      if (f.chapter_id) params.set('chapter_id', f.chapter_id);
      params.set('limit', String(f.limit ?? PAGE_SIZE));
      params.set('offset', String(f.offset ?? 0));

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();

      if (append) {
        setQuestions((prev) => [...prev, ...(data.questions ?? [])]);
      } else {
        setQuestions(data.questions ?? []);
      }
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  // Debounced fetch on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchQuestions({ ...filter, offset: 0 });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filter.search, filter.type, filter.difficulty, filter.topic_id, filter.chapter_id]);

  // Initial load
  useEffect(() => {
    fetchQuestions(DEFAULT_FILTER);
  }, []);

  const handleLoadMore = useCallback(() => {
    const nextFilter = { ...filter, offset: questions.length };
    setFilter(nextFilter);
    fetchQuestions(nextFilter, true);
  }, [filter, questions.length]);

  async function handleToggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
    // Update local state
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, is_active: isActive } : q))
    );
    if (selectedQ?.id === id) {
      setSelectedQ((q) => (q ? { ...q, is_active: isActive } : null));
    }
  }

  const hasMore = questions.length < total;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-xs text-gray-500 mt-0.5">{total} questions total</p>
        </div>
        <Link
          href="/admin/questions/ingest"
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Ingest Questions
        </Link>
      </div>

      {/* Stats bar */}
      <StatsBar questions={questions} />

      {/* Filter bar */}
      <BankFilterBar filter={filter} onChange={setFilter} />

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left — question list (40%) */}
        <div
          className={`border-r border-gray-200 flex flex-col min-h-0 ${
            selectedQ ? 'hidden md:flex md:w-2/5' : 'flex w-full md:w-2/5'
          }`}
        >
          <BankListPanel
            questions={questions}
            selectedId={selectedQ?.id ?? null}
            onSelect={setSelectedQ}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            total={total}
          />
        </div>

        {/* Right — detail panel (60%) */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto ${
            selectedQ ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
        >
          <BankDetailPanel
            q={selectedQ}
            onClose={() => setSelectedQ(null)}
            onToggleActive={handleToggleActive}
          />
        </div>
      </div>
    </div>
  );
}
