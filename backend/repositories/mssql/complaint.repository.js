const { getPool, sql } = require('../../config/db');

class ComplaintRepository {
  async getFormMetadata() {
    const pool = getPool();
    const warehousesRes = await pool.request().query('SELECT id, name, location FROM Warehouses ORDER BY name ASC');
    const typesRes = await pool.request().query('SELECT id, name, description FROM ComplaintTypes ORDER BY id ASC');
    const subtypesRes = await pool.request().query('SELECT id, complaint_type_id, name FROM ComplaintSubtypes ORDER BY id ASC');

    return {
      warehouses: warehousesRes.recordset,
      complaintTypes: typesRes.recordset,
      complaintSubtypes: subtypesRes.recordset
    };
  }

  async create(data) {
    const pool = getPool();

    // 1. Auto-generate next complaint_number e.g. CMP-0001
    const maxRes = await pool.request().query(`
      SELECT MAX(CAST(SUBSTRING(complaint_number, 5, 8) AS INT)) AS maxSeq 
      FROM Complaints
      WHERE ISNUMERIC(SUBSTRING(complaint_number, 5, 8)) = 1
    `);
    const nextSeq = (maxRes.recordset[0].maxSeq || 0) + 1;
    const complaintNumber = `CMP-${String(nextSeq).padStart(4, '0')}`;

    // 2. Lookup Warehouse Team user for auto-assignment based on selected warehouse_id
    const teamRes = await pool.request()
      .input('warehouse_id', sql.Int, data.warehouse_id)
      .query(`
        SELECT TOP 1 id FROM Users 
        WHERE role = 'Warehouse Team' AND warehouse_id = @warehouse_id AND status = 'Active'
      `);
    const assignedTeamId = teamRes.recordset[0]?.id || null;

    // 3. Insert Complaint into database
    const insertRes = await pool.request()
      .input('complaint_number', sql.VarChar, complaintNumber)
      .input('sales_executive_id', sql.Int, data.sales_executive_id)
      .input('warehouse_id', sql.Int, data.warehouse_id)
      .input('customer_code', sql.VarChar, data.customer_code)
      .input('invoice_number', sql.VarChar, data.invoice_number)
      .input('complaint_type_id', sql.Int, data.complaint_type_id)
      .input('complaint_subtype_id', sql.Int, data.complaint_subtype_id || null)
      .input('description', sql.NVarChar, data.description)
      .input('attachment_url', sql.VarChar, data.attachment_url || null)
      .input('assigned_team_id', sql.Int, assignedTeamId)
      .query(`
        INSERT INTO Complaints (
          complaint_number, sales_executive_id, warehouse_id, customer_code, invoice_number, 
          complaint_type_id, complaint_subtype_id, description, attachment_url, status, 
          assigned_warehouse_team_id, raised_at, warehouse_team_deadline
        )
        OUTPUT INSERTED.id, INSERTED.complaint_number
        VALUES (
          @complaint_number, @sales_executive_id, @warehouse_id, @customer_code, @invoice_number, 
          @complaint_type_id, @complaint_subtype_id, @description, @attachment_url, 'Assigned', 
          @assigned_team_id, GETDATE(), DATEADD(hour, 24, GETDATE())
        )
      `);

    const createdId = insertRes.recordset[0].id;

    // 4. Log initial ComplaintHistory entry
    await pool.request()
      .input('complaint_id', sql.Int, createdId)
      .input('performed_by', sql.Int, data.sales_executive_id)
      .input('notes', sql.NVarChar, `Complaint ${complaintNumber} raised by Sales Executive`)
      .query(`
        INSERT INTO ComplaintHistory (complaint_id, action, performed_by, notes)
        VALUES (@complaint_id, 'Created', @performed_by, @notes)
      `);

    return {
      id: createdId,
      complaint_number: complaintNumber,
      assigned_warehouse_team_id: assignedTeamId
    };
  }

  async findAll(userRole, userId, warehouseId, sortBy = 'date', history = false) {
    const pool = getPool();

    // 1. Automatic Escalation Check for expired SLAs past 24 hours
    const expiredRes = await pool.request().query(`
      SELECT id, complaint_number, warehouse_id 
      FROM Complaints 
      WHERE status IN ('Assigned', 'New', 'In Progress') 
        AND GETDATE() > warehouse_team_deadline
    `);

    if (expiredRes.recordset.length > 0) {
      for (const comp of expiredRes.recordset) {
        await pool.request()
          .input('id', comp.id)
          .query(`
            UPDATE Complaints 
            SET status = 'Escalated to Manager',
                escalated_to_manager_at = ISNULL(escalated_to_manager_at, GETDATE()),
                updated_at = GETDATE()
            WHERE id = @id
          `);

        await pool.request()
          .input('complaint_id', comp.id)
          .input('action', 'Automatic Escalation')
          .input('notes', 'Auto-escalated to Warehouse Manager due to 24h SLA expiry')
          .query(`
            INSERT INTO ComplaintHistory (complaint_id, action, notes)
            VALUES (@complaint_id, @action, @notes)
          `);
      }
    }

    let whereClause = 'WHERE 1=1';

    // Role-based data scoping (Enforces exact Visibility Matrix)
    if (userRole === 'Sales Executive') {
      whereClause += ` AND c.sales_executive_id = ${parseInt(userId, 10)} AND c.status <> 'Closed'`;
    } else if (userRole === 'Warehouse Team') {
      whereClause += ` AND c.warehouse_id = ${parseInt(warehouseId || 0, 10)} AND c.status <> 'Closed'`;
    } else if (userRole === 'Warehouse Manager') {
      if (history) {
        whereClause += ` AND c.warehouse_id = ${parseInt(warehouseId || 0, 10)} AND (c.status LIKE '%Escalated%' OR c.status = 'Escalated' OR c.escalated_to_manager_at IS NOT NULL) AND c.status <> 'Closed'`;
      } else {
        // Warehouse Managers MUST ONLY see complaints for their warehouse that have reached Escalated status!
        whereClause += ` AND c.warehouse_id = ${parseInt(warehouseId || 0, 10)} AND (c.status LIKE '%Escalated%' OR c.status = 'Escalated') AND c.status <> 'Closed'`;
      }
    }

    // Build ORDER BY clause based on sortBy parameter
    let orderByClause;
    if (sortBy === 'priority') {
      // Server-side priority ranking: Escalated → Red(<6h) → Amber(6-12h) → Green(>12h) → Completed last
      orderByClause = `
        ORDER BY
          CASE
            WHEN c.status LIKE '%Escalated%'                                                        THEN 1
            WHEN DATEDIFF(hour, GETDATE(), c.warehouse_team_deadline) < 6
                 AND c.status NOT IN ('Resolved', 'Completed')                                      THEN 2
            WHEN DATEDIFF(hour, GETDATE(), c.warehouse_team_deadline) BETWEEN 6 AND 12
                 AND c.status NOT IN ('Resolved', 'Completed')                                      THEN 3
            WHEN c.status IN ('Resolved', 'Completed')                                              THEN 5
            ELSE                                                                                         4
          END ASC,
          c.raised_at DESC
      `;
    } else {
      // Default: newest raised complaints first
      orderByClause = 'ORDER BY c.raised_at DESC';
    }

    const query = `
      SELECT 
        c.id,
        c.complaint_number AS id_display,
        c.customer_code AS customer,
        c.invoice_number AS invoice,
        ct.name AS type,
        cs.name AS subtype,
        (u_sales.first_name + ' ' + u_sales.last_name) AS raisedBy,
        CONVERT(VARCHAR(20), c.raised_at, 106) AS date,
        CONVERT(VARCHAR(30), c.raised_at, 126) AS raised_at_iso,
        c.status,
        w.name AS warehouse_name,
        c.attachment_url,
        (CASE WHEN c.attachment_url IS NOT NULL THEN 1 ELSE 0 END) AS attach,
        DATEDIFF(hour, GETDATE(), c.warehouse_team_deadline) AS hours_left,
        c.taken_action_by
      FROM Complaints c
      JOIN Users u_sales ON c.sales_executive_id = u_sales.id
      JOIN Warehouses w ON c.warehouse_id = w.id
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      LEFT JOIN ComplaintSubtypes cs ON c.complaint_subtype_id = cs.id
      ${whereClause}
      ${orderByClause}
    `;

    const result = await pool.request().query(query);
    return result.recordset.map(row => {
      const isResolved = row.status === 'Resolved' || row.status === 'Completed';
      let slaText = 'Resolved';
      if (!isResolved) {
        slaText = row.hours_left > 0 ? `${row.hours_left}h` : 'Expired !';
      }

      // Compute priority rank for display (mirrors the SQL CASE for client reference)
      let priorityLabel;
      if (row.status && row.status.includes('Escalated')) {
        priorityLabel = 'Critical';
      } else if (!isResolved && row.hours_left < 6) {
        priorityLabel = 'High';
      } else if (!isResolved && row.hours_left <= 12) {
        priorityLabel = 'Medium';
      } else if (isResolved) {
        priorityLabel = 'Completed';
      } else {
        priorityLabel = 'Low';
      }

      return {
        id: row.id_display,
        customer: row.customer,
        invoice: row.invoice,
        type: row.type,
        subtype: row.subtype || 'General',
        raisedBy: row.raisedBy,
        date: row.date,
        raised_at: row.raised_at_iso,   // Raw ISO timestamp for spot-checking
        sla: slaText,
        hours_left: isResolved ? 999 : row.hours_left,
        status: row.status,
        priority: priorityLabel,
        department: row.warehouse_name, // Warehouse name — used in table column
        warehouse_name: row.warehouse_name,
        attach: Boolean(row.attach),
        attachment_url: row.attachment_url,
        taken_action_by: row.taken_action_by
      };
    });
  }

  async updateStatus(complaintIdOrNumber, targetStatusOrAction, userId, userRole) {
    const pool = getPool();

    // 1. Resolve Complaint
    const compRes = await pool.request()
      .input('comp_id', sql.VarChar, String(complaintIdOrNumber))
      .query(`
        SELECT id, complaint_number, status, warehouse_id 
        FROM Complaints 
        WHERE complaint_number = @comp_id OR CAST(id AS VARCHAR) = @comp_id
      `);

    if (compRes.recordset.length === 0) {
      throw new Error(`Complaint ${complaintIdOrNumber} not found.`);
    }

    const comp = compRes.recordset[0];
    let newStatus = comp.status;
    let actionName = targetStatusOrAction;

    if (targetStatusOrAction === 'In Progress' || targetStatusOrAction === 'Take Action') {
      newStatus = 'In Progress';
      actionName = 'Take Action';
    } else if (targetStatusOrAction === 'Resolved' || targetStatusOrAction === 'Completed' || targetStatusOrAction === 'Complete') {
      newStatus = 'Resolved';
      actionName = 'Complete';
    } else if (targetStatusOrAction === 'Escalate' || targetStatusOrAction === 'Escalated' || targetStatusOrAction === 'Escalated to Manager' || targetStatusOrAction === 'Escalated to Warehouse Head') {
      if (userRole === 'Warehouse Manager') {
        newStatus = 'Escalated to Warehouse Head';
        actionName = 'Escalated to Warehouse Head';
      } else {
        newStatus = 'Escalated to Manager';
        actionName = 'Escalated to Manager';
      }
    } else {
      newStatus = targetStatusOrAction;
    }

    // 2. Update status in database
    await pool.request()
      .input('id', sql.Int, comp.id)
      .input('new_status', sql.VarChar, newStatus)
      .input('user_id', sql.Int, parseInt(userId, 10))
      .query(`
        UPDATE Complaints 
        SET status = @new_status,
            updated_at = GETDATE(),
            taken_action_by = (CASE WHEN @new_status = 'In Progress' THEN @user_id ELSE taken_action_by END),
            warehouse_team_responded_at = (CASE WHEN @new_status = 'In Progress' THEN ISNULL(warehouse_team_responded_at, GETDATE()) ELSE warehouse_team_responded_at END),
            escalated_to_manager_at = (CASE WHEN @new_status LIKE '%Escalated%' THEN ISNULL(escalated_to_manager_at, GETDATE()) ELSE escalated_to_manager_at END)
        WHERE id = @id
      `);

    // 3. Log history
    await pool.request()
      .input('complaint_id', sql.Int, comp.id)
      .input('action', sql.VarChar, actionName)
      .input('performed_by', sql.Int, parseInt(userId, 10))
      .input('notes', sql.NVarChar, `Status updated to '${newStatus}' by ${userRole}`)
      .query(`
        INSERT INTO ComplaintHistory (complaint_id, action, performed_by, notes)
        VALUES (@complaint_id, @action, @performed_by, @notes)
      `);

    return { id: comp.complaint_number, status: newStatus };
  }

  async getFormMetadata() {
    const pool = getPool();
    const warehousesRes = await pool.request().query("SELECT id, name, location FROM Warehouses ORDER BY id ASC");
    const typesRes = await pool.request().query("SELECT id, name, description FROM ComplaintTypes ORDER BY id ASC");
    const subtypesRes = await pool.request().query("SELECT id, complaint_type_id, name FROM ComplaintSubtypes ORDER BY id ASC");

    return {
      warehouses: warehousesRes.recordset,
      complaintTypes: typesRes.recordset,
      complaintSubtypes: subtypesRes.recordset
    };
  }

  async getStats(userRole, userId, warehouseId) {
    const pool = getPool();

    // Trigger auto-escalations first so stats match real-time DB state
    await this.findAll(userRole, userId, warehouseId);

    let whereClause = 'WHERE 1=1';

    if (userRole === 'Sales Executive') {
      whereClause += ` AND c.sales_executive_id = ${parseInt(userId, 10)} AND c.status <> 'Closed'`;
    } else if (userRole === 'Warehouse Team') {
      whereClause += ` AND c.warehouse_id = ${parseInt(warehouseId || 0, 10)} AND c.status <> 'Closed'`;
    } else if (userRole === 'Warehouse Manager') {
      whereClause += ` AND c.warehouse_id = ${parseInt(warehouseId || 0, 10)} AND (c.status LIKE '%Escalated%' OR c.status = 'Escalated') AND c.status <> 'Closed'`;
    }

    const query = `
      SELECT 
        COUNT(*) AS totalCount,
        SUM(CASE WHEN c.status IN ('Pending', 'Assigned', 'New') THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS inprogressCount,
        SUM(CASE WHEN c.status LIKE '%Escalated%' OR c.status = 'Escalated' THEN 1 ELSE 0 END) AS escalatedCount,
        SUM(CASE WHEN c.status IN ('Completed', 'Resolved') THEN 1 ELSE 0 END) AS completedCount
      FROM Complaints c
      ${whereClause}
    `;

    const res = await pool.request().query(query);
    const row = res.recordset[0] || {};

    return {
      totalCount: row.totalCount || 0,
      pendingCount: row.pendingCount || 0,
      inprogressCount: row.inprogressCount || 0,
      escalatedCount: row.escalatedCount || 0,
      completedCount: row.completedCount || 0
    };
  }
}

module.exports = ComplaintRepository;
