# Chart Visualization Implementation Plan

## Overview

This document outlines the implementation plan for adding automatic chart/graph visualization to query results in the Q-bot application. Users will be able to see graphical representations of their natural language query results alongside (or instead of) tabular data.

## Current State

### Existing Infrastructure ✅

- **Recharts library**: Already installed (`recharts@^2.12.7`) in `frontend/package.json`
- **Chart examples**: `InsightsPanel.tsx` demonstrates AreaChart, BarChart, and LineChart usage
- **Data structure**: Query results come as structured objects with `fields` (string[]) and `rows` (Record<string, unknown>[])
- **Design system**: Two themes (Aurora and Cupertino) with consistent styling patterns

### Current Limitations

- Query results are only displayed as tables (`ResultTable.tsx`)
- No automatic chart generation based on query structure
- No user control to toggle between table/chart views

## Goals

1. **Automatic Chart Detection**: Intelligently determine the best chart type based on query result structure
2. **Multiple Chart Types**: Support Line, Bar, Area, Pie, and Scatter charts
3. **Seamless Integration**: Add charts to existing query result display without breaking current functionality
4. **User Control**: Allow users to toggle between table and chart views
5. **Theme Consistency**: Charts should match both Aurora and Cupertino design themes

## Implementation Strategy

### Phase 1: Core Chart Component

#### 1.1 Create `QueryChart.tsx` Component

**Location**: `frontend/src/components/QueryChart.tsx`

**Responsibilities**:

- Analyze query result structure to determine chart type
- Transform data into chart-friendly format
- Render appropriate chart using Recharts
- Handle edge cases (empty data, single row, etc.)

**Key Functions**:

```typescript
// Chart type detection
function detectChartType(
  fields: string[],
  rows: Record<string, unknown>[]
): ChartType;

// Data transformation
function transformDataForChart(
  fields: string[],
  rows: Record<string, unknown>[],
  chartType: ChartType
): ChartData;

// Chart rendering
function renderChart(
  chartType: ChartType,
  data: ChartData,
  theme: "aurora" | "cupertino"
): JSX.Element;
```

#### 1.2 Chart Type Detection Logic

**Detection Rules**:

1. **Time Series (Line/Area Chart)**

   - Fields contain: `date`, `month`, `year`, `week`, `time`, `timestamp`
   - One numeric field for Y-axis
   - Multiple rows with sequential time data
   - **Example**: "How has total revenue changed month-on-month?"

2. **Categorical Comparison (Bar Chart)**

   - One categorical field (string/text)
   - One or more numeric fields
   - Multiple distinct categories
   - **Example**: "Which store has the highest average order value?"

3. **Distribution/Pie Chart**

   - One categorical field
   - One numeric field (percentages or counts)
   - Limited number of categories (2-10 recommended)
   - **Example**: "What percentage of revenue comes from dine-in vs delivery?"

4. **Multi-Series Line/Bar**

   - Time/categorical field + multiple numeric fields
   - Compare multiple metrics over time/categories
   - **Example**: "Show revenue growth by store over the last 90 days"

5. **Scatter Plot**

   - Two numeric fields
   - Correlation analysis
   - **Example**: "Relationship between order volume and revenue"

6. **Default Fallback**
   - If no pattern matches → Table view only
   - Or simple bar chart if 2 columns (1 categorical, 1 numeric)

#### 1.3 Data Transformation

**Common Transformations**:

```typescript
// Time series transformation
{
  month: "2024-01",
  revenue: 50000
}

// Categorical transformation
{
  store_name: "Brixton Village",
  revenue: 75000,
  orders: 1200
}

// Multi-series transformation
{
  month: "2024-01",
  dine_in: 30000,
  delivery: 20000,
  takeaway: 10000
}
```

### Phase 2: Integration

#### 2.1 Update `App.tsx`

**Changes Required**:

- Add state for view mode: `'table' | 'chart' | 'both'`
- Pass query results to `QueryChart` component
- Add toggle button to switch views
- Conditionally render chart based on detection result

**Integration Points**:

```typescript
// In AuroraDashboard and CupertinoDashboard
{result && (
  <>
    <ViewToggle
      mode={viewMode}
      onToggle={setViewMode}
      hasChart={canRenderChart(result)}
    />
    {viewMode === 'chart' || viewMode === 'both' ? (
      <QueryChart
        fields={result.result.fields}
        rows={result.result.rows}
        theme={design}
      />
    ) : null}
    {viewMode === 'table' || viewMode === 'both' ? (
      <ResultTable ... />
    ) : null}
  </>
)}
```

#### 2.2 Create `ViewToggle.tsx` Component

**Location**: `frontend/src/components/ViewToggle.tsx`

**Features**:

- Toggle between Table, Chart, and Both views
- Visual indicators for available views
- Disabled state when chart cannot be rendered

### Phase 3: Chart Type Implementations

#### 3.1 Line Chart

- **Use case**: Time series data, trends over time
- **Questions**: Revenue changes, growth trends, seasonal patterns
- **Styling**: Match existing `InsightsPanel` line chart styles

#### 3.2 Bar Chart

- **Use case**: Categorical comparisons, rankings
- **Questions**: Store comparisons, menu item rankings, channel breakdowns
- **Variants**: Horizontal, vertical, grouped, stacked

#### 3.3 Area Chart

- **Use case**: Cumulative data, trends with emphasis on volume
- **Questions**: Revenue accumulation, growth visualization
- **Styling**: Gradient fills matching Aurora theme

#### 3.4 Pie Chart

- **Use case**: Part-to-whole relationships, percentages
- **Questions**: Revenue by channel, category distribution
- **Styling**: Use existing `ACCENT_COLORS` palette

#### 3.5 Scatter Plot

- **Use case**: Correlation analysis, outlier detection
- **Questions**: Relationship between metrics, performance outliers
- **Styling**: Simple, clean dots with trend lines

### Phase 4: Theme Support

#### 4.1 Aurora Theme Styling

- Dark background with gradient overlays
- Bright accent colors (cyan, indigo, sky)
- White/transparent text
- Glow effects on hover

#### 4.2 Cupertino Theme Styling

- Light background with subtle borders
- Muted colors (slate, gray)
- Dark text
- Clean, minimal design

**Implementation**:

```typescript
const chartConfig = {
  aurora: {
    gridColor: "rgba(255,255,255,0.2)",
    textColor: "rgba(255,255,255,0.7)",
    tooltipBg: "#0f172a",
    accentColors: ["#38bdf8", "#6366f1", "#ec4899", "#f59e0b", "#10b981"],
  },
  cupertino: {
    gridColor: "#e2e8f0",
    textColor: "#475569",
    tooltipBg: "#ffffff",
    accentColors: ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"],
  },
};
```

## Technical Details

### Component Structure

```
frontend/src/components/
├── QueryChart.tsx          # Main chart component
├── ViewToggle.tsx          # Toggle between views
├── ChartDetector.ts       # Chart type detection logic
├── DataTransformer.ts     # Data transformation utilities
└── chartConfig.ts         # Theme-specific chart configurations
```

### Type Definitions

```typescript
type ChartType = "line" | "area" | "bar" | "pie" | "scatter" | "none";

interface ChartData {
  type: ChartType;
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  yAxisKeys: string[];
  labels?: Record<string, string>;
}

interface QueryChartProps {
  fields: string[];
  rows: Array<Record<string, unknown>>;
  theme: "aurora" | "cupertino";
  height?: number;
}
```

### Detection Algorithm

```typescript
function detectChartType(
  fields: string[],
  rows: Record<string, unknown>[]
): ChartType {
  // 1. Check for time-based fields
  const timeField = fields.find((f) =>
    /date|month|year|week|time|timestamp/i.test(f)
  );

  // 2. Identify numeric fields
  const numericFields = fields.filter((f) =>
    rows.some((r) => typeof r[f] === "number")
  );

  // 3. Identify categorical fields
  const categoricalFields = fields.filter(
    (f) => !numericFields.includes(f) && !timeField?.includes(f)
  );

  // 4. Apply detection rules
  if (timeField && numericFields.length === 1) {
    return "line";
  }
  if (timeField && numericFields.length > 1) {
    return "area";
  }
  if (categoricalFields.length === 1 && numericFields.length === 1) {
    return rows.length <= 10 ? "pie" : "bar";
  }
  // ... more rules

  return "none";
}
```

## Question Mapping

### Restaurant Demo Questions → Chart Types

| Question Category      | Example Questions                                   | Recommended Chart         |
| ---------------------- | --------------------------------------------------- | ------------------------- |
| Revenue & Performance  | "How has total revenue changed month-on-month?"     | Line/Area Chart           |
| Store Comparison       | "Which store has the highest AOV?"                  | Bar Chart                 |
| Menu Engineering       | "Which items generate high revenue but low volume?" | Bar Chart (multi-series)  |
| Marketing & Promotions | "What percentage comes from dine-in vs delivery?"   | Pie Chart                 |
| Channel Optimization   | "Revenue by channel over time"                      | Area Chart (stacked)      |
| Trends & Seasonality   | "Seasonal trends across the last year"              | Line Chart (multi-series) |
| Executive Insights     | "Top 3 stores by revenue"                           | Bar Chart                 |

## Implementation Steps

### Step 1: Setup (1-2 hours)

- [ ] Create `QueryChart.tsx` component skeleton
- [ ] Create `ChartDetector.ts` utility
- [ ] Create `DataTransformer.ts` utility
- [ ] Create `chartConfig.ts` for theme configurations

### Step 2: Detection Logic (2-3 hours)

- [ ] Implement field type detection (time, numeric, categorical)
- [ ] Implement chart type detection algorithm
- [ ] Add unit tests for detection logic
- [ ] Handle edge cases (empty data, single row, etc.)

### Step 3: Chart Rendering (3-4 hours)

- [ ] Implement Line chart with theme support
- [ ] Implement Bar chart (horizontal/vertical)
- [ ] Implement Area chart
- [ ] Implement Pie chart
- [ ] Implement Scatter plot (optional)

### Step 4: Integration (2-3 hours)

- [ ] Create `ViewToggle.tsx` component
- [ ] Update `App.tsx` to include chart rendering
- [ ] Add view mode state management
- [ ] Update both Aurora and Cupertino dashboards

### Step 5: Testing & Refinement (2-3 hours)

- [ ] Test with sample queries from demo questions
- [ ] Verify theme consistency
- [ ] Test edge cases
- [ ] Performance testing with large datasets
- [ ] User experience refinement

### Step 6: Documentation (1 hour)

- [ ] Update README with chart feature
- [ ] Add JSDoc comments to components
- [ ] Document chart type detection rules

## Testing Strategy

### Unit Tests

- Chart type detection with various field combinations
- Data transformation accuracy
- Edge case handling (empty, single row, null values)

### Integration Tests

- End-to-end query → chart rendering
- Theme switching
- View toggle functionality

### Manual Testing Scenarios

1. **Time Series Query**: "Show monthly revenue for last 6 months"
2. **Comparison Query**: "Compare revenue by store"
3. **Percentage Query**: "Revenue breakdown by channel"
4. **Multi-Series Query**: "Revenue and orders by month"
5. **Edge Cases**: Single row, empty result, non-chartable data

## Future Enhancements

### Phase 2 Features

- **Chart Customization**: Allow users to manually select chart type
- **Export Functionality**: Download charts as PNG/SVG
- **Interactive Tooltips**: Enhanced hover information
- **Zoom/Pan**: For large time series datasets
- **Chart Annotations**: Add notes/markers to charts

### Phase 3 Features

- **Multi-Chart Views**: Show multiple charts for complex queries
- **Chart Templates**: Pre-defined chart configurations for common queries
- **Comparison Mode**: Side-by-side chart comparisons
- **Drill-Down**: Click chart elements to filter/refine queries

## Dependencies

### Existing (No Changes Needed)

- `recharts@^2.12.7` - Chart library
- `react@^18.2.0` - React framework
- `tailwindcss@^3.4.4` - Styling

### Potential Additions

- None required for initial implementation

## Performance Considerations

1. **Data Size Limits**:

   - Charts should handle up to 1000 data points efficiently
   - For larger datasets, consider data aggregation or pagination

2. **Rendering Optimization**:

   - Use `React.memo` for chart components
   - Debounce chart type detection for rapid query changes
   - Lazy load chart components if needed

3. **Memory Management**:
   - Clean up chart instances on unmount
   - Avoid storing large datasets in component state

## Success Criteria

- ✅ Charts automatically appear for suitable query results
- ✅ Chart types are correctly detected for all demo question categories
- ✅ Both Aurora and Cupertino themes are fully supported
- ✅ Users can toggle between table and chart views
- ✅ Charts match existing design system aesthetics
- ✅ Performance is acceptable for datasets up to 1000 rows
- ✅ Edge cases are handled gracefully (fallback to table)

## Estimated Timeline

- **Total Time**: 12-16 hours
- **Phase 1-3**: 8-10 hours (Core implementation)
- **Phase 4**: 2-3 hours (Integration)
- **Phase 5**: 2-3 hours (Testing & refinement)

## Notes

- Start with Line and Bar charts (most common use cases)
- Pie charts can be added later if needed
- Scatter plots are lowest priority
- Consider user feedback before implementing Phase 2 enhancements
- Keep chart detection conservative - better to show table than wrong chart type
