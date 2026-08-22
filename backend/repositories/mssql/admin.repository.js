const { getPool, sql } = require('../../config/db');
const bcrypt = require('bcrypt');

class AdminRepository {
  // Ensure SystemSettings table exists
  async ensureSettingsTable() {
    const pool = getPool();
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemSettings')
      BEGIN
        CREATE TABLE SystemSettings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value VARCHAR(255) NOT NULL,
          description VARCHAR(255) NULL,
          updated_at DATETIME DEFAULT GETDATE(),
          updated_by INT NULL
        );

        INSERT INTO SystemSettings (setting_key, setting_value, description)
        VALUES 
          ('sla_window_hours', '24', 'Standard warehouse SLA resolution window in hours'),
          ('sla_threshold_green_hours', '12', 'Green SLA indicator threshold (hours remaining)'),
          ('sla_threshold_amber_hours', '6', 'Amber SLA indicator threshold (hours remaining)');
      END
    `);
  }

  // 1. Operational Snapshot Metrics
  async getOperationalSnapshot() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Complaints WHERE status NOT IN ('Resolved', 'Completed', 'Closed')) AS totalActiveComplaints,
        (SELECT COUNT(*) FROM Complaints WHERE status NOT IN ('Resolved', 'Completed', 'Closed') AND warehouse_team_deadline IS NOT NULL AND GETDATE() > warehouse_team_deadline) AS breachingSlaCount,
        (SELECT COUNT(*) FROM Users WHERE status = 'Active') AS totalActiveUsers
    `);

    const s = result.recordset[0] || {};

    // Calculate low SLA warehouse count (<= 50%)
    const whRes = await pool.request().query(`
      SELECT 
        w.id,
        COUNT(c.id) AS total,
        SUM(CASE 
          WHEN c.status IN ('Resolved', 'Completed') AND DATEDIFF(hour, c.raised_at, ISNULL(c.updated_at, GETDATE())) <= 24 THEN 1
          WHEN c.status NOT IN ('Resolved', 'Completed', 'Closed') AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 24 THEN 1
          ELSE 0 
        END) AS compliant
      FROM Warehouses w
      LEFT JOIN Complaints c ON w.id = c.warehouse_id
      GROUP BY w.id
    `);

    let lowSlaWarehouseCount = 0;
    whRes.recordset.forEach(wh => {
      if (wh.total > 0) {
        const rate = (wh.compliant / wh.total) * 100;
        if (rate <= 50) lowSlaWarehouseCount++;
      }
    });

    return {
      totalActiveComplaints: s.totalActiveComplaints || 0,
      breachingSlaCount: s.breachingSlaCount || 0,
      lowSlaWarehouseCount,
      totalActiveUsers: s.totalActiveUsers || 0
    };
  }

  // 2. Action-Needed Feed
  async getActionNeededFeed() {
    const pool = getPool();
    
    // Long escalated complaints (> 3 days)
    const longEscalatedRes = await pool.request().query(`
      SELECT TOP 10
        c.id,
        c.complaint_number,
        w.name AS warehouseName,
        DATEDIFF(day, c.escalated_to_manager_at, GETDATE()) AS daysWaiting,
        CONVERT(VARCHAR(20), c.escalated_to_manager_at, 106) AS escalatedDate
      FROM Complaints c
      JOIN Warehouses w ON c.warehouse_id = w.id
      WHERE c.escalated_to_manager_at IS NOT NULL 
        AND c.status NOT IN ('Resolved', 'Completed', 'Closed')
        AND DATEDIFF(day, c.escalated_to_manager_at, GETDATE()) >= 3
      ORDER BY c.escalated_to_manager_at ASC
    `);

    // Warehouses at 0% SLA performance
    const zeroSlaRes = await pool.request().query(`
      SELECT 
        w.id,
        w.name AS warehouseName,
        COUNT(c.id) AS total,
        SUM(CASE 
          WHEN c.status IN ('Resolved', 'Completed') AND DATEDIFF(hour, c.raised_at, ISNULL(c.updated_at, GETDATE())) <= 24 THEN 1
          WHEN c.status NOT IN ('Resolved', 'Completed', 'Closed') AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 24 THEN 1
          ELSE 0 
        END) AS compliant
      FROM Warehouses w
      LEFT JOIN Complaints c ON w.id = c.warehouse_id
      GROUP BY w.id, w.name
      HAVING COUNT(c.id) > 0 AND SUM(CASE 
        WHEN c.status IN ('Resolved', 'Completed') AND DATEDIFF(hour, c.raised_at, ISNULL(c.updated_at, GETDATE())) <= 24 THEN 1
        WHEN c.status NOT IN ('Resolved', 'Completed', 'Closed') AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 24 THEN 1
        ELSE 0 
      END) = 0
    `);

    return {
      longEscalated: longEscalatedRes.recordset,
      zeroSlaWarehouses: zeroSlaRes.recordset
    };
  }

  // 3. User Management
  async getUsers(search = '', role = '', warehouseId = '') {
    const pool = getPool();
    const req = pool.request();

    let query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.role AS role_name,
             u.warehouse_id, u.status, u.created_at, w.name AS warehouse_name
      FROM Users u
      LEFT JOIN Warehouses w ON u.warehouse_id = w.id
      WHERE 1=1
    `;

    if (search) {
      req.input('search', sql.VarChar, `%${search}%`);
      query += ` AND (u.first_name LIKE @search OR u.last_name LIKE @search OR u.email LIKE @search OR u.username LIKE @search)`;
    }

    if (role) {
      req.input('role', sql.VarChar, role);
      query += ` AND u.role = @role`;
    }

    if (warehouseId) {
      req.input('warehouseId', sql.Int, parseInt(warehouseId, 10));
      query += ` AND u.warehouse_id = @warehouseId`;
    }

    query += ` ORDER BY u.created_at DESC, u.id DESC`;

    const result = await req.query(query);
    return result.recordset;
  }

  async createUser(userData) {
    const pool = getPool();

    // Check email uniqueness
    const existing = await pool.request()
      .input('email', sql.VarChar, userData.email)
      .query(`SELECT id FROM Users WHERE email = @email OR username = @email`);
    if (existing.recordset.length > 0) {
      throw new Error('User with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const username = userData.email.split('@')[0];

    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, userData.email)
      .input('password_hash', sql.VarChar, passwordHash)
      .input('first_name', sql.VarChar, userData.firstName)
      .input('last_name', sql.VarChar, userData.lastName)
      .input('role', sql.VarChar, userData.role)
      .input('warehouse_id', sql.Int, userData.warehouseId ? parseInt(userData.warehouseId, 10) : null)
      .input('status', sql.VarChar, 'Active')
      .query(`
        INSERT INTO Users (username, email, password_hash, first_name, last_name, role, warehouse_id, status)
        OUTPUT INSERTED.id
        VALUES (@username, @email, @password_hash, @first_name, @last_name, @role, @warehouse_id, @status)
      `);

    return result.recordset[0].id;
  }

  async updateUser(id, userData) {
    const pool = getPool();
    const req = pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .input('first_name', sql.VarChar, userData.firstName)
      .input('last_name', sql.VarChar, userData.lastName)
      .input('role', sql.VarChar, userData.role)
      .input('warehouse_id', sql.Int, userData.warehouseId ? parseInt(userData.warehouseId, 10) : null);

    await req.query(`
      UPDATE Users
      SET first_name = @first_name,
          last_name = @last_name,
          role = @role,
          warehouse_id = @warehouse_id,
          updated_at = GETDATE()
      WHERE id = @id
    `);
  }

  async updateUserStatus(id, status) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .input('status', sql.VarChar, status)
      .query(`
        UPDATE Users
        SET status = @status, updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  async resetUserPassword(id, newPassword) {
    const pool = getPool();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .input('password_hash', sql.VarChar, passwordHash)
      .query(`
        UPDATE Users
        SET password_hash = @password_hash,
            reset_token = NULL,
            reset_token_expiry = NULL,
            refresh_token = NULL,
            updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  // 4. Warehouse Management
  async getWarehouses() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        w.id,
        w.name,
        w.location,
        w.created_at,
        SUM(CASE WHEN u.role = 'Warehouse Team' THEN 1 ELSE 0 END) AS teamMemberCount,
        SUM(CASE WHEN u.role = 'Warehouse Manager' THEN 1 ELSE 0 END) AS managerCount,
        (SELECT COUNT(*) FROM Complaints c WHERE c.warehouse_id = w.id) AS totalComplaints
      FROM Warehouses w
      LEFT JOIN Users u ON w.id = u.warehouse_id
      GROUP BY w.id, w.name, w.location, w.created_at
      ORDER BY w.id ASC
    `);
    return result.recordset;
  }

  async createWarehouse(name, location) {
    const pool = getPool();
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('location', sql.VarChar, location)
      .query(`
        INSERT INTO Warehouses (name, location)
        OUTPUT INSERTED.id
        VALUES (@name, @location)
      `);
    return result.recordset[0].id;
  }

  async updateWarehouse(id, name, location) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .input('name', sql.VarChar, name)
      .input('location', sql.VarChar, location)
      .query(`
        UPDATE Warehouses
        SET name = @name, location = @location
        WHERE id = @id
      `);
  }

  async deleteWarehouse(id) {
    const pool = getPool();

    // Check linked users or complaints
    const userCheck = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query(`SELECT COUNT(*) AS userCount FROM Users WHERE warehouse_id = @id`);

    const complaintCheck = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query(`SELECT COUNT(*) AS complaintCount FROM Complaints WHERE warehouse_id = @id`);

    const userCount = userCheck.recordset[0].userCount || 0;
    const complaintCount = complaintCheck.recordset[0].complaintCount || 0;

    if (userCount > 0 || complaintCount > 0) {
      throw new Error(`Cannot delete warehouse: It currently has ${userCount} associated user(s) and ${complaintCount} complaint(s). Please reassign them first.`);
    }

    await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query(`DELETE FROM Warehouses WHERE id = @id`);
  }

  // 5. Complaint Types & Subtypes
  async getComplaintTypes() {
    const pool = getPool();
    const typesRes = await pool.request().query(`SELECT * FROM ComplaintTypes ORDER BY id ASC`);
    const subtypesRes = await pool.request().query(`
      SELECT cs.*, ct.name AS type_name 
      FROM ComplaintSubtypes cs
      JOIN ComplaintTypes ct ON cs.complaint_type_id = ct.id
      ORDER BY cs.id ASC
    `);

    return {
      types: typesRes.recordset,
      subtypes: subtypesRes.recordset
    };
  }

  async createComplaintType(name, description) {
    const pool = getPool();
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('description', sql.VarChar, description || null)
      .query(`
        INSERT INTO ComplaintTypes (name, description)
        OUTPUT INSERTED.id
        VALUES (@name, @description)
      `);
    return result.recordset[0].id;
  }

  async createComplaintSubtype(complaintTypeId, name) {
    const pool = getPool();
    const result = await pool.request()
      .input('complaint_type_id', sql.Int, parseInt(complaintTypeId, 10))
      .input('name', sql.VarChar, name)
      .query(`
        INSERT INTO ComplaintSubtypes (complaint_type_id, name)
        OUTPUT INSERTED.id
        VALUES (@complaint_type_id, @name)
      `);
    return result.recordset[0].id;
  }

  // 6. Dynamic System Settings
  async getSystemSettings() {
    await this.ensureSettingsTable();
    const pool = getPool();
    const result = await pool.request().query(`SELECT * FROM SystemSettings`);
    const settings = {};
    result.recordset.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  }

  async updateSystemSettings(settingsObject, userId) {
    await this.ensureSettingsTable();
    const pool = getPool();

    for (const [key, val] of Object.entries(settingsObject)) {
      await pool.request()
        .input('key', sql.VarChar, key)
        .input('value', sql.VarChar, String(val))
        .input('userId', sql.Int, userId || null)
        .query(`
          IF EXISTS (SELECT 1 FROM SystemSettings WHERE setting_key = @key)
          BEGIN
            UPDATE SystemSettings 
            SET setting_value = @value, updated_at = GETDATE(), updated_by = @userId
            WHERE setting_key = @key
          END
          ELSE
          BEGIN
            INSERT INTO SystemSettings (setting_key, setting_value, updated_by)
            VALUES (@key, @value, @userId)
          END
        `);
    }
  }
}

module.exports = new AdminRepository();
