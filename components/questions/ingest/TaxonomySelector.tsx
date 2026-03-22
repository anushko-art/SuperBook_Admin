'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import type { TaxonomyTextbook, TaxonomyChapter, TaxonomyTopic, TaxonomySelection } from '@/lib/questions/types';

interface TaxonomySelectorProps {
  onComplete: (selection: TaxonomySelection) => void;
}

export function TaxonomySelector({ onComplete }: TaxonomySelectorProps) {
  const [textbooks, setTextbooks] = useState<TaxonomyTextbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTextbook, setSelectedTextbook] = useState<TaxonomyTextbook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<TaxonomyChapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TaxonomyTopic | null>(null);

  useEffect(() => {
    fetch('/api/admin/questions/taxonomy')
      .then((r) => r.json())
      .then((data) => {
        setTextbooks(data.textbooks ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load taxonomy');
        setLoading(false);
      });
  }, []);

  function handleTextbookChange(id: string) {
    const tb = textbooks.find((t) => t.id === id) ?? null;
    setSelectedTextbook(tb);
    setSelectedChapter(null);
    setSelectedTopic(null);
  }

  function handleChapterChange(id: string) {
    const ch = selectedTextbook?.chapters.find((c) => c.id === id) ?? null;
    setSelectedChapter(ch);
    setSelectedTopic(null);
  }

  function handleTopicChange(id: string) {
    const topic = selectedChapter?.topics.find((t) => t.id === id) ?? null;
    setSelectedTopic(topic);

    if (topic && selectedTextbook && selectedChapter) {
      const label = `${selectedTextbook.subject}${selectedTextbook.part ? ` Pt.${selectedTextbook.part}` : ''} › Ch.${selectedChapter.chapter_number} ${selectedChapter.title} › ${topic.title}`;
      onComplete({
        textbookId: selectedTextbook.id,
        chapterId: selectedChapter.id,
        topicId: topic.id,
        label,
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading taxonomy…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Select the topic this batch of questions belongs to. The taxonomy will overwrite any
        values in the uploaded JSON.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Textbook */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Textbook
          </label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedTextbook?.id ?? ''}
            onChange={(e) => handleTextbookChange(e.target.value)}
          >
            <option value="">Select textbook…</option>
            {textbooks.map((tb) => (
              <option key={tb.id} value={tb.id}>
                {tb.title} (Gr.{tb.grade}{tb.part ? ` Pt.${tb.part}` : ''})
              </option>
            ))}
          </select>
        </div>

        {/* Chapter */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Chapter
          </label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={selectedChapter?.id ?? ''}
            onChange={(e) => handleChapterChange(e.target.value)}
            disabled={!selectedTextbook}
          >
            <option value="">Select chapter…</option>
            {selectedTextbook?.chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Ch.{ch.chapter_number} – {ch.title}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Topic
          </label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={selectedTopic?.id ?? ''}
            onChange={(e) => handleTopicChange(e.target.value)}
            disabled={!selectedChapter}
          >
            <option value="">Select topic…</option>
            {selectedChapter?.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.order_index}. {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Confirmation */}
      {selectedTopic && selectedChapter && selectedTextbook && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
          <span>
            Questions will be linked to{' '}
            <strong>
              {selectedTextbook.subject} › {selectedChapter.title} › {selectedTopic.title}
            </strong>
          </span>
          <ChevronRight className="w-4 h-4 ml-auto text-green-500" />
        </div>
      )}
    </div>
  );
}
