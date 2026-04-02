import {
  LayoutDashboard, Library, BookOpen,
  FileText, Settings, Sparkles, ImageIcon,
  HelpCircle, FileJson,
} from 'lucide-react';
import { ThemeWrapper } from '@/components/theme-provider';
import { AdminNav } from '@/components/AdminNav';
import { MobileSidebarActions } from '@/components/MobileSidebarActions';
import { Toaster } from '@/components/ui/sonner';
import {
  Sidebar, SidebarProvider, SidebarHeader, SidebarContent,
  SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger,
} from '@/components/ui/sidebar';

const navGroups = [
  {
    label: 'Content',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/textbooks', label: 'Ingest Content', icon: Library },
      { href: '/admin/chapters', label: 'Preview Chapter', icon: BookOpen },
      { href: '/admin/generate', label: 'AI Generate', icon: Sparkles },
      { href: '/admin/media', label: 'Media', icon: ImageIcon },
      { href: '/admin/questions/ingest', label: 'Ingest Questions', icon: FileJson },
      { href: '/admin/questions', label: 'Question Bank', icon: HelpCircle },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/admin/chapters', label: 'All Content', icon: FileText },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeWrapper variant="admin">
      <SidebarProvider>
        <div className="flex min-h-screen bg-[hsl(var(--background))]">

          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                  <BookOpen className="h-3.5 w-3.5 text-[hsl(var(--primary-foreground))]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-none truncate text-[hsl(var(--foreground))]">Superbook</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 font-medium uppercase tracking-wider">
                    Admin
                  </p>
                </div>
              </div>
              <SidebarTrigger />
            </SidebarHeader>

            <SidebarContent>
              {navGroups.map((group) => (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  <SidebarMenu>
                    {group.items.map(({ href, label, icon: Icon }) => (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          href={href}
                          label={label}
                          icon={<Icon className="h-4 w-4" />}
                        />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              ))}
            </SidebarContent>

            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    href="/dashboard"
                    label="Student View"
                    icon={<Settings className="h-4 w-4" />}
                  />
                </SidebarMenuItem>
                <MobileSidebarActions />
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 pb-14 md:pb-0">
            <AdminNav />
            <main className="flex-1 flex flex-col min-w-0 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </ThemeWrapper>
  );
}
