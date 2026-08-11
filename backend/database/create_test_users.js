const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { connectDB, getPool, sql } = require('../config/db');

async function seedTestUsers() {
  try {
    await connectDB();
    const pool = getPool();

    console.log('Connected to database. Seeding test users...');

    // 1. Fetch Coimbatore warehouse ID
    const whRes = await pool.request()
      .input('whName', sql.VarChar, 'Coimbatore')
      .query("SELECT id FROM Warehouses WHERE name = @whName OR name LIKE '%Coimbatore%'");

    let coimbatoreId = whRes.recordset[0]?.id;
    if (!coimbatoreId) {
      console.warn('Coimbatore warehouse not found in DB by name, querying first warehouse...');
      const fallbackWh = await pool.request().query("SELECT TOP 1 id FROM Warehouses ORDER BY id ASC");
      coimbatoreId = fallbackWh.recordset[0]?.id || 1;
    }

    console.log(`Coimbatore warehouse ID: ${coimbatoreId}`);

    // 2. Hash passwords
    const managerPasswordHash = await bcrypt.hash('71762333004', 10);
    const salesPasswordHash = await bcrypt.hash('ashwithacchandru', 10);

    // 3. User 1: Test_coimbatore_manager
    const user1Email = '71762333004@cit.edu.in';
    const user1Username = 'Test_coimbatore_manager';

    const checkUser1 = await pool.request()
      .input('email', sql.VarChar, user1Email)
      .input('username', sql.VarChar, user1Username)
      .query("SELECT id FROM Users WHERE email = @email OR username = @username");

    if (checkUser1.recordset.length > 0) {
      const existingId = checkUser1.recordset[0].id;
      await pool.request()
        .input('id', sql.Int, existingId)
        .input('username', sql.VarChar, user1Username)
        .input('email', sql.VarChar, user1Email)
        .input('passHash', sql.VarChar, managerPasswordHash)
        .input('warehouseId', sql.Int, coimbatoreId)
        .query(`
          UPDATE Users
          SET username = @username,
              email = @email,
              password_hash = @passHash,
              first_name = 'Test',
              last_name = 'Coimbatore Manager',
              role = 'Warehouse Manager',
              warehouse_id = @warehouseId,
              status = 'Active',
              updated_at = GETDATE()
          WHERE id = @id
        `);
      console.log(`Updated existing user ID ${existingId} (${user1Username} / ${user1Email})`);
    } else {
      await pool.request()
        .input('username', sql.VarChar, user1Username)
        .input('email', sql.VarChar, user1Email)
        .input('passHash', sql.VarChar, managerPasswordHash)
        .input('warehouseId', sql.Int, coimbatoreId)
        .query(`
          INSERT INTO Users (username, email, password_hash, first_name, last_name, role, warehouse_id, status)
          VALUES (@username, @email, @passHash, 'Test', 'Coimbatore Manager', 'Warehouse Manager', @warehouseId, 'Active')
        `);
      console.log(`Created new user ${user1Username} (${user1Email})`);
    }

    // 4. User 2: test_sales_executive
    const user2Email = 'ashwithacchandru@gmail.com';
    const user2Username = 'test_sales_executive';

    const checkUser2 = await pool.request()
      .input('email1', sql.VarChar, user2Email)
      .input('email2', sql.VarChar, 'ashwithaccchandru@gmail.com')
      .input('username', sql.VarChar, user2Username)
      .query("SELECT id FROM Users WHERE email = @email1 OR email = @email2 OR username = @username");


    if (checkUser2.recordset.length > 0) {
      const existingId = checkUser2.recordset[0].id;
      await pool.request()
        .input('id', sql.Int, existingId)
        .input('username', sql.VarChar, user2Username)
        .input('email', sql.VarChar, user2Email)
        .input('passHash', sql.VarChar, salesPasswordHash)
        .query(`
          UPDATE Users
          SET username = @username,
              email = @email,
              password_hash = @passHash,
              first_name = 'Test',
              last_name = 'Sales Executive',
              role = 'Sales Executive',
              warehouse_id = NULL,
              status = 'Active',
              updated_at = GETDATE()
          WHERE id = @id
        `);
      console.log(`Updated existing user ID ${existingId} (${user2Username} / ${user2Email})`);
    } else {
      await pool.request()
        .input('username', sql.VarChar, user2Username)
        .input('email', sql.VarChar, user2Email)
        .input('passHash', sql.VarChar, salesPasswordHash)
        .query(`
          INSERT INTO Users (username, email, password_hash, first_name, last_name, role, warehouse_id, status)
          VALUES (@username, @email, @passHash, 'Test', 'Sales Executive', 'Sales Executive', NULL, 'Active')
        `);
      console.log(`Created new user ${user2Username} (${user2Email})`);
    }

    console.log('Seeding test users completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding test users:', err);
    process.exit(1);
  }
}

seedTestUsers();
