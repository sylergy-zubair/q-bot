import type { InsightSummary } from "../lib/api";

interface ResultSummaryProps {
  insights: InsightSummary;
  theme?: "aurora" | "cupertino";
}

export function ResultSummary({
  insights,
  theme = "aurora"
}: ResultSummaryProps): JSX.Element {
  if (theme === "aurora") {
    return <AuroraSummary insights={insights} />;
  }
  return <CupertinoSummary insights={insights} />;
}

function AuroraSummary({ insights }: { insights: InsightSummary }): JSX.Element {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-sky-500/10 backdrop-blur">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70 mb-2">
          Executive Summary
        </h3>
        <p className="text-base text-white/90 leading-relaxed">{insights.summary}</p>
      </div>

      {insights.keyMetrics.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {insights.keyMetrics.map((metric, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white/10 p-4 border border-white/20"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-1">
                {metric.label}
              </p>
              <p className="text-2xl font-semibold text-white mb-1">{metric.value}</p>
              {metric.trend && (
                <p className="text-xs text-white/70">{metric.trend}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {insights.insights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70 mb-2">
            Key Insights
          </h4>
          <ul className="space-y-2">
            {insights.insights.map((insight, idx) => (
              <li key={idx} className="flex items-start text-sm text-white/80">
                <span className="text-sky-400 mr-2 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CupertinoSummary({
  insights
}: {
  insights: InsightSummary;
}): JSX.Element {
  return (
    <div className="space-y-4 rounded-[32px] border border-gray-200 bg-white p-6 shadow-2xl shadow-black/5">
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-2">
          Executive Summary
        </h3>
        <p className="text-base text-slate-900 leading-relaxed">{insights.summary}</p>
      </div>

      {insights.keyMetrics.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {insights.keyMetrics.map((metric, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-gray-50 p-4 border border-gray-200"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">
                {metric.label}
              </p>
              <p className="text-2xl font-semibold text-slate-900 mb-1">
                {metric.value}
              </p>
              {metric.trend && (
                <p className="text-xs text-slate-600">{metric.trend}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {insights.insights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-2">
            Key Insights
          </h4>
          <ul className="space-y-2">
            {insights.insights.map((insight, idx) => (
              <li key={idx} className="flex items-start text-sm text-slate-700">
                <span className="text-slate-900 mr-2 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
