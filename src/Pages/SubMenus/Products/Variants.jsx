import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowUp, FiArrowDown, FiCopy, FiTrash2, FiSave, FiArrowLeft, FiPlus, FiLoader } from 'react-icons/fi';
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

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductName(response.data.name);
      setFullProduct(response.data);
      
      // Map existing variants to our UI state format
      const existingVariants = response.data.variants?.map(v => ({
        ...v,
        name: v.name || '',
        quantity: v.quantity || '',
        price: v.price || '',
        offerPrice: v.offerPrice || '',
        l1Price: v.l1Price || '',
        l2Price: v.l2Price || '',
        l3Price: v.l3Price || '',
        quantityPricing: Array.isArray(v.quantityPricing) ? v.quantityPricing : [],
        image_urls: v.images ? v.images.join(', ') : ''
      })) || [];
      
      setVariants(existingVariants.length > 0 ? existingVariants : [getEmptyVariant()]);
    } catch (err) {
      console.error("Failed to fetch product", err);
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
    image_urls: ''
  });

  const handleAdd = () => setVariants([...variants, getEmptyVariant()]);

  const handleRemove = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleDuplicate = (index) => {
    const cloned = { ...variants[index] };
    const newVariants = [...variants];
    newVariants.splice(index + 1, 0, cloned);
    setVariants(newVariants);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newVariants = [...variants];
    [newVariants[index - 1], newVariants[index]] = [newVariants[index], newVariants[index - 1]];
    setVariants(newVariants);
  };

  const handleMoveDown = (index) => {
    if (index === variants.length - 1) return;
    const newVariants = [...variants];
    [newVariants[index + 1], newVariants[index]] = [newVariants[index], newVariants[index + 1]];
    setVariants(newVariants);
  };

  const handleChange = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const handleAddQuantityPricing = (index) => {
    const newVariants = [...variants];
    if (!newVariants[index].quantityPricing) newVariants[index].quantityPricing = [];
    newVariants[index].quantityPricing.push({ minQty: '', price: '' });
    setVariants(newVariants);
  };

  const handleRemoveQuantityPricing = (variantIndex, qpIndex) => {
    const newVariants = [...variants];
    newVariants[variantIndex].quantityPricing.splice(qpIndex, 1);
    setVariants(newVariants);
  };

  const handleQuantityPricingChange = (variantIndex, qpIndex, field, value) => {
    const newVariants = [...variants];
    newVariants[variantIndex].quantityPricing[qpIndex][field] = value;
    setVariants(newVariants);
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
            images
          };
        });
      } catch (err) {
        alert(err.message);
        setSaving(false);
        return;
      }

      // Reconstruct the full product payload to satisfy backend validations
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
      formData.append('quantityPricing', JSON.stringify(fullProduct.quantityPricing || []));
      formData.append('totalQuantity', fullProduct.totalQuantity || 0);
      formData.append('eanNumber', fullProduct.eanNumber || '');
      formData.append('sevenDaysReturn', fullProduct.sevenDaysReturn || '');
      formData.append('warranty', fullProduct.warranty || '');
      formData.append('cancellationPolicy', fullProduct.cancellationPolicy || '');
      
      const brandId = typeof fullProduct.brand === 'object' ? fullProduct.brand?._id : fullProduct.brand;
      const catId = typeof fullProduct.category === 'object' ? fullProduct.category?._id : fullProduct.category;
      
      if (brandId) formData.append('brand', brandId);
      if (catId) formData.append('category', catId);
  
      formData.append('variants', JSON.stringify(payloadVariants));

      if (Array.isArray(fullProduct.images)) {
        fullProduct.images.forEach(img => formData.append('images', img));
      }

      await axios.put(`${BASE_URL}/api/products/${productId}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Variants updated successfully');
      navigate(-1);
    } catch (err) {
      console.error("Failed to update variants", err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update variants');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><FiLoader className="animate-spin text-4xl text-blue-400" /></div>;
  }

  return (
    <div className="relative space-y-6 min-h-full z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl shadow-sm transition-colors">
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Manage Variants</h1>
            <p className="text-slate-400 font-medium mt-1">Editing variants for <span className="text-blue-400 font-bold">{productName}</span></p>
          </div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          {saving ? <FiLoader className="animate-spin mr-2" /> : <FiSave className="mr-2" />}
          Update Variants
        </button>
      </div>

      <div className="space-y-6">
        {variants.map((variant, index) => (
          <div key={index} className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative group">
            {/* Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-2 bg-slate-800 text-slate-400 hover:bg-blue-900/30 hover:text-blue-400 rounded-lg disabled:opacity-30"><FiArrowUp /></button>
              <button onClick={() => handleMoveDown(index)} disabled={index === variants.length - 1} className="p-2 bg-slate-800 text-slate-400 hover:bg-blue-900/30 hover:text-blue-400 rounded-lg disabled:opacity-30"><FiArrowDown /></button>
              <button onClick={() => handleDuplicate(index)} className="p-2 bg-slate-800 text-slate-400 hover:bg-emerald-900/30 hover:text-emerald-400 rounded-lg"><FiCopy /></button>
              <button onClick={() => handleRemove(index)} className="p-2 bg-slate-800 text-slate-400 hover:bg-red-900/30 hover:text-red-400 rounded-lg"><FiTrash2 /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
              <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Variant Name</label><input type="text" value={variant.name} onChange={e => handleChange(index, 'name', e.target.value)} placeholder="e.g. Active Black" required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity</label><input type="number" value={variant.quantity} onChange={e => handleChange(index, 'quantity', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Price</label><input type="number" value={variant.price} onChange={e => handleChange(index, 'price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Offer Price</label><input type="number" value={variant.offerPrice} onChange={e => handleChange(index, 'offerPrice', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L1 Price</label><input type="number" value={variant.l1Price} onChange={e => handleChange(index, 'l1Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L2 Price</label><input type="number" value={variant.l2Price} onChange={e => handleChange(index, 'l2Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L3 Price</label><input type="number" value={variant.l3Price} onChange={e => handleChange(index, 'l3Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" /></div>
              
              <div className="sm:col-span-2 md:col-span-3 lg:col-span-5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity Pricing Slabs</label>
                {(variant.quantityPricing || []).map((qp, qpIndex) => (
                  <div key={qpIndex} className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <input type="number" value={qp.minQty} onChange={e => handleQuantityPricingChange(index, qpIndex, 'minQty', e.target.value)} placeholder="Minimum Quantity" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                      <input type="number" value={qp.price} onChange={e => handleQuantityPricingChange(index, qpIndex, 'price', e.target.value)} placeholder="Price per unit" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white [color-scheme:dark]" />
                    </div>
                    <button type="button" onClick={() => handleRemoveQuantityPricing(index, qpIndex)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-colors shrink-0" title="Remove Slab">
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => handleAddQuantityPricing(index)} className="px-4 py-2 mt-1 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-900/50 transition-colors border border-blue-500/30">
                  + Add Quantity Slab
                </button>
              </div>
              <div className="sm:col-span-2 md:col-span-3 lg:col-span-5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Image URLs (comma separated)</label>
                <input type="text" value={variant.image_urls} onChange={e => handleChange(index, 'image_urls', e.target.value)} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white" />
                {variant.image_urls && variant.image_urls.split(',').filter(url => url.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {variant.image_urls.split(',').map((url, i) => url.trim() && (
                      <div key={i} className="w-16 h-16 border border-white/10 rounded-lg overflow-hidden bg-slate-800 shadow-sm shrink-0">
                      <img src={getImageUrl(url.trim())} alt={`Preview ${i}`} className="w-full h-full object-contain bg-white p-1" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleAdd} className="w-full py-4 border-2 border-dashed border-blue-500/30 rounded-2xl text-blue-400 font-bold hover:bg-blue-900/20 hover:border-blue-400 transition-colors flex items-center justify-center">
        <FiPlus className="mr-2 text-xl" /> Add Another Variant
      </button>
    </div>
  );
};

export default Variants;