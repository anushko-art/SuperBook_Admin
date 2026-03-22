'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { QuestionTypeBadge, DifficultyBadge } from '../shared/QuestionTypeBadge';
import { McqRenderer } from '../renderers/McqRenderer';
import { AssertionReasonRenderer } from '../renderers/AssertionReasonRenderer';
import { MatchingRenderer } from '../renderers/MatchingRenderer';
import { StatementRenderer } from '../renderers/StatementRenderer';
import { ImageBasedRenderer } from '../renderers/ImageBasedRenderer';
import type {
  Question,
  McqContent,
  AssertionReasonContent,
  MatchingContent,
  StatementContent,
  ImageBasedContent,
} from '@/lib/questions/types';

interface BankDetailPanelProps {
  q: Question | null;
  onClose: () => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
}

export function BankDetailPanel({ q, onClose, onToggleActive }: BankDetailPanelProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  if (!q) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
        <p className="text-sm">Select a question to view details</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex flex-wrap items-center gap-2">
          <QuestionTypeBadge type={q.question_type} />
          <DifficultyBadge level={q.difficulty_level} />
          {q.exam_name && (
            <span className="text-xs text-gray-500">
              {q.exam_name} {q.exam_year ?? ''} {q.exam_shift ?? ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Show/hide answer toggle */}
          <button
            onClick={() => setShowAnswer((s) => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showAnswer
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {showAnswer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showAnswer ? 'Answer shown' : 'Show answer'}
          </button>

          {/* Active toggle */}
          {onToggleActive && (
            <button
              onClick={() => onToggleActive(q.id, !q.is_active)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                q.is_active
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : 'text-gray-500 bg-gray-50 border-gray-200'
              }`}
              title={q.is_active ? 'Deactivate question' : 'Activate question'}
            >
              {q.is_active ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              {q.is_active ? 'Active' : 'Inactive'}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {q.chapter_name && (
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Chapter</span>
              <span className="text-gray-700 font-medium">{q.chapter_name}</span>
            </div>
          )}
          {q.topic_name && (
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Topic</span>
              <span className="text-gray-700 font-medium">{q.topic_name}</span>
            </div>
          )}
          {q.subject && (
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Subject</span>
              <span className="text-gray-700 font-medium">{q.subject}</span>
            </div>
          )}
          {q.class && (
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Class</span>
              <span className="text-gray-700 font-medium">Grade {q.class}</span>
            </div>
          )}
        </div>

        {/* Question text */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Question</p>
          <p className="text-sm text-gray-900 leading-relaxed">{q.question_text}</p>
        </div>

        {/* Type-specific rendering */}
        {q.question_type === 'mcq' && (
          <McqRenderer
            content={q.content as McqContent}
            correctAnswer={q.correct_answer}
            showAnswer={showAnswer}
          />
        )}
        {q.question_type === 'assertion_reason' && (
          <AssertionReasonRenderer
            content={q.content as AssertionReasonContent}
            correctAnswer={q.correct_answer}
            showAnswer={showAnswer}
          />
        )}
        {q.question_type === 'matching' && (
          <MatchingRenderer
            content={q.content as MatchingContent}
            correctAnswer={q.correct_answer}
            correctAnswerDetail={q.correct_answer_detail}
            showAnswer={showAnswer}
          />
        )}
        {q.question_type === 'statement_based' && (
          <StatementRenderer
            content={q.content as StatementContent}
            correctAnswer={q.correct_answer}
            showAnswer={showAnswer}
          />
        )}
        {q.question_type === 'image_based' && (
          <ImageBasedRenderer
            content={q.content as ImageBasedContent}
            correctAnswer={q.correct_answer}
            showAnswer={showAnswer}
          />
        )}

        {/* Solution */}
        {q.solution && (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-xs font-bold text-yellow-700 mb-1.5">Solution</p>
            <p className="text-sm text-gray-800 leading-relaxed">{q.solution}</p>
          </div>
        )}

        {/* Tags */}
        {(q.concept_tags?.length > 0 || q.keywords?.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {[...(q.concept_tags ?? []), ...(q.keywords ?? [])].map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ID */}
        <p className="text-xs text-gray-300">ID: {q.id}</p>
      </div>
    </div>
  );
}
