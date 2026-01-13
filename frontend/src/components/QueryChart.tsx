import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { detectChartType } from "../lib/ChartDetector";
import { transformDataForChart } from "../lib/DataTransformer";
import { chartConfig, type ThemeMode } from "../lib/chartConfig";
import {
  formatValue,
  formatAxisValue,
  formatFieldLabel,
  generateChartTitle,
  calculateStats,
  formatPercentage,
  formatCompactNumber
} from "../lib/chartFormatters";

interface QueryChartProps {
  fields: string[];
  rows: Array<Record<string, unknown>>;
  theme: ThemeMode;
  height?: number;
}

export function QueryChart({ fields, rows, theme, height = 400 }: QueryChartProps): JSX.Element {
  const chartType = detectChartType(fields, rows);
  const chartData = transformDataForChart(fields, rows, chartType);

  if (!chartData || chartType === "none") {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-dashed border-white/20 p-8 text-sm text-white/60">
        Chart visualization not available for this query result.
      </div>
    );
  }

  const config = chartConfig[theme];
  const chartTitle = generateChartTitle(
    chartType,
    chartData.xAxisKey,
    chartData.yAxisKeys,
    chartData.data.length
  );
  const stats = calculateStats(chartData.data, chartData.yAxisKeys);

  switch (chartType) {
    case "line":
      return renderLineChart(chartData, config, height, chartTitle, stats, theme);
    case "area":
      return renderAreaChart(chartData, config, height, chartTitle, stats, theme);
    case "bar":
      return renderBarChart(chartData, config, height, chartTitle, stats, theme);
    case "pie":
      return renderPieChart(chartData, config, height, chartTitle, stats, theme);
    case "scatter":
      return renderScatterChart(chartData, config, height, chartTitle, stats, theme);
    default:
      return <></>;
  }
}

function renderLineChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number,
  title: string,
  stats: ReturnType<typeof calculateStats>,
  theme: ThemeMode
): JSX.Element {
  if (!chartData) return <></>;

  const fontSize = height > 300 ? 12 : 10;
  const primaryKey = chartData.yAxisKeys[0];

  const containerClass = theme === "aurora" 
    ? "rounded-3xl border border-white/10 bg-white/5 p-4"
    : "rounded-3xl border border-gray-200 bg-white p-4 shadow-sm";

  return (
    <div className={containerClass}>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-widest ${theme === "aurora" ? "text-white/70" : "text-slate-600"}`}>
        {title}
      </h3>
      <SummaryStats stats={stats} primaryKey={primaryKey} config={config} theme={theme} />
      <ResponsiveContainer width="100%" height={height - 100}>
        <LineChart data={chartData.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} opacity={0.3} />
          <XAxis
            dataKey={chartData.xAxisKey}
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            tickFormatter={(value) => formatAxisValue(value, chartData.xAxisKey)}
          >
            <Label
              value={formatFieldLabel(chartData.xAxisKey)}
              position="insideBottom"
              offset={-5}
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </XAxis>
          <YAxis
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            tickFormatter={(value) => formatAxisValue(value, primaryKey)}
          >
            <Label
              value={formatFieldLabel(primaryKey)}
              angle={-90}
              position="insideLeft"
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </YAxis>
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: `1px solid ${config.textColor}20`,
              padding: "12px"
            }}
            labelStyle={{ color: config.textColor, fontWeight: 600, marginBottom: "4px" }}
            formatter={(value: number, name: string) => [
              formatValue(value, name),
              formatFieldLabel(name)
            ]}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            iconType="line"
            formatter={(value) => (
              <span style={{ color: config.textColor, fontSize: fontSize - 1 }}>
                {formatFieldLabel(value)}
              </span>
            )}
          />
          {chartData.yAxisKeys.map((key, idx) => {
            const color = config.accentColors[idx % config.accentColors.length];
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={3}
                dot={{ r: 5, fill: color, strokeWidth: 2, stroke: config.tooltipBg }}
                activeDot={{ r: 7, fill: color, strokeWidth: 3, stroke: config.tooltipBg }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderAreaChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number,
  title: string,
  stats: ReturnType<typeof calculateStats>,
  theme: ThemeMode
): JSX.Element {
  if (!chartData) return <></>;

  const fontSize = height > 300 ? 12 : 10;
  const primaryKey = chartData.yAxisKeys[0];

  const containerClass = theme === "aurora" 
    ? "rounded-3xl border border-white/10 bg-white/5 p-4"
    : "rounded-3xl border border-gray-200 bg-white p-4 shadow-sm";

  return (
    <div className={containerClass}>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-widest ${theme === "aurora" ? "text-white/70" : "text-slate-600"}`}>
        {title}
      </h3>
      <SummaryStats stats={stats} primaryKey={primaryKey} config={config} theme={theme} />
      <ResponsiveContainer width="100%" height={height - 100}>
        <AreaChart data={chartData.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            {chartData.yAxisKeys.map((key, idx) => {
              const color = config.accentColors[idx % config.accentColors.length];
              return (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} opacity={0.3} />
          <XAxis
            dataKey={chartData.xAxisKey}
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            tickFormatter={(value) => formatAxisValue(value, chartData.xAxisKey)}
          >
            <Label
              value={formatFieldLabel(chartData.xAxisKey)}
              position="insideBottom"
              offset={-5}
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </XAxis>
          <YAxis
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            tickFormatter={(value) => formatAxisValue(value, primaryKey)}
          >
            <Label
              value={formatFieldLabel(primaryKey)}
              angle={-90}
              position="insideLeft"
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </YAxis>
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: `1px solid ${config.textColor}20`,
              padding: "12px"
            }}
            labelStyle={{ color: config.textColor, fontWeight: 600, marginBottom: "4px" }}
            formatter={(value: number, name: string) => [
              formatValue(value, name),
              formatFieldLabel(name)
            ]}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            iconType="square"
            formatter={(value) => (
              <span style={{ color: config.textColor, fontSize: fontSize - 1 }}>
                {formatFieldLabel(value)}
              </span>
            )}
          />
          {chartData.yAxisKeys.map((key, idx) => {
            const color = config.accentColors[idx % config.accentColors.length];
            return (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                fill={`url(#gradient-${key})`}
                strokeWidth={2.5}
                dot={{ r: 4, fill: color, strokeWidth: 2, stroke: config.tooltipBg }}
                activeDot={{ r: 6, fill: color, strokeWidth: 3, stroke: config.tooltipBg }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderBarChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number,
  title: string,
  stats: ReturnType<typeof calculateStats>,
  theme: ThemeMode
): JSX.Element {
  if (!chartData) return <></>;

  const hasMultipleSeries = chartData.yAxisKeys.length > 1;
  const fontSize = height > 300 ? 12 : 10;
  const primaryKey = chartData.yAxisKeys[0];
  const showLabels = chartData.data.length <= 15; // Only show labels if not too many bars

  const containerClass = theme === "aurora" 
    ? "rounded-3xl border border-white/10 bg-white/5 p-4"
    : "rounded-3xl border border-gray-200 bg-white p-4 shadow-sm";

  return (
    <div className={containerClass}>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-widest ${theme === "aurora" ? "text-white/70" : "text-slate-600"}`}>
        {title}
      </h3>
      <SummaryStats stats={stats} primaryKey={primaryKey} config={config} theme={theme} />
      <ResponsiveContainer width="100%" height={height - 100}>
        <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} opacity={0.3} />
          <XAxis
            dataKey={chartData.xAxisKey}
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            angle={-15}
            textAnchor="end"
            height={60}
            tickFormatter={(value) => {
              const str = String(value);
              return str.length > 15 ? str.substring(0, 12) + "..." : str;
            }}
          >
            <Label
              value={formatFieldLabel(chartData.xAxisKey)}
              position="insideBottom"
              offset={-5}
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </XAxis>
          <YAxis
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            tickFormatter={(value) => formatAxisValue(value, primaryKey)}
          >
            <Label
              value={formatFieldLabel(primaryKey)}
              angle={-90}
              position="insideLeft"
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </YAxis>
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: `1px solid ${config.textColor}20`,
              padding: "12px"
            }}
            labelStyle={{ color: config.textColor, fontWeight: 600, marginBottom: "4px" }}
            formatter={(value: number, name: string) => [
              formatValue(value, name),
              formatFieldLabel(name)
            ]}
          />
          {hasMultipleSeries && (
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              iconType="square"
              formatter={(value) => (
                <span style={{ color: config.textColor, fontSize: fontSize - 1 }}>
                  {formatFieldLabel(value)}
                </span>
              )}
            />
          )}
          {chartData.yAxisKeys.map((key, idx) => {
            const color = config.accentColors[idx % config.accentColors.length];
            return (
              <Bar key={key} dataKey={key} fill={color} radius={[12, 12, 0, 0]}>
                {showLabels && (
                  <LabelList
                    dataKey={key}
                    position="top"
                    formatter={(value: number) => {
                      // Use compact format for labels to avoid clutter
                      if (Math.abs(value) >= 1000000) {
                        return `${(value / 1000000).toFixed(1)}M`;
                      }
                      if (Math.abs(value) >= 1000) {
                        return `${(value / 1000).toFixed(1)}K`;
                      }
                      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
                    }}
                    style={{
                      fill: config.textColor,
                      fontSize: fontSize - 2,
                      fontWeight: 500
                    }}
                  />
                )}
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderPieChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number,
  title: string,
  stats: ReturnType<typeof calculateStats>,
  theme: ThemeMode
): JSX.Element {
  if (!chartData) return <></>;

  const fontSize = height > 300 ? 12 : 10;
  const total = chartData.data.reduce((sum, entry) => sum + (entry.value as number), 0);

  const containerClass = theme === "aurora" 
    ? "rounded-3xl border border-white/10 bg-white/5 p-4"
    : "rounded-3xl border border-gray-200 bg-white p-4 shadow-sm";

  return (
    <div className={containerClass}>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-widest ${theme === "aurora" ? "text-white/70" : "text-slate-600"}`}>
        {title}
      </h3>
      <SummaryStats stats={stats} primaryKey="value" config={config} theme={theme} />
      <ResponsiveContainer width="100%" height={height - 100}>
        <PieChart>
          <Pie
            data={chartData.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={Math.min(height * 0.3, 140)}
            label={(entry) => {
              const percent = ((entry.value as number) / total) * 100;
              return `${entry.name}: ${formatPercentage(percent)}`;
            }}
            labelLine={false}
          >
            {chartData.data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={config.accentColors[index % config.accentColors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: `1px solid ${config.textColor}20`,
              padding: "12px"
            }}
            labelStyle={{ color: config.textColor, fontWeight: 600, marginBottom: "4px" }}
            formatter={(value: number, name: string) => {
              const percent = (value / total) * 100;
              return [
                `${formatValue(value, "value")} (${formatPercentage(percent)})`,
                name
              ];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            iconType="circle"
            formatter={(value) => {
              const entry = chartData.data.find((d) => d.name === value);
              const percent = entry
                ? formatPercentage(((entry.value as number) / total) * 100)
                : "";
              return (
                <span style={{ color: config.textColor, fontSize: fontSize - 1 }}>
                  {value} ({percent})
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderScatterChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number,
  title: string,
  stats: ReturnType<typeof calculateStats>,
  theme: ThemeMode
): JSX.Element {
  if (!chartData) return <></>;

  const fontSize = height > 300 ? 12 : 10;
  const xKey = chartData.yAxisKeys[0] || "x";
  const yKey = chartData.yAxisKeys[1] || "y";

  const containerClass = theme === "aurora" 
    ? "rounded-3xl border border-white/10 bg-white/5 p-4"
    : "rounded-3xl border border-gray-200 bg-white p-4 shadow-sm";

  return (
    <div className={containerClass}>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-widest ${theme === "aurora" ? "text-white/70" : "text-slate-600"}`}>
        {title}
      </h3>
      <SummaryStats stats={stats} primaryKey={yKey} config={config} theme={theme} />
      <ResponsiveContainer width="100%" height={height - 100}>
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} opacity={0.3} />
          <XAxis
            dataKey="x"
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            tickFormatter={(value) => formatAxisValue(value, xKey)}
          >
            <Label
              value={formatFieldLabel(xKey)}
              position="insideBottom"
              offset={-5}
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </XAxis>
          <YAxis
            dataKey="y"
            stroke={config.textColor}
            tick={{ fill: config.textColor, fontSize }}
            tickFormatter={(value) => formatAxisValue(value, yKey)}
          >
            <Label
              value={formatFieldLabel(yKey)}
              angle={-90}
              position="insideLeft"
              style={{ fill: config.textColor, fontSize: fontSize - 1 }}
            />
          </YAxis>
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: `1px solid ${config.textColor}20`,
              padding: "12px"
            }}
            labelStyle={{ color: config.textColor, fontWeight: 600, marginBottom: "4px" }}
            formatter={(value: number, name: string) => [
              formatValue(value, name),
              formatFieldLabel(name)
            ]}
          />
          <Scatter
            data={chartData.data}
            fill={config.accentColors[0]}
            fillOpacity={0.7}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SummaryStatsProps {
  stats: ReturnType<typeof calculateStats>;
  primaryKey: string;
  config: typeof chartConfig.aurora;
  theme: ThemeMode;
}

function SummaryStats({ stats, primaryKey, config, theme }: SummaryStatsProps): JSX.Element {
  const isAurora = theme === "aurora";
  const bgClass = isAurora ? "bg-white/5" : "bg-gray-50";
  const textClass = isAurora ? "text-white" : "text-slate-900";
  const labelClass = isAurora ? "text-white/60" : "text-slate-500";
  const borderClass = isAurora ? "border-white/10" : "border-gray-200";

  return (
    <div className="mb-4 grid grid-cols-3 gap-3">
      <div className={`rounded-2xl ${bgClass} ${borderClass} border p-3 text-center shadow-lg`}>
        <p className={`text-xs font-semibold uppercase tracking-widest ${labelClass}`}>Total</p>
        <p className={`mt-1 text-lg font-semibold ${textClass}`}>
          {formatValue(stats.total, primaryKey)}
        </p>
      </div>
      <div className={`rounded-2xl ${bgClass} ${borderClass} border p-3 text-center shadow-lg`}>
        <p className={`text-xs font-semibold uppercase tracking-widest ${labelClass}`}>Average</p>
        <p className={`mt-1 text-lg font-semibold ${textClass}`}>
          {formatValue(stats.average, primaryKey)}
        </p>
      </div>
      <div className={`rounded-2xl ${bgClass} ${borderClass} border p-3 text-center shadow-lg`}>
        <p className={`text-xs font-semibold uppercase tracking-widest ${labelClass}`}>Maximum</p>
        <p className={`mt-1 text-lg font-semibold ${textClass}`}>
          {formatValue(stats.max, primaryKey)}
        </p>
      </div>
    </div>
  );
}
