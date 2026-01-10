import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { InsightsPayload } from "../lib/api";

const ACCENT_COLORS = ["#6366F1", "#EC4899", "#F59E0B", "#10B981", "#0EA5E9"];

interface InsightsPanelProps {
  insights: InsightsPayload | null;
  loading: boolean;
}

export function InsightsPanel({ insights, loading }: InsightsPanelProps): JSX.Element {
  if (loading) {
    return (
      <section className="rounded-3xl bg-white/10 p-6 shadow-2xl shadow-indigo-500/20 backdrop-blur">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-white/40" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl bg-white/20" />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-white/20" />
        </div>
      </section>
    );
  }

  if (!insights) return <></>;

  const monthlyRevenue = insights.monthlyRevenue.map((entry) => ({
    month: entry.month,
    revenue: Number(entry.revenue_gbp)
  }));

  const channelRevenue = insights.revenueByChannel.map((entry, idx) => ({
    channel: entry.channel,
    revenue: Number(entry.revenue_gbp),
    fill: ACCENT_COLORS[idx % ACCENT_COLORS.length]
  }));

  const categoryRevenue = insights.categoryPerformance.map((entry, idx) => ({
    category: entry.category,
    revenue: Number(entry.revenue_gbp),
    fill: ACCENT_COLORS[(idx + 2) % ACCENT_COLORS.length]
  }));

  const topStores = insights.topStores.map((entry) => ({
    store_name: entry.store_name,
    revenue: Number(entry.revenue_gbp),
    orders: Number(entry.orders)
  }));

  const totalRevenue = monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
  const latestMonth = monthlyRevenue[monthlyRevenue.length - 1];
  const previousMonth = monthlyRevenue[monthlyRevenue.length - 2];
  const monthGrowth =
    latestMonth && previousMonth
      ? ((latestMonth.revenue - previousMonth.revenue) / (previousMonth.revenue || 1)) * 100
      : null;

  const avgOrderValue =
    totalRevenue / (topStores.reduce((sum, store) => sum + store.orders, 0) || 1);

  return (
    <section className="rounded-3xl bg-white/10 p-6 shadow-2xl shadow-indigo-500/20 backdrop-blur">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Live Restaurant Insights</h2>
          <p className="text-sm text-white/70">
            Aggregations from the `sale` schema: revenue trends, channel mix, and top-performing
            concepts.
          </p>
        </div>
      </header>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <InsightStat
          title="Total Revenue"
          value={`£${totalRevenue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`}
          helper={monthGrowth === null ? "" : formatGrowth(monthGrowth)}
        />
        <InsightStat
          title="Top Channel"
          value={channelRevenue[0]?.channel ?? "—"}
          helper={
            channelRevenue[0]
              ? `£${channelRevenue[0].revenue.toLocaleString(undefined, {
                  maximumFractionDigits: 0
                })}`
              : ""
          }
        />
        <InsightStat
          title="Avg. Order Value"
          value={`£${avgOrderValue.toFixed(2)}`}
          helper={`${topStores.reduce((sum, store) => sum + store.orders, 0)} orders`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
            Monthly Revenue
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "0.75rem" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#38bdf8"
                  fill="url(#gradientRevenue)"
                  strokeWidth={3}
                  dot={{ stroke: "#0ea5e9", strokeWidth: 2, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
            Revenue by Channel
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelRevenue} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.6)" />
                <YAxis dataKey="channel" type="category" stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "0.75rem" }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[0, 12, 12, 0]}>
                  {channelRevenue.map((entry) => (
                    <Cell key={entry.channel} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-3xl bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
            Revenue by Category
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRevenue} margin={{ bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="category"
                  stroke="rgba(255,255,255,0.6)"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "0.75rem" }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Revenue"]}
                />
                <Legend />
                <Bar dataKey="revenue" radius={[12, 12, 0, 0]}>
                  {categoryRevenue.map((entry) => (
                    <Cell key={entry.category} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
            Top Performing Stores
          </h3>
          <ul className="space-y-4">
            {topStores.map((store, index) => (
              <li
                key={store.store_name}
                className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-white"
              >
                <div>
                  <p className="font-semibold">{store.store_name}</p>
                  <p className="text-xs text-white/60">{store.orders} orders</p>
                </div>
                <span className="text-base font-semibold text-sky-200">
                  £{store.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface InsightStatProps {
  title: string;
  value: string;
  helper?: string;
}

function InsightStat({ title, value, helper }: InsightStatProps): JSX.Element {
  return (
    <div className="rounded-3xl bg-white/5 p-4 text-white shadow-lg shadow-indigo-900/30">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs text-white/60">{helper}</p> : null}
    </div>
  );
}

function formatGrowth(value: number): string {
  const rounded = value.toFixed(1);
  const arrow = value >= 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(Number(rounded)).toFixed(1)}% vs prev. month`;
}

