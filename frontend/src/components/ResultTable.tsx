interface ResultTableProps {
  fields: string[];
  rows: Array<Record<string, unknown>>;
}

export function ResultTable({ fields, rows }: ResultTableProps): JSX.Element {
  if (!rows.length) {
    return <p className="text-sm text-white/70">No rows returned.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
      <table className="min-w-full divide-y divide-white/10 text-white">
        <thead className="bg-white/10">
          <tr>
            {fields.map((field) => (
              <th
                key={field}
                scope="col"
                className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70"
              >
                {field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-white/5">
          {rows.map((row, idx) => (
            <tr key={idx}>
              {fields.map((field) => (
                <td key={field} className="whitespace-nowrap px-3 py-2 text-sm text-white/90">
                  {formatCell(row[field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

