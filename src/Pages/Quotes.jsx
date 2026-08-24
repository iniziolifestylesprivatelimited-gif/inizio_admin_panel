import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import {
  FiFileText, FiTrash2, FiSearch, FiEdit2, FiCheckCircle,
  FiXCircle, FiClock, FiAlertCircle, FiLoader, FiUser,
  FiPhone, FiMail, FiCheck, FiX, FiActivity, FiTag,
  FiCalendar, FiMessageSquare, FiGrid, FiList
} from 'react-icons/fi';
import CustomDropdown from '../Components/CustomDropdown';
import ProductDetailsModal from '../Components/ProductDetailsModal';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

// Simple Copy ID helper
const CopyIdBadge = ({ id }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
      title={copied ? "Copied ID!" : "Click to copy Quote ID"}
    >
      {copied ? (
        <>
          <FiCheck className="text-emerald-400" size={10} />
          <span className="text-emerald-400 font-bold">Copied</span>
        </>
      ) : (
        <span className="font-mono opacity-80">#{id ? id.substring(id.length - 6).toUpperCase() : ''}</span>
      )}
    </button>
  );
};

const Quotes = () => {
  const navigate = useNavigate();
  const { setQuotesUnreadCount } = useOutletContext() || {};
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [viewModalProductId, setViewModalProductId] = useState(null);

  // Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [editStatus, setEditStatus] = useState('pending');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [confirmStatusModalOpen, setConfirmStatusModalOpen] = useState(false);

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
      if (setQuotesUnreadCount) setQuotesUnreadCount(0);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError('Failed to retrieve quote requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (setQuotesUnreadCount) setQuotesUnreadCount(0);
  }, [setQuotesUnreadCount]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleUpdateStatusSubmit = (e) => {
    e.preventDefault();
    if (!selectedQuote) return;
    setConfirmStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedQuote) return;
    setUpdating(true);
    try {
      const response = await api.put(`/quotes/admin/${selectedQuote._id}`, {
        status: editStatus,
        adminNotes: editAdminNotes
      });

      if (response.status === 200 || response.data?.success) {
        setQuotes(prev => prev.map(q => q._id === selectedQuote._id ? { ...q, status: editStatus, adminNotes: editAdminNotes, updatedAt: new Date().toISOString() } : q));
        setConfirmStatusModalOpen(false);
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

        {/* Search Filter Box */}
        <div className="relative w-72">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            placeholder="Search by client name, email, phone, or product requested..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-950/30 border border-white/10 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all text-sm font-medium placeholder-slate-400"
          />
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
          <div key={idx} className="bg-slate-950/30 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative shadow-lg">
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
      
      {/* Filter & View Mode Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Status Quick Filters */}
        <div className="flex bg-slate-900/80 border border-white/10 rounded-2xl p-1 gap-1 overflow-x-auto custom-scrollbar max-w-full">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'contacted', label: 'Contacted', count: stats.contacted },
            { id: 'resolved', label: 'Resolved', count: stats.resolved },
            { id: 'rejected', label: 'Rejected', count: stats.rejected }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 rounded-2xl p-1 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Card Grid View"
          >
            <FiGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Table View"
          >
            <FiList size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main View (Grid Cards or Table) */}
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
      ) : viewMode === 'table' ? (
        /* ================= TABLE VIEW ================= */
        <div className="bg-linear-to-br from-transparent to-blue-950/65 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-auto custom-scrollbar max-h-[65vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
              <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md shadow-md">
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 font-bold text-center">S.No</th>
                  <th className="p-3.5 font-bold">Date & ID</th>
                  <th className="p-3.5 font-bold">Requester</th>
                  <th className="p-3.5 font-bold">Product</th>
                  <th className="p-3.5 font-bold text-center">Quantity</th>
                  <th className="p-3.5 font-bold text-right">Target / Unit</th>
                  <th className="p-3.5 font-bold text-right">Total Deal</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                  <th className="p-3.5 font-bold">Notes</th>
                  <th className="p-3.5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredQuotes.map((q, idx) => {
                  const clientName = q.name || q.user?.name || 'Unknown Client';
                  const clientPhone = q.phone || q.user?.phone;
                  const clientEmail = q.user?.email || (q.email ? q.email : null);
                  const productName = q.productName || q.product?.name || 'Custom Product';
                  const expected = Number(q.expectedPrice) || 0;
                  const quantity = Number(q.quantity) || 0;
                  const totalExpectedValue = expected * quantity;
                  const productImage = q.product?.images?.[0] || '';
                  const prodId = q.product?._id || q.product || q.productId;
                  
                  const getStatusConfig = (status) => {
                    switch (status?.toLowerCase()) {
                      case 'contacted':
                        return { label: 'Contacted', badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30', icon: FiPhone };
                      case 'resolved':
                        return { label: 'Resolved', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: FiCheckCircle };
                      case 'rejected':
                        return { label: 'Rejected', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: FiXCircle };
                      case 'pending':
                      default:
                        return { label: 'Pending', badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: FiClock };
                    }
                  };
                  const statusConfig = getStatusConfig(q.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={q._id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-3.5 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-300">{formatDateDDMMYYYY(q.createdAt)}</span>
                          <CopyIdBadge id={q._id} />
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 font-black flex items-center justify-center text-xs shrink-0">
                            {clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white">{clientName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{clientPhone || clientEmail || 'No contact'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5 max-w-[200px]">
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-8 h-8 bg-white rounded-lg object-cover bg-slate-900 border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                              <FiTag size={14} />
                            </div>
                          )}
                          <span
                            onClick={() => { if (prodId) setViewModalProductId(prodId); }}
                            className={`truncate font-semibold text-white ${prodId ? 'hover:text-blue-400 cursor-pointer' : ''}`}
                            title={productName}
                          >
                            {productName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-white">{quantity.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">₹{expected.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-400 text-sm">₹{totalExpectedValue.toLocaleString()}</td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-xl border uppercase tracking-wider ${statusConfig.badgeClass}`}>
                          <StatusIcon size={11} className="shrink-0" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-[180px]">
                        {q.message ? (
                          <p className="truncate text-[11px] text-slate-300 italic" title={q.message}>"{q.message}"</p>
                        ) : q.adminNotes ? (
                          <p className="truncate text-[11px] text-blue-300" title={q.adminNotes}>{q.adminNotes}</p>
                        ) : (
                          <span className="text-slate-600 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(q)}
                            className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                            title="Edit Status"
                          >
                            <FiEdit2 size={11} /> Update
                          </button>
                          <button
                            onClick={() => openDeleteModal(q)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Delete Quote"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= CARD GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {filteredQuotes.map((q) => {
            const clientName = q.name || q.user?.name || 'Unknown Client';
            const clientPhone = q.phone || q.user?.phone;
            const clientEmail = q.user?.email || (q.email ? q.email : null);
            const productName = q.productName || q.product?.name || 'Custom Product';

            const expected = Number(q.expectedPrice) || 0;
            const quantity = Number(q.quantity) || 0;
            const totalExpectedValue = expected * quantity;

            const basePrice = q.product?.basePrice || 0;
            const offerPrice = q.product?.offerPrice || 0;
            const productImage = q.product?.images?.[0] || '';
            const prodId = q.product?._id || q.product || q.productId;

            const getStatusConfig = (status) => {
              switch (status?.toLowerCase()) {
                case 'contacted':
                  return {
                    label: 'Contacted',
                    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                    icon: FiPhone,
                    accentBorder: 'hover:border-sky-500/40'
                  };
                case 'resolved':
                  return {
                    label: 'Resolved',
                    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                    icon: FiCheckCircle,
                    accentBorder: 'hover:border-emerald-500/40'
                  };
                case 'rejected':
                  return {
                    label: 'Rejected',
                    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                    icon: FiXCircle,
                    accentBorder: 'hover:border-rose-500/40'
                  };
                case 'pending':
                default:
                  return {
                    label: 'Pending',
                    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    icon: FiClock,
                    accentBorder: 'hover:border-amber-500/40'
                  };
              }
            };

            const statusConfig = getStatusConfig(q.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={q._id}
                className={`bg-linear-to-br from-transparent to-blue-950/65 border border-white/10 ${statusConfig.accentBorder} rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-black/50 group h-full space-y-3.5 relative`}
              >
                {/* Section 1: Header Row (Status & Date & Copy ID) */}
                <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${statusConfig.badgeClass}`}>
                      <StatusIcon size={11} className="shrink-0" />
                      {statusConfig.label}
                    </span>
                    {q.createdAt && (
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <FiCalendar size={11} className="text-slate-500" />
                        {formatDateDDMMYYYY(q.createdAt)}
                      </span>
                    )}
                  </div>
                  <CopyIdBadge id={q._id} />
                </div>

                {/* Section 2: Customer / Requester Profile */}
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black flex items-center justify-center text-sm shrink-0 shadow-inner">
                    {clientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white text-sm font-bold truncate group-hover:text-blue-400 transition-colors" title={clientName}>
                      {clientName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      {clientPhone ? (
                        <a
                          href={`tel:${clientPhone}`}
                          className="flex items-center gap-1 hover:text-blue-400 transition-colors font-mono text-[11px]"
                          title={`Call ${clientPhone}`}
                        >
                          <FiPhone size={10} className="text-slate-500" />
                          <span>{clientPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 text-[11px]">No phone</span>
                      )}
                      {clientEmail && (
                        <>
                          <span className="text-slate-600">•</span>
                          <a
                            href={`mailto:${clientEmail}`}
                            className="flex items-center gap-1 hover:text-blue-400 transition-colors font-mono text-[11px] truncate max-w-[130px]"
                            title={clientEmail}
                          >
                            <FiMail size={10} className="text-slate-500 shrink-0" />
                            <span className="truncate">{clientEmail}</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Product Info */}
                <div className="flex items-center gap-3 bg-slate-950/60 border border-white/5 rounded-xl p-2.5 text-left">
                  {productImage ? (
                    <div
                      onClick={() => { if (prodId) setViewModalProductId(prodId); }}
                      className={`w-10 h-10 bg-white rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10 ${prodId ? 'cursor-pointer hover:border-blue-500 hover:scale-105 transition-all' : ''}`}
                      title={prodId ? "View Product Details" : undefined}
                    >
                      <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      onClick={() => { if (prodId) setViewModalProductId(prodId); }}
                      className={`w-10 h-10 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 border border-white/10 ${prodId ? 'cursor-pointer hover:border-blue-500 hover:scale-105 transition-all' : ''}`}
                      title={prodId ? "View Product Details" : undefined}
                    >
                      <FiTag size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4
                      onClick={() => { if (prodId) setViewModalProductId(prodId); }}
                      className={`text-xs font-bold text-white truncate ${prodId ? 'hover:text-blue-400 cursor-pointer' : ''}`}
                      title={productName}
                    >
                      {productName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      {offerPrice > 0 ? (
                        <span>Offer: <strong className="text-slate-300 font-mono">₹{offerPrice.toLocaleString()}</strong></span>
                      ) : null}
                      {basePrice > 0 ? (
                        <span>MRP: <strong className="text-slate-500 line-through font-mono">₹{basePrice.toLocaleString()}</strong></span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Section 4: 3-Column Financial Metric Strip */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950/80 border border-white/10 rounded-xl p-2.5 text-center">
                  <div className="border-r border-white/5 pr-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Quantity</span>
                    <span className="text-xs font-extrabold text-white font-mono mt-0.5 block">{quantity.toLocaleString()}</span>
                  </div>
                  <div className="border-r border-white/5 pr-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target / Unit</span>
                    <span className="text-xs font-extrabold text-amber-400 font-mono mt-0.5 block">₹{expected.toLocaleString()}</span>
                  </div>
                  <div className="pl-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Deal</span>
                    <span className="text-xs font-black text-emerald-400 font-mono mt-0.5 block">₹{totalExpectedValue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Section 5: Notes Container with Clean Fixed Layout */}
                <div className="min-h-[44px] flex flex-col justify-center bg-slate-950/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-left">
                  {q.message ? (
                    <div className="flex items-start gap-2">
                      <FiMessageSquare size={12} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] italic text-slate-300 line-clamp-1" title={q.message}>
                        "{q.message}"
                      </p>
                    </div>
                  ) : q.adminNotes ? (
                    <div className="flex items-start gap-2">
                      <FiFileText size={12} className="text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-300 line-clamp-1" title={q.adminNotes}>
                        {q.adminNotes}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600 italic">No notes provided</span>
                  )}
                  {q.message && q.adminNotes && (
                    <div className="flex items-start gap-2 mt-1 pt-1 border-t border-white/5">
                      <FiFileText size={12} className="text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-300 line-clamp-1" title={q.adminNotes}>
                        {q.adminNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 6: Action Footer */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-auto">
                  <button
                    onClick={() => openEditModal(q)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/30 active:scale-95"
                  >
                    <FiEdit2 size={12} /> Update Status
                  </button>
                  <button
                    onClick={() => openDeleteModal(q)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95"
                    title="Delete Quote"
                  >
                    <FiTrash2 size={13} />
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
          <div className="bg-linear-to-br from-slate-950 to-blue-950/65 border border-white/15 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in-95">
            <button onClick={() => setEditModalOpen(false)} className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <FiX size={20} />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Update Quote Status</h3>
            <p className="text-xs text-slate-400 mb-4">Modify the state of quote request and append follow-up notes.</p>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-left">
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
                  className="px-5 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border border-blue-500/35 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                className="flex-1 py-2 disabled:opacity-30 disabled:hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-500/35 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
              >
                {deleting ? <FiLoader className="animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Status Modal */}
      {confirmStatusModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmStatusModalOpen(false)}></div>
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in-95 text-center">

            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3 animate-bounce">
              <FiAlertCircle size={24} />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Confirm Status Change</h3>
            <p className="text-xs text-slate-400 mb-6 flex flex-col items-center gap-2">
              <span>Are you sure you want to change the status of the quote request for <span className="text-white font-semibold">{(selectedQuote.name || selectedQuote.user?.name || 'this client')}</span>?</span>
              <span className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${selectedQuote.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    selectedQuote.status === 'contacted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      selectedQuote.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>{selectedQuote.status || 'pending'}</span>
                <span className="text-slate-500">→</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${editStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    editStatus === 'contacted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      editStatus === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>{editStatus}</span>
              </span>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmStatusModalOpen(false)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="flex-1 py-2 disabled:opacity-30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-blue-500/35 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {updating ? <FiLoader className="animate-spin" /> : 'Yes, Update'}
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
              className="w-full py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-blue-500/35 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* In-Page Product Details Modal */}
      <ProductDetailsModal
        isOpen={!!viewModalProductId}
        productId={viewModalProductId}
        onClose={() => setViewModalProductId(null)}
        showEditButton={false}
      />

    </div>
  );
};

export default Quotes;
