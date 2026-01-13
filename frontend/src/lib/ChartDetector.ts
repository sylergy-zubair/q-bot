import type { ChartType } from "./chartConfig";

export interface FieldAnalysis {
  timeFields: string[];
  numericFields: string[];
  categoricalFields: string[];
}

/**
 * Analyzes fields to determine their types
 */
export function analyzeFields(
  fields: string[],
  rows: Array<Record<string, unknown>>
): FieldAnalysis {
  const timeFields: string[] = [];
  const numericFields: string[] = [];
  const categoricalFields: string[] = [];

  for (const field of fields) {
    // Check if field name suggests time/date
    const isTimeField = /date|month|year|week|time|timestamp|dt|day/i.test(field);

    // Check actual data types
    const sampleValues = rows.slice(0, Math.min(10, rows.length)).map((r) => r[field]);
    
    // Enhanced numeric detection: handles both numbers and numeric strings from PostgreSQL
    const hasNumeric = sampleValues.some((v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "number") return !isNaN(v) && isFinite(v);
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed === "") return false;
        const parsed = Number(trimmed);
        return !isNaN(parsed) && isFinite(parsed);
      }
      return false;
    });
    
    const hasString = sampleValues.some((v) => typeof v === "string");

    if (isTimeField) {
      timeFields.push(field);
    } else if (hasNumeric) {
      numericFields.push(field);
    } else if (hasString || !hasNumeric) {
      categoricalFields.push(field);
    }
  }

  return { timeFields, numericFields, categoricalFields };
}

/**
 * Detects the most appropriate chart type based on query result structure
 */
export function detectChartType(
  fields: string[],
  rows: Array<Record<string, unknown>>
): ChartType {
  if (!fields.length || !rows.length) {
    return "none";
  }

  const analysis = analyzeFields(fields, rows);

  // Rule 1: Time Series (Line Chart)
  // Time field + single numeric field
  if (analysis.timeFields.length > 0 && analysis.numericFields.length === 1) {
    return "line";
  }

  // Rule 2: Multi-Series Time Series (Area Chart)
  // Time field + multiple numeric fields
  if (analysis.timeFields.length > 0 && analysis.numericFields.length > 1) {
    return "area";
  }

  // Rule 3: Distribution/Pie Chart
  // Single categorical + single numeric, limited categories (2-10), percentage-like question
  if (
    analysis.categoricalFields.length === 1 &&
    analysis.numericFields.length === 1 &&
    rows.length >= 2 &&
    rows.length <= 10
  ) {
    // Check if numeric values look like percentages or parts of a whole
    const numericField = analysis.numericFields[0];
    const total = rows.reduce((sum, row) => {
      const val = Number(row[numericField]);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    // If values sum to something reasonable (not too large), consider pie chart
    if (total > 0 && total < 1000000) {
      return "pie";
    }
  }

  // Rule 4: Categorical Comparison (Bar Chart)
  // Single categorical + one or more numeric fields
  if (analysis.categoricalFields.length === 1 && analysis.numericFields.length >= 1) {
    return "bar";
  }

  // Rule 5: Multi-Series Bar
  // Categorical + multiple numeric fields
  if (analysis.categoricalFields.length === 1 && analysis.numericFields.length > 1) {
    return "bar";
  }

  // Rule 6: Scatter Plot
  // Two numeric fields, correlation question
  if (analysis.numericFields.length === 2 && analysis.categoricalFields.length === 0) {
    return "scatter";
  }

  // Rule 7: Default fallback
  // If we have 2 columns (1 categorical, 1 numeric) but many rows, use bar
  if (fields.length === 2 && analysis.categoricalFields.length === 1 && analysis.numericFields.length === 1) {
    return "bar";
  }

  return "none";
}

/**
 * Checks if chart can be rendered for the given data
 */
export function canRenderChart(fields: string[], rows: Array<Record<string, unknown>>): boolean {
  return detectChartType(fields, rows) !== "none";
}
