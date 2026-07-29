const { getPool, sql } = require('../../config/db');

class AuditRepository {
  async create(logEntry) {
    try {
      const pool = getPool();
      await pool.request()
        .input('user_id', sql.Int, logEntry.userId || null)
        .input('action', sql.VarChar, logEntry.action)
        .input('ip_address', sql.VarChar, logEntry.ipAddress)
        .input('user_agent', sql.VarChar, logEntry.userAgent)
        .input('details', sql.VarChar, logEntry.details || null)
        .query(`
          INSERT INTO AuditLogs (user_id, action, ip_address, user_agent, details)
          VALUES (@user_id, @action, @ip_address, @user_agent, @details)
        `);
    } catch (err) {
      // We don't want audit log failures to crash the whole request, but we must log it
      console.error('Failed to write audit log:', err.message);
    }
  }

  async findByUserId(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT * FROM AuditLogs 
        WHERE user_id = @userId 
        ORDER BY timestamp DESC
      `);
    return result.recordset;
  }
}

module.exports = AuditRepository;
