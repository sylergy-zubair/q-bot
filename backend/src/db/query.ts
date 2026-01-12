import type { FieldDef } from "pg";
import { pool } from "./pool.js";

export interface QueryExecutionResult {
  rowCount: number;
  rows: Array<Record<string, unknown>>;
  fields: string[];
}

export async function executeSelectQuery(sql: string): Promise<QueryExecutionResult> {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    throw new Error("Only SELECT statements are allowed");
  }

  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    const fields = result.fields.map((field: FieldDef) => field.name);
    return {
      rowCount: result.rowCount ?? 0,
      rows: result.rows,
      fields
    };
  } finally {
    client.release();
  }
}

