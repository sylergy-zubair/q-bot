import pg from "pg";
import { env } from "../env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

pool.on("error", (error: Error) => {
  console.error("Unexpected Postgres error", error);
});

export async function closePool(): Promise<void> {
  await pool.end();
}

