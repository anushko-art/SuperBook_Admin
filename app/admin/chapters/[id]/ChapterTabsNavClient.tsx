'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';

export function ChapterAdminTabsWrapper({
  defaultValue,
  selectTabs,
  children,
}: {
  defaultValue: string;
  selectTabs: { value: string; label: string }[];
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {/* Mobile: dropdown */}
      <div className="md:hidden mb-2 relative">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          {selectTabs.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">▾</span>
      </div>
      {children}
    </Tabs>
  );
}
