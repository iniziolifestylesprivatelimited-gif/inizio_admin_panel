import React, { useState, useEffect } from 'react';
import { 
  FiEdit2, FiSave, FiX, FiFileText, FiLoader, FiAlertCircle 
} from 'react-icons/fi';
import { api } from '../../../api/axios';

const TermsAndCo = () => {
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Fetch single terms document
  const fetchTerms = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await api.get('/terms', { headers: { Authorization: `Bearer ${token}` } });
      
      // Parse terms document directly (safeguarding single object vs array wrapper formats)
      const termsDoc = Array.isArray(res.data) ? res.data[0] : res.data;
      const termsContent = termsDoc?.content || '';
      
      setContent(termsContent);
      setEditContent(termsContent);
      if (termsDoc?.updatedAt) {
        setUpdatedAt(new Date(termsDoc.updatedAt).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to fetch terms:', err);
      setError('Failed to load terms & conditions from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleEditClick = () => {
    setEditContent(content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const handleSaveTerms = async () => {
    if (!editContent.trim()) {
      alert('Terms and conditions content cannot be empty.');
      return;
    }
    
    setIsSaving(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const payload = {
        content: editContent.trim()
      };
      
      const res = await api.post('/terms', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const savedDoc = res.data.term || res.data;
      const savedContent = savedDoc?.content || editContent.trim();
      
      setContent(savedContent);
      setEditContent(savedContent);
      if (savedDoc?.updatedAt) {
        setUpdatedAt(new Date(savedDoc.updatedAt).toLocaleString());
      } else {
        setUpdatedAt(new Date().toLocaleString());
      }
      setIsEditing(false);
      alert('Terms and Conditions updated successfully.');
    } catch (err) {
      console.error('Failed to save terms:', err);
      alert(err.response?.data?.message || 'Failed to update Terms and Conditions.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderFormattedContent = (text) => {
    if (!text) return <p className="text-slate-500 italic">No terms and conditions content available.</p>;
    
    const lines = text.split('\n');
    return (
      <div className="space-y-4">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2"></div>;

          // Determine if it is a heading
          const isHeading = trimmed.length < 60 && (
            /^[0-9\.]+\s+[A-Z]/.test(trimmed) || // e.g. "1. Acceptance of Terms"
            /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed) || // e.g. "Interpretation and Definitions"
            trimmed === "“AS IS” and “AS AVAILABLE” Disclaimer" ||
            trimmed === "United States Legal Compliance" ||
            trimmed.toLowerCase() === "interpretation" ||
            trimmed.toLowerCase() === "definitions" ||
            trimmed.toLowerCase() === "acknowledgment" ||
            trimmed.toLowerCase() === "links to other websites" ||
            trimmed.toLowerCase() === "termination" ||
            trimmed.toLowerCase() === "limitation of liability" ||
            trimmed.toLowerCase() === "governing law" ||
            trimmed.toLowerCase() === "disputes resolution" ||
            trimmed.toLowerCase() === "for european union (eu) users" ||
            trimmed.toLowerCase() === "severability and waiver" ||
            trimmed.toLowerCase() === "severability" ||
            trimmed.toLowerCase() === "waiver" ||
            trimmed.toLowerCase() === "translation interpretation" ||
            trimmed.toLowerCase() === "changes to these terms and conditions" ||
            trimmed.toLowerCase() === "contact us"
          );

          if (isHeading) {
            return (
              <h3 key={idx} className="text-lg font-bold text-white tracking-tight pt-3 border-b border-white/5 pb-1">
                {trimmed}
              </h3>
            );
          }

          return (
            <p key={idx} className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiFileText className="text-blue-400" />
            Terms and Conditions
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            {isEditing 
              ? 'Edit the terms and conditions document using the text editor below.' 
              : 'Review and manage the active customer terms and conditions document.'}
          </p>
        </div>
        {!loading && !isEditing && (
          <button
            onClick={handleEditClick}
            className="flex items-center px-4 py-2.5 text-white font-bold rounded-xl transition-all gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <FiEdit2 size={18} /> Edit Document
          </button>
        )}
      </div>

      {error && (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center mb-6">
          <FiAlertCircle className="mr-2 text-lg shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400">Loading terms document...</p>
        </div>
      ) : (
        <div className="bg-tranparent backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300">
          {isEditing ? (
            <div className="space-y-4 animate-fade-in-up">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Document Content</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows="24"
                disabled={isSaving}
                className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 font-mono text-sm leading-relaxed transition-all resize-y custom-scrollbar"
                placeholder="Enter Terms and Conditions text..."
              ></textarea>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveTerms}
                  disabled={isSaving}
                  className="text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                >
                  {isSaving ? <FiLoader className="animate-spin" /> : <FiSave />} Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {updatedAt && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Last Updated: <span className="font-semibold text-slate-300">{updatedAt}</span>
                </div>
              )}
              <div className="p-4 sm:p-6 bg-black/25 rounded-2xl border border-white/5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {renderFormattedContent(content)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TermsAndCo;