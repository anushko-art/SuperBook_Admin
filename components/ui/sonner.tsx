'use client';

import { Toaster as Sonner, toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  const { mode } = useTheme();
  return (
    <Sonner
      theme={mode}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[hsl(var(--card))] group-[.toaster]:text-[hsl(var(--foreground))] group-[.toaster]:border-[hsl(var(--border))] group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[hsl(var(--muted-foreground))]',
          actionButton:
            'group-[.toast]:bg-[hsl(var(--primary))] group-[.toast]:text-[hsl(var(--primary-foreground))]',
          cancelButton:
            'group-[.toast]:bg-[hsl(var(--muted))] group-[.toast]:text-[hsl(var(--muted-foreground))]',
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
