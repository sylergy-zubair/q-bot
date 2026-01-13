# Natural Language Summary Implementation Plan

## Overview

This document outlines the implementation plan for adding natural language summaries to query results in the Q-bot application. This feature will transform raw tabular data into human-readable, business-friendly insights that non-technical users can easily understand.

## Problem Statement

Currently, query results are displayed as raw data tables with technical field names and unformatted numbers. For example:

```
MONTH                    ORDER_COUNT  REVENUE
2023-01-01T00:00:00.000Z  19010       2085313.65
2023-02-01T00:00:00.000Z  16740       1857737.10
```

This is difficult for non-technical users to interpret. They need:
- Plain English explanations of what the data means
- Formatted numbers (e.g., "£2.1M" instead of "2085313.65")
- Key insights and trends highlighted
- Executive-level summaries

## Goals

1. **Automatic Summarization**: Generate natural language summaries for all query results
2. **Business-Friendly Formatting**: Format numbers, dates, and currencies appropriately
3. **Key Insights Extraction**: Identify trends, comparisons, and notable patterns
4. **Executive Summary**: Provide high-level overview in 2-3 sentences
5. **Key Metrics Display**: Highlight 3-5 most important metrics with formatted values
6. **Graceful Degradation**: Fallback to basic summary if LLM generation fails

## Current State

### Existing Infrastructure ✅

- **OpenRouter Integration**: Already configured in `backend/src/services/openRouterClient.ts`
- **Query Execution**: Results are returned with `fields`, `rows`, and `rowCount`
- **Frontend Display**: Results shown in `ResultTable.tsx` component
- **Theme Support**: Both Aurora and Cupertino themes available

### Current Limitations

- Raw data tables only
- No interpretation or summarization
- Technical field names (e.g., `ORDER_COUNT`, `REVENUE`)
- Unformatted numbers (e.g., `2085313.65`)
- No trend analysis or insights

## Implementation Strategy

### Phase 1: Backend Insight Generation Service

#### 1.1 Create `insightGenerator.ts` Service

**Location**: `backend/src/services/insightGenerator.ts`

**Responsibilities**:
- Accept query results and original question
- Format data for LLM consumption
- Generate natural language summary using OpenRouter
- Parse LLM response into structured format
- Provide fallback summary if generation fails

**Key Functions**:

```typescript
// Main insight generation
async function generateInsights(
  question: string,
  result: QueryResult
): Promise<InsightSummary>

// Data formatting for prompt
function formatDataForPrompt(
  fields: string[],
  rows: Array<Record<string, unknown>>
): string

// Response parsing
function parseInsightResponse(content: string): InsightSummary

// Fallback generation
function generateFallbackInsights(result: QueryResult): InsightSummary
```

#### 1.2 Data Formatting Strategy

**Number Formatting**:
- Values ≥ 1,000,000: Format as "£2.1M"
- Values ≥ 1,000: Format as "£1.5K"
- Values < 1,000: Format as "£123.45"
- Percentages: Format as "12.5%"
- Counts: Format with thousand separators (e.g., "19,010")

**Date Formatting**:
- ISO dates → "January 2023"
- Timestamps → "Jan 15, 2023"
- Month-only → "January 2023"

**Field Name Formatting**:
- `ORDER_COUNT` → "Order Count"
- `revenue_gbp` → "Revenue (GBP)"
- `store_name` → "Store Name"

#### 1.3 LLM Prompt Design

**System Prompt**:
```
You are a data analyst assistant that explains query results in plain, business-friendly language.
Your task is to:
1. Write a 2-3 sentence executive summary of the data
2. Extract 3-5 key metrics with formatted values
3. Identify 2-3 actionable insights or trends

Be concise, use natural language, and format numbers appropriately.
Highlight trends, comparisons, and notable patterns.
```

**User Prompt Structure**:
1. Original question
2. Sample data (first 20 rows, formatted)
3. Total row count
4. Field names and types

**Response Format**:
```json
{
  "summary": "Brief explanation...",
  "keyMetrics": [
    {
      "label": "Metric name",
      "value": "Formatted value",
      "trend": "optional trend indicator"
    }
  ],
  "insights": ["Insight 1", "Insight 2"]
}
```

#### 1.4 Error Handling & Fallbacks

**Fallback Strategy**:
1. If LLM generation fails → Use `generateFallbackInsights()`
2. If JSON parsing fails → Extract summary from text response
3. If no response → Return basic structured summary

**Fallback Implementation**:
- Calculate basic statistics (totals, averages)
- Format top numeric fields
- Generate simple summary text
- Provide basic insights based on data structure

### Phase 2: Backend Route Integration

#### 2.1 Update `nlQuery.ts` Route

**Location**: `backend/src/routes/nlQuery.ts`

**Changes Required**:
- Import `generateInsights` service
- Call insight generation after query execution
- Add insights to response payload
- Handle errors gracefully (don't block query response)

**Implementation**:

```typescript
// After query execution
const execution = await executeSelectQuery(sanitized.sql);

// Generate insights (async, non-blocking)
let insights = null;
try {
  insights = await generateInsights(parsed.data.question, execution);
} catch (insightError) {
  console.error("Failed to generate insights:", insightError);
  // Continue without insights - don't fail the request
}

res.json({
  sql: sanitized.sql,
  warnings: sanitized.warnings,
  result: execution,
  insights: insights // Add to response
});
```

**Performance Considerations**:
- Insight generation should not block query response
- Consider timeout (e.g., 10 seconds max)
- If timeout, return query results without insights
- Log errors but don't expose to frontend

### Phase 3: Frontend Component Development

#### 3.1 Update API Types

**Location**: `frontend/src/lib/api.ts`

**New Types**:

```typescript
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
  insights?: InsightSummary; // Add optional insights
}
```

#### 3.2 Create `ResultSummary.tsx` Component

**Location**: `frontend/src/components/ResultSummary.tsx`

**Component Structure**:

```typescript
interface ResultSummaryProps {
  insights: InsightSummary;
  theme?: "aurora" | "cupertino";
}

export function ResultSummary({ insights, theme = "aurora" }: ResultSummaryProps)
```

**Features**:
- Theme-aware rendering (Aurora/Cupertino)
- Executive summary section
- Key metrics cards (3-5 metrics)
- Insights list with bullet points
- Responsive grid layout

**Aurora Theme Styling**:
- Dark background with glassmorphism
- White/transparent text
- Gradient borders
- Sky/cyan accent colors

**Cupertino Theme Styling**:
- Light background with subtle borders
- Dark text
- Gray/slate color scheme
- Clean, minimal design

#### 3.3 Component Layout

**Structure**:
```
┌─────────────────────────────────────┐
│ Executive Summary                   │
│ (2-3 sentence paragraph)            │
└─────────────────────────────────────┘
┌──────────┬──────────┬──────────┐
│ Metric 1 │ Metric 2 │ Metric 3 │
│ Value    │ Value    │ Value    │
│ Trend    │ Trend    │ Trend    │
└──────────┴──────────┴──────────┘
┌─────────────────────────────────────┐
│ Key Insights                        │
│ • Insight 1                         │
│ • Insight 2                         │
│ • Insight 3                         │
└─────────────────────────────────────┘
```

### Phase 4: Frontend Integration

#### 4.1 Update `App.tsx`

**Integration Points**:
- Import `ResultSummary` component
- Display summary above result table
- Conditionally render based on `result.insights` availability
- Support both Aurora and Cupertino themes

**Placement**:
- After SQL preview and warnings
- Before result table/chart
- Prominent position for visibility

**Implementation**:

```typescript
// In AuroraDashboard
{result.insights && (
  <ResultSummary insights={result.insights} theme="aurora" />
)}

// In CupertinoDashboard
{result.insights && (
  <ResultSummary insights={result.insights} theme="cupertino" />
)}
```

#### 4.2 Loading States

**Considerations**:
- Insights generation may take 2-5 seconds
- Show loading indicator if needed
- Don't block query results display
- Show summary when ready (async update)

**Optional Enhancement**:
- Show "Generating insights..." message
- Update UI when insights arrive
- Fade-in animation for smooth transition

## Technical Details

### Data Formatting Utilities

**Number Formatting**:

```typescript
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
```

**Date Formatting**:

```typescript
function formatDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long"
    });
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long"
      });
    }
  }
  return String(value);
}
```

**Field Name Formatting**:

```typescript
function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Gbp/gi, "GBP")
    .replace(/Id/gi, "ID");
}
```

### LLM Response Parsing

**JSON Extraction**:

```typescript
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
    // Fallback: extract summary from text
    const lines = content.split("\n").filter(l => l.trim());
    return {
      summary: lines[0] || "Data retrieved successfully.",
      keyMetrics: [],
      insights: lines.slice(1, 4).filter(l => l.length > 0)
    };
  }
}
```

### Fallback Summary Generation

**Basic Statistics Calculation**:

```typescript
function generateFallbackInsights(result: QueryResult): InsightSummary {
  const numericFields = result.fields.filter(field => 
    result.rows.some(row => typeof row[field] === "number")
  );

  const metrics = numericFields.slice(0, 3).map(field => {
    const values = result.rows
      .map(r => Number(r[field]))
      .filter(v => !isNaN(v));
    
    if (values.length === 0) return null;
    
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Determine if it's currency or count
    const isCurrency = /revenue|price|cost|amount|value/i.test(field);
    
    return {
      label: formatFieldName(field),
      value: formatNumber(total, isCurrency),
      trend: max !== min 
        ? `Range: ${formatNumber(min, isCurrency)} - ${formatNumber(max, isCurrency)}`
        : undefined
    };
  }).filter(m => m !== null);

  return {
    summary: `Retrieved ${result.rowCount} ${result.rowCount === 1 ? 'row' : 'rows'} of data across ${result.fields.length} ${result.fields.length === 1 ? 'field' : 'fields'}.`,
    keyMetrics: metrics as Array<{ label: string; value: string; trend?: string }>,
    insights: [
      `Data contains ${numericFields.length} numeric ${numericFields.length === 1 ? 'field' : 'fields'}`,
      `Total of ${result.rowCount} records available for analysis`
    ]
  };
}
```

## Example Outputs

### Example 1: Revenue and Orders by Month

**Input Query**: "Show revenue and orders by month"

**Generated Summary**:
```json
{
  "summary": "Revenue and order volume show monthly trends from January to April 2023. Total revenue across the period was £8.1M with 73,142 orders processed. March achieved the highest revenue despite a dip in February.",
  "keyMetrics": [
    {
      "label": "Total Revenue",
      "value": "£8.1M",
      "trend": "Peak in March"
    },
    {
      "label": "Total Orders",
      "value": "73,142",
      "trend": "12% decline Feb→Mar"
    },
    {
      "label": "Average Order Value",
      "value": "£110.75",
      "trend": "Increasing trend"
    }
  ],
  "insights": [
    "March had the highest revenue at £2.1M despite February having the lowest order count",
    "Order volume declined 12% from January to February, then recovered in March",
    "Average order value increased from £109.70 in January to £111.78 in March"
  ]
}
```

### Example 2: Store Comparison

**Input Query**: "Compare revenue by store"

**Generated Summary**:
```json
{
  "summary": "Store performance varies significantly across locations. Brixton Village leads with £2.5M in revenue, while Camden Lock Market generated £1.8M. The top 3 stores account for 65% of total revenue.",
  "keyMetrics": [
    {
      "label": "Top Store",
      "value": "Brixton Village",
      "trend": "£2.5M revenue"
    },
    {
      "label": "Total Revenue",
      "value": "£6.7M",
      "trend": "Across all stores"
    },
    {
      "label": "Average per Store",
      "value": "£1.7M",
      "trend": "4 stores"
    }
  ],
  "insights": [
    "Brixton Village outperforms other stores by 39%",
    "Revenue distribution shows clear top performers",
    "Top 3 stores generate 65% of total revenue"
  ]
}
```

## Implementation Steps

### Step 1: Backend Service (2-3 hours)

- [ ] Create `backend/src/services/insightGenerator.ts`
- [ ] Implement `generateInsights()` function
- [ ] Implement data formatting utilities
- [ ] Implement LLM prompt construction
- [ ] Implement response parsing
- [ ] Implement fallback summary generation
- [ ] Add error handling

### Step 2: Backend Integration (1 hour)

- [ ] Update `backend/src/routes/nlQuery.ts`
- [ ] Import insight generator service
- [ ] Add insight generation call
- [ ] Update response payload type
- [ ] Add error handling (non-blocking)
- [ ] Test with sample queries

### Step 3: Frontend Types (30 minutes)

- [ ] Update `frontend/src/lib/api.ts`
- [ ] Add `InsightSummary` interface
- [ ] Update `QueryResultPayload` interface
- [ ] Export new types

### Step 4: Frontend Component (2-3 hours)

- [ ] Create `frontend/src/components/ResultSummary.tsx`
- [ ] Implement `AuroraSummary` component
- [ ] Implement `CupertinoSummary` component
- [ ] Add responsive grid layout
- [ ] Style key metrics cards
- [ ] Style insights list
- [ ] Add theme support

### Step 5: Frontend Integration (1 hour)

- [ ] Update `frontend/src/App.tsx`
- [ ] Import `ResultSummary` component
- [ ] Add to Aurora dashboard
- [ ] Add to Cupertino dashboard
- [ ] Position above result table
- [ ] Test conditional rendering

### Step 6: Testing & Refinement (2-3 hours)

- [ ] Test with various query types
- [ ] Test with different data sizes
- [ ] Test error scenarios
- [ ] Test fallback generation
- [ ] Verify theme consistency
- [ ] Test responsive layouts
- [ ] Performance testing
- [ ] User experience refinement

### Step 7: Documentation (1 hour)

- [ ] Update README with new feature
- [ ] Add JSDoc comments
- [ ] Document prompt structure
- [ ] Document fallback behavior

## Testing Strategy

### Unit Tests

**Backend**:
- Data formatting functions
- Number formatting edge cases
- Date formatting edge cases
- Field name formatting
- JSON parsing with various formats
- Fallback generation logic

**Frontend**:
- Component rendering with different data
- Theme switching
- Responsive layout
- Empty states

### Integration Tests

- End-to-end query → insight generation → display
- Error handling (LLM failure)
- Timeout scenarios
- Large dataset handling

### Manual Testing Scenarios

1. **Time Series Query**: "Show monthly revenue"
   - Verify summary mentions trends
   - Check date formatting
   - Verify metric calculations

2. **Comparison Query**: "Compare stores by revenue"
   - Verify top performer identification
   - Check percentage calculations
   - Verify comparison insights

3. **Aggregate Query**: "Total revenue by channel"
   - Verify breakdown summary
   - Check percentage formatting
   - Verify distribution insights

4. **Edge Cases**:
   - Single row result
   - Empty result
   - Very large dataset (1000+ rows)
   - Non-numeric data only
   - Mixed data types

5. **Error Scenarios**:
   - LLM API failure
   - Invalid JSON response
   - Timeout
   - Network error

## Performance Considerations

### Backend

1. **LLM Call Optimization**:
   - Limit data preview to 20 rows
   - Use appropriate `max_tokens` (800)
   - Set reasonable timeout (10 seconds)
   - Cache insights for identical queries (future enhancement)

2. **Non-Blocking Design**:
   - Don't block query response
   - Generate insights asynchronously
   - Return query results immediately
   - Add insights when ready (optional: WebSocket update)

3. **Data Size Limits**:
   - Only send first 20 rows to LLM
   - Summarize large datasets
   - Consider pagination for very large results

### Frontend

1. **Rendering Optimization**:
   - Use `React.memo` for summary component
   - Lazy load if needed
   - Avoid re-renders on theme switch

2. **User Experience**:
   - Show query results immediately
   - Display "Generating insights..." indicator
   - Update summary when ready
   - Smooth fade-in animation

## Error Handling

### Backend Errors

1. **LLM API Failure**:
   - Log error
   - Return fallback summary
   - Don't fail the request

2. **Parsing Failure**:
   - Try multiple parsing strategies
   - Extract text summary
   - Fall back to basic summary

3. **Timeout**:
   - Set 10-second timeout
   - Return query results without insights
   - Log timeout for monitoring

### Frontend Errors

1. **Missing Insights**:
   - Gracefully handle `insights: null`
   - Don't show summary section
   - No error message needed

2. **Invalid Data Structure**:
   - Validate insight structure
   - Show fallback UI if invalid
   - Log error for debugging

## Future Enhancements

### Phase 2 Features

- **Caching**: Cache insights for identical queries
- **Streaming**: Stream insights as they're generated
- **Customization**: Allow users to request specific insight types
- **Export**: Export summary as PDF/text
- **Comparison Mode**: Compare insights across queries

### Phase 3 Features

- **Interactive Insights**: Click insights to drill down
- **Visual Highlights**: Highlight relevant data in table
- **Multi-Language**: Support multiple languages
- **Custom Prompts**: Allow domain-specific prompt templates
- **Insight History**: Save and compare insights over time

## Dependencies

### Existing (No Changes Needed)

- `axios@^1.7.5` - HTTP client for OpenRouter API
- `react@^18.2.0` - React framework
- `tailwindcss@^3.4.4` - Styling

### Potential Additions

- None required for initial implementation

## Success Criteria

- ✅ Natural language summaries generated for all query results
- ✅ Numbers formatted appropriately (currency, percentages, counts)
- ✅ Key metrics extracted and displayed prominently
- ✅ Insights identify trends and patterns
- ✅ Executive summary provides 2-3 sentence overview
- ✅ Both Aurora and Cupertino themes supported
- ✅ Graceful fallback if LLM generation fails
- ✅ Performance acceptable (insights generated in < 10 seconds)
- ✅ Non-blocking design (query results shown immediately)
- ✅ Error handling doesn't break query flow

## Estimated Timeline

- **Total Time**: 10-14 hours
- **Phase 1-2**: 3-4 hours (Backend service & integration)
- **Phase 3-4**: 3-4 hours (Frontend component & integration)
- **Phase 5**: 2-3 hours (Testing & refinement)
- **Phase 6**: 1 hour (Documentation)
- **Buffer**: 1-2 hours (Unexpected issues)

## Notes

- Start with basic summary generation
- Focus on number formatting first (most impactful)
- Test with real queries from demo questions
- Consider user feedback before adding advanced features
- Keep prompts concise to reduce token usage
- Monitor LLM API costs and usage
- Consider rate limiting if needed
- Fallback should always work - never fail silently

## Example Component Structure

```
frontend/src/components/
└── ResultSummary.tsx
    ├── ResultSummary (main component)
    ├── AuroraSummary
    │   ├── ExecutiveSummary section
    │   ├── KeyMetrics grid
    │   └── Insights list
    └── CupertinoSummary
        ├── ExecutiveSummary section
        ├── KeyMetrics grid
        └── Insights list
```

## Backend Service Structure

```
backend/src/services/
└── insightGenerator.ts
    ├── generateInsights (main function)
    ├── formatDataForPrompt
    ├── formatNumber
    ├── formatDate
    ├── formatFieldName
    ├── parseInsightResponse
    └── generateFallbackInsights
```
