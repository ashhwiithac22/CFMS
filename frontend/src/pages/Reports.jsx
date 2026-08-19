import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Download, FileSpreadsheet, FileText, RefreshCw, 
  CheckCircle2, ShieldAlert, Clock, BarChart3, TrendingUp, UserCheck, 
  Building2, AlertTriangle, PieChart as PieIcon, AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

const Reports = () => {
  const { user } = useAuth();
  const reportRef = useRef(null);

  const [period, setPeriod] = useState('month'); // today, week, month, custom, all
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const role = user?.role || 'Warehouse Team';

  // Theme checking for charts
  const isDarkMode = document.documentElement.classList.contains('dark') || 
    document.body.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const chartTextColor = isDarkMode ? '#9CA3AF' : '#4B5563';
  const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const chartTooltipBg = isDarkMode ? '#1F2937' : '#FFFFFF';
  const chartTooltipBorder = isDarkMode ? '#374151' : '#E5E7EB';

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '/reports/sales-executive';
      if (role === 'Sales Executive') {
        endpoint = '/reports/sales-executive';
      } else if (role === 'Warehouse Team' || role === 'Warehouse Manager' || role === 'Manager' || role === 'Administrator' || role === 'Admin') {
        endpoint = '/reports/warehouse';
      }

      let url = `${endpoint}?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await api.get(url);
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but received ${contentType || 'non-JSON'}: ${text.slice(0, 200)}`);
      }

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to load report data');
      }

      setReportData(json.data);
    } catch (err) {
      console.error('Report fetch error:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const handleApplyCustomDate = () => {
    if (!startDate || !endDate) {
      alert('Please select both start date and end date.');
      return;
    }
    fetchReportData();
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!reportData) return;
    setExportingExcel(true);

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryRows = [
        ['CFMS AUTOMATED REPORT SUMMARY'],
        ['User Role', role],
        ['Generated At', new Date().toLocaleString()],
        ['Date Range Filter', period.toUpperCase() + (period === 'custom' ? ` (${startDate} to ${endDate})` : '')],
        []
      ];

      if (role === 'Sales Executive' && reportData.summary) {
        summaryRows.push(['Metric', 'Value']);
        summaryRows.push(['Total Complaints Raised', reportData.summary.totalRaised]);
        summaryRows.push(['Pending Complaints', reportData.summary.pendingCount]);
        summaryRows.push(['In Progress Complaints', reportData.summary.inProgressCount]);
        summaryRows.push(['Resolved Complaints', reportData.summary.resolvedCount]);
        summaryRows.push(['Escalated Complaints', reportData.summary.escalatedCount]);
        summaryRows.push(['Average Resolution Time (Hours)', reportData.summary.avgResolutionHours]);
        summaryRows.push(['SLA Compliance Rate (%)', `${reportData.summary.slaComplianceRate}%`]);
      } else if (role === 'Warehouse Team' && reportData.personalSummary) {
        summaryRows.push(['Personal Metrics', 'Value']);
        summaryRows.push(['Complaints Handled', reportData.personalSummary.handledCount]);
        summaryRows.push(['Pending', reportData.personalSummary.pendingCount]);
        summaryRows.push(['In Progress', reportData.personalSummary.inProgressCount]);
        summaryRows.push(['Completed', reportData.personalSummary.completedCount]);
        summaryRows.push(['Escalated', reportData.personalSummary.escalatedCount]);
        summaryRows.push(['Average Completion Time (Hours)', reportData.personalSummary.avgCompletionHours]);
        summaryRows.push(['SLA Compliance Rate (%)', `${reportData.personalSummary.slaComplianceRate}%`]);
        summaryRows.push([]);
        summaryRows.push(['Warehouse-Wide Summary', 'Value']);
        summaryRows.push(['Total Warehouse Complaints', reportData.warehouseSummary.totalWarehouseComplaints]);
        summaryRows.push(['Resolved Directly by Team', reportData.warehouseSummary.resolvedDirectlyByTeam]);
        summaryRows.push(['Escalated to Manager', reportData.warehouseSummary.escalatedToManager]);
      } else if ((role === 'Warehouse Manager' || role === 'Administrator' || role === 'Admin') && reportData.summary) {
        summaryRows.push(['Warehouse Escalation Metrics', 'Value']);
        summaryRows.push(['Total Warehouse Complaints', reportData.summary.totalComplaints]);
        summaryRows.push(['Pending Complaints', reportData.summary.pendingCount]);
        summaryRows.push(['In Progress Complaints', reportData.summary.inProgressCount]);
        summaryRows.push(['Resolved Complaints', reportData.summary.resolvedCount]);
        summaryRows.push(['Escalated Complaints', reportData.summary.totalEscalated]);
        summaryRows.push(['Escalation Rate (%)', `${reportData.summary.escalationRate}%`]);
        summaryRows.push(['Average Manager Resolution Time (Hours)', reportData.summary.avgEscalatedResolutionHours]);
        summaryRows.push(['SLA Performance Rate (%)', `${reportData.summary.slaPerformanceRate}%`]);
      }

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Sheet 2: Complaint Type Breakdown
      if (reportData.typeBreakdown && reportData.typeBreakdown.length > 0) {
        const typeRows = reportData.typeBreakdown.map(item => ({
          'Complaint Type': item.typeName,
          'Subtype': item.subtypeName,
          'Count': item.count
        }));
        const wsType = XLSX.utils.json_to_sheet(typeRows);
        XLSX.utils.book_append_sheet(wb, wsType, 'Type Breakdown');
      }

      // Sheet 3: Team Comparison (Warehouse Manager)
      if (reportData.teamMemberPerformance && reportData.teamMemberPerformance.length > 0) {
        const teamRows = reportData.teamMemberPerformance.map(item => ({
          'Team Member': item.memberName,
          'Complaints Handled': item.handledCount,
          'Completed': item.completedCount,
          'Escalated': item.escalatedCount,
          'Pending': item.pendingCount,
          'Avg Resolution Time (hrs)': item.avgResolutionHours,
          'SLA Performance': item.slaPerformance
        }));
        const wsTeam = XLSX.utils.json_to_sheet(teamRows);
        XLSX.utils.book_append_sheet(wb, wsTeam, 'Team Comparison');
      }

      // Sheet 4: Detailed Complaint Data
      if (reportData.detailedComplaints && reportData.detailedComplaints.length > 0) {
        const detailedRows = reportData.detailedComplaints.map(item => ({
          'Complaint ID': item.complaint_number,
          'Customer Code': item.customer_code,
          'Invoice Number': item.invoice_number,
          'Type': item.type,
          'Subtype': item.subtype,
          'Raised By': item.raisedBy || 'N/A',
          'Claimed By': item.claimedBy || 'N/A',
          'Warehouse': item.warehouse_name || 'N/A',
          'Raised Date': item.raised_date,
          'Status': item.status,
          'Resolved Date': item.resolved_date
        }));
        const wsDetailed = XLSX.utils.json_to_sheet(detailedRows);
        XLSX.utils.book_append_sheet(wb, wsDetailed, 'Detailed Complaint Data');
      }

      const fileName = `${role.replace(/\s+/g, '_')}_Report_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Excel Export Error:', err);
      alert('Failed to export Excel file: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${role.replace(/\s+/g, '_')}_Report_${period}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Top Header & Export Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={26} style={{ color: 'var(--brand-primary)' }} />
            {role === 'Sales Executive' ? 'My Complaints Report' :
             role === 'Warehouse Team' ? 'My Performance Report' :
             'Warehouse Escalation Report'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Role-scoped operational performance, SLA metrics, and complaint analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchReportData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '8px', border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || loading || !reportData}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '8px', border: '1px solid #16A34A',
              backgroundColor: '#16A34A', color: '#FFFFFF',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              opacity: (exportingExcel || loading || !reportData) ? 0.6 : 1
            }}
          >
            <FileSpreadsheet size={15} /> {exportingExcel ? 'Exporting...' : 'Export Excel'}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || loading || !reportData}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '8px', border: '1px solid var(--brand-primary)',
              backgroundColor: 'var(--brand-primary)', color: '#FFFFFF',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              opacity: (exportingPdf || loading || !reportData) ? 0.6 : 1
            }}
          >
            <Download size={15} /> {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Date Range Selector Toolbar */}
      <div 
        style={{ 
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', 
          backgroundColor: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '12px',
          border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)'
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={16} /> Filter Date Range:
        </span>

        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'all', label: 'All Time' },
          { id: 'custom', label: 'Custom Range' }
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
              border: period === p.id ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
              backgroundColor: period === p.id ? 'var(--brand-primary)' : 'transparent',
              color: period === p.id ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {p.label}
          </button>
        ))}

        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px'
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px'
              }}
            />
            <button
              onClick={handleApplyCustomDate}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                backgroundColor: 'var(--brand-primary)', color: '#FFFFFF',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Main Report Canvas */}
      <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Loading role report data...
          </div>
        ) : error ? (
          <div style={{ padding: '32px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '12px', color: '#EF4444', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        ) : !reportData ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No report data available.
          </div>
        ) : (
          <>
            {/* ───────────────────────────────────────────────────────────── */}
            {/* 1. SALES EXECUTIVE REPORT VIEW                                 */}
            {/* ───────────────────────────────────────────────────────────── */}
            {role === 'Sales Executive' && reportData.summary && (
              <>
                {/* 1. Executive KPI Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
                  <StatSummaryCard title="Total Raised" value={reportData.summary.totalRaised} icon={<FileText size={18} />} color="blue" subtitle={`Resolution Rate: ${reportData.summary.resolutionRate}%`} />
                  <StatSummaryCard title="Pending / Open" value={reportData.summary.openCount} icon={<Clock size={18} />} color="amber" subtitle={`Overdue: ${reportData.summary.overdueCount}`} />
                  <StatSummaryCard title="In Progress" value={reportData.summary.inProgressCount} icon={<RefreshCw size={18} />} color="purple" subtitle={`Assigned: ${reportData.summary.assignedCount}`} />
                  <StatSummaryCard title="Escalated to Manager" value={reportData.summary.escalatedToManagerCount} icon={<ShieldAlert size={18} />} color="red" subtitle={`Escalation Rate: ${reportData.summary.escalationRate}%`} />
                  <StatSummaryCard title="Resolved / Completed" value={reportData.summary.totalResolvedCompleted} icon={<CheckCircle2 size={18} />} color="green" subtitle={`Resolved: ${reportData.summary.resolvedCount}`} />
                  <StatSummaryCard title="SLA Compliance" value={`${reportData.summary.slaComplianceRate}%`} icon={<TrendingUp size={18} />} color="green" subtitle={`Met: ${reportData.summary.slaMetCount} | Breached: ${reportData.summary.slaBreachedCount}`} />
                  <StatSummaryCard title="Avg Resolution Time" value={`${reportData.summary.avgResolutionHours} hrs`} icon={<Clock size={18} />} color="purple" subtitle="From Raised to Resolution" />
                  <StatSummaryCard title="Avg First Response" value={`${reportData.summary.avgFirstResponseHours} hrs`} icon={<TrendingUp size={18} />} color="blue" subtitle="Initial Team Response" />
                </div>

                {/* 2. Visual Analytics Row 1: Status, Types, Subtypes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {/* Chart 1: Status Breakdown */}
                  <ChartCard title="Complaint Status Analysis">
                    {reportData.statusBreakdown && reportData.statusBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={270}>
                        <PieChart margin={{ top: 15, right: 15, left: 15, bottom: 15 }}>
                          <Pie 
                            data={reportData.statusBreakdown} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="40%" 
                            innerRadius={36} 
                            outerRadius={60} 
                            paddingAngle={3}
                            label={({ name, value, percentage }) => `${name.replace(' to Manager', '')}: ${value} (${percentage}%)`}
                            labelLine={{ strokeWidth: 1 }}
                            style={{ fontSize: '11px', fontWeight: '600' }}
                          >
                            {reportData.statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No status data for selected date range" />}
                  </ChartCard>

                  {/* Chart 2: Complaint Type Breakdown */}
                  <ChartCard title="Complaint Type Analysis (Sorted)">
                    {reportData.typeBreakdown && reportData.typeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={reportData.typeBreakdown} margin={{ bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis 
                            dataKey="typeName" 
                            stroke={chartTextColor} 
                            fontSize={10} 
                            interval={0} 
                            angle={-25} 
                            textAnchor="end" 
                            height={45}
                          />
                          <YAxis stroke={chartTextColor} fontSize={12} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Bar dataKey="count" name="Complaints" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No type data for selected date range" />}
                  </ChartCard>

                  {/* Chart 3: Complaint Subtype Analysis */}
                  <ChartCard title="Complaint Subtype Analysis">
                    {reportData.subtypeBreakdown && reportData.subtypeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={reportData.subtypeBreakdown} layout="vertical" margin={{ left: 5, right: 15 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis type="number" stroke={chartTextColor} fontSize={12} allowDecimals={false} />
                          <YAxis dataKey="subtypeName" type="category" stroke={chartTextColor} fontSize={10} width={145} interval={0} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Bar dataKey="count" name="Count" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No subtype data for selected date range" />}
                  </ChartCard>
                </div>

                {/* 3. Visual Analytics Row 2: Trends, Warehouse Breakdown & SLA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {/* Chart 4: Complaint Trend */}
                  <ChartCard title={`Complaint Volume Trend (${period.toUpperCase()})`}>
                    {reportData.complaintTrend && reportData.complaintTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={reportData.complaintTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis dataKey="label" stroke={chartTextColor} fontSize={12} />
                          <YAxis stroke={chartTextColor} fontSize={12} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="count" name="Complaints Raised" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No trend data for selected date range" />}
                  </ChartCard>

                  {/* Chart 5: Warehouse-wise Analysis */}
                  <ChartCard title="Warehouse-wise Complaint Breakdown">
                    {reportData.warehouseBreakdown && reportData.warehouseBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={reportData.warehouseBreakdown} barGap={4} barCategoryGap="20%" margin={{ bottom: 15 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis 
                            dataKey="warehouseName" 
                            stroke={chartTextColor} 
                            fontSize={11} 
                            interval={0} 
                            angle={-15} 
                            textAnchor="end"
                            height={45}
                            tickFormatter={(name) => name ? name.replace(' Warehouse', '') : ''}
                          />
                          <YAxis stroke={chartTextColor} fontSize={12} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
                          <Bar dataKey="totalCount" name="Total Raised" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={14} />
                          <Bar dataKey="resolvedCount" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} barSize={14} />
                          <Bar dataKey="escalatedCount" name="Escalated" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No warehouse data for selected date range" />}
                  </ChartCard>

                  {/* Chart 6: SLA Performance */}
                  <ChartCard title="SLA Performance (Met vs Breached)">
                    {reportData.slaPerformance && reportData.slaPerformance.slaDistribution ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={reportData.slaPerformance.slaDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} label={(e) => `${e.name}: ${e.value}`}>
                            <Cell fill="#10B981" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No SLA data for selected date range" />}
                  </ChartCard>
                </div>

                {/* 4. Open Complaint Aging Buckets */}
                <ChartCard title="Open Complaint Aging Distribution">
                  {reportData.agingBuckets && reportData.agingBuckets.some(b => b.count > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={reportData.agingBuckets}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis dataKey="bucket" stroke={chartTextColor} fontSize={12} />
                        <YAxis stroke={chartTextColor} fontSize={12} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                        <Bar dataKey="count" name="Open Complaints" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#10B981', fontWeight: '600', fontSize: '13px' }}>
                      {(reportData.summary?.totalComplaints || 0) === 0 
                        ? "No complaints raised in this period." 
                        : "All complaints in this period are either resolved or within initial SLA limits. Zero overdue open complaints!"}
                    </div>
                  )}
                </ChartCard>

                {/* 5. Detailed Complaints Table */}
                <DetailedComplaintsSection complaints={reportData.detailedComplaints || []} role={role} />
              </>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 2. WAREHOUSE TEAM REPORT VIEW                                 */}
            {/* ───────────────────────────────────────────────────────────── */}
            {role === 'Warehouse Team' && reportData.personalSummary && (
              <>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  A. My Complaint Activity
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <StatSummaryCard title="Handled / Assigned" value={reportData.personalSummary.handledCount} icon={<UserCheck size={18} />} color="blue" />
                  <StatSummaryCard title="Pending" value={reportData.personalSummary.pendingCount} icon={<Clock size={18} />} color="amber" />
                  <StatSummaryCard title="In Progress" value={reportData.personalSummary.inProgressCount} icon={<RefreshCw size={18} />} color="purple" />
                  <StatSummaryCard title="Completed" value={reportData.personalSummary.completedCount} icon={<CheckCircle2 size={18} />} color="green" />
                  <StatSummaryCard title="Escalated" value={reportData.personalSummary.escalatedCount} icon={<ShieldAlert size={18} />} color="red" />
                  <StatSummaryCard title="Avg Completion Time" value={typeof reportData.personalSummary.avgCompletionHours === 'string' && (reportData.personalSummary.avgCompletionHours.includes('min') || reportData.personalSummary.avgCompletionHours.includes('hr')) ? reportData.personalSummary.avgCompletionHours : `${reportData.personalSummary.avgCompletionHours} hrs`} icon={<Clock size={18} />} color="purple" />
                  <StatSummaryCard title="SLA Compliance" value={`${reportData.personalSummary.slaComplianceRate}%`} icon={<TrendingUp size={18} />} color="green" />
                  <StatSummaryCard title="Most Common Issue" value={reportData.mostCommonIssue?.display || 'N/A'} icon={<AlertCircle size={18} />} color="amber" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {/* Status Breakdown Chart */}
                  <ChartCard title="My Status Breakdown">
                    {reportData.statusBreakdown && reportData.statusBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart margin={{ top: 15, bottom: 15, left: 10, right: 10 }}>
                          <Pie 
                            data={reportData.statusBreakdown} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="45%" 
                            innerRadius={40}
                            outerRadius={65} 
                            paddingAngle={4}
                          >
                            {reportData.statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={40}
                            formatter={(value, entry) => {
                              const item = entry?.payload || {};
                              const count = item.value || 0;
                              const pct = item.percentage !== undefined ? item.percentage : 100;
                              return `${value.replace(' to Manager', '')}: ${count} (${pct}%)`;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No complaint activity for selected date range" />}
                  </ChartCard>

                  {/* Subtype Breakdown Chart */}
                  <ChartCard title="Handled Complaints by Subtype">
                    {reportData.subtypeBreakdown && reportData.subtypeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={reportData.subtypeBreakdown} margin={{ bottom: 25, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis dataKey="subtypeName" stroke={chartTextColor} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
                          <YAxis stroke={chartTextColor} fontSize={11} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Bar dataKey="count" name="Handled" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No subtype data for selected date range" />}
                  </ChartCard>

                  {/* Warehouse Complaint Trend */}
                  <ChartCard title="Warehouse Volume Trend">
                    {reportData.complaintTrend && reportData.complaintTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={reportData.complaintTrend} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis dataKey="label" stroke={chartTextColor} fontSize={11} />
                          <YAxis stroke={chartTextColor} fontSize={11} allowDecimals={false} domain={[0, (dataMax) => Math.max(dataMax + 1, 4)]} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="count" name="Warehouse Complaints" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No volume trend data for selected date range" />}
                  </ChartCard>
                </div>

                {/* Open Complaint Aging Distribution for Member */}
                <ChartCard title="Open Complaint Aging Distribution (Assigned)">
                  {reportData.agingBuckets && reportData.agingBuckets.some(b => b.count > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={reportData.agingBuckets} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis dataKey="bucket" stroke={chartTextColor} fontSize={11} />
                        <YAxis stroke={chartTextColor} fontSize={11} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                        <Bar dataKey="count" name="Open Complaints" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#10B981', fontWeight: '600', fontSize: '13px' }}>
                      {(reportData.personalSummary?.handledCount || 0) === 0 
                        ? "No complaints assigned or handled in this period." 
                        : "All assigned complaints in this date range are resolved! Zero open complaints!"}
                    </div>
                  )}
                </ChartCard>

                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '16px 0 0 0' }}>
                  B. Warehouse Complaint Overview
                </h2>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Warehouse Complaints</span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>{reportData.warehouseSummary?.totalWarehouseComplaints || 0}</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#10B981' }}>Resolved Directly by Team</span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#10B981', marginTop: '4px' }}>{reportData.warehouseSummary?.resolvedDirectlyByTeam || 0}</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#EF4444' }}>Escalated to Manager</span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#EF4444', marginTop: '4px' }}>{reportData.warehouseSummary?.escalatedToManager || 0}</div>
                  </div>
                </div>

                <DetailedComplaintsSection complaints={reportData.detailedComplaints || []} role={role} />
              </>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 3. WAREHOUSE MANAGER REPORT VIEW                              */}
            {/* ───────────────────────────────────────────────────────────── */}
            {(role === 'Warehouse Manager' || role === 'Manager' || role === 'Administrator' || role === 'Admin') && reportData.summary && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <StatSummaryCard title="Total Complaints" value={reportData.summary.totalComplaints} icon={<Building2 size={18} />} color="blue" />
                  <StatSummaryCard title="Pending / Open" value={reportData.summary.openCount || reportData.summary.pendingCount} icon={<Clock size={18} />} color="amber" />
                  <StatSummaryCard title="In Progress" value={reportData.summary.inProgressCount} icon={<RefreshCw size={18} />} color="purple" />
                  <StatSummaryCard title="Resolved" value={reportData.summary.resolvedCount} icon={<CheckCircle2 size={18} />} color="green" />
                  <StatSummaryCard title="Escalated to Manager" value={reportData.summary.totalEscalated} icon={<ShieldAlert size={18} />} color="red" />
                  <StatSummaryCard title="Escalation Rate" value={`${reportData.summary.escalationRate}%`} icon={<AlertTriangle size={18} />} color="red" />
                  <StatSummaryCard title="Avg Resolution Time" value={typeof reportData.summary.avgEscalatedResolutionHours === 'string' && (reportData.summary.avgEscalatedResolutionHours.includes('min') || reportData.summary.avgEscalatedResolutionHours.includes('hr')) ? reportData.summary.avgEscalatedResolutionHours : `${reportData.summary.avgEscalatedResolutionHours} hrs`} icon={<Clock size={18} />} color="purple" />
                  <StatSummaryCard title="SLA Compliance" value={`${reportData.summary.slaPerformanceRate}%`} icon={<TrendingUp size={18} />} color="blue" />
                  <StatSummaryCard title="Most Common Issue in Warehouse" value={reportData.mostCommonIssue?.display || 'N/A'} icon={<AlertCircle size={18} />} color="amber" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {/* Status Breakdown */}
                  <ChartCard title="Complaint Status Breakdown">
                    {reportData.statusBreakdown && reportData.statusBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart margin={{ top: 15, bottom: 15, left: 10, right: 10 }}>
                          <Pie 
                            data={reportData.statusBreakdown} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="45%" 
                            innerRadius={40}
                            outerRadius={65} 
                            paddingAngle={4}
                          >
                            {reportData.statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={40}
                            formatter={(value, entry) => {
                              const item = entry?.payload || {};
                              const count = item.value || 0;
                              const pct = item.percentage !== undefined ? item.percentage : 100;
                              return `${value.replace(' to Manager', '')}: ${count} (${pct}%)`;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No status data for selected date range" />}
                  </ChartCard>

                  {/* Subtype Breakdown */}
                  <ChartCard title="Complaint Subtype Analysis">
                    {reportData.subtypeBreakdown && reportData.subtypeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={reportData.subtypeBreakdown} margin={{ bottom: 25, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis dataKey="subtypeName" stroke={chartTextColor} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
                          <YAxis stroke={chartTextColor} fontSize={11} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Bar dataKey="count" name="Count" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No subtype data for selected date range" />}
                  </ChartCard>

                  {/* SLA Breach Trend */}
                  <ChartCard title={`SLA Breach Trend (${reportData.trendGrouping === 'daily' ? 'Grouped Daily' : 'Grouped Weekly'})`}>
                    {reportData.slaBreachTrend && reportData.slaBreachTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={reportData.slaBreachTrend} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis dataKey="label" stroke={chartTextColor} fontSize={11} />
                          <YAxis stroke={chartTextColor} fontSize={11} allowDecimals={false} domain={[0, (dataMax) => Math.max(dataMax + 1, 4)]} />
                          <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="breachCount" name="SLA Breaches" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyStateText message="No SLA breach incidents in selected date range" />}
                  </ChartCard>
                </div>

                {/* Open Complaint Aging Distribution for Warehouse */}
                <ChartCard title="Warehouse Open Complaint Aging Distribution">
                  {reportData.agingBuckets && reportData.agingBuckets.some(b => b.count > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={reportData.agingBuckets} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis dataKey="bucket" stroke={chartTextColor} fontSize={11} />
                        <YAxis stroke={chartTextColor} fontSize={11} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, borderRadius: '8px' }} />
                        <Bar dataKey="count" name="Open Complaints" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#10B981', fontWeight: '600', fontSize: '13px' }}>
                      {(reportData.summary?.totalComplaints || 0) === 0 
                        ? "No complaints raised in this period." 
                        : "All complaints in this warehouse are resolved! Zero open complaints!"}
                    </div>
                  )}
                </ChartCard>

                {/* Team Comparison Table */}
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Warehouse Team Member Performance Comparison
                  </h3>
                  <div style={{ overflowX: 'auto' }} className="scrollbar-thin">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '10px' }}>Team Member</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Handled / Assigned</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Completed</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Escalated</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Pending</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Avg Resolution Time</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>SLA Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.teamMemberPerformance || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              No active team members found for this warehouse.
                            </td>
                          </tr>
                        ) : (
                          (reportData.teamMemberPerformance || []).map((row) => (
                            <tr key={row.memberId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>{row.memberName}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: 'var(--brand-primary)' }}>{row.handledCount}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#10B981' }}>{row.completedCount}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#EF4444' }}>{row.escalatedCount}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#F59E0B' }}>{row.pendingCount}</td>
                              <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.avgResolutionDisplay || (typeof row.avgResolutionHours === 'string' && (row.avgResolutionHours.includes('min') || row.avgResolutionHours.includes('hr')) ? row.avgResolutionHours : `${row.avgResolutionHours} hrs`)}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: '700', color: 'var(--brand-primary)' }}>{row.slaPerformance}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <DetailedComplaintsSection complaints={reportData.detailedComplaints || []} role={role} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>{title}</h3>
    {children}
  </div>
);

const EmptyStateText = ({ message }) => (
  <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
    {message}
  </div>
);

const StatSummaryCard = ({ title, value, icon, color, subtitle }) => {
  const colorMap = {
    blue: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
    green: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    red: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
    amber: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
    purple: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' }
  };
  const theme = colorMap[color] || colorMap.blue;

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{title}</span>
        <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: theme.bg, color: theme.text }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-2px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

const DetailedComplaintsSection = ({ complaints, role }) => {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
        Detailed Complaints Data ({complaints.length})
      </h3>
      <div style={{ overflowX: 'auto' }} className="scrollbar-thin">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '10px' }}>Complaint ID</th>
              <th style={{ padding: '10px' }}>Customer</th>
              <th style={{ padding: '10px' }}>Invoice</th>
              <th style={{ padding: '10px' }}>Type / Subtype</th>
              {role !== 'Sales Executive' && <th style={{ padding: '10px' }}>Raised By</th>}
              {role === 'Warehouse Manager' && <th style={{ padding: '10px' }}>Claimed By</th>}
              {role === 'Sales Executive' && <th style={{ padding: '10px' }}>Warehouse</th>}
              <th style={{ padding: '10px' }}>Raised Date</th>
              <th style={{ padding: '10px' }}>Status</th>
              <th style={{ padding: '10px' }}>Resolved Date</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No complaints found for the selected date range.
                </td>
              </tr>
            ) : (
              complaints.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px', fontWeight: '700', color: 'var(--brand-primary)' }}>{c.complaint_number}</td>
                  <td style={{ padding: '10px', color: 'var(--text-primary)' }}>{c.customer_code}</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{c.invoice_number}</td>
                  <td style={{ padding: '10px', color: 'var(--text-primary)' }}>
                    <span style={{ fontWeight: '500' }}>{c.type}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{c.subtype}</span>
                  </td>
                  {role !== 'Sales Executive' && <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{c.raisedBy}</td>}
                  {role === 'Warehouse Manager' && <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{c.claimedBy}</td>}
                  {role === 'Sales Executive' && <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{c.warehouse_name}</td>}
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{c.raised_date}</td>
                  <td style={{ padding: '10px' }}>
                    <span 
                      style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                        backgroundColor: (c.status === 'Resolved' || c.status === 'Completed') ? 'rgba(16, 185, 129, 0.15)' :
                                         c.status?.includes('Escalated') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: (c.status === 'Resolved' || c.status === 'Completed') ? '#10B981' :
                               c.status?.includes('Escalated') ? '#EF4444' : '#F59E0B'
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{c.resolved_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
