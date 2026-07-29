const { getPool, sql } = require('../../config/db');

class UserRepository {
  async findByEmail(email) {
    const pool = getPool();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT u.*, r.name as role_name, d.name as department_name 
        FROM Users u
        LEFT JOIN Roles r ON u.role_id = r.id
        LEFT JOIN Departments d ON u.department_id = d.id
        WHERE u.email = @email
      `);
    return result.recordset[0] || null;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, u.department_id, u.status, u.theme_preference, u.created_at,
               r.name as role_name, d.name as department_name
        FROM Users u
        LEFT JOIN Roles r ON u.role_id = r.id
        LEFT JOIN Departments d ON u.department_id = d.id
        WHERE u.id = @id
      `);
    return result.recordset[0] || null;
  }

  async create(user) {
    const pool = getPool();
    const result = await pool.request()
      .input('email', sql.VarChar, user.email)
      .input('password_hash', sql.VarChar, user.passwordHash)
      .input('first_name', sql.VarChar, user.firstName)
      .input('last_name', sql.VarChar, user.lastName)
      .input('role_id', sql.Int, user.roleId)
      .input('department_id', sql.Int, user.departmentId || null)
      .input('status', sql.VarChar, user.status || 'Active')
      .query(`
        INSERT INTO Users (email, password_hash, first_name, last_name, role_id, department_id, status)
        OUTPUT INSERTED.id
        VALUES (@email, @password_hash, @first_name, @last_name, @role_id, @department_id, @status)
      `);
    return result.recordset[0].id;
  }

  async updateRefreshToken(id, token) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('token', sql.VarChar, token || null)
      .query(`
        UPDATE Users 
        SET refresh_token = @token, updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  async setResetToken(email, token, expiry) {
    const pool = getPool();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .input('token', sql.VarChar, token)
      .input('expiry', sql.DateTime, expiry)
      .query(`
        UPDATE Users 
        SET reset_token = @token, reset_token_expiry = @expiry, updated_at = GETDATE()
        WHERE email = @email
      `);
    return result.rowsAffected[0] > 0;
  }

  async findByResetToken(token) {
    const pool = getPool();
    const result = await pool.request()
      .input('token', sql.VarChar, token)
      .query(`
        SELECT u.*, r.name as role_name 
        FROM Users u
        LEFT JOIN Roles r ON u.role_id = r.id
        WHERE u.reset_token = @token AND u.reset_token_expiry > GETDATE()
      `);
    return result.recordset[0] || null;
  }

  async updatePassword(id, hashedPassword) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('password_hash', sql.VarChar, hashedPassword)
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

  async updateThemePreference(id, theme) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('theme', sql.VarChar, theme)
      .query(`
        UPDATE Users 
        SET theme_preference = @theme, updated_at = GETDATE()
        WHERE id = @id
      `);
  }
}

module.exports = UserRepository;
