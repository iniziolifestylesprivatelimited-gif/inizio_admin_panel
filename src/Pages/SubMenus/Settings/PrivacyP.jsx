import React, { useState } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiChevronDown, 
  FiChevronUp, FiSave, FiX, FiShield 
} from 'react-icons/fi';

const PrivacyP = () => {
  // Mock initial Privacy Policy data
  const [policies, setPolicies] = useState([
    {
      id: 1,
      title: '1. Information We Collect',
      content: 'We collect information you provide directly to us when you register for an account, update your profile, access our content, or contact us for support. This may include your name, email address, phone number, and any other information you choose to provide.',
    },
    {
      id: 2,
      title: '2. How We Use Your Information',
      content: 'We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect our company and our users. We may also use this information to offer you tailored content, like giving you more relevant search results.',
    }
  ]);

  // State for adding a new section
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // State for editing an existing section
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // State for tracking which section is expanded (accordion)
  const [expandedId, setExpandedId] = useState(null);

  const handleAddPolicy = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPolicy = {
      id: Date.now(),
      title: newTitle,
      content: newContent,
    };
    setPolicies([...policies, newPolicy]);
    
    // Reset and close form
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleEditClick = (policy) => {
    setEditingId(policy.id);
    setEditTitle(policy.title);
    setEditContent(policy.content);
    setExpandedId(policy.id); // Keep expanded when editing
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    setPolicies(policies.map(policy => 
      policy.id === editingId 
        ? { ...policy, title: editTitle, content: editContent } 
        : policy
    ));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      setPolicies(policies.filter(policy => policy.id !== id));
      if (expandedId === id) setExpandedId(null);
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
            <FiShield className="text-blue-400" />
            Privacy Policy
          </h1>
          <p className="text-slate-400 font-medium mt-1">Create, edit, and manage sections of your Privacy Policy.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 gap-2"
          >
            <FiPlus size={20} /> Add Section
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add Policy Form */}
        {isAdding && (
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 h-fit animate-fade-in-up">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FiPlus className="text-blue-400" /> Create New Section
            </h2>
            <form onSubmit={handleAddPolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Section Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter the section title..."
                  autoFocus
                  className="w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter the policy content..."
                  rows="6"
                  className="w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all text-sm font-medium resize-none"
                ></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2"
                >
                  <FiSave /> Save
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewTitle(''); setNewContent(''); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Policy List Section */}
        <div className={`${isAdding ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300`}>
          <div className="space-y-4">
            {policies.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No Privacy Policy sections available. Click "Add Section" to get started.</p>
            ) : (
              policies.map((policy) => (
                <div key={policy.id} className="border border-white/10 rounded-2xl bg-transparent hover:bg-white/10 transition-all overflow-hidden">
                  
                  {/* Policy Header (Title) */}
                  <div 
                    className={`p-5 flex justify-between items-center cursor-pointer select-none transition-colors ${expandedId === policy.id ? 'bg-transparent border-b border-white/5' : ''}`}
                    onClick={() => toggleExpand(policy.id)}
                  >
                    {editingId === policy.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-blue-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all text-sm font-medium mr-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="font-bold text-white tracking-tight text-lg pr-4">{policy.title}</h3>
                    )}
                    
                    {editingId !== policy.id && (
                      <div className="text-slate-400 shrink-0">
                        {expandedId === policy.id ? <FiChevronUp size={22} /> : <FiChevronDown size={22} />}
                      </div>
                    )}
                  </div>

                  {/* Policy Body (Content & Controls) */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${expandedId === policy.id ? 'max-h-200 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    <div className="p-5 bg-black/20">
                      {editingId === policy.id ? (
                        <div className="space-y-4 animate-fade-in-up">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows="6"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-blue-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all text-sm font-medium resize-none"
                          ></textarea>
                          <div className="flex gap-3">
                            <button
                              onClick={handleSaveEdit}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2"
                            >
                              <FiSave /> Save Changes
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2"
                            >
                              <FiX /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{policy.content}</p>
                          <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(policy); }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
                            >
                              <FiEdit2 size={16} /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(policy.id); }}
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

export default PrivacyP;