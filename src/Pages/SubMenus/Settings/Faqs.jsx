import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiChevronDown, 
  FiChevronUp, FiSave, FiX, FiHelpCircle, FiVideo, FiLoader 
} from 'react-icons/fi';
import { api, BASE_URL } from '../../../api/axios';

const getFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  const serverUrl = BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const Faqs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // State for adding a new FAQ
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newVideo, setNewVideo] = useState(null);

  // State for editing an existing FAQ
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editVideo, setEditVideo] = useState(null);

  // State for tracking which FAQ is expanded (accordion)
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const res = await api.get('/faqs', { headers: { Authorization: `Bearer ${token}` } });
        setFaqs(Array.isArray(res.data) ? res.data : (res.data?.faqs || []));
      } catch (err) {
        console.error('Failed to fetch FAQs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const handleAddFaq = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setIsActionLoading(true);

    const formData = new FormData();
    formData.append('question', newQuestion);
    formData.append('answer', newAnswer);
    if (newVideo) formData.append('video', newVideo);

    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await api.post('/faqs', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setFaqs([...faqs, res.data.faq || res.data]);
      
      setNewQuestion('');
      setNewAnswer('');
      setNewVideo(null);
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add FAQ');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditClick = (faq) => {
    setEditingId(faq._id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    setEditVideo(null);
    setExpandedId(faq._id); // Keep expanded when editing
  };

  const handleSaveEdit = async () => {
    if (!editQuestion.trim() || !editAnswer.trim()) return;
    setIsActionLoading(true);

    const formData = new FormData();
    formData.append('question', editQuestion);
    formData.append('answer', editAnswer);
    if (editVideo) formData.append('video', editVideo);

    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await api.put(`/faqs/${editingId}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      const updatedFaq = res.data.faq || res.data;
      setFaqs(faqs.map(faq => faq._id === editingId ? updatedFaq : faq));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update FAQ');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditVideo(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        const token = sessionStorage.getItem('accessToken');
        await api.delete(`/faqs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setFaqs(faqs.filter(faq => faq._id !== id));
        if (expandedId === id) setExpandedId(null);
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to delete FAQ');
      }
    }
  };

  const toggleExpand = (id) => {
    if (editingId === id) return; // Prevent collapse if currently editing
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiHelpCircle className="text-blue-400" />
            Frequently Asked Questions
          </h1>
          <p className="text-slate-400 font-medium mt-1">Create, edit, and manage the FAQs displayed to users.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 gap-2"
          >
            <FiPlus size={20} /> Add FAQ
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add FAQ Form */}
        {isAdding && (
          <div className="lg:col-span-1 bg-transparent backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 h-fit animate-fade-in-up">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FiPlus className="text-blue-400" /> Create New FAQ
            </h2>
            <form onSubmit={handleAddFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Question</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter the question..."
                  autoFocus
                  className="w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Answer</label>
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Enter the answer..."
                  rows="4"
                  className="w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all text-sm font-medium resize-none"
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Video (Optional)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setNewVideo(e.target.files[0])}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-400 hover:file:bg-blue-800/50 transition-colors cursor-pointer"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading ? <FiLoader className="animate-spin" /> : <FiSave />} Save
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewQuestion(''); setNewAnswer(''); setNewVideo(null); }}
                  disabled={isActionLoading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FAQs List Section */}
        <div className={`${isAdding ? 'lg:col-span-2' : 'lg:col-span-3'} bg-transparent backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300`}>
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FiLoader className="animate-spin text-4xl text-blue-400 mb-4" />
                <p className="text-slate-400 font-medium">Loading FAQs...</p>
              </div>
            ) : faqs.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No FAQs available. Click "Add FAQ" to get started.</p>
            ) : (
              faqs.map((faq) => (
                <div key={faq._id} className="border border-white/10 rounded-2xl bg-transparent hover:bg-white/10 transition-all overflow-hidden">
                  
                  {/* FAQ Header (Question) */}
                  <div 
                    className={`p-3 flex justify-between items-center cursor-pointer select-none transition-colors ${expandedId === faq._id ? 'bg-transparent border-b border-white/5' : ''}`}
                    onClick={() => toggleExpand(faq._id)}
                  >
                    {editingId === faq._id ? (
                      <input
                        type="text"
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-blue-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all text-sm font-medium mr-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="font-bold text-white tracking-tight text-lg pr-4">{faq.question}</h3>
                    )}
                    
                    {editingId !== faq._id && (
                      <div className="text-slate-400 shrink-0">
                        {expandedId === faq._id ? <FiChevronUp size={22} /> : <FiChevronDown size={22} />}
                      </div>
                    )}
                  </div>

                  {/* FAQ Body (Answer & Controls) */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${expandedId === faq._id ? 'max-h-375 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    <div className="p-5 bg-black/20">
                      {editingId === faq._id ? (
                        <div className="space-y-4 animate-fade-in-up">
                          <textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            rows="3"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-blue-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all text-sm font-medium resize-none"
                          ></textarea>
                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Video (Optional)</label>
                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => setEditVideo(e.target.files[0])}
                              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-400 hover:file:bg-blue-800/50 transition-colors cursor-pointer"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={handleSaveEdit}
                              disabled={isActionLoading}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              {isActionLoading ? <FiLoader className="animate-spin" /> : <FiSave />} Save Changes
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isActionLoading}
                              className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              <FiX /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                          {faq.video && (
                            <video controls src={getFileUrl(faq.video)} className="mt-4 w-full max-h-80 rounded-xl bg-black border border-white/10" />
                          )}
                          <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(faq); }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
                            >
                              <FiEdit2 size={16} /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(faq._id); }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
                            >
                              <FiTrash2 size={16} /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Faqs;