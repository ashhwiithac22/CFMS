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

    if (userId) {
      req.input('user_id', sql.Int, parseInt(userId, 10));
    }
    if (recipientId) {
      req.input('recipient_id', sql.Int, parseInt(recipientId, 10));
    }

    if (complaintId === 'DIRECT' && !recipientId) {
      return [];
    }

    let query = `
      SELECT m.*, (u.first_name + ' ' + u.last_name) AS sender_name 
      FROM Messages m
      LEFT JOIN Users u ON m.sender_id = u.id
    `;

    if (complaintId === 'DIRECT') {
      query += ` WHERE ((m.sender_id = @user_id AND m.recipient_id = @recipient_id) OR (m.sender_id = @recipient_id AND m.recipient_id = @user_id))`;
    } else {
      req.input('complaint_id', sql.VarChar, String(complaintId));
      query += ` WHERE m.complaint_id = @complaint_id`;
      if (userId) {
        if (userRole === 'Sales Executive') {
          if (recipientId) {
            query += ` AND ((m.sender_id = @user_id AND m.recipient_id = @recipient_id) OR (m.sender_id = @recipient_id AND m.recipient_id = @user_id))`;
          } else {
            query += ` AND 1 = 0`;
          }
        } else {
          query += ` AND (m.sender_id = @user_id OR m.recipient_id = @user_id)`;
        }
      }
    }

    query += ` ORDER BY m.created_at ASC`;

    const result = await req.query(query);
    return result.recordset;
  }

  async markAsRead(complaintId, userId, userRole, senderId) {
    const pool = getPool();
    const req = pool.request()
      .input('user_id', sql.Int, parseInt(userId, 10))
      .input('user_role', sql.VarChar, userRole);

    if (complaintId === 'DIRECT' && senderId) {
      req.input('sender_id', sql.Int, parseInt(senderId, 10));
      await req.query(`
        UPDATE Messages 
        SET read_status = 'Read'
        WHERE (recipient_id = @user_id OR (recipient_id IS NULL AND recipient_role = @user_role))
          AND sender_id = @sender_id
          AND read_status = 'Unread'
      `);
    } else {
      req.input('complaint_id', sql.VarChar, String(complaintId));
      await req.query(`
        UPDATE Messages 
        SET read_status = 'Read'
        WHERE complaint_id = @complaint_id 
          AND (recipient_id = @user_id OR (recipient_id IS NULL AND recipient_role = @user_role))
          AND read_status = 'Unread'
      `);
    }
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

  async getContacts(userId, userRole) {
    const pool = getPool();
    
    const userRes = await pool.request()
      .input('user_id', sql.Int, parseInt(userId, 10))
      .query('SELECT warehouse_id FROM Users WHERE id = @user_id');
    const currentUserWarehouseId = userRes.recordset[0]?.warehouse_id;

    let query = '';
    const req = pool.request();
    req.input('user_id', sql.Int, parseInt(userId, 10));

    if (userRole === 'Sales Executive') {
      query = `
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.role, u.username, u.email, w.name AS warehouse_name
        FROM Users u
        JOIN Warehouses w ON u.warehouse_id = w.id
        WHERE u.status = 'Active'
          AND u.role IN ('Warehouse Team', 'Warehouse Manager')
          AND u.warehouse_id IN (
            SELECT DISTINCT warehouse_id 
            FROM Complaints 
            WHERE sales_executive_id = @user_id
          )
        ORDER BY u.role DESC, u.first_name ASC
      `;
    } else if (userRole === 'Warehouse Team') {
      if (!currentUserWarehouseId) return [];
      req.input('warehouse_id', sql.Int, currentUserWarehouseId);
      query = `
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.role, u.username, u.email, w.name AS warehouse_name
        FROM Users u
        LEFT JOIN Warehouses w ON u.warehouse_id = w.id
        WHERE u.status = 'Active'
          AND (
            (u.role = 'Sales Executive' AND u.id IN (
              SELECT DISTINCT sales_executive_id 
              FROM Complaints 
              WHERE warehouse_id = @warehouse_id
            ))
            OR (u.role = 'Warehouse Manager' AND u.warehouse_id = @warehouse_id)
            OR (u.role = 'Warehouse Team' AND u.warehouse_id = @warehouse_id AND u.id <> @user_id)
          )
        ORDER BY u.role DESC, u.first_name ASC
      `;
    } else if (userRole === 'Warehouse Manager') {
      if (!currentUserWarehouseId) return [];
      req.input('warehouse_id', sql.Int, currentUserWarehouseId);
      query = `
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.role, u.username, u.email, w.name AS warehouse_name
        FROM Users u
        LEFT JOIN Warehouses w ON u.warehouse_id = w.id
        WHERE u.status = 'Active'
          AND (
            (u.role = 'Sales Executive' AND u.id IN (
              SELECT DISTINCT sales_executive_id 
              FROM Complaints 
              WHERE warehouse_id = @warehouse_id
            ))
            OR (u.role = 'Warehouse Team' AND u.warehouse_id = @warehouse_id)
          )
        ORDER BY u.role DESC, u.first_name ASC
      `;
    } else {
      query = `
        SELECT u.id, u.first_name, u.last_name, u.role, u.username, u.email, w.name AS warehouse_name
        FROM Users u
        LEFT JOIN Warehouses w ON u.warehouse_id = w.id
        WHERE u.status = 'Active'
          AND u.role <> 'Administrator'
          AND u.id <> @user_id
        ORDER BY u.role DESC, u.first_name ASC
      `;
    }

    const result = await req.query(query);
    return result.recordset.map(u => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      role: u.role,
      username: u.username,
      email: u.email,
      warehouseName: u.warehouse_name || 'N/A'
    }));
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
          m.sender_id,
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
      sender_id: row.sender_id,
      title: row.complaint_id === 'DIRECT'
        ? `${row.sender_name} sent you a direct message`
        : `${row.sender_name} sent you a message regarding Complaint ${row.complaint_id}`,
      preview: row.message_text ? row.message_text.substring(0, 60) : 'Attachment sent',
      sender_name: row.sender_name,
      sender_role: row.sender_role,
      read_status: row.read_status,
      timestamp: row.created_at
    }));
  }

  async getRecipientsForComplaint(complaintId, currentUserId, currentUserRole) {
    const pool = getPool();
    
    if (complaintId === 'DIRECT') {
      const contacts = await this.getContacts(currentUserId, currentUserRole);
      return {
        complaint_number: 'DIRECT',
        warehouse_name: 'N/A',
        status: 'Active',
        isEscalated: false,
        countText: 'Authorized Contacts',
        memberCount: contacts.length,
        recipients: contacts.map(c => ({
          id: c.id,
          name: `${c.name} (${c.role})`,
          role: c.role,
          username: c.username
        }))
      };
    }
    
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
      // Sales Executive can message BOTH Warehouse Team and Warehouse Manager of this complaint's warehouse
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
      countText = `Warehouse Team & Manager Available (${memberCount} Members)`;
    } else if (currentUserRole === 'Warehouse Team') {
      // Warehouse Team can message: Sales Executive of this complaint, AND their Warehouse Manager
      const usersRes = await pool.request()
        .input('sales_id', sql.Int, complaint.sales_executive_id)
        .input('warehouse_id', sql.Int, complaint.warehouse_id)
        .input('current_user_id', sql.Int, parseInt(currentUserId, 10))
        .query(`
          SELECT u.id, (u.first_name + ' ' + u.last_name) AS name, u.username, u.email, u.role
          FROM Users u
          WHERE (u.id = @sales_id OR (u.role = 'Warehouse Manager' AND u.warehouse_id = @warehouse_id))
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
      countText = `Sales Executive & Warehouse Manager Available (${memberCount} Members)`;
    } else if (currentUserRole === 'Warehouse Manager') {
      // Warehouse Manager can message: Sales Executive of this complaint, AND Warehouse Team members of their warehouse
      const usersRes = await pool.request()
        .input('sales_id', sql.Int, complaint.sales_executive_id)
        .input('warehouse_id', sql.Int, complaint.warehouse_id)
        .input('current_user_id', sql.Int, parseInt(currentUserId, 10))
        .query(`
          SELECT u.id, (u.first_name + ' ' + u.last_name) AS name, u.username, u.email, u.role
          FROM Users u
          WHERE (u.id = @sales_id OR (u.role = 'Warehouse Team' AND u.warehouse_id = @warehouse_id))
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
      countText = `Sales Executive & Warehouse Team Members Available (${memberCount} Members)`;
    } else {
      // Fallback (e.g. Administrator or other role)
      const usersRes = await pool.request()
        .input('sales_id', sql.Int, complaint.sales_executive_id)
        .input('warehouse_id', sql.Int, complaint.warehouse_id)
        .input('current_user_id', sql.Int, parseInt(currentUserId, 10))
        .query(`
          SELECT u.id, (u.first_name + ' ' + u.last_name) AS name, u.username, u.email, u.role
          FROM Users u
          WHERE (u.id = @sales_id OR u.warehouse_id = @warehouse_id)
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
      countText = `All Warehouse Contacts (${memberCount} Members)`;
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

    // 1. Sender cannot message themselves
    if (parseInt(senderId, 10) === parseInt(recipientId, 10)) {
      throw new Error('Sender cannot message themselves');
    }

    // 2. Lookup recipient
    const recipientRes = await pool.request()
      .input('id', sql.Int, parseInt(recipientId, 10))
      .query('SELECT id, first_name, last_name, role, warehouse_id, status FROM Users WHERE id = @id');
    const recipient = recipientRes.recordset[0];

    if (!recipient || recipient.status !== 'Active') {
      throw new Error('Invalid or inactive message recipient');
    }

    // Lookup sender for warehouse info
    const senderRes = await pool.request()
      .input('id', sql.Int, parseInt(senderId, 10))
      .query('SELECT warehouse_id FROM Users WHERE id = @id');
    const senderWarehouseId = senderRes.recordset[0]?.warehouse_id;

    if (complaintId === 'DIRECT') {
      if (senderRole === 'Sales Executive') {
        if (recipient.role !== 'Warehouse Team' && recipient.role !== 'Warehouse Manager') {
          throw new Error('Sales Executive can only message Warehouse Team or Warehouse Manager');
        }
        const compRes = await pool.request()
          .input('sales_id', sql.Int, parseInt(senderId, 10))
          .input('warehouse_id', sql.Int, recipient.warehouse_id)
          .query('SELECT COUNT(*) as count FROM Complaints WHERE sales_executive_id = @sales_id AND warehouse_id = @warehouse_id');
        if (compRes.recordset[0].count === 0) {
          throw new Error('Recipient does not belong to any warehouse handling your complaints');
        }
      } else if (senderRole === 'Warehouse Team') {
        const isSalesExec = recipient.role === 'Sales Executive';
        const isMyManager = recipient.role === 'Warehouse Manager' && recipient.warehouse_id === senderWarehouseId;
        const isMyTeam = recipient.role === 'Warehouse Team' && recipient.warehouse_id === senderWarehouseId;
        
        if (isSalesExec) {
          const compRes = await pool.request()
            .input('sales_id', sql.Int, recipient.id)
            .input('warehouse_id', sql.Int, senderWarehouseId)
            .query('SELECT COUNT(*) as count FROM Complaints WHERE sales_executive_id = @sales_id AND warehouse_id = @warehouse_id');
          if (compRes.recordset[0].count === 0) {
            throw new Error('Cannot message Sales Executive who has no complaints in your warehouse');
          }
        } else if (!isMyManager && !isMyTeam) {
          throw new Error('Warehouse Team can only message the Sales Executive, their Warehouse Manager, or other Warehouse Team members');
        }
      } else if (senderRole === 'Warehouse Manager') {
        const isSalesExec = recipient.role === 'Sales Executive';
        const isMyTeam = recipient.role === 'Warehouse Team' && recipient.warehouse_id === senderWarehouseId;
        
        if (isSalesExec) {
          const compRes = await pool.request()
            .input('sales_id', sql.Int, recipient.id)
            .input('warehouse_id', sql.Int, senderWarehouseId)
            .query('SELECT COUNT(*) as count FROM Complaints WHERE sales_executive_id = @sales_id AND warehouse_id = @warehouse_id');
          if (compRes.recordset[0].count === 0) {
            throw new Error('Cannot message Sales Executive who has no complaints in your warehouse');
          }
        } else if (!isMyTeam) {
          throw new Error('Warehouse Manager can only message the Sales Executive or Warehouse Team members');
        }
      }

      return {
        recipient_id: recipient.id,
        recipient_role: recipient.role
      };
    }

    // 3. Lookup complaint
    const compRes = await pool.request()
      .input('complaint_id', sql.VarChar, String(complaintId))
      .query('SELECT id, complaint_number, status, warehouse_id, sales_executive_id FROM Complaints WHERE complaint_number = @complaint_id OR CAST(id AS VARCHAR) = @complaint_id');
    const complaint = compRes.recordset[0];

    if (!complaint) {
      throw new Error('Complaint not found');
    }

    // Validate permission matrix
    if (senderRole === 'Sales Executive') {
      if (recipient.role !== 'Warehouse Team' && recipient.role !== 'Warehouse Manager') {
        throw new Error('Sales Executive can only message Warehouse Team or Warehouse Manager');
      }
      if (recipient.warehouse_id !== complaint.warehouse_id) {
        throw new Error('Recipient does not belong to the warehouse handling this complaint');
      }
    } else if (senderRole === 'Warehouse Team') {
      const isSalesExec = recipient.role === 'Sales Executive' && recipient.id === complaint.sales_executive_id;
      const isMyManager = recipient.role === 'Warehouse Manager' && recipient.warehouse_id === complaint.warehouse_id;
      if (!isSalesExec && !isMyManager) {
        throw new Error('Warehouse Team can only message the Sales Executive who raised the complaint or the Warehouse Manager');
      }
    } else if (senderRole === 'Warehouse Manager') {
      const isSalesExec = recipient.role === 'Sales Executive' && recipient.id === complaint.sales_executive_id;
      const isMyTeam = recipient.role === 'Warehouse Team' && recipient.warehouse_id === complaint.warehouse_id;
      if (!isSalesExec && !isMyTeam) {
        throw new Error('Warehouse Manager can only message the Sales Executive who raised the complaint or Warehouse Team members');
      }
    }

    return {
      recipient_id: recipient.id,
      recipient_role: recipient.role
    };
  }
}

module.exports = MessageRepository;
