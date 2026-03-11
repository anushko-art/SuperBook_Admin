'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Bell, User, Settings, BookOpen, Monitor, Palette, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';

interface AdminNavProps {
  breadcrumbs?: { label: string; href?: string }[];
}

/* ─── Notification preferences state ─────────────────────────────────────── */
const defaultNotifPrefs = {
  newUploads: true,
  chapterPublished: true,
  systemAlerts: false,
  weeklyDigest: true,
  emailNotif: false,
  pushNotif: true,
};

/* ─── App preferences state ──────────────────────────────────────────────── */
const defaultAppPrefs = {
  compactView: false,
  autoSave: true,
  showPreview: true,
  fontSize: 'medium' as 'small' | 'medium' | 'large',
  language: 'en',
};

export function AdminNav({ breadcrumbs = [] }: AdminNavProps) {
  const { mode, toggleMode } = useTheme();
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifPrefs);
  const [appPrefs, setAppPrefs] = useState(defaultAppPrefs);
  const [mounted, setMounted] = useState(false);
  const notifCount = 3;

  useEffect(() => { setMounted(true); }, []);

  return (
    <header className="h-14 flex items-center gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 shrink-0">
      {/* Breadcrumb */}
      <div className="flex-1 min-w-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin" className="flex items-center gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                Admin
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {crumb.href && i < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink href={crumb.href} className="text-xs">
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-xs">{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right actions — rendered client-only to avoid Radix aria-controls hydration mismatch */}
      {!mounted ? (
        <div className="flex items-center gap-1.5 shrink-0 h-8 w-24" aria-hidden />
      ) : (
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMode}
          className="h-8 w-8 rounded-full"
          title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {mode === 'light'
            ? <Moon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            : <Sun className="h-4 w-4 text-[hsl(var(--primary))]" />}
        </Button>

        {/* Notifications */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full relative">
              <Bell className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-[10px] font-bold flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </Button>
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

        {/* User avatar → opens profile + settings dropdown */}
        <div className="flex items-center gap-1">
          {/* Profile Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full hover:bg-[hsl(var(--accent))] px-1.5 py-0.5 transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">AD</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <div className="flex items-center gap-4 pb-2">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="text-xl">AD</AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>Admin User</SheetTitle>
                    <SheetDescription>admin@superbook.edu</SheetDescription>
                    <Badge className="mt-1.5 text-xs" variant="secondary">Administrator</Badge>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody className="space-y-1">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                  Account
                </p>
                {[
                  { icon: User, label: 'Edit Profile', desc: 'Update name & email' },
                  { icon: Settings, label: 'Account Settings', desc: 'Security & preferences' },
                  { icon: Monitor, label: 'Sessions', desc: '2 active sessions' },
                ].map(({ icon: Icon, label, desc }) => (
                  <button key={label} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[hsl(var(--accent))] transition-colors">
                    <div className="h-8 w-8 rounded-md bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
                    </div>
                  </button>
                ))}

                <Separator className="my-4" />

                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                  App Preferences
                </p>
                {[
                  { key: 'compactView' as const, label: 'Compact view', desc: 'Reduce spacing in lists' },
                  { key: 'autoSave' as const, label: 'Auto-save', desc: 'Save changes automatically' },
                  { key: 'showPreview' as const, label: 'Show preview', desc: 'Live markdown preview' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
                    </div>
                    <Switch
                      checked={appPrefs[key]}
                      onCheckedChange={(v) => setAppPrefs((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}

                <div className="rounded-lg px-3 py-2.5">
                  <p className="text-sm font-medium mb-1.5">Font size</p>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setAppPrefs((p) => ({ ...p, fontSize: size }))}
                        className={`flex-1 rounded-md px-2 py-1 text-xs font-medium border transition-colors capitalize ${
                          appPrefs.fontSize === size
                            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                            : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" size="sm" className="w-full">Sign out</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Theme Settings Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Theme settings">
                <Palette className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Theme Settings</SheetTitle>
                <SheetDescription>Customize the appearance of the admin panel</SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-6">
                {/* Mode toggle */}
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                    Color mode
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: 'light', icon: Sun, label: 'Light' },
                      { val: 'dark', icon: Moon, label: 'Dark' },
                    ].map(({ val, icon: Icon, label }) => (
                      <button
                        key={val}
                        onClick={() => val !== mode && toggleMode()}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                          mode === val
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]'
                            : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${mode === val ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Theme preview */}
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                    Active theme
                  </p>
                  <div className="rounded-xl border-2 border-[hsl(var(--primary))] p-4 bg-[hsl(var(--primary)/0.05)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[hsl(var(--primary))]" />
                        <span className="w-4 h-4 rounded-full bg-[hsl(var(--secondary))]" />
                        <span className="w-4 h-4 rounded-full bg-[hsl(var(--accent))]" />
                        <span className="w-4 h-4 rounded-full bg-[hsl(var(--muted))]" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold">Vintage Paper</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      Warm amber tones for focused work
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                    Display
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Compact sidebar</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Show icons only</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Rounded corners</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Softer card edges</p>
                      </div>
                      <Switch checked />
                    </div>
                  </div>
                </div>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      )}
    </header>
  );
}
