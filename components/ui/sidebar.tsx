'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SidebarContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  isMobile: boolean;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => {},
  isMobile: false,
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, isMobile, setOpen } = useSidebar();

  if (isMobile) {
    return (
      <>
        {open && (
           <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
        )}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-transform duration-300',
            open ? 'translate-x-0 w-64' : '-translate-x-full w-64',
            className
          )}
        >
          {children}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-200 shrink-0',
        open ? 'w-56' : 'w-14',
        className
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex h-14 items-center border-b border-[hsl(var(--border))] px-3', className)}>
      {children}
    </div>
  );
}

export function SidebarContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex-1 overflow-y-auto py-2', className)}>
      {children}
    </div>
  );
}

export function SidebarFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('border-t border-[hsl(var(--border))] p-2', className)}>
      {children}
    </div>
  );
}

export function SidebarGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-2 py-1', className)}>{children}</div>;
}

export function SidebarGroupLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = useSidebar();
  if (!open) return null;
  return (
    <p className={cn('px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]', className)}>
      {children}
    </p>
  );
}

export function SidebarMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  return <ul className={cn('space-y-0.5', className)}>{children}</ul>;
}

export function SidebarMenuItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <li className={cn('', className)}>{children}</li>;
}

interface SidebarMenuButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean;
  icon?: React.ReactNode;
  label: string;
  asChild?: boolean;
}

export function SidebarMenuButton({ isActive, icon, label, className, ...props }: SidebarMenuButtonProps) {
  const { open } = useSidebar();
  return (
    <a
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
        'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
        isActive && 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium',
        !open && 'justify-center px-2',
        className
      )}
      title={!open ? label : undefined}
      {...props}
    >
      {icon && <span className="shrink-0 h-4 w-4 flex items-center justify-center">{icon}</span>}
      {open && <span className="truncate">{label}</span>}
    </a>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { open, setOpen } = useSidebar();
  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors',
        className
      )}
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {open ? (
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
