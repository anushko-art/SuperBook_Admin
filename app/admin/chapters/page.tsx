'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Clock, FileText, ChevronRight, Search, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  source_folder: string;
  is_published: boolean;
  estimated_read_time_minutes: number;
  content_length: number;
  textbook_title: string;
  subject: string;
  grade: string;
  part: string;
}

const PAGE_SIZE = 8;

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade]     = useState('');
  const [selectedTextbook, setSelectedTextbook] = useState('all');

  useEffect(() => {
    fetch('/api/chapters')
      .then((r) => r.json())
      .then((d) => setChapters(Array.isArray(d) ? d : (d.chapters ?? [])));
  }, []);

  /* cascade options */
  const subjectOptions = useMemo(() =>
    Array.from(new Set(chapters.map(c => c.subject))).sort(), [chapters]);
  const gradeOptions = useMemo(() =>
    selectedSubject
      ? Array.from(new Set(chapters.filter(c => c.subject === selectedSubject).map(c => c.grade))).sort()
      : Array.from(new Set(chapters.map(c => c.grade))).sort(),
    [chapters, selectedSubject]);
  const textbookOptions = useMemo(() => {
    const names = Array.from(new Set(chapters
      .filter(c => (!selectedSubject || c.subject === selectedSubject) && (!selectedGrade || c.grade === selectedGrade))
      .map(c => c.textbook_title)));
    return ['all', ...names];
  }, [chapters, selectedSubject, selectedGrade]);


  const published = useMemo(() => chapters.filter((c) => c.is_published), [chapters]);
  const drafts = useMemo(() => chapters.filter((c) => !c.is_published), [chapters]);

  const filterChapters = (list: Chapter[]) => {
    let filtered = list;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) => c.title.toLowerCase().includes(q) || c.source_folder.toLowerCase().includes(q)
      );
    }
    if (selectedSubject) filtered = filtered.filter(c => c.subject === selectedSubject);
    if (selectedGrade)   filtered = filtered.filter(c => c.grade === selectedGrade);
    if (selectedTextbook !== 'all') {
      filtered = filtered.filter((c) => c.textbook_title === selectedTextbook);
    }
    return filtered;
  };

  const renderTable = (list: Chapter[]) => {
    const filtered = filterChapters(list);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
    );

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
          <table className="w-full striped-table">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Chapter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden md:table-cell">Textbook</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden md:table-cell">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden md:table-cell">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-[hsl(var(--muted-foreground))]">
                    No chapters found
                  </td>
                </tr>
              ) : items.map((ch) => (
                <tr key={ch.id} className="border-b border-[hsl(var(--border))] last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-xs font-bold text-[hsl(var(--muted-foreground))]">
                      {ch.chapter_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{ch.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono mt-0.5">{ch.source_folder}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{ch.textbook_title}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {ch.estimated_read_time_minutes > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <Clock className="w-3 h-3" />{ch.estimated_read_time_minutes}m
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {ch.content_length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <FileText className="w-3 h-3" />{(ch.content_length / 1000).toFixed(1)}k
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ch.is_published ? 'default' : 'secondary'} className="text-xs">
                      {ch.is_published ? 'Live' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/chapters/${ch.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {pageNums.map((p, idx) => {
                const prev = pageNums[idx - 1];
                return (
                  <span key={p} className="contents">
                    {prev && p - prev > 1 && (
                      <PaginationItem><PaginationEllipsis /></PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  </span>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">
      {/* Cascade filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Subject */}
        <Select value={selectedSubject || '__all__'} onValueChange={v => {
          setSelectedSubject(v === '__all__' ? '' : v); setSelectedGrade(''); setSelectedTextbook('all'); setPage(1);
        }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All subjects</SelectItem>
            {subjectOptions.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Class */}
        <Select value={selectedGrade || '__all__'} onValueChange={v => {
          setSelectedGrade(v === '__all__' ? '' : v); setSelectedTextbook('all'); setPage(1);
        }}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All classes</SelectItem>
            {gradeOptions.map(g => <SelectItem key={g} value={g} className="text-xs">Class {g}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Textbook */}
        <Select value={selectedTextbook} onValueChange={(v) => { setSelectedTextbook(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs w-56"><SelectValue placeholder="Filter by textbook" /></SelectTrigger>
          <SelectContent>
            {textbookOptions.map((tb) => (
              <SelectItem key={tb} value={tb} className="text-xs">
                {tb === 'all' ? 'All textbooks' : tb}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(selectedSubject || selectedGrade || selectedTextbook !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
            setSelectedSubject(''); setSelectedGrade(''); setSelectedTextbook('all'); setPage(1);
          }}>Clear filters</Button>
        )}
      </div>

      {/* Breadcrumb trail */}
      <div className="flex items-center gap-3 flex-wrap">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin" className="text-xs">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {selectedTextbook === 'all' && !selectedSubject ? (
                <BreadcrumbPage className="text-xs">All Chapters</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href="/admin/chapters" className="text-xs cursor-pointer"
                  onClick={() => { setSelectedSubject(''); setSelectedGrade(''); setSelectedTextbook('all'); }}>
                  Chapters
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {selectedSubject && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs">{selectedSubject}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            {selectedGrade && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs">Class {selectedGrade}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            {selectedTextbook !== 'all' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs max-w-[200px] truncate">{selectedTextbook}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Chapters</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {chapters.length} total &mdash; {published.length} live, {drafts.length} drafts
          </p>
        </div>
        <div className="relative w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Search chapters..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={() => setPage(1)}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs gap-1.5">
            All
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] px-1 text-[10px] font-semibold text-[hsl(var(--primary))]">
              {chapters.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs gap-1.5">
            Approved
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
              {published.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1.5">
            For Review
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
              {drafts.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">{renderTable(chapters)}</TabsContent>
        <TabsContent value="approved" className="mt-4">{renderTable(published)}</TabsContent>
        <TabsContent value="review" className="mt-4">{renderTable(drafts)}</TabsContent>
      </Tabs>
    </div>
  );
}
