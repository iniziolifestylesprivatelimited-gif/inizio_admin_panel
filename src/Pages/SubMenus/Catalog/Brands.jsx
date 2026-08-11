import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiTag, FiAlertCircle, FiImage, FiLoader, FiSearch, FiCopy, FiCheck } from 'react-icons/fi';

import { api, BASE_URL } from '../../../api/axios';
import { formatDateTimeDDMMYYYY } from '../../../utils/dateUtils';
import CopyButton from '../../../Components/CopyButton';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true, showOnHomeScreen: false });
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Custom Confirmation & Alert States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [typedConfirmName, setTypedConfirmName] = useState('');
  
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  // Fetch Brands
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const [brandsRes, productsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/brands/`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BASE_URL}/api/products/`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      const prodList = Array.isArray(productsRes.data) ? productsRes.data : [];
      const brandCounts = {};
      prodList.forEach(p => {
        const bId = p.brand?._id || p.brand;
        if (bId) {
          brandCounts[bId] = (brandCounts[bId] || 0) + 1;
        }
      });

      const brandsWithCounts = (Array.isArray(brandsRes.data) ? brandsRes.data : []).map(b => ({
        ...b,
        productCount: brandCounts[b._id] || 0
      }));

      setBrands(brandsWithCounts);
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description || '');
      data.append('isActive', formData.isActive);
      data.append('showOnHomeScreen', formData.showOnHomeScreen);
      if (imageFile) {
        data.append('logo', imageFile);
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingId) {
        await axios.put(`${BASE_URL}/api/brands/${editingId}`, data, config);
      } else {
        await axios.post(`${BASE_URL}/api/brands`, data, config);
      }

      await fetchBrands();
      cancelEdit();
    } catch (err) {
      console.error('Submission failed', err);
      showAlert(err.response?.data?.message || err.response?.data?.error || 'Failed to save brand.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (brand) => {
    setEditingId(brand._id);
    setFormData({ 
      name: brand.name, 
      description: brand.description || '',
      isActive: brand.isActive === true || brand.isActive === 'true',
      showOnHomeScreen: brand.showOnHomeScreen === true || brand.showOnHomeScreen === 'true'
    });
    setImagePreview(getImageUrl(brand.logo));
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      await axios.delete(`${BASE_URL}/api/brands/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBrands(brands.filter(b => b._id !== id));
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete brand.');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', isActive: true, showOnHomeScreen: false });
    setImagePreview(null);
    setImageFile(null);
  };

  // Filter brands based on search term
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBrands = filteredBrands.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage);

  console.log(brands)

  return (
    <div className="relative space-y-6 min-h-full z-0">


      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiTag className='text-blue-400' /> Brand Management.</h1>
          <p className="text-slate-400 font-medium mt-1">Add, edit, and organize product brands across your catalog.</p>
        </div>
        <div className="relative w-full sm:w-72 mt-4 sm:mt-0">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
          <input 
            type="text" 
            placeholder="Search brands..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md transition-all text-sm font-medium placeholder-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Add / Edit Form */}
        <div className="lg:col-span-1">
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-900/50 text-blue-400 flex items-center justify-center text-lg">
                {editingId ? <FiEdit2 /> : <FiTag />}
              </div>
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edit Brand' : 'Add New Brand'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Brand Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sony, Samsung"
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md transition-all text-sm font-medium placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Description</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Smart accessories brand"
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md transition-all text-sm font-medium placeholder-slate-500"
                />
              </div>

              {/* Brand Logo Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Brand Logo</label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  onClick={() => document.getElementById('brand-logo-input').click()}
                  className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col justify-center items-center gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' 
                      : 'border-white/10 hover:border-blue-500/40 hover:bg-white/5'
                  }`}
                >
                  <input 
                    id="brand-logo-input"
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
                      <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Drag & drop logo here, or <span className="text-blue-400 group-hover:underline">browse</span></span>
                      <span className="text-[10px] text-slate-500">Supports JPG, PNG, WEBP</span>
                    </>
                  )}
                </div>
              </div>

            {/* Placement Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">Home Screen</label>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.showOnHomeScreen}
                    onChange={(e) => setFormData({...formData, showOnHomeScreen: e.target.checked})}
                  />
                  <div className="relative w-9 h-5 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  <span className="ms-2 text-xs font-bold text-slate-300">
                    {formData.showOnHomeScreen ? 'Show' : 'Hide'}
                  </span>
                </label>
              </div>

              {editingId ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">Status</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    />
                    <div className="relative w-9 h-5 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ms-2 text-xs font-bold text-slate-300">
                      {formData.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </label>
                </div>
              ) : (
                <div></div>
              )}
            </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-600/70 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <FiLoader className="mr-2 animate-spin" /> : (editingId ? <FiSave className="mr-2" /> : <FiPlus className="mr-2" />)}
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Brand' : 'Add Brand')}
                </button>
                
                {editingId && (
                  <button 
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center justify-center px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors"
                    title="Cancel Edit"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Brands List Table */}
        <div className="lg:col-span-2">
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full">
            <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-full">
                <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-md">
                  <tr>
                    <th className="px-3 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider w-16">S.No.</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Brand Name</th>
                    <th className="px-3 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider text-center">Date Info</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">
                        <FiLoader className="animate-spin text-3xl mx-auto mb-3 text-blue-400" />
                        Loading brands...
                      </td>
                    </tr>
                  ) : currentBrands.length > 0 ? (
                    currentBrands.map((brand, index) => (
                      <tr key={brand._id} className="hover:bg-transparent transition-colors group">
                        <td className="px-3 py-4 text-sm font-medium text-slate-300 text-center">{indexOfFirstItem + index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {brand.logo ? (
                            <img src={getImageUrl(brand.logo)} alt={brand.name} className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-white/10 mr-3 shrink-0" />
                            ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center mr-3 text-slate-400 shrink-0">
                                <FiTag />
                              </div>
                            )}
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{brand.name}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-slate-600 font-bold font-mono">{brand._id}</span>
                              <CopyButton text={brand._id} />
                            </div>
                            {brand.description && (
                              <span className="text-slate-400 text-xs mt-0.5 line-clamp-1 max-w-[200px]" title={brand.description}>{brand.description}</span>
                            )}
                            <div className="flex gap-2 mt-1">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${brand.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {brand.isActive !== false ? 'ACTIVE' : 'HIDDEN'}
                              </span>
                              {(brand.showOnHomeScreen === true || brand.showOnHomeScreen === 'true') && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                  HOME SCREEN
                                </span>
                              )}
                            </div>
                          </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">
                          {brand.productCount || 0}
                        </td>
                        <td className="px-6 py-4 text-[11px] text-slate-400 font-medium leading-relaxed">
                          <div className="flex flex-col gap-0.5">
                            <div><span className="text-[9px] text-slate-500 font-bold uppercase mr-1">Created:</span>{formatDateTimeDDMMYYYY(brand.createdAt)}</div>
                            <div><span className="text-[9px] text-slate-500 font-bold uppercase mr-1">Updated:</span>{formatDateTimeDDMMYYYY(brand.updatedAt)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right space-x-2">
                          <button onClick={() => handleEdit(brand)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Edit Brand">
                            <FiEdit2 />
                          </button>
                          <button onClick={() => { setBrandToDelete(brand); setDeleteConfirmOpen(true); }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer" title="Delete Brand">
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">
                        {searchTerm ? 'No brands matching your search.' : 'No brands found. Create your first brand using the form.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && filteredBrands.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center px-6 py-4 border-t border-white/10 bg-slate-800/50">
                <span className="text-sm text-slate-400">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBrands.length)} of {filteredBrands.length} entries
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1 mx-1 sm:mx-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
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
                            if (page !== '...') {
                              setCurrentPage(page);
                            }
                          }}
                          disabled={page === '...'}
                          className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                            page === currentPage
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                              : page === '...'
                              ? 'bg-transparent text-slate-500 border-transparent cursor-default'
                              : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700 cursor-pointer'
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
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && brandToDelete && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => { setDeleteConfirmOpen(false); setBrandToDelete(null); setTypedConfirmName(''); }}></div>
          <div className="relative bg-slate-900 border border-red-500/20 rounded-2xl p-6 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-red-500 animate-pulse" /> Confirm Deletion
            </h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              This action cannot be undone. To permanently delete the brand <strong className="text-white">"{brandToDelete.name}"</strong>, please type its name below to proceed:
            </p>
            <input
              type="text"
              placeholder="Type brand name to confirm"
              value={typedConfirmName}
              onChange={(e) => setTypedConfirmName(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-medium mb-5"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setBrandToDelete(null); setTypedConfirmName(''); }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={typedConfirmName !== brandToDelete.name}
                onClick={() => {
                  handleDelete(brandToDelete._id);
                  setDeleteConfirmOpen(false);
                  setBrandToDelete(null);
                  setTypedConfirmName('');
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-red-600/10"
              >
                Proceed Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Alert Modal */}
      {alertOpen && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setAlertOpen(false)}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiInfo className="text-blue-400" /> Alert
            </h3>
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              {alertMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertOpen(false)}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-blue-600/10"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Brands;
