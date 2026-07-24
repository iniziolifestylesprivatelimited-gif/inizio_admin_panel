import React, { useState, useEffect } from 'react';
import { api, BASE_URL } from '../../../api/axios';
import { 
  FiSliders, FiPlus, FiTrash2, FiSave, FiLoader, FiSearch, 
  FiCheck, FiX, FiChevronLeft, FiChevronRight, FiAlertCircle,
  FiBox, FiTag, FiGrid, FiGrid as FiList, FiPackage, FiInfo
} from 'react-icons/fi';
import CustomDropdown from '../../../Components/CustomDropdown';

// Helper to construct image URL
const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

export default function QuantitySlabs() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Rule Builder State
  const [slabRules, setSlabRules] = useState([
    {
      id: 1,
      applyCondition: 'stock_ge', // 'always' | 'stock_ge'
      minStock: 100,
      minQty: 100,
      discountType: 'percentage', // 'percentage' | 'flat'
      discountValue: 1,
      roundMode: 'round' // 'ceiling' | 'floor' | 'round' | 'none'
    },
    {
      id: 2,
      applyCondition: 'stock_ge',
      minStock: 500,
      minQty: 500,
      discountType: 'percentage',
      discountValue: 2,
      roundMode: 'round'
    }
  ]);
  
  const [basePriceField, setBasePriceField] = useState('offerPrice'); // 'offerPrice' | 'basePrice' | 'l1Price' | 'l2Price' | 'l3Price'
  const [replaceExisting, setReplaceExisting] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [variantFilter, setVariantFilter] = useState('all'); // 'all' | 'has_variants' | 'no_variants'
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Update Execution State
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [updateLogs, setUpdateLogs] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, brandRes, catRes] = await Promise.all([
        api.get('/products/'),
        api.get('/brands/').catch(() => ({ data: [] })),
        api.get('/categories/').catch(() => ({ data: [] }))
      ]);
      setProducts(prodRes.data || []);
      setBrands(brandRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      alert('Failed to load products list.');
    } finally {
      setLoading(false);
    }
  };

  // Preset configuration
  const loadDefaultPresets = () => {
    setSlabRules([
      {
        id: 1,
        applyCondition: 'stock_ge',
        minStock: 100,
        minQty: 100,
        discountType: 'percentage',
        discountValue: 1,
        roundMode: 'round'
      },
      {
        id: 2,
        applyCondition: 'stock_ge',
        minStock: 500,
        minQty: 500,
        discountType: 'percentage',
        discountValue: 2,
        roundMode: 'round'
      }
    ]);
    setBasePriceField('offerPrice');
  };

  // Rule additions/removals
  const addRule = () => {
    const newId = slabRules.length > 0 ? Math.max(...slabRules.map(r => r.id)) + 1 : 1;
    setSlabRules([
      ...slabRules,
      {
        id: newId,
        applyCondition: 'stock_ge',
        minStock: 100,
        minQty: 100,
        discountType: 'percentage',
        discountValue: 1,
        roundMode: 'round'
      }
    ]);
  };

  const removeRule = (id) => {
    setSlabRules(slabRules.filter(r => r.id !== id));
  };

  const updateRuleField = (id, field, value) => {
    setSlabRules(slabRules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Calculation Logic for Slabs
  const calculateSlabsForItem = (item, isVariant = false) => {
    const stock = isVariant ? (Number(item.quantity) || 0) : (Number(item.totalQuantity) || 0);
    
    // Find base price
    let basePrice = Number(item[basePriceField]) || 0;
    if (!basePrice) {
      // Fallbacks
      basePrice = Number(item.offerPrice) || Number(item.price) || Number(item.basePrice) || 0;
    }
    
    if (basePrice <= 0) return [];
    
    const generated = [];
    for (const rule of slabRules) {
      let applies = false;
      if (rule.applyCondition === 'always') {
        applies = true;
      } else if (rule.applyCondition === 'stock_ge') {
        applies = stock >= (Number(rule.minStock) || 0);
      }
      
      if (applies) {
        const minQty = Number(rule.minQty) || 0;
        if (minQty <= 0) continue;
        
        const discVal = Number(rule.discountValue) || 0;
        let calculatedPrice = basePrice;
        if (rule.discountType === 'percentage') {
          calculatedPrice = basePrice - (basePrice * (discVal / 100));
        } else {
          calculatedPrice = basePrice - discVal;
        }
        
        if (calculatedPrice < 0) calculatedPrice = 0;
        
        let finalPrice = calculatedPrice;
        if (rule.roundMode === 'ceiling') {
          finalPrice = Math.ceil(calculatedPrice);
        } else if (rule.roundMode === 'floor') {
          finalPrice = Math.floor(calculatedPrice);
        } else if (rule.roundMode === 'round') {
          finalPrice = Math.round(calculatedPrice);
        } else {
          finalPrice = Number(calculatedPrice.toFixed(2));
        }
        
        generated.push({ minQty, price: finalPrice });
      }
    }
    
    // Sort and deduplicate
    generated.sort((a, b) => a.minQty - b.minQty);
    const unique = [];
    const seen = new Set();
    for (let i = generated.length - 1; i >= 0; i--) {
      const s = generated[i];
      if (!seen.has(s.minQty)) {
        seen.add(s.minQty);
        unique.push(s);
      }
    }
    unique.reverse();
    return unique;
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    // Search filter
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.eanNumber?.toLowerCase().includes(search.toLowerCase());
    
    // Brand filter
    const brandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
    const matchesBrand = !selectedBrand || brandId === selectedBrand;
    
    // Category filter
    const catId = typeof p.category === 'object' ? p.category?._id : p.category;
    const matchesCategory = !selectedCategory || catId === selectedCategory;
    
    // Variants filter
    const hasVariants = p.variants && p.variants.length > 0;
    const matchesVariants = 
      variantFilter === 'all' ? true :
      variantFilter === 'has_variants' ? hasVariants : !hasVariants;
      
    // Stock filter
    const stock = Number(p.totalQuantity) || 0;
    const matchesStock = 
      stockFilter === 'all' ? true :
      stockFilter === 'in_stock' ? stock > 0 :
      stockFilter === 'low_stock' ? stock < 100 : stock === 0;
      
    return matchesSearch && matchesBrand && matchesCategory && matchesVariants && matchesStock;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentItems = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const handleSelectToggle = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredProducts.map(p => p._id);
    const areAllSelected = allFilteredIds.every(id => selectedIds.has(id));
    
    const newSelected = new Set(selectedIds);
    if (areAllSelected) {
      // Remove all filtered from selection
      allFilteredIds.forEach(id => newSelected.delete(id));
    } else {
      // Add all filtered to selection
      allFilteredIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  // Execution: Bulk updating
  const applySlabs = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one product.');
      return;
    }
    
    if (slabRules.length === 0 && replaceExisting) {
      const confirmClear = window.confirm('You have no slab rules defined and "Replace Slabs" is checked. This will remove all quantity slabs from the selected items. Proceed?');
      if (!confirmClear) return;
    }

    setIsUpdating(true);
    setShowStatusModal(true);
    setUpdateProgress({ current: 0, total: selectedIds.size });
    setUpdateLogs([]);

    const selectedList = products.filter(p => selectedIds.has(p._id));
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedList.length; i++) {
      const product = selectedList[i];
      setUpdateProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        const formData = new FormData();
        formData.append('name', product.name || '');
        formData.append('description', product.description || '');
        formData.append('details', product.details || '');
        formData.append('expertNotes', product.expertNotes || '');
        formData.append('basePrice', product.basePrice || 0);
        formData.append('offerPrice', product.offerPrice || 0);
        formData.append('l1Price', product.l1Price || 0);
        formData.append('l2Price', product.l2Price || 0);
        formData.append('l3Price', product.l3Price || 0);
        formData.append('eanNumber', product.eanNumber || '');
        formData.append('totalQuantity', product.totalQuantity || 0);
        formData.append('cancellationPolicy', product.cancellationPolicy || '');
        formData.append('sevenDaysReturn', product.sevenDaysReturn || '');
        formData.append('warranty', product.warranty || '');

        const brandId = typeof product.brand === 'object' ? product.brand?._id : product.brand;
        const catId = typeof product.category === 'object' ? product.category?._id : product.category;
        if (brandId) formData.append('brand', brandId);
        if (catId) formData.append('category', catId);

        if (product.images && product.images.length > 0) {
          formData.append('images', JSON.stringify(product.images));
        }

        let updatedSlabs = product.quantityPricing || [];
        let updatedVariants = product.variants ? product.variants.map(v => ({ ...v })) : [];

        if (product.variants && product.variants.length > 0) {
          // Rule: If product has variants, add slabs to variants only
          updatedSlabs = replaceExisting ? [] : (product.quantityPricing || []);
          updatedVariants = updatedVariants.map(v => {
            const calculatedSlabs = calculateSlabsForItem(v, true);
            const finalSlabs = replaceExisting ? calculatedSlabs : [
              ...(v.quantityPricing || []),
              ...calculatedSlabs
            ];
            // Deduplicate if merging
            const cleanSlabs = [];
            const seenQty = new Set();
            for (let k = finalSlabs.length - 1; k >= 0; k--) {
              if (!seenQty.has(finalSlabs[k].minQty)) {
                seenQty.add(finalSlabs[k].minQty);
                cleanSlabs.push(finalSlabs[k]);
              }
            }
            return {
              ...v,
              quantityPricing: cleanSlabs.reverse().sort((a, b) => a.minQty - b.minQty)
            };
          });
        } else {
          // Apply to parent directly
          const calculatedSlabs = calculateSlabsForItem(product, false);
          const finalSlabs = replaceExisting ? calculatedSlabs : [
            ...(product.quantityPricing || []),
            ...calculatedSlabs
          ];
          const cleanSlabs = [];
          const seenQty = new Set();
          for (let k = finalSlabs.length - 1; k >= 0; k--) {
            if (!seenQty.has(finalSlabs[k].minQty)) {
              seenQty.add(finalSlabs[k].minQty);
              cleanSlabs.push(finalSlabs[k]);
            }
          }
          updatedSlabs = cleanSlabs.reverse().sort((a, b) => a.minQty - b.minQty);
        }

        formData.append('quantityPricing', JSON.stringify(updatedSlabs));
        formData.append('variants', JSON.stringify(updatedVariants));

        await api.put(`/products/${product._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        successCount++;
        setUpdateLogs(prev => [
          ...prev, 
          { 
            name: product.name, 
            status: 'success', 
            message: `Updated successfully. ${product.variants?.length > 0 ? `${product.variants.length} variant slabs calculated.` : `${updatedSlabs.length} slabs applied.`}` 
          }
        ]);
      } catch (err) {
        errorCount++;
        console.error(`Error updating product ${product.name}:`, err);
        setUpdateLogs(prev => [
          ...prev, 
          { 
            name: product.name, 
            status: 'error', 
            message: err.response?.data?.message || err.message || 'Failed to update.' 
          }
        ]);
      }
    }

    setIsUpdating(false);
    fetchData(); // reload products to show latest state
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <FiSliders size={24} />
            </span>
            Bulk Quantity Slabs Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Configure dynamic price discount slabs and apply them globally or conditionally to products and variants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDefaultPresets}
            className="px-4 py-2 text-xs font-bold bg-slate-900 border border-white/10 text-slate-300 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <FiInfo size={14} className="text-blue-400" />
            Load 100+ & 500+ presets
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Configuration Builder (Col span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Slab Settings Box */}
          <div className="bg-slate-900/40 border border-white/10 backdrop-blur-2xl rounded-3xl p-5 md:p-6 space-y-5 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
              Slab Pricing Rules
            </h2>

            {/* Base Field dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Discount Calculation Base Price
              </label>
              <select
                value={basePriceField}
                onChange={(e) => setBasePriceField(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
              >
                <option value="offerPrice">Offer Price (Default)</option>
                <option value="basePrice">Base Price</option>
                <option value="l1Price">L1 Price</option>
                <option value="l2Price">L2 Price</option>
                <option value="l3Price">L3 Price</option>
              </select>
            </div>

            {/* Slabs configuration block */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Slab Configurations
              </label>
              
              {slabRules.length === 0 ? (
                <div className="text-center py-6 bg-slate-950/40 border border-dashed border-white/10 rounded-2xl text-slate-500 text-sm">
                  No slab rules configured. Slabs will be cleared on apply.
                </div>
              ) : (
                <div className="space-y-4">
                  {slabRules.map((rule, idx) => (
                    <div key={rule.id} className="relative p-4 bg-slate-950 border border-white/10 rounded-2xl space-y-3 shadow-md group">
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                        title="Remove Rule"
                      >
                        <FiTrash2 size={13} />
                      </button>

                      <div className="text-xs font-bold text-blue-400">
                        Rule #{idx + 1}
                      </div>

                      {/* Conditions */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Apply Condition</label>
                          <select
                            value={rule.applyCondition}
                            onChange={(e) => updateRuleField(rule.id, 'applyCondition', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-white/5 text-slate-300 rounded-lg text-xs"
                          >
                            <option value="stock_ge">If Stock &ge;</option>
                            <option value="always">Always Apply</option>
                          </select>
                        </div>
                        {rule.applyCondition === 'stock_ge' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Stock Threshold</label>
                            <input
                              type="number"
                              value={rule.minStock}
                              onChange={(e) => updateRuleField(rule.id, 'minStock', Number(e.target.value))}
                              placeholder="100"
                              className="w-full px-2 py-1 bg-slate-900 border border-white/5 text-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {/* Slab Details */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Slab Min Qty</label>
                          <input
                            type="number"
                            value={rule.minQty}
                            onChange={(e) => updateRuleField(rule.id, 'minQty', Number(e.target.value))}
                            placeholder="100"
                            className="w-full px-2 py-1 bg-slate-900 border border-white/5 text-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Discount Type</label>
                          <select
                            value={rule.discountType}
                            onChange={(e) => updateRuleField(rule.id, 'discountType', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-white/5 text-slate-300 rounded-lg text-xs"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="flat">Flat (₹)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Value</label>
                          <input
                            type="number"
                            value={rule.discountValue}
                            onChange={(e) => updateRuleField(rule.id, 'discountValue', Number(e.target.value))}
                            placeholder="1"
                            className="w-full px-2 py-1 bg-slate-900 border border-white/5 text-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {/* Rounding Mode */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Rounding Mode</label>
                        <select
                          value={rule.roundMode}
                          onChange={(e) => updateRuleField(rule.id, 'roundMode', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-white/5 text-slate-300 rounded-lg text-xs"
                        >
                          <option value="round">Round (&ge; 0.5 up, &lt; 0.5 floor) (Recommended)</option>
                          <option value="ceiling">Ceiling / Always Round Up</option>
                          <option value="floor">Floor / Always Round Down</option>
                          <option value="none">No Rounding</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addRule}
                className="w-full py-2.5 border border-dashed border-blue-500/30 text-blue-400 bg-blue-950/10 hover:bg-blue-950/20 hover:border-blue-500/50 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FiPlus size={14} /> Add Slab Rule
              </button>
            </div>

            {/* Overwrite Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/5 rounded-2xl">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-bold text-white">Overwrite existing slabs</div>
                <div className="text-[10px] text-slate-400 leading-normal">
                  If checked, replaces existing product/variant quantity slabs with these computed ones. Otherwise, merges them.
                </div>
              </div>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 bg-slate-800 border-white/10 focus:ring-blue-500 focus:ring-offset-slate-950 focus:ring-2 cursor-pointer"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={applySlabs}
              disabled={selectedIds.size === 0 || isUpdating}
              className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm cursor-pointer ${
                selectedIds.size > 0 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/10' 
                  : 'bg-slate-800 text-slate-400 border border-white/5 cursor-not-allowed'
              }`}
            >
              <FiSave size={16} />
              {isUpdating ? 'Applying Slabs...' : `Apply & Save to ${selectedIds.size} Selected Items`}
            </button>
          </div>
        </div>

        {/* Right Side: Product Selection & Preview Grid (Col span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Products & Filters Box */}
          <div className="bg-slate-900/40 border border-white/10 backdrop-blur-2xl rounded-3xl p-5 md:p-6 space-y-5 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                Select Products & View Previews
              </span>
              {selectedIds.size > 0 && (
                <span className="text-xs px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-full font-bold">
                  {selectedIds.size} Selected
                </span>
              )}
            </h2>

            {/* Filters Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-center gap-3 bg-slate-950 border border-white/5 p-3 rounded-2xl">
              {/* Search */}
              <div className="col-span-1 sm:col-span-2 relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by name, EAN..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              {/* Brand Filter */}
              <div>
                <CustomDropdown
                  value={selectedBrand ? (brands.find(b => b._id === selectedBrand)?.name || 'All Brands') : 'All Brands'}
                  options={['All Brands', ...brands.map(b => b.name)]}
                  onChange={(option) => {
                    setCurrentPage(1);
                    if (option === 'All Brands') {
                      setSelectedBrand('');
                    } else {
                      const found = brands.find(b => b.name === option);
                      if (found) setSelectedBrand(found._id);
                    }
                  }}
                  statusColor="bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-800/60 hover:text-white"
                />
              </div>

              {/* Category Filter */}
              <div>
                <CustomDropdown
                  value={selectedCategory ? (categories.find(c => c._id === selectedCategory)?.name || 'All Categories') : 'All Categories'}
                  options={['All Categories', ...categories.map(c => c.name)]}
                  onChange={(option) => {
                    setCurrentPage(1);
                    if (option === 'All Categories') {
                      setSelectedCategory('');
                    } else {
                      const found = categories.find(c => c.name === option);
                      if (found) setSelectedCategory(found._id);
                    }
                  }}
                  statusColor="bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-800/60 hover:text-white"
                />
              </div>

              {/* Variants Filter */}
              <div className="sm:col-span-1">
                <select
                  value={variantFilter}
                  onChange={(e) => { setVariantFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 text-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                  <option value="all">All Product Types</option>
                  <option value="has_variants">Has Variants Only</option>
                  <option value="no_variants">No Variants Only</option>
                </select>
              </div>

              {/* Stock Filter */}
              <div className="sm:col-span-1">
                <select
                  value={stockFilter}
                  onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 text-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="in_stock">In Stock (&gt; 0)</option>
                  <option value="low_stock">Low Stock (&lt; 100)</option>
                  <option value="out_of_stock">Out of Stock (= 0)</option>
                </select>
              </div>
            </div>

            {/* List and Live Preview */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <FiLoader className="animate-spin text-blue-500" size={28} />
                <div className="text-sm">Loading products list...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-slate-950/30 border border-white/5 rounded-3xl text-slate-400">
                <FiBox size={32} className="mx-auto text-slate-600 mb-3" />
                <div className="text-sm font-medium">No products match the selected criteria.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/40">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-white/5 text-slate-400 font-semibold">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p._id))}
                            onChange={handleSelectAll}
                            className="w-3.5 h-3.5 rounded text-blue-500 bg-slate-800 border-white/10 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Product Name & Type</th>
                        <th className="p-3">Base Price field value</th>
                        <th className="p-3">Current Stock</th>
                        <th className="p-3">Computed Slab Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentItems.map((product) => {
                        const isSelected = selectedIds.has(product._id);
                        const hasVariants = product.variants && product.variants.length > 0;
                        
                        // Calculated slabs for display
                        let slabsPreview = [];
                        let pBasePriceVal = Number(product[basePriceField]) || Number(product.offerPrice) || Number(product.price) || Number(product.basePrice) || 0;

                        if (hasVariants) {
                          // Preview for variants
                          slabsPreview = product.variants.map(v => {
                            const computed = calculateSlabsForItem(v, true);
                            return { name: v.name, stock: v.quantity, slabs: computed };
                          });
                        } else {
                          slabsPreview = [{
                            name: null,
                            stock: product.totalQuantity,
                            slabs: calculateSlabsForItem(product, false)
                          }];
                        }

                        return (
                          <tr 
                            key={product._id} 
                            className={`hover:bg-white/[0.02] transition-colors ${
                              isSelected ? 'bg-blue-500/[0.02]' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center align-top">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectToggle(product._id)}
                                className="w-3.5 h-3.5 rounded text-blue-500 bg-slate-800 border-white/10 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Name / Info */}
                            <td className="p-3 align-top max-w-[200px]">
                              <div className="flex gap-2">
                                {product.images && product.images[0] ? (
                                  <img
                                    src={getImageUrl(product.images[0])}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-contain bg-white shrink-0 p-0.5 border border-white/10"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center border border-white/10 text-slate-500">
                                    <FiPackage size={14} />
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-slate-100 line-clamp-2">{product.name}</div>
                                  <div className="flex gap-1.5 items-center mt-1">
                                    {hasVariants ? (
                                      <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] rounded font-bold uppercase">
                                        Variants ({product.variants.length})
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] rounded font-bold uppercase">
                                        Standard
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500">{product.eanNumber || 'No EAN'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Prices */}
                            <td className="p-3 align-top">
                              <div className="space-y-0.5">
                                <div className="text-slate-400">
                                  {basePriceField}: <span className="text-emerald-400 font-bold">₹{pBasePriceVal}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Base: ₹{product.basePrice || 0} | Offer: ₹{product.offerPrice || 0}
                                </div>
                              </div>
                            </td>

                            {/* Stock */}
                            <td className="p-3 align-top font-medium">
                              <span className={product.totalQuantity > 0 ? 'text-slate-300' : 'text-red-400 font-bold'}>
                                {product.totalQuantity || 0} pcs
                              </span>
                            </td>

                            {/* Slab Preview */}
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {slabsPreview.map((item, idx) => (
                                  <div key={idx} className="bg-slate-900/60 p-1.5 rounded-lg border border-white/5">
                                    {item.name && (
                                      <div className="text-[9px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                                        <span>Variant: {item.name}</span>
                                        <span className="text-slate-500">Stock: {item.stock}</span>
                                      </div>
                                    )}
                                    {item.slabs.length === 0 ? (
                                      <div className="text-[10px] text-slate-500 italic">No slabs matching rules</div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {item.slabs.map((slab, sIdx) => (
                                          <span 
                                            key={sIdx} 
                                            className="inline-block px-1.5 py-0.5 bg-blue-950 border border-blue-500/20 text-[10px] text-blue-300 rounded font-medium"
                                          >
                                            {slab.minQty}+ &rarr; ₹{slab.price}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="text-[11px] text-slate-400">
                      Showing Page {currentPage} of {totalPages} ({filteredProducts.length} items total)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                      >
                        <FiChevronLeft size={16} />
                      </button>
                      
                      {Array.from({ length: totalPages }).map((_, pageIdx) => {
                        const pageNum = pageIdx + 1;
                        // Render subset of page numbers for clean UX
                        if (
                          pageNum === 1 || 
                          pageNum === totalPages || 
                          Math.abs(pageNum - currentPage) <= 1
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                                currentPage === pageNum 
                                  ? 'bg-blue-600 text-white' 
                                  : 'border border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          pageNum === 2 || 
                          pageNum === totalPages - 1
                        ) {
                          return <span key={pageNum} className="text-slate-600 text-xs px-0.5">...</span>;
                        }
                        return null;
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                      >
                        <FiChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Log Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all">
          <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <FiSliders size={18} className="text-blue-400 animate-spin" />
                Updating Pricing Slabs
              </h3>
              {!isUpdating && (
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              )}
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Progress</span>
                  <span>{updateProgress.current} / {updateProgress.total} items</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Header */}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Operation Logs
              </div>

              {/* Logs output */}
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-3 h-64 overflow-y-auto font-mono text-[10px] space-y-2">
                {updateLogs.length === 0 ? (
                  <div className="text-slate-600 italic">Starting bulk operation...</div>
                ) : (
                  updateLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                        log.status === 'success' 
                          ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400' 
                          : 'bg-red-950/20 border-red-500/10 text-red-400'
                      }`}
                    >
                      <div className="flex justify-between font-bold text-[11px]">
                        <span>{log.name}</span>
                        <span>{log.status.toUpperCase()}</span>
                      </div>
                      <div className="opacity-80 text-[10px]">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex justify-end bg-slate-950/40">
              <button
                disabled={isUpdating}
                onClick={() => setShowStatusModal(false)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isUpdating 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isUpdating ? 'Executing Bulk Job...' : 'Close & Refresh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
