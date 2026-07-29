-- Seed Data Script for SQL Server Express
-- Seeds default Roles and Departments

-- Seed Roles
IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Administrator')
    INSERT INTO Roles (name, description) VALUES ('Administrator', 'System Administrator with full access');
IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Sales Executive')
    INSERT INTO Roles (name, description) VALUES ('Sales Executive', 'Sales team member who registers complaints');
IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Warehouse Team')
    INSERT INTO Roles (name, description) VALUES ('Warehouse Team', 'Warehouse staff resolving complaints');
IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Warehouse Manager')
    INSERT INTO Roles (name, description) VALUES ('Warehouse Manager', 'Warehouse manager managing resolution and escalations');

-- Seed Departments
IF NOT EXISTS (SELECT * FROM Departments WHERE name = 'Sales')
    INSERT INTO Departments (name, description) VALUES ('Sales', 'Sales Department');
IF NOT EXISTS (SELECT * FROM Departments WHERE name = 'Warehouse')
    INSERT INTO Departments (name, description) VALUES ('Warehouse', 'Warehouse Operations Department');
IF NOT EXISTS (SELECT * FROM Departments WHERE name = 'Administration')
    INSERT INTO Departments (name, description) VALUES ('Administration', 'Administration Department');
