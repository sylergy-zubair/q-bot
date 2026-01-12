#!/usr/bin/env node
import { Pool } from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://qbot_user:kzLzGnyJ8Ixe3VQ7SUbUmoQluJRkeuuc@dpg-d5ijk5hr0fns73bag1t0-a.frankfurt-postgres.render.com/qbot";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function execute(statement, description) {
  try {
    await pool.query(statement);
    console.log(`   ✓ ${description}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`   ⚠️  ${description} (already exists)`);
    } else {
      console.error(`   ❌ ${description}: ${error.message.split('\n')[0]}`);
      throw error;
    }
  }
}

async function main() {
  console.log("🚀 Creating complete database schema...\n");
  
  try {
    // Set up schema
    await pool.query("CREATE SCHEMA IF NOT EXISTS sale");
    await pool.query("SET search_path TO sale");
    console.log("✓ Schema 'sale' ready\n");
    
    // Create raw_order_items first (needed for data import)
    await execute(`
      CREATE TABLE raw_order_items (
        order_id UUID,
        order_line_no SMALLINT,
        store_id SMALLINT,
        order_dt TIMESTAMPTZ,
        dow SMALLINT,
        is_weekend BOOLEAN,
        channel TEXT,
        payment_method TEXT,
        customer_id INTEGER,
        staff_id INTEGER,
        holiday_tag TEXT,
        is_refund BOOLEAN,
        item_sku TEXT,
        item_name TEXT,
        category TEXT,
        unit_price_gbp NUMERIC(8,2),
        quantity SMALLINT,
        line_total_gbp NUMERIC(10,2),
        promo_code TEXT
      )
    `, "raw_order_items table");
    
    // Create stores
    await execute(`
      CREATE TABLE stores (
        store_id SMALLINT PRIMARY KEY,
        store_name TEXT NOT NULL,
        city TEXT NOT NULL,
        region TEXT NOT NULL,
        opened_on DATE NOT NULL
      )
    `, "stores table");
    
    // Insert stores
    await pool.query(`
      INSERT INTO stores (store_id, store_name, city, region, opened_on) VALUES
        (1, 'Shoreditch High Street', 'London', 'East London', '2017-04-01'),
        (2, 'Camden Lock Market', 'London', 'North London', '2018-06-15'),
        (3, 'Brixton Village', 'London', 'South London', '2019-02-10'),
        (4, 'Soho Theatre District', 'London', 'Central London', '2020-09-05'),
        (5, 'Canary Riverside', 'London', 'Docklands', '2021-11-20')
      ON CONFLICT (store_id) DO NOTHING
    `);
    console.log("   ✓ Stores data inserted\n");
    
    // Create lookup tables
    await execute(`
      CREATE TABLE channels (
        channel_id SERIAL PRIMARY KEY,
        channel_name TEXT UNIQUE NOT NULL
      )
    `, "channels table");
    
    await execute(`
      CREATE TABLE payment_methods (
        payment_method_id SERIAL PRIMARY KEY,
        payment_method_name TEXT UNIQUE NOT NULL
      )
    `, "payment_methods table");
    
    await execute(`
      CREATE TABLE menu_categories (
        category_id SERIAL PRIMARY KEY,
        category_name TEXT UNIQUE NOT NULL
      )
    `, "menu_categories table");
    
    await execute(`
      CREATE TABLE promotions (
        promo_code TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        min_order_total_gbp NUMERIC(10,2) NOT NULL DEFAULT 25.00
      )
    `, "promotions table");
    
    await execute(`
      CREATE TABLE holidays (
        holiday_tag TEXT PRIMARY KEY,
        description TEXT NOT NULL
      )
    `, "holidays table");
    
    await execute(`
      CREATE TABLE customers (
        customer_id INTEGER PRIMARY KEY,
        loyalty_segment TEXT NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
      )
    `, "customers table");
    
    await execute(`
      CREATE TABLE staff (
        staff_id INTEGER PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL,
        hire_date DATE NOT NULL
      )
    `, "staff table");
    
    await execute(`
      CREATE TABLE menu_items (
        menu_item_id SERIAL PRIMARY KEY,
        item_sku TEXT UNIQUE NOT NULL,
        item_name TEXT NOT NULL,
        category_id INTEGER NOT NULL REFERENCES menu_categories (category_id),
        default_price_gbp NUMERIC(8,2) NOT NULL
      )
    `, "menu_items table");
    
    // Create orders table
    await execute(`
      CREATE TABLE orders (
        order_id UUID PRIMARY KEY,
        store_id SMALLINT NOT NULL REFERENCES stores (store_id),
        channel_id INTEGER NOT NULL REFERENCES channels (channel_id),
        payment_method_id INTEGER NOT NULL REFERENCES payment_methods (payment_method_id),
        order_dt TIMESTAMPTZ NOT NULL,
        dow SMALLINT NOT NULL,
        is_weekend BOOLEAN NOT NULL,
        customer_id INTEGER REFERENCES customers (customer_id),
        staff_id INTEGER REFERENCES staff (staff_id),
        holiday_tag TEXT REFERENCES holidays (holiday_tag),
        promo_code TEXT REFERENCES promotions (promo_code),
        item_count INTEGER NOT NULL,
        subtotal_gbp NUMERIC(12,2) NOT NULL,
        refund_total_gbp NUMERIC(12,2) NOT NULL,
        net_total_gbp NUMERIC(12,2) NOT NULL,
        is_refund_order BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `, "orders table");
    
    await execute(`
      CREATE TABLE order_items (
        order_id UUID NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
        order_line_no SMALLINT NOT NULL,
        menu_item_id INTEGER NOT NULL REFERENCES menu_items (menu_item_id),
        quantity SMALLINT NOT NULL,
        unit_price_gbp NUMERIC(8,2) NOT NULL,
        line_total_gbp NUMERIC(10,2) NOT NULL,
        is_refund BOOLEAN NOT NULL,
        PRIMARY KEY (order_id, order_line_no)
      )
    `, "order_items table");
    
    // Create indexes
    await execute(`
      CREATE INDEX idx_orders_store_date ON orders (store_id, order_dt)
    `, "indexes");
    
    await execute(`
      CREATE INDEX idx_orders_channel ON orders (channel_id)
    `, "channel index");
    
    await execute(`
      CREATE INDEX idx_order_items_menu_item ON order_items (menu_item_id)
    `, "menu_item index");
    
    console.log("\n✅ Schema creation complete!");
    
    // Verify tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'sale' 
      ORDER BY table_name
    `);
    
    console.log("\n📋 Created tables:");
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
