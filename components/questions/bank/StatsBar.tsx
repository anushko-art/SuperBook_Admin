import { TYPE_CONFIG, DIFF_CONFIG } from '../shared/question-constants';
import type { Question, QuestionType, DifficultyLevel } from '@/lib/questions/types';

interface StatsBarProps {
  questions: Question[];
}

export function StatsBar({ questions }: StatsBarProps) {
  const total = questions.length;

  const byDifficulty = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.difficulty_level] = (acc[q.difficulty_level] ?? 0) + 1;
    return acc;
  }, {});

  const byType = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.question_type] = (acc[q.question_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
      {/* Total */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-bold text-gray-900">{total}</span>
        <span className="text-gray-500">questions</span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* By difficulty */}
      {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((level) => {
        const count = byDifficulty[level] ?? 0;
        if (count === 0) return null;
        const cfg = DIFF_CONFIG[level];
        return (
          <span
            key={level}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
          >
            {level}: {count}
          </span>
        );
      })}

      <div className="h-4 w-px bg-gray-200" />

      {/* By type */}
      {(Object.keys(TYPE_CONFIG) as QuestionType[]).map((type) => {
        const count = byType[type] ?? 0;
        if (count === 0) return null;
        const cfg = TYPE_CONFIG[type];
        return (
          <span
            key={type}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
          >
            {cfg.shortLabel}: {count}
          </span>
        );
      })}
    </div>
  );
}
