'use client';

import { Search } from 'lucide-react';
import { QUESTION_TYPE_OPTIONS, DIFFICULTY_OPTIONS } from '../shared/question-constants';
import type { QuestionListFilter } from '@/lib/questions/types';

interface BankFilterBarProps {
  filter: QuestionListFilter;
  onChange: (filter: QuestionListFilter) => void;
}

export function BankFilterBar({ filter, onChange }: BankFilterBarProps) {
  function update(partial: Partial<QuestionListFilter>) {
    onChange({ ...filter, ...partial, offset: 0 });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search questions…"
          value={filter.search ?? ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Type filter */}
      <select
        value={filter.type ?? 'all'}
        onChange={(e) =>
          update({ type: e.target.value as QuestionListFilter['type'] })
        }
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {QUESTION_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Difficulty filter */}
      <select
        value={filter.difficulty ?? 'all'}
        onChange={(e) =>
          update({ difficulty: e.target.value as QuestionListFilter['difficulty'] })
        }
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {DIFFICULTY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
