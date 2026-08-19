const { getPool, sql } = require('../../config/db');

class ReportRepository {
  /**
   * Helper to build date range WHERE clause snippet and register params.
   */
  getDateRangeClause(period, startDate, endDate, requestObj, tableAlias = 'c') {
    let clause = '';

    if (period === 'all') {
      clause = ''; // All Time - no date constraint
    } else if (period === 'today') {
      clause = ` AND ${tableAlias}.raised_at >= CAST(GETDATE() AS DATE)`;
    } else if (period === 'week') {
      clause = ` AND ${tableAlias}.raised_at >= DATEADD(day, -7, GETDATE())`;
    } else if (period === 'month') {
      clause = ` AND ${tableAlias}.raised_at >= DATEADD(month, -1, GETDATE())`;
    } else if (period === 'custom' && startDate && endDate) {
      requestObj.input('startDate', sql.VarChar, startDate);
      requestObj.input('endDate', sql.VarChar, endDate);
      clause = ` AND ${tableAlias}.raised_at >= CAST(@startDate AS DATETIME) AND ${tableAlias}.raised_at < DATEADD(day, 1, CAST(@endDate AS DATETIME))`;
    } else {
      // Default fallback: past 30 days
      clause = ` AND ${tableAlias}.raised_at >= DATEADD(day, -30, GETDATE())`;
    }

    return clause;
  }

  formatDuration(avgMinutes) {
    if (!avgMinutes || avgMinutes <= 0) return '0 hrs';
    const mins = Math.round(avgMinutes);
    if (mins < 60) {
      return `${mins === 0 ? 1 : mins} mins`;
    }
    return `${(avgMinutes / 60).toFixed(1)} hrs`;
  }

  calculateMostCommonIssue(subtypeArray) {
    if (!subtypeArray || subtypeArray.length === 0) {
      return { names: [], maxCount: 0, display: 'N/A' };
    }
    const items = subtypeArray.map(item => ({
      name: item.subtypeName || item.name || 'General',
      count: item.count !== undefined ? item.count : (item.value || 0)
    }));

    const maxCount = Math.max(...items.map(i => i.count));
    if (maxCount <= 0) {
      return { names: [], maxCount: 0, display: 'N/A' };
    }
    const topItems = items.filter(i => i.count === maxCount);
    const names = topItems.map(i => i.name);
    const namesStr = names.join(', ');
    const unit = maxCount > 1 ? 'complaints' : 'complaint';
    const display = topItems.length > 1 
      ? `${namesStr} (${maxCount} ${unit} each)` 
      : `${namesStr} (${maxCount} ${unit})`;
    
    return {
      names,
      maxCount,
      display
    };
  }

  /**
   * 1. Sales Executive Report: "My Complaints Report"
   * Scoped strictly to complaints raised by logged-in Sales Executive.
   */
  async getSalesExecutiveReport(userId, period, startDate, endDate) {
    const pool = getPool();
    const request = pool.request();
    request.input('userId', sql.Int, parseInt(userId, 10));
    const dateClause = this.getDateRangeClause(period, startDate, endDate, request, 'c');

    // 1. Executive Summary & KPIs
    const summaryQuery = `
      SELECT 
        COUNT(*) AS totalRaised,
        SUM(CASE WHEN c.status IN ('New', 'Pending') THEN 1 ELSE 0 END) AS newPendingCount,
        SUM(CASE WHEN c.status = 'Assigned' THEN 1 ELSE 0 END) AS assignedCount,
        SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS inProgressCount,
        SUM(CASE WHEN c.status = 'Escalated to Manager' THEN 1 ELSE 0 END) AS escalatedToManagerCount,
        SUM(CASE WHEN c.status = 'Escalated to Warehouse Head' THEN 1 ELSE 0 END) AS escalatedToHeadCount,
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolvedCount,
        SUM(CASE WHEN c.status = 'Completed' THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') THEN 1 ELSE 0 END) AS totalResolvedCompleted,
        SUM(CASE WHEN c.status NOT IN ('Resolved', 'Completed', 'Closed') THEN 1 ELSE 0 END) AS openCount,
        SUM(CASE WHEN c.status LIKE '%Escalated%' THEN 1 ELSE 0 END) AS totalEscalated,
        
        -- SLA Met: Resolved/Completed within SLA deadline without unresolved escalation
        SUM(CASE 
          WHEN c.status IN ('Resolved', 'Completed') 
               AND (c.updated_at <= c.warehouse_team_deadline OR c.warehouse_team_deadline IS NULL OR c.escalated_to_manager_at IS NULL)
          THEN 1 ELSE 0 
        END) AS slaMetCount,
        
        -- SLA Breached: Currently escalated or open past deadline or resolved after deadline with escalation
        SUM(CASE 
          WHEN c.status LIKE '%Escalated%' 
               OR (c.status NOT IN ('Resolved', 'Completed') AND GETDATE() > c.warehouse_team_deadline)
               OR (c.status IN ('Resolved', 'Completed') AND c.updated_at > c.warehouse_team_deadline AND c.escalated_to_manager_at IS NOT NULL)
          THEN 1 ELSE 0 
        END) AS slaBreachedCount,

        -- Valid non-negative resolution time (in minutes)
        AVG(CASE 
          WHEN c.status IN ('Resolved', 'Completed') AND c.updated_at >= c.raised_at 
          THEN DATEDIFF(minute, c.raised_at, c.updated_at)
          ELSE NULL 
        END) AS avgResolutionMinutes,

        -- Valid non-negative first response time (in minutes)
        AVG(CASE 
          WHEN c.warehouse_team_responded_at IS NOT NULL AND c.warehouse_team_responded_at >= c.raised_at 
          THEN DATEDIFF(minute, c.raised_at, c.warehouse_team_responded_at)
          ELSE NULL 
        END) AS avgFirstResponseMinutes,

        SUM(CASE WHEN c.status NOT IN ('Resolved', 'Completed') AND c.warehouse_team_deadline IS NOT NULL AND GETDATE() <= c.warehouse_team_deadline AND DATEDIFF(hour, GETDATE(), c.warehouse_team_deadline) <= 4 THEN 1 ELSE 0 END) AS approachingDeadlineCount,
        SUM(CASE WHEN c.status NOT IN ('Resolved', 'Completed') AND c.warehouse_team_deadline IS NOT NULL AND GETDATE() > c.warehouse_team_deadline THEN 1 ELSE 0 END) AS overdueCount
      FROM Complaints c
      WHERE c.sales_executive_id = @userId ${dateClause}
    `;
    const summaryRes = await request.query(summaryQuery);
    const s = summaryRes.recordset[0] || {};

    const totalRaised = s.totalRaised || 0;
    const totalResolvedCompleted = s.totalResolvedCompleted || 0;
    const totalEscalated = s.totalEscalated || 0;
    const slaMetCount = s.slaMetCount || 0;
    const slaBreachedCount = s.slaBreachedCount || 0;

    const resolutionRate = totalRaised > 0 ? parseFloat(((totalResolvedCompleted / totalRaised) * 100).toFixed(2)) : 0;
    const escalationRate = totalRaised > 0 ? parseFloat(((totalEscalated / totalRaised) * 100).toFixed(2)) : 0;
    const totalSlaEvaluated = slaMetCount + slaBreachedCount;
    const slaComplianceRate = totalSlaEvaluated > 0 ? parseFloat(((slaMetCount / totalSlaEvaluated) * 100).toFixed(2)) : 100;
    const avgResolutionHours = s.avgResolutionMinutes ? parseFloat((s.avgResolutionMinutes / 60.0).toFixed(1)) : 0.0;
    const avgFirstResponseHours = s.avgFirstResponseMinutes ? parseFloat((s.avgFirstResponseMinutes / 60.0).toFixed(1)) : 0.0;

    // 2. Status Breakdown
    const reqStatus = pool.request();
    reqStatus.input('userId', sql.Int, parseInt(userId, 10));
    const dateClauseStatus = this.getDateRangeClause(period, startDate, endDate, reqStatus, 'c');
    const statusQuery = `
      SELECT 
        c.status AS name, 
        COUNT(*) AS value,
        CAST(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM Complaints c2 WHERE c2.sales_executive_id = @userId ${dateClauseStatus.replace(/c\./g, 'c2.')}), 0), 1) AS FLOAT) AS percentage
      FROM Complaints c
      WHERE c.sales_executive_id = @userId ${dateClauseStatus}
      GROUP BY c.status
      ORDER BY value DESC
    `;
    const statusRes = await reqStatus.query(statusQuery);

    // 3. Complaint Type Breakdown
    const reqType = pool.request();
    reqType.input('userId', sql.Int, parseInt(userId, 10));
    const dateClauseType = this.getDateRangeClause(period, startDate, endDate, reqType, 'c');
    const typeQuery = `
      SELECT 
        ct.name AS typeName,
        COUNT(*) AS count,
        CAST(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM Complaints c2 WHERE c2.sales_executive_id = @userId ${dateClauseType.replace(/c\./g, 'c2.')}), 0), 1) AS FLOAT) AS percentage
      FROM Complaints c
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      WHERE c.sales_executive_id = @userId ${dateClauseType}
      GROUP BY ct.name
      ORDER BY count DESC
    `;
    const typeRes = await reqType.query(typeQuery);

    // 4. Complaint Subtype Breakdown
    const reqSubtype = pool.request();
    reqSubtype.input('userId', sql.Int, parseInt(userId, 10));
    const dateClauseSubtype = this.getDateRangeClause(period, startDate, endDate, reqSubtype, 'c');
    const subtypeQuery = `
      SELECT 
        ct.name AS typeName,
        CASE 
          WHEN cs.name IS NOT NULL AND cs.name <> 'General' THEN cs.name
          ELSE 'General (' + ct.name + ')'
        END AS subtypeName,
        COUNT(*) AS count,
        CAST(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM Complaints c2 WHERE c2.sales_executive_id = @userId ${dateClauseSubtype.replace(/c\./g, 'c2.')}), 0), 1) AS FLOAT) AS percentage
      FROM Complaints c
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      LEFT JOIN ComplaintSubtypes cs ON c.complaint_subtype_id = cs.id
      WHERE c.sales_executive_id = @userId ${dateClauseSubtype}
      GROUP BY ct.name, cs.name
      ORDER BY count DESC
    `;
    const subtypeRes = await reqSubtype.query(subtypeQuery);

    // 5. Complaint Trend Over Time (Adaptive Granularity)
    const reqTrend = pool.request();
    reqTrend.input('userId', sql.Int, parseInt(userId, 10));
    const dateClauseTrend = this.getDateRangeClause(period, startDate, endDate, reqTrend, 'c');
    
    let trendGroupExpr = "CONVERT(VARCHAR(10), c.raised_at, 120)";
    if (period === 'today') {
      trendGroupExpr = "FORMAT(c.raised_at, 'HH:00')";
    } else if (period === 'month') {
      trendGroupExpr = "('Week ' + CAST(DATEPART(week, c.raised_at) AS VARCHAR))";
    } else if (period === 'all') {
      trendGroupExpr = "FORMAT(c.raised_at, 'yyyy-MM')";
    }

    const trendQuery = `
      SELECT 
        ${trendGroupExpr} AS label,
        COUNT(*) AS count
      FROM Complaints c
      WHERE c.sales_executive_id = @userId ${dateClauseTrend}
      GROUP BY ${trendGroupExpr}
      ORDER BY label ASC
    `;
    const trendRes = await reqTrend.query(trendQuery);

    // 6. Warehouse-wise Breakdown
    const reqWarehouse = pool.request();
    reqWarehouse.input('userId', sql.Int, parseInt(userId, 10));
    const dateClauseWarehouse = this.getDateRangeClause(period, startDate, endDate, reqWarehouse, 'c');
    const warehouseQuery = `
      SELECT 
        w.name AS warehouseName,
        COUNT(*) AS totalCount,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') THEN 1 ELSE 0 END) AS resolvedCount,
        SUM(CASE WHEN c.status LIKE '%Escalated%' THEN 1 ELSE 0 END) AS escalatedCount,
        SUM(CASE WHEN c.status NOT IN ('Resolved', 'Completed') THEN 1 ELSE 0 END) AS pendingCount
      FROM Complaints c
      JOIN Warehouses w ON c.warehouse_id = w.id
      WHERE c.sales_executive_id = @userId ${dateClauseWarehouse}
      GROUP BY w.name
      ORDER BY totalCount DESC
    `;
    const warehouseRes = await reqWarehouse.query(warehouseQuery);

    // 7. Complaint Aging Buckets (For Open Complaints)
    const reqAging = pool.request();
    reqAging.input('userId', sql.Int, parseInt(userId, 10));
    const dateClauseAging = this.getDateRangeClause(period, startDate, endDate, reqAging, 'c');
    const agingQuery = `
      SELECT 
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) <= 24 THEN 1 ELSE 0 END) AS bucketLessThan24h,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 24 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 72 THEN 1 ELSE 0 END) AS bucket1To3Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 72 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 168 THEN 1 ELSE 0 END) AS bucket4To7Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 168 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 336 THEN 1 ELSE 0 END) AS bucket8To14Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 336 THEN 1 ELSE 0 END) AS bucket15PlusDays
      FROM Complaints c
      WHERE c.sales_executive_id = @userId 
        AND c.status NOT IN ('Resolved', 'Completed', 'Closed') ${dateClauseAging}
    `;
    const agingRes = await reqAging.query(agingQuery);
    const ag = agingRes.recordset[0] || {};
    const agingBuckets = [
      { bucket: '< 1 Day', count: ag.bucketLessThan24h || 0 },
      { bucket: '1-3 Days', count: ag.bucket1To3Days || 0 },
      { bucket: '4-7 Days', count: ag.bucket4To7Days || 0 },
      { bucket: '8-14 Days', count: ag.bucket8To14Days || 0 },
      { bucket: '15+ Days', count: ag.bucket15PlusDays || 0 },
    ];

    // 8. Detailed Complaints Table
    const reqDetails = pool.request();
    reqDetails.input('userId', sql.Int, parseInt(userId, 10));
    const dateClauseDetails = this.getDateRangeClause(period, startDate, endDate, reqDetails, 'c');
    const detailsQuery = `
      SELECT 
        c.id,
        c.complaint_number,
        c.customer_code,
        c.invoice_number,
        ct.name AS type,
        ISNULL(cs.name, 'General') AS subtype,
        w.name AS warehouse_name,
        CONVERT(VARCHAR(20), c.raised_at, 106) AS raised_date,
        CONVERT(VARCHAR(30), c.raised_at, 126) AS raised_at_iso,
        c.status,
        c.warehouse_team_deadline,
        c.manager_deadline,
        c.warehouse_team_responded_at,
        c.escalated_to_manager_at,
        c.manager_responded_at,
        CASE WHEN c.status IN ('Resolved', 'Completed') THEN CONVERT(VARCHAR(20), c.updated_at, 106) ELSE 'N/A' END AS resolved_date,
        CASE 
          WHEN c.status IN ('Resolved', 'Completed') AND (c.escalated_to_manager_at IS NULL OR DATEDIFF(hour, c.raised_at, ISNULL(c.updated_at, GETDATE())) <= 24) THEN 'SLA Met'
          WHEN c.escalated_to_manager_at IS NOT NULL OR (c.warehouse_team_deadline IS NOT NULL AND GETDATE() > c.warehouse_team_deadline) THEN 'SLA Breached'
          ELSE 'In Progress'
        END AS sla_status
      FROM Complaints c
      JOIN Warehouses w ON c.warehouse_id = w.id
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      LEFT JOIN ComplaintSubtypes cs ON c.complaint_subtype_id = cs.id
      WHERE c.sales_executive_id = @userId ${dateClauseDetails}
      ORDER BY c.raised_at DESC
    `;
    const detailsRes = await reqDetails.query(detailsQuery);

    return {
      summary: {
        totalRaised,
        newPendingCount: s.newPendingCount || 0,
        assignedCount: s.assignedCount || 0,
        inProgressCount: s.inProgressCount || 0,
        escalatedToManagerCount: s.escalatedToManagerCount || 0,
        escalatedToHeadCount: s.escalatedToHeadCount || 0,
        resolvedCount: s.resolvedCount || 0,
        completedCount: s.completedCount || 0,
        totalResolvedCompleted,
        openCount: s.openCount || 0,
        totalEscalated,
        resolutionRate,
        escalationRate,
        slaMetCount,
        slaBreachedCount,
        slaComplianceRate,
        avgResolutionHours,
        avgFirstResponseHours,
        approachingDeadlineCount: s.approachingDeadlineCount || 0,
        overdueCount: s.overdueCount || 0
      },
      statusBreakdown: statusRes.recordset,
      typeBreakdown: typeRes.recordset,
      subtypeBreakdown: subtypeRes.recordset,
      complaintTrend: trendRes.recordset,
      warehouseBreakdown: warehouseRes.recordset,
      agingBuckets,
      escalationAnalysis: {
        totalEscalated,
        escalatedToManager: s.escalatedToManagerCount || 0,
        escalatedToHead: s.escalatedToHeadCount || 0,
        nonEscalated: totalRaised - totalEscalated,
        escalationRate
      },
      slaPerformance: {
        slaMetCount,
        slaBreachedCount,
        slaComplianceRate,
        slaDistribution: [
          { name: 'SLA Met', value: slaMetCount },
          { name: 'SLA Breached', value: slaBreachedCount }
        ]
      },
      detailedComplaints: detailsRes.recordset
    };
  }

  /**
   * 2. Warehouse Team Report: "My Performance Report"
   * Personal scope: logged-in team member's assigned/claimed/completed complaints.
   * Warehouse scope: team member's assigned warehouse.
   */
  async getWarehouseTeamReport(userId, warehouseId, period, startDate, endDate) {
    const pool = getPool();
    const reqPersonal = pool.request();
    reqPersonal.input('userId', sql.Int, parseInt(userId, 10));
    reqPersonal.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClausePersonal = this.getDateRangeClause(period, startDate, endDate, reqPersonal, 'c');

    // 1. Personal Summary Numbers
    const personalQuery = `
      SELECT 
        COUNT(*) AS handledCount,
        SUM(CASE WHEN c.status IN ('Pending', 'Assigned', 'New') THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS inProgressCount,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN c.status LIKE '%Escalated%' THEN 1 ELSE 0 END) AS escalatedCount,
        AVG(CASE 
          WHEN c.status IN ('Resolved', 'Completed') THEN DATEDIFF(minute, ISNULL(c.warehouse_team_responded_at, c.raised_at), ISNULL(c.updated_at, GETDATE()))
          ELSE NULL 
        END) AS avgCompletionMinutes,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') AND DATEDIFF(hour, c.raised_at, ISNULL(c.updated_at, GETDATE())) <= 24 THEN 1 ELSE 0 END) AS resolvedWithin24h
      FROM Complaints c
      WHERE c.warehouse_id = @warehouseId 
        AND @userId = ISNULL(c.taken_action_by, c.assigned_warehouse_team_id) ${dateClausePersonal}
    `;
    const personalRes = await reqPersonal.query(personalQuery);
    const p = personalRes.recordset[0] || {};

    const avgCompletionHours = this.formatDuration(p.avgCompletionMinutes);
    const totalCompleted = p.completedCount || 0;
    const resolvedWithin24h = p.resolvedWithin24h || 0;
    const personalSlaCompliance = totalCompleted > 0 ? Math.round((resolvedWithin24h / totalCompleted) * 100) : 100;

    // 2. Personal Status Breakdown
    const reqStatus = pool.request();
    reqStatus.input('userId', sql.Int, parseInt(userId, 10));
    reqStatus.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseStatus = this.getDateRangeClause(period, startDate, endDate, reqStatus, 'c');
    const statusQuery = `
      SELECT 
        c.status AS name, 
        COUNT(*) AS value,
        CAST(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM Complaints c2 WHERE c2.warehouse_id = @warehouseId AND @userId = ISNULL(c2.taken_action_by, c2.assigned_warehouse_team_id) ${dateClauseStatus.replace(/c\./g, 'c2.')}), 0), 1) AS FLOAT) AS percentage
      FROM Complaints c
      WHERE c.warehouse_id = @warehouseId AND @userId = ISNULL(c.taken_action_by, c.assigned_warehouse_team_id) ${dateClauseStatus}
      GROUP BY c.status
    `;
    const statusRes = await reqStatus.query(statusQuery);

    // 3. Personal Subtype Breakdown
    const reqType = pool.request();
    reqType.input('userId', sql.Int, parseInt(userId, 10));
    reqType.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseType = this.getDateRangeClause(period, startDate, endDate, reqType, 'c');
    const typeQuery = `
      SELECT 
        ct.name AS typeName,
        CASE 
          WHEN cs.name IS NOT NULL AND cs.name <> 'General' THEN cs.name
          ELSE 'General (' + ct.name + ')'
        END AS subtypeName,
        COUNT(*) AS count
      FROM Complaints c
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      LEFT JOIN ComplaintSubtypes cs ON c.complaint_subtype_id = cs.id
      WHERE c.warehouse_id = @warehouseId AND @userId = ISNULL(c.taken_action_by, c.assigned_warehouse_team_id) ${dateClauseType}
      GROUP BY ct.name, cs.name
      ORDER BY count DESC
    `;
    const typeRes = await reqType.query(typeQuery);

    // 4. Warehouse-Wide Complaint Trend (Calendar Date / Date-Range Labels)
    const reqTrend = pool.request();
    reqTrend.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseTrend = this.getDateRangeClause(period, startDate, endDate, reqTrend, 'c');
    const isShortRange = period === 'today' || period === 'week';
    
    let trendQuery = '';
    if (isShortRange) {
      trendQuery = `
        SELECT 
          FORMAT(c.raised_at, 'dd MMM') AS label,
          COUNT(*) AS count
        FROM Complaints c
        WHERE c.warehouse_id = @warehouseId ${dateClauseTrend}
        GROUP BY CONVERT(VARCHAR(10), c.raised_at, 120), FORMAT(c.raised_at, 'dd MMM')
        ORDER BY CONVERT(VARCHAR(10), c.raised_at, 120) ASC
      `;
    } else {
      trendQuery = `
        SELECT 
          CASE 
            WHEN FORMAT(MIN(c.raised_at), 'dd MMM') = FORMAT(MAX(c.raised_at), 'dd MMM') 
            THEN FORMAT(MIN(c.raised_at), 'dd MMM')
            ELSE FORMAT(MIN(c.raised_at), 'dd MMM') + ' – ' + FORMAT(MAX(c.raised_at), 'dd MMM')
          END AS label,
          COUNT(*) AS count
        FROM Complaints c
        WHERE c.warehouse_id = @warehouseId ${dateClauseTrend}
        GROUP BY DATEPART(year, c.raised_at), DATEPART(week, c.raised_at)
        ORDER BY MIN(c.raised_at) ASC
      `;
    }
    const trendRes = await reqTrend.query(trendQuery);

    // 5. Warehouse-Wide Overview
    const reqWh = pool.request();
    reqWh.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseWh = this.getDateRangeClause(period, startDate, endDate, reqWh, 'c');
    const whQuery = `
      SELECT 
        COUNT(*) AS totalWarehouseComplaints,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') AND c.escalated_to_manager_at IS NULL THEN 1 ELSE 0 END) AS resolvedDirectlyByTeam,
        SUM(CASE WHEN c.escalated_to_manager_at IS NOT NULL THEN 1 ELSE 0 END) AS escalatedToManager
      FROM Complaints c
      WHERE c.warehouse_id = @warehouseId ${dateClauseWh}
    `;
    const whRes = await reqWh.query(whQuery);
    const wh = whRes.recordset[0] || {};

    // 6. Open Complaint Aging Buckets
    const reqAging = pool.request();
    reqAging.input('userId', sql.Int, parseInt(userId, 10));
    reqAging.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseAging = this.getDateRangeClause(period, startDate, endDate, reqAging, 'c');
    const agingQuery = `
      SELECT 
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) <= 24 THEN 1 ELSE 0 END) AS bucketLessThan24h,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 24 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 72 THEN 1 ELSE 0 END) AS bucket1To3Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 72 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 168 THEN 1 ELSE 0 END) AS bucket4To7Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 168 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 336 THEN 1 ELSE 0 END) AS bucket8To14Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 336 THEN 1 ELSE 0 END) AS bucket15PlusDays
      FROM Complaints c
      WHERE c.warehouse_id = @warehouseId 
        AND @userId = ISNULL(c.taken_action_by, c.assigned_warehouse_team_id)
        AND c.status NOT IN ('Resolved', 'Completed', 'Closed') ${dateClauseAging}
    `;
    const agingRes = await reqAging.query(agingQuery);
    const ag = agingRes.recordset[0] || {};
    const agingBuckets = [
      { bucket: '< 1 Day', count: ag.bucketLessThan24h || 0 },
      { bucket: '1-3 Days', count: ag.bucket1To3Days || 0 },
      { bucket: '4-7 Days', count: ag.bucket4To7Days || 0 },
      { bucket: '8-14 Days', count: ag.bucket8To14Days || 0 },
      { bucket: '15+ Days', count: ag.bucket15PlusDays || 0 },
    ];

    // 7. Detailed Personal Complaints Table
    const reqDetails = pool.request();
    reqDetails.input('userId', sql.Int, parseInt(userId, 10));
    reqDetails.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseDetails = this.getDateRangeClause(period, startDate, endDate, reqDetails, 'c');
    const detailsQuery = `
      SELECT 
        c.id,
        c.complaint_number,
        c.customer_code,
        c.invoice_number,
        ct.name AS type,
        ISNULL(cs.name, 'General') AS subtype,
        (u_sales.first_name + ' ' + u_sales.last_name) AS raisedBy,
        CONVERT(VARCHAR(20), c.raised_at, 106) AS raised_date,
        CONVERT(VARCHAR(30), c.raised_at, 126) AS raised_at_iso,
        c.status,
        CASE WHEN c.status IN ('Resolved', 'Completed') THEN CONVERT(VARCHAR(20), c.updated_at, 106) ELSE 'N/A' END AS resolved_date
      FROM Complaints c
      JOIN Users u_sales ON c.sales_executive_id = u_sales.id
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      LEFT JOIN ComplaintSubtypes cs ON c.complaint_subtype_id = cs.id
      WHERE c.warehouse_id = @warehouseId AND @userId = ISNULL(c.taken_action_by, c.assigned_warehouse_team_id) ${dateClauseDetails}
      ORDER BY c.raised_at DESC
    `;
    const detailsRes = await reqDetails.query(detailsQuery);

    return {
      personalSummary: {
        handledCount: p.handledCount || 0,
        pendingCount: p.pendingCount || 0,
        inProgressCount: p.inProgressCount || 0,
        completedCount: totalCompleted,
        escalatedCount: p.escalatedCount || 0,
        avgCompletionHours: parseFloat(avgCompletionHours),
        slaComplianceRate: personalSlaCompliance
      },
      statusBreakdown: statusRes.recordset,
      subtypeBreakdown: typeRes.recordset,
      mostCommonIssue: this.calculateMostCommonIssue(typeRes.recordset),
      complaintTrend: trendRes.recordset,
      agingBuckets,
      warehouseSummary: {
        totalWarehouseComplaints: wh.totalWarehouseComplaints || 0,
        resolvedDirectlyByTeam: wh.resolvedDirectlyByTeam || 0,
        escalatedToManager: wh.escalatedToManager || 0
      },
      detailedComplaints: detailsRes.recordset
    };
  }

  /**
   * 3. Warehouse Manager Report: "Warehouse Escalation Report"
   * Full warehouse-level oversight for assigned warehouse.
   */
  async getWarehouseManagerReport(warehouseId, period, startDate, endDate) {
    const pool = getPool();
    const reqSummary = pool.request();
    reqSummary.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseSummary = this.getDateRangeClause(period, startDate, endDate, reqSummary, 'c');

    // 1. Summary Numbers
    const summaryQuery = `
      SELECT 
        COUNT(*) AS totalComplaints,
        SUM(CASE WHEN c.status IN ('Pending', 'Assigned', 'New') THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS inProgressCount,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') THEN 1 ELSE 0 END) AS resolvedCount,
        SUM(CASE WHEN c.status NOT IN ('Resolved', 'Completed', 'Closed') THEN 1 ELSE 0 END) AS openCount,
        SUM(CASE WHEN c.escalated_to_manager_at IS NOT NULL THEN 1 ELSE 0 END) AS totalEscalated,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') AND c.escalated_to_manager_at IS NULL THEN 1 ELSE 0 END) AS resolvedDirectlyByTeam,
        AVG(CASE 
          WHEN c.escalated_to_manager_at IS NOT NULL AND c.status IN ('Resolved', 'Completed') 
          THEN DATEDIFF(minute, c.escalated_to_manager_at, ISNULL(c.updated_at, GETDATE()))
          ELSE NULL 
        END) AS avgEscalatedResolutionMinutes,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') AND DATEDIFF(hour, c.raised_at, ISNULL(c.updated_at, GETDATE())) <= 24 THEN 1 ELSE 0 END) AS resolvedWithinSla
      FROM Complaints c
      WHERE c.warehouse_id = @warehouseId ${dateClauseSummary}
    `;
    const summaryRes = await reqSummary.query(summaryQuery);
    const s = summaryRes.recordset[0] || {};

    const totalComplaints = s.totalComplaints || 0;
    const totalEscalated = s.totalEscalated || 0;
    const totalResolved = s.resolvedCount || 0;
    const escalationRate = totalComplaints > 0 ? Math.round((totalEscalated / totalComplaints) * 100) : 0;
    const avgEscalatedResolutionHours = this.formatDuration(s.avgEscalatedResolutionMinutes);
    const slaPerformanceRate = totalResolved > 0 ? Math.round(((s.resolvedWithinSla || 0) / totalResolved) * 100) : 100;

    // 2. Status Breakdown
    const reqStatus = pool.request();
    reqStatus.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseStatus = this.getDateRangeClause(period, startDate, endDate, reqStatus, 'c');
    const statusQuery = `
      SELECT 
        c.status AS name, 
        COUNT(*) AS value,
        CAST(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM Complaints c2 WHERE c2.warehouse_id = @warehouseId ${dateClauseStatus.replace(/c\./g, 'c2.')}), 0), 1) AS FLOAT) AS percentage
      FROM Complaints c
      WHERE c.warehouse_id = @warehouseId ${dateClauseStatus}
      GROUP BY c.status
    `;
    const statusRes = await reqStatus.query(statusQuery);

    // 3. Breakdown by Complaint Type / Subtype
    const reqType = pool.request();
    reqType.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseType = this.getDateRangeClause(period, startDate, endDate, reqType, 'c');
    const typeQuery = `
      SELECT 
        ct.name AS typeName,
        CASE 
          WHEN cs.name IS NOT NULL AND cs.name <> 'General' THEN cs.name
          ELSE 'General (' + ct.name + ')'
        END AS subtypeName,
        COUNT(*) AS count
      FROM Complaints c
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      LEFT JOIN ComplaintSubtypes cs ON c.complaint_subtype_id = cs.id
      WHERE c.warehouse_id = @warehouseId ${dateClauseType}
      GROUP BY ct.name, cs.name
      ORDER BY count DESC
    `;
    const typeRes = await reqType.query(typeQuery);

    // 4. Individual Team Member Performance Comparison
    const reqTeam = pool.request();
    reqTeam.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseTeam = this.getDateRangeClause(period, startDate, endDate, reqTeam, 'c');
    const teamQuery = `
      SELECT 
        u.id AS memberId,
        (u.first_name + ' ' + u.last_name + CASE WHEN u.role = 'Warehouse Manager' THEN ' (Manager)' ELSE '' END) AS memberName,
        u.role,
        COUNT(c.id) AS handledCount,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN c.status LIKE '%Escalated%' THEN 1 ELSE 0 END) AS escalatedCount,
        SUM(CASE WHEN c.status IN ('Pending', 'Assigned', 'New', 'In Progress') THEN 1 ELSE 0 END) AS pendingCount,
        AVG(CASE 
          WHEN c.status IN ('Resolved', 'Completed') THEN DATEDIFF(minute, ISNULL(c.warehouse_team_responded_at, c.raised_at), ISNULL(c.updated_at, GETDATE()))
          ELSE NULL 
        END) AS avgResMinutes,
        SUM(CASE WHEN c.status IN ('Resolved', 'Completed') AND DATEDIFF(hour, c.raised_at, ISNULL(c.updated_at, GETDATE())) <= 24 THEN 1 ELSE 0 END) AS withinSlaCount
      FROM Users u
      LEFT JOIN Complaints c ON u.id = ISNULL(c.taken_action_by, c.assigned_warehouse_team_id) AND c.warehouse_id = @warehouseId ${dateClauseTeam}
      WHERE u.warehouse_id = @warehouseId AND (u.role = 'Warehouse Team' OR u.role = 'Warehouse Manager')
      GROUP BY u.id, u.first_name, u.last_name, u.role
      HAVING (u.role = 'Warehouse Team' OR COUNT(c.id) > 0)
      ORDER BY handledCount DESC
    `;
    const teamRes = await reqTeam.query(teamQuery);
    const teamPerformance = teamRes.recordset.map(row => {
      const completed = row.completedCount || 0;
      const withinSla = row.withinSlaCount || 0;
      const slaRate = completed > 0 ? Math.round((withinSla / completed) * 100) : 100;
      const avgFormatted = this.formatDuration(row.avgResMinutes);
      return {
        memberId: row.memberId,
        memberName: row.memberName,
        handledCount: row.handledCount || 0,
        completedCount: completed,
        escalatedCount: row.escalatedCount || 0,
        pendingCount: row.pendingCount || 0,
        avgResolutionDisplay: avgFormatted,
        avgResolutionHours: avgFormatted,
        slaPerformance: `${slaRate}%`
      };
    });

    // 5. SLA Breach Trend — Dynamic Grouping (Day if range <= 7 days, Week if > 7 days)
    const isShortRange = period === 'today' || period === 'week';
    const reqTrend = pool.request();
    reqTrend.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseTrend = this.getDateRangeClause(period, startDate, endDate, reqTrend, 'c');

    let trendQuery = '';
    if (isShortRange) {
      trendQuery = `
        SELECT 
          FORMAT(c.raised_at, 'dd MMM') AS label,
          SUM(CASE WHEN c.escalated_to_manager_at IS NOT NULL OR GETDATE() > c.warehouse_team_deadline THEN 1 ELSE 0 END) AS breachCount
        FROM Complaints c
        WHERE c.warehouse_id = @warehouseId ${dateClauseTrend}
        GROUP BY CONVERT(VARCHAR(10), c.raised_at, 120), FORMAT(c.raised_at, 'dd MMM')
        ORDER BY CONVERT(VARCHAR(10), c.raised_at, 120) ASC
      `;
    } else {
      trendQuery = `
        SELECT 
          CASE 
            WHEN FORMAT(MIN(c.raised_at), 'dd MMM') = FORMAT(MAX(c.raised_at), 'dd MMM') 
            THEN FORMAT(MIN(c.raised_at), 'dd MMM')
            ELSE FORMAT(MIN(c.raised_at), 'dd MMM') + ' – ' + FORMAT(MAX(c.raised_at), 'dd MMM')
          END AS label,
          SUM(CASE WHEN c.escalated_to_manager_at IS NOT NULL OR GETDATE() > c.warehouse_team_deadline THEN 1 ELSE 0 END) AS breachCount
        FROM Complaints c
        WHERE c.warehouse_id = @warehouseId ${dateClauseTrend}
        GROUP BY DATEPART(year, c.raised_at), DATEPART(week, c.raised_at)
        ORDER BY MIN(c.raised_at) ASC
      `;
    }
    const trendRes = await reqTrend.query(trendQuery);

    // 6. Open Complaint Aging Buckets
    const reqAging = pool.request();
    reqAging.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseAging = this.getDateRangeClause(period, startDate, endDate, reqAging, 'c');
    const agingQuery = `
      SELECT 
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) <= 24 THEN 1 ELSE 0 END) AS bucketLessThan24h,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 24 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 72 THEN 1 ELSE 0 END) AS bucket1To3Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 72 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 168 THEN 1 ELSE 0 END) AS bucket4To7Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 168 AND DATEDIFF(hour, c.raised_at, GETDATE()) <= 336 THEN 1 ELSE 0 END) AS bucket8To14Days,
        SUM(CASE WHEN DATEDIFF(hour, c.raised_at, GETDATE()) > 336 THEN 1 ELSE 0 END) AS bucket15PlusDays
      FROM Complaints c
      WHERE c.warehouse_id = @warehouseId 
        AND c.status NOT IN ('Resolved', 'Completed', 'Closed') ${dateClauseAging}
    `;
    const agingRes = await reqAging.query(agingQuery);
    const ag = agingRes.recordset[0] || {};
    const agingBuckets = [
      { bucket: '< 1 Day', count: ag.bucketLessThan24h || 0 },
      { bucket: '1-3 Days', count: ag.bucket1To3Days || 0 },
      { bucket: '4-7 Days', count: ag.bucket4To7Days || 0 },
      { bucket: '8-14 Days', count: ag.bucket8To14Days || 0 },
      { bucket: '15+ Days', count: ag.bucket15PlusDays || 0 },
    ];

    // 7. Detailed Complaints Table for Warehouse
    const reqDetails = pool.request();
    reqDetails.input('warehouseId', sql.Int, parseInt(warehouseId || 0, 10));
    const dateClauseDetails = this.getDateRangeClause(period, startDate, endDate, reqDetails, 'c');
    const detailsQuery = `
      SELECT 
        c.id,
        c.complaint_number,
        c.customer_code,
        c.invoice_number,
        ct.name AS type,
        ISNULL(cs.name, 'General') AS subtype,
        (u_sales.first_name + ' ' + u_sales.last_name) AS raisedBy,
        ISNULL(u_team.first_name + ' ' + u_team.last_name, 'Unclaimed') AS claimedBy,
        CONVERT(VARCHAR(20), c.raised_at, 106) AS raised_date,
        CONVERT(VARCHAR(30), c.raised_at, 126) AS raised_at_iso,
        c.status,
        CASE WHEN c.escalated_to_manager_at IS NOT NULL THEN 'Yes' ELSE 'No' END AS isEscalated,
        CASE WHEN c.status IN ('Resolved', 'Completed') THEN CONVERT(VARCHAR(20), c.updated_at, 106) ELSE 'N/A' END AS resolved_date
      FROM Complaints c
      JOIN Users u_sales ON c.sales_executive_id = u_sales.id
      LEFT JOIN Users u_team ON u_team.id = ISNULL(c.taken_action_by, c.assigned_warehouse_team_id)
      JOIN ComplaintTypes ct ON c.complaint_type_id = ct.id
      LEFT JOIN ComplaintSubtypes cs ON c.complaint_subtype_id = cs.id
      WHERE c.warehouse_id = @warehouseId ${dateClauseDetails}
      ORDER BY c.raised_at DESC
    `;
    const detailsRes = await reqDetails.query(detailsQuery);

    return {
      summary: {
        totalComplaints: totalComplaints,
        pendingCount: s.pendingCount || 0,
        inProgressCount: s.inProgressCount || 0,
        resolvedCount: totalResolved,
        openCount: s.openCount || 0,
        totalEscalated: totalEscalated,
        resolvedDirectlyByTeam: s.resolvedDirectlyByTeam || 0,
        escalationRate: escalationRate,
        avgEscalatedResolutionHours: parseFloat(avgEscalatedResolutionHours),
        slaPerformanceRate: slaPerformanceRate
      },
      statusBreakdown: statusRes.recordset,
      subtypeBreakdown: typeRes.recordset,
      mostCommonIssue: this.calculateMostCommonIssue(typeRes.recordset),
      teamMemberPerformance: teamPerformance,
      agingBuckets,
      slaBreachTrend: trendRes.recordset,
      trendGrouping: isShortRange ? 'daily' : 'weekly',
      detailedComplaints: detailsRes.recordset
    };
  }

  /**
   * Unified Warehouse Report Dispatcher
   */
  async getWarehouseReport(userId, userRole, warehouseId, period, startDate, endDate) {
    if (userRole === 'Warehouse Manager') {
      return this.getWarehouseManagerReport(warehouseId, period, startDate, endDate);
    }
    return this.getWarehouseTeamReport(userId, warehouseId, period, startDate, endDate);
  }
}

module.exports = ReportRepository;
