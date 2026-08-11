const ComplaintRepository = require('../repositories/mssql/complaint.repository');
const complaintRepo = new ComplaintRepository();

let timerId = null;

async function checkExpiredSlas() {
  try {
    const expiredCount = await complaintRepo.checkAndAutoEscalate();
    if (expiredCount > 0) {
      console.log(`[SLA MONITOR] Auto-escalated ${expiredCount} expired complaint(s) to Warehouse Manager.`);
    }
  } catch (err) {
    console.error('[SLA MONITOR ERROR] Error checking expired SLAs:', err.message);
  }
}

function startSlaMonitor(intervalMs = 60000) {
  if (timerId) return;

  console.log(`[SLA MONITOR] Background SLA monitoring service started (Interval: ${intervalMs / 1000}s).`);
  
  // Run an immediate check on service start
  checkExpiredSlas();

  // Schedule periodic check independently of HTTP requests
  timerId = setInterval(checkExpiredSlas, intervalMs);
}

function stopSlaMonitor() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    console.log('[SLA MONITOR] Background SLA monitoring service stopped.');
  }
}

module.exports = {
  startSlaMonitor,
  stopSlaMonitor,
  checkExpiredSlas
};
