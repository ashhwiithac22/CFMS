import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FileSpreadsheet, Clock, RefreshCw, ShieldAlert, CheckSquare, BarChart3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import SlaAlertBanner from '../components/SlaAlertBanner';
import FilterTabs from '../components/FilterTabs';
import ComplaintsTable from '../components/ComplaintsTable';
import MessagePanel from '../components/MessagePanel';
import { api } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
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
  const [categories, setCategories] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Message Panel State
  const [messagePanelOpen, setMessagePanelOpen] = useState(false);
  const [replyToComplaint, setReplyToComplaint] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
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

  const fetchComplaints = async (sort = sortBy) => {
    try {
      // Map frontend label to backend param value
      const sortParam = sort === 'Priority' ? 'priority' : 'date';
      let url = `/complaints?sort=${sortParam}`;
      if (user?.role === 'Warehouse Manager' && activeTab === 'Escalated Complaints') {
        url += '&history=true';
      }
      const res = await api.get(url);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.data.complaints || []);
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/complaints/metadata');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data.complaintTypes || []);
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/complaints/stats');
      if (res.ok) {
        const result = await res.json();
        setStats(result.data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Initial load + polling (refresh every 8s)
  // Load and poll complaints + metadata on mount, tab change, or sort change
  useEffect(() => {
    refreshUnreadCount();
    fetchComplaints(sortBy);
    fetchStats();
    fetchMetadata();
    setCurrentPage(1); // Reset to page 1 on tab/sort change
    
    const interval = setInterval(() => {
      refreshUnreadCount();
      fetchComplaints(sortBy);
      fetchStats();
    }, 8000);
    
    return () => clearInterval(interval);
  }, [sortBy, activeTab, user]);

  // Initialize clean empty complaints state
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await api.put(`/complaints/${id}/status`, { action: newStatus });
      if (res.ok) {
        fetchComplaints();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to update complaint status:', err);
    }
  };

  const fetchThreadForRecipient = useCallback(async (complaintId, recipientId) => {
    try {
      const url = recipientId 
        ? `/messages/thread/${complaintId}?recipient_id=${recipientId}` 
        : `/messages/thread/${complaintId}`;
      const res = await api.get(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data.messages);
      }
    } catch (err) {
      console.error('Failed to load scoped message thread:', err);
    }
  }, []);

  const handleMessageClick = (comp) => {
    setReplyToComplaint(comp);
    setMessageText('');
    setAttachmentFile(null);
    setMessages([]); // Clear thread immediately to prevent stale flash
    setMessagePanelOpen(true);
    refreshUnreadCount();

    // Auto-focus text input and scroll smoothly into view
    setTimeout(() => {
      const inputEl = document.querySelector('#quick-message-input') || document.querySelector('input[placeholder*="Type"]');
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 120);
  };

  const [selectedRecipient, setSelectedRecipient] = useState(null);

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachmentFile) || !replyToComplaint) return;

    const recipientRole = selectedRecipient?.role || (replyToComplaint.raisedBy === 'System Admin' ? 'Administrator' : 'Warehouse Team');
    const recipientId = selectedRecipient?.id || null;

    try {
      const formData = new FormData();
      formData.append('complaint_id', replyToComplaint.id);
      formData.append('message_text', messageText.trim());
      formData.append('recipient_role', recipientRole);
      if (recipientId) {
        formData.append('recipient_id', recipientId);
      }
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      const res = await api.postFormData('/messages', formData);
      if (res.ok) {
        setMessageText('');
        setAttachmentFile(null);
        // Reload recipient-scoped thread list
        await fetchThreadForRecipient(replyToComplaint.id, recipientId);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Derived state to filter complaints for "My Complaints" tab for Warehouse Team members
  const displayComplaints = (user?.role === 'Warehouse Team' && activeTab === 'My Complaints')
    ? complaints.filter(c => c.taken_action_by === user.id)
    : complaints;

  // Filter complaints based on selection
  const filteredComplaints = displayComplaints.filter(c => {
    if (selectedStatus === 'Pending' && !(c.status === 'Pending' || c.status === 'Assigned' || c.status === 'New')) return false;
    if (selectedStatus === 'In Progress' && c.status !== 'In Progress') return false;
    if (selectedStatus === 'Escalated' && !(c.status === 'Escalated' || c.status === 'Escalated to Manager' || c.status === 'Escalated to Warehouse Head' || (c.sla && (c.sla.includes('Expired') || c.sla.includes('!')) && c.status !== 'Resolved' && c.status !== 'Completed'))) return false;
    if (selectedStatus === 'Completed' && !(c.status === 'Completed' || c.status === 'Resolved')) return false;
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

  // Sort is enforced by backend ORDER BY — no client-side re-sort needed.
  // The complaints array is already in the correct order from the API.
  const sortedComplaints = filteredComplaints;

  // KPI count statistics calculated dynamically from current scoped complaint records
  const totalCount = (user?.role === 'Warehouse Manager' && stats) ? stats.totalCount : displayComplaints.length;
  const pendingCount = (user?.role === 'Warehouse Manager' && stats) ? stats.pendingCount : displayComplaints.filter(c => c.status === 'Pending' || c.status === 'Assigned' || c.status === 'New').length;
  const inprogressCount = (user?.role === 'Warehouse Manager' && stats) ? stats.inprogressCount : displayComplaints.filter(c => c.status === 'In Progress').length;
  const escalatedCount = (user?.role === 'Warehouse Manager' && stats) ? stats.escalatedCount : displayComplaints.filter(c => c.status === 'Escalated' || c.status === 'Escalated to Manager' || c.status === 'Escalated to Warehouse Head' || (c.sla && (c.sla.includes('Expired') || c.sla.includes('!')) && c.status !== 'Resolved' && c.status !== 'Completed')).length;
  const completedCount = (user?.role === 'Warehouse Manager' && stats) ? stats.completedCount : displayComplaints.filter(c => c.status === 'Completed' || c.status === 'Resolved').length;
  const breachedCount = displayComplaints.filter(c => c.status === 'Escalated to Manager' || c.status === 'Escalated to Warehouse Head').length;

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '100vh' }}>
      
      {/* 1. TOP NAVBAR */}
      <Navbar 
        profileDropdownOpen={profileDropdownOpen}
        setProfileDropdownOpen={setProfileDropdownOpen}
        handleLogout={logout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isDesktop={isDesktop}
        unreadCount={unreadCount}
        onNotificationSelect={(compNumber) => {
          const comp = complaints.find(c => c.id === compNumber || String(c.id) === String(compNumber));
          if (comp) {
            handleMessageClick(comp);
          }
        }}
      />

      <div className="flex-1 flex overflow-hidden w-full max-w-full" style={{ overflowX: 'hidden', height: 'calc(100vh - 64px)' }}>
        
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'Raise Complaint') {
              navigate('/raise-complaint');
            } else {
              setActiveTab(tab);
            }
          }}
          handleLogout={logout}
          isDesktop={isDesktop}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          unreadMessagesCount={unreadCount}
        />

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
          {/* ─────────────────────────────── MY COMPLAINTS / ESCALATED VIEW ─────────────────────────────── */}
          {activeTab === 'My Complaints' || activeTab === 'Escalated Complaints' ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                    {activeTab}
                  </h1>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {activeTab === 'My Complaints' ? (
                      'Your claimed complaints requiring resolution.'
                    ) : (
                      'Historical and active escalated complaints requiring manager attention.'
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('Dashboard')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)', cursor: 'pointer'
                  }}
                >
                  ← Back to Dashboard
                </button>
              </div>

              {/* Stat cards — same as dashboard */}
              <section style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                <StatCard title="Total Logs" value={totalCount} icon={<FileSpreadsheet size={16} />} color="slate" status="All" activeStatus={selectedStatus} onClick={() => setSelectedStatus('All')} />
                <StatCard title="Pending" value={pendingCount} icon={<Clock size={16} />} color="amber" status="Pending" activeStatus={selectedStatus} onClick={() => setSelectedStatus('Pending')} />
                <StatCard title="In Progress" value={inprogressCount} icon={<RefreshCw size={16} />} color="blue" status="In Progress" activeStatus={selectedStatus} onClick={() => setSelectedStatus('In Progress')} />
                <StatCard title="Escalated" value={escalatedCount} icon={<ShieldAlert size={16} />} color="red" status="Escalated" activeStatus={selectedStatus} onClick={() => setSelectedStatus('Escalated')} />
                <StatCard title="Completed" value={completedCount} icon={<CheckSquare size={16} />} color="green" status="Completed" activeStatus={selectedStatus} onClick={() => setSelectedStatus('Completed')} />
              </section>

              {/* Filter + Sort toolbar */}
              <div style={{ position: 'relative', zIndex: 100 }}>
                <FilterTabs 
                  selectedStatus={selectedStatus}
                  setSelectedStatus={setSelectedStatus}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  selectedDept={selectedDept}
                  setSelectedDept={setSelectedDept}
                  categories={categories}
                />
              </div>

              {/* Complaints table */}
              <div style={{ position: 'relative', zIndex: 10 }}>
                <ComplaintsTable 
                  complaints={sortedComplaints}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  onMessageClick={handleMessageClick}
                  onStatusChange={handleStatusChange}
                  isMobile={isMobile}
                  selectedQuickComplaint={selectedQuickComplaint}
                  onRowSelect={setSelectedQuickComplaint}
                  activeTab={activeTab}
                />
              </div>

              <MessagePanel 
                replyToComplaint={replyToComplaint}
                messageText={messageText}
                setMessageText={setMessageText}
                attachmentFile={attachmentFile}
                setAttachmentFile={setAttachmentFile}
                setSelectedRecipient={setSelectedRecipient}
                onSubmit={handleSendMessageSubmit}
                onClose={() => { setMessagePanelOpen(false); setReplyToComplaint(null); setSelectedQuickComplaint(null); setAttachmentFile(null); setMessages([]); }}
                messages={messages}
                setMessages={setMessages}
                onFetchThread={fetchThreadForRecipient}
                currentUserId={user?.id || user?.userId}
              />
            </div>
          ) : (
          /* ─────────────────────────────── DASHBOARD VIEW ─────────────────────────────── */
          user?.role === 'Administrator' ? (
            <div 
              className="animate-fade-in"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '400px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '48px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                margin: '24px 0',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <BarChart3 size={48} style={{ color: 'var(--brand-primary)', marginBottom: '16px', opacity: 0.8 }} />
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                Admin Control Center
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: 0 }}>
                Reports and complaint oversight tools coming soon.
              </p>
            </div>
          ) : (
          <>
          <div className="animate-fade-in">
            <DashboardHeader 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onRaiseComplaint={() => navigate('/raise-complaint')}
            />
          </div>

          <section 
            className="animate-slide-up stagger-1"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)', 
              gap: '16px', 
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <StatCard title="Total Logs" value={totalCount} icon={<FileSpreadsheet size={16} />} color="slate" status="All" activeStatus={selectedStatus} onClick={() => setSelectedStatus('All')} />
            <StatCard title="Pending" value={pendingCount} icon={<Clock size={16} />} color="amber" status="Pending" activeStatus={selectedStatus} onClick={() => setSelectedStatus('Pending')} />
            <StatCard title="In Progress" value={inprogressCount} icon={<RefreshCw size={16} />} color="blue" status="In Progress" activeStatus={selectedStatus} onClick={() => setSelectedStatus('In Progress')} />
            <StatCard title="Escalated" value={escalatedCount} icon={<ShieldAlert size={16} />} color="red" status="Escalated" activeStatus={selectedStatus} onClick={() => setSelectedStatus('Escalated')} />
            <StatCard title="Completed" value={completedCount} icon={<CheckSquare size={16} />} color="green" status="Completed" activeStatus={selectedStatus} onClick={() => setSelectedStatus('Completed')} />
          </section>

          <div className="stagger-banner">
            <SlaAlertBanner breachCount={breachedCount} onViewEscalatedClick={() => setSelectedStatus('Escalated')} />
          </div>

          <div className="animate-slide-up stagger-filter" style={{ position: 'relative', zIndex: 100 }}>
            <FilterTabs 
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedDept={selectedDept}
              setSelectedDept={setSelectedDept}
              categories={categories}
            />
          </div>

          <div className="animate-slide-up stagger-table" style={{ position: 'relative', zIndex: 10 }}>
            <ComplaintsTable 
              complaints={sortedComplaints}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              onMessageClick={handleMessageClick}
              onStatusChange={handleStatusChange}
              isMobile={isMobile}
              selectedQuickComplaint={selectedQuickComplaint}
              onRowSelect={setSelectedQuickComplaint}
              activeTab={activeTab}
            />
          </div>

          <MessagePanel 
            replyToComplaint={replyToComplaint}
            messageText={messageText}
            setMessageText={setMessageText}
            attachmentFile={attachmentFile}
            setAttachmentFile={setAttachmentFile}
            setSelectedRecipient={setSelectedRecipient}
            onSubmit={handleSendMessageSubmit}
            onClose={() => { setMessagePanelOpen(false); setReplyToComplaint(null); setSelectedQuickComplaint(null); setAttachmentFile(null); setMessages([]); }}
            messages={messages}
            setMessages={setMessages}
            onFetchThread={fetchThreadForRecipient}
            currentUserId={user?.id || user?.userId}
          />
          </>
          )
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
