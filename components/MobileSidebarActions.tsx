'use client';

import { useState } from 'react';
import { Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetBody,
} from '@/components/ui/sheet';

const defaultNotifPrefs = {
  newUploads: true,
  chapterPublished: true,
  systemAlerts: false,
  weeklyDigest: true,
  emailNotif: false,
  pushNotif: true,
};

export function MobileSidebarActions() {
  const { mode, toggleMode } = useTheme();
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifPrefs);
  const notifCount = 3;

  return (
    <>
      <SidebarMenuItem className="md:hidden mt-2">
        <SidebarMenuButton
          onClick={toggleMode}
          label={mode === 'light' ? 'Dark Mode' : 'Light Mode'}
          icon={mode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          className="w-full cursor-pointer"
        />
      </SidebarMenuItem>

      <SidebarMenuItem className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <div className="w-full cursor-pointer">
              <SidebarMenuButton
                label="Notifications"
                icon={<Bell className="h-4 w-4" />}
                className="w-full"
              />
            </div>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>Recent activity & alerts</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-3">
              {[
                { title: 'Chapter uploaded', desc: 'NCERT.PHY.11.P1.C03 was ingested', time: '2m ago', dot: 'bg-[hsl(var(--primary))]' },
                { title: 'Schema updated', desc: 'textbooks table migrated', time: '1h ago', dot: 'bg-[hsl(var(--primary))]' },
                { title: 'Upload failed', desc: 'Image path missing in C07.md', time: '3h ago', dot: 'bg-[hsl(var(--destructive))]' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg p-3 bg-[hsl(var(--muted)/0.4)] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.dot}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{n.desc}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{n.time}</p>
                  </div>
                </div>
              ))}

              <Separator className="my-4" />
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Notification Preferences
              </p>

              {[
                { key: 'newUploads' as const, label: 'New uploads', desc: 'When a folder is ingested' },
                { key: 'chapterPublished' as const, label: 'Chapter published', desc: 'When a draft goes live' },
                { key: 'systemAlerts' as const, label: 'System alerts', desc: 'Errors & warnings' },
                { key: 'weeklyDigest' as const, label: 'Weekly digest', desc: 'Summary every Monday' },
                { key: 'emailNotif' as const, label: 'Email notifications', desc: 'Send to your email' },
                { key: 'pushNotif' as const, label: 'Push notifications', desc: 'Browser push alerts' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[key]}
                    onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
            </SheetBody>
          </SheetContent>
        </Sheet>
      </SidebarMenuItem>
    </>
  );
}
