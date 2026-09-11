import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowUp,
  FiArrowDown,
  FiCopy,
  FiTrash2,
  FiSave,
  FiArrowLeft,
  FiArrowRight,
  FiPlus,
  FiLoader,
  FiChevronDown,
  FiChevronUp,
  FiImage,
  FiPackage,
  FiLayers,
  FiExternalLink,
  FiRotateCcw,
  FiCheck,
  FiX,
  FiDollarSign,
  FiTag,
  FiAlertCircle
} from 'react-icons/fi';
import { BASE_URL } from '../../../api/axios';
import CustomDropdown from '../../../Components/CustomDropdown';
import { getImageUrl } from '../../../utils/imageUtils';
import { useConfirm } from '../../../Context/ConfirmationContext';

const Variants = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { confirm, showAlert } = useConfirm();

  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState('');
  const [fullProduct, setFullProduct] = useState(null);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedVariantIndex, setExpandedVariantIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('details');

  // Input states for adding image URLs via interactive gallery
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newVariantImageUrls, setNewVariantImageUrls] = useState({});

  // Snapshot for detecting dirty / unsaved changes
  const initialSnapshotRef = useRef(null);

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
      setProductName(product.name || '');
      setBrands(brandRes.data || []);
      setCategories(catRes.data || []);

      let prodImages = [];
      if (Array.isArray(product.images)) {
        prodImages = product.images.filter(Boolean);
      } else if (typeof product.images === 'string' && product.images.trim()) {
        prodImages = product.images.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(product.image_urls)) {
        prodImages = product.image_urls.filter(Boolean);
      } else if (typeof product.image_urls === 'string' && product.image_urls.trim()) {
        prodImages = product.image_urls.split(',').map(s => s.trim()).filter(Boolean);
      }

      const formattedProduct = {
        ...product,
        brand: product.brand?._id || product.brand || '',
        category: product.category?._id || product.category || '',
        quantityPricing: Array.isArray(product.quantityPricing) ? product.quantityPricing : [],
        image_urls: prodImages.join(', ')
      };
      setFullProduct(formattedProduct);

      const existingVariants = product.variants?.map(v => {
        let varImages = [];
        if (Array.isArray(v.images)) {
          varImages = v.images.filter(Boolean);
        } else if (typeof v.images === 'string' && v.images.trim()) {
          varImages = v.images.split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(v.image_urls)) {
          varImages = v.image_urls.filter(Boolean);
        } else if (typeof v.image_urls === 'string' && v.image_urls.trim()) {
          varImages = v.image_urls.split(',').map(s => s.trim()).filter(Boolean);
        }

        return {
          ...v,
          name: v.name || '',
          quantity: v.quantity !== undefined && v.quantity !== null ? v.quantity : '',
          price: v.price !== undefined && v.price !== null ? v.price : '',
          offerPrice: v.offerPrice !== undefined && v.offerPrice !== null ? v.offerPrice : '',
          l1Price: v.l1Price !== undefined && v.l1Price !== null ? v.l1Price : '',
          l2Price: v.l2Price !== undefined && v.l2Price !== null ? v.l2Price : '',
          l3Price: v.l3Price !== undefined && v.l3Price !== null ? v.l3Price : '',
          quantityPricing: Array.isArray(v.quantityPricing) ? v.quantityPricing : [],
          image_urls: varImages.join(', '),
          isActive: v.isActive !== false
        };
      }) || [];

      setVariants(existingVariants);
      setExpandedVariantIndex(existingVariants.length > 0 ? 0 : null);

      // Save initial snapshot to track changes
      initialSnapshotRef.current = JSON.stringify({
        product: formattedProduct,
        variants: existingVariants
      });
    } catch (err) {
      console.error("Failed to fetch product data", err);
      showAlert("Failed to load product details.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Check if there are unsaved changes
  const isDirty = () => {
    if (!initialSnapshotRef.current || !fullProduct) return false;
    const currentSnapshot = JSON.stringify({
      product: fullProduct,
      variants: variants
    });
    return initialSnapshotRef.current !== currentSnapshot;
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

  const handleAddVariant = () => {
    let newVariant = getEmptyVariant();
    if (variants.length === 0 && fullProduct) {
      newVariant = {
        name: '',
        quantity: fullProduct.totalQuantity !== undefined && fullProduct.totalQuantity !== null ? fullProduct.totalQuantity : '',
        price: fullProduct.basePrice !== undefined && fullProduct.basePrice !== null ? fullProduct.basePrice : '',
        offerPrice: fullProduct.offerPrice !== undefined && fullProduct.offerPrice !== null ? fullProduct.offerPrice : '',
        l1Price: fullProduct.l1Price !== undefined && fullProduct.l1Price !== null ? fullProduct.l1Price : '',
        l2Price: fullProduct.l2Price !== undefined && fullProduct.l2Price !== null ? fullProduct.l2Price : '',
        l3Price: fullProduct.l3Price !== undefined && fullProduct.l3Price !== null ? fullProduct.l3Price : '',
        quantityPricing: Array.isArray(fullProduct.quantityPricing) ? fullProduct.quantityPricing.map(qp => ({ ...qp })) : [],
        image_urls: fullProduct.image_urls || (Array.isArray(fullProduct.images) ? fullProduct.images.join(', ') : ''),
        isActive: true
      };
    }
    setVariants([...variants, newVariant]);
    setExpandedVariantIndex(variants.length);
  };

  const handleRemoveVariant = async (index) => {
    const variantName = variants[index]?.name || `Variant ${index + 1}`;
    const confirmed = await confirm(`Are you sure you want to delete "${variantName}"?`);
    if (!confirmed) return;

    setVariants(variants.filter((_, i) => i !== index));
    if (expandedVariantIndex === index) {
      setExpandedVariantIndex(null);
    } else if (expandedVariantIndex > index) {
      setExpandedVariantIndex(expandedVariantIndex - 1);
    }
  };

  const handleDuplicateVariant = (index) => {
    const target = variants[index];
    const cloned = {
      ...target,
      name: target.name ? `${target.name} (Copy)` : 'Copy',
      quantityPricing: (target.quantityPricing || []).map(qp => ({ ...qp }))
    };
    const newVariants = [...variants];
    newVariants.splice(index + 1, 0, cloned);
    setVariants(newVariants);
    setExpandedVariantIndex(index + 1);
    showAlert(`Duplicated "${target.name || 'Variant'}" successfully!`, "success");
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

  const handleToggleExpandAll = () => {
    if (expandedVariantIndex === 'all') {
      setExpandedVariantIndex(null);
    } else {
      setExpandedVariantIndex('all');
    }
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

  // Quantity pricing handlers
  const handleProductQuantityPricingChange = (index, field, value) => {
    const newQp = [...(fullProduct.quantityPricing || [])];
    newQp[index] = { ...newQp[index], [field]: value };
    setFullProduct(prev => ({ ...prev, quantityPricing: newQp }));
  };

  const handleAddProductQuantityPricing = () => {
    setFullProduct(prev => ({
      ...prev,
      quantityPricing: [...(prev.quantityPricing || []), { minQty: '', price: '' }]
    }));
  };

  const handleRemoveProductQuantityPricing = (index) => {
    const newQp = [...(fullProduct.quantityPricing || [])];
    newQp.splice(index, 1);
    setFullProduct(prev => ({ ...prev, quantityPricing: newQp }));
  };

  const handleAddQuantityPricing = (variantIndex) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
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

  // Product Image Gallery Helpers (URL based)
  const parseImageUrls = (commaSeparatedStr) => {
    if (!commaSeparatedStr) return [];
    return commaSeparatedStr.split(',').map(u => u.trim()).filter(Boolean);
  };

  const handleAddProductImage = (e) => {
    if (e) e.preventDefault();
    const url = newProductImageUrl.trim();
    if (!url) return;
    const existing = parseImageUrls(fullProduct.image_urls);
    if (existing.includes(url)) {
      showAlert("This image URL is already added.", "info");
      return;
    }
    const updated = [...existing, url];
    setFullProduct(prev => ({
      ...prev,
      image_urls: updated.join(', '),
      images: updated,
      image: updated[0] || ''
    }));
    setNewProductImageUrl('');
  };

  const handleRemoveProductImage = (urlToRemove) => {
    const existing = parseImageUrls(fullProduct.image_urls);
    const updated = existing.filter(u => u !== urlToRemove);
    setFullProduct(prev => ({
      ...prev,
      image_urls: updated.join(', '),
      images: updated,
      image: updated[0] || ''
    }));
  };

  const handleMoveProductImage = (fromIndex, toIndex) => {
    const existing = parseImageUrls(fullProduct.image_urls);
    if (toIndex < 0 || toIndex >= existing.length || fromIndex === toIndex) return;
    const updated = [...existing];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFullProduct(prev => ({
      ...prev,
      image_urls: updated.join(', '),
      images: updated,
      image: updated[0] || ''
    }));
  };

  const handleSetPrimaryProductImage = (index) => {
    handleMoveProductImage(index, 0);
  };

  // Variant Image Gallery Helpers (URL based)
  const handleAddVariantImage = (variantIndex, e) => {
    if (e) e.preventDefault();
    const url = (newVariantImageUrls[variantIndex] || '').trim();
    if (!url) return;
    const existing = parseImageUrls(variants[variantIndex]?.image_urls);
    if (existing.includes(url)) {
      showAlert("This image URL is already added to this variant.", "info");
      return;
    }
    const updated = [...existing, url];
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return {
        ...v,
        image_urls: updated.join(', '),
        images: updated,
        image: updated[0] || ''
      };
    }));
    setNewVariantImageUrls(prev => ({ ...prev, [variantIndex]: '' }));
  };

  const handleRemoveVariantImage = (variantIndex, urlToRemove) => {
    const existing = parseImageUrls(variants[variantIndex]?.image_urls);
    const updated = existing.filter(u => u !== urlToRemove);
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return {
        ...v,
        image_urls: updated.join(', '),
        images: updated,
        image: updated[0] || ''
      };
    }));
  };

  const handleMoveVariantImage = (variantIndex, fromIndex, toIndex) => {
    const existing = parseImageUrls(variants[variantIndex]?.image_urls);
    if (toIndex < 0 || toIndex >= existing.length || fromIndex === toIndex) return;
    const updated = [...existing];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return {
        ...v,
        image_urls: updated.join(', '),
        images: updated,
        image: updated[0] || ''
      };
    }));
  };

  const handleSetPrimaryVariantImage = (variantIndex, imgIndex) => {
    handleMoveVariantImage(variantIndex, imgIndex, 0);
  };

  // Discard changes
  const handleDiscard = async () => {
    if (!isDirty()) {
      navigate(-1);
      return;
    }
    const confirmed = await confirm("Are you sure you want to discard all unsaved changes?");
    if (confirmed) {
      fetchData();
      showAlert("Changes discarded.", "info");
    }
  };

  // Save product and variants
  const handleSave = async () => {
    if (!fullProduct.brand) {
      showAlert("Please select a brand.", "error");
      setActiveTab('details');
      return;
    }
    if (!fullProduct.category) {
      showAlert("Please select a category.", "error");
      setActiveTab('details');
      return;
    }
    if (!fullProduct.name || !fullProduct.name.trim()) {
      showAlert("Product name is required.", "error");
      setActiveTab('details');
      return;
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem('accessToken');

      let payloadVariants = variants.map(v => {
        const parsedQP = (v.quantityPricing || [])
          .map(qp => ({ minQty: Number(qp.minQty) || 0, price: Number(qp.price) || 0 }))
          .filter(qp => qp.minQty > 0 || qp.price > 0);
        const images = parseImageUrls(v.image_urls);

        const { image_urls, quantityPricing, images: _oldImages, image: _oldImage, ...rest } = v;

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
          images: images,
          image: images[0] || '',
          image_urls: images,
          isActive: v.isActive !== false
        };
      });

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
      formData.append('brand', fullProduct.brand);
      formData.append('category', fullProduct.category);
      formData.append('variants', JSON.stringify(payloadVariants));

      const imageUrls = parseImageUrls(fullProduct.image_urls);
      formData.append('images', JSON.stringify(imageUrls));
      if (imageUrls[0]) {
        formData.append('image', imageUrls[0]);
      }

      await axios.put(`${BASE_URL}/api/products/${productId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      showAlert("Product and variants updated successfully!", "success");
      // Update snapshot so isDirty becomes false
      initialSnapshotRef.current = JSON.stringify({
        product: fullProduct,
        variants: variants
      });
      navigate(-1);
    } catch (err) {
      console.error("Failed to update product and variants", err);
      showAlert(err.response?.data?.message || err.response?.data?.error || 'Failed to update product', "error");
    } finally {
      setSaving(false);
    }
  };

  // Helper calculation for discount percentage
  const calculateDiscount = (base, offer) => {
    const b = Number(base);
    const o = Number(offer);
    if (!b || !o || o >= b) return null;
    const pct = Math.round(((b - o) / b) * 100);
    const saveAmount = b - o;
    return { pct, saveAmount };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <FiLoader className="animate-spin text-5xl text-blue-600 dark:text-blue-400" />
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading product details...</p>
      </div>
    );
  }

  const hasUnsavedChanges = isDirty();
  const productImagesList = parseImageUrls(fullProduct.image_urls);
  const discountInfo = calculateDiscount(fullProduct.basePrice, fullProduct.offerPrice);

  return (
    <div className="relative space-y-6 min-h-full pb-28">

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Go Back"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Edit Product
              </h1>
              {hasUnsavedChanges ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                  <FiCheck className="text-emerald-500" />
                  Synced
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5 truncate max-w-lg">
              Editing <span className="text-blue-600 dark:text-blue-400 font-bold">{productName || 'Untitled Product'}</span>
            </p>
          </div>
        </div>

        {/* Top Save & Discard Buttons */}
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <button
              onClick={handleDiscard}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 font-bold text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <FiRotateCcw className="text-slate-400" />
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center px-6 py-2.5 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
          >
            {saving ? <FiLoader className="animate-spin mr-2 text-lg" /> : <FiSave className="mr-2 text-lg" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Segmented Pill Tabs */}
      <div className="flex bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 max-w-md shadow-xs">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'details'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiPackage className="text-base" />
          <span>Product Details</span>
        </button>
        <button
          onClick={() => setActiveTab('variants')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'variants'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiLayers className="text-base" />
          <span>Variants</span>
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === 'variants'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {variants.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PRODUCT DETAILS */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          
          {/* General Information */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm rounded-3xl p-6 sm:p-7">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2.5">
              <span className="w-2 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600"></span>
              General Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Brand <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  value={fullProduct.brand || ''}
                  onChange={(val) => setFullProduct(prev => ({ ...prev, brand: val }))}
                  options={[{ value: '', label: 'Select Brand' }, ...brands.map(b => ({ value: b._id, label: b.name }))]}
                  statusColor="bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Category <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  value={fullProduct.category || ''}
                  onChange={(val) => setFullProduct(prev => ({ ...prev, category: val }))}
                  options={[{ value: '', label: 'Select Category' }, ...categories.map(c => ({ value: c._id, label: c.name }))]}
                  statusColor="bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={fullProduct.name || ''}
                  onChange={handleProductChange}
                  required
                  placeholder="e.g. Premium Noise Cancelling Headphones"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  EAN / Barcode Number
                </label>
                <input
                  type="text"
                  name="eanNumber"
                  value={fullProduct.eanNumber || ''}
                  onChange={handleProductChange}
                  placeholder="e.g. 8901234567890"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Total Inventory Stock
                </label>
                <input
                  type="number"
                  name="totalQuantity"
                  value={fullProduct.totalQuantity || ''}
                  onChange={handleProductChange}
                  placeholder="Available units"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 dark:scheme-dark"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Tier Matrix */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm rounded-3xl p-6 sm:p-7">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2.5">
              <span className="w-2 h-6 rounded-full bg-emerald-500"></span>
              Retail & Customer Pricing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              {/* Base Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Base Price (MRP) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    name="basePrice"
                    value={fullProduct.basePrice || ''}
                    onChange={handleProductChange}
                    required
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500 dark:scheme-dark"
                  />
                </div>
              </div>

              {/* Offer Price with Discount Badge */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Offer Price (Selling)
                  </label>
                  {discountInfo && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                      {discountInfo.pct}% OFF
                      <span className="hidden sm:inline ml-1 font-normal text-[11px]">(Save ₹{discountInfo.saveAmount.toLocaleString()})</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    name="offerPrice"
                    value={fullProduct.offerPrice || ''}
                    onChange={handleProductChange}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500 dark:scheme-dark"
                  />
                </div>
              </div>
            </div>

            {/* Wholesale / B2B Pricing Tiers */}
            <div className="p-5 bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-white/5 rounded-2xl mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FiTag className="text-blue-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  B2B & Wholesale Tier Pricing
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    L1 Price (Tier 1 / Retailer)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      name="l1Price"
                      value={fullProduct.l1Price || ''}
                      onChange={handleProductChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium dark:scheme-dark"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    L2 Price (Tier 2 / Wholesaler)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      name="l2Price"
                      value={fullProduct.l2Price || ''}
                      onChange={handleProductChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium dark:scheme-dark"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    L3 Price (Tier 3 / Distributor)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      name="l3Price"
                      value={fullProduct.l3Price || ''}
                      onChange={handleProductChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium dark:scheme-dark"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Pricing Slabs Matrix */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Volume / Quantity Pricing Slabs
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Offer tiered bulk discounts based on the minimum order quantity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProductQuantityPricing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 text-xs font-bold rounded-lg transition-colors border border-blue-200 dark:border-blue-500/30 cursor-pointer"
                >
                  <FiPlus className="text-sm" /> Add Pricing Tier
                </button>
              </div>

              {(fullProduct.quantityPricing || []).length > 0 ? (
                <div className="space-y-2.5">
                  {(fullProduct.quantityPricing || []).map((qp, qpIndex) => {
                    const slabDiscount = fullProduct.basePrice && qp.price
                      ? calculateDiscount(fullProduct.basePrice, qp.price)
                      : null;

                    return (
                      <div
                        key={qpIndex}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5 rounded-xl"
                      >
                        <div className="w-16 shrink-0 flex items-center">
                          <span className="px-2 py-1 text-xs font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-md">
                            Tier {qpIndex + 1}
                          </span>
                        </div>

                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500 shrink-0 font-medium">Min Qty:</span>
                          <input
                            type="number"
                            value={qp.minQty}
                            onChange={e => handleProductQuantityPricingChange(qpIndex, 'minQty', e.target.value)}
                            placeholder="e.g. 10 units"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-semibold text-slate-900 dark:text-white dark:scheme-dark"
                          />
                        </div>

                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500 shrink-0 font-medium">Unit Price:</span>
                          <div className="relative w-full">
                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              value={qp.price}
                              onChange={e => handleProductQuantityPricingChange(qpIndex, 'price', e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-semibold text-slate-900 dark:text-white dark:scheme-dark"
                            />
                          </div>
                        </div>

                        {slabDiscount && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/30">
                            {slabDiscount.pct}% OFF
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveProductQuantityPricing(qpIndex)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0 cursor-pointer self-end sm:self-center"
                          title="Remove Tier"
                        >
                          <FiTrash2 className="text-base" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                  No volume pricing configured. Click "+ Add Pricing Tier" to create bulk order rules.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Image Gallery (URL Based) */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span className="w-2 h-6 rounded-full bg-purple-500"></span>
                Product Images
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  {productImagesList.length}
                </span>
              </h3>
            </div>

            {/* Add Image URL Input Bar */}
            <form onSubmit={handleAddProductImage} className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiImage className="text-base" />
                </span>
                <input
                  type="url"
                  value={newProductImageUrl}
                  onChange={(e) => setNewProductImageUrl(e.target.value)}
                  placeholder="Paste direct image URL (https://...) and click Add"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <button
                type="submit"
                disabled={!newProductImageUrl.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <FiPlus className="text-base" />
                Add Image
              </button>
            </form>

            {/* Image Tiles Grid */}
            {productImagesList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {productImagesList.map((url, i) => (
                  <div
                    key={i}
                    className="group relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 shadow-xs hover:border-purple-400 dark:hover:border-purple-500 transition-all"
                  >
                    <div className="aspect-square w-full flex items-center justify-center p-2 bg-white">
                      <img
                        src={getImageUrl(url, { width: 300, quality: 75 })}
                        alt={`Product Image ${i + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.src = 'https://placehold.co/200x200?text=Invalid+Image'; }}
                      />
                    </div>

                    {/* Position Badge always visible */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md shadow-sm ${
                        i === 0
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-900/80 text-white border border-white/20'
                      }`}>
                        {i === 0 ? '★ Primary' : `#${i + 1}`}
                      </span>
                    </div>

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/80">
                          Pos: #{i + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-transform hover:scale-105"
                            title="Open Image in new tab"
                          >
                            <FiExternalLink className="text-xs" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveProductImage(url)}
                            className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-transform hover:scale-105 cursor-pointer"
                            title="Remove Image"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      </div>

                      {/* Position Change Controls */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleMoveProductImage(i, i - 1)}
                          disabled={i === 0}
                          className="p-1.5 bg-white/90 hover:bg-white text-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg shadow-xs transition-transform hover:scale-105 cursor-pointer"
                          title="Move Left"
                        >
                          <FiArrowLeft className="text-xs" />
                        </button>

                        {i > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryProductImage(i)}
                            className="flex-1 py-1 text-[10px] font-extrabold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer text-center truncate"
                            title="Set as Primary cover image"
                          >
                            Set Primary
                          </button>
                        ) : (
                          <span className="flex-1 text-[10px] font-bold text-center text-purple-200 truncate">
                            Cover Image
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMoveProductImage(i, i + 1)}
                          disabled={i === productImagesList.length - 1}
                          className="p-1.5 bg-white/90 hover:bg-white text-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg shadow-xs transition-transform hover:scale-105 cursor-pointer"
                          title="Move Right"
                        >
                          <FiArrowRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                <FiImage className="mx-auto text-3xl text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No images added yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Paste an image URL above to display it in the gallery.</p>
              </div>
            )}
          </div>

          {/* Descriptions & Policies */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm rounded-3xl p-6 sm:p-7">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2.5">
              <span className="w-2 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600"></span>
              Descriptions & Policies
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Warranty Period</label>
                <input
                  type="text"
                  name="warranty"
                  value={fullProduct.warranty || ''}
                  onChange={handleProductChange}
                  placeholder="e.g. 1 Year Manufacturer Warranty"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">7 Days Return Policy</label>
                <input
                  type="text"
                  name="sevenDaysReturn"
                  value={fullProduct.sevenDaysReturn || ''}
                  onChange={handleProductChange}
                  placeholder="e.g. Replacement only for defective items"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  name="description"
                  value={fullProduct.description || ''}
                  onChange={handleProductChange}
                  rows="3"
                  placeholder="Brief summary of the product..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-400 dark:placeholder-slate-500"
                ></textarea>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Product Specifications / Details</label>
                <textarea
                  name="details"
                  value={fullProduct.details || ''}
                  onChange={handleProductChange}
                  rows="3"
                  placeholder="Detailed specifications, dimensions, materials..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-400 dark:placeholder-slate-500"
                ></textarea>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Expert Notes</label>
                <textarea
                  name="expertNotes"
                  value={fullProduct.expertNotes || ''}
                  onChange={handleProductChange}
                  rows="3"
                  placeholder="Special instructions or expert advice for customers..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-400 dark:placeholder-slate-500"
                ></textarea>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Cancellation Policy</label>
                <textarea
                  name="cancellationPolicy"
                  value={fullProduct.cancellationPolicy || ''}
                  onChange={handleProductChange}
                  rows="2"
                  placeholder="Terms regarding order cancellations..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-400 dark:placeholder-slate-500"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT VARIANTS */}
      {activeTab === 'variants' && (
        <div className="space-y-5">
          {/* Variants Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Product Variants</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage color, size, and model variations with separate pricing and inventory.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  {expandedVariantIndex === 'all' ? 'Collapse All' : 'Expand All'}
                </button>
              )}
              <button
                type="button"
                onClick={handleAddVariant}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <FiPlus className="text-sm" /> Add Variant
              </button>
            </div>
          </div>

          {/* Variants List */}
          {variants.length > 0 ? (
            variants.map((variant, index) => {
              const isExpanded = expandedVariantIndex === 'all' || expandedVariantIndex === index;
              const variantImages = parseImageUrls(variant.image_urls);
              const primaryVariantImage = variantImages[0] || null;
              const variantDiscount = calculateDiscount(variant.price, variant.offerPrice);
              const stockQty = Number(variant.quantity) || 0;

              return (
                <div
                  key={index}
                  className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden transition-all"
                >
                  {/* Accordion Header */}
                  <div
                    className="flex flex-wrap items-center justify-between p-4 cursor-pointer hover:bg-slate-50/90 dark:hover:bg-white/5 transition-colors bg-slate-100/60 dark:bg-slate-800/40 gap-3"
                    onClick={() => {
                      if (expandedVariantIndex === 'all') {
                        setExpandedVariantIndex(index);
                      } else {
                        setExpandedVariantIndex(expandedVariantIndex === index ? null : index);
                      }
                    }}
                  >
                    {/* Left: Thumbnail & Name */}
                    <div className="flex items-center gap-3.5 min-w-[200px]">
                      {/* Mini Thumbnail */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs">
                        {primaryVariantImage ? (
                          <img
                            src={getImageUrl(primaryVariantImage, { width: 80, quality: 60 })}
                            alt={variant.name || 'Variant'}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => { e.target.src = 'https://placehold.co/80x80?text=No+Img'; }}
                          />
                        ) : (
                          <FiImage className="text-slate-400 text-base" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-xs">
                            {variant.name || <span className="text-slate-400 dark:text-slate-500 italic">Unnamed Variant</span>}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Summary Pill Badges */}
                    <div className="flex items-center flex-wrap gap-2">
                      {/* Price Pill */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
                        {variant.offerPrice ? (
                          <>
                            <span className="text-emerald-600 dark:text-emerald-400">₹{Number(variant.offerPrice).toLocaleString()}</span>
                            {variant.price && (
                              <span className="line-through text-slate-400 text-[10px]">₹{Number(variant.price).toLocaleString()}</span>
                            )}
                          </>
                        ) : variant.price ? (
                          <span>₹{Number(variant.price).toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400 italic">No price</span>
                        )}
                      </span>

                      {/* Stock Pill */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        stockQty > 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/30'
                      }`}>
                        {stockQty > 0 ? `${stockQty} in stock` : 'Out of stock'}
                      </span>

                      {/* Status Pill */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        variant.isActive !== false
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/30'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-white/10'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${variant.isActive !== false ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                        {variant.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg disabled:opacity-25 transition-colors cursor-pointer"
                          title="Move Up"
                        >
                          <FiArrowUp className="text-sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === variants.length - 1}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg disabled:opacity-25 transition-colors cursor-pointer"
                          title="Move Down"
                        >
                          <FiArrowDown className="text-sm" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
                        <button
                          type="button"
                          onClick={() => handleDuplicateVariant(index)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Variant"
                        >
                          <FiCopy className="text-sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete Variant"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>

                      <div className="w-px h-5 bg-slate-200 dark:bg-white/10"></div>
                      <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <FiChevronUp className="text-lg" /> : <FiChevronDown className="text-lg" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="p-6 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-black/20 space-y-6">
                      
                      {/* Name & Status */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Variant Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={e => handleChange(index, 'name', e.target.value)}
                            placeholder="e.g. Midnight Black / 128GB"
                            required
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-semibold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Status
                          </label>
                          <select
                            value={variant.isActive !== false ? 'active' : 'inactive'}
                            onChange={e => handleChange(index, 'isActive', e.target.value === 'active')}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-semibold"
                          >
                            <option value="active" className="bg-white dark:bg-slate-800">Active</option>
                            <option value="inactive" className="bg-white dark:bg-slate-800">Inactive</option>
                          </select>
                        </div>
                      </div>

                      {/* Stock & Retail Prices */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Stock Quantity
                          </label>
                          <input
                            type="number"
                            value={variant.quantity}
                            onChange={e => handleChange(index, 'quantity', e.target.value)}
                            placeholder="Available units"
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-semibold text-slate-900 dark:text-white dark:scheme-dark"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Base Price (MRP)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              value={variant.price}
                              onChange={e => handleChange(index, 'price', e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-semibold text-slate-900 dark:text-white dark:scheme-dark"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              Offer Price
                            </label>
                            {variantDiscount && (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                {variantDiscount.pct}% OFF
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              value={variant.offerPrice}
                              onChange={e => handleChange(index, 'offerPrice', e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-semibold text-slate-900 dark:text-white dark:scheme-dark"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Wholesale Tiers */}
                      <div className="p-4 bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl">
                        <span className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                          Wholesale / B2B Tiers for this variant
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">L1 Price</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">₹</span>
                              <input
                                type="number"
                                value={variant.l1Price}
                                onChange={e => handleChange(index, 'l1Price', e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-900 dark:text-white dark:scheme-dark"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">L2 Price</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">₹</span>
                              <input
                                type="number"
                                value={variant.l2Price}
                                onChange={e => handleChange(index, 'l2Price', e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-900 dark:text-white dark:scheme-dark"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">L3 Price</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">₹</span>
                              <input
                                type="number"
                                value={variant.l3Price}
                                onChange={e => handleChange(index, 'l3Price', e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-900 dark:text-white dark:scheme-dark"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Variant Quantity Pricing Slabs */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Variant Bulk Pricing Slabs
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddQuantityPricing(index)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors border border-blue-200 dark:border-blue-500/30 cursor-pointer"
                          >
                            <FiPlus className="text-xs" /> Add Slab
                          </button>
                        </div>

                        {(variant.quantityPricing || []).length > 0 ? (
                          <div className="space-y-2">
                            {(variant.quantityPricing || []).map((qp, qpIndex) => (
                              <div
                                key={qpIndex}
                                className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl"
                              >
                                <span className="text-xs font-bold text-slate-500 px-2">#{qpIndex + 1}</span>
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-xs text-slate-400">Min Qty:</span>
                                  <input
                                    type="number"
                                    value={qp.minQty}
                                    onChange={e => handleQuantityPricingChange(index, qpIndex, 'minQty', e.target.value)}
                                    placeholder="Qty"
                                    className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-900 dark:text-white dark:scheme-dark"
                                  />
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-xs text-slate-400">Price:</span>
                                  <div className="relative w-full">
                                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 text-xs font-bold">₹</span>
                                    <input
                                      type="number"
                                      value={qp.price}
                                      onChange={e => handleQuantityPricingChange(index, qpIndex, 'price', e.target.value)}
                                      placeholder="0.00"
                                      className="w-full pl-5 pr-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-900 dark:text-white dark:scheme-dark"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuantityPricing(index, qpIndex)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Remove Slab"
                                >
                                  <FiTrash2 className="text-sm" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                            No specific bulk slabs for this variant.
                          </div>
                        )}
                      </div>

                      {/* Variant Images Gallery (URL Based) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                          Variant Images ({variantImages.length})
                        </label>

                        {/* Add Variant Image URL Input Bar */}
                        <form onSubmit={(e) => handleAddVariantImage(index, e)} className="flex gap-2 mb-3">
                          <input
                            type="url"
                            value={newVariantImageUrls[index] || ''}
                            onChange={(e) => setNewVariantImageUrls(prev => ({ ...prev, [index]: e.target.value }))}
                            placeholder="Paste variant image URL..."
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400"
                          />
                          <button
                            type="submit"
                            disabled={!(newVariantImageUrls[index] || '').trim()}
                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <FiPlus className="text-sm" /> Add
                          </button>
                        </form>

                        {/* Variant Image Tiles */}
                        {variantImages.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {variantImages.map((url, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="group relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-white/10 bg-white shrink-0 shadow-xs hover:border-purple-400 dark:hover:border-purple-500 transition-all"
                              >
                                <img
                                  src={getImageUrl(url, { width: 150, quality: 65 })}
                                  alt={`Variant Img ${imgIdx + 1}`}
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => { e.target.src = 'https://placehold.co/120x120?text=Invalid'; }}
                                />

                                {/* Position Badge */}
                                <div className="absolute top-1.5 left-1.5 pointer-events-none">
                                  <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md shadow-xs ${
                                    imgIdx === 0
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-slate-900/80 text-white border border-white/20'
                                  }`}>
                                    {imgIdx === 0 ? '★ Primary' : `#${imgIdx + 1}`}
                                  </span>
                                </div>

                                {/* Action Overlay on hover */}
                                <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/80">
                                      #{imgIdx + 1}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 bg-white/90 hover:bg-white text-slate-800 rounded-md shadow-xs"
                                        title="Open Image"
                                      >
                                        <FiExternalLink className="text-[11px]" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVariantImage(index, url)}
                                        className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs cursor-pointer"
                                        title="Remove"
                                      >
                                        <FiTrash2 className="text-[11px]" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Position Change Controls */}
                                  <div className="flex items-center justify-between gap-1 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveVariantImage(index, imgIdx, imgIdx - 1)}
                                      disabled={imgIdx === 0}
                                      className="p-1 bg-white/90 hover:bg-white text-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-md shadow-xs cursor-pointer"
                                      title="Move Left"
                                    >
                                      <FiArrowLeft className="text-[10px]" />
                                    </button>

                                    {imgIdx > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimaryVariantImage(index, imgIdx)}
                                        className="flex-1 py-0.5 text-[9px] font-extrabold bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-xs cursor-pointer text-center truncate"
                                        title="Set as Primary cover image"
                                      >
                                        Primary
                                      </button>
                                    ) : (
                                      <span className="flex-1 text-[9px] font-bold text-center text-purple-200 truncate">
                                        Primary
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleMoveVariantImage(index, imgIdx, imgIdx + 1)}
                                      disabled={imgIdx === variantImages.length - 1}
                                      className="p-1 bg-white/90 hover:bg-white text-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-md shadow-xs cursor-pointer"
                                      title="Move Right"
                                    >
                                      <FiArrowRight className="text-[10px]" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <FiLayers className="mx-auto text-4xl text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">No variants configured</p>
              <p className="text-xs text-slate-400 mt-1">Add variants if this product comes in different colors, sizes, or models.</p>
            </div>
          )}

          {/* Big Add Variant Footer Button */}
          <button
            onClick={handleAddVariant}
            className="w-full py-4 border-2 border-dashed border-blue-300 dark:border-blue-500/30 rounded-2xl text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <FiPlus className="text-xl" /> Add Another Variant
          </button>
        </div>
      )}

      {/* Floating Bottom Sticky Action Bar */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-2xl z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {productName || 'Untitled Product'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {hasUnsavedChanges ? 'Unsaved changes present' : 'All changes synced'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasUnsavedChanges && (
            <button
              onClick={handleDiscard}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center px-5 py-2 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
          >
            {saving ? <FiLoader className="animate-spin mr-1.5 text-sm" /> : <FiSave className="mr-1.5 text-sm" />}
            Save Changes
          </button>
        </div>
      </div>

    </div>
  );
};

export default Variants;