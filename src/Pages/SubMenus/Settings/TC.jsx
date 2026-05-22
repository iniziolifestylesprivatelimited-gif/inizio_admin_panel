import React, { useState } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiChevronDown, 
  FiChevronUp, FiSave, FiX, FiFileText 
} from 'react-icons/fi';

const TermsAndCo = () => {
  // Mock initial Terms & Conditions data
  const [terms, setTerms] = useState([
    {
      id: 1,
      title: '1. Acceptance of Terms',
      content: 'Terms',
    },
    {
      id: 2,
      title: '2. Modifications to Terms',
      content: 'We reserve the right to modify these terms from time to time at our sole discretion. Therefore, you should review these pages periodically. Your continued use of the Website or our service after any such change constitutes your acceptance of the new Terms.',
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

  const handleAddTerm = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newTerm = {
      id: Date.now(),
      title: newTitle,
      content: newContent,
    };
    setTerms([...terms, newTerm]);
    
    // Reset and close form
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleEditClick = (term) => {
    setEditingId(term.id);
    setEditTitle(term.title);
    setEditContent(term.content);
    setExpandedId(term.id); // Keep expanded when editing
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    setTerms(terms.map(term => 
      term.id === editingId 
        ? { ...term, title: editTitle, content: editContent } 
        : term
    ));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      setTerms(terms.filter(term => term.id !== id));
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
            <FiFileText className="text-blue-400" />
            Terms and Conditions
          </h1>
          <p className="text-slate-400 font-medium mt-1">Create, edit, and manage your terms and conditions sections.</p>
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
        
        {/* Add Term Form */}
        {isAdding && (
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 h-fit animate-fade-in-up">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FiPlus className="text-blue-400" /> Create New Section
            </h2>
            <form onSubmit={handleAddTerm} className="space-y-4">
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
                  placeholder="Enter the terms content..."
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

        {/* Terms List Section */}
        <div className={`${isAdding ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300`}>
          <div className="space-y-4">
            {terms.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No Terms and Conditions sections available. Click "Add Section" to get started.</p>
            ) : (
              terms.map((term) => (
                <div key={term.id} className="border border-white/10 rounded-2xl bg-transparent hover:bg-white/10 transition-all overflow-hidden">
                  
                  {/* Term Header (Title) */}
                  <div 
                    className={`p-5 flex justify-between items-center cursor-pointer select-none transition-colors ${expandedId === term.id ? 'bg-transparent border-b border-white/5' : ''}`}
                    onClick={() => toggleExpand(term.id)}
                  >
                    {editingId === term.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-blue-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all text-sm font-medium mr-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="font-bold text-white tracking-tight text-lg pr-4">{term.title}</h3>
                    )}
                    
                    {editingId !== term.id && (
                      <div className="text-slate-400 shrink-0">
                        {expandedId === term.id ? <FiChevronUp size={22} /> : <FiChevronDown size={22} />}
                      </div>
                    )}
                  </div>

                  {/* Term Body (Content & Controls) */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${expandedId === term.id ? 'max-h-200 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    <div className="p-5 bg-black/20">
                      {editingId === term.id ? (
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
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{term.content}</p>
                          <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(term); }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
                            >
                              <FiEdit2 size={16} /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(term.id); }}
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

export default TermsAndCo;