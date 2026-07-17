import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowUp, FiArrowDown, FiCopy, FiTrash2, FiSave, FiArrowLeft, FiPlus, FiLoader, FiChevronDown, FiChevronUp, FiImage } from 'react-icons/fi';
import { BASE_URL } from '../../../api/axios';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const Variants = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState('');
  const [fullProduct, setFullProduct] = useState(null);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editProductImageFiles, setEditProductImageFiles] = useState([]);
  const [expandedVariantIndex, setExpandedVariantIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [prodRes, brandRes, catRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/products/${productId}`, { headers }),
        axios.get(`${BASE_URL}/api/brands/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/categories/`, { headers }).catch(() => ({ data: [] }))
      ]);

      const product = prodRes.data;
      setProductName(product.name);
      setBrands(brandRes.data);
      setCategories(catRes.data);
      
      setFullProduct({
        ...product,
        brand: product.brand?._id || product.brand || '',
        category: product.category?._id || product.category || '',
        quantityPricing: Array.isArray(product.quantityPricing) ? product.quantityPricing : [],
        image_urls: product.images ? product.images.join(', ') : ''
      });
      
      const existingVariants = product.variants?.map(v => ({
        ...v,
        name: v.name || '',
        quantity: v.quantity || '',
        price: v.price || '',
        offerPrice: v.offerPrice || '',
        l1Price: v.l1Price || '',
        l2Price: v.l2Price || '',
        l3Price: v.l3Price || '',
        quantityPricing: Array.isArray(v.quantityPricing) ? v.quantityPricing : [],
        image_urls: v.images ? v.images.join(', ') : '',
        isActive: v.isActive !== false
      })) || [];
      
      setVariants(existingVariants);
      setExpandedVariantIndex(existingVariants.length > 0 ? 0 : null);
    } catch (err) {
      console.error("Failed to fetch product data", err);
    } finally {
      setLoading(false);
    }
  };

  const getEmptyVariant = () => ({
    name: '',
    quantity: '',
    price: '',
    offerPrice: '',
    l1Price: '',
    l2Price: '',
    l3Price: '',
    quantityPricing: [],
    image_urls: '',
    isActive: true
  });

  const handleAdd = () => {
    setVariants([...variants, getEmptyVariant()]);
    setExpandedVariantIndex(variants.length);
  };

  const handleRemove = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
    if (expandedVariantIndex === index) {
      setExpandedVariantIndex(null);
    }
  };

  const handleDuplicate = (index) => {
    const cloned = {
      ...variants[index],
      quantityPricing: (variants[index].quantityPricing || []).map(qp => ({ ...qp }))
    };
    const newVariants = [...variants];
    newVariants.splice(index + 1, 0, cloned);
    setVariants(newVariants);
    setExpandedVariantIndex(index + 1);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newVariants = [...variants];
    [newVariants[index - 1], newVariants[index]] = [newVariants[index], newVariants[index - 1]];
    setVariants(newVariants);
    if (expandedVariantIndex === index) setExpandedVariantIndex(index - 1);
    else if (expandedVariantIndex === index - 1) setExpandedVariantIndex(index);
  };

  const handleMoveDown = (index) => {
    if (index === variants.length - 1) return;
    const newVariants = [...variants];
    [newVariants[index + 1], newVariants[index]] = [newVariants[index], newVariants[index + 1]];
    setVariants(newVariants);
    if (expandedVariantIndex === index) setExpandedVariantIndex(index + 1);
    else if (expandedVariantIndex === index + 1) setExpandedVariantIndex(index);
  };

  const handleChange = (index, field, value) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== index) return v;
      return { ...v, [field]: value };
    }));
  };

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setFullProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleProductQuantityPricingChange = (index, field, value) => {
    const newQp = [...(fullProduct.quantityPricing || [])];
    newQp[index] = { ...newQp[index], [field]: value };
    setFullProduct(prev => ({ ...prev, quantityPricing: newQp }));
  };

  const handleAddProductQuantityPricing = () => {
    setFullProduct(prev => ({ ...prev, quantityPricing: [...(prev.quantityPricing || []), { minQty: '', price: '' }] }));
  };

  const handleRemoveProductQuantityPricing = (index) => {
    const newQp = [...(fullProduct.quantityPricing || [])];
    newQp.splice(index, 1);
    setFullProduct(prev => ({ ...prev, quantityPricing: newQp }));
  };

  const handleAddQuantityPricing = (index) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== index) return v;
      return {
        ...v,
        quantityPricing: [...(v.quantityPricing || []), { minQty: '', price: '' }]
      };
    }));
  };

  const handleRemoveQuantityPricing = (variantIndex, qpIndex) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return {
        ...v,
        quantityPricing: (v.quantityPricing || []).filter((_, qpi) => qpi !== qpIndex)
      };
    }));
  };

  const handleQuantityPricingChange = (variantIndex, qpIndex, field, value) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return {
        ...v,
        quantityPricing: (v.quantityPricing || []).map((qp, qpi) => {
          if (qpi !== qpIndex) return qp;
          return { ...qp, [field]: value };
        })
      };
    }));
  };

    const handleSave = async () => {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      
      // Format variants for API
      let payloadVariants;
      try {
        payloadVariants = variants.map(v => {
          const parsedQP = (v.quantityPricing || [])
            .map(qp => ({ minQty: Number(qp.minQty) || 0, price: Number(qp.price) || 0 }))
            .filter(qp => qp.minQty > 0 || qp.price > 0);
          const images = (v.image_urls || '').split(',').map(url => url.trim()).filter(Boolean);
          
          const { image_urls, quantityPricing, ...rest } = v;
          
          return {
            ...rest,
            name: v.name,
            quantity: Number(v.quantity) || 0,
            price: Number(v.price) || 0,
            offerPrice: Number(v.offerPrice) || 0,
            l1Price: Number(v.l1Price) || 0,
            l2Price: Number(v.l2Price) || 0,
            l3Price: Number(v.l3Price) || 0,
            quantityPricing: parsedQP,
            images,
            isActive: v.isActive !== false
          };
        });
      } catch (err) {
        alert(err.message);
        setSaving(false);
        return;
      }

      const parsedProductQP = (fullProduct.quantityPricing || [])
        .map(qp => ({ minQty: Number(qp.minQty) || 0, price: Number(qp.price) || 0 }))
        .filter(qp => qp.minQty > 0 || qp.price > 0);

      const formData = new FormData();
      formData.append('name', fullProduct.name || '');
      formData.append('description', fullProduct.description || '');
      formData.append('details', fullProduct.details || '');
      formData.append('expertNotes', fullProduct.expertNotes || '');
      formData.append('basePrice', fullProduct.basePrice || 0);
      formData.append('offerPrice', fullProduct.offerPrice || 0);
      formData.append('l1Price', fullProduct.l1Price || 0);
      formData.append('l2Price', fullProduct.l2Price || 0);
      formData.append('l3Price', fullProduct.l3Price || 0);
      formData.append('quantityPricing', JSON.stringify(parsedProductQP));
      formData.append('totalQuantity', fullProduct.totalQuantity || 0);
      formData.append('eanNumber', fullProduct.eanNumber || '');
      formData.append('sevenDaysReturn', fullProduct.sevenDaysReturn || '');
      formData.append('warranty', fullProduct.warranty || '');
      formData.append('cancellationPolicy', fullProduct.cancellationPolicy || '');
      
      if (fullProduct.brand) formData.append('brand', fullProduct.brand);
      if (fullProduct.category) formData.append('category', fullProduct.category);
  
      formData.append('variants', JSON.stringify(payloadVariants));

      const imageUrls = fullProduct.image_urls ? fullProduct.image_urls.split(',').map(url => url.trim()).filter(Boolean) : [];
      if (imageUrls.length > 0) {
        formData.append('images', JSON.stringify(imageUrls));
      }

      editProductImageFiles.forEach(file => {
        formData.append('images', file);
      });

      await axios.put(`${BASE_URL}/api/products/${productId}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Variants updated successfully');
      navigate(-1);
    } catch (err) {
      console.error("Failed to update product and variants", err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return <div className="flex justify-center py-20"><FiLoader className="animate-spin text-4xl text-blue-400" /></div>;
  }

  return (
    <div className="relative space-y-4 min-h-full z-0">


      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl shadow-sm transition-colors">
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Edit Product</h1>
            <p className="text-slate-400 font-medium mt-1">Editing details for <span className="text-blue-400 font-bold">{productName}</span></p>
          </div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center justify-center px-6 py-2.5 bg-blue-600/50 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          {saving ? <FiLoader className="animate-spin mr-2" /> : <FiSave className="mr-2" />}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-6 mb-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'details' 
              ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Product Details
        </button>
        <button
          onClick={() => setActiveTab('variants')}
          className={`pb-3 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'variants' 
              ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Product Variants
        </button>
      </div>

      {/* Product Details Section */}
      {activeTab === 'details' && (
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-white/10">Edit Product Details</h2>
        
        {/* General Information */}
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>General Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Brand</label>
              <select name="brand" value={fullProduct.brand || ''} onChange={handleProductChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium">
                <option value="" className="bg-slate-800">Select Brand</option>
                {brands.map(b => <option key={b._id} value={b._id} className="bg-slate-800">{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category</label>
              <select name="category" value={fullProduct.category || ''} onChange={handleProductChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium">
                <option value="" className="bg-slate-800">Select Category</option>
                {categories.map(c => <option key={c._id} value={c._id} className="bg-slate-800">{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Product Name</label>
              <input type="text" name="name" value={fullProduct.name || ''} onChange={handleProductChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">EAN Number</label>
              <input type="number" name="eanNumber" value={fullProduct.eanNumber || ''} onChange={handleProductChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 scheme-dark" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Total Quantity</label>
              <input type="number" name="totalQuantity" value={fullProduct.totalQuantity || ''} onChange={handleProductChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 scheme-dark" />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>Pricing & Inventory</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Base Price</label>
              <input type="number" name="basePrice" value={fullProduct.basePrice || ''} onChange={handleProductChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 scheme-dark" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Offer Price</label>
              <input type="number" name="offerPrice" value={fullProduct.offerPrice || ''} onChange={handleProductChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 scheme-dark" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L1 Price</label>
              <input type="number" name="l1Price" value={fullProduct.l1Price || ''} onChange={handleProductChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 scheme-dark" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L2 Price</label>
              <input type="number" name="l2Price" value={fullProduct.l2Price || ''} onChange={handleProductChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 scheme-dark" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L3 Price</label>
              <input type="number" name="l3Price" value={fullProduct.l3Price || ''} onChange={handleProductChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 scheme-dark" />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity Pricing Slabs</label>
              {(fullProduct.quantityPricing || []).map((qp, qpIndex) => (
                <div key={qpIndex} className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <input type="number" value={qp.minQty} onChange={e => handleProductQuantityPricingChange(qpIndex, 'minQty', e.target.value)} placeholder="Minimum Quantity" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                  </div>
                  <div className="flex-1">
                    <input type="number" value={qp.price} onChange={e => handleProductQuantityPricingChange(qpIndex, 'price', e.target.value)} placeholder="Price per unit" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                  </div>
                  <button type="button" onClick={() => handleRemoveProductQuantityPricing(qpIndex)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-colors shrink-0" title="Remove Slab">
                    <FiTrash2 />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => handleAddProductQuantityPricing()} className="px-4 py-2 mt-1 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-900/50 transition-colors border border-blue-500/30">
                + Add Quantity Slab
              </button>
            </div>
          </div>
        </div>
        
        {/* Extended Details */}
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>Descriptions & Policies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Warranty</label>
              <input type="text" name="warranty" value={fullProduct.warranty || ''} onChange={handleProductChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">7 Days Return Policy</label>
              <input type="text" name="sevenDaysReturn" value={fullProduct.sevenDaysReturn || ''} onChange={handleProductChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Description</label>
              <textarea name="description" value={fullProduct.description || ''} onChange={handleProductChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Details</label>
              <textarea name="details" value={fullProduct.details || ''} onChange={handleProductChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Expert Notes</label>
              <textarea name="expertNotes" value={fullProduct.expertNotes || ''} onChange={handleProductChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Cancellation Policy</label>
              <textarea name="cancellationPolicy" value={fullProduct.cancellationPolicy || ''} onChange={handleProductChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>Product Images</h3>
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Image URLs (comma separated)</label>
              <input type="text" name="image_urls" value={fullProduct.image_urls || ''} onChange={handleProductChange} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
              {fullProduct.image_urls && fullProduct.image_urls.split(',').filter(url => url.trim()).length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {fullProduct.image_urls.split(',').map((url, i) => url.trim() && (
                    <div key={i} className="relative w-16 h-16 border border-white/10 rounded-lg overflow-hidden bg-slate-800 shadow-sm shrink-0">
                      <img src={getImageUrl(url.trim())} alt={`Preview ${i}`} className="w-full h-full object-contain bg-white p-1" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-3">Add Additional Images</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                  if (files.length > 0) {
                    setEditProductImageFiles([...editProductImageFiles, ...files]);
                  }
                }}
                onClick={() => document.getElementById('product-edit-images-input').click()}
                className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col justify-center items-center gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' 
                    : 'border-white/10 hover:border-blue-500/40 hover:bg-white/5'
                }`}
              >
                <input 
                  id="product-edit-images-input"
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={(e) => setEditProductImageFiles([...editProductImageFiles, ...Array.from(e.target.files)])}
                  className="hidden"
                />
                <FiImage size={24} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Drag & drop product images here, or <span className="text-blue-400 group-hover:underline">browse</span></span>
                <span className="text-[10px] text-slate-500">Supports multiple files (JPG, PNG, WEBP)</span>
              </div>
              {editProductImageFiles.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4 p-4 bg-slate-800/50 border border-white/10 rounded-xl">
                  {editProductImageFiles.map((file, i) => (
                    <div key={i} className="relative w-28 h-28 border border-white/10 rounded-xl overflow-hidden group bg-slate-800 shadow-sm">
                      <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain bg-white p-2" />
                      <button 
                        type="button"
                        onClick={() => setEditProductImageFiles(editProductImageFiles.filter((_, index) => index !== i))}
                        className="absolute top-2 right-2 bg-slate-900/90 text-red-400 hover:bg-red-600 hover:text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm cursor-pointer"
                        title="Remove File"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'variants' && (
        <div className="space-y-6">
        <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-white/10">Product Variants</h2>
        {variants.length > 0 ? (
          variants.map((variant, index) => (
            <div key={index} className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-lg shadow-black/50 rounded-2xl overflow-hidden group">
            {/* Accordion Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors bg-slate-800/30"
              onClick={() => setExpandedVariantIndex(expandedVariantIndex === index ? null : index)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {index + 1}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {variant.name || <span className="text-slate-500 italic">Unnamed Variant</span>}
                </h3>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }} disabled={index === 0} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg disabled:opacity-30 transition-colors cursor-pointer" title="Move Up"><FiArrowUp /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }} disabled={index === variants.length - 1} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg disabled:opacity-30 transition-colors cursor-pointer" title="Move Down"><FiArrowDown /></button>
                  <div className="w-px h-5 bg-white/10 mx-1"></div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDuplicate(index); }} className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer" title="Duplicate Variant"><FiCopy /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(index); }} className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer" title="Delete Variant"><FiTrash2 /></button>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="p-1 text-slate-400">
                  {expandedVariantIndex === index ? <FiChevronUp className="text-xl" /> : <FiChevronDown className="text-xl" />}
                </div>
              </div>
            </div>

            {/* Accordion Content */}
            {expandedVariantIndex === index && (
              <div className="p-6 border-t border-white/10 bg-black/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  <div className="sm:col-span-2 md:col-span-3 lg:col-span-4"><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Variant Name</label><input type="text" value={variant.name} onChange={e => handleChange(index, 'name', e.target.value)} placeholder="e.g. Active Black" required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white" /></div>
                  
                  <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity</label><input type="number" value={variant.quantity} onChange={e => handleChange(index, 'quantity', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" /></div>
                  <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Price</label><input type="number" value={variant.price} onChange={e => handleChange(index, 'price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" /></div>
                  <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Offer Price</label><input type="number" value={variant.offerPrice} onChange={e => handleChange(index, 'offerPrice', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" /></div>
                  <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L1 Price</label><input type="number" value={variant.l1Price} onChange={e => handleChange(index, 'l1Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" /></div>
                  <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L2 Price</label><input type="number" value={variant.l2Price} onChange={e => handleChange(index, 'l2Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" /></div>
                  <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L3 Price</label><input type="number" value={variant.l3Price} onChange={e => handleChange(index, 'l3Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Active Status</label>
                    <select 
                      value={variant.isActive !== false ? 'active' : 'inactive'} 
                      onChange={e => handleChange(index, 'isActive', e.target.value === 'active')}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                    >
                      <option value="active" className="bg-slate-800">Active</option>
                      <option value="inactive" className="bg-slate-800">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity Pricing Slabs</label>
                    {(variant.quantityPricing || []).map((qp, qpIndex) => (
                      <div key={qpIndex} className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <input type="number" value={qp.minQty} onChange={e => handleQuantityPricingChange(index, qpIndex, 'minQty', e.target.value)} placeholder="Minimum Quantity" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                        </div>
                        <div className="flex-1">
                          <input type="number" value={qp.price} onChange={e => handleQuantityPricingChange(index, qpIndex, 'price', e.target.value)} placeholder="Price per unit" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                        </div>
                        <button type="button" onClick={() => handleRemoveQuantityPricing(index, qpIndex)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-colors shrink-0 cursor-pointer" title="Remove Slab">
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => handleAddQuantityPricing(index)} className="px-4 py-2 mt-1 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-900/50 transition-colors border border-blue-500/30 cursor-pointer">
                      + Add Quantity Slab
                    </button>
                  </div>
                  
                  <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Image URLs (comma separated)</label>
                    <input type="text" value={variant.image_urls} onChange={e => handleChange(index, 'image_urls', e.target.value)} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white" />
                    {variant.image_urls && variant.image_urls.split(',').filter(url => url.trim()).length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {variant.image_urls.split(',').map((url, i) => url.trim() && (
                          <div key={i} className="w-16 h-16 border border-white/10 rounded-lg overflow-hidden bg-slate-800 shadow-sm shrink-0 flex items-center justify-center">
                          <img src={getImageUrl(url.trim())} alt={`Preview ${i}`} className="max-w-full max-h-full object-contain bg-white p-1" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
        ) : (
          <div className="p-6 text-center text-slate-400 bg-slate-800/30 rounded-2xl border border-white/5">
            No variants configured for this product.
          </div>
        )}

        <button onClick={handleAdd} className="w-full py-4 border-2 border-dashed border-blue-500/30 rounded-2xl text-blue-400 font-bold hover:bg-blue-900/20 hover:border-blue-400 transition-colors flex items-center justify-center cursor-pointer">
          <FiPlus className="mr-2 text-xl" /> Add Another Variant
        </button>
      </div>
      )}
    </div>
  );
};

export default Variants;