-- Seed: create test user ashwithac22@gmail.com with role Administrator
-- Password: 12345 (bcrypt hash, rounds=10)
-- NOTE: This seed password intentionally does NOT meet the new complexity policy.
--       It is a one-time seeded login credential for development/testing only.
-- Safe to re-run: uses IF NOT EXISTS check.

IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'ashwithac22@gmail.com')
BEGIN
    INSERT INTO Users (username, email, password_hash, first_name, last_name, role, warehouse_id, status)
    VALUES (
        'ashwithac22',
        'ashwithac22@gmail.com',
        '$2b$10$4X.UAs78m.Uu2EhmakyY9.9HvZGw5RFaC2XUMu9cx/kZeXwwLvrpS',
        'Ashwitha',
        'C',
        'Administrator',
        NULL,
        'Active'
    );
    PRINT 'Seed user ashwithac22@gmail.com created successfully.';
END
ELSE
BEGIN
    PRINT 'Seed user ashwithac22@gmail.com already exists — skipped.';
END
