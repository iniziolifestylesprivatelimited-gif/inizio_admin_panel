import React, { useState } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiChevronDown, 
  FiChevronUp, FiSave, FiX, FiHelpCircle 
} from 'react-icons/fi';

const Faqs = () => {
  // Mock initial FAQs data
  const [faqs, setFaqs] = useState([
    {
      id: 1,
      question: 'How do I reset my password?',
      answer: 'You can reset your password by navigating to the Settings page and clicking on "Reset Password". A link will be sent to your registered email address.',
    },
    {
      id: 2,
      question: 'How can I contact technical support?',
      answer: 'You can contact our technical support team via the Help Center or by emailing support@inizio.com. Our team usually responds within 24 hours.',
    }
  ]);

  // State for adding a new FAQ
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // State for editing an existing FAQ
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  // State for tracking which FAQ is expanded (accordion)
  const [expandedId, setExpandedId] = useState(null);

  const handleAddFaq = (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newFaq = {
      id: Date.now(),
      question: newQuestion,
      answer: newAnswer,
    };
    setFaqs([...faqs, newFaq]);
    
    // Reset and close form
    setNewQuestion('');
    setNewAnswer('');
    setIsAdding(false);
  };

  const handleEditClick = (faq) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    setExpandedId(faq.id); // Keep expanded when editing
  };

  const handleSaveEdit = () => {
    if (!editQuestion.trim() || !editAnswer.trim()) return;

    setFaqs(faqs.map(faq => 
      faq.id === editingId 
        ? { ...faq, question: editQuestion, answer: editAnswer } 
        : faq
    ));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      setFaqs(faqs.filter(faq => faq.id !== id));
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
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 h-fit animate-fade-in-up">
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
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2"
                >
                  <FiSave /> Save
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewQuestion(''); setNewAnswer(''); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FAQs List Section */}
        <div className={`${isAdding ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300`}>
          <div className="space-y-4">
            {faqs.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No FAQs available. Click "Add FAQ" to get started.</p>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="border border-white/10 rounded-2xl bg-transparent hover:bg-white/10 transition-all overflow-hidden">
                  
                  {/* FAQ Header (Question) */}
                  <div 
                    className={`p-5 flex justify-between items-center cursor-pointer select-none transition-colors ${expandedId === faq.id ? 'bg-transparent border-b border-white/5' : ''}`}
                    onClick={() => toggleExpand(faq.id)}
                  >
                    {editingId === faq.id ? (
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
                    
                    {editingId !== faq.id && (
                      <div className="text-slate-400 shrink-0">
                        {expandedId === faq.id ? <FiChevronUp size={22} /> : <FiChevronDown size={22} />}
                      </div>
                    )}
                  </div>

                  {/* FAQ Body (Answer & Controls) */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${expandedId === faq.id ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    <div className="p-5 bg-black/20">
                      {editingId === faq.id ? (
                        <div className="space-y-4 animate-fade-in-up">
                          <textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            rows="3"
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
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                          <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(faq); }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
                            >
                              <FiEdit2 size={16} /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }}
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