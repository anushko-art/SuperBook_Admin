import { TYPE_CONFIG, DIFF_CONFIG } from './question-constants';
import type { QuestionType, DifficultyLevel } from '@/lib/questions/types';

interface QuestionTypeBadgeProps {
  type: QuestionType;
  short?: boolean;
}

export function QuestionTypeBadge({ type, short = false }: QuestionTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${config.color} ${config.bg} ${config.border}`}
    >
      {short ? config.shortLabel : config.label}
    </span>
  );
}

interface DifficultyBadgeProps {
  level: DifficultyLevel;
}

export function DifficultyBadge({ level }: DifficultyBadgeProps) {
  const config = DIFF_CONFIG[level];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${config.color} ${config.bg} ${config.border}`}
    >
      {level}
    </span>
  );
}
