import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { api, BASE_URL } from '../api/axios';
import { 
  FiUpload, FiTrash2, FiFileText, FiLoader, 
  FiAlertCircle, FiX, FiDownloadCloud 
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
  const [ledgers, setLedgers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal and Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !title || !file) {
      alert('Please select a user, provide a title, and choose a file.');
      return;
    }
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
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.response?.data?.message || 'Failed to upload ledger.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this ledger?')) return;
    
    try {
      const token = sessionStorage.getItem('accessToken');
      await api.delete(`/ledger/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLedgers(ledgers.filter(l => l._id !== id));
      alert('Ledger deleted successfully.');
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.message || 'Failed to delete ledger.');
    }
  };

  const getUserName = (userField) => {
    if (!userField) return 'Unknown User';
    if (typeof userField === 'object' && userField.name) return userField.name;
    const user = users.find(u => u._id === userField);
    return user ? user.name : 'Unknown User';
  };

  console.log(ledgers)
  return (
    <div className="relative space-y-4 min-h-full z-0 isolate w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiFileText className="text-blue-400" />
            Ledgers
          </h1>
          <p className="text-slate-400 font-medium mt-1">Manage customer ledgers.</p>
        </div>
        <button 
          onClick={openModal}
          className="flex items-center px-4 py-2.5 bg-blue-600/50 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/5"
        >
          <FiUpload className="mr-2" /> Upload Ledger
        </button>
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
        <div className="relative z-10 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full">
          <div className="overflow-auto custom-scrollbar max-h-[59vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-150">
              <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-5 font-bold">S.No</th>
                  <th className="p-5 font-bold">Title</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Uploaded Date</th>
                  <th className="p-5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ledgers.length > 0 ? (
                  ledgers.map((ledger, index) => (
                    <tr key={ledger._id} className="hover:bg-transparent transition-colors">
                      <td className="p-5 text-sm text-slate-400 font-medium">{index + 1}</td>
                      <td className="p-5 text-sm text-white font-medium">{ledger.title}</td>
                      <td className="p-5 text-sm text-slate-300">{getUserName(ledger.user)}</td>
                      <td className="p-5 text-sm text-slate-300">
                        {formatDateDDMMYYYY(ledger.createdAt)}
                      </td>
                      <td className="p-5 flex items-center justify-center gap-2">
                        <a 
                          href={getFileUrl(ledger.fileUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2.5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all cursor-pointer" 
                          title="View Ledger"
                        >
                          <FiDownloadCloud />
                        </a>
                        <button 
                          onClick={() => handleDelete(ledger._id)} 
                          className="p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer" 
                          title="Delete Ledger"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                      No ledgers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
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
                    <div className="absolute z-50 w-full mt-2 bg-slate-950 border border-white/10 rounded-xl shadow-2xl p-3 space-y-2 animate-in fade-in duration-200">
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
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                selectedUser === user._id 
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
                  className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col justify-center items-center gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${
                    isDragging 
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

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3">
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
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <FiLoader className="animate-spin mr-2" /> : <FiUpload className="mr-2" />}
                  {isSubmitting ? 'Uploading...' : 'Upload Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
