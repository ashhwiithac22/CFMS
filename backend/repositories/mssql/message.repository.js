const { getPool, sql } = require('../../config/db');

class MessageRepository {
  async create(msg) {
    const pool = getPool();
    const result = await pool.request()
      .input('complaint_id', sql.VarChar, String(msg.complaint_id))
      .input('sender_id', sql.Int, msg.sender_id)
      .input('sender_role', sql.VarChar, msg.sender_role)
      .input('recipient_id', sql.Int, msg.recipient_id ? parseInt(msg.recipient_id, 10) : null)
      .input('recipient_role', sql.VarChar, msg.recipient_role || null)
      .input('message_text', sql.NVarChar, msg.message_text)
      .input('attachment_url', sql.VarChar, msg.attachment_url || null)
      .input('read_status', sql.VarChar, msg.read_status || 'Unread')
      .query(`
        INSERT INTO Messages (complaint_id, sender_id, sender_role, recipient_id, recipient_role, message_text, attachment_url, read_status)
        OUTPUT INSERTED.id
        VALUES (@complaint_id, @sender_id, @sender_role, @recipient_id, @recipient_role, @message_text, @attachment_url, @read_status)
      `);
    return result.recordset[0].id;
  }

  async findByComplaintId(complaintId, userId, userRole, recipientId) {
    const pool = getPool();
    const req = pool.request();
    req.input('complaint_id', sql.VarChar, String(complaintId));

    let query = `
      SELECT m.*, (u.first_name + ' ' + u.last_name) AS sender_name 
      FROM Messages m
      LEFT JOIN Users u ON m.sender_id = u.id
      WHERE m.complaint_id = @complaint_id
    `;

    if (userId) {
      req.input('user_id', sql.Int, parseInt(userId, 10));

      if (userRole === 'Sales Executive') {
        if (recipientId) {
          req.input('recipient_id', sql.Int, parseInt(recipientId, 10));
          query += ` AND ((m.sender_id = @user_id AND m.recipient_id = @recipient_id) OR (m.sender_id = @recipient_id AND m.recipient_id = @user_id))`;
        } else {
          // If Sales Executive has not specified a recipient yet, return empty thread
          query += ` AND 1 = 0`;
        }
      } else {
        // For Warehouse Team / Warehouse Manager: return ONLY messages where current user is sender or recipient
        query += ` AND (m.sender_id = @user_id OR m.recipient_id = @user_id)`;
      }
    }

    query += ` ORDER BY m.created_at ASC`;

    const result = await req.query(query);
    return result.recordset;
  }

  async markAsRead(complaintId, userId, userRole) {
    const pool = getPool();
    await pool.request()
      .input('complaint_id', sql.VarChar, String(complaintId))
      .input('user_id', sql.Int, parseInt(userId, 10))
      .input('user_role', sql.VarChar, userRole)
      .query(`
        UPDATE Messages 
        SET read_status = 'Read'
        WHERE complaint_id = @complaint_id 
          AND (recipient_id = @user_id OR (recipient_id IS NULL AND recipient_role = @user_role))
          AND read_status = 'Unread'
      `);
  }

  async getUnreadCount(userId, userRole) {
    const pool = getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, parseInt(userId, 10))
      .input('user_role', sql.VarChar, userRole)
      .query(`
        SELECT COUNT(*) as count 
        FROM Messages 
        WHERE (recipient_id = @user_id OR (recipient_id IS NULL AND recipient_role = @user_role))
          AND sender_id <> @user_id
          AND read_status = 'Unread'
      `);
    return result.recordset[0].count;
  }

  async getNotificationsForUser(userId, userRole) {
    const pool = getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, parseInt(userId, 10))
      .input('user_role', sql.VarChar, userRole)
      .query(`
        SELECT TOP 10 
          m.id, 
          m.complaint_id, 
          m.message_text, 
          m.read_status, 
          m.created_at,
          (u.first_name + ' ' + u.last_name) AS sender_name,
          m.sender_role
        FROM Messages m
        LEFT JOIN Users u ON m.sender_id = u.id
        WHERE (m.recipient_id = @user_id OR (m.recipient_id IS NULL AND m.recipient_role = @user_role))
          AND m.sender_id <> @user_id
        ORDER BY m.created_at DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      complaint_id: row.complaint_id,
      title: `${row.sender_name} sent you a message regarding Complaint ${row.complaint_id}`,
      preview: row.message_text ? row.message_text.substring(0, 60) : 'Attachment sent',
      sender_name: row.sender_name,
      sender_role: row.sender_role,
      read_status: row.read_status,
      timestamp: row.created_at
    }));
  }

  async getRecipientsForComplaint(complaintId, currentUserId, currentUserRole) {
    const pool = getPool();
    
    // 1. Lookup complaint details
    const compRes = await pool.request()
      .input('complaint_id', sql.VarChar, String(complaintId))
      .query(`
        SELECT c.id, c.complaint_number, c.status, c.warehouse_id, c.sales_executive_id, w.name AS warehouse_name 
        FROM Complaints c
        JOIN Warehouses w ON c.warehouse_id = w.id
        WHERE c.complaint_number = @complaint_id OR CAST(c.id AS VARCHAR) = @complaint_id
      `);

    const complaint = compRes.recordset[0];
    if (!complaint) {
      return { recipients: [], countText: 'No recipients found', isEscalated: false, memberCount: 0 };
    }

    const isEscalated = ['Escalated to Manager', 'Escalated to Warehouse Head', 'Escalated'].includes(complaint.status);
    let recipients = [];
    let countText = '';
    let memberCount = 0;

    if (currentUserRole === 'Sales Executive') {
      if (!isEscalated) {
        // Stage 1 (Assigned / In Progress): Warehouse Team members only
        const usersRes = await pool.request()
          .input('warehouse_id', sql.Int, complaint.warehouse_id)
          .input('current_user_id', sql.Int, parseInt(currentUserId, 10))
          .query(`
            SELECT u.id, (u.first_name + ' ' + u.last_name) AS name, u.username, u.email, u.role
            FROM Users u
            WHERE u.role = 'Warehouse Team' 
              AND u.warehouse_id = @warehouse_id 
              AND u.status = 'Active'
              AND u.id <> @current_user_id
            ORDER BY u.first_name ASC
          `);

        recipients = usersRes.recordset.map(u => ({
          id: u.id,
          name: u.name,
          role: u.role,
          username: u.username
        }));

        memberCount = recipients.length;
        countText = `Warehouse Team Members (${memberCount} Members)`;
      } else {
        // Stage 2 (Escalated): Warehouse Team AND Warehouse Manager
        const usersRes = await pool.request()
          .input('warehouse_id', sql.Int, complaint.warehouse_id)
          .input('current_user_id', sql.Int, parseInt(currentUserId, 10))
          .query(`
            SELECT u.id, (u.first_name + ' ' + u.last_name) AS name, u.username, u.email, u.role
            FROM Users u
            WHERE u.role IN ('Warehouse Team', 'Warehouse Manager')
              AND u.warehouse_id = @warehouse_id 
              AND u.status = 'Active'
              AND u.id <> @current_user_id
            ORDER BY u.role DESC, u.first_name ASC
          `);

        recipients = usersRes.recordset.map(u => ({
          id: u.id,
          name: `${u.name} (${u.role})`,
          role: u.role,
          username: u.username
        }));

        memberCount = recipients.length;
        countText = `Escalated — Warehouse Team & Manager Available (${memberCount} Members)`;
      }
    } else {
      // Warehouse Team / Manager replying to Sales Executive
      const salesUserRes = await pool.request()
        .input('sales_id', sql.Int, complaint.sales_executive_id)
        .input('current_user_id', sql.Int, parseInt(currentUserId, 10))
        .query(`
          SELECT u.id, (u.first_name + ' ' + u.last_name) AS name, u.username, u.email, u.role
          FROM Users u
          WHERE u.id = @sales_id AND u.id <> @current_user_id
        `);

      recipients = salesUserRes.recordset.map(u => ({
        id: u.id,
        name: `${u.name} (Sales Executive)`,
        role: u.role,
        username: u.username
      }));

      memberCount = recipients.length;
      countText = `Replying to Sales Executive`;
    }

    return {
      complaint_number: complaint.complaint_number,
      warehouse_name: complaint.warehouse_name,
      status: complaint.status,
      isEscalated,
      countText,
      memberCount,
      recipients
    };
  }

  async validateMessageRules(complaintId, senderId, senderRole, recipientId) {
    const pool = getPool();

    // 1. Rule 1: Sender cannot message themselves
    if (parseInt(senderId, 10) === parseInt(recipientId, 10)) {
      throw new Error('Sales Executive cannot message themselves');
    }

    // 2. Lookup recipient
    const recipientRes = await pool.request()
      .input('id', sql.Int, parseInt(recipientId, 10))
      .query('SELECT id, first_name, last_name, role, warehouse_id, status FROM Users WHERE id = @id');
    const recipient = recipientRes.recordset[0];

    if (!recipient || recipient.status !== 'Active') {
      throw new Error('Invalid or inactive message recipient');
    }

    // 3. Lookup complaint
    const compRes = await pool.request()
      .input('complaint_id', sql.VarChar, String(complaintId))
      .query('SELECT id, complaint_number, status, warehouse_id, sales_executive_id FROM Complaints WHERE complaint_number = @complaint_id OR CAST(id AS VARCHAR) = @complaint_id');
    const complaint = compRes.recordset[0];

    if (!complaint) {
      throw new Error('Complaint not found');
    }

    const isEscalated = ['Escalated to Manager', 'Escalated to Warehouse Head', 'Escalated'].includes(complaint.status);

    // 4. Rule: Manager selectable only after escalation
    if (senderRole === 'Sales Executive' && recipient.role === 'Warehouse Manager' && !isEscalated) {
      throw new Error('Warehouse Manager becomes selectable only after complaint escalation');
    }

    // 5. Rule: Recipient must belong to assigned warehouse
    if (senderRole === 'Sales Executive' && recipient.warehouse_id !== complaint.warehouse_id) {
      throw new Error(`Recipient does not belong to the warehouse handling this complaint`);
    }

    return {
      recipient_id: recipient.id,
      recipient_role: recipient.role
    };
  }
}

module.exports = MessageRepository;
