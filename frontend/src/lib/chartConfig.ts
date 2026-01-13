export type ChartType = "line" | "area" | "bar" | "pie" | "scatter" | "none";

export type ThemeMode = "aurora" | "cupertino";

export interface ChartConfig {
  gridColor: string;
  textColor: string;
  tooltipBg: string;
  accentColors: string[];
}

export const chartConfig: Record<ThemeMode, ChartConfig> = {
  aurora: {
    gridColor: "rgba(255,255,255,0.2)",
    textColor: "rgba(255,255,255,0.7)",
    tooltipBg: "#0f172a",
    accentColors: ["#38bdf8", "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"]
  },
  cupertino: {
    gridColor: "#e2e8f0",
    textColor: "#475569",
    tooltipBg: "#ffffff",
    accentColors: ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"]
  }
};
