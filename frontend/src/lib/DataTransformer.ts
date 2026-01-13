import type { ChartType } from "./chartConfig";
import { analyzeFields } from "./ChartDetector";

export interface ChartData {
  type: ChartType;
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  yAxisKeys: string[];
  labels?: Record<string, string>;
}

/**
 * Transforms query result data into chart-friendly format
 */
export function transformDataForChart(
  fields: string[],
  rows: Array<Record<string, unknown>>,
  chartType: ChartType
): ChartData | null {
  if (chartType === "none" || !rows.length) {
    return null;
  }

  const analysis = analyzeFields(fields, rows);

  switch (chartType) {
    case "line":
    case "area": {
      // Time series: time field on X, numeric on Y
      const timeField = analysis.timeFields[0] || fields[0];
      const numericFields = analysis.numericFields;
      
      return {
        type: chartType,
        data: rows.map((row) => {
          const transformed: Record<string, unknown> = {};
          transformed[timeField] = row[timeField];
          numericFields.forEach((field) => {
            transformed[field] = typeof row[field] === "number" ? row[field] : Number(row[field]) || 0;
          });
          return transformed;
        }),
        xAxisKey: timeField,
        yAxisKeys: numericFields
      };
    }

    case "bar": {
      // Categorical on X, numeric on Y
      const categoricalField = analysis.categoricalFields[0] || fields[0];
      const numericFields = analysis.numericFields.length > 0 
        ? analysis.numericFields 
        : fields.filter((f) => f !== categoricalField);

      return {
        type: chartType,
        data: rows.map((row) => {
          const transformed: Record<string, unknown> = {};
          transformed[categoricalField] = row[categoricalField];
          numericFields.forEach((field) => {
            transformed[field] = typeof row[field] === "number" ? row[field] : Number(row[field]) || 0;
          });
          return transformed;
        }),
        xAxisKey: categoricalField,
        yAxisKeys: numericFields
      };
    }

    case "pie": {
      // Categorical + single numeric
      const categoricalField = analysis.categoricalFields[0] || fields[0];
      const numericField = analysis.numericFields[0] || fields[1];

      return {
        type: chartType,
        data: rows.map((row) => ({
          name: String(row[categoricalField] || ""),
          value: typeof row[numericField] === "number" ? row[numericField] : Number(row[numericField]) || 0
        })),
        xAxisKey: "name",
        yAxisKeys: ["value"]
      };
    }

    case "scatter": {
      // Two numeric fields
      const [xField, yField] = analysis.numericFields;

      return {
        type: chartType,
        data: rows.map((row) => ({
          x: typeof row[xField] === "number" ? row[xField] : Number(row[xField]) || 0,
          y: typeof row[yField] === "number" ? row[yField] : Number(row[yField]) || 0
        })),
        xAxisKey: "x",
        yAxisKeys: ["y"]
      };
    }

    default:
      return null;
  }
}
