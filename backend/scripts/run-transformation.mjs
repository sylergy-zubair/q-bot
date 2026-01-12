#!/usr/bin/env node
import { Pool } from "pg";

const DATABASE_URL = "postgresql://qbot_user:kzLzGnyJ8Ixe3VQ7SUbUmoQluJRkeuuc@dpg-d5ijk5hr0fns73bag1t0-a.frankfurt-postgres.render.com/qbot";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function execute(statement, description) {
  try {
    const result = await pool.query(statement);
    console.log(`   ✓ ${description} (${result.rowCount || 0} rows)`);
  } catch (error) {
    console.error(`   ❌ ${description}: ${error.message.split('\n')[0]}`);
    throw error;
  }
}

async function main() {
  console.log("🔄 Transforming data into normalized tables...\n");
  
  try {
    await pool.query("SET search_path TO sale");
    
    // Populate lookup tables from raw_order_items
    await execute(`
      INSERT INTO channels (channel_name)
      SELECT DISTINCT channel
      FROM raw_order_items
      WHERE channel IS NOT NULL
        AND channel NOT IN (SELECT channel_name FROM channels)
      ORDER BY channel
    `, "Populated channels");
    
    await execute(`
      INSERT INTO payment_methods (payment_method_name)
      SELECT DISTINCT payment_method
      FROM raw_order_items
      WHERE payment_method IS NOT NULL
        AND payment_method NOT IN (SELECT payment_method_name FROM payment_methods)
      ORDER BY payment_method
    `, "Populated payment_methods");
    
    await execute(`
      INSERT INTO menu_categories (category_name)
      SELECT DISTINCT category
      FROM raw_order_items
      WHERE category IS NOT NULL
        AND category NOT IN (SELECT category_name FROM menu_categories)
      ORDER BY category
    `, "Populated menu_categories");
    
    await execute(`
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
      ORDER BY r.item_sku
    `, "Populated menu_items");
    
    await execute(`
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
      ORDER BY promo_code
    `, "Populated promotions");
    
    await execute(`
      INSERT INTO holidays (holiday_tag, description)
      SELECT DISTINCT
        holiday_tag,
        INITCAP(REPLACE(holiday_tag, '_', ' '))
      FROM raw_order_items
      WHERE holiday_tag IS NOT NULL
        AND holiday_tag NOT IN (SELECT holiday_tag FROM holidays)
      ORDER BY holiday_tag
    `, "Populated holidays");
    
    await execute(`
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
      ORDER BY customer_id
    `, "Populated customers");
    
    await execute(`
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
      ORDER BY staff_id
    `, "Populated staff");
    
    await execute(`
      INSERT INTO orders (
        order_id, store_id, channel_id, payment_method_id, order_dt, dow, is_weekend,
        customer_id, staff_id, holiday_tag, promo_code, item_count,
        subtotal_gbp, refund_total_gbp, net_total_gbp, is_refund_order
      )
      SELECT
        r.order_id, r.store_id, ch.channel_id, pm.payment_method_id,
        MIN(r.order_dt) AS order_dt, MIN(r.dow) AS dow, 
        COALESCE(bool_or(r.is_weekend), false) AS is_weekend,
        MAX(r.customer_id) AS customer_id, MAX(r.staff_id) AS staff_id,
        MAX(r.holiday_tag) AS holiday_tag, MAX(r.promo_code) AS promo_code,
        COALESCE(SUM(r.quantity), 0) AS item_count,
        COALESCE(SUM(CASE WHEN NOT r.is_refund THEN r.line_total_gbp ELSE 0 END), 0) AS subtotal_gbp,
        COALESCE(SUM(CASE WHEN r.is_refund THEN r.line_total_gbp ELSE 0 END), 0) AS refund_total_gbp,
        COALESCE(SUM(r.line_total_gbp), 0) AS net_total_gbp,
        COALESCE(bool_or(r.is_refund), false) AS is_refund_order
      FROM raw_order_items r
      JOIN channels ch ON ch.channel_name = r.channel
      JOIN payment_methods pm ON pm.payment_method_name = r.payment_method
      WHERE r.order_id NOT IN (SELECT order_id FROM orders)
      GROUP BY r.order_id, r.store_id, ch.channel_id, pm.payment_method_id
    `, "Populated orders");
    
    await execute(`
      INSERT INTO order_items (
        order_id, order_line_no, menu_item_id, quantity,
        unit_price_gbp, line_total_gbp, is_refund
      )
      SELECT
        r.order_id, r.order_line_no, mi.menu_item_id,
        r.quantity, r.unit_price_gbp, r.line_total_gbp, 
        COALESCE(r.is_refund, false) AS is_refund
      FROM raw_order_items r
      JOIN menu_items mi ON mi.item_sku = r.item_sku
      WHERE (r.order_id, r.order_line_no) NOT IN (
        SELECT order_id, order_line_no FROM order_items
      )
      ORDER BY r.order_id, r.order_line_no
    `, "Populated order_items");
    
    // Get final counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM order_items) as order_items,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM channels) as channels
    `);
    
    console.log("\n📊 Final counts:");
    console.log(counts.rows[0]);
    
    console.log("\n✅ Transformation complete!");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
