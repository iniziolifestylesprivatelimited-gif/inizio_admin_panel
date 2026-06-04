import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiTag, FiImage, FiLoader, FiSearch } from 'react-icons/fi';

import { api, BASE_URL } from '../../../api/axios';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
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
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setFormData({ name: category.name, isActive: category.isActive !== false });
    setImagePreview(getImageUrl(category.image));
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const token = sessionStorage.getItem('accessToken');
        await axios.delete(`${BASE_URL}/api/categories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(categories.filter(c => c._id !== id));
      } catch (err) {
        console.error(err);
        alert('Failed to delete category.');
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', isActive: true });
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
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      {/* <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div> */}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Categories</h1>
          <p className="text-slate-400 font-medium mt-1">Add, edit, and organize product categories across your catalog.</p>
        </div>
        <div className="relative w-full sm:w-72 mt-4 sm:mt-0">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md transition-all text-sm font-medium placeholder-slate-400"
          />
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
                {editingId ? 'Edit Category' : 'Add New Category'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              {/* Category Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category Image</label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 shrink-0 bg-slate-800 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-white p-1" />
                    ) : (
                      <FiImage className="text-xl text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-400 hover:file:bg-blue-800/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

            {/* Category Status Toggle (Visible when editing) */}
            {editingId && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category Status</label>
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
            )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-600/70 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <FiLoader className="mr-2 animate-spin" /> : (editingId ? <FiSave className="mr-2" /> : <FiPlus className="mr-2" />)}
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Category' : 'Add Category')}
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

        {/* Right Column: Categories List Table */}
        <div className="lg:col-span-2">
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-125">
                <thead className="bg-slate-800/50 border-b border-white/10 border-collapse">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider w-16">S.No.</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Category Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-400 font-medium">
                        <FiLoader className="animate-spin text-3xl mx-auto mb-3 text-blue-400" />
                        Loading categories...
                      </td>
                    </tr>
                  ) : currentCategories.length > 0 ? (
                    currentCategories.map((category, index) => (
                      <tr key={category._id} className="hover:bg-transparent transition-colors group">
                        <td className="px-6 py-4 text-sm font-medium text-slate-300">{indexOfFirstItem + index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {category.image ? (
                            <img src={getImageUrl(category.image)} alt={category.name} className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-white/10 mr-3 shrink-0" />
                            ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center mr-3 text-slate-400 shrink-0">
                                <FiTag />
                              </div>
                            )}
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{category.name}</span>
                            <span className={`text-[9px] font-bold mt-1 px-2 py-0.5 rounded w-fit border ${category.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-white/10'}`}>
                              {category.isActive !== false ? 'ACTIVE' : 'HIDDEN'}
                            </span>
                          </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleEdit(category)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit Category">
                            <FiEdit2 />
                          </button>
                          <button onClick={() => handleDelete(category._id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors" title="Delete Category">
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-400 font-medium">
                        {searchTerm ? 'No categories matching your search.' : 'No categories found. Create your first category using the form.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && filteredCategories.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center px-6 py-4 border-t border-white/10 bg-slate-800/50">
                <span className="text-sm text-slate-400">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCategories.length)} of {filteredCategories.length} entries
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
    </div>
  );
};

export default Category;
