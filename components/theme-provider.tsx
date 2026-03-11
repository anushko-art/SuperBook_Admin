'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ThemeMode = 'light' | 'dark';
type ThemeVariant = 'student' | 'admin';

interface ThemeCtx {
  mode: ThemeMode;
  variant: ThemeVariant;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  mode: 'light',
  variant: 'student',
  toggleMode: () => {},
});

export function ThemeWrapper({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant: ThemeVariant;
  className?: string;
}) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const saved = localStorage.getItem('superbook-theme-mode') as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') setMode(saved);
  }, []);

  const toggleMode = () => {
    setMode((m) => {
      const next = m === 'light' ? 'dark' : 'light';
      localStorage.setItem('superbook-theme-mode', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, variant, toggleMode }}>
      <div
        data-theme={variant}
        className={cn(mode === 'dark' && 'dark', 'min-h-screen', className)}
        suppressHydrationWarning
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
