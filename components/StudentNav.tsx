'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Bell, User, Settings, BookOpen, Bookmark, Palette, ChevronDown, GraduationCap, FlaskConical, Search, LogOut, Sparkles } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: BookOpen },
  { href: '/dashboard/books', label: 'Books', icon: GraduationCap },
  { href: '/dashboard/quiz', label: 'Quiz', icon: FlaskConical },
  { href: '/dashboard/search', label: 'Search', icon: Search },
  { href: '/dashboard/rag', label: 'Ask AI', icon: Sparkles },
];

const defaultNotifPrefs = {
  newContent: true,
  studyReminders: true,
  achievements: true,
  weeklyProgress: false,
  emailUpdates: false,
};

const defaultAppPrefs = {
  continuousScroll: true,
  nightReading: false,
  autoBookmark: true,
  fontSize: 'medium' as 'small' | 'medium' | 'large',
};

export function StudentNav() {
  const { mode, toggleMode } = useTheme();
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifPrefs);
  const [appPrefs, setAppPrefs] = useState(defaultAppPrefs);
  const notifCount = 2;
  const router = useRouter();

  const handleSignout = useCallback(async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/auth/signin');
    router.refresh();
  }, [router]);

  return (
    <header className="h-14 flex items-center gap-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 mr-8">
        <div className="h-7 w-7 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
          <BookOpen className="h-3.5 w-3.5 text-[hsl(var(--primary-foreground))]" />
        </div>
        <span className="font-bold text-sm tracking-tight">Superbook</span>
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-0.5 flex-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMode}
          className="h-8 w-8 rounded-full"
          title={mode === 'light' ? 'Dark mode' : 'Light mode'}
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
              <SheetDescription>Your study updates</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-3">
              {[
                { title: 'New chapter available', desc: 'Chapter 8 has been published', time: '1h ago', dot: 'bg-[hsl(var(--primary))]' },
                { title: 'Study streak!', desc: "You've studied 5 days in a row", time: '2h ago', dot: 'bg-emerald-500' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg p-3 bg-[hsl(var(--muted)/0.4)] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.dot}`} />
                  <div>
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
                { key: 'newContent' as const, label: 'New content', desc: 'When new chapters are published' },
                { key: 'studyReminders' as const, label: 'Study reminders', desc: 'Daily study nudges' },
                { key: 'achievements' as const, label: 'Achievements', desc: 'Badges & milestones' },
                { key: 'weeklyProgress' as const, label: 'Weekly progress', desc: 'Summary of your week' },
                { key: 'emailUpdates' as const, label: 'Email updates', desc: 'Sent to your inbox' },
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

        {/* User profile */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-full hover:bg-[hsl(var(--accent))] px-1.5 py-0.5 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">ST</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
            </button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <div className="flex items-center gap-4 pb-2">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-xl">ST</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>Student User</SheetTitle>
                  <SheetDescription>student@superbook.edu</SheetDescription>
                  <Badge className="mt-1.5 text-xs" variant="secondary">Class 11</Badge>
                </div>
              </div>
            </SheetHeader>
            <SheetBody className="space-y-4">
              {/* Study progress */}
              <div className="rounded-xl bg-[hsl(var(--muted)/0.5)] p-4 space-y-3">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Study Progress
                </p>
                {[
                  { label: 'Physics Part 1', value: 45 },
                  { label: 'Physics Part 2', value: 20 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{label}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">{value}%</span>
                    </div>
                    <Progress value={value} className="h-1.5" />
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Quick Links
              </p>
              {[
                { icon: User, label: 'My Profile', desc: 'Progress & insights', href: '/dashboard/profile' },
                { icon: FlaskConical, label: 'Quiz History', desc: 'Past attempts & scores', href: '/dashboard/quiz' },
                { icon: Bookmark, label: 'Bookmarks', desc: 'Saved passages', href: '/dashboard/bookmarks' },
                { icon: Settings, label: 'Account Settings', desc: 'Password & security', href: undefined },
              ].map(({ icon: Icon, label, desc, href }) => (
                href
                  ? <Link key={label} href={href} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[hsl(var(--accent))] transition-colors">
                      <div className="h-8 w-8 rounded-md bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
                      </div>
                    </Link>
                  : <button key={label} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[hsl(var(--accent))] transition-colors">
                  <div className="h-8 w-8 rounded-md bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
                  </div>
                </button>
              ))}

              <Separator />

              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                App Preferences
              </p>
              {[
                { key: 'continuousScroll' as const, label: 'Continuous scroll', desc: 'Chapter flows into next' },
                { key: 'autoBookmark' as const, label: 'Auto-bookmark', desc: 'Save reading position' },
                { key: 'nightReading' as const, label: 'Night reading', desc: 'Reduced brightness' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1">
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
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleSignout}>
                <LogOut className="h-3.5 w-3.5" />Sign out
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Theme settings */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Theme settings">
              <Palette className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Theme Settings</SheetTitle>
              <SheetDescription>Personalize your reading experience</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-6">
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
                  <p className="text-sm font-semibold">Forest Green</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Calm emerald tones for focused study
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                  Reading font size
                </p>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setAppPrefs((p) => ({ ...p, fontSize: size }))}
                      className={`flex-1 rounded-md px-2 py-2 text-xs font-medium border transition-colors capitalize ${
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
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
