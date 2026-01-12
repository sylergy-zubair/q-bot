# Chart Feature Test Questions

This document contains test questions organized by chart type to verify the chart visualization feature implementation.

## Line Chart (Time Series)

**Use Case**: Trends over time, sequential data with time-based X-axis

1. "How has total revenue changed month-on-month across all stores?"
2. "Show me revenue growth by store over the last 90 days"
3. "What seasonal trends can we see across the last year?"
4. "Show monthly revenue for the last 6 months"
5. "How does weekend behavior differ from weekdays over time?"
6. "Which items spike during winter vs summer?"
7. "Are customers ordering fewer items per order over time?"

**Expected**: Line chart with time field (date/month) on X-axis and numeric value on Y-axis

---

## Bar Chart (Categorical Comparison)

**Use Case**: Comparing categories, rankings, single categorical field with numeric values

8. "Which store has the highest average order value?"
9. "Compare revenue by store"
10. "Rank stores by revenue per order"
11. "Which store is underperforming compared to the chain average?"
12. "Top 3 stores by revenue"
13. "Which menu items generate high revenue but low order volume?"
14. "Which items are declining in popularity?"
15. "Which stores sell the most items per order?"
16. "Compare Brixton Village vs Camden Lock Market revenue and order volume"

**Expected**: Bar chart with categorical field (store/item) on X-axis and numeric value on Y-axis

---

## Pie Chart (Distribution/Percentages)

**Use Case**: Part-to-whole relationships, percentage breakdowns, limited categories (2-10)

17. "What percentage of revenue comes from dine-in vs delivery?"
18. "Revenue breakdown by channel"
19. "What percentage comes from each store?"
20. "Show me the distribution of revenue by payment method"
21. "Break down revenue by menu category"

**Expected**: Pie chart with categorical field and single numeric field (percentages or counts)

---

## Area Chart (Stacked/Cumulative)

**Use Case**: Cumulative data, trends with emphasis on volume, multiple series over time

22. "Revenue by channel over time"
23. "Show cumulative revenue by store over the last 3 months"
24. "Channel revenue breakdown by month"
25. "Revenue accumulation by category over time"

**Expected**: Area chart with time field on X-axis and multiple numeric series stacked

---

## Multi-Series Charts (Line/Bar with Multiple Metrics)

**Use Case**: Comparing multiple metrics over time or categories

26. "Show revenue and orders by month"
27. "Compare revenue and order volume by store"
28. "Revenue growth and item count by store over time"
29. "Which items perform best on Just Eat vs Deliveroo?" (multi-series bar)

**Expected**: Line or bar chart with multiple numeric series (different colors/lines)

---

## Scatter Plot (Correlation)

**Use Case**: Relationship analysis between two numeric variables

30. "Relationship between order volume and revenue"
31. "Show correlation between average order value and total orders"
32. "Which items have high volume but low revenue?"

**Expected**: Scatter plot with two numeric fields (X and Y axes)

---

## Edge Cases

**Use Case**: Test graceful fallbacks and error handling

33. "Show me all stores" (simple list - may not chart well)
34. "What is the total revenue?" (single value - should show table only)
35. "Which store has the highest revenue?" (single row - may show bar or table)
36. "Show me stores opened in 2020" (categorical only - table only)

**Expected**: 
- Single value → Table only
- Non-numeric data → Table only
- Single row → May show simple bar or table
- No chartable pattern → Table only

---

## Complex Queries

**Use Case**: Real-world complex questions that may trigger different chart types

37. "Which stores are declining despite stable footfall?"
38. "Which stores rely too heavily on delivery platforms?"
39. "Which items would benefit most from a 10% promotion?"
40. "What menu items convert well on delivery platforms but not in-store?"

**Expected**: Varies based on query result structure - should detect appropriate chart type

---

## Quick Test Checklist

### Must Test (Core Functionality)

- [ ] **Line Chart**: Question #1 or #2
- [ ] **Bar Chart**: Question #8 or #9
- [ ] **Pie Chart**: Question #17 or #18
- [ ] **Area Chart**: Question #22
- [ ] **Multi-Series**: Question #26

### Edge Cases

- [ ] **Single Row Result**: Question #35
- [ ] **Single Value**: Question #34
- [ ] **Non-Chartable Data**: Question #33

### Theme Testing

- [ ] Test all chart types in **Aurora theme** (dark)
- [ ] Test all chart types in **Cupertino theme** (light)
- [ ] Verify chart colors match theme
- [ ] Test view toggle (table/chart/both)

---

## Testing Workflow

1. **Start Simple**: Test questions #1, #8, #17 to verify basic chart rendering
2. **Edge Cases**: Test questions #33-36 to ensure graceful fallbacks
3. **Complex Queries**: Test questions #37-40 to verify detection accuracy
4. **Theme Switching**: Test same queries in both Aurora and Cupertino themes
5. **View Toggle**: Test switching between table/chart/both views

---

## Expected Results Summary

| Chart Type | Trigger Conditions | Example Questions |
|------------|-------------------|-------------------|
| **Line Chart** | Time field (date/month) + numeric value | #1, #2, #3 |
| **Bar Chart** | Categorical field (store/item) + numeric value | #8, #9, #12 |
| **Pie Chart** | Categorical + numeric, 2-10 categories, percentage question | #17, #18, #20 |
| **Area Chart** | Time + multiple numeric series | #22, #24 |
| **Multi-Series** | Time/categorical + multiple numeric fields | #26, #27 |
| **Scatter Plot** | Two numeric fields, correlation question | #30, #31 |
| **Table Only** | Single value, non-numeric, no pattern match | #34, #33 |

---

## Notes

- Chart detection should be **conservative** - better to show table than wrong chart type
- If detection fails or is uncertain, default to table view
- All charts should respect theme (Aurora/Cupertino)
- Charts should be responsive and handle up to 1000 data points efficiently
- View toggle should allow: Table only, Chart only, or Both views
