import { ThemeWrapper } from '@/components/theme-provider';
import { StudentNav } from '@/components/StudentNav';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeWrapper variant="student">
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))]">
        <StudentNav />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
      <Toaster />
    </ThemeWrapper>
  );
}
