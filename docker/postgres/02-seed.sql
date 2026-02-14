-- Seed data: 6 test applications (3 BR + 3 MX)
-- Note: document_id values are plain text here; encryption happens at the application layer.

-- ============================================================
-- BRAZIL (BR) - Amounts in BRL
-- ============================================================

-- BR #1: Pending application
INSERT INTO applications (country_code, full_name, document_id, requested_amount, monthly_income, status, bank_data)
VALUES (
    'BR',
    'Carlos Eduardo Silva',
    '12345678909',
    25000.00,
    8500.00,
    'pending',
    NULL
);

-- BR #2: Approved application
INSERT INTO applications (country_code, full_name, document_id, requested_amount, monthly_income, status, bank_data)
VALUES (
    'BR',
    'Ana Paula Oliveira',
    '98765432100',
    50000.00,
    15000.00,
    'approved',
    '{"bank_code": "001", "bank_name": "Banco do Brasil", "agency": "1234", "account": "56789-0", "account_type": "corrente", "pix_key": "ana.oliveira@email.com"}'::jsonb
);

-- BR #3: Rejected application
INSERT INTO applications (country_code, full_name, document_id, requested_amount, monthly_income, status, bank_data)
VALUES (
    'BR',
    'Ricardo Mendes Ferreira',
    '11122233344',
    120000.00,
    4200.00,
    'rejected',
    '{"bank_code": "341", "bank_name": "Itau Unibanco", "agency": "0987", "account": "12345-6", "account_type": "corrente", "pix_key": "11122233344"}'::jsonb
);

-- ============================================================
-- MEXICO (MX) - Amounts in MXN
-- ============================================================

-- MX #1: Pending application
INSERT INTO applications (country_code, full_name, document_id, requested_amount, monthly_income, status, bank_data)
VALUES (
    'MX',
    'Roberto Garcia Rodriguez',
    'GARC850101HDFRRL09',
    150000.00,
    45000.00,
    'pending',
    NULL
);

-- MX #2: Under review application
INSERT INTO applications (country_code, full_name, document_id, requested_amount, monthly_income, status, bank_data)
VALUES (
    'MX',
    'Maria Fernanda Lopez Perez',
    'LOPE900215MMCLPR01',
    80000.00,
    32000.00,
    'under_review',
    NULL
);

-- MX #3: Approved application
INSERT INTO applications (country_code, full_name, document_id, requested_amount, monthly_income, status, bank_data)
VALUES (
    'MX',
    'Jorge Antonio Martinez Hernandez',
    'MART880520HDFRRN03',
    200000.00,
    65000.00,
    'approved',
    '{"bank_name": "BBVA Mexico", "clabe": "012345678901234567", "account": "0123456789", "card_number_last4": "4532", "rfc": "MAHJ880520AB1"}'::jsonb
);
