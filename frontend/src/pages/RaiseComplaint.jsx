import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Upload, X, ArrowLeft, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import CustomSelect from '../components/common/CustomSelect';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const RaiseComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form State
  const [warehouseId, setWarehouseId] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [complaintTypeId, setComplaintTypeId] = useState('');
  const [complaintSubtypeId, setComplaintSubtypeId] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Metadata State
  const [warehouses, setWarehouses] = useState([]);
  const [complaintTypes, setComplaintTypes] = useState([]);
  const [complaintSubtypes, setComplaintSubtypes] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // UI Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Protected route guard: Redirect if role is not Sales Executive
  useEffect(() => {
    if (user && user.role !== 'Sales Executive') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Fetch form metadata (warehouses, complaint types, complaint subtypes)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await api.get('/complaints/metadata');
        if (res.ok) {
          const result = await res.json();
          setWarehouses(result.data.warehouses || []);
          setComplaintTypes(result.data.complaintTypes || []);
          setComplaintSubtypes(result.data.complaintSubtypes || []);
        }
      } catch (err) {
        console.error('Failed to fetch complaint metadata:', err);
      } finally {
        setLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, []);

  // Filter subtypes dynamically based on selected complaint_type_id
  const filteredSubtypes = complaintSubtypes.filter(
    sub => String(sub.complaint_type_id) === String(complaintTypeId)
  );

  // Reset subtype when complaint type changes
  const handleTypeChange = (typeId) => {
    setComplaintTypeId(typeId);
    setComplaintSubtypeId('');
  };

  // Image file handler with 5MB validation
  const handlePhotoChange = (e) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Only image files (JPEG, PNG, WEBP) are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the maximum limit of 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!warehouseId || !customerCode.trim() || !invoiceNumber.trim() || !complaintTypeId || !description.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (filteredSubtypes.length > 0 && !complaintSubtypeId) {
      setErrorMsg('Please select a complaint subtype.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('warehouse_id', warehouseId);
      formData.append('customer_code', customerCode.trim());
      formData.append('invoice_number', invoiceNumber.trim());
      formData.append('complaint_type_id', complaintTypeId);
      if (complaintSubtypeId) {
        formData.append('complaint_subtype_id', complaintSubtypeId);
      }
      formData.append('description', description.trim());
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.postFormData('/complaints', formData);
      const result = await res.json();

      if (res.ok) {
        setSuccessMsg(result.message || 'Complaint raised successfully!');
        // Reset form
        setWarehouseId('');
        setCustomerCode('');
        setInvoiceNumber('');
        setComplaintTypeId('');
        setComplaintSubtypeId('');
        setDescription('');
        removePhoto();
        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      } else {
        setErrorMsg(result.message || 'Failed to raise complaint.');
      }
    } catch (err) {
      console.error('Error submitting complaint:', err);
      setErrorMsg('Failed to raise complaint. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} unreadCount={0} />

      <div style={{ display: 'flex', paddingTop: '64px' }}>
        <Sidebar 
          activeTab="Raise Complaint"
          setActiveTab={(tab) => {
            if (tab === 'Dashboard') navigate('/dashboard');
          }}
          handleLogout={() => {
            localStorage.removeItem('user_logged_in');
            window.location.href = '/login';
          }}
          isDesktop={true}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          unreadMessagesCount={0}
        />

        <main 
          style={{ 
            flex: 1, 
            marginLeft: '220px', 
            padding: '24px', 
            maxWidth: '900px', 
            boxSizing: 'border-box' 
          }}
        >
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
              type="button"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Raise New Complaint</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Sales Executive Portal • Submit customer feedback evidence</p>
            </div>
          </div>

          {/* Alert Banners */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px'
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--completed-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--completed-text)',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px'
                }}
              >
                <CheckCircle2 size={18} />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Form Card */}
          <div 
            style={{ 
              padding: '28px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Row 1: Warehouse & Customer Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Warehouse / Unit <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <CustomSelect
                    value={warehouseId}
                    onChange={(val) => setWarehouseId(val)}
                    placeholder="Select Warehouse"
                    options={warehouses.map(w => ({ value: w.id, label: `${w.name} (${w.location})` }))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Customer Code <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value)}
                    placeholder="e.g. CUST-10482"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Invoice Number & Complaint Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Invoice Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2024-3812"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Complaint Type <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <CustomSelect
                    value={complaintTypeId}
                    onChange={handleTypeChange}
                    placeholder="Select Complaint Type"
                    options={complaintTypes.map(t => ({ value: t.id, label: t.name }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Row 3: Complaint Subtype (Dynamically Hidden if no subtypes available) */}
              <AnimatePresence>
                {filteredSubtypes.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)' }}>
                      Complaint Subtype <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <CustomSelect
                      value={complaintSubtypeId}
                      onChange={(val) => setComplaintSubtypeId(val)}
                      placeholder="Select Subtype"
                      options={filteredSubtypes.map(s => ({ value: s.id, label: s.name }))}
                      style={{ width: '100%' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Row 4: Description */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Detailed Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the complaint, item details, style/color mismatch details, or packaging defect..."
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    padding: '12px 14px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Row 5: Attach Photo Evidence */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Proof of Complaint Photo (Optional, Max 5MB)
                </label>
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />

                {!previewUrl ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'border-color 150ms ease'
                    }}
                  >
                    <Upload size={24} style={{ color: 'var(--brand-primary)', marginBottom: '6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Click to upload evidence photo</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Supports JPEG, PNG, WEBP up to 5MB</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <img src={previewUrl} alt="Evidence preview" style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {photoFile?.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {(photoFile?.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                      title="Remove photo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  icon={<Send size={16} />}
                >
                  Raise Complaint
                </Button>
              </div>

            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RaiseComplaint;
