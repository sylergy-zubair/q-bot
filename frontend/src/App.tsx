import { useEffect, useMemo, useState } from "react";
import { QueryForm } from "./components/QueryForm";
import { SqlPreview } from "./components/SqlPreview";
import { ResultTable } from "./components/ResultTable";
import { InsightsPanel } from "./components/InsightsPanel";
import {
  fetchInsights,
  fetchSchema,
  runNaturalLanguageQuery,
  type InsightsPayload,
  type QueryResultPayload,
  type SchemaColumn
} from "./lib/api";
import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar
} from "recharts";

type QueryStatus = "idle" | "loading" | "error" | "success";
type DesignMode = "aurora" | "cupertino";

function App(): JSX.Element {
  const [columns, setColumns] = useState<SchemaColumn[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResultPayload | null>(null);
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [design, setDesign] = useState<DesignMode>("aurora");

  useEffect(() => {
    async function loadSchema(): Promise<void> {
      setSchemaLoading(true);
      try {
        const schema = await fetchSchema();
        setColumns(schema.columns);
      } catch (schemaError) {
        console.error(schemaError);
        setError("Failed to load schema metadata.");
      } finally {
        setSchemaLoading(false);
      }
    }

    async function loadInsights(): Promise<void> {
      setInsightsLoading(true);
      try {
        const data = await fetchInsights();
        setInsights(data);
      } catch (insightsError) {
        console.error(insightsError);
      } finally {
        setInsightsLoading(false);
      }
    }

    void loadSchema();
    void loadInsights();
  }, []);

  async function handleSubmit(question: string): Promise<void> {
    setStatus("loading");
    setError(null);

    try {
      const data = await runNaturalLanguageQuery(question);
      setResult(data);
      setStatus("success");
    } catch (runError: unknown) {
      console.error(runError);
      setStatus("error");
      setError("Unable to execute query. Check backend logs for details.");
    }
  }

  return design === "aurora" ? (
    <AuroraDashboard
      onSubmit={handleSubmit}
      status={status}
      error={error}
      result={result}
      insights={insights}
      insightsLoading={insightsLoading}
      columns={columns}
      schemaLoading={schemaLoading}
      onSwitchDesign={() => setDesign("cupertino")}
    />
  ) : (
    <CupertinoDashboard
      onSubmit={handleSubmit}
      status={status}
      error={error}
      result={result}
      insights={insights}
      insightsLoading={insightsLoading}
      columns={columns}
      schemaLoading={schemaLoading}
      onSwitchDesign={() => setDesign("aurora")}
    />
  );
}

export default App;

interface DashboardProps {
  onSubmit: (question: string) => Promise<void>;
  status: QueryStatus;
  error: string | null;
  result: QueryResultPayload | null;
  insights: InsightsPayload | null;
  insightsLoading: boolean;
  columns: SchemaColumn[];
  schemaLoading: boolean;
  onSwitchDesign: () => void;
}

function AuroraDashboard({
  onSubmit,
  status,
  error,
  result,
  insights,
  insightsLoading,
  columns,
  schemaLoading,
  onSwitchDesign
}: DashboardProps): JSX.Element {
  const tableGroups = useMemo(() => groupColumnsByTable(columns), [columns]);
  const totalColumns = columns.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-sky-900 text-white">
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 via-sky-500/10 to-transparent blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80">
              Sylergy Agent Q
            </span>
            <h1 className="mt-4 text-3xl font-semibold md:text-5xl">
              Conversational analytics powered by Sylergy Agent Q.
            </h1>
            <p className="mt-3 text-base text-white/70">
              Ask questions in everyday language, review ready-to-run SQL, and explore curated insights
              from the `sale` schema—without leaving the browser.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 md:items-center">
            <span className="inline-flex h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30">
              PoC Build • November 2025
            </span>
            <button
              type="button"
              onClick={onSwitchDesign}
              className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/10"
            >
              Try Cupertino Theme
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <QueryForm onSubmit={onSubmit} disabled={status === "loading"} />
            <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-sky-500/10 backdrop-blur">
              {status === "loading" && (
                <p className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                  Generating SQL and executing query…
                </p>
              )}
              {error && (
                <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              )}
              {result ? (
                <div className="space-y-4">
                  <SqlPreview sql={result.sql} />
                  {result.warnings?.length ? (
                    <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                        Guardrail Notes
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {result.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm text-white/70">
                      <h2 className="font-semibold uppercase tracking-[0.25em] text-white/60">
                        Result Preview
                      </h2>
                      <span>Rows: {result.result.rowCount}</span>
                    </div>
                    <ResultTable fields={result.result.fields} rows={result.result.rows} />
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/20 p-6 text-sm text-white/60">
                  Run a query to preview generated SQL and live data results.
                </div>
              )}
            </section>
          </div>

          <div className="lg:max-w-sm space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-indigo-500/20">
              <header className="mb-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Assistant Playbook
                </p>
                <h3 className="text-lg font-semibold text-white">
                  What Agent Q understands about your data
                </h3>
              </header>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="font-semibold text-white">Schema Coverage</p>
                  <p className="text-xs text-white/60">
                    {schemaLoading
                      ? "Loading schema metadata…"
                      : `${tableGroups.length} tables • ${totalColumns} columns interpreted by the assistant.`}
                  </p>
                </li>
                <li className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="font-semibold text-white">Featured Tables</p>
                  <p className="text-xs text-white/60">
                    {tableGroups.slice(0, 3).map((group) => `${group.schema}.${group.name}`).join(", ") ||
                      "Tables will appear once the schema loads."}
                  </p>
                </li>
                <li className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="font-semibold text-white">Prompt Strategy</p>
                  <p className="text-xs text-white/60">
                    Live columns and sample rows feed each request. SQL is sanitized to SELECT-only
                    statements before hitting Postgres.
                  </p>
                </li>
              </ul>
            </section>
          </div>
        </section>

        <InsightsPanel insights={insights} loading={insightsLoading} />
      </main>
    </div>
  );
}

function CupertinoDashboard({
  onSubmit,
  status,
  error,
  result,
  insights,
  insightsLoading,
  columns,
  schemaLoading,
  onSwitchDesign
}: DashboardProps): JSX.Element {
  const tableGroups = useMemo(() => groupColumnsByTable(columns), [columns]);
  const totalColumns = columns.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-200 text-slate-900">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sylergy Agent Q</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
              Precision analytics powered by Sylergy Agent Q.
            </h1>
          </div>
          <button
            type="button"
            onClick={onSwitchDesign}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-md transition hover:shadow-lg"
          >
            Switch to Aurora Theme
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            <CupertinoQueryPanel onSubmit={onSubmit} disabled={status === "loading"} />
            <CupertinoResultCard status={status} error={error} result={result} />
          </div>
          <div className="space-y-8">
            <CupertinoInsightsPanel insights={insights} loading={insightsLoading} />
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-black/5">
              <header className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Data Overview
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">Schema Snapshot</h3>
              </header>
              <p className="text-sm text-slate-600">
                {schemaLoading
                  ? "Loading schema metadata…"
                  : `The assistant currently ingests ${tableGroups.length} tables and ${totalColumns} columns within the sale schema.`}
              </p>
              {!schemaLoading && tableGroups.length > 0 ? (
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {tableGroups.slice(0, 5).map((group) => (
                    <li key={group.key} className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        {group.schema}.{group.name}
                      </span>
                      <span className="text-xs text-slate-500">{group.columns.length} columns</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

interface CupertinoQueryPanelProps {
  onSubmit: (question: string) => Promise<void>;
  disabled: boolean;
}

function CupertinoQueryPanel({ onSubmit, disabled }: CupertinoQueryPanelProps): JSX.Element {
  const [question, setQuestion] = useState("");
  const suggestions = [
    "Compare net revenue by channel for the past two quarters.",
    "Show top 10 menu items with refund impact this month.",
    "Summarize weekend vs weekday performance by store."
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!question.trim()) return;
    await onSubmit(question.trim());
  }

  return (
    <section className="rounded-[32px] border border-gray-200 bg-white p-8 shadow-2xl shadow-black/5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Natural Language Prompt
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Ask questions and let Agent Q compose compliant SQL.
          </h2>
        </div>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. Surface monthly growth rate by store with year-over-year comparison."
          className="w-full rounded-3xl border border-gray-300 bg-gray-50 px-4 py-4 text-base text-slate-900 shadow-inner focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
          rows={4}
        />
        <div className="flex flex-wrap gap-2">
          {suggestions.map((sample) => (
            <button
              type="button"
              key={sample}
              onClick={() => setQuestion(sample)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
            >
              {sample}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{question.length} characters</p>
          <button
            type="submit"
            disabled={disabled || question.trim().length < 3}
            className="rounded-full bg-slate-900 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-black/30 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            Run Query
          </button>
        </div>
      </form>
    </section>
  );
}

interface CupertinoResultCardProps {
  status: QueryStatus;
  error: string | null;
  result: QueryResultPayload | null;
}

function CupertinoResultCard({ status, error, result }: CupertinoResultCardProps): JSX.Element {
  return (
    <section className="space-y-5 rounded-[32px] border border-gray-200 bg-white p-8 shadow-2xl shadow-black/5">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Result Workspace</h2>
        {status === "loading" ? (
          <span className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs text-slate-500">
            Running…
          </span>
        ) : null}
      </header>
      {error ? (
        <p className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {result ? (
        <>
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>Generated SQL</span>
              <span>{result.result.rowCount} rows</span>
            </div>
            <pre className="overflow-x-auto text-sm text-slate-800">
              <code>{result.sql}</code>
            </pre>
          </div>
          <CupertinoResultTable fields={result.result.fields} rows={result.result.rows} />
        </>
      ) : (
        <p className="text-sm text-slate-500">
          Submit a question to see the generated SQL and data returned by the database.
        </p>
      )}
    </section>
  );
}

interface CupertinoResultTableProps {
  fields: string[];
  rows: Array<Record<string, unknown>>;
}

function CupertinoResultTable({ fields, rows }: CupertinoResultTableProps): JSX.Element {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">No rows returned.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-slate-900">
        <thead className="bg-gray-50">
          <tr>
            {fields.map((field) => (
              <th
                key={field}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500"
              >
                {field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => (
            <tr key={idx}>
              {fields.map((field) => (
                <td key={field} className="whitespace-nowrap px-4 py-3">
                  {formatCupertinoCell(row[field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCupertinoCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface CupertinoInsightsPanelProps {
  insights: InsightsPayload | null;
  loading: boolean;
}

function CupertinoInsightsPanel({ insights, loading }: CupertinoInsightsPanelProps): JSX.Element {
  if (loading) {
    return (
      <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-2xl shadow-black/5">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="h-64 rounded-3xl bg-gray-100" />
        </div>
      </section>
    );
  }

  if (!insights) return <></>;

  const monthlyRevenue = insights.monthlyRevenue.map((entry) => ({
    month: entry.month,
    revenue: Number(entry.revenue_gbp)
  }));

  const topStores = insights.topStores.map((entry) => ({
    store_name: entry.store_name,
    revenue: Number(entry.revenue_gbp)
  }));

  return (
    <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-2xl shadow-black/5">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Performance Pulse
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">Key Metrics Overview</h3>
      </header>
      <div className="space-y-6">
        <div className="h-64 rounded-3xl border border-gray-200 bg-gray-50 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 12 }} />
              <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#cbd5f5" }} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#0f172a"
                strokeWidth={2.5}
                dot={{ r: 3, stroke: "#64748b", strokeWidth: 1.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topStores} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="store_name"
                tick={{ fill: "#475569", fontSize: 12 }}
                angle={-15}
                height={60}
              />
              <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#cbd5f5" }} />
              <Bar dataKey="revenue" fill="#475569" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

interface TableGroup {
  key: string;
  schema: string;
  name: string;
  columns: SchemaColumn[];
}

function groupColumnsByTable(columns: SchemaColumn[]): TableGroup[] {
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

