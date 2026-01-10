import type { SchemaColumn } from "../lib/api";

interface SchemaSidebarProps {
  columns: SchemaColumn[];
  loading?: boolean;
}

export function SchemaSidebar({ columns, loading = false }: SchemaSidebarProps): JSX.Element {
  const grouped = groupColumns(columns);

  return (
    <aside className="space-y-4 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl shadow-fuchsia-500/10 backdrop-blur">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          Schema Explorer
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">AI Context Blueprint</h2>
        <p className="mt-1 text-xs text-white/70">
          {loading
            ? "Loading schema…"
            : "The assistant auto-ingests these tables and datatypes for every prompt."}
        </p>
      </header>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {grouped.map((table) => (
          <div key={table.key} className="rounded-2xl bg-white/5 px-4 py-3 text-xs text-white">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
              {table.schema}.{table.name}
            </p>
            <ul className="space-y-1.5">
              {table.columns.map((column) => (
                <li
                  key={column.columnName}
                  className="flex items-center justify-between text-[11px] text-white/80"
                >
                  <span>{column.columnName}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/60">
                    {column.dataType}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!grouped.length && !loading && (
          <p className="text-xs text-white/60">No tables were detected in the target schema.</p>
        )}
      </div>
    </aside>
  );
}

type TableGroup = { key: string; schema: string; name: string; columns: SchemaColumn[] };

function groupColumns(columns: SchemaColumn[]): TableGroup[] {
  const map = new Map<string, TableGroup>();

  for (const column of columns) {
    const key = `${column.tableSchema}.${column.tableName}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        schema: column.tableSchema,
        name: column.tableName,
        columns: []
      });
    }
    map.get(key)!.columns.push(column);
  }

  return Array.from(map.values());
}

