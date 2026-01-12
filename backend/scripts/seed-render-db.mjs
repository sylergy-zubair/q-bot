#!/usr/bin/env node
/**
 * Complete database seeding script for Render PostgreSQL
 * Creates schema, imports CSV data, and transforms into normalized tables
 * 
 * Usage:
 *   node backend/scripts/seed-render-db.mjs
 * 
 * Or with custom connection string:
 *   DATABASE_URL="your-connection-string" node backend/scripts/seed-render-db.mjs
 */

import { Pool } from "pg";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://qbot_user:kzLzGnyJ8Ixe3VQ7SUbUmoQluJRkeuuc@dpg-d5ijk5hr0fns73bag1t0-a.frankfurt-postgres.render.com/qbot";
const CSV_PATH = join(__dirname, "../../docs/data/data_subset.csv");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10
});

async function executeSql(sql, description) {
  // Remove COPY commands first
  sql = sql.replace(/COPY\s+.*?FROM\s+.*?;/gis, '-- COPY removed');
  
  // Better SQL splitting - handle semicolons in strings and multi-line statements
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && sql[i - 1] !== '\\') {
      inString = false;
      stringChar = '';
      current += char;
    } else if (!inString && char === ';') {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last statement if exists
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }
  
  console.log(`\n📋 ${description}...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty or comment-only statements
    if (!statement || statement.startsWith('--')) {
      continue;
    }
    
    try {
      await pool.query(statement);
      if ((i + 1) % 10 === 0 || i === statements.length - 1) {
        console.log(`   ✓ Executed ${i + 1}/${statements.length} statements`);
      }
    } catch (error) {
      // Ignore "already exists" errors
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate') ||
          (error.message.includes('relation') && error.message.includes('already'))) {
        continue;
      }
      // For schema creation, log but continue (some statements depend on others)
      if (description.includes('schema')) {
        console.error(`   ⚠️  Warning: ${error.message.split('\n')[0]}`);
        continue;
      }
      // For transformation, throw errors
      throw error;
    }
  }
  
  console.log(`   ✅ ${description} complete`);
}

async function importCsvData() {
  console.log("\n📥 Importing CSV data...");
  
  try {
    // Read and parse CSV
    const csvContent = readFileSync(CSV_PATH, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        const columnName = String(context.column || '');
        
        // Empty values become null
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        
        // Handle boolean values
        if (columnName === 'is_weekend' || columnName === 'is_refund') {
          return value === 'true' || value === 'TRUE' || value === '1';
        }
        
        // Handle UUID (order_id) - keep as string
        if (columnName === 'order_id') {
          return value;
        }
        
        // Handle dates - convert DD/MM/YYYY HH:MM to PostgreSQL format
        if (columnName === 'order_dt') {
          // Format: "01/01/2023 13:39" -> "2023-01-01 13:39:00"
          if (value && typeof value === 'string' && value.includes('/')) {
            const [datePart, timePart] = value.split(' ');
            const [day, month, year] = datePart.split('/');
            const time = timePart || '00:00';
            return `${year}-${month}-${day} ${time}:00`;
          }
          return value;
        }
        
        // Handle numeric values (but not order_id which is UUID)
        if (columnName.includes('price') || columnName.includes('total') || 
            columnName.includes('quantity') || 
            columnName === 'dow' || columnName === 'order_line_no' || 
            columnName === 'store_id' || columnName === 'customer_id' || 
            columnName === 'staff_id') {
          return parseFloat(value);
        }
        
        return value;
      }
    });

    console.log(`   Found ${records.length} rows to import`);

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'sale' 
        AND table_name = 'raw_order_items'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.error("   ❌ Error: sale.raw_order_items table does not exist!");
      console.error("   Please run schema creation first.");
      return;
    }

    // Clear existing data
    console.log("   Clearing existing data...");
    await pool.query("TRUNCATE TABLE sale.raw_order_items CASCADE");

    // Insert in batches
    const batchSize = 1000;
    let imported = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const placeholders = batch.map((_, idx) => {
        const base = idx * 19;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19})`;
      }).join(', ');

      const values = batch.flatMap(row => [
        row.order_id || null,
        row.order_line_no || null,
        row.store_id || null,
        row.order_dt || null,
        row.dow || null,
        row.is_weekend || null,
        row.channel || null,
        row.payment_method || null,
        row.customer_id || null,
        row.staff_id || null,
        row.holiday_tag || null,
        row.is_refund || null,
        row.item_sku || null,
        row.item_name || null,
        row.category || null,
        row.unit_price_gbp || null,
        row.quantity || null,
        row.line_total_gbp || null,
        row.promo_code || null
      ]);

      await pool.query(
        `INSERT INTO sale.raw_order_items (
          order_id, order_line_no, store_id, order_dt, dow, is_weekend,
          channel, payment_method, customer_id, staff_id, holiday_tag,
          is_refund, item_sku, item_name, category, unit_price_gbp,
          quantity, line_total_gbp, promo_code
        ) VALUES ${placeholders}`,
        values
      );

      imported += batch.length;
      const progress = ((imported / records.length) * 100).toFixed(1);
      console.log(`   ✓ Imported ${imported}/${records.length} rows (${progress}%)`);
    }

    console.log("   ✅ CSV import complete!");
    
  } catch (error) {
    console.error("   ❌ CSV import failed:", error.message);
    throw error;
  }
}

async function transformData() {
  console.log("\n🔄 Transforming data into normalized tables...");
  
  // First ensure search_path is set
  await pool.query("SET search_path TO sale");
  
  const transformSql = `

    -- Populate channels
    INSERT INTO channels (channel_name)
    SELECT DISTINCT channel
    FROM raw_order_items
    WHERE channel IS NOT NULL
      AND channel NOT IN (SELECT channel_name FROM channels)
    ORDER BY channel;

    -- Populate payment_methods
    INSERT INTO payment_methods (payment_method_name)
    SELECT DISTINCT payment_method
    FROM raw_order_items
    WHERE payment_method IS NOT NULL
      AND payment_method NOT IN (SELECT payment_method_name FROM payment_methods)
    ORDER BY payment_method;

    -- Populate menu_categories
    INSERT INTO menu_categories (category_name)
    SELECT DISTINCT category
    FROM raw_order_items
    WHERE category IS NOT NULL
      AND category NOT IN (SELECT category_name FROM menu_categories)
    ORDER BY category;

    -- Populate menu_items
    INSERT INTO menu_items (item_sku, item_name, category_id, default_price_gbp)
    SELECT
        r.item_sku,
        r.item_name,
        mc.category_id,
        MAX(r.unit_price_gbp) AS default_price
    FROM raw_order_items r
    JOIN menu_categories mc ON mc.category_name = r.category
    WHERE r.item_sku IS NOT NULL
      AND r.item_sku NOT IN (SELECT item_sku FROM menu_items)
    GROUP BY r.item_sku, r.item_name, mc.category_id
    ORDER BY r.item_sku;

    -- Populate promotions
    INSERT INTO promotions (promo_code, description)
    SELECT DISTINCT
        promo_code,
        CASE promo_code
            WHEN '10OFF' THEN '£10 off qualifying orders'
            WHEN '15OFF' THEN '£15 off qualifying orders'
            WHEN '20OFF' THEN '£20 off qualifying orders'
            ELSE 'Promotional discount'
        END
    FROM raw_order_items
    WHERE promo_code IS NOT NULL
      AND promo_code NOT IN (SELECT promo_code FROM promotions)
    ORDER BY promo_code;

    -- Populate holidays
    INSERT INTO holidays (holiday_tag, description)
    SELECT DISTINCT
        holiday_tag,
        INITCAP(REPLACE(holiday_tag, '_', ' '))
    FROM raw_order_items
    WHERE holiday_tag IS NOT NULL
      AND holiday_tag NOT IN (SELECT holiday_tag FROM holidays)
    ORDER BY holiday_tag;

    -- Populate customers
    INSERT INTO customers (customer_id, loyalty_segment)
    SELECT DISTINCT
        customer_id,
        CASE ABS(customer_id) % 4
            WHEN 0 THEN 'Platinum'
            WHEN 1 THEN 'Gold'
            WHEN 2 THEN 'Silver'
            ELSE 'Bronze'
        END
    FROM raw_order_items
    WHERE customer_id IS NOT NULL
      AND customer_id NOT IN (SELECT customer_id FROM customers)
    ORDER BY customer_id;

    -- Populate staff
    WITH distinct_staff AS (
        SELECT DISTINCT staff_id
        FROM raw_order_items
        WHERE staff_id IS NOT NULL
          AND staff_id NOT IN (SELECT staff_id FROM staff)
    ),
    generated_staff AS (
        SELECT
            staff_id,
            (ARRAY['Amelia','Oliver','Isla','Leo','Mia','Noah','Sofia','Ethan','Ava','Lucas'])
                [((staff_id - 1) % 10) + 1] AS first_name,
            (ARRAY['Patel','Hussain','Smith','Williams','Zhang','Khan','Brown','Garcia','Singh','Taylor'])
                [((staff_id - 1) % 10) + 1] AS last_name,
            CASE staff_id % 4
                WHEN 0 THEN 'Supervisor'
                WHEN 1 THEN 'Server'
                WHEN 2 THEN 'Chef'
                ELSE 'Bartender'
            END AS role,
            DATE '2020-01-01' + ((staff_id % 730)) * INTERVAL '1 day' AS hire_date
        FROM distinct_staff
    )
    INSERT INTO staff (staff_id, first_name, last_name, role, hire_date)
    SELECT staff_id, first_name, last_name, role, hire_date::date
    FROM generated_staff
    ORDER BY staff_id;

    -- Populate orders
    INSERT INTO orders (
        order_id,
        store_id,
        channel_id,
        payment_method_id,
        order_dt,
        dow,
        is_weekend,
        customer_id,
        staff_id,
        holiday_tag,
        promo_code,
        item_count,
        subtotal_gbp,
        refund_total_gbp,
        net_total_gbp,
        is_refund_order
    )
    SELECT
        r.order_id,
        r.store_id,
        ch.channel_id,
        pm.payment_method_id,
        MIN(r.order_dt) AS order_dt,
        MIN(r.dow) AS dow,
        bool_or(r.is_weekend) AS is_weekend,
        MAX(r.customer_id) AS customer_id,
        MAX(r.staff_id) AS staff_id,
        MAX(r.holiday_tag) AS holiday_tag,
        MAX(r.promo_code) AS promo_code,
        SUM(r.quantity) AS item_count,
        SUM(CASE WHEN NOT r.is_refund THEN r.line_total_gbp ELSE 0 END) AS subtotal_gbp,
        SUM(CASE WHEN r.is_refund THEN r.line_total_gbp ELSE 0 END) AS refund_total_gbp,
        SUM(r.line_total_gbp) AS net_total_gbp,
        bool_or(r.is_refund) AS is_refund_order
    FROM raw_order_items r
    JOIN channels ch ON ch.channel_name = r.channel
    JOIN payment_methods pm ON pm.payment_method_name = r.payment_method
    WHERE r.order_id NOT IN (SELECT order_id FROM orders)
    GROUP BY r.order_id, r.store_id, ch.channel_id, pm.payment_method_id;

    -- Populate order_items
    INSERT INTO order_items (
        order_id,
        order_line_no,
        menu_item_id,
        quantity,
        unit_price_gbp,
        line_total_gbp,
        is_refund
    )
    SELECT
        r.order_id,
        r.order_line_no,
        mi.menu_item_id,
        r.quantity,
        r.unit_price_gbp,
        r.line_total_gbp,
        r.is_refund
    FROM raw_order_items r
    JOIN menu_items mi ON mi.item_sku = r.item_sku
    WHERE (r.order_id, r.order_line_no) NOT IN (
        SELECT order_id, order_line_no FROM order_items
    )
    ORDER BY r.order_id, r.order_line_no;

    -- Refresh materialized views (if they exist)
    -- These will be created during schema creation, refresh them if they exist
  `;

  await executeSql(transformSql, "Data transformation");
  
  // Refresh materialized views separately (they might not exist yet)
  try {
    await pool.query("REFRESH MATERIALIZED VIEW IF EXISTS sale.order_daily_summary");
    await pool.query("REFRESH MATERIALIZED VIEW IF EXISTS sale.category_performance");
  } catch (error) {
    console.log("   ⚠️  Materialized views not yet created, will be available after schema is complete");
  }
  
  // Analyze tables
  try {
    await pool.query("ANALYZE sale.orders, sale.order_items, sale.menu_items");
  } catch (error) {
    // Ignore analyze errors
  }
}

async function verifyData() {
  console.log("\n🔍 Verifying data import...");
  
  try {
    // Set search_path
    await pool.query("SET search_path TO sale");
    
    const checks = [
      { name: "raw_order_items", query: "SELECT COUNT(*) as count FROM raw_order_items" },
      { name: "orders", query: "SELECT COUNT(*) as count FROM orders" },
      { name: "order_items", query: "SELECT COUNT(*) as count FROM order_items" },
      { name: "customers", query: "SELECT COUNT(*) as count FROM customers" },
      { name: "menu_items", query: "SELECT COUNT(*) as count FROM menu_items" },
      { name: "stores", query: "SELECT COUNT(*) as count FROM stores" }
    ];

    for (const check of checks) {
      try {
        const result = await pool.query(check.query);
        const count = result.rows[0].count;
        console.log(`   ✓ ${check.name}: ${count} rows`);
      } catch (error) {
        console.log(`   ⚠️  ${check.name}: table not found or error - ${error.message.split('\n')[0]}`);
      }
    }

    // Test a sample query
    try {
      const sampleQuery = await pool.query(`
        SELECT 
          s.store_name,
          COUNT(o.order_id) as order_count,
          SUM(o.net_total_gbp) as total_revenue
        FROM orders o
        JOIN stores s ON s.store_id = o.store_id
        GROUP BY s.store_name
        ORDER BY total_revenue DESC
        LIMIT 3
      `);

      console.log("\n   📊 Sample query results:");
      sampleQuery.rows.forEach(row => {
        console.log(`      ${row.store_name}: ${row.order_count} orders, £${parseFloat(row.total_revenue).toFixed(2)} revenue`);
      });
    } catch (error) {
      console.log(`   ⚠️  Sample query failed: ${error.message.split('\n')[0]}`);
    }

    console.log("\n   ✅ Database verification complete!");
    
  } catch (error) {
    console.error("   ❌ Verification failed:", error.message);
    // Don't throw - verification is informational
  }
}

async function main() {
  console.log("🚀 Starting database seeding process...");
  console.log(`📡 Connecting to: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    // Test connection
    console.log("\n🔌 Testing database connection...");
    await pool.query("SELECT 1");
    console.log("   ✅ Connection successful!");

    // Step 1: Create schema
    // Set search_path first
    await pool.query("SET search_path TO sale");
    
    const schemaSql = readFileSync(join(__dirname, "../../docker/saleup/init.sql"), "utf-8");
    await executeSql(schemaSql, "Creating database schema");
    
    // Ensure search_path is still set
    await pool.query("SET search_path TO sale");

    // Step 2: Import CSV data
    await importCsvData();

    // Step 3: Transform data
    await transformData();

    // Step 4: Verify
    await verifyData();

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Test your backend API: GET /schema");
    console.log("   2. Try a query: POST /nl-query with a question");
    console.log("   3. Check insights: GET /insights");
    
  } catch (error) {
    console.error("\n❌ Seeding failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
