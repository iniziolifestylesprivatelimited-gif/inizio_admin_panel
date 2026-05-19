import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  FiPlus, FiEdit2, FiTrash2, FiImage, 
  FiX, FiCheck, FiLoader, FiAlertCircle, FiLink
} from 'react-icons/fi';
import { api, BASE_URL } from '../api/axios';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    navigationType: 'NONE',
    referenceId: '',
    externalLink: '',
    position: 1,
    isActive: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Fetch Banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/banners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort by position automatically
      const sortedBanners = response.data.sort((a, b) => a.position - b.position);
      setBanners(sortedBanners);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load banners.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Open Modal for Add or Edit
  const openModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        navigationType: banner.navigationType || 'NONE',
        referenceId: banner.referenceId || '',
        externalLink: banner.externalLink || '',
        position: banner.position || 1,
        isActive: banner.isActive ?? true,
      });
      setImagePreview(getImageUrl(banner.image));
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        navigationType: 'NONE',
        referenceId: '',
        externalLink: '',
        position: banners.length + 1, // Default to next position
        isActive: true,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle Image Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file)); // Show local preview
    }
  };

  // Submit Add/Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      
      // We MUST use FormData because we are uploading a file (multipart/form-data)
      const data = new FormData();
      data.append('title', formData.title);
      data.append('navigationType', formData.navigationType);
      data.append('position', formData.position);
      
      // data.append('isActive', formData.isActive); // <-- Commented out because backend rejects it

      if (['CATEGORY', 'PRODUCT', 'BRAND'].includes(formData.navigationType)) {
        data.append('referenceId', formData.referenceId);
      }
      else if (formData.navigationType === 'EXTERNAL') {
        data.append('externalLink', formData.externalLink);
      }

      if (imageFile) {
        data.append('image', imageFile);
      }

      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
        }
      };

      if (editingBanner) {
        // UPDATE
        await axios.put(`${BASE_URL}/api/banners/${editingBanner._id}`, data, config);
      } else {
        // CREATE
        await axios.post(`${BASE_URL}/api/banners`, data, config);
      }

      await fetchBanners(); // Refresh list
      closeModal();
    } catch (err) {
      console.error("Submission failed", err.response?.data || err);
      
      // Extract the exact error message sent by the backend
      const backendError = err.response?.data?.message || err.response?.data?.error;
      const errorMessage = backendError 
        ? (Array.isArray(backendError) ? backendError.join('\n') : backendError) 
        : 'Failed to save banner. Please check all fields and try again.';
        
      alert(`Backend Error:\n${typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Banner
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${BASE_URL}/api/banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBanners(banners.filter(b => b._id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete banner.');
    }
  };

  return (
    <div className="relative space-y-6 min-h-full z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Promotional Banners</h1>
          <p className="text-slate-400 font-medium mt-1">Manage homepage carousel banners and promotions.</p>
        </div>
        
        <button 
          onClick={() => openModal()}
          className="flex items-center px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
        >
          <FiPlus className="mr-2" /> Create New Banner
        </button>
      </div>

      {loading && (
        <div className="h-64 flex flex-col justify-center items-center bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400">Loading banners...</p>
        </div>
      )}
      
      {error && (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg" /> {error}
        </div>
      )}

      {/* Grid of Banners */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner._id} className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden group flex flex-col">
              
              {/* Image Header */}
              <div className="relative h-48 bg-slate-800 flex items-center justify-center overflow-hidden border-b border-white/10">
                {banner.image ? (
                  <img 
                    src={getImageUrl(banner.image)} 
                    alt={banner.title} 
                    className="w-full h-full object-contain bg-white p-2 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <FiImage className="text-4xl text-slate-500" />
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md shadow-sm backdrop-blur-md ${banner.isActive ? 'bg-emerald-500/90 text-white' : 'bg-slate-700/80 text-white'}`}>
                    {banner.isActive ? 'ACTIVE' : 'HIDDEN'}
                  </span>
                </div>
              </div>

              {/* Banner Details */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white line-clamp-1" title={banner.title}>{banner.title}</h3>
                  <span className="bg-blue-900/30 border border-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                    Pos: {banner.position}
                  </span>
                </div>
                
                <div className="text-xs font-medium text-slate-400 flex items-center mt-1">
                  <FiLink className="mr-1.5" /> 
                  Type: <span className="ml-1 font-bold text-slate-300">{banner.navigationType}</span>
                </div>

                {/* Card Actions (Pushed to bottom) */}
                <div className="mt-auto pt-4 flex gap-2">
                  <button 
                    onClick={() => openModal(banner)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-slate-800 text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 rounded-lg transition-colors text-sm font-bold border border-white/10"
                  >
                    <FiEdit2 className="mr-1.5" /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(banner._id)}
                    className="flex-none flex items-center justify-center px-3 py-2 bg-slate-800 text-slate-400 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition-colors text-sm border border-white/10"
                    title="Delete Banner"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {banners.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white/5 backdrop-blur-2xl rounded-3xl border border-dashed border-white/20">
              <FiImage className="text-5xl text-slate-500 mb-4" />
              <p className="text-slate-400 font-medium">No banners found. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeModal}></div>
          
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh] max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-white text-lg">
                {editingBanner ? 'Edit Promotional Banner' : 'Create New Banner'}
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Banner Title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500"
                    placeholder="e.g., Summer Electronics Offer"
                  />
                </div>

                {/* Display Position */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Display Position</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white"
                  />
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Banner Status</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    />
                    <div className="relative w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ms-3 text-sm font-bold text-slate-300">
                      {formData.isActive ? 'Active & Visible' : 'Hidden'}
                    </span>
                  </label>
                </div>

                {/* Navigation Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Navigation Action</label>
                  <select 
                    value={formData.navigationType}
                    onChange={(e) => setFormData({...formData, navigationType: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md font-medium text-white"
                  >
                    <option value="NONE" className="bg-slate-800">No Action (Static Image)</option>
                    <option value="CATEGORY" className="bg-slate-800">Link to Category</option>
                    <option value="PRODUCT" className="bg-slate-800">Link to Specific Product</option>
                    <option value="EXTERNAL" className="bg-slate-800">Link to External Website</option>
                  </select>
                </div>

                {/* Dynamic Field based on Navigation Type */}
                {formData.navigationType !== 'NONE' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      {formData.navigationType === 'EXTERNAL' ? 'External URL' : 'Target ID (Ref ID)'}
                    </label>
                    <input 
                      type={formData.navigationType === 'EXTERNAL' ? 'url' : 'text'} 
                      required
                      value={formData.navigationType === 'EXTERNAL' ? formData.externalLink : formData.referenceId}
                      onChange={(e) => {
                        if (formData.navigationType === 'EXTERNAL') {
                          setFormData({...formData, externalLink: e.target.value});
                        } else {
                          setFormData({...formData, referenceId: e.target.value});
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500"
                      placeholder={formData.navigationType === 'EXTERNAL' ? "https://..." : "e.g. 69e88f139..."}
                    />
                  </div>
                )}

                {/* Image Upload Area */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Banner Image</label>
                  
                  <div className="flex items-start space-x-4">
                    {/* Preview Box */}
                    <div className="w-32 h-20 shrink-0 bg-slate-800 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-white p-1" />
                      ) : (
                        <FiImage className="text-2xl text-slate-500" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-400 hover:file:bg-blue-800/50 transition-colors"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {editingBanner ? "Leave blank to keep the existing image. Recommended size: 1920x600px." : "Required. Recommended size: 1920x600px."}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-white/10 text-slate-300 font-bold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || (!editingBanner && !imageFile)}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <FiLoader className="animate-spin mr-2" /> : <FiCheck className="mr-2" />}
                  {isSubmitting ? 'Saving...' : 'Save Banner'}
                </button>
              </div>

            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default Banners;