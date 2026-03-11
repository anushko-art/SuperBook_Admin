'use client';

const BRANCH_COLORS: Record<string, string> = {
  branch_red:    'bg-red-100    dark:bg-red-900/30    border-red-400    text-red-800    dark:text-red-200',
  branch_blue:   'bg-blue-100   dark:bg-blue-900/30   border-blue-400   text-blue-800   dark:text-blue-200',
  branch_green:  'bg-green-100  dark:bg-green-900/30  border-green-400  text-green-800  dark:text-green-200',
  branch_purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-400 text-purple-800 dark:text-purple-200',
  branch_orange: 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 text-orange-800 dark:text-orange-200',
  branch_teal:   'bg-teal-100   dark:bg-teal-900/30   border-teal-400   text-teal-800   dark:text-teal-200',
};

const BRANCH_COLOR_LIST = Object.keys(BRANCH_COLORS);

interface Child {
  id: string;
  text: string;
  note?: string;
}

interface Branch {
  id: string;
  text: string;
  visual_style?: string;
  notes?: string;
  children?: Child[];
}

interface MindMapData {
  root_node: { id: string; text: string; visual_style?: string };
  branches: Branch[];
}

export function MindMapRenderer({ data }: { data: MindMapData }) {
  const { root_node, branches } = data;

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Root node */}
      <div className="px-6 py-3 rounded-2xl bg-[hsl(var(--primary))] text-white font-bold text-base shadow-lg text-center max-w-xs">
        {root_node.text}
      </div>

      {/* Connector line */}
      <div className="w-px h-6 bg-[hsl(var(--border))]" />

      {/* Branches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {branches.map((branch, i) => {
          const styleKey = branch.visual_style ?? BRANCH_COLOR_LIST[i % BRANCH_COLOR_LIST.length];
          const colorClass = BRANCH_COLORS[styleKey] ?? BRANCH_COLORS[BRANCH_COLOR_LIST[i % BRANCH_COLOR_LIST.length]];

          return (
            <div key={branch.id} className={`rounded-xl border-2 ${colorClass} overflow-hidden`}>
              {/* Branch header */}
              <div className="px-4 py-2.5 font-semibold text-sm border-b border-current/20">
                {branch.text}
                {branch.notes && (
                  <p className="text-xs font-normal opacity-70 mt-0.5">{branch.notes}</p>
                )}
              </div>

              {/* Children */}
              {branch.children && branch.children.length > 0 && (
                <ul className="px-4 py-2 space-y-1.5 bg-white/40 dark:bg-black/20">
                  {branch.children.map((child) => (
                    <li key={child.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
                      <span>
                        <span className="font-medium">{child.text}</span>
                        {child.note && (
                          <span className="ml-1 opacity-60">— {child.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
