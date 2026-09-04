import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { api, BASE_URL } from '../api/axios';
import { useConfirm } from '../Context/ConfirmationContext';
import {
  FiUpload, FiTrash2, FiFileText, FiLoader,
  FiAlertCircle, FiX, FiDownloadCloud, FiEye, FiDownload,
  FiSearch, FiUser, FiMail
} from 'react-icons/fi';

const getFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');

  // Remove '/api' from BASE_URL if it exists, to point to the server root
  const serverUrl = BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

export const Ledgers = () => {
  const { confirm, showAlert } = useConfirm();
  const [ledgers, setLedgers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal and Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [isPendingUpload, setIsPendingUpload] = useState(false);

  const fetchLedgersAndUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [ledgersResponse, usersResponse] = await Promise.all([
        api.get('/ledger/all', { headers }),
        api.get('/admin/customers', { headers })
      ]);

      // Safely extract arrays from responses
      const allLedgers = Array.isArray(ledgersResponse.data)
        ? ledgersResponse.data
        : ledgersResponse.data?.ledgers || [];

      let allUsers = [];
      if (Array.isArray(usersResponse.data)) {
        allUsers = usersResponse.data;
      } else if (usersResponse.data && typeof usersResponse.data === 'object') {
        allUsers = usersResponse.data.data || usersResponse.data.users || usersResponse.data.customers || [];
      }

      // Filter for approved users only for the dropdown
      const approvedUsers = allUsers.filter(user => user.isApproved === true || !!user.userId);

      setLedgers(allLedgers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setUsers(approvedUsers);
    } catch (err) {
      console.error('Fetch data error:', err);
      setError(err.response?.data?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgersAndUsers();
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
    // Reset form
    setTitle('');
    setSelectedUser('');
    setFile(null);
    setUserSearchTerm('');
    setIsUserSelectOpen(false);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser || !title || !file) {
      alert('Please select a user, provide a title, and choose a file.');
      return;
    }
    setPreviewPdfUrl(URL.createObjectURL(file));
    setIsPendingUpload(true);
  };

  const confirmAndUploadLedger = async () => {
    if (!selectedUser || !title || !file) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('ledger', file);

    try {
      const token = sessionStorage.getItem('accessToken');
      await api.post(`/ledger/upload/${selectedUser}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      alert('Ledger uploaded successfully!');
      await fetchLedgersAndUsers(); // Refresh data
      closeModal();
      setPreviewPdfUrl(null);
      setIsPendingUpload(false);
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.response?.data?.message || 'Failed to upload ledger.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm('Are you sure you want to permanently delete this ledger?');
    if (!isConfirmed) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      await api.delete(`/ledger/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLedgers(ledgers.filter(l => l._id !== id));
      showAlert('Ledger deleted successfully.', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showAlert(err.response?.data?.message || 'Failed to delete ledger.', 'error');
    }
  };

  const getUserDetails = (userField) => {
    if (!userField) {
      return { name: 'Customer Removed', email: null, isUnlinked: true };
    }
    if (typeof userField === 'object') {
      return {
        name: userField.name || 'Unknown User',
        email: userField.email || null,
        isUnlinked: false
      };
    }
    const matchedUser = users.find(u => u._id === userField);
    if (matchedUser) {
      return {
        name: matchedUser.name || 'Unknown User',
        email: matchedUser.email || null,
        isUnlinked: false
      };
    }
    return { name: 'Customer Removed', email: null, isUnlinked: true };
  };

  const filteredLedgers = useMemo(() => {
    if (!searchQuery.trim()) return ledgers;
    const q = searchQuery.toLowerCase().trim();
    return ledgers.filter(ledger => {
      const titleMatch = (ledger.title || '').toLowerCase().includes(q);
      const user = getUserDetails(ledger.user);
      const nameMatch = user.name.toLowerCase().includes(q);
      const emailMatch = (user.email || '').toLowerCase().includes(q);
      return titleMatch || nameMatch || emailMatch;
    });
  }, [ledgers, searchQuery, users]);

  const totalPages = Math.ceil(filteredLedgers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLedgers = useMemo(() => {
    return filteredLedgers.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredLedgers, indexOfFirstItem, indexOfLastItem]);

  return (
    <div className="relative space-y-4 min-h-full z-0 isolate w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiFileText className="text-blue-400" />
            Ledgers
          </h1>
          <p className="text-slate-400 font-medium mt-1">Manage customer account statements and uploaded ledgers.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text"
              placeholder="Search by title, customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-9 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-xs font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          <button
            onClick={openModal}
            className="flex items-center px-4 py-2.5 text-white font-bold rounded-xl transition-colors bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shrink-0 cursor-pointer shadow-lg shadow-blue-500/10 text-sm"
          >
            <FiUpload className="mr-2" /> Upload Ledger
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center bg-slate-900/50 border border-white/10 rounded-2xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400 font-medium">Loading ledgers...</p>
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg shrink-0" /> {error}
        </div>
      ) : (
        <div className="relative z-10 border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full">
          <div className="overflow-auto custom-scrollbar max-h-[59vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-150">
              <thead className="sticky top-0 z-20 bg-white/[0.03] backdrop-blur-md shadow-md border-b border-white/10">
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-5 font-bold w-16">S.No</th>
                  <th className="p-5 font-bold">Title</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Uploaded Date</th>
                  <th className="p-5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentLedgers.length > 0 ? (
                  currentLedgers.map((ledger, index) => {
                    const user = getUserDetails(ledger.user);
                    return (
                      <tr key={ledger._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-5 text-sm text-slate-400 font-medium font-mono">{indexOfFirstItem + index + 1}</td>
                        <td className="p-5">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                              <FiFileText size={16} />
                            </div>
                            <span className="text-sm text-white font-bold">{ledger.title}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          {user.isUnlinked ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-400 border border-white/5 italic">
                              User Removed
                            </span>
                          ) : (
                            <div>
                              <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                                <FiUser size={13} className="text-blue-400 shrink-0" />
                                <span>{user.name}</span>
                              </div>
                              {user.email && (
                                <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                                  <FiMail size={11} className="text-slate-600 shrink-0" />
                                  {user.email}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-5 text-sm text-slate-300 font-mono">
                          {formatDateDDMMYYYY(ledger.createdAt)}
                        </td>
                        <td className="p-5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewPdfUrl(getFileUrl(ledger.fileUrl))}
                              className="p-2.5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all cursor-pointer hover:scale-105"
                              title="Preview Ledger"
                            >
                              <FiEye size={15} />
                            </button>
                            <a
                              href={getFileUrl(ledger.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer hover:scale-105"
                              title="Download Ledger"
                            >
                              <FiDownloadCloud size={15} />
                            </a>
                            <button
                              onClick={() => handleDelete(ledger._id)}
                              className="p-2.5 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer hover:scale-105"
                              title="Delete Ledger"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                      {searchQuery ? 'No ledgers found matching your search.' : 'No ledgers found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredLedgers.length > 0 && (
            <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02] backdrop-blur-md">
              <span className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, filteredLedgers.length)}</span> of <span className="font-bold text-white">{filteredLedgers.length}</span> ledgers
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
                >
                  &larr;
                </button>
                <div className="flex gap-1 mx-1 sm:mx-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 items-center">
                  {(() => {
                    const pageNumbers = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
                    } else {
                      if (currentPage <= 4) {
                        for (let i = 1; i <= 5; i++) pageNumbers.push(i);
                        pageNumbers.push('...');
                        pageNumbers.push(totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        pageNumbers.push(1);
                        pageNumbers.push('...');
                        for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
                      } else {
                        pageNumbers.push(1);
                        pageNumbers.push('...');
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                        pageNumbers.push('...');
                        pageNumbers.push(totalPages);
                      }
                    }
                    return pageNumbers.map((page, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (page !== '...') setCurrentPage(page);
                        }}
                        disabled={page === '...'}
                        className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium border transition-colors shrink-0 transform-gpu ${page === currentPage
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                            : page === '...'
                              ? 'bg-transparent text-slate-500 border-transparent cursor-default'
                              : 'bg-slate-950/20 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white cursor-pointer'
                          }`}
                      >
                        {page}
                      </button>
                    ));
                  })()}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
                >
                  &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-lg" onClick={closeModal}></div>
          <div className="relative bg-slate-950/15 border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center bg-white/[0.03]">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <FiUpload className="text-blue-400" /> Upload New Ledger
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar p-6 space-y-5">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Customer</label>

                {/* Selected Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsUserSelectOpen(!isUserSelectOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner text-left text-white text-sm font-medium"
                >
                  <span className="truncate">
                    {selectedUser
                      ? (() => {
                        const u = users.find(user => user._id === selectedUser);
                        return u ? `${u.name} (${u.email})` : 'Select a customer';
                      })()
                      : 'Select a customer'
                    }
                  </span>
                  <span className="pointer-events-none text-slate-400 text-[10px]">▼</span>
                </button>

                {/* Dropdown Menu */}
                {isUserSelectOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserSelectOpen(false)}></div>
                    <div className="absolute z-50 w-full mt-2 bg-slate-950/25 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-3 space-y-2 animate-in fade-in duration-200">
                      <div className="relative">
                        <input
                          type="text"
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          placeholder="Search customer by name or email..."
                          className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white text-xs placeholder-slate-500"
                          autoFocus
                        />
                        {userSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setUserSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                        {users.filter(user =>
                          (user.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                        ).length > 0 ? (
                          users.filter(user =>
                            (user.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                          ).map(user => (
                            <button
                              key={user._id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(user._id);
                                setIsUserSelectOpen(false);
                                setUserSearchTerm('');
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedUser === user._id
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                              <span className="font-bold">{user.name}</span>
                              <span className={`block text-[10px] ${selectedUser === user._id ? 'text-blue-100' : 'text-slate-500'}`}>{user.email}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-xs text-slate-500">No customers found</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Ledger Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., July 2026 Ledger"
                  required
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
                />
              </div>

              {/* Ledger File Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Ledger File (PDF)</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile && droppedFile.type === 'application/pdf') {
                      setFile(droppedFile);
                    } else if (droppedFile) {
                      alert('Only PDF files are supported.');
                    }
                  }}
                  onClick={() => document.getElementById('ledger-file-input').click()}
                  className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col justify-center items-center gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${isDragging
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                      : 'border-white/10 hover:border-blue-500/40 hover:bg-white/5'
                    }`}
                >
                  <input
                    id="ledger-file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-slate-900/80 hover:bg-red-600 hover:text-white rounded-lg text-slate-400 transition-colors z-30"
                        title="Clear file"
                      >
                        <FiX size={14} />
                      </button>
                      <FiFileText size={32} className="text-red-400 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs font-bold text-white text-center px-4 truncate max-w-70" title={file.name}>{file.name}</span>
                      <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB • Click or drag to change file</span>
                    </>
                  ) : (
                    <>
                      <FiUpload size={24} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                      <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Drag & drop PDF ledger here, or <span className="text-blue-400 group-hover:underline">browse</span></span>
                      <span className="text-[10px] text-slate-500">Only PDF formats are supported</span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/20 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-white/10 text-slate-300 font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSubmitting ? <FiLoader className="animate-spin mr-2" /> : <FiUpload className="mr-2" />}
                  {isSubmitting ? 'Uploading...' : 'Upload Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)}

      {/* PDF Preview Modal */}
      {previewPdfUrl && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => {
            if (!isSubmitting) {
              setPreviewPdfUrl(null);
              setIsPendingUpload(false);
            }
          }}></div>
          <div className="relative bg-slate-950/30 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <FiFileText className="text-blue-400 text-xl" />
                <h3 className="text-lg font-bold text-white">
                  {isPendingUpload ? 'Confirm Ledger PDF Before Uploading' : 'Ledger PDF Preview'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setPreviewPdfUrl(null);
                  setIsPendingUpload(false);
                }}
                disabled={isSubmitting}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex-1 flex flex-col min-h-0">
              <iframe
                src={`${previewPdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                className="w-full h-[60vh] min-h-[450px] rounded-xl bg-slate-900 border border-white/5"
                title="Ledger PDF"
              />
              <div className="mt-3 text-center sm:text-left">
                <p className="text-xs text-slate-500">
                  {isPendingUpload
                    ? 'Please review the ledger details. Click "Confirm & Upload" to save this ledger document.'
                    : 'Note: If the PDF does not display, you can download it directly using the button below.'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-slate-800/50 flex justify-end gap-3">
              {isPendingUpload ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewPdfUrl(null);
                      setIsPendingUpload(false);
                    }}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors text-sm cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndUploadLedger}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isSubmitting ? (
                      <>
                        <FiLoader className="animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <FiUpload /> Confirm & Upload
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={previewPdfUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2 cursor-pointer bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    <FiDownload /> Download PDF
                  </a>
                  <button
                    onClick={() => setPreviewPdfUrl(null)}
                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors text-sm cursor-pointer"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
