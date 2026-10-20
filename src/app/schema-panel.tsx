'use client';

import { useEffect, useState } from 'react';

type Table = {
  name: string;
  rows: number;
  columns: { name: string; type: string; primaryKey: boolean; references: string | null }[];
};

// Side panel showing the company database structure, loaded from /api/schema.
export function SchemaPanel({ onClose }: { onClose: () => void }) {
  const [tables, setTables] = useState<Table[] | null>(null);

  useEffect(() => {
    fetch('/api/schema')
      .then((r) => r.json())
      .then(setTables);
  }, []);

  return (
    <aside className="absolute inset-0 z-10 flex flex-col bg-bg md:static md:w-80 md:shrink-0 md:border-l md:border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Database</h2>
          <p className="text-xs text-muted">company.db{tables && ` · ${tables.length} tables`}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close database panel"
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!tables && <SchemaSkeleton />}
        {tables?.map((table) => (
          <div key={table.name} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-2">
              <span className="font-mono text-sm font-semibold">{table.name}</span>
              <span className="text-xs text-muted">{table.rows} rows</span>
            </div>
            <ul className="divide-y divide-line">
              {table.columns.map((col) => (
                <li key={col.name} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <span className="font-mono">{col.name}</span>
                  {col.primaryKey && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                      PK
                    </span>
                  )}
                  {col.references && (
                    <span className="rounded bg-accent/15 px-1.5 py-0.5 font-medium text-accent">
                      → {col.references}
                    </span>
                  )}
                  <span className="ml-auto text-muted">{col.type}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

// Placeholder cards shaped like the table cards, shown while the schema loads.
const SKELETON_COLUMNS = [5, 8, 4, 6];
const SKELETON_WIDTHS = ['w-16', 'w-24', 'w-20', 'w-12', 'w-28'];

function SchemaSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading database" role="status">
      {SKELETON_COLUMNS.map((count, t) => (
        <div key={t} className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-2.5">
            <span className="h-3.5 w-20 animate-pulse rounded bg-line" />
            <span className="h-3 w-12 animate-pulse rounded bg-line" />
          </div>
          <ul className="divide-y divide-line">
            {Array.from({ length: count }, (_, c) => (
              <li key={c} className="flex items-center px-3 py-2">
                <span className={`h-3 animate-pulse rounded bg-surface-2 ${SKELETON_WIDTHS[(t + c) % SKELETON_WIDTHS.length]}`} />
                <span className="ml-auto h-3 w-10 animate-pulse rounded bg-surface-2" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
