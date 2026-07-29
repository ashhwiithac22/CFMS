import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileSpreadsheet, Clock, RefreshCw, ShieldAlert, CheckSquare 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import SlaAlertBanner from '../components/SlaAlertBanner';
import FilterTabs from '../components/FilterTabs';
import ComplaintsTable from '../components/ComplaintsTable';
import MessagePanel from '../components/MessagePanel';
import QuickMessageBar from '../components/QuickMessageBar';
import { api } from '../services/api';

const Dashboard = () => {
  const { logout, user } = useAuth();



  // Navigation and dropdown states
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Responsive state observer
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;

  // Filters State
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting State
  const [sortBy, setSortBy] = useState('Raised Date');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Message Panel State
  const [messagePanelOpen, setMessagePanelOpen] = useState(false);
  const [replyToComplaint, setReplyToComplaint] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedQuickComplaint, setSelectedQuickComplaint] = useState(null);

  // Fetch unread count from backend
  const refreshUnreadCount = async () => {
    try {
      const res = await api.get('/messages/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.data.count);
      }
    } catch (err) {
      console.error('Failed to refresh unread message count:', err);
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 8000);
    return () => clearInterval(interval);
  }, []);

  // Mock complaints data matching the Tirupur Warehouse QA Matrix reference exactly
  const [complaints, setComplaints] = useState([
    { id: 'CMP-0041', customer: 'CUST-10482', invoice: 'INV-2024-3812', type: 'Mismatch', subtype: 'Size Mismatch', raisedBy: 'Arun M.', date: '15 Jul, 08:10', sla: '6h', status: 'Pending', priority: 'High', department: 'Sales', attach: true },
    { id: 'CMP-0040', customer: 'CUST-20317', invoice: 'INV-2024-3801', type: 'Packaging', subtype: 'Torn Packet', raisedBy: 'Priya K.', date: '15 Jul, 07:50', sla: '7h', status: 'In Progress', priority: 'Medium', department: 'Warehouse', attach: false },
    { id: 'CMP-0039', customer: 'CUST-10118', invoice: 'INV-2024-3798', type: 'Transport Related', subtype: 'Delayed Delivery', raisedBy: 'Selvam R.', date: '14 Jul, 22:30', sla: '26h !', status: 'Escalated', priority: 'High', department: 'Sales', attach: true },
    { id: 'CMP-0038', customer: 'CUST-30091', invoice: 'INV-2024-3791', type: 'Quality Issues', subtype: 'Fabric Defect', raisedBy: 'Deepa V.', date: '14 Jul, 18:45', sla: '18h', status: 'In Progress', priority: 'Medium', department: 'Warehouse', attach: true },
    { id: 'CMP-0037', customer: 'CUST-10882', invoice: 'INV-2024-3784', type: 'Mismatch', subtype: 'Color Mismatch', raisedBy: 'Rajan P.', date: '14 Jul, 15:20', sla: '29h !', status: 'Escalated', priority: 'High', department: 'Sales', attach: false },
    { id: 'CMP-0036', customer: 'CUST-20450', invoice: 'INV-2024-3779', type: 'Packaging', subtype: 'Missing Label', raisedBy: 'Meena S.', date: '14 Jul, 12:05', sla: '12h', status: 'Completed', priority: 'Low', department: 'Warehouse', attach: false },
    { id: 'CMP-0035', customer: 'CUST-10231', invoice: 'INV-2024-3770', type: 'Quality Issues', subtype: 'Stitching Issue', raisedBy: 'Kumar A.', date: '14 Jul, 09:55', sla: '5h', status: 'Pending', priority: 'Medium', department: 'Warehouse', attach: true },
    { id: 'CMP-0034', customer: 'CUST-30502', invoice: 'INV-2024-3762', type: 'Transport Related', subtype: 'Wrong Routing', raisedBy: 'Geetha L.', date: '13 Jul, 20:30', sla: '31h !', status: 'Escalated', priority: 'High', department: 'Sales', attach: true },
    { id: 'CMP-0033', customer: 'CUST-10701', invoice: 'INV-2024-3755', type: 'Mismatch', subtype: 'Quantity Mismatch', raisedBy: 'Balan T.', date: '13 Jul, 16:40', sla: '22h', status: 'In Progress', priority: 'Medium', department: 'Sales', attach: false },
    { id: 'CMP-0032', customer: 'CUST-20099', invoice: 'INV-2024-3748', type: 'Packaging', subtype: 'Incorrect Box', raisedBy: 'Nisha R.', date: '13 Jul, 14:15', sla: '3h', status: 'Completed', priority: 'Low', department: 'Warehouse', attach: false },
    { id: 'CMP-0031', customer: 'CUST-30310', invoice: 'INV-2024-3741', type: 'Quality Issues', subtype: 'Print Fade', raisedBy: 'Suresh V.', date: '13 Jul, 11:00', sla: '14h', status: 'Completed', priority: 'Medium', department: 'Warehouse', attach: true },
    { id: 'CMP-0030', customer: 'CUST-10654', invoice: 'INV-2024-3735', type: 'Transport Related', subtype: 'Damage in Transit', raisedBy: 'Selvam R.', date: '13 Jul, 08:20', sla: '9h', status: 'Pending', priority: 'High', department: 'Sales', attach: true }
  ]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const handleStatusChange = (id, newStatus) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const handleMessageClick = async (comp) => {
    setReplyToComplaint(comp);
    setMessagePanelOpen(true);
    try {
      const res = await api.get(`/messages/thread/${comp.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data.messages);
        refreshUnreadCount();
      }
    } catch (err) {
      console.error('Failed to load message thread:', err);
    }
  };

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !replyToComplaint) return;
    const recipientRole = replyToComplaint.raisedBy === 'System Admin' ? 'Administrator' : 'Sales Executive';
    try {
      const res = await api.post('/messages', {
        complaint_id: replyToComplaint.id,
        message_text: messageText,
        recipient_role: recipientRole
      });
      if (res.ok) {
        setMessageText('');
        // Reload thread list
        const threadRes = await api.get(`/messages/thread/${replyToComplaint.id}`);
        if (threadRes.ok) {
          const threadData = await threadRes.json();
          setMessages(threadData.data.messages);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Filter complaints based on selection
  const filteredComplaints = complaints.filter(c => {
    if (selectedStatus !== 'All' && c.status !== selectedStatus) return false;
    if (selectedDept !== 'All' && c.type !== selectedDept) return false;
    if (selectedPriority !== 'All' && c.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.customer.toLowerCase().includes(q) ||
        c.invoice.toLowerCase().includes(q) ||
        c.subtype.toLowerCase().includes(q) ||
        c.raisedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort complaints based on selection
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    if (sortBy === 'ID') {
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'Priority') {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    }
    // Default Raised Date Sort (using ID string comparison since they increment sequentially)
    return b.id.localeCompare(a.id);
  });

  // KPI count statistics
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const inprogressCount = complaints.filter(c => c.status === 'In Progress').length;
  const escalatedCount = complaints.filter(c => c.status === 'Escalated').length;
  const completedCount = complaints.filter(c => c.status === 'Completed').length;

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '100vh' }}>
      
      {/* 1. TOP NAVBAR */}
      <Navbar 
        profileDropdownOpen={profileDropdownOpen}
        setProfileDropdownOpen={setProfileDropdownOpen}
        handleLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isDesktop={isDesktop}
      />

      <div className="flex-1 flex overflow-hidden w-full max-w-full" style={{ overflowX: 'hidden', height: 'calc(100vh - 64px)' }}>
        
        {/* 2. SIDEBAR */}
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleLogout={handleLogout}
          isDesktop={isDesktop}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          unreadMessagesCount={unreadCount}
        />

        {/* MAIN BODY AREA */}
        <main 
          style={{ 
            flex: 1, 
            marginLeft: isDesktop ? '220px' : '0',
            overflowY: 'auto', 
            padding: '24px 24px 88px 24px', 
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            minWidth: 0,
            boxSizing: 'border-box'
          }}
        >
          
          {/* 3. DASHBOARD PAGE HEADER & TOOLBAR */}
          <DashboardHeader 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* 4. STAT CARDS ROW */}
          <section 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)', 
              gap: '16px', 
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <StatCard 
              title="Total Logs" 
              value={totalCount} 
              icon={<FileSpreadsheet size={16} />} 
              color="slate"
              status="All"
              activeStatus={selectedStatus}
              onClick={() => setSelectedStatus('All')}
            />
            <StatCard 
              title="Pending" 
              value={pendingCount} 
              icon={<Clock size={16} />} 
              color="amber"
              status="Pending"
              activeStatus={selectedStatus}
              onClick={() => setSelectedStatus('Pending')}
            />
            <StatCard 
              title="In Progress" 
              value={inprogressCount} 
              icon={<RefreshCw size={16} />} 
              color="blue"
              status="In Progress"
              activeStatus={selectedStatus}
              onClick={() => setSelectedStatus('In Progress')}
            />
            <StatCard 
              title="Escalated" 
              value={escalatedCount} 
              icon={<ShieldAlert size={16} />} 
              color="red"
              status="Escalated"
              activeStatus={selectedStatus}
              onClick={() => setSelectedStatus('Escalated')}
            />
            <StatCard 
              title="Completed" 
              value={completedCount} 
              icon={<CheckSquare size={16} />} 
              color="green"
              status="Completed"
              activeStatus={selectedStatus}
              onClick={() => setSelectedStatus('Completed')}
            />
          </section>

          {/* 5. SLA BREACH ALERT WARNING BANNER */}
          <SlaAlertBanner breachCount={3} />

          {/* 6. PILL FILTER TABS ROW */}
          <FilterTabs 
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedDept={selectedDept}
            setSelectedDept={setSelectedDept}
            counts={{
              all: totalCount,
              pending: pendingCount,
              inprogress: inprogressCount,
              escalated: escalatedCount,
              completed: completedCount
            }}
            isMobile={isMobile}
          />

          {/* 7. COMPLAINTS TABLE */}
          <ComplaintsTable 
            complaints={sortedComplaints}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onMessageClick={handleMessageClick}
            onStatusChange={handleStatusChange}
            isMobile={isMobile}
            selectedQuickComplaint={selectedQuickComplaint}
            onRowSelect={setSelectedQuickComplaint}
          />

          {/* 8. INLINE REPLY PANEL */}
          <MessagePanel 
            replyToComplaint={replyToComplaint}
            messageText={messageText}
            setMessageText={setMessageText}
            onSubmit={handleSendMessageSubmit}
            onClose={() => { setMessagePanelOpen(false); setReplyToComplaint(null); }}
            messages={messages}
            currentUserId={user?.id || user?.userId}
          />

        </main>
      </div>

      {/* Persistent Quick Message Pinned Input Bar */}
      <QuickMessageBar 
        selectedComplaint={selectedQuickComplaint}
        onMessageSent={(complaintId) => {
          refreshUnreadCount();
          if (replyToComplaint && replyToComplaint.id === complaintId) {
            handleMessageClick(replyToComplaint);
          }
        }}
        isMobile={isMobile}
      />

    </div>
  );
};

export default Dashboard;
