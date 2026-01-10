SET client_encoding = 'UTF8';
SET datestyle = 'ISO, DMY';
SET timezone = 'UTC';

CREATE SCHEMA IF NOT EXISTS sale;
SET search_path TO sale;

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
);

COPY raw_order_items
FROM '/docker-entrypoint-initdb.d/data.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');

CREATE TABLE stores (
    store_id SMALLINT PRIMARY KEY,
    store_name TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    opened_on DATE NOT NULL
);

INSERT INTO stores (store_id, store_name, city, region, opened_on) VALUES
    (1, 'Shoreditch High Street', 'London', 'East London', '2017-04-01'),
    (2, 'Camden Lock Market', 'London', 'North London', '2018-06-15'),
    (3, 'Brixton Village', 'London', 'South London', '2019-02-10'),
    (4, 'Soho Theatre District', 'London', 'Central London', '2020-09-05'),
    (5, 'Canary Riverside', 'London', 'Docklands', '2021-11-20');

CREATE TABLE channels (
    channel_id SERIAL PRIMARY KEY,
    channel_name TEXT UNIQUE NOT NULL
);

INSERT INTO channels (channel_name)
SELECT DISTINCT channel
FROM raw_order_items
WHERE channel IS NOT NULL
ORDER BY channel;

CREATE TABLE payment_methods (
    payment_method_id SERIAL PRIMARY KEY,
    payment_method_name TEXT UNIQUE NOT NULL
);

INSERT INTO payment_methods (payment_method_name)
SELECT DISTINCT payment_method
FROM raw_order_items
WHERE payment_method IS NOT NULL
ORDER BY payment_method;

CREATE TABLE menu_categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT UNIQUE NOT NULL
);

INSERT INTO menu_categories (category_name)
SELECT DISTINCT category
FROM raw_order_items
WHERE category IS NOT NULL
ORDER BY category;

CREATE TABLE menu_items (
    menu_item_id SERIAL PRIMARY KEY,
    item_sku TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES menu_categories (category_id),
    default_price_gbp NUMERIC(8,2) NOT NULL
);

INSERT INTO menu_items (item_sku, item_name, category_id, default_price_gbp)
SELECT
    r.item_sku,
    r.item_name,
    mc.category_id,
    MAX(r.unit_price_gbp) AS default_price
FROM raw_order_items r
JOIN menu_categories mc ON mc.category_name = r.category
GROUP BY r.item_sku, r.item_name, mc.category_id
ORDER BY r.item_sku;

CREATE TABLE promotions (
    promo_code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    min_order_total_gbp NUMERIC(10,2) NOT NULL DEFAULT 25.00
);

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
ORDER BY promo_code;

CREATE TABLE holidays (
    holiday_tag TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT INTO holidays (holiday_tag, description)
SELECT DISTINCT
    holiday_tag,
    INITCAP(REPLACE(holiday_tag, '_', ' '))
FROM raw_order_items
WHERE holiday_tag IS NOT NULL
ORDER BY holiday_tag;

CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    loyalty_segment TEXT NOT NULL,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE
);

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
ORDER BY customer_id;

CREATE TABLE staff (
    staff_id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    hire_date DATE NOT NULL
);

WITH distinct_staff AS (
    SELECT DISTINCT staff_id
    FROM raw_order_items
    WHERE staff_id IS NOT NULL
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
);

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
GROUP BY r.order_id, r.store_id, ch.channel_id, pm.payment_method_id;

CREATE TABLE order_items (
    order_id UUID NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    order_line_no SMALLINT NOT NULL,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items (menu_item_id),
    quantity SMALLINT NOT NULL,
    unit_price_gbp NUMERIC(8,2) NOT NULL,
    line_total_gbp NUMERIC(10,2) NOT NULL,
    is_refund BOOLEAN NOT NULL,
    PRIMARY KEY (order_id, order_line_no)
);

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
ORDER BY r.order_id, r.order_line_no;

CREATE MATERIALIZED VIEW order_daily_summary AS
SELECT
    DATE_TRUNC('day', order_dt)::date AS order_date,
    store_id,
    SUM(item_count) AS total_items,
    SUM(net_total_gbp) AS net_revenue_gbp,
    SUM(CASE WHEN is_refund_order THEN net_total_gbp ELSE 0 END) AS total_refund_value_gbp,
    COUNT(*) AS order_count
FROM orders
GROUP BY DATE_TRUNC('day', order_dt)::date, store_id
ORDER BY order_date, store_id;

CREATE MATERIALIZED VIEW category_performance AS
SELECT
    mc.category_name,
    DATE_TRUNC('month', o.order_dt)::date AS month_start,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.line_total_gbp) AS revenue_gbp
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
JOIN menu_categories mc ON mc.category_id = mi.category_id
WHERE NOT oi.is_refund
GROUP BY mc.category_name, DATE_TRUNC('month', o.order_dt)::date
ORDER BY month_start, mc.category_name;

CREATE INDEX idx_orders_store_date ON orders (store_id, order_dt);
CREATE INDEX idx_orders_channel ON orders (channel_id);
CREATE INDEX idx_order_items_menu_item ON order_items (menu_item_id);

ANALYZE;

DROP TABLE raw_order_items;

