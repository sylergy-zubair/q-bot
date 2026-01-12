#!/usr/bin/env node
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://qbot_user:kzLzGnyJ8Ixe3VQ7SUbUmoQluJRkeuuc@dpg-d5ijk5hr0fns73bag1t0-a.frankfurt-postgres.render.com/qbot";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query("SET search_path TO sale");
    
    // Create orders table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
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
    `);
    
    console.log("✅ Orders table created/verified");
    
    // Now run the transformation again
    await pool.query(`
      INSERT INTO orders (
        order_id, store_id, channel_id, payment_method_id, order_dt, dow, is_weekend,
        customer_id, staff_id, holiday_tag, promo_code, item_count,
        subtotal_gbp, refund_total_gbp, net_total_gbp, is_refund_order
      )
      SELECT
        r.order_id, r.store_id, ch.channel_id, pm.payment_method_id,
        MIN(r.order_dt) AS order_dt, MIN(r.dow) AS dow, bool_or(r.is_weekend) AS is_weekend,
        MAX(r.customer_id) AS customer_id, MAX(r.staff_id) AS staff_id,
        MAX(r.holiday_tag) AS holiday_tag, MAX(r.promo_code) AS promo_code,
        SUM(r.quantity) AS item_count,
        SUM(CASE WHEN NOT r.is_refund THEN r.line_total_gbp ELSE 0 END) AS subtotal_gbp,
        SUM(CASE WHEN r.is_refund THEN r.line_total_gbp ELSE 0 END) AS refund_total_gbp,
        SUM(r.line_total_gbp) AS net_total_gbp,
        bool_or(r.is_refund) AS is_refund_order
      FROM raw_order_items r
      JOIN channels ch ON ch.channel_name = r.channel
      JOIN payment_methods pm ON pm.payment_method_name = r.payment_method
      WHERE r.order_id NOT IN (SELECT order_id FROM orders)
      GROUP BY r.order_id, r.store_id, ch.channel_id, pm.payment_method_id
    `);
    
    console.log("✅ Orders populated");
    
    // Populate order_items
    await pool.query(`
      INSERT INTO order_items (
        order_id, order_line_no, menu_item_id, quantity,
        unit_price_gbp, line_total_gbp, is_refund
      )
      SELECT
        r.order_id, r.order_line_no, mi.menu_item_id,
        r.quantity, r.unit_price_gbp, r.line_total_gbp, r.is_refund
      FROM raw_order_items r
      JOIN menu_items mi ON mi.item_sku = r.item_sku
      WHERE (r.order_id, r.order_line_no) NOT IN (
        SELECT order_id, order_line_no FROM order_items
      )
    `);
    
    console.log("✅ Order items populated");
    
    // Check counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM order_items) as order_items,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM menu_items) as menu_items
    `);
    
    console.log("\n📊 Final counts:");
    console.log(counts.rows[0]);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
