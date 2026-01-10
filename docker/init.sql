CREATE SCHEMA IF NOT EXISTS sales;

CREATE TABLE sales.customers (
    customer_id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    city TEXT,
    state TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sales.products (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE sales.orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES sales.customers(customer_id),
    order_date DATE NOT NULL,
    status TEXT NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL
);

CREATE TABLE sales.order_items (
    order_id INTEGER NOT NULL REFERENCES sales.orders(order_id),
    product_id INTEGER NOT NULL REFERENCES sales.products(product_id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

INSERT INTO sales.customers (first_name, last_name, email, city, state)
VALUES
    ('Alice', 'Johnson', 'alice.johnson@example.com', 'Seattle', 'WA'),
    ('Bob', 'Martinez', 'bob.martinez@example.com', 'Austin', 'TX'),
    ('Carol', 'Nguyen', 'carol.nguyen@example.com', 'Chicago', 'IL'),
    ('Daniel', 'Lee', 'daniel.lee@example.com', 'New York', 'NY');

INSERT INTO sales.products (product_name, category, unit_price)
VALUES
    ('Wireless Mouse', 'Accessories', 24.99),
    ('Mechanical Keyboard', 'Accessories', 89.99),
    ('USB-C Hub', 'Accessories', 54.50),
    ('27-inch Monitor', 'Displays', 299.00),
    ('Noise Cancelling Headphones', 'Audio', 199.99);

INSERT INTO sales.orders (customer_id, order_date, status, total_amount)
VALUES
    (1, '2024-06-01', 'shipped', 349.98),
    (2, '2024-06-03', 'processing', 89.99),
    (3, '2024-06-04', 'delivered', 523.49),
    (1, '2024-06-07', 'delivered', 124.49);

INSERT INTO sales.order_items (order_id, product_id, quantity, unit_price)
VALUES
    (1, 1, 2, 24.99),
    (1, 2, 1, 89.99),
    (1, 4, 1, 299.00),
    (2, 2, 1, 89.99),
    (3, 4, 1, 299.00),
    (3, 5, 1, 199.99),
    (3, 3, 1, 24.50),
    (4, 1, 1, 24.99),
    (4, 3, 1, 54.50),
    (4, 5, 1, 199.00);

GRANT SELECT ON ALL TABLES IN SCHEMA sales TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO PUBLIC;

