import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiArrowUp, FiArrowDown, FiSave, FiLoader, 
  FiAlertCircle, FiCheck, FiSliders, FiGrid, FiTag, FiLayout 
} from 'react-icons/fi';
import { api, BASE_URL } from '../../../api/axios';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const HomeOrdering = () => {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'brands'
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [ordersState, setOrdersState] = useState({}); // Stores local input values during editing

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [categoriesRes, brandsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/categories`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/brands`, { headers }).catch(() => ({ data: [] }))
      ]);

      const catList = (Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
        .filter(c => c.showOnHomeScreen === true || c.showOnHomeScreen === 'true');
      
      const brandList = (Array.isArray(brandsRes.data) ? brandsRes.data : [])
        .filter(b => b.showOnHomeScreen === true || b.showOnHomeScreen === 'true');

      // Sort lists by homeOrder
      const sortList = (list) => {
        return list.sort((a, b) => {
          const valA = a.homeOrder !== undefined && a.homeOrder !== null && a.homeOrder !== '' ? Number(a.homeOrder) : 99999;
          const valB = b.homeOrder !== undefined && b.homeOrder !== null && b.homeOrder !== '' ? Number(b.homeOrder) : 99999;
          return valA - valB;
        });
      };

      const sortedCategories = sortList(catList);
      const sortedBrands = sortList(brandList);

      setCategories(sortedCategories);
      setBrands(sortedBrands);

      // Prepopulate local input state values
      const initialOrders = {};
      sortedCategories.forEach(c => {
        initialOrders[`cat_${c._id}`] = c.homeOrder !== undefined && c.homeOrder !== null ? String(c.homeOrder) : '';
      });
      sortedBrands.forEach(b => {
        initialOrders[`brand_${b._id}`] = b.homeOrder !== undefined && b.homeOrder !== null ? String(b.homeOrder) : '';
      });
      setOrdersState(initialOrders);

    } catch (err) {
      console.error(err);
      setError('Failed to fetch home screen catalog items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOrderChange = (id, type, val) => {
    setOrdersState(prev => ({
      ...prev,
      [`${type}_${id}`]: val
    }));
  };

  const saveOrder = async (item, type) => {
    const inputVal = ordersState[`${type}_${item._id}`];
    const orderVal = inputVal !== '' ? Number(inputVal) : '';
    
    setUpdatingId(item._id);
    try {
      const token = sessionStorage.getItem('accessToken');
      const data = new FormData();
      data.append('name', item.name);
      if (item.description) {
        data.append('description', item.description);
      }
      data.append('isActive', item.isActive !== false);
      data.append('showOnHomeScreen', true);
      data.append('homeOrder', orderVal);

      const endpoint = type === 'cat' 
        ? `${BASE_URL}/api/categories/${item._id}`
        : `${BASE_URL}/api/brands/${item._id}`;

      await axios.put(endpoint, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save order.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleShift = async (index, direction, type) => {
    const list = type === 'cat' ? categories : brands;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentItem = list[index];
    const targetItem = list[targetIndex];

    setUpdatingId(currentItem._id);
    try {
      const token = sessionStorage.getItem('accessToken');
      
      // Determine temporary orders. If either has no order, assign simple sequential indexes
      const currentOrder = currentItem.homeOrder !== undefined && currentItem.homeOrder !== null && currentItem.homeOrder !== '' 
        ? Number(currentItem.homeOrder) 
        : index + 1;
      const targetOrder = targetItem.homeOrder !== undefined && targetItem.homeOrder !== null && targetItem.homeOrder !== '' 
        ? Number(targetItem.homeOrder) 
        : targetIndex + 1;

      // Swap orders
      const updateItem = async (item, order) => {
        const data = new FormData();
        data.append('name', item.name);
        if (item.description) {
          data.append('description', item.description);
        }
        data.append('isActive', item.isActive !== false);
        data.append('showOnHomeScreen', true);
        data.append('homeOrder', order);

        const endpoint = type === 'cat' 
          ? `${BASE_URL}/api/categories/${item._id}`
          : `${BASE_URL}/api/brands/${item._id}`;

        await axios.put(endpoint, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      };

      // Perform parallel updates to swap orders on backend
      await Promise.all([
        updateItem(currentItem, targetOrder),
        updateItem(targetItem, currentOrder)
      ]);

      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to shift ordering.');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeList = activeTab === 'categories' ? categories : brands;
  const activeType = activeTab === 'categories' ? 'cat' : 'brand';

  return (
    <div className="relative space-y-6 min-h-full z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiLayout className="text-blue-400" /> Home Ordering
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Easily manage and customize the display order of items pinned to your home screen.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'categories' 
                ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FiGrid /> Home Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'brands' 
                ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FiTag /> Home Brands ({brands.length})
          </button>
        </div>

        {/* List Content */}
        <div className="p-6">
          {error && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3 text-sm">
              <FiAlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {loading && activeList.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <FiLoader className="animate-spin text-3xl mx-auto mb-3 text-blue-400" />
              <span>Loading home items configuration...</span>
            </div>
          ) : activeList.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              <FiSliders className="text-4xl mx-auto mb-3 text-slate-600 animate-pulse" />
              <p className="font-medium text-slate-400">No items pinned to Home Screen.</p>
              <p className="text-xs text-slate-500 mt-1">
                Go to the {activeTab} master configuration and check the "Home Screen Placement" toggle to pin them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeList.map((item, index) => {
                const uniqueKey = `${activeType}_${item._id}`;
                const localVal = ordersState[uniqueKey] || '';
                const isCurrentlyUpdating = updatingId === item._id;

                return (
                  <div 
                    key={item._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-transparent border border-white/20 hover:border-white/10 rounded-2xl transition-all duration-300 gap-4 group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar/Preview */}
                      <div className="w-12 h-12 bg-slate-800 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {item.image || item.logo ? (
                          <img 
                            src={getImageUrl(item.image || item.logo)} 
                            alt={item.name} 
                            className="w-full h-full object-contain bg-white p-1"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-500 uppercase">{item.name.substring(0, 2)}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <h3 className="font-bold text-white text-base">{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[280px]">{item.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Order Controls */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Shift buttons */}
                      <div className="flex gap-1.5">
                        <button
                          disabled={index === 0 || isCurrentlyUpdating}
                          onClick={() => handleShift(index, 'up', activeType)}
                          className="p-2 bg-slate-800 text-slate-300 rounded-xl border border-white/5 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all cursor-pointer"
                          title="Move Up"
                        >
                          <FiArrowUp size={16} />
                        </button>
                        <button
                          disabled={index === activeList.length - 1 || isCurrentlyUpdating}
                          onClick={() => handleShift(index, 'down', activeType)}
                          className="p-2 bg-slate-800 text-slate-300 rounded-xl border border-white/5 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all cursor-pointer"
                          title="Move Down"
                        >
                          <FiArrowDown size={16} />
                        </button>
                      </div>

                      {/* Manual numeric input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={localVal}
                          min="1"
                          onChange={(e) => handleOrderChange(item._id, activeType, e.target.value)}
                          className="w-20 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-center"
                          placeholder="Unset"
                        />
                        <button
                          disabled={isCurrentlyUpdating || localVal === String(item.homeOrder)}
                          onClick={() => saveOrder(item, activeType)}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Save position"
                        >
                          {isCurrentlyUpdating ? (
                            <FiLoader size={16} className="animate-spin" />
                          ) : (
                            <FiCheck size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeOrdering;
