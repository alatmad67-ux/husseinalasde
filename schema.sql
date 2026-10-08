-- ==============================================================================
-- مركز حسين الاسدي - Enterprise Lubricants POS & Service Management System
-- PostgreSQL / Supabase Complete DDL Schema with Real-time Inventory Deductions
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(25) NOT NULL UNIQUE,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. VEHICLES TABLE (with unique windshield sticker QR token)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    make_model VARCHAR(100) NOT NULL,           -- e.g., Toyota Camry, Hyundai Elantra
    year INTEGER CHECK (year BETWEEN 1970 AND 2100),
    engine_size VARCHAR(50),                     -- e.g., 2.5L 4-Cyl, 3.5L V6
    plate_number VARCHAR(50) NOT NULL UNIQUE,    -- رقم اللوحة (بغداد، أربيل، خصوصي، إلخ)
    preferred_viscosity VARCHAR(20),             -- e.g., 5W30, 0W20
    preferred_oil_volume NUMERIC(5, 2),          -- سعة الزيت مع الفلتر (e.g. 4.3L)
    filter_code VARCHAR(50),                     -- e.g., 90915-YZZE2, W68
    qr_token VARCHAR(64) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCTS & FLUID INVENTORY TABLE
-- Supports: Package size (e.g., 1L, 4L, 5L, 208L drum) and loose fractional liters in bulk pool
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100),                          -- e.g., Mobil 1, Castrol, Liqui Moly
    category VARCHAR(50) NOT NULL CHECK (
        category IN ('engine_oil', 'gear_oil', 'filter', 'coolant', 'additive', 'service_fee')
    ),
    viscosity VARCHAR(30),                       -- e.g., 5W30, 0W20, 10W40, 20W50, 75W90
    part_code VARCHAR(80),                       -- رقم القطعة / كود الفلتر
    package_size_liters NUMERIC(6, 2) DEFAULT 1.00, -- سعة العبوة الأصلية
    total_liters_in_stock NUMERIC(10, 2) DEFAULT 0.00 CHECK (total_liters_in_stock >= 0), -- الرصيد الفعلي الإجمالي باللترات
    low_stock_threshold NUMERIC(10, 2) DEFAULT 10.00,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. SERVICE VISITS (Workshop Oil Change Counter)
CREATE TABLE IF NOT EXISTS service_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    visit_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    current_odometer INTEGER NOT NULL CHECK (current_odometer >= 0),
    next_odometer INTEGER NOT NULL CHECK (next_odometer > current_odometer),
    oil_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    oil_liters_used NUMERIC(6, 2) DEFAULT 0.00 CHECK (oil_liters_used >= 0),
    filter_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    gear_oil_notes TEXT,                         -- فحص أو تبديل دهن الگير
    tech_notes TEXT,                             -- ملاحظات الفني (تبخير رنكات، تنقيص زيت، نضح صوفة)
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    debt_amount NUMERIC(12, 2) GENERATED ALWAYS AS (total_price - paid_amount) STORED,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. DIRECT COUNTER SALES (Walk-in quick sales)
CREATE TABLE IF NOT EXISTS direct_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    sale_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    invoice_number VARCHAR(50) UNIQUE DEFAULT 'DS-' || to_char(CURRENT_TIMESTAMP, 'YYMMDDHH24MISS'),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    debt_amount NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. SALE ITEMS (Line-item items for service visits and direct sales)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    direct_sale_id UUID REFERENCES direct_sales(id) ON DELETE CASCADE,
    service_visit_id UUID REFERENCES service_visits(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(8, 2) NOT NULL CHECK (quantity > 0), -- Liters (for oil/coolant) or pieces (for filters/additives)
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    CONSTRAINT chk_sale_origin CHECK (
        (direct_sale_id IS NOT NULL AND service_visit_id IS NULL) OR
        (direct_sale_id IS NULL AND service_visit_id IS NOT NULL)
    )
);

-- 7. CUSTOMER DEBT PAYMENTS
CREATE TABLE IF NOT EXISTS debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method VARCHAR(50) DEFAULT 'CASH', -- CASH, ZAIN_CASH, QI_CARD
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- AUTOMATIC FRACTIONAL INVENTORY DEDUCTION TRIGGER
-- Handles both service visit fluid dispensing & direct sales
-- ==============================================================================

CREATE OR REPLACE FUNCTION process_inventory_deduction()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock is sufficient
    IF (SELECT total_liters_in_stock FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
        RAISE EXCEPTION 'رصيد المخزون غير كافٍ للمنتج (ID: %). الكمية المتاحة أقل من المطلوب.', NEW.product_id;
    END IF;

    -- Deduct accurate fractional liters or piece count
    UPDATE products
    SET total_liters_in_stock = total_liters_in_stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_deduct_inventory_on_sale
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION process_inventory_deduction();

-- ==============================================================================
-- AUTOMATIC LOYALTY POINTS INCREMENT TRIGGER
-- Gives 10 points for every completed oil change service
-- ==============================================================================
CREATE OR REPLACE FUNCTION increment_loyalty_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers
    SET loyalty_points = loyalty_points + 10,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_loyalty_service_visit
AFTER INSERT ON service_visits
FOR EACH ROW
EXECUTE FUNCTION increment_loyalty_points();

-- ==============================================================================
-- CUSTOMER FINANCIAL LEDGER VIEW (Real-time Debt & Spend tracking)
-- ==============================================================================
CREATE OR REPLACE VIEW customer_financial_summary AS
SELECT 
    c.id AS customer_id,
    c.full_name,
    c.phone_number,
    c.loyalty_points,
    COALESCE(visit_totals.total_service_cost, 0) + COALESCE(direct_totals.total_direct_cost, 0) AS total_invoiced,
    COALESCE(visit_totals.total_service_paid, 0) + COALESCE(direct_totals.total_direct_paid, 0) + COALESCE(debt_totals.total_debt_payments, 0) AS total_paid,
    (COALESCE(visit_totals.total_service_cost, 0) + COALESCE(direct_totals.total_direct_cost, 0)) - 
    (COALESCE(visit_totals.total_service_paid, 0) + COALESCE(direct_totals.total_direct_paid, 0) + COALESCE(debt_totals.total_debt_payments, 0)) AS outstanding_debt
FROM customers c
LEFT JOIN (
    SELECT customer_id, SUM(total_price) AS total_service_cost, SUM(paid_amount) AS total_service_paid
    FROM service_visits GROUP BY customer_id
) visit_totals ON c.id = visit_totals.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(total_amount) AS total_direct_cost, SUM(paid_amount) AS total_direct_paid
    FROM direct_sales WHERE customer_id IS NOT NULL GROUP BY customer_id
) direct_totals ON c.id = direct_totals.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(amount_paid) AS total_debt_payments
    FROM debt_payments GROUP BY customer_id
) debt_totals ON c.id = debt_totals.customer_id;

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_qr ON vehicles(qr_token);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON service_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_vehicle ON service_visits(vehicle_id);
