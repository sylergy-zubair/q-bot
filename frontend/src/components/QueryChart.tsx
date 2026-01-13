import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

  switch (chartType) {
    case "line":
      return renderLineChart(chartData, config, height);
    case "area":
      return renderAreaChart(chartData, config, height);
    case "bar":
      return renderBarChart(chartData, config, height);
    case "pie":
      return renderPieChart(chartData, config, height);
    case "scatter":
      return renderScatterChart(chartData, config, height);
    default:
      return <></>;
  }
}

function renderLineChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number
): JSX.Element {
  if (!chartData) return <></>;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData.data}>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} />
          <XAxis dataKey={chartData.xAxisKey} stroke={config.textColor} />
          <YAxis stroke={config.textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          />
          <Legend />
          {chartData.yAxisKeys.map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={config.accentColors[idx % config.accentColors.length]}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderAreaChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number
): JSX.Element {
  if (!chartData) return <></>;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData.data}>
          <defs>
            {chartData.yAxisKeys.map((key, idx) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={config.accentColors[idx % config.accentColors.length]}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={config.accentColors[idx % config.accentColors.length]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} />
          <XAxis dataKey={chartData.xAxisKey} stroke={config.textColor} />
          <YAxis stroke={config.textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          />
          <Legend />
          {chartData.yAxisKeys.map((key, idx) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={config.accentColors[idx % config.accentColors.length]}
              fill={`url(#gradient-${key})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderBarChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number
): JSX.Element {
  if (!chartData) return <></>;

  const hasMultipleSeries = chartData.yAxisKeys.length > 1;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData.data} margin={{ bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} />
          <XAxis
            dataKey={chartData.xAxisKey}
            stroke={config.textColor}
            angle={-15}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke={config.textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          />
          {hasMultipleSeries && <Legend />}
          {chartData.yAxisKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={config.accentColors[idx % config.accentColors.length]}
              radius={[12, 12, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderPieChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number
): JSX.Element {
  if (!chartData) return <></>;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={Math.min(height * 0.35, 150)}
            label={(entry) => `${entry.name}: ${entry.value}`}
          >
            {chartData.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={config.accentColors[index % config.accentColors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderScatterChart(
  chartData: ReturnType<typeof transformDataForChart>,
  config: typeof chartConfig.aurora,
  height: number
): JSX.Element {
  if (!chartData) return <></>;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke={config.gridColor} />
          <XAxis dataKey="x" stroke={config.textColor} />
          <YAxis dataKey="y" stroke={config.textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: config.tooltipBg,
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          />
          <Scatter data={chartData.data} fill={config.accentColors[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
