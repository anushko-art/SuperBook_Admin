import { Loader2 } from 'lucide-react';
import { BankQuestionCard } from './BankQuestionCard';
import type { Question } from '@/lib/questions/types';

interface BankListPanelProps {
  questions: Question[];
  selectedId: string | null;
  onSelect: (q: Question) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  total: number;
}

export function BankListPanel({
  questions,
  selectedId,
  onSelect,
  loading,
  hasMore,
  onLoadMore,
  total,
}: BankListPanelProps) {
  if (loading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!loading && questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-sm">No questions found.</p>
        <p className="text-xs mt-1">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Count */}
      <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
        Showing {questions.length} of {total}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {questions.map((q) => (
          <BankQuestionCard
            key={q.id}
            q={q}
            selected={q.id === selectedId}
            onClick={onSelect}
          />
        ))}

        {/* Load more */}
        {hasMore && (
          <div className="p-3 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="text-sm text-blue-600 hover:underline disabled:text-gray-400 flex items-center gap-1.5 mx-auto"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
