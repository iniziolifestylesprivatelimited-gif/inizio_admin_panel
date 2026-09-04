import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiAlertCircle, FiTag, FiImage, FiLoader, FiSearch, FiGrid, FiCopy, FiCheck, FiInfo } from 'react-icons/fi';

import { api, BASE_URL } from '../../../api/axios';
import { formatDateTimeDDMMYYYY } from '../../../utils/dateUtils';
import CopyButton from '../../../Components/CopyButton';
import { getImageUrl } from '../../../utils/imageUtils';
import OptimizedImage from '../../../Components/OptimizedImage';

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [formData, setFormData] = useState({ name: '', isActive: true, showOnHomeScreen: false });
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Custom Confirmation & Alert States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [typedConfirmName, setTypedConfirmName] = useState('');

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const [categoriesRes, productsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BASE_URL}/api/products/`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      const prodList = Array.isArray(productsRes.data) ? productsRes.data : [];
      const categoryCounts = {};
      const categoryVariantCounts = {};
      prodList.forEach(p => {
        const cId = p.category?._id || p.category;
        if (cId) {
          categoryCounts[cId] = (categoryCounts[cId] || 0) + 1;
          const varCount = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants.length : 1;
          categoryVariantCounts[cId] = (categoryVariantCounts[cId] || 0) + varCount;
        }
      });

      const categoriesWithCounts = (Array.isArray(categoriesRes.data) ? categoriesRes.data : []).map(c => ({
        ...c,
        productCount: categoryCounts[c._id] || 0,
        variantCount: categoryVariantCounts[c._id] || 0
      }));

      setCategories(categoriesWithCounts);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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
      data.append('isActive', formData.isActive);
      data.append('showOnHomeScreen', formData.showOnHomeScreen);
      if (imageFile) {
        data.append('image', imageFile);
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingId) {
        await axios.put(`${BASE_URL}/api/categories/${editingId}`, data, config);
      } else {
        await axios.post(`${BASE_URL}/api/categories`, data, config);
      }

      await fetchCategories();
      cancelEdit();
    } catch (err) {
      console.error('Submission failed', err);
      showAlert(err.response?.data?.message || err.response?.data?.error || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setFormData({
      name: category.name,
      isActive: category.isActive === true || category.isActive === 'true',
      showOnHomeScreen: category.showOnHomeScreen === true || category.showOnHomeScreen === 'true'
    });
    setImagePreview(getImageUrl(category.image));
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      await axios.delete(`${BASE_URL}/api/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(categories.filter(c => c._id !== id));
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete category.');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', isActive: true, showOnHomeScreen: false });
    setImagePreview(null);
    setImageFile(null);
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCategories = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  return (
    <div className="relative space-y-6 min-h-full z-0">


      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiGrid className='text-blue-400' /> Category Management</h1>
          <p className="text-slate-400 font-medium mt-1">Add, edit, and organize product categories across your catalog.</p>
        </div>
        <div className="relative w-full sm:w-72 mt-4 sm:mt-0">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            placeholder="Search categories..."
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Column: Add / Edit Form */}
        <div className="lg:col-span-1">
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 flex flex-col justify-between lg:h-[580px]">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-900/50 text-blue-400 flex items-center justify-center text-lg">
                {editingId ? <FiEdit2 /> : <FiTag />}
              </div>
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edit Category' : 'Add New Category'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Electronics, Clothing"
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md transition-all text-sm font-medium placeholder-slate-500"
                  />
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
                        onChange={(e) => setFormData({ ...formData, showOnHomeScreen: e.target.checked })}
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
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-600/70 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? <FiLoader className="mr-2 animate-spin" /> : (editingId ? <FiSave className="mr-2" /> : <FiPlus className="mr-2" />)}
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Category' : 'Add Category')}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center justify-center px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Cancel Edit"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Categories List Table */}
        <div className="lg:col-span-2">
          <div className="border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full lg:h-[580px]">
            <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-full">
                <thead className="sticky top-0 z-20 bg-white/[0.03] backdrop-blur-md border-b border-white/10 shadow-md">
                  <tr>
                    <th className="px-3 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider w-16">S.No.</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Category Name</th>
                    <th className="px-3 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider text-center">Products<br></br><span className='text-[10px]'>(varaints)</span></th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider text-center">Date Info</th>
                    <th className="px-3 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">
                        <FiLoader className="animate-spin text-3xl mx-auto mb-3 text-blue-400" />
                        Loading categories...
                      </td>
                    </tr>
                  ) : currentCategories.length > 0 ? (
                    currentCategories.map((category, index) => (
                      <tr key={category._id} className="hover:bg-transparent transition-colors group">
                        <td className="px-3 py-4 text-sm text-center font-medium text-slate-300">{indexOfFirstItem + index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {category.image ? (
                              <OptimizedImage src={category.image} alt={category.name} width={80} quality={65} className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-white/10 mr-3 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center mr-3 text-slate-400 shrink-0">
                                <FiTag />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{category.name}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-slate-600 font-bold font-mono">{category._id}</span>
                                <CopyButton text={category._id} />
                              </div>
                              <div className="flex gap-2 mt-1">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${category.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/10'}`}>
                                  {category.isActive !== false ? 'ACTIVE' : 'HIDDEN'}
                                </span>
                                {(category.showOnHomeScreen === true || category.showOnHomeScreen === 'true') && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                    HOME SCREEN
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <span className="font-bold text-white" title="Products count">{category.productCount || 0}</span>
                            <span className="text-xs text-slate-400 font-normal" title="Count including variants">
                              ({category.variantCount || 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[11px] text-slate-400 font-medium leading-relaxed">
                          <div className="flex flex-col gap-0.5">
                            <div><span className="text-[9px] text-slate-500 font-bold uppercase mr-1">Created:</span>{formatDateTimeDDMMYYYY(category.createdAt)}</div>
                            <div><span className="text-[9px] text-slate-500 font-bold uppercase mr-1">Updated:</span>{formatDateTimeDDMMYYYY(category.updatedAt)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right space-x-2">
                          <button onClick={() => handleEdit(category)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Edit Category">
                            <FiEdit2 />
                          </button>
                          <button onClick={() => { setCategoryToDelete(category); setDeleteConfirmOpen(true); }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer" title="Delete Category">
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">
                        {searchTerm ? 'No categories matching your search.' : 'No categories found. Create your first category using the form.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredCategories.length > 0 && (
              <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02] backdrop-blur-md">
                <span className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                  Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, filteredCategories.length)}</span> of <span className="font-bold text-white">{filteredCategories.length}</span> categories
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
                  >
                    &larr;
                  </button>
                  <div className="flex gap-1 mx-1 sm:mx-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 items-center">
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
                          className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium border transition-colors shrink-0 transform-gpu ${page === currentPage
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                            : page === '...'
                              ? 'bg-transparent text-slate-500 border-transparent cursor-default'
                              : 'bg-slate-950/20 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white cursor-pointer'
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
                    className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
                  >
                    &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && categoryToDelete && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md animate-fade-in" onClick={() => { setDeleteConfirmOpen(false); setCategoryToDelete(null); setTypedConfirmName(''); }}></div>
          <div className="relative bg-slate-950/25 border border-red-500/20 rounded-2xl p-6 shadow-red-500/20 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-red-500 animate-pulse" /> Confirm Deletion
            </h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              This action cannot be undone. To permanently delete the category <strong className="text-white">"{categoryToDelete.name}"</strong>, please type its name below to proceed:
            </p>
            <input
              type="text"
              placeholder="Type category name to confirm"
              value={typedConfirmName}
              onChange={(e) => setTypedConfirmName(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-medium mb-5"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setCategoryToDelete(null); setTypedConfirmName(''); }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={typedConfirmName !== categoryToDelete.name}
                onClick={() => {
                  handleDelete(categoryToDelete._id);
                  setDeleteConfirmOpen(false);
                  setCategoryToDelete(null);
                  setTypedConfirmName('');
                }}
                className="flex-1 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
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
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md animate-fade-in" onClick={() => setAlertOpen(false)}></div>
          <div className="relative bg-slate-950/25 border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiInfo className="text-blue-400" /> Alert
            </h3>
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              {alertMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertOpen(false)}
              className="w-full px-4 py-2.5 text-white font-bold rounded-xl transition-colors text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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

export default Category;
