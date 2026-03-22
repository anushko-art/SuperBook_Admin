import { QuestionTypeBadge, DifficultyBadge } from '../shared/QuestionTypeBadge';
import type { Question } from '@/lib/questions/types';

interface BankQuestionCardProps {
  q: Question;
  selected: boolean;
  onClick: (q: Question) => void;
}

export function BankQuestionCard({ q, selected, onClick }: BankQuestionCardProps) {
  return (
    <button
      onClick={() => onClick(q)}
      className={`w-full text-left p-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
        selected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
    >
      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <QuestionTypeBadge type={q.question_type} short />
        <DifficultyBadge level={q.difficulty_level} />
        {q.exam_name && (
          <span className="text-xs text-gray-400">
            {q.exam_name} {q.exam_year ?? ''}
          </span>
        )}
      </div>

      {/* Question text (2-line clamp) */}
      <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed">{q.question_text}</p>

      {/* Topic */}
      {q.topic_name && (
        <p className="text-xs text-gray-400 mt-1 truncate">{q.topic_name}</p>
      )}
    </button>
  );
}
