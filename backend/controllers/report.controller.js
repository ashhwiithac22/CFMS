const ReportRepository = require('../repositories/mssql/report.repository');

const reportRepo = new ReportRepository();

exports.getSalesExecutiveReport = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId || req.user?.id;
    if (userRole !== 'Sales Executive' && userRole !== 'Administrator' && userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Endpoint restricted to Sales Executives.'
      });
    }

    const { period = 'month', startDate, endDate } = req.query;
    const reportData = await reportRepo.getSalesExecutiveReport(userId, period, startDate, endDate);

    return res.status(200).json({
      success: true,
      role: 'Sales Executive',
      period,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

exports.getWarehouseTeamReport = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId || req.user?.id;
    const warehouseId = req.user?.warehouseId || req.user?.warehouse_id;
    if (userRole !== 'Warehouse Team' && userRole !== 'Administrator' && userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Endpoint restricted to Warehouse Team members.'
      });
    }

    const { period = 'month', startDate, endDate } = req.query;
    const reportData = await reportRepo.getWarehouseTeamReport(userId, warehouseId, period, startDate, endDate);

    return res.status(200).json({
      success: true,
      role: 'Warehouse Team',
      period,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

exports.getWarehouseManagerReport = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    const targetWarehouseId = req.user?.warehouseId || req.user?.warehouse_id || 1;
    if (userRole !== 'Warehouse Manager' && userRole !== 'Manager' && userRole !== 'Administrator' && userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Endpoint restricted to Warehouse Managers.'
      });
    }

    const { period = 'month', startDate, endDate } = req.query;
    const reportData = await reportRepo.getWarehouseManagerReport(targetWarehouseId, period, startDate, endDate);

    return res.status(200).json({
      success: true,
      role: 'Warehouse Manager',
      period,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

// Generic role-based auto-router
exports.getReportData = async (req, res, next) => {
  try {
    const { role: userRole } = req.user;
    if (userRole === 'Sales Executive') {
      return exports.getSalesExecutiveReport(req, res, next);
    } else if (userRole === 'Warehouse Team') {
      return exports.getWarehouseTeamReport(req, res, next);
    } else {
      return exports.getWarehouseManagerReport(req, res, next);
    }
  } catch (err) {
    next(err);
  }
};
