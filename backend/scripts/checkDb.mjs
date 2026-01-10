import { Pool } from "pg";

const connectionString = process.argv[2];

if (!connectionString) {
  console.error("Usage: node scripts/checkDb.mjs <connectionString>");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString });
  try {
    const tables = await pool.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name`
    );

    console.log("Tables:", tables.rows);

    if (tables.rows.length > 0) {
      const { table_schema, table_name } = tables.rows[0];
      const sample = await pool.query(
        `SELECT * FROM "${table_schema}"."${table_name}" LIMIT 5`
      );
      console.log("Sample rows:", sample.rows);
    } else {
      console.log("No user tables detected.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Database check failed:", error);
  process.exit(1);
});

