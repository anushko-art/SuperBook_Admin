'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Bell, User, BookOpen, ChevronDown, LogOut, Pencil, Check, X } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';

interface AdminNavProps {
  breadcrumbs?: { label: string; href?: string }[];
}

const defaultNotifPrefs = {
  newUploads: true,
  chapterPublished: true,
  systemAlerts: false,
  weeklyDigest: true,
  emailNotif: false,
  pushNotif: true,
};

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  initials: string;
}

const FONT_SIZE_MAP: Record<string, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export function AdminNav({ breadcrumbs = [] }: AdminNavProps) {
  const { mode, toggleMode } = useTheme();
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifPrefs);
  const [showPreview, setShowPreview] = useState(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '', email: '', phone: '', role: 'admin', initials: '?',
  });
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const notifCount = 3;

  useEffect(() => {
    setMounted(true);
    // Load user profile
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const name = data.display_name || data.email || 'User';
        const initials = name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        setProfile({
          name,
          email: data.email ?? '',
          phone: data.phone ?? '',
          role: data.role ?? 'student',
          initials,
        });
        setEditName(data.display_name ?? '');
        setEditPhone(data.phone ?? '');
      })
      .catch(() => {});
  }, []);

  // Apply font size to document root
  useEffect(() => {
    if (mounted) {
      document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize];
    }
  }, [fontSize, mounted]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      window.location.href = '/auth/signin';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: editName, phone: editPhone }),
      });
      if (!res.ok) throw new Error('Save failed');
      const name = editName || profile.email;
      const initials = name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      setProfile((p) => ({ ...p, name, phone: editPhone, initials }));
      setEditMode(false);
      toast.success('Profile saved');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="h-14 flex items-center gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 md:px-6 shrink-0">
      
      {/* Mobile: Hamburger & Logo */}
      <div className="flex md:hidden items-center gap-3">
        <SidebarTrigger />
        <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
          <BookOpen className="h-3.5 w-3.5 text-[hsl(var(--primary-foreground))]" />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="hidden md:flex flex-1 min-w-0">
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

      {/* Right actions — rendered client-only to avoid hydration mismatch */}
      {!mounted ? (
        <div className="flex items-center gap-1.5 shrink-0 h-8 w-24" aria-hidden />
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            className="h-8 w-8 rounded-full hidden md:flex"
            title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {mode === 'light'
              ? <Moon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              : <Sun className="h-4 w-4 text-[hsl(var(--primary))]" />}
          </Button>

          {/* Notifications */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full relative hidden md:flex">
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

          {/* User avatar → opens profile sheet */}
          <Sheet onOpenChange={(open) => { if (!open) setEditMode(false); }}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full hover:bg-[hsl(var(--accent))] px-1.5 py-0.5 transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">{profile.initials || '?'}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <div className="flex items-center gap-4 pb-2">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="text-xl">{profile.initials || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{profile.name || 'Loading…'}</SheetTitle>
                    <SheetDescription>{profile.email}</SheetDescription>
                    <Badge className="mt-1.5 text-xs capitalize" variant="secondary">{profile.role}</Badge>
                  </div>
                </div>
              </SheetHeader>

              <SheetBody className="space-y-1">

                {/* Edit Profile section */}
                {editMode ? (
                  <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] p-4 mb-2">
                    <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Edit Profile
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs text-[hsl(var(--muted-foreground))]">Display Name</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-[hsl(var(--muted-foreground))]">Phone</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 00000 00000"
                        className="h-8 text-sm"
                        type="tel"
                      />
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Email and role can only be changed by a super admin.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={handleSaveProfile} disabled={saving}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setEditName(profile.name);
                          setEditPhone(profile.phone);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                      Account
                    </p>
                    <button
                      onClick={() => {
                        setEditName(profile.name);
                        setEditPhone(profile.phone);
                        setEditMode(true);
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[hsl(var(--accent))] transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Edit Profile</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Update name & phone</p>
                      </div>
                      <Pencil className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] ml-auto" />
                    </button>
                  </>
                )}

                <Separator className="my-4" />

                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                  App Preferences
                </p>

                <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Show preview</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Live markdown preview</p>
                  </div>
                  <Switch
                    checked={showPreview}
                    onCheckedChange={setShowPreview}
                  />
                </div>

                <div className="rounded-lg px-3 py-2.5">
                  <p className="text-sm font-medium mb-1.5">Font size</p>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`flex-1 rounded-md px-2 py-1 text-xs font-medium border transition-colors capitalize ${
                          fontSize === size
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

        </div>
      )}
    </header>
  );
}
