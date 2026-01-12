import { Pool } from "pg";

const DATABASE_URL = "postgresql://qbot_user:kzLzGnyJ8Ixe3VQ7SUbUmoQluJRkeuuc@dpg-d5ijk5hr0fns73bag1t0-a.frankfurt-postgres.render.com/qbot";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const tables = [
  'channels', 'customers', 'holidays', 'menu_categories', 'menu_items',
  'order_items', 'orders', 'payment_methods', 'promotions', 'staff', 'stores'
];

async function main() {
  try {
    for (const table of tables) {
      await pool.query(`ALTER TABLE public.${table} SET SCHEMA sale`);
      console.log(`✓ Moved ${table} to sale schema`);
    }
    console.log("\n✅ All tables moved to sale schema!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
