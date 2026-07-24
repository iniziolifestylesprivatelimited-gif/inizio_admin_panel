import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { 
  FiFileText, FiTrash2, FiSearch, FiEdit2, FiCheckCircle, 
  FiXCircle, FiClock, FiAlertCircle, FiLoader, FiUser, 
  FiPhone, FiMail, FiCheck, FiX, FiActivity, FiTag
} from 'react-icons/fi';
import CustomDropdown from '../Components/CustomDropdown';

// Simple Copy ID helper
const CopyIdBadge = ({ id }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 text-[10px] text-slate-500 hover:text-white transition-colors bg-white/5 border border-white/5 rounded-md flex items-center justify-center gap-1 cursor-pointer"
      title={copied ? "Copied!" : "Copy ID"}
    >
      {copied ? <FiCheck className="text-emerald-400" size={10} /> : <span className="font-mono">{id.substring(0, 8)}...</span>}
    </button>
  );
};

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [editStatus, setEditStatus] = useState('pending');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [typedConfirmName, setTypedConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  const fetchQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/quotes/admin/all');
      if (response.data?.success) {
        setQuotes(response.data.quotes || []);
      } else {
        setQuotes(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError('Failed to retrieve quote requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;
    setUpdating(true);
    try {
      const response = await api.put(`/quotes/admin/${selectedQuote._id}`, {
        status: editStatus,
        adminNotes: editAdminNotes
      });
      
      if (response.status === 200 || response.data?.success) {
        setQuotes(prev => prev.map(q => q._id === selectedQuote._id ? { ...q, status: editStatus, adminNotes: editAdminNotes, updatedAt: new Date().toISOString() } : q));
        setEditModalOpen(false);
        showAlert('Quote status updated successfully.');
      } else {
        showAlert('Failed to update quote status.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating quote status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    
    // Validate matching name
    const requesterName = (quoteToDelete.name || quoteToDelete.user?.name || '').trim().toLowerCase();
    if (typedConfirmName.trim().toLowerCase() !== requesterName) {
      showAlert('Client name does not match. Please verify and try again.');
      return;
    }

    setDeleting(true);
    try {
      const response = await api.delete(`/quotes/admin/${quoteToDelete._id}`);
      if (response.status === 200 || response.data?.success) {
        setQuotes(prev => prev.filter(q => q._id !== quoteToDelete._id));
        setDeleteModalOpen(false);
        showAlert('Quote request deleted successfully.');
      } else {
        showAlert('Failed to delete quote request.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error deleting quote request.');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (quote) => {
    setSelectedQuote(quote);
    setEditStatus(quote.status || 'pending');
    setEditAdminNotes(quote.adminNotes || '');
    setEditModalOpen(true);
  };

  const openDeleteModal = (quote) => {
    setQuoteToDelete(quote);
    setTypedConfirmName('');
    setDeleteModalOpen(true);
  };

  // Filter quotes based on search and status
  const filteredQuotes = quotes.filter(q => {
    const nameStr = (q.name || q.user?.name || '').toLowerCase();
    const phoneStr = (q.phone || q.user?.phone || '').toLowerCase();
    const emailStr = (q.user?.email || '').toLowerCase();
    const prodStr = (q.productName || q.product?.name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = nameStr.includes(searchLower) || 
                          phoneStr.includes(searchLower) || 
                          emailStr.includes(searchLower) || 
                          prodStr.includes(searchLower);

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    contacted: quotes.filter(q => q.status === 'contacted').length,
    resolved: quotes.filter(q => q.status === 'resolved').length,
    rejected: quotes.filter(q => q.status === 'rejected').length
  };

  return (
    <div className="relative space-y-6 min-h-full z-0 w-full pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiFileText className="text-blue-400" />
            Quotes Requests
          </h1>
          <p className="text-slate-400 font-medium mt-1">Review custom bulk pricing quotes and manage status changes.</p>
        </div>

        {/* Status Quick Filters */}
        <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1 gap-1 w-full md:w-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'contacted', label: 'Contacted' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'rejected', label: 'Rejected' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/35 border border-blue-500/35'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Quotes', val: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Pending', val: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Contacted', val: stats.contacted, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Resolved', val: stats.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Rejected', val: stats.rejected, color: 'text-rose-400', bg: 'bg-rose-500/10' }
        ].map((s, idx) => (
          <div key={idx} className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative shadow-lg">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2 block">{s.label}</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-white">{s.val}</span>
              <span className={`p-1.5 rounded-lg shrink-0 ${s.bg} ${s.color}`}>
                <FiActivity size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Search Filter Box */}
      <div className="relative w-full">
        <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by client name, email, phone, or product requested..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900/40 border border-white/10 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all text-sm font-medium placeholder-slate-400"
        />
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="py-24 flex flex-col justify-center items-center gap-2">
          <FiLoader className="animate-spin text-3xl text-blue-400" />
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Retrieving quote requests...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-500/15 border border-rose-500/25 p-5 rounded-2xl text-center text-rose-400 text-sm font-bold flex items-center justify-center gap-2 max-w-lg mx-auto">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="py-24 flex flex-col justify-center items-center border border-dashed border-white/10 rounded-3xl text-slate-500 p-6 text-center max-w-lg mx-auto">
          <FiFileText size={40} className="text-slate-600 mb-3" />
          <span className="text-sm font-bold">No custom quote requests matched your active filters.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredQuotes.map((q) => {
            const clientName = q.name || q.user?.name || 'Unknown client';
            const clientPhone = q.phone || q.user?.phone || 'No phone';
            const clientEmail = q.user?.email || 'No email';
            const productName = q.productName || q.product?.name || 'Product';
            
            const expected = Number(q.expectedPrice) || 0;
            const quantity = Number(q.quantity) || 0;
            const totalExpectedValue = expected * quantity;
            
            const basePrice = q.product?.basePrice || 0;
            const offerPrice = q.product?.offerPrice || 0;
            const productImage = q.product?.images?.[0] || '';

            return (
              <div key={q._id} className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 relative flex flex-col justify-between overflow-hidden shadow-2xl group hover:border-white/20 transition-all">
                <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
                
                {/* Header Status & ID */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                      q.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      q.status === 'contacted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      q.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {q.status || 'pending'}
                    </span>
                    {q.createdAt && (
                      <span className="text-[9px] text-slate-500 font-bold">
                        {new Date(q.createdAt).toLocaleDateString([], { dateStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  <CopyIdBadge id={q._id} />
                </div>

                {/* Client Information */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 font-black flex items-center justify-center text-xs shrink-0">
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-extrabold">{clientName}</h3>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Requester Account</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-400 font-medium pl-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <FiPhone className="text-slate-500" size={12} />
                      <span className="font-mono">{clientPhone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <FiMail className="text-slate-500" size={12} />
                      <span className="font-mono">{clientEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Product details */}
                <div className="p-3 bg-black/20 rounded-2xl border border-white/5 space-y-3 text-left">
                  <div className="flex items-center gap-2.5">
                    {productImage ? (
                      <img src={productImage} alt={productName} className="w-10 h-10 object-cover rounded-lg shrink-0 border border-white/10 bg-white" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 border border-white/10">
                        <FiTag size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{productName}</h4>
                      {offerPrice > 0 && <span className="text-[10px] text-slate-500 font-bold">Offer: ₹{offerPrice} | Base: ₹{basePrice}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Quantity</span>
                      <span className="font-black text-white font-mono">{quantity.toLocaleString()} units</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Expected Price</span>
                      <span className="font-black text-amber-400 font-mono">₹{expected.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Total Quote Value:</span>
                    <span className="font-black text-emerald-400 font-mono text-sm">₹{totalExpectedValue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Notes and Message */}
                <div className="space-y-2 text-xs text-left">
                  {q.message && (
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5 italic text-slate-400">
                      <span className="text-[8px] text-slate-500 font-black block uppercase tracking-wider not-italic mb-0.5">Client Note:</span>
                      "{q.message}"
                    </div>
                  )}

                  {q.adminNotes && (
                    <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-slate-300">
                      <span className="text-[8px] text-blue-400 font-black block uppercase tracking-wider mb-0.5">Admin Action Notes:</span>
                      {q.adminNotes}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex gap-2 border-t border-white/5 pt-3 mt-auto">
                  <button
                    onClick={() => openEditModal(q)}
                    className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FiEdit2 size={13} /> Update Status
                  </button>
                  <button
                    onClick={() => openDeleteModal(q)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Delete Quote Request"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Status Modal */}
      {editModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditModalOpen(false)}></div>
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in-95">
            <button onClick={() => setEditModalOpen(false)} className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <FiX size={20} />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Update Quote Status</h3>
            <p className="text-xs text-slate-400 mb-4">Modify the state of quote request and append follow-up notes.</p>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status</label>
                <CustomDropdown
                  value={editStatus}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'rejected', label: 'Rejected' }
                  ]}
                  onChange={(val) => setEditStatus(val)}
                  statusColor="bg-black/25 text-white border-white/10 text-xs font-semibold w-full text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Follow-up Notes</label>
                <textarea
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="e.g. Discussed bulk orders. Offered custom slab rate."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/35 border border-blue-500/35"
                >
                  {updating ? <FiLoader className="animate-spin" /> : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && quoteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)}></div>
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in-95 text-center">
            
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 size={24} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Delete Quote Request</h3>
            <p className="text-xs text-slate-400 mb-4">
              Are you sure you want to delete this quote request? To proceed, please type the client's name: 
              <strong className="text-white block mt-1 select-all font-mono font-black">
                {(quoteToDelete.name || quoteToDelete.user?.name || '')}
              </strong>
            </p>

            <input
              type="text"
              placeholder="Type client's name here..."
              value={typedConfirmName}
              onChange={(e) => setTypedConfirmName(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-semibold font-mono text-center mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteQuote}
                disabled={deleting || typedConfirmName.trim().toLowerCase() !== (quoteToDelete.name || quoteToDelete.user?.name || '').trim().toLowerCase()}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/35 border border-rose-500/35"
              >
                {deleting ? <FiLoader className="animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Alert Notification Popup */}
      {alertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAlertOpen(false)}></div>
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl animate-in fade-in zoom-in-95 text-center">
            
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <FiCheckCircle size={24} />
            </div>

            <h3 className="text-base font-bold text-white mb-2">Quote Operations</h3>
            <p className="text-xs text-slate-400 mb-5">{alertMessage}</p>

            <button
              onClick={() => setAlertOpen(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-600/35 border border-blue-500/35"
            >
              Okay
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Quotes;
