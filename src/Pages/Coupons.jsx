import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useConfirm } from '../Context/ConfirmationContext';
import { 
  FiPercent, FiTrash2, FiPlus, FiTag, FiShoppingBag, 
  FiLayers, FiList, FiTrendingUp, FiSearch, FiX, 
  FiCheckCircle, FiInfo, FiLoader, FiPlayCircle, FiCopy,
  FiChevronDown, FiSliders, FiUsers
} from 'react-icons/fi';

const Coupons = () => {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [activePromotions, setActivePromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Creation form state
  const [form, setForm] = useState({
    name: '',
    code: '',
    isAutomatic: false,
    discountType: 'flat',
    discountValue: '',
    minOrderValue: '',
    maxDiscount: '',
    minQuantity: '',
    quantityMatching: '',
    applicability: 'global',
    discountApplyTo: 'entire_cart',
    customerEligibility: 'all',
    maxUsesPerUser: '',
    isActive: true
  });

  // Category/Product Selection for applicableIds
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Validation tester state
  const [testCode, setTestCode] = useState('');
  const [testCart, setTestCart] = useState([]);
  const [selectedTestProduct, setSelectedTestProduct] = useState('');
  const [selectedTestVariant, setSelectedTestVariant] = useState('');
  const [testQuantity, setTestQuantity] = useState(1);
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoadingRules(true);
      setError(null);
      const [rulesRes, productsRes, categoriesRes] = await Promise.all([
        api.get('/discount/all').catch(() => ({ data: [] })),
        api.get('/products/').catch(() => ({ data: [] })),
        api.get('/categories/').catch(() => ({ data: [] }))
      ]);

      setRules(Array.isArray(rulesRes.data) ? rulesRes.data : rulesRes.data?.rules || []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.products || []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : categoriesRes.data?.categories || []);
      setLoadingRules(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch coupon data from server.');
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch promotions when switching to that tab
  const fetchPromotions = async () => {
    try {
      setLoadingPromotions(true);
      const res = await api.get('/discount/active-promotions');
      setActivePromotions(Array.isArray(res.data) ? res.data : res.data?.promotions || []);
      setLoadingPromotions(false);
    } catch (err) {
      console.error(err);
      setLoadingPromotions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'promotions') {
      fetchPromotions();
    }
  }, [activeTab]);

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddApplicableId = (id) => {
    if (id && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRemoveApplicableId = (id) => {
    setSelectedIds(selectedIds.filter(item => item !== id));
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    // Prepare payload
    const payload = {
      ...form,
      discountValue: Number(form.discountValue),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      minQuantity: form.minQuantity ? Number(form.minQuantity) : undefined,
      maxUsesPerUser: form.maxUsesPerUser ? Number(form.maxUsesPerUser) : undefined,
      applicableIds: form.applicability !== 'global' ? selectedIds : [],
      quantityMatching: form.quantityMatching || undefined
    };

    try {
      await api.post('/discount/create', payload);
      setSuccessMsg('Discount rule created successfully!');
      
      // Reset form
      setForm({
        name: '',
        code: '',
        isAutomatic: false,
        discountType: 'flat',
        discountValue: '',
        minOrderValue: '',
        maxDiscount: '',
        minQuantity: '',
        quantityMatching: '',
        applicability: 'global',
        discountApplyTo: 'entire_cart',
        customerEligibility: 'all',
        maxUsesPerUser: '',
        isActive: true
      });
      setSelectedIds([]);
      
      // Refresh list
      fetchData();
      
      // Switch tab
      setTimeout(() => {
        setActiveTab('rules');
        setSuccessMsg(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create discount rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id) => {
    const isConfirmed = await confirm('Are you sure you want to delete this discount rule?');
    if (!isConfirmed) return;
    try {
      await api.delete(`/discount/delete/${id}`);
      setRules(rules.filter(r => r._id !== id));
      setSuccessMsg('Rule deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete discount rule.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleReuseRule = (rule) => {
    setForm({
      name: `${rule.name} (Copy)`,
      code: rule.code ? `${rule.code}_COPY` : '',
      isAutomatic: rule.isAutomatic || false,
      discountType: rule.discountType || 'flat',
      discountValue: rule.discountValue !== undefined ? rule.discountValue.toString() : '',
      minOrderValue: rule.minOrderValue !== undefined ? rule.minOrderValue.toString() : '',
      maxDiscount: rule.maxDiscount !== undefined ? rule.maxDiscount.toString() : '',
      minQuantity: rule.minQuantity !== undefined ? rule.minQuantity.toString() : '',
      quantityMatching: rule.quantityMatching || '',
      applicability: rule.applicability || 'global',
      discountApplyTo: rule.discountApplyTo || 'entire_cart',
      customerEligibility: rule.customerEligibility || 'all',
      maxUsesPerUser: rule.maxUsesPerUser !== undefined ? rule.maxUsesPerUser.toString() : '',
      isActive: rule.isActive !== undefined ? rule.isActive : true
    });
    setSelectedIds(Array.isArray(rule.applicableIds) ? [...rule.applicableIds] : []);
    setActiveTab('create');
    setSuccessMsg('Loaded coupon details into form. Modify and submit to save as new!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Test validation handlers
  const handleAddToTestCart = () => {
    if (!selectedTestProduct) return;
    const prod = products.find(p => p._id === selectedTestProduct);
    if (!prod) return;

    const variant = prod.variants?.find(v => v._id === selectedTestVariant);

    const newItem = {
      product: prod._id,
      name: prod.name,
      variantId: selectedTestVariant || undefined,
      variantName: variant?.name || '',
      quantity: Number(testQuantity)
    };

    setTestCart([...testCart, newItem]);
    setSelectedTestProduct('');
    setSelectedTestVariant('');
    setTestQuantity(1);
  };

  const handleRemoveFromTestCart = (index) => {
    setTestCart(testCart.filter((_, i) => i !== index));
  };

  const handleValidateCoupon = async () => {
    if (!testCode) {
      setValidationError('Please enter a coupon code.');
      return;
    }
    if (testCart.length === 0) {
      setValidationError('Please add at least one item to the cart.');
      return;
    }

    setValidating(true);
    setValidationError(null);
    setValidationResult(null);

    const payload = {
      couponCode: testCode,
      items: testCart.map(item => ({
        product: item.product,
        quantity: item.quantity,
        variantId: item.variantId
      }))
    };

    try {
      const res = await api.post('/discount/validate', payload);
      setValidationResult(res.data);
    } catch (err) {
      console.error(err);
      setValidationError(err.response?.data?.message || err.response?.data?.error || 'Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  // Helper selectors
  const applicableItemsOptions = form.applicability === 'category' ? categories : products;
  const filteredOptions = applicableItemsOptions.filter(opt => {
    const name = opt.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedIds.includes(opt._id);
  });

  const getApplicableName = (id) => {
    const item = form.applicability === 'category' 
      ? categories.find(c => c._id === id) 
      : products.find(p => p._id === id);
    return item?.name || id;
  };

  const selectedTestProductObj = products.find(p => p._id === selectedTestProduct);

  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full">


      {/* Header */}
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiPercent className="text-blue-400" /> Coupon & Discount Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create, manage, and test automated discount rules and promotional codes.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <FiCheckCircle className="text-emerald-400 text-xl shrink-0" />
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <FiInfo className="text-red-400 text-xl shrink-0" />
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center gap-1 border-b border-white/10 z-10 relative">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'rules' 
              ? 'border-blue-500 text-white bg-white/5 rounded-t-xl' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/2'
          }`}
        >
          <FiList /> Discount Rules
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'create' 
              ? 'border-blue-500 text-white bg-white/5 rounded-t-xl' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/2'
          }`}
        >
          <FiPlus /> Create New Rule
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'promotions' 
              ? 'border-blue-500 text-white bg-white/5 rounded-t-xl' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/2'
          }`}
        >
          <FiTrendingUp /> Active Promotions
        </button>
        <button
          onClick={() => setActiveTab('tester')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'tester' 
              ? 'border-blue-500 text-white bg-white/5 rounded-t-xl' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/2'
          }`}
        >
          <FiPlayCircle /> Coupon Tester
        </button>
      </div>

      {/* Tab Content */}
      <div className="relative z-10 w-full">
        
        {/* Tab 1: Rules List */}
        {activeTab === 'rules' && (
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6 overflow-hidden">
            {loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <FiLoader className="animate-spin text-blue-400 text-3xl" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FiTag className="mx-auto text-4xl mb-3 text-slate-600" />
                <p>No discount rules created yet.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  <FiPlus /> Add First Rule
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-4">Name</th>
                      <th className="py-4 px-4">Code / Triggers</th>
                      <th className="py-4 px-4">Type</th>
                      <th className="py-4 px-4">Value</th>
                      <th className="py-4 px-4">Applicability</th>
                      <th className="py-4 px-4">Constraints</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {rules.map((rule) => (
                      <tr key={rule._id} className="hover:bg-white/2 transition-colors">
                        <td className="py-4 px-4 font-semibold text-white">
                          <div>{rule.name}</div>
                          <div className="text-xs font-normal text-slate-500 mt-0.5">
                            ID: {rule._id}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-blue-500/10 text-blue-400 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-500/20">
                            {rule.code || 'AUTOMATIC'}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                            {rule.isAutomatic ? '⚡ Auto-applied' : '🔑 Manual Coupon'}
                          </div>
                        </td>
                        <td className="py-4 px-4 capitalize text-slate-300 font-medium">
                          {rule.discountType}
                        </td>
                        <td className="py-4 px-4 font-bold text-white">
                          {rule.discountType === 'flat' ? `₹${rule.discountValue.toLocaleString()}` : `${rule.discountValue}%`}
                        </td>
                        <td className="py-4 px-4">
                          <span className="capitalize text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-semibold">
                            {rule.applicability}
                          </span>
                          {rule.applicableIds && rule.applicableIds.length > 0 && (
                            <div className="text-xs text-slate-500 mt-1.5 font-medium">
                              {rule.applicableIds.length} items targeted
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400 space-y-1 font-medium">
                          {rule.minOrderValue ? (
                            <div>Min Order: <strong className="text-white">₹{rule.minOrderValue.toLocaleString()}</strong></div>
                          ) : null}
                          {rule.minQuantity ? (
                            <div>Min Qty: <strong className="text-white">{rule.minQuantity}</strong> ({rule.quantityMatching})</div>
                          ) : null}
                          {rule.maxDiscount ? (
                            <div>Max Cap: <strong className="text-white">₹{rule.maxDiscount.toLocaleString()}</strong></div>
                          ) : null}
                          {!rule.minOrderValue && !rule.minQuantity && !rule.maxDiscount ? (
                            <span className="text-slate-600">-</span>
                          ) : null}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            rule.isActive 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rule.isActive ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleReuseRule(rule)}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer mr-1"
                            title="Reuse / Duplicate Rule"
                          >
                            <FiCopy />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule._id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Rule"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Form */}
        {activeTab === 'create' && (
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiPlus className="text-blue-400" /> Create New Discount Rule
              </h2>
              <p className="text-slate-400 text-xs mt-1">Configure parameters for automatic or coupon discount rates.</p>
            </div>
            
            <form onSubmit={handleCreateRule} className="space-y-8">
              
              {/* Section 1: Basic Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <FiTag className="text-base" /> Basic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/20 p-6 rounded-2xl border border-white/5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Rule Name</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      placeholder="e.g. B2B Auto 100K Flat Promo"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-600 transition-all text-sm font-medium hover:border-white/20"
                      required
                    />
                    <p className="text-[10px] text-slate-500">Internal descriptive name for this promo rule.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Promo Code</label>
                    <input
                      type="text"
                      name="code"
                      value={form.code}
                      onChange={handleFormChange}
                      placeholder="e.g. AUTO_B2B_100K"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-600 transition-all font-mono text-sm font-medium hover:border-white/20"
                      required={!form.isAutomatic}
                    />
                    <p className="text-[10px] text-slate-500">Required if code is manual. Enter coupon key code.</p>
                  </div>
                </div>

                {/* Switches Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/20 p-4 rounded-2xl border border-white/5">
                  {/* Automatic Application Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                    <div className="space-y-0.5">
                      <span className="block text-sm font-bold text-white">Is Automatic Application?</span>
                      <span className="block text-xs text-slate-400">Rule will be auto-applied when requirements are met.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, isAutomatic: !prev.isAutomatic }))}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                        form.isAutomatic ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                          form.isAutomatic ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>
                  </div>

                  {/* Active & Enabled Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                    <div className="space-y-0.5">
                      <span className="block text-sm font-bold text-white">Is Active & Enabled?</span>
                      <span className="block text-xs text-slate-400">Toggle live status of this rule.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                        form.isActive ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                          form.isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Discount Configuration */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <FiPercent className="text-base" /> Discount Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/20 p-6 rounded-2xl border border-white/5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Discount Type</label>
                    <div className="relative">
                      <select
                        name="discountType"
                        value={form.discountType}
                        onChange={handleFormChange}
                        className="w-full pl-4 pr-10 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white cursor-pointer appearance-none text-sm font-medium hover:border-white/20 transition-all"
                      >
                        <option value="flat" className="bg-slate-900 text-white">Flat Amount (₹)</option>
                        <option value="percentage" className="bg-slate-900 text-white">Percentage (%)</option>
                      </select>
                      <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Discount Value</label>
                    <input
                      type="number"
                      name="discountValue"
                      value={form.discountValue}
                      onChange={handleFormChange}
                      placeholder="e.g. 10000 or 10"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-600 transition-all text-sm font-medium hover:border-white/20"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Max Discount Limit {form.discountType === 'flat' && <span className="text-[10px] text-slate-500 lowercase">(Optional)</span>}
                    </label>
                    <input
                      type="number"
                      name="maxDiscount"
                      value={form.maxDiscount}
                      onChange={handleFormChange}
                      placeholder="e.g. 50000"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-600 transition-all text-sm font-medium hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={form.discountType === 'flat'}
                    />
                    <p className="text-[10px] text-slate-500">Only applicable for percentage discounts.</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Usage Constraints */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <FiSliders className="text-base" /> Usage Constraints
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-slate-950/20 p-6 rounded-2xl border border-white/5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Min Order Value (₹)</label>
                    <input
                      type="number"
                      name="minOrderValue"
                      value={form.minOrderValue}
                      onChange={handleFormChange}
                      placeholder="e.g. 200000"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-600 transition-all text-sm font-medium hover:border-white/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Min Quantity threshold</label>
                    <input
                      type="number"
                      name="minQuantity"
                      value={form.minQuantity}
                      onChange={handleFormChange}
                      placeholder="e.g. 1000"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-600 transition-all text-sm font-medium hover:border-white/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Quantity Matching Scope</label>
                    <div className="relative">
                      <select
                        name="quantityMatching"
                        value={form.quantityMatching}
                        onChange={handleFormChange}
                        className="w-full pl-4 pr-10 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white cursor-pointer appearance-none text-sm font-medium hover:border-white/20 transition-all"
                      >
                        <option value="" className="bg-slate-900 text-white">None / Cart Total</option>
                        <option value="per_category" className="bg-slate-900 text-white">Per Category (Category volume)</option>
                        <option value="per_product" className="bg-slate-900 text-white">Per Product (Product volume)</option>
                      </select>
                      <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Max Uses per User</label>
                    <input
                      type="number"
                      name="maxUsesPerUser"
                      value={form.maxUsesPerUser}
                      onChange={handleFormChange}
                      placeholder="e.g. 1"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-600 transition-all text-sm font-medium hover:border-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Targeting & Applicability */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <FiUsers className="text-base" /> Targeting & Applicability
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/20 p-6 rounded-2xl border border-white/5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Applicability Scope</label>
                    <div className="relative">
                      <select
                        name="applicability"
                        value={form.applicability}
                        onChange={handleFormChange}
                        className="w-full pl-4 pr-10 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white cursor-pointer appearance-none text-sm font-medium hover:border-white/20 transition-all"
                      >
                        <option value="global" className="bg-slate-900 text-white">Global (All items)</option>
                        <option value="category" className="bg-slate-900 text-white">Category-specific</option>
                        <option value="product" className="bg-slate-900 text-white">Product-specific</option>
                      </select>
                      <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Apply Discount To</label>
                    <div className="relative">
                      <select
                        name="discountApplyTo"
                        value={form.discountApplyTo}
                        onChange={handleFormChange}
                        className="w-full pl-4 pr-10 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white cursor-pointer appearance-none text-sm font-medium hover:border-white/20 transition-all"
                      >
                        <option value="entire_cart" className="bg-slate-900 text-white">Entire Cart</option>
                        <option value="matching_items" className="bg-slate-900 text-white">Matching Items Only</option>
                      </select>
                      <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Customer Eligibility</label>
                    <div className="relative">
                      <select
                        name="customerEligibility"
                        value={form.customerEligibility}
                        onChange={handleFormChange}
                        className="w-full pl-4 pr-10 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white cursor-pointer appearance-none text-sm font-medium hover:border-white/20 transition-all"
                      >
                        <option value="all" className="bg-slate-900 text-white">All Customers</option>
                      </select>
                      <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Applicability Selector */}
              {form.applicability !== 'global' && (
                <div className="space-y-4 border border-white/10 p-5 rounded-2xl bg-black/10">
                  <h3 className="text-sm font-bold text-white">
                    Select Applicable {form.applicability === 'category' ? 'Categories' : 'Products'}
                  </h3>
                  
                  {/* Search input and Dropdown */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                        <input
                          type="text"
                          placeholder={`Search ${form.applicability}...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white placeholder-slate-500 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {searchQuery.trim() !== '' && (
                      <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-slate-950/95 border border-white/15 rounded-xl shadow-2xl z-50 divide-y divide-white/5 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                          <div className="p-3 text-slate-500 text-xs">No items match search queries.</div>
                        ) : (
                          filteredOptions.map(opt => (
                            <button
                              key={opt._id}
                              type="button"
                              onClick={() => {
                                handleAddApplicableId(opt._id);
                                setSearchQuery('');
                              }}
                              className="w-full text-left p-3 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <span>{opt.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {opt._id}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Tags list */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedIds.length === 0 ? (
                      <span className="text-slate-500 text-xs italic">No targeted items selected. Default is empty (won't trigger any discount).</span>
                    ) : (
                      selectedIds.map(id => (
                        <span 
                          key={id} 
                          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-full"
                        >
                          {getApplicableName(id)}
                          <button
                            type="button"
                            onClick={() => handleRemoveApplicableId(id)}
                            className="text-blue-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <FiX />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className="px-6 py-3 border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <FiLoader className="animate-spin" />}
                  Create Discount Rule
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Tab 3: Active Promotions */}
        {activeTab === 'promotions' && (
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiTrendingUp className="text-blue-400" /> Active Promotions Feed
                </h2>
                <p className="text-xs text-slate-400 mt-1">Live active discount items as presented to buyers.</p>
              </div>
              <button
                onClick={fetchPromotions}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
              >
                Refresh Feed
              </button>
            </div>
            
            {loadingPromotions ? (
              <div className="flex items-center justify-center py-12">
                <FiLoader className="animate-spin text-blue-400 text-3xl" />
              </div>
            ) : activePromotions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FiTrendingUp className="mx-auto text-4xl mb-3 text-slate-600" />
                <p>No active promotions visible in the user feed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activePromotions.map((promo, idx) => (
                  <div 
                    key={promo._id || idx} 
                    className="p-5 bg-slate-950/20 rounded-2xl border border-white/10 flex items-start gap-4 hover:border-blue-500/30 transition-all hover:bg-slate-955/30"
                  >
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                      <FiTag className="text-xl" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{promo.name}</span>
                        {promo.code && (
                          <span className="font-mono text-xs font-semibold bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded border border-blue-500/30">
                            {promo.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 capitalize font-medium">
                        Scope: {promo.applicability} • Type: {promo.discountType} ({promo.discountValue}{promo.discountType === 'percentage' ? '%' : ' ₹'})
                      </p>
                      {promo.minOrderValue && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Requires min order value of ₹{promo.minOrderValue.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Coupon Tester */}
        {activeTab === 'tester' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cart Editor column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6">
                <h2 className="text-lg font-bold text-white mb-6">Mock Shopping Cart</h2>
                
                {/* Product Add Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white/2 p-4 rounded-2xl border border-white/5 mb-6">
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300">Select Product</label>
                    <div className="relative">
                      <select
                        value={selectedTestProduct}
                        onChange={(e) => {
                          setSelectedTestProduct(e.target.value);
                          setSelectedTestVariant('');
                        }}
                        className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-white/10 rounded-xl focus:outline-none text-white text-xs cursor-pointer appearance-none"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id} className="bg-slate-900">{p.name}</option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs" />
                    </div>
                  </div>

                  {selectedTestProductObj?.variants && selectedTestProductObj.variants.length > 0 ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">Select Variant</label>
                      <div className="relative">
                        <select
                          value={selectedTestVariant}
                          onChange={(e) => setSelectedTestVariant(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-white/10 rounded-xl focus:outline-none text-white text-xs cursor-pointer appearance-none"
                        >
                          <option value="">-- Default --</option>
                          {selectedTestProductObj.variants.map(v => (
                            <option key={v._id} value={v._id} className="bg-slate-900">{v.name}</option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-slate-500 text-xs italic pb-2">
                      No variants
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={testQuantity}
                      onChange={(e) => setTestQuantity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl focus:outline-none text-white text-xs"
                    />
                  </div>

                  <div className="md:col-span-4 flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleAddToTestCart}
                      disabled={!selectedTestProduct}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FiPlus /> Add to Cart
                    </button>
                  </div>

                </div>

                {/* Cart list items */}
                {testCart.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <FiShoppingBag className="mx-auto text-3xl mb-2 text-slate-600" />
                    <p>Your mock testing cart is empty.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {testCart.map((item, index) => (
                      <div key={index} className="py-4 flex justify-between items-center text-sm">
                        <div className="space-y-1">
                          <p className="font-bold text-white">{item.name}</p>
                          <div className="flex gap-2 text-xs text-slate-500">
                            {item.variantName && <span>Variant: <strong className="text-slate-400">{item.variantName}</strong></span>}
                            <span>Quantity: <strong className="text-slate-400">{item.quantity}</strong></span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromTestCart(index)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Validation Trigger and Response Display Column */}
            <div className="space-y-6">
              <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6">
                <h2 className="text-lg font-bold text-white mb-6">Test Coupon Validation</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Coupon Code</label>
                    <input
                      type="text"
                      placeholder="e.g. VOLUME10"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value)}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-white font-mono placeholder-slate-600 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    disabled={validating || testCart.length === 0 || !testCode}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {validating && <FiLoader className="animate-spin" />}
                    Validate Code
                  </button>
                </div>

                {/* Tester output results */}
                {validationError && (
                  <div className="mt-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                    <div className="font-bold flex items-center gap-1">
                      <FiX /> Validation Failed
                    </div>
                    <p className="text-slate-400 font-medium">{validationError}</p>
                  </div>
                )}

                {validationResult && (
                  <div className="mt-6 bg-slate-950 border border-white/15 rounded-2xl p-5 space-y-4 text-xs animate-in fade-in">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <span className="font-bold text-slate-300">Validation Status</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        validationResult.isValid
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {validationResult.isValid ? 'VALID' : 'INVALID'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Discount Type Applied:</span>
                        <span className="font-semibold text-white capitalize">{validationResult.discountType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Calculated Discount:</span>
                        <span className="font-bold text-emerald-400">₹{validationResult.discountAmount?.toLocaleString() || 0}</span>
                      </div>
                      {validationResult.message && (
                        <div className="mt-2 bg-white/2 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-400 font-semibold leading-relaxed">
                          {validationResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Coupons;
