/**
 * Utility functions for formatting chart values, labels, and titles
 */

/**
 * Detects if a field name suggests currency formatting
 */
export function isCurrencyField(fieldName: string): boolean {
  const currencyPatterns = [
    /revenue/i,
    /price/i,
    /cost/i,
    /amount/i,
    /total/i,
    /sum/i,
    /value/i,
    /gbp/i,
    /usd/i,
    /eur/i,
    /money/i,
    /payment/i,
    /fee/i,
    /charge/i
  ];
  return currencyPatterns.some((pattern) => pattern.test(fieldName));
}

/**
 * Detects if a field name suggests percentage formatting
 */
export function isPercentageField(fieldName: string): boolean {
  const percentagePatterns = [
    /percent/i,
    /percentage/i,
    /pct/i,
    /ratio/i,
    /share/i,
    /portion/i
  ];
  return percentagePatterns.some((pattern) => pattern.test(fieldName));
}

/**
 * Detects if a field name suggests count formatting
 */
export function isCountField(fieldName: string): boolean {
  const countPatterns = [
    /count/i,
    /quantity/i,
    /qty/i,
    /number/i,
    /num/i,
    /orders/i,
    /items/i,
    /units/i
  ];
  return countPatterns.some((pattern) => pattern.test(fieldName));
}

/**
 * Formats a number as currency (GBP by default)
 */
export function formatCurrency(value: number, currency: string = "£"): string {
  if (isNaN(value) || !isFinite(value)) return "—";
  
  // For very large numbers, use compact notation
  if (Math.abs(value) >= 1000000) {
    return `${currency}${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${currency}${(value / 1000).toFixed(1)}K`;
  }
  
  return `${currency}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (isNaN(value) || !isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a number in compact notation (1K, 1M, etc.)
 */
export function formatCompactNumber(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "—";
  
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
}

/**
 * Formats a value based on field name and context
 */
export function formatValue(value: number, fieldName: string): string {
  if (isNaN(value) || !isFinite(value)) return "—";
  
  if (isCurrencyField(fieldName)) {
    return formatCurrency(value);
  }
  
  if (isPercentageField(fieldName)) {
    return formatPercentage(value);
  }
  
  // For large numbers, use compact notation
  if (Math.abs(value) >= 1000) {
    return formatCompactNumber(value);
  }
  
  // Default: format with appropriate decimals
  if (value % 1 === 0) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Formats a value for axis labels (more compact)
 */
export function formatAxisValue(value: number | string, fieldName?: string): string {
  if (typeof value === "string") return value;
  
  if (isNaN(value) || !isFinite(value)) return "";
  
  if (isCurrencyField(fieldName || "")) {
    if (Math.abs(value) >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `£${(value / 1000).toFixed(0)}K`;
    }
    return `£${value.toFixed(0)}`;
  }
  
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Formats a field name for display (human-readable label)
 */
export function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Gbp/gi, "GBP")
    .replace(/Id/gi, "ID")
    .replace(/Avg/gi, "Average")
    .replace(/Cnt/gi, "Count")
    .replace(/Qty/gi, "Quantity");
}

/**
 * Generates a chart title based on chart type and data structure
 */
export function generateChartTitle(
  chartType: string,
  xAxisKey: string,
  yAxisKeys: string[],
  dataLength: number
): string {
  const xLabel = formatFieldLabel(xAxisKey);
  const yLabel = yAxisKeys.length === 1 
    ? formatFieldLabel(yAxisKeys[0])
    : `${yAxisKeys.length} Metrics`;
  
  switch (chartType) {
    case "line":
      return `${yLabel} Over Time`;
    case "area":
      return `${yLabel} Over Time`;
    case "bar":
      if (yAxisKeys.length === 1) {
        return `${yLabel} by ${xLabel}`;
      }
      return `Comparison by ${xLabel}`;
    case "pie":
      return `Distribution of ${yLabel}`;
    case "scatter":
      return `${formatFieldLabel(yAxisKeys[0])} vs ${formatFieldLabel(yAxisKeys[1] || "X")}`;
    default:
      return "Chart Visualization";
  }
}

/**
 * Calculates summary statistics from chart data
 */
export function calculateStats(
  data: Array<Record<string, unknown>>,
  yAxisKeys: string[]
): {
  total: number;
  average: number;
  max: number;
  min: number;
} {
  if (!data.length || !yAxisKeys.length) {
    return { total: 0, average: 0, max: 0, min: 0 };
  }
  
  const values: number[] = [];
  data.forEach((row) => {
    yAxisKeys.forEach((key) => {
      const val = typeof row[key] === "number" ? row[key] : Number(row[key]) || 0;
      if (!isNaN(val) && isFinite(val)) {
        values.push(val);
      }
    });
  });
  
  if (values.length === 0) {
    return { total: 0, average: 0, max: 0, min: 0 };
  }
  
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = total / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  return { total, average, max, min };
}
