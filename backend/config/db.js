const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { execSync } = require('child_process');
require('dotenv').config();

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  options: {
    instanceName: process.env.DB_INSTANCE || undefined,
    encrypt: true, // required for local SQL Server 2022 TLS handshake
    trustServerCertificate: true,
  }
};

function getDynamicSqlPort() {
  try {
    const cmd = 'powershell -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.OwningProcess -eq (Get-Process -Name sqlservr).Id } | Select-Object -ExpandProperty LocalPort"';
    const output = execSync(cmd).toString().trim();
    if (output) {
      const ports = output.split(/\r?\n/).map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
      if (ports.length > 0) {
        console.log(`Dynamically resolved SQL Server listening port(s): ${ports.join(', ')}`);
        return ports[0];
      }
    }
  } catch (err) {
    console.warn('Failed to dynamically resolve SQL Server port via PowerShell:', err.message);
  }
  return undefined;
}

let pool = null;

async function connectDB() {
  try {
    const dbName = process.env.DB_DATABASE || 'CustomerFeedbackDB';
    
    // Resolve dynamic port if not specified in env
    if (!baseConfig.port) {
      const dynamicPort = getDynamicSqlPort();
      if (dynamicPort) {
        baseConfig.port = dynamicPort;
        baseConfig.options.instanceName = undefined; // Disable instanceName to connect directly via resolved port
      }
    }

    console.log(`Connecting to master database at ${baseConfig.server}${baseConfig.port ? ':' + baseConfig.port : ''}...`);
    
    const masterConfig = { 
      ...baseConfig, 
      database: 'master',
    };
    
    // Connect to master database
    const masterPool = new sql.ConnectionPool(masterConfig);
    await masterPool.connect();
    console.log('Connected to master database successfully.');
    console.log(`Checking/Creating database "${dbName}"...`);
    
    // Create database if not exists
    await masterPool.request().query(`
      IF DB_ID('${dbName}') IS NULL
      BEGIN
        CREATE DATABASE [${dbName}];
      END
    `);
    console.log(`Database "${dbName}" verified/created successfully.`);
    
    // Close connection to master database
    await masterPool.close();
    
    // Connect to target database
    const targetConfig = {
      ...baseConfig,
      database: dbName
    };
    
    console.log(`Connecting to target database "${dbName}"...`);
    pool = new sql.ConnectionPool(targetConfig);
    await pool.connect();
    console.log(`Connected to target database "${dbName}" successfully.`);
    
    // Run schema and seed scripts
    await initializeDatabase();
    
    return pool;
  } catch (err) {
    console.error('Database connection / initialization failed:', err.message);
    throw err;
  }
}

async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute DDL schema statements
    await pool.request().query(schemaSql);
    console.log('Database schema verified.');
    
    console.log('Seeding initial roles & departments...');
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await pool.request().query(seedSql);
    console.log('Database seed roles and departments verified.');
    
    // Seed default Administrator user programmatically
    await seedAdministratorUser();
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  }
}

async function seedAdministratorUser() {
  try {
    // Find the Administrator role ID
    const roleResult = await pool.request()
      .input('roleName', sql.VarChar, 'Administrator')
      .query('SELECT id FROM Roles WHERE name = @roleName');
      
    if (roleResult.recordset.length === 0) {
      throw new Error('Administrator role not found. Seed Roles first.');
    }
    const adminRoleId = roleResult.recordset[0].id;
    
    // Find the Administration department ID
    const deptResult = await pool.request()
      .input('deptName', sql.VarChar, 'Administration')
      .query('SELECT id FROM Departments WHERE name = @deptName');
      
    if (deptResult.recordset.length === 0) {
      throw new Error('Administration department not found. Seed Departments first.');
    }
    const adminDeptId = deptResult.recordset[0].id;
    
    // Check if any admin exists
    const adminUserResult = await pool.request()
      .input('roleId', sql.Int, adminRoleId)
      .query('SELECT id FROM Users WHERE role_id = @roleId');
      
    if (adminUserResult.recordset.length === 0) {
      console.log('No Administrator user found. Seeding default administrator...');
      const adminEmail = 'admin@complaint.com';
      const password = 'Admin@123';
      const passwordHash = await bcrypt.hash(password, 10);
      
      await pool.request()
        .input('email', sql.VarChar, adminEmail)
        .input('password_hash', sql.VarChar, passwordHash)
        .input('first_name', sql.VarChar, 'System')
        .input('last_name', sql.VarChar, 'Admin')
        .input('role_id', sql.Int, adminRoleId)
        .input('department_id', sql.Int, adminDeptId)
        .input('status', sql.VarChar, 'Active')
        .query(`
          INSERT INTO Users (email, password_hash, first_name, last_name, role_id, department_id, status)
          VALUES (@email, @password_hash, @first_name, @last_name, @role_id, @department_id, @status)
        `);
      console.log(`Default Administrator seeded: email = ${adminEmail}, password = ${password}`);
    } else {
      console.log('Administrator user already exists.');
    }
  } catch (err) {
    console.error('Error seeding Administrator user:', err.message);
    throw err;
  }
}

function createMockPool() {
  const bcrypt = require('bcrypt');
  
  if (!global.mockDatabaseState) {
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    global.mockDatabaseState = {
      users: [
        {
          id: 1,
          email: 'admin@complaint.com',
          password_hash: adminHash,
          first_name: 'System',
          last_name: 'Admin',
          role_id: 1,
          department_id: 1,
          status: 'Active',
          refresh_token: null,
          theme_preference: 'dark',
          role_name: 'Administrator',
          department_name: 'Administration'
        }
      ],
      roles: [
        { id: 1, name: 'Administrator' },
        { id: 2, name: 'Warehouse Executive' }
      ],
      departments: [
        { id: 1, name: 'Administration' },
        { id: 2, name: 'Logistics' }
      ],
      messages: [
        {
          id: 1,
          complaint_id: 'CMP-0041',
          sender_id: 1,
          sender_role: 'Administrator',
          recipient_id: 2,
          recipient_role: 'Warehouse Team',
          message_text: 'Please verify the sizing mismatch of packaging labels.',
          read_status: 'Unread',
          created_at: new Date(Date.now() - 3600000),
          first_name: 'System',
          last_name: 'Admin'
        }
      ]
    };
  }

  const request = () => {
    const inputs = {};
    const reqObj = {
      input: (name, type, value) => {
        inputs[name] = value;
        return reqObj;
      },
      query: async (queryString) => {
        const queryNormalized = queryString.trim().replace(/\s+/g, ' ').toLowerCase();

        if (queryNormalized.includes('from users u') && queryNormalized.includes('email = @email')) {
          const user = global.mockDatabaseState.users.find(u => u.email.toLowerCase() === inputs.email?.toLowerCase());
          return { recordset: user ? [user] : [] };
        }

        if (queryNormalized.includes('from users u') && queryNormalized.includes('id = @id')) {
          const user = global.mockDatabaseState.users.find(u => u.id === inputs.id);
          return { recordset: user ? [user] : [] };
        }

        if (queryNormalized.includes('update users') && queryNormalized.includes('refresh_token = @token')) {
          const user = global.mockDatabaseState.users.find(u => u.id === inputs.id);
          if (user) {
            user.refresh_token = inputs.token;
          }
          return { recordset: [] };
        }

        if (queryNormalized.includes('update users') && queryNormalized.includes('theme_preference = @theme')) {
          const user = global.mockDatabaseState.users.find(u => u.id === inputs.id);
          if (user) {
            user.theme_preference = inputs.theme;
          }
          return { recordset: [] };
        }

        if (queryNormalized.includes('select * from roles') || queryNormalized.includes('select id from roles')) {
          return { recordset: global.mockDatabaseState.roles };
        }

        if (queryNormalized.includes('select * from departments') || queryNormalized.includes('select id from departments')) {
          return { recordset: global.mockDatabaseState.departments };
        }

        // Messages repository mocks
        if (queryNormalized.includes('from messages m') && queryNormalized.includes('m.complaint_id = @complaint_id')) {
          const msgs = global.mockDatabaseState.messages.filter(m => m.complaint_id === inputs.complaint_id);
          return { recordset: msgs };
        }

        if (queryNormalized.includes('insert into messages')) {
          const newId = global.mockDatabaseState.messages.length + 1;
          const sender = global.mockDatabaseState.users.find(u => u.id === inputs.sender_id) || { first_name: 'System', last_name: 'Admin' };
          const newMsg = {
            id: newId,
            complaint_id: inputs.complaint_id,
            sender_id: inputs.sender_id,
            sender_role: inputs.sender_role,
            recipient_id: inputs.recipient_id,
            recipient_role: inputs.recipient_role,
            message_text: inputs.message_text,
            read_status: inputs.read_status || 'Unread',
            created_at: new Date(),
            first_name: sender.first_name,
            last_name: sender.last_name
          };
          global.mockDatabaseState.messages.push(newMsg);
          return { recordset: [{ id: newId }] };
        }

        if (queryNormalized.includes('update messages') && queryNormalized.includes("read_status = 'read'")) {
          global.mockDatabaseState.messages.forEach(m => {
            if (m.complaint_id === inputs.complaint_id && m.recipient_role === inputs.recipient_role) {
              m.read_status = 'Read';
            }
          });
          return { recordset: [] };
        }

        if (queryNormalized.includes('from messages') && queryNormalized.includes("read_status = 'unread'")) {
          const count = global.mockDatabaseState.messages.filter(m => m.recipient_role === inputs.recipient_role && m.read_status === 'Unread').length;
          return { recordset: [{ count }] };
        }

        if (queryNormalized.includes('insert into auditlogs') || queryNormalized.includes('insert into audit_logs') || queryNormalized.includes('insert into')) {
          return { recordset: [{ id: 1 }] };
        }

        return { recordset: [] };
      }
    };
    return reqObj;
  };

  return {
    request,
    close: async () => {}
  };
}

function getPool() {
  if (!pool) {
    console.warn("WARNING: Database pool not connected. Returning mock database pool fallback.");
    return createMockPool();
  }
  return pool;
}

module.exports = {
  connectDB,
  getPool,
  sql
};
