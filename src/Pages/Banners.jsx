import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  FiPlus, FiEdit2, FiTrash2, FiImage,
  FiX, FiCheck, FiLoader, FiAlertCircle, FiLink
} from 'react-icons/fi';
import { api, BASE_URL } from '../api/axios';
import { useConfirm } from '../Context/ConfirmationContext';
import CustomDropdown from '../Components/CustomDropdown';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const Banners = () => {
  const { confirm, showAlert } = useConfirm();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    clickAction: 'none',
    actionId: '',
    position: '',
    isActive: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageDetails, setImageDetails] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch Banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/banners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort by position automatically (handle both numeric and string values)
      const sortedBanners = response.data.sort((a, b) => {
        if (typeof a.position === 'number' && typeof b.position === 'number') {
          return a.position - b.position;
        }
        return String(a.position || '').localeCompare(String(b.position || ''));
      });
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

    // Fetch products, categories, and brands for selection
    const fetchSelectionData = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        const [prodRes, catRes, brandRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/products/`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE_URL}/api/categories/`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE_URL}/api/brands/`, { headers }).catch(() => ({ data: [] }))
        ]);

        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        setBrands(Array.isArray(brandRes.data) ? brandRes.data : []);
      } catch (err) {
        console.error("Failed to load selection data for banners", err);
      }
    };

    fetchSelectionData();
  }, []);

  const calculateImageDimensions = (url) => {
    if (!url) {
      setImageDetails(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(width, height);
      const ratio = `${width / divisor}:${height / divisor}`;
      const decimalRatio = (width / height).toFixed(2);
      setImageDetails({
        width,
        height,
        ratio,
        decimalRatio
      });
    };
    img.onerror = () => {
      setImageDetails(null);
    };
    img.src = url;
  };

  // Open Modal for Add or Edit
  const openModal = (banner = null) => {
    setIsDropdownOpen(false);
    setSearchTerm('');
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        clickAction: banner.clickAction || 'none',
        actionId: banner.actionId || '',
        position: banner.position || "",
        isActive: banner.isActive ?? true,
      });
      const url = getImageUrl(banner.image);
      setImagePreview(url);
      calculateImageDimensions(url);
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        clickAction: 'none',
        actionId: '',
        position: "", // Default to next position
        isActive: true,
      });
      setImagePreview(null);
      setImageDetails(null);
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
    setImageFile(null);
    setImagePreview(null);
    setImageDetails(null);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Handle Image Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url); // Show local preview
      calculateImageDimensions(url);
    }
  };

  // Submit Add/Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('accessToken');

      // We MUST use FormData because we are uploading a file (multipart/form-data)
      const data = new FormData();
      data.append('title', formData.title);
      data.append('clickAction', formData.clickAction);
      data.append('position', formData.position);
      data.append('isActive', formData.isActive);

      if (formData.clickAction !== 'none') {
        data.append('actionId', formData.actionId);
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
    const isConfirmed = await confirm('Are you sure you want to delete this banner?');
    if (!isConfirmed) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      await axios.delete(`${BASE_URL}/api/banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBanners(banners.filter(b => b._id !== id));
      showAlert('Banner deleted successfully.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete banner.', 'error');
    }
  };

  // Helper to look up names for products/categories/brands
  const getActionTargetName = (clickAction, actionId) => {
    if (!actionId) return '';
    if (clickAction === 'product') {
      const p = products.find(prod => prod._id === actionId);
      return p ? p.name : actionId;
    }
    if (clickAction === 'category') {
      const c = categories.find(cat => cat._id === actionId);
      return c ? c.name : actionId;
    }
    if (clickAction === 'brand') {
      const b = brands.find(br => br._id === actionId);
      return b ? b.name : actionId;
    }
    return actionId;
  };

  return (
    <div className="relative space-y-4 min-h-full z-0">


      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiImage className="text-blue-400" />Banners</h1>
          <p className="text-slate-400 font-medium mt-1">Manage homepage carousel banners and promotions.</p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2.5 text-white font-bold rounded-xl transition-colors bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <FiPlus className="mr-2" /> Create New Banner
        </button>
      </div>

      {loading && (
        <div className="h-64 flex flex-col justify-center items-center bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl">
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
        <div className="flex flex-wrap gap-6">
          {banners.map((banner) => (
            <div key={banner._id} className="bg-linear-to-br from-transparent to-blue-950/65 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-xl overflow-hidden group flex flex-col">

              {/* Image Header */}
              <div className="relative h-48 bg-slate-800 flex items-center justify-center overflow-hidden border-b border-white/10">
                {banner.image ? (
                  <img
                    src={getImageUrl(banner.image)}
                    alt={banner.title}
                    className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-500"
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
                  Action: <span className="ml-1 font-bold uppercase text-slate-300">{banner.clickAction}</span>
                </div>

                {banner.actionId && (
                  <div className="text-xs font-medium text-slate-400 flex items-center mt-1">
                    <span className="mr-1.5 font-bold">Target:</span>
                    <span className="text-slate-300 truncate" title={banner.actionId}>
                      {getActionTargetName(banner.clickAction, banner.actionId)}
                    </span>
                  </div>
                )}

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
            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-transparent backdrop-blur-2xl rounded-3xl border border-dashed border-white/20">
              <FiImage className="text-5xl text-slate-500 mb-4" />
              <p className="text-slate-400 font-medium">No banners found. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-lg" onClick={closeModal}></div>

          <div className="relative bg-slate-950/25 border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col h-auto animate-in fade-in zoom-in-95 duration-200">

            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center bg-white/[0.03]">
              <h3 className="font-bold text-white text-lg">
                {editingBanner ? 'Edit Promotional Banner' : 'Create New Banner'}
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Column: Form Controls */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Banner Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500"
                      placeholder="e.g., Summer Electronics Offer"
                    />
                  </div>

                  {/* Position & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Display Position</label>
                      <input
                        type="text"
                        required
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white scheme-dark"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Banner Status</label>
                      <label className="inline-flex items-center cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <div className="relative w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span className="ms-3 text-sm font-bold text-slate-300">
                          {formData.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Click Action */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Click Action</label>
                    <CustomDropdown
                      value={formData.clickAction}
                      onChange={(val) => {
                        setFormData({
                          ...formData,
                          clickAction: val,
                          actionId: ''
                        });
                        setIsDropdownOpen(false);
                        setSearchTerm('');
                      }}
                      options={[
                        { value: 'none', label: 'No Action (Static Image)' },
                        { value: 'category', label: 'Link to Category' },
                        { value: 'product', label: 'Link to Specific Product' },
                        { value: 'brand', label: 'Link to Brand' },
                        { value: 'external', label: 'Link to External Website' }
                      ]}
                      statusColor="bg-black/20 border-white/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md"
                    />
                  </div>

                  {/* Dynamic Target Selection */}
                  {formData.clickAction !== 'none' && (
                    <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/15 animate-in slide-in-from-bottom-2">
                      {formData.clickAction === 'external' && (
                        <>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">External URL</label>
                          <input
                            type="url"
                            required
                            value={formData.actionId}
                            onChange={(e) => setFormData({ ...formData, actionId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500"
                            placeholder="https://..."
                          />
                        </>
                      )}

                      {formData.clickAction === 'category' && (
                        <>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Select Category</label>
                          <select
                            value={formData.actionId}
                            onChange={(e) => setFormData({ ...formData, actionId: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white font-medium"
                          >
                            <option value="" className="bg-slate-800">-- Select Category --</option>
                            {categories.map(cat => (
                              <option key={cat._id} value={cat._id} className="bg-slate-800">{cat.name}</option>
                            ))}
                          </select>
                        </>
                      )}

                      {formData.clickAction === 'brand' && (
                        <>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Select Brand</label>
                          <select
                            value={formData.actionId}
                            onChange={(e) => setFormData({ ...formData, actionId: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white font-medium"
                          >
                            <option value="" className="bg-slate-800">-- Select Brand --</option>
                            {brands.map(brand => (
                              <option key={brand._id} value={brand._id} className="bg-slate-800">{brand.name}</option>
                            ))}
                          </select>
                        </>
                      )}

                      {formData.clickAction === 'product' && (
                        <div className="relative">
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Select Product</label>

                          <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 cursor-pointer flex justify-between items-center shadow-inner backdrop-blur-md text-white"
                          >
                            <span className={formData.actionId ? "text-white font-medium truncate" : "text-slate-500"}>
                              {formData.actionId
                                ? (products.find(p => p._id === formData.actionId)?.name || 'Select a Product')
                                : 'Select a Product'}
                            </span>
                            <span className="text-slate-400 text-xs">▼</span>
                          </div>

                          {isDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-60">
                              <div className="p-2 border-b border-white/10 bg-slate-800/50">
                                <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  placeholder="Type to search product..."
                                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </div>

                              <div className="overflow-y-auto max-h-48 custom-scrollbar">
                                {products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                  products
                                    .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(prod => (
                                      <div
                                        key={prod._id}
                                        onClick={() => {
                                          setFormData({ ...formData, actionId: prod._id });
                                          setIsDropdownOpen(false);
                                          setSearchTerm('');
                                        }}
                                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-600/30 hover:text-white transition-colors ${formData.actionId === prod._id ? 'bg-blue-600/50 text-white font-semibold' : 'text-slate-300'}`}
                                      >
                                        {prod.name}
                                      </div>
                                    ))
                                ) : (
                                  <div className="px-4 py-3 text-xs text-slate-500 text-center">No products found</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Image Upload Area */}
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Banner Image</label>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)} onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) {
                        setImageFile(file);
                        const url = URL.createObjectURL(file);
                        setImagePreview(url);
                        calculateImageDimensions(url);
                      }
                    }}
                    onClick={() => document.getElementById('banner-image-input').click()}
                    className={`w-full h-56 border-2 border-dashed rounded-2xl flex flex-col justify-center items-center gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${isDragging
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                      : 'border-white/10 hover:border-blue-500/40 hover:bg-white/5'
                      }`}
                  >
                    <input
                      id="banner-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageFile(null);
                            setImagePreview(null);
                            setImageDetails(null);
                          }}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-slate-900/80 hover:bg-red-600 hover:text-white rounded-lg text-slate-400 transition-colors z-30"
                          title="Clear file"
                        >
                          <FiX size={14} />
                        </button>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-white p-2 transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center items-center text-xs font-bold text-white gap-2">
                          <FiImage size={18} className="text-blue-400" />
                          <span>Click or drag to replace image</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <FiImage size={24} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                        <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors text-center px-4">Drag & drop banner image here, or <span className="text-blue-400 group-hover:underline">browse</span></span>
                        <span className="text-[10px] text-slate-500">Supports JPG, PNG, WEBP</span>
                      </>
                    )}
                  </div>

                  {imageDetails && (
                    <div className="mt-2.5 flex flex-col gap-1.5 text-[10px] text-slate-400 bg-black/35 px-4 py-2.5 rounded-xl border border-white/5 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span>Dimensions:</span>
                        <strong className="text-slate-200">{imageDetails.width} × {imageDetails.height} px</strong>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
                        <span>Aspect Ratio:</span>
                        <div>
                          <strong className="text-blue-400">{imageDetails.ratio}</strong>
                          <span className="opacity-60 ml-1">({imageDetails.decimalRatio})</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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