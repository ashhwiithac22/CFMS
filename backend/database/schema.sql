-- DDL Schema Script for SQL Server Express
-- Creates Tables: Roles, Departments, Users, AuditLogs

-- Roles Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Roles' and xtype='U')
BEGIN
    CREATE TABLE Roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255) NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- Departments Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Departments' and xtype='U')
BEGIN
    CREATE TABLE Departments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description VARCHAR(255) NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- Users Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role_id INT FOREIGN KEY REFERENCES Roles(id),
        department_id INT FOREIGN KEY REFERENCES Departments(id) NULL,
        refresh_token VARCHAR(500) NULL,
        reset_token VARCHAR(255) NULL,
        reset_token_expiry DATETIME NULL,
        status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Suspended'
        theme_preference VARCHAR(10) DEFAULT 'light',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;

-- Migration check to add theme_preference if Users table exists without it
IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'theme_preference')
    BEGIN
        ALTER TABLE Users ADD theme_preference VARCHAR(10) DEFAULT 'light';
    END;
END;

-- AuditLogs Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLogs' and xtype='U')
BEGIN
    CREATE TABLE AuditLogs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT FOREIGN KEY REFERENCES Users(id) ON DELETE SET NULL NULL,
        action VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'REGISTER'
        ip_address VARCHAR(45) NOT NULL,
        user_agent VARCHAR(255) NOT NULL,
        details VARCHAR(500) NULL,
        timestamp DATETIME DEFAULT GETDATE()
    );
END;

-- Messages Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Messages' and xtype='U')
BEGIN
    CREATE TABLE Messages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        complaint_id VARCHAR(50) NOT NULL,
        sender_id INT NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        recipient_id INT NULL,
        recipient_role VARCHAR(50) NULL,
        message_text NVARCHAR(MAX) NOT NULL,
        read_status VARCHAR(20) DEFAULT 'Unread', -- 'Unread', 'Read'
        created_at DATETIME DEFAULT GETDATE()
    );
END;
