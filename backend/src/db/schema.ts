import type { PoolClient } from "pg";
import { pool } from "./pool.js";

export interface TableColumn {
  tableSchema: string;
  tableName: string;
  columnName: string;
  dataType: string;
}

export interface TableSample {
  tableSchema: string;
  tableName: string;
  rows: Array<Record<string, unknown>>;
}

export interface DatabaseSchema {
  columns: TableColumn[];
  samples: TableSample[];
}

export async function getSchemaMetadata(
  schemaWhitelist: string[] = ["sale"],
  sampleRowLimit = 5
): Promise<DatabaseSchema> {
  const client = await pool.connect();

  try {
    await client.query("SET search_path TO " + schemaWhitelist.map((schema) => `"${schema}"`).join(","));
    const columns = await fetchColumns(client, schemaWhitelist);
    const samples = await fetchSamples(client, schemaWhitelist, sampleRowLimit);

    return { columns, samples };
  } finally {
    client.release();
  }
}

async function fetchColumns(client: PoolClient, schemaWhitelist: string[]): Promise<TableColumn[]> {
  const result = await client.query<TableColumn>(
    `
      SELECT 
        table_schema AS "tableSchema",
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_schema = ANY($1)
      ORDER BY table_schema, table_name, ordinal_position
    `,
    [schemaWhitelist]
  );

  return result.rows;
}

async function fetchSamples(
  client: PoolClient,
  schemaWhitelist: string[],
  limit: number
): Promise<TableSample[]> {
  const tablesResult = await client.query<{ table_schema: string; table_name: string }>(
    `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = ANY($1)
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `,
    [schemaWhitelist]
  );

  const samples: TableSample[] = [];

  for (const row of tablesResult.rows) {
    const sampleQuery = `SELECT * FROM "${row.table_schema}"."${row.table_name}" LIMIT ${limit}`;
    const sampleResult = await client.query(sampleQuery);
    samples.push({
      tableSchema: row.table_schema,
      tableName: row.table_name,
      rows: sampleResult.rows
    });
  }

  return samples;
}

