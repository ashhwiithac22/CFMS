const { getPool, sql } = require('../../config/db');

class MessageRepository {
  async create(msg) {
    const pool = getPool();
    const result = await pool.request()
      .input('complaint_id', sql.VarChar, msg.complaint_id)
      .input('sender_id', sql.Int, msg.sender_id)
      .input('sender_role', sql.VarChar, msg.sender_role)
      .input('recipient_id', sql.Int, msg.recipient_id || null)
      .input('recipient_role', sql.VarChar, msg.recipient_role || null)
      .input('message_text', sql.NVarChar, msg.message_text)
      .input('read_status', sql.VarChar, msg.read_status || 'Unread')
      .query(`
        INSERT INTO Messages (complaint_id, sender_id, sender_role, recipient_id, recipient_role, message_text, read_status)
        OUTPUT INSERTED.id
        VALUES (@complaint_id, @sender_id, @sender_role, @recipient_id, @recipient_role, @message_text, @read_status)
      `);
    return result.recordset[0].id;
  }

  async findByComplaintId(complaintId) {
    const pool = getPool();
    const result = await pool.request()
      .input('complaint_id', sql.VarChar, complaintId)
      .query(`
        SELECT m.*, u.first_name, u.last_name 
        FROM Messages m
        LEFT JOIN Users u ON m.sender_id = u.id
        WHERE m.complaint_id = @complaint_id
        ORDER BY m.created_at ASC
      `);
    return result.recordset;
  }

  async markAsRead(complaintId, recipientRole) {
    const pool = getPool();
    await pool.request()
      .input('complaint_id', sql.VarChar, complaintId)
      .input('recipient_role', sql.VarChar, recipientRole)
      .query(`
        UPDATE Messages 
        SET read_status = 'Read'
        WHERE complaint_id = @complaint_id AND recipient_role = @recipient_role AND read_status = 'Unread'
      `);
  }

  async getUnreadCount(recipientRole) {
    const pool = getPool();
    const result = await pool.request()
      .input('recipient_role', sql.VarChar, recipientRole)
      .query(`
        SELECT COUNT(*) as count 
        FROM Messages 
        WHERE recipient_role = @recipient_role AND read_status = 'Unread'
      `);
    return result.recordset[0].count;
  }
}

module.exports = MessageRepository;
