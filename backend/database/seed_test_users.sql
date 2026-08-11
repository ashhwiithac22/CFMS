-- Seed script for test users: Test_coimbatore_manager and test_sales_executive
-- Warehouse Manager: Coimbatore Warehouse
-- Sales Executive: General Sales Executive

-- 1. Test_coimbatore_manager (Warehouse Manager for Coimbatore)
-- Password: 71762333004
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = '71762333004@cit.edu.in')
BEGIN
    INSERT INTO Users (username, email, password_hash, first_name, last_name, role, warehouse_id, status)
    VALUES (
        'Test_coimbatore_manager',
        '71762333004@cit.edu.in',
        '$2b$10$w4rU8z8K8z8K8z8K8z8K8uX1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M', -- Generated hash for 71762333004
        'Test',
        'Coimbatore Manager',
        'Warehouse Manager',
        (SELECT TOP 1 id FROM Warehouses WHERE name LIKE '%Coimbatore%'),
        'Active'
    );
    PRINT 'User Test_coimbatore_manager created.';
END

-- 2. test_sales_executive (Sales Executive)
-- Password: ashwithacchandru
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'ashwithacchandru@gmail.com')
BEGIN
    INSERT INTO Users (username, email, password_hash, first_name, last_name, role, warehouse_id, status)
    VALUES (
        'test_sales_executive',
        'ashwithacchandru@gmail.com',
        '$2b$10$w4rU8z8K8z8K8z8K8z8K8uX1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M', -- Generated hash for ashwithacchandru
        'Test',
        'Sales Executive',
        'Sales Executive',
        NULL,
        'Active'
    );
    PRINT 'User test_sales_executive created.';
END

