import axios from "axios";
import { env } from "../env.js";

export interface QueryResult {
  fields: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

export interface InsightSummary {
  summary: string;
  keyMetrics: Array<{ label: string; value: string; trend?: string }>;
  insights: string[];
}

const headers: Record<string, string> = {
  Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json"
};

if (env.OPENROUTER_SITE_URL) {
  headers["HTTP-Referer"] = env.OPENROUTER_SITE_URL;
}

if (env.OPENROUTER_APP_NAME) {
  headers["X-Title"] = env.OPENROUTER_APP_NAME;
}

const client = axios.create({
  baseURL: env.OPENROUTER_API_URL,
  headers,
  timeout: 10_000 // 10 second timeout for insights
});

export async function generateInsights(
  question: string,
  result: QueryResult
): Promise<InsightSummary> {
  // Format data for prompt
  const dataPreview = result.rows.slice(0, 20).map((row) => {
    const formatted = result.fields.reduce((acc, field) => {
      const value = row[field];
      if (value === null || value === undefined) {
        acc[field] = "null";
      } else if (typeof value === "number") {
        // Format large numbers
        if (value >= 1000000) {
          acc[field] = `£${(value / 1000000).toFixed(2)}M`;
        } else if (value >= 1000) {
          acc[field] = `£${(value / 1000).toFixed(1)}K`;
        } else {
          acc[field] = value.toString();
        }
      } else if (value instanceof Date) {
        acc[field] = formatDate(value);
      } else {
        acc[field] = String(value);
      }
      return acc;
    }, {} as Record<string, string>);
    return formatted;
  });

  const systemPrompt = `You are a data analyst assistant that explains query results in plain, business-friendly language.

Scope and Boundaries:
You must ONLY analyze and provide insights about the query results provided to you. This system is designed to analyze data from the specific analytics database.
If asked about topics outside the scope of the provided query results (e.g., general knowledge, unrelated topics, or data not in the results), you must politely decline by responding with:
"I can only provide insights about the data from this query. Could you please ask a question about the available data?"

Your task is to:
1. Write a 2-3 sentence executive summary of the data
2. Extract 3-5 key metrics with formatted values
3. Identify 2-3 actionable insights or trends

Be concise, use natural language, and format numbers appropriately (e.g., "£2.1M" instead of "2085313.65").
Highlight trends, comparisons, and notable patterns.`;

  const userPrompt = `Original question: "${question}"

Query Results (${result.rowCount} rows):
${JSON.stringify(dataPreview, null, 2)}

Please provide:
1. A brief summary (2-3 sentences)
2. Key metrics (3-5 items with labels and formatted values)
3. Insights (2-3 bullet points about trends or patterns)

Format your response as JSON:
{
  "summary": "Brief explanation...",
  "keyMetrics": [
    {"label": "Metric name", "value": "Formatted value", "trend": "optional trend indicator"}
  ],
  "insights": ["Insight 1", "Insight 2"]
}`;

  try {
    const response = await client.post("", {
      model: env.OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const content = extractContent(response.data);
    const parsed = parseInsightResponse(content);

    return parsed;
  } catch (error) {
    console.error("Failed to generate insights", error);
    // Fallback to basic summary
    return generateFallbackInsights(result);
  }
}

function extractContent(data: any): string {
  const choice = data?.choices?.[0];
  const message = choice?.message;
  if (!message) return "";

  const content = message.content;
  if (typeof content === "string") {
    return content.trim();
  } else if (Array.isArray(content)) {
    return content
      .map((segment) => {
        if (typeof segment === "string") return segment;
        if (segment && typeof segment === "object" && "text" in segment) {
          return String(segment.text);
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function parseInsightResponse(content: string): InsightSummary {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    return {
      summary: parsed.summary || "Data retrieved successfully.",
      keyMetrics: Array.isArray(parsed.keyMetrics)
        ? parsed.keyMetrics.slice(0, 5)
        : [],
      insights: Array.isArray(parsed.insights)
        ? parsed.insights.slice(0, 3)
        : []
    };
  } catch (error) {
    console.error("Failed to parse insight response", error);
    // Fallback: extract summary from text
    const lines = content.split("\n").filter((l) => l.trim());
    return {
      summary: lines[0] || "Data retrieved successfully.",
      keyMetrics: [],
      insights: lines.slice(1, 4).filter((l) => l.length > 0)
    };
  }
}

function generateFallbackInsights(result: QueryResult): InsightSummary {
  const numericFields = result.fields.filter((field) =>
    result.rows.some((row) => typeof row[field] === "number")
  );

  const metrics = numericFields
    .slice(0, 3)
    .map((field) => {
      const values = result.rows
        .map((r) => Number(r[field]))
        .filter((v) => !isNaN(v));

      if (values.length === 0) return null;

      const total = values.reduce((sum, v) => sum + v, 0);
      const max = Math.max(...values);
      const min = Math.min(...values);

      // Determine if it's currency or count
      const isCurrency = /revenue|price|cost|amount|value/i.test(field);

      return {
        label: formatFieldName(field),
        value: formatNumber(total, isCurrency),
        trend:
          max !== min
            ? `Range: ${formatNumber(min, isCurrency)} - ${formatNumber(max, isCurrency)}`
            : undefined
      };
    })
    .filter((m) => m !== null);

  return {
    summary: `Retrieved ${result.rowCount} ${result.rowCount === 1 ? "row" : "rows"} of data across ${result.fields.length} ${result.fields.length === 1 ? "field" : "fields"}.`,
    keyMetrics: metrics as Array<{ label: string; value: string; trend?: string }>,
    insights: [
      `Data contains ${numericFields.length} numeric ${numericFields.length === 1 ? "field" : "fields"}`,
      `Total of ${result.rowCount} records available for analysis`
    ]
  };
}

function formatNumber(value: number, isCurrency = true): string {
  if (isCurrency) {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}K`;
    }
    return `£${value.toFixed(2)}`;
  } else {
    // For counts
    return value.toLocaleString();
  }
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long"
  });
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Gbp/gi, "GBP")
    .replace(/Id/gi, "ID");
}
