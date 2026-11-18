CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    account_id VARCHAR(32) NOT NULL,
    recipient VARCHAR(80) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at DESC);

INSERT INTO payments (id, account_id, recipient, amount, status, created_at) VALUES
    ('10000000-0000-0000-0000-000000000001', 'ACC-1001', 'Cloud Hosting (demo)', 2499.00, 'SIMULATED', NOW() - INTERVAL '2 days'),
    ('10000000-0000-0000-0000-000000000002', 'ACC-1002', 'Test Vendor (demo)', 899.00, 'SIMULATED', NOW() - INTERVAL '1 day'),
    ('10000000-0000-0000-0000-000000000003', 'ACC-1001', 'Training Lab (demo)', 1350.00, 'SIMULATED', NOW() - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;
