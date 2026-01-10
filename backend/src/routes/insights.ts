import type { Request, Response } from "express";
import { pool } from "../db/pool.js";

export async function insightsHandler(_req: Request, res: Response): Promise<void> {
  const client = await pool.connect();

  try {
    const revenueByChannel = (
      await client.query<{
        channel: string;
        revenue_gbp: string;
      }>(`
        SELECT
          ch.channel_name AS channel,
          ROUND(SUM(oi.line_total_gbp)::numeric, 2) AS revenue_gbp
        FROM sale.order_items oi
        JOIN sale.orders o ON o.order_id = oi.order_id
        JOIN sale.channels ch ON ch.channel_id = o.channel_id
        WHERE oi.is_refund = FALSE
        GROUP BY ch.channel_name
        ORDER BY revenue_gbp DESC
      `)
    ).rows;

    const categoryPerformance = (
      await client.query<{
        category: string;
        revenue_gbp: string;
      }>(`
        SELECT
          mc.category_name AS category,
          ROUND(SUM(oi.line_total_gbp)::numeric, 2) AS revenue_gbp
        FROM sale.order_items oi
        JOIN sale.menu_items mi ON mi.menu_item_id = oi.menu_item_id
        JOIN sale.menu_categories mc ON mc.category_id = mi.category_id
        WHERE oi.is_refund = FALSE
        GROUP BY mc.category_name
        ORDER BY revenue_gbp DESC
      `)
    ).rows;

    const monthlyRevenue = (
      await client.query<{
        month: string;
        revenue_gbp: string;
      }>(`
        SELECT
          TO_CHAR(order_dt, 'YYYY-MM') AS month,
          ROUND(SUM(net_total_gbp)::numeric, 2) AS revenue_gbp
        FROM sale.orders
        WHERE is_refund_order = FALSE
        GROUP BY TO_CHAR(order_dt, 'YYYY-MM')
        ORDER BY month ASC
      `)
    ).rows;

    const topStores = (
      await client.query<{
        store_name: string;
        revenue_gbp: string;
        orders: number;
      }>(`
        SELECT
          s.store_name,
          ROUND(SUM(CASE WHEN o.is_refund_order = FALSE THEN o.net_total_gbp ELSE 0 END)::numeric, 2) AS revenue_gbp,
          COUNT(*) AS orders
        FROM sale.orders o
        JOIN sale.stores s ON s.store_id = o.store_id
        GROUP BY s.store_name
        ORDER BY revenue_gbp DESC
        LIMIT 5
      `)
    ).rows;

    res.json({
      revenueByChannel,
      categoryPerformance,
      monthlyRevenue,
      topStores
    });
  } catch (error) {
    console.error("Failed to load insights", error);
    res.status(500).json({ message: "Failed to load insights" });
  } finally {
    client.release();
  }
}

