import { BookOpen, FileText, Image, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { query } from '@/lib/db';
import Link from 'next/link';

interface Stats {
  total_textbooks: string;
  total_chapters: string;
  total_images: string;
  total_uploads: string;
}

interface RecentUpload {
  original_filename: string;
  file_type: string;
  status: string;
  created_at: string;
}

async function getStats() {
  try {
    const [stats] = await query<Stats>(
      `SELECT
         (SELECT COUNT(*) FROM textbooks) AS total_textbooks,
         (SELECT COUNT(*) FROM chapters) AS total_chapters,
         (SELECT COUNT(*) FROM chapter_images) AS total_images,
         (SELECT COUNT(*) FROM uploaded_files) AS total_uploads`
    );
    const recent = await query<RecentUpload>(
      `SELECT original_filename, file_type, status, created_at
       FROM uploaded_files ORDER BY created_at DESC LIMIT 5`
    );
    return { stats, recent };
  } catch {
    return { stats: null, recent: [] };
  }
}

const statCards = [
  { key: 'total_textbooks', label: 'Textbooks', icon: BookOpen, color: 'text-blue-600' },
  { key: 'total_chapters', label: 'Chapters', icon: FileText, color: 'text-emerald-600' },
  { key: 'total_images', label: 'Images', icon: Image, color: 'text-purple-600' },
  { key: 'total_uploads', label: 'Uploads', icon: Upload, color: 'text-orange-600' },
] as const;

const statusVariant = {
  uploaded: 'secondary',
  ingested: 'default',
  failed: 'destructive',
  processing: 'outline',
} as const;

export default async function AdminOverview() {
  const { stats, recent } = await getStats();

  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          NCERT Physics Class 11 — Content Management
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
                  <p className="text-3xl font-bold mt-1">
                    {stats ? parseInt(stats[key as keyof Stats]) : '—'}
                  </p>
                </div>
                <Icon className={`w-8 h-8 ${color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/admin/upload"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <Upload className="w-4 h-4 text-[hsl(var(--primary))]" />
              <div>
                <p className="text-sm font-medium">Upload Content</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Add markdown files or images</p>
              </div>
            </Link>
            <Link
              href="/admin/textbooks"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[hsl(var(--primary))]" />
              <div>
                <p className="text-sm font-medium">Manage Textbooks</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">View and edit textbook records</p>
              </div>
            </Link>
            <Link
              href="/admin/chapters"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
              <div>
                <p className="text-sm font-medium">Browse Chapters</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Preview all chapter content</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent uploads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>Last 5 uploaded files</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">
                No uploads yet. Use the Upload page to add content.
              </p>
            ) : (
              <div className="space-y-3">
                {recent.map((file, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.original_filename}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatDate(file.created_at)}
                      </p>
                    </div>
                    <Badge variant={statusVariant[file.status as keyof typeof statusVariant] ?? 'outline'}>
                      {file.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
