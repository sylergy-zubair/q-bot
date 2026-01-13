import axios, { isAxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

export interface SchemaColumn {
  tableSchema: string;
  tableName: string;
  columnName: string;
  dataType: string;
}

export interface SchemaSample {
  tableSchema: string;
  tableName: string;
  rows: Array<Record<string, unknown>>;
}

export interface SchemaResponse {
  columns: SchemaColumn[];
  samples: SchemaSample[];
}

export interface InsightSummary {
  summary: string;
  keyMetrics: Array<{
    label: string;
    value: string;
    trend?: string;
  }>;
  insights: string[];
}

export interface QueryResultPayload {
  sql: string;
  warnings?: string[];
  result: {
    rowCount: number;
    fields: string[];
    rows: Array<Record<string, unknown>>;
  };
  insights?: InsightSummary;
}

export interface InsightsPayload {
  revenueByChannel: Array<{ channel: string; revenue_gbp: string }>;
  categoryPerformance: Array<{ category: string; revenue_gbp: string }>;
  monthlyRevenue: Array<{ month: string; revenue_gbp: string }>;
  topStores: Array<{ store_name: string; revenue_gbp: string; orders: number }>;
}

export async function fetchSchema(): Promise<SchemaResponse> {
  const response = await api.get<SchemaResponse>("/schema");
  return response.data;
}

export async function runNaturalLanguageQuery(question: string): Promise<QueryResultPayload> {
  try {
    const response = await api.post<QueryResultPayload>("/nl-query", { question });
    return response.data;
  } catch (error) {
    // Extract error message from API response
    if (isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data as { message?: string; error?: string };
      const errorMessage = errorData.message || errorData.error || error.message;
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function fetchInsights(): Promise<InsightsPayload> {
  const response = await api.get<InsightsPayload>("/insights");
  return response.data;
}

