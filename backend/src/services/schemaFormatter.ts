import type { DatabaseSchema } from "../db/schema.js";

export function formatSchemaForPrompt(schema: DatabaseSchema): string {
  const tables = new Map<string, string[]>();

  for (const column of schema.columns) {
    const key = `${column.tableSchema}.${column.tableName}`;
    if (!tables.has(key)) tables.set(key, []);
    tables.get(key)!.push(`${column.columnName} (${column.dataType})`);
  }

  const lines: string[] = [];
  for (const [table, cols] of tables.entries()) {
    lines.push(`Table ${table}`);
    lines.push(`  Columns: ${cols.join(", ")}`);
  }

  if (schema.samples.length) {
    lines.push("", "Sample rows:");
    for (const sample of schema.samples) {
      const rowsJson = sample.rows.map((row) => JSON.stringify(row)).join("; ");
      lines.push(`  ${sample.tableSchema}.${sample.tableName}: ${rowsJson}`);
    }
  }

  return lines.join("\n");
}

