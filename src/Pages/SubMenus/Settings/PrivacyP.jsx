import React, { useState, useEffect } from 'react';
import { 
  FiEdit2, FiSave, FiX, FiShield, FiLoader, FiAlertCircle 
} from 'react-icons/fi';
import { api } from '../../../api/axios';

const PrivacyP = () => {
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Fetch single privacy document
  const fetchPrivacy = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await api.get('/privacy', { headers: { Authorization: `Bearer ${token}` } });
      
      // Parse privacy document directly
      const privacyDoc = Array.isArray(res.data) ? res.data[0] : res.data;
      const privacyContent = privacyDoc?.content || '';
      
      setContent(privacyContent);
      setEditContent(privacyContent);
      if (privacyDoc?.updatedAt) {
        setUpdatedAt(new Date(privacyDoc.updatedAt).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to fetch privacy policy:', err);
      setError('Failed to load Privacy Policy from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacy();
  }, []);

  const handleEditClick = () => {
    setEditContent(content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const handleSavePrivacy = async () => {
    if (!editContent.trim()) {
      alert('Privacy Policy content cannot be empty.');
      return;
    }
    
    setIsSaving(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const payload = {
        content: editContent.trim()
      };
      
      const res = await api.post('/privacy', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const savedDoc = res.data.privacy || res.data.term || res.data;
      const savedContent = savedDoc?.content || editContent.trim();
      
      setContent(savedContent);
      setEditContent(savedContent);
      if (savedDoc?.updatedAt) {
        setUpdatedAt(new Date(savedDoc.updatedAt).toLocaleString());
      } else {
        setUpdatedAt(new Date().toLocaleString());
      }
      setIsEditing(false);
      alert('Privacy Policy updated successfully.');
    } catch (err) {
      console.error('Failed to save privacy policy:', err);
      alert(err.response?.data?.message || 'Failed to update Privacy Policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderFormattedContent = (text) => {
    if (!text) return <p className="text-slate-500 italic">No privacy policy content available.</p>;
    
    const lines = text.split('\n');
    return (
      <div className="space-y-4">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2"></div>;

          // Determine if it is a heading
          const isHeading = trimmed.length < 75 && (
            /^[0-9\.]+\s*[A-Za-z]/.test(trimmed) || // e.g. "1. Acceptance of Terms"
            /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed) || // Headings like "Interpretation and Definitions"
            trimmed.startsWith('What personal data we collect') ||
            trimmed === "Disclosure of Your Personal Data" ||
            trimmed === "Business Transactions" ||
            trimmed === "Law enforcement" ||
            trimmed === "Other legal requirements" ||
            trimmed === "Security of Your Personal Data" ||
            trimmed === "Necessary / Essential Cookies" ||
            trimmed === "Cookies Policy / Notice Acceptance Cookies" ||
            trimmed === "Functionality Cookies" ||
            trimmed === "Interpretation" ||
            trimmed === "Definitions" ||
            trimmed === "Contact Us"
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
            <FiShield className="text-blue-400" />
            Privacy Policy
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            {isEditing 
              ? 'Edit the privacy policy document using the text editor below.' 
              : 'Review and manage the active customer privacy policy document.'}
          </p>
        </div>
        {!loading && !isEditing && (
          <button
            onClick={handleEditClick}
            className="flex items-center px-4 py-2.5 bg-blue-600/50 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 gap-2 cursor-pointer"
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
          <p className="text-slate-400">Loading privacy policy document...</p>
        </div>
      ) : (
        <div className="bg-transparent backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300">
          {isEditing ? (
            <div className="space-y-4 animate-fade-in-up">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Document Content</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows="24"
                disabled={isSaving}
                className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 font-mono text-sm leading-relaxed transition-all resize-y custom-scrollbar"
                placeholder="Enter Privacy Policy text..."
              ></textarea>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSavePrivacy}
                  disabled={isSaving}
                  className="bg-emerald-600/50 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
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

export default PrivacyP;