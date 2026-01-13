export type ViewMode = "table" | "chart" | "both";

interface ViewToggleProps {
  mode: ViewMode;
  onToggle: (mode: ViewMode) => void;
  hasChart: boolean;
  theme?: "aurora" | "cupertino";
}

export function ViewToggle({ mode, onToggle, hasChart, theme = "aurora" }: ViewToggleProps): JSX.Element {
  if (!hasChart) {
    return <></>;
  }

  const isAurora = theme === "aurora";

  const baseButtonClass = isAurora
    ? "px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition rounded-lg"
    : "px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition rounded-lg";

  const activeClass = isAurora
    ? "bg-white/20 text-white border border-white/30"
    : "bg-slate-900 text-white border border-slate-900";

  const inactiveClass = isAurora
    ? "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
    : "bg-white text-slate-600 border border-gray-300 hover:bg-gray-50 hover:text-slate-900";

  return (
    <div className={`flex gap-2 ${isAurora ? "mb-4" : "mb-4"}`}>
      <button
        type="button"
        onClick={() => onToggle("table")}
        className={`${baseButtonClass} ${mode === "table" ? activeClass : inactiveClass}`}
      >
        📊 Table
      </button>
      <button
        type="button"
        onClick={() => onToggle("chart")}
        className={`${baseButtonClass} ${mode === "chart" ? activeClass : inactiveClass}`}
      >
        📈 Chart
      </button>
      <button
        type="button"
        onClick={() => onToggle("both")}
        className={`${baseButtonClass} ${mode === "both" ? activeClass : inactiveClass}`}
      >
        📊📈 Both
      </button>
    </div>
  );
}
