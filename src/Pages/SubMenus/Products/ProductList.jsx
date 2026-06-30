import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiEdit2, FiTrash2, FiPlus, FiLoader, FiSearch, FiUpload, FiX, FiSave, FiImage, FiPackage, FiEye, FiChevronDown, FiChevronUp, FiArrowUp, FiArrowDown, FiCopy, FiDownload, FiFileText } from 'react-icons/fi';
import { api, BASE_URL } from '../../../api/axios';
import * as XLSX from 'xlsx';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Sync local input with URL search param changes (e.g. back navigation or reset)
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '');
  }, [searchParams]);

  // Debounce search updates to searchParams to prevent lag during fast typing
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchParams(prev => {
        const currentSearch = prev.get('search') || '';
        if (searchInput === currentSearch) return prev;
        
        if (searchInput) {
          prev.set('search', searchInput);
        } else {
          prev.delete('search');
        }
        prev.set('page', '1');
        return prev;
      }, { replace: true });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchInput, setSearchParams]);
  const itemsPerPage = 10;
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addProductImageFiles, setAddProductImageFiles] = useState([]);
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isVariantsExpanded, setIsVariantsExpanded] = useState(false);
  const [currentProductForView, setCurrentProductForView] = useState(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const excelDropdownRef = useRef(null);
  const [isExcelDropdownOpen, setIsExcelDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (excelDropdownRef.current && !excelDropdownRef.current.contains(event.target)) {
        setIsExcelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initialFormState = {
    name: '', description: '', details: '', expertNotes: '',
    brand: '', category: '', basePrice: '', offerPrice: '',
    l1Price: '', l2Price: '', l3Price: '', quantityPricing: [],
    eanNumber: '', totalQuantity: '', cancellationPolicy: '',
    sevenDaysReturn: '', warranty: '', image_urls: ''
  };
  const [addFormData, setAddFormData] = useState(initialFormState);
  const [addVariants, setAddVariants] = useState([]);
  const [expandedAddVariantIndex, setExpandedAddVariantIndex] = useState(null);

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

  const handleAddVariant = () => {
    setAddVariants([...addVariants, getEmptyVariant()]);
    setExpandedAddVariantIndex(addVariants.length);
  };

  const handleRemoveVariant = (index) => {
    setAddVariants(addVariants.filter((_, i) => i !== index));
    if (expandedAddVariantIndex === index) {
      setExpandedAddVariantIndex(null);
    } else if (expandedAddVariantIndex > index) {
      setExpandedAddVariantIndex(expandedAddVariantIndex - 1);
    }
  };

  const handleDuplicateVariant = (index) => {
    const cloned = { 
      ...addVariants[index],
      quantityPricing: (addVariants[index].quantityPricing || []).map(qp => ({ ...qp })) 
    };
    const newVariants = [...addVariants];
    newVariants.splice(index + 1, 0, cloned);
    setAddVariants(newVariants);
    setExpandedAddVariantIndex(index + 1);
  };

  const handleMoveVariantUp = (index) => {
    if (index === 0) return;
    const newVariants = [...addVariants];
    [newVariants[index - 1], newVariants[index]] = [newVariants[index], newVariants[index - 1]];
    setAddVariants(newVariants);
    if (expandedAddVariantIndex === index) setExpandedAddVariantIndex(index - 1);
    else if (expandedAddVariantIndex === index - 1) setExpandedAddVariantIndex(index);
  };

  const handleMoveVariantDown = (index) => {
    if (index === addVariants.length - 1) return;
    const newVariants = [...addVariants];
    [newVariants[index + 1], newVariants[index]] = [newVariants[index], newVariants[index + 1]];
    setAddVariants(newVariants);
    if (expandedAddVariantIndex === index) setExpandedAddVariantIndex(index + 1);
    else if (expandedAddVariantIndex === index + 1) setExpandedAddVariantIndex(index);
  };

  const handleVariantChange = (index, field, value) => {
    setAddVariants(prev => prev.map((v, i) => {
      if (i !== index) return v;
      return { ...v, [field]: value };
    }));
  };

  const handleAddVariantQuantityPricing = (index) => {
    setAddVariants(prev => prev.map((v, i) => {
      if (i !== index) return v;
      return {
        ...v,
        quantityPricing: [...(v.quantityPricing || []), { minQty: '', price: '' }]
      };
    }));
  };

  const handleRemoveVariantQuantityPricing = (variantIndex, qpIndex) => {
    setAddVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return {
        ...v,
        quantityPricing: (v.quantityPricing || []).filter((_, qpi) => qpi !== qpIndex)
      };
    }));
  };

  const handleVariantQuantityPricingChange = (variantIndex, qpIndex, field, value) => {
    setAddVariants(prev => prev.map((v, i) => {
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

  useEffect(() => {
    if (location.state?.viewProductId && products.length > 0) {
      const productToView = products.find(p => p._id === location.state.viewProductId);
      if (productToView) {
        setCurrentProductForView(productToView);
        setIsDetailsModalOpen(true);
        setIsVariantsExpanded(false);
        // Clean up state so it doesn't reopen on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, products, navigate, location.pathname]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        
        const [prodRes, brandRes, catRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/products/`, { headers }),
          axios.get(`${BASE_URL}/api/brands/`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE_URL}/api/categories/`, { headers }).catch(() => ({ data: [] }))
        ]);
        
        setProducts(prodRes.data);
        setBrands(brandRes.data);
        setCategories(catRes.data);
      } catch (error) {
        console.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

// console.log(products)

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Product?')) {
      try {
        const token = sessionStorage.getItem('accessToken');
        await axios.delete(`${BASE_URL}/api/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(products.filter(p => p._id !== id));
      } catch (error) {
        console.error('Failed to delete product', error);
        alert('Failed to delete product');
      }
    }
  };

  const openDetailsView = (product) => {
    setCurrentProductForView(product);
    setIsDetailsModalOpen(true);
    setIsVariantsExpanded(false);
  };

  const handleToggleActive = async (newVal) => {
    if (isTogglingActive) return;
    setIsTogglingActive(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const formData = new FormData();
      
      formData.append('name', currentProductForView.name || '');
      formData.append('description', currentProductForView.description || '');
      formData.append('details', currentProductForView.details || '');
      formData.append('expertNotes', currentProductForView.expertNotes || '');
      formData.append('basePrice', currentProductForView.basePrice || 0);
      formData.append('offerPrice', currentProductForView.offerPrice || 0);
      formData.append('l1Price', currentProductForView.l1Price || 0);
      formData.append('l2Price', currentProductForView.l2Price || 0);
      formData.append('l3Price', currentProductForView.l3Price || 0);
      formData.append('quantityPricing', JSON.stringify(currentProductForView.quantityPricing || []));
      formData.append('eanNumber', currentProductForView.eanNumber || '');
      formData.append('totalQuantity', currentProductForView.totalQuantity || 0);
      formData.append('cancellationPolicy', currentProductForView.cancellationPolicy || '');
      formData.append('sevenDaysReturn', currentProductForView.sevenDaysReturn || '');
      formData.append('warranty', currentProductForView.warranty || '');
      formData.append('isActive', newVal);

      const brandId = currentProductForView.brand?._id || currentProductForView.brand;
      if (brandId) formData.append('brand', brandId);
      
      const categoryId = currentProductForView.category?._id || currentProductForView.category;
      if (categoryId) formData.append('category', categoryId);

      const payloadVariants = (currentProductForView.variants || []).map(v => {
        const parsedQP = (v.quantityPricing || [])
          .map(qp => ({ minQty: Number(qp.minQty) || 0, price: Number(qp.price) || 0 }))
          .filter(qp => qp.minQty > 0 || qp.price > 0);
        
        return {
          _id: v._id,
          name: v.name,
          sku: v.sku,
          quantity: Number(v.quantity) || 0,
          price: Number(v.price) || 0,
          offerPrice: Number(v.offerPrice) || 0,
          l1Price: Number(v.l1Price) || 0,
          l2Price: Number(v.l2Price) || 0,
          l3Price: Number(v.l3Price) || 0,
          quantityPricing: parsedQP,
          images: v.images || []
        };
      });
      formData.append('variants', JSON.stringify(payloadVariants));

      if (currentProductForView.images && currentProductForView.images.length > 0) {
        formData.append('images', JSON.stringify(currentProductForView.images));
      }

      await axios.put(`${BASE_URL}/api/products/${currentProductForView._id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update local states
      setProducts(prev => prev.map(p => p._id === currentProductForView._id ? { ...p, isActive: newVal } : p));
      setCurrentProductForView(prev => ({ ...prev, isActive: newVal }));
    } catch (error) {
      console.error('Failed to toggle product status', error);
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to update product status');
    } finally {
      setIsTogglingActive(false);
    }
  };

  const openAddModal = () => setIsAddModalOpen(true);
  
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setAddFormData(initialFormState);
    setAddProductImageFiles([]);
    setAddVariants([]);
    setExpandedAddVariantIndex(null);
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuantityPricingChange = (index, field, value) => {
    const newQp = [...(addFormData.quantityPricing || [])];
    newQp[index] = { ...newQp[index], [field]: value };
    setAddFormData(prev => ({ ...prev, quantityPricing: newQp }));
  };

  const handleAddQuantityPricing = () => {
    setAddFormData(prev => ({ ...prev, quantityPricing: [...(prev.quantityPricing || []), { minQty: '', price: '' }] }));
  };

  const handleRemoveQuantityPricing = (index) => {
    const newQp = [...(addFormData.quantityPricing || [])];
    newQp.splice(index, 1);
    setAddFormData(prev => ({ ...prev, quantityPricing: newQp }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const parsedQuantityPricing = (addFormData.quantityPricing || [])
      .map(qp => ({ minQty: Number(qp.minQty) || 0, price: Number(qp.price) || 0 }))
      .filter(qp => qp.minQty > 0 || qp.price > 0);

    let payloadVariants;
    try {
      payloadVariants = addVariants.map(v => {
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
      return;
    }

    try {
      const token = sessionStorage.getItem('accessToken');
      
      const formData = new FormData();
      formData.append('name', addFormData.name || '');
      formData.append('description', addFormData.description || '');
      formData.append('details', addFormData.details || '');
      formData.append('expertNotes', addFormData.expertNotes || '');
      formData.append('basePrice', addFormData.basePrice || 0);
      formData.append('offerPrice', addFormData.offerPrice || 0);
      formData.append('l1Price', addFormData.l1Price || 0);
      formData.append('l2Price', addFormData.l2Price || 0);
      formData.append('l3Price', addFormData.l3Price || 0);
      formData.append('quantityPricing', JSON.stringify(parsedQuantityPricing));
      formData.append('eanNumber', addFormData.eanNumber || '');
      formData.append('totalQuantity', addFormData.totalQuantity || 0);
      formData.append('cancellationPolicy', addFormData.cancellationPolicy || '');
      formData.append('sevenDaysReturn', addFormData.sevenDaysReturn || '');
      formData.append('warranty', addFormData.warranty || '');

      if (addFormData.brand) formData.append('brand', addFormData.brand);
      if (addFormData.category) formData.append('category', addFormData.category);

      formData.append('variants', JSON.stringify(payloadVariants));

      const imageUrls = addFormData.image_urls ? addFormData.image_urls.split(',').map(url => url.trim()).filter(Boolean) : [];
      if (imageUrls.length > 0) {
        formData.append('images', JSON.stringify(imageUrls));
      }

      addProductImageFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await axios.post(`${BASE_URL}/api/products/`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const addedProduct = response.data?.product || response.data?.data || response.data;
      setProducts([addedProduct, ...products]);
      closeAddModal();
    } catch (error) {
      console.error('Failed to add product', error);
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to add product');
    }
  };

  const handleSelectProduct = (id) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(productId => productId !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} selected products?`)) {
      try {
        const token = sessionStorage.getItem('accessToken');
        await Promise.all(selectedProducts.map(id => 
          axios.delete(`${BASE_URL}/api/products/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ));
        setProducts(products.filter(p => !selectedProducts.includes(p._id)));
        setSelectedProducts([]);
      } catch (error) {
        console.error('Failed to bulk delete products', error);
        alert('Failed to delete some or all selected products.');
      }
    }
  };

  const openImageView = (product) => {
    setCurrentProductForView(product);
    setIsImageViewOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // console.log('CSV file selected:', file.name);
      // Implement CSV parsing or upload logic here (e.g., using FormData or PapaParse)
    }
  };

  const handleExportToExcel = () => {
    if (filteredProducts.length === 0) {
      alert('No data available to export.');
      return;
    }

    const exportData = [];
    let serialNo = 1;

    filteredProducts.forEach((product) => {
      const brandName = getBrandName(product.brand);
      const categoryName = getCategoryName(product.category);

      if (product.variants && product.variants.length > 0) {
        // Export each variant as a row
        product.variants.forEach((variant) => {
          exportData.push({
            'S.No': serialNo++,
            'Brand': brandName,
            'Category': categoryName,
            'Product Name': `${product.name} (${variant.name})` || '-',
            'Description': product.description || '-',
            'EAN Number': product.eanNumber || '-',
            'Warranty': product.warranty || '-',
            'Has Variants': 'Yes',
            'Variant Name': variant.name || '-',
            'Variant SKU': variant.sku || '-',
            'Price': variant.price != null ? Number(variant.price) : 0,
            'Offer Price': variant.offerPrice != null ? Number(variant.offerPrice) : 0,
            'L1 Price': variant.l1Price != null ? Number(variant.l1Price) : 0,
            'L2 Price': variant.l2Price != null ? Number(variant.l2Price) : 0,
            'L3 Price': variant.l3Price != null ? Number(variant.l3Price) : 0,
            'Stock / Qty': variant.quantity != null ? Number(variant.quantity) : 0,
          });
        });
      } else {
        // Export the main product as a single row
        exportData.push({
          'S.No': serialNo++,
          'Brand': brandName,
          'Category': categoryName,
          'Product Name': product.name || '-',
          'Description': product.description || '-',
          'EAN Number': product.eanNumber || '-',
          'Warranty': product.warranty || '-',
          'Has Variants': 'No',
          'Variant Name': '-',
          'Variant SKU': '-',
          'Price': product.basePrice != null ? Number(product.basePrice) : 0,
          'Offer Price': product.offerPrice != null ? Number(product.offerPrice) : 0,
          'L1 Price': product.l1Price != null ? Number(product.l1Price) : 0,
          'L2 Price': product.l2Price != null ? Number(product.l2Price) : 0,
          'L3 Price': product.l3Price != null ? Number(product.l3Price) : 0,
          'Stock / Qty': product.totalQuantity != null ? Number(product.totalQuantity) : 0,
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products & Variants');

    // Auto-adjust column widths for better readability
    const maxKeys = Object.keys(exportData[0] || {});
    worksheet['!cols'] = maxKeys.map(key => ({
      wch: Math.max(...exportData.map(row => String(row[key] || '').length), key.length) + 2
    }));

    XLSX.writeFile(workbook, 'Inizio_Products_Variants_Export.xlsx');
  };

  const getBrandName = (brandId) => {
    if (!brandId) return '-';
    if (brandId.name) return brandId.name;
    const b = brands.find(item => item._id === brandId);
    return b ? b.name : '-';
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return '-';
    if (categoryId.name) return categoryId.name;
    const c = categories.find(item => item._id === categoryId);
    return c ? c.name : '-';
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    const ean = product.eanNumber?.toString() || '';
    return (
      product.name?.toLowerCase().includes(term) || ean.includes(term) ||
      getBrandName(product.brand).toLowerCase().includes(term) ||
      getCategoryName(product.category).toLowerCase().includes(term)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentIds = currentProducts.map(p => p._id);
      const newSelected = [...new Set([...selectedProducts, ...currentIds])];
      setSelectedProducts(newSelected);
    } else {
      const currentIds = currentProducts.map(p => p._id);
      setSelectedProducts(selectedProducts.filter(id => !currentIds.includes(id)));
    }
  };
  // console.log(currentPage)

  return (
    <div className="relative space-y-4 min-h-full z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      {/* <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div> */}

      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiPackage className='text-blue-400'/>Product List</h1>
            <p className="text-slate-400 font-medium mt-1">View and manage all products in your catalog.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 text-white placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Action & Metrics Row */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 w-full border-t border-white/5 pt-4 mt-2">
          {/* Left part: Total products info */}
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-400 order-2 xl:order-1 w-full xl:w-auto">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
              Total Products: <strong className="text-white">{products.length}</strong>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
              Products with Variants: <strong className="text-white">{products.filter(p => p.variants && p.variants.length > 0).length}</strong>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
              Total Items (incl. Variants): <strong className="text-white">{products.reduce((sum, p) => sum + (Array.isArray(p.variants) && p.variants.length > 1 ? p.variants.length : 1), 0)}</strong>
            </span>
            {searchTerm && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full">
                Found: <strong>{filteredProducts.length}</strong>
              </span>
            )}
          </div>

          {/* Right part: Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 w-full xl:w-auto order-1 xl:order-2">
            {selectedProducts.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-red-600/50 text-white font-bold rounded-xl hover:bg-red-100 hover:text-red-600 transition-all border border-red-600 shadow-sm cursor-pointer"
              >
                <FiTrash2 className="mr-2" />
                Delete ({selectedProducts.length})
              </button>
            )}
            
            {/* Excel Actions Dropdown */}
            <div className="relative w-full sm:w-auto" ref={excelDropdownRef}>
              <button 
                onClick={() => setIsExcelDropdownOpen(!isExcelDropdownOpen)} 
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all border border-white/10 shadow-sm cursor-pointer gap-2"
              >
                <FiFileText />
                <span>Excel Actions</span>
                <FiChevronDown className={`transition-transform duration-300 ${isExcelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isExcelDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/80 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => { handleExportToExcel(); setIsExcelDropdownOpen(false); }} 
                    className="w-full flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-left font-medium"
                  >
                    <FiDownload className="mr-2 text-amber-400" />
                    Export to Excel
                  </button>
                  <button 
                    onClick={() => { navigate('/products/mapping'); setIsExcelDropdownOpen(false); }} 
                    className="w-full flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-left font-medium"
                  >
                    <FiUpload className="mr-2 text-emerald-400" />
                    Upload Excel / CSV
                  </button>
                </div>
              )}
            </div>

            <button onClick={openAddModal} className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-blue-600/50 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/5 cursor-pointer">
              <FiPlus className="mr-2" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full">
        <div className="overflow-auto custom-scrollbar max-h-[70vh]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-slate-300 text-sm shadow-md">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all cursor-pointer accent-blue-500 scheme-dark"
                    checked={currentProducts.length > 0 && currentProducts.every(p => selectedProducts.includes(p._id))}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">S.No</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Brand</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Category</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Product Name</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Base Price</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Offer Price</th>
                {/* <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Total Qty</th> */}
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Variants</th>
                {/* <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">EAN</th> */}
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs text-center">Images</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan="16" className="px-6 py-12 text-center text-slate-400 font-medium">
                    <FiLoader className="animate-spin text-3xl mx-auto mb-3 text-blue-400" />
                    Loading products...
                  </td>
                </tr>
              ) : currentProducts.length > 0 ? (
                currentProducts.map((product, index) => {
                  return (
                    <tr key={product._id || index} className="hover:bg-transparent transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all cursor-pointer accent-blue-500 scheme-dark"
                          checked={selectedProducts.includes(product._id)}
                          onChange={() => handleSelectProduct(product._id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-400">{indexOfFirstItem + index + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-medium">{getBrandName(product.brand)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-medium">{getCategoryName(product.category)}</td>
                      <td className="px-4 py-3 text-sm text-white font-bold">{product.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 font-bold">{product.basePrice ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400 font-bold">{product.offerPrice ?? '-'}</td>
                      {/* <td className="px-4 py-3 text-sm text-slate-400">{product.totalQuantity ?? '-'}</td> */}
                      <td className="px-4 py-3 text-sm text-slate-400 text-center">{product.variants ? product.variants.length>1 ? `${product.variants.length}`: `0` : '-'}</td>
                      {/* <td className="px-4 py-3 text-sm text-slate-400">{product.eanNumber ?? '-'}</td> */}
                      <td className="px-4 py-3 text-center">
                        {product.images && product.images.length > 0 ? (
                          <div 
                            onClick={() => openImageView(product)}
                            className="relative w-12 h-12 mx-auto rounded-lg overflow-hidden border border-white/10 bg-slate-800 cursor-pointer group"
                            title="View Images"
                          >
                            <img src={getImageUrl(product.images[0])} alt={product.name} className="w-full h-full object-contain bg-white p-1 group-hover:scale-110 transition-transform" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                            {product.images.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-blue-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-lg">
                                +{product.images.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div 
                            onClick={() => openImageView(product)}
                            className="w-12 h-12 bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white rounded-lg border border-white/10 flex flex-col items-center justify-center mx-auto transition-colors cursor-pointer"
                            title="No Images"
                          >
                            <FiImage className="text-lg" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button onClick={() => openDetailsView(product)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="View Details">
                          <FiEye />
                        </button>
                        <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer" title="Delete Product">
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="16" className="px-6 py-12 text-center text-slate-400 font-medium">
                    {searchTerm ? 'No products matching your search.' : 'No products found. Add your first product.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-end items-center px-4 sm:px-6 py-4 border-t border-white/10 bg-slate-800/50">
            {/* <span className="text-sm text-slate-400">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} entries
            </span> */}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSearchParams(prev => {
                    prev.set('page', Math.max(currentPage - 1, 1));
                    return prev;
                  });
                }}
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
                          setSearchParams(prev => {
                            prev.set('page', page);
                            return prev;
                          });
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
                onClick={() => {
                  setSearchParams(prev => {
                    prev.set('page', Math.min(currentPage + 1, totalPages));
                    return prev;
                  });
                }}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {isDetailsModalOpen && currentProductForView && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh] max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/50 text-blue-400 flex items-center justify-center text-lg">
                  <FiPackage />
                </div>
                <h2 className="text-xl font-bold text-white">Product Details</h2>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {/* General Information */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>General Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  <div className="sm:col-span-2 md:col-span-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name</p>
                    <p className="text-white font-medium text-lg">{currentProductForView.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Brand</p>
                    <p className="text-white font-medium">{getBrandName(currentProductForView.brand)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</p>
                    <p className="text-white font-medium">{getCategoryName(currentProductForView.category)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">EAN Number</p>
                    <p className="text-white font-medium">{currentProductForView.eanNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${currentProductForView.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {currentProductForView.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleToggleActive(currentProductForView.isActive === false)}
                        disabled={isTogglingActive}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          currentProductForView.isActive !== false 
                            ? 'bg-rose-600/20 text-rose-400 border-rose-500/30 hover:bg-rose-600/30' 
                            : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30'
                        }`}
                      >
                        {isTogglingActive ? 'Updating...' : (currentProductForView.isActive !== false ? 'Deactivate' : 'Activate')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>Pricing & Inventory</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Quantity</p>
                    <p className="text-white font-medium">{currentProductForView.totalQuantity || '0'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base Price</p>
                    <p className="text-white font-medium">₹{currentProductForView.basePrice || '0'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Offer Price</p>
                    <p className="text-emerald-400 font-bold">₹{currentProductForView.offerPrice || '0'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">L1 Price</p>
                    <p className="text-blue-300 font-medium">₹{currentProductForView.l1Price || '0'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">L2 Price</p>
                    <p className="text-blue-300 font-medium">₹{currentProductForView.l2Price || '0'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">L3 Price</p>
                    <p className="text-blue-300 font-medium">₹{currentProductForView.l3Price || '0'}</p>
                  </div>
                </div>
              </div>

              {/* Extended Details */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>Descriptions & Policies</h3>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{currentProductForView.description || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Details</p>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{currentProductForView.details || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Expert Notes</p>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{currentProductForView.expertNotes || 'N/A'}</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                   <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Warranty</p>
                      <p className="text-slate-300 text-sm">{currentProductForView.warranty || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Return Policy</p>
                      <p className="text-slate-300 text-sm">{currentProductForView.sevenDaysReturn || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cancellation Policy</p>
                      <p className="text-slate-300 text-sm">{currentProductForView.cancellationPolicy || 'N/A'}</p>
                   </div>
                </div>
              </div>

              {/* Images */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>Product Images</h3>
                {currentProductForView.images && currentProductForView.images.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {currentProductForView.images.map((url, i) => (
                      <div key={i} className="relative w-24 h-24 border border-white/10 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                        <img src={getImageUrl(url)} alt={`Image ${i+1}`} className="max-w-full max-h-full object-contain bg-white p-2" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm italic">No images available.</p>
                )}
              </div>

              {/* Variants Dropdown */}
              <div className="mt-2">
                <button 
                  onClick={() => setIsVariantsExpanded(!isVariantsExpanded)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/60 border border-white/10 rounded-2xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold text-sm">
                      {currentProductForView.variants?.length || 0}
                    </span>
                    <span className="font-bold text-white text-lg">Product Variants</span>
                  </div>
                  {isVariantsExpanded ? <FiChevronUp className="text-slate-400 text-xl" /> : <FiChevronDown className="text-slate-400 text-xl" />}
                </button>
                
                {isVariantsExpanded && (
                  <div className="mt-3 space-y-3">
                    {currentProductForView.variants && currentProductForView.variants.length > 0 ? (
                      currentProductForView.variants.map((variant, idx) => (
                        <div key={idx} className="p-5 bg-slate-800/40 border border-white/5 rounded-2xl space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Variant Name</p>
                              <p className="text-sm text-white font-medium">{variant.name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Quantity</p>
                              <p className="text-sm text-white font-medium">{variant.quantity || '0'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Price</p>
                              <p className="text-sm text-white font-medium">₹{variant.price || '0'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Offer Price</p>
                              <p className="text-sm text-emerald-400 font-bold">₹{variant.offerPrice || '0'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-3 border-t border-white/5">
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">L1 Price</p>
                              <p className="text-sm text-blue-300 font-medium">₹{variant.l1Price || '0'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">L2 Price</p>
                              <p className="text-sm text-blue-300 font-medium">₹{variant.l2Price || '0'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">L3 Price</p>
                              <p className="text-sm text-blue-300 font-medium">₹{variant.l3Price || '0'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Quantity Pricing Slabs</p>
                              {variant.quantityPricing && variant.quantityPricing.length > 0 ? (
                                <div className="text-xs text-slate-300 space-y-1">
                                  {variant.quantityPricing.map((qp, qpi) => (
                                    <div key={qpi}>Qty: {qp.minQty}+ → ₹{qp.price}</div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">None</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 bg-slate-800/30 rounded-2xl border border-white/5">
                        No variants added for this product.
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
            
            <div className="px-4 sm:px-6 py-4 border-t border-white/10 bg-slate-800/50 flex flex-col sm:flex-row justify-between gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsDetailsModalOpen(false)} 
                className="w-full sm:w-auto px-5 py-2.5 text-slate-300 font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                type="button" 
                onClick={() => navigate(`/products/variants/${currentProductForView._id}`)} 
                className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 cursor-pointer"
              >
                <FiEdit2 className="mr-2" />
                Edit Product & Variants
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Add Product Modal */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeAddModal}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh] max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/50 text-blue-400 flex items-center justify-center text-lg">
                  <FiPlus />
                </div>
                <h2 className="text-xl font-bold text-white">Add New Product</h2>
              </div>
              <button onClick={closeAddModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="addProductForm" onSubmit={handleAddSubmit} className="space-y-6">
                
                {/* General Information */}
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>General Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Brand</label>
                      <select name="brand" value={addFormData.brand} onChange={handleAddChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium">
                        <option value="" className="bg-slate-800">Select Brand</option>
                        {brands.map(b => <option key={b._id} value={b._id} className="bg-slate-800">{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category</label>
                      <select name="category" value={addFormData.category} onChange={handleAddChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium">
                        <option value="" className="bg-slate-800">Select Category</option>
                        {categories.map(c => <option key={c._id} value={c._id} className="bg-slate-800">{c.name}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Product Name</label>
                      <input type="text" name="name" value={addFormData.name} onChange={handleAddChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">EAN Number</label>
                      <input type="number" name="eanNumber" value={addFormData.eanNumber} onChange={handleAddChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500  scheme-dark" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Total Quantity</label>
                      <input type="number" name="totalQuantity" value={addFormData.totalQuantity} onChange={handleAddChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500  scheme-dark" />
                    </div>
                  </div>
                </div>

                {/* Pricing & Inventory */}
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>Pricing & Inventory</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Base Price</label>
                      <input type="number" name="basePrice" value={addFormData.basePrice} onChange={handleAddChange} required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500  scheme-dark" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Offer Price</label>
                      <input type="number" name="offerPrice" value={addFormData.offerPrice} onChange={handleAddChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500  scheme-dark" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L1 Price</label>
                      <input type="number" name="l1Price" value={addFormData.l1Price} onChange={handleAddChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500  scheme-dark" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L2 Price</label>
                      <input type="number" name="l2Price" value={addFormData.l2Price} onChange={handleAddChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500  scheme-dark" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L3 Price</label>
                      <input type="number" name="l3Price" value={addFormData.l3Price} onChange={handleAddChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500  scheme-dark" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity Pricing Slabs</label>
                      {(addFormData.quantityPricing || []).map((qp, qpIndex) => (
                        <div key={qpIndex} className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <input type="number" value={qp.minQty} onChange={e => handleQuantityPricingChange(qpIndex, 'minQty', e.target.value)} placeholder="Minimum Quantity" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white  scheme-dark" />
                          </div>
                          <div className="flex-1">
                            <input type="number" value={qp.price} onChange={e => handleQuantityPricingChange(qpIndex, 'price', e.target.value)} placeholder="Price per unit" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white  scheme-dark" />
                          </div>
                          <button type="button" onClick={() => handleRemoveQuantityPricing(qpIndex)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-colors shrink-0 cursor-pointer" title="Remove Slab">
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => handleAddQuantityPricing()} className="px-4 py-2 mt-1 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-900/50 transition-colors border border-blue-500/30 cursor-pointer">
                        + Add Quantity Slab
                      </button>
                    </div>
                  </div>
                </div>

                {/* Descriptions & Policies */}
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>Descriptions & Policies</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Warranty</label>
                      <input type="text" name="warranty" value={addFormData.warranty} onChange={handleAddChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">7 Days Return Policy</label>
                      <input type="text" name="sevenDaysReturn" value={addFormData.sevenDaysReturn} onChange={handleAddChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Description</label>
                      <textarea name="description" value={addFormData.description} onChange={handleAddChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Details</label>
                      <textarea name="details" value={addFormData.details} onChange={handleAddChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Expert Notes</label>
                      <textarea name="expertNotes" value={addFormData.expertNotes} onChange={handleAddChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Cancellation Policy</label>
                      <textarea name="cancellationPolicy" value={addFormData.cancellationPolicy} onChange={handleAddChange} rows="3" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium resize-none placeholder-slate-500"></textarea>
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>Product Images</h3>
                  <div className="grid grid-cols-1 gap-5">
                    {/* Image URLs Section */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Image URLs (comma separated)</label>
                      <input type="text" name="image_urls" value={addFormData.image_urls} onChange={handleAddChange} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500" />
                      {addFormData.image_urls && addFormData.image_urls.split(',').filter(url => url.trim()).length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-3">
                          {addFormData.image_urls.split(',').map((url, i) => url.trim() && (
                            <div key={i} className="relative w-16 h-16 border border-white/10 rounded-lg overflow-hidden bg-slate-800 shadow-sm shrink-0 flex items-center justify-center">
                              <img src={getImageUrl(url.trim())} alt={`Preview ${i}`} className="max-w-full max-h-full object-contain bg-white p-1" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Image Upload Section */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Upload Image Files</label>
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                          if (files.length > 0) {
                            setAddProductImageFiles([...addProductImageFiles, ...files]);
                          }
                        }}
                        onClick={() => document.getElementById('product-add-images-input').click()}
                        className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col justify-center items-center gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${
                          isDragging 
                            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' 
                            : 'border-white/10 hover:border-blue-500/40 hover:bg-white/5'
                        }`}
                      >
                        <input 
                          id="product-add-images-input"
                          type="file" 
                          multiple 
                          accept="image/*"
                          onChange={(e) => setAddProductImageFiles([...addProductImageFiles, ...Array.from(e.target.files)])}
                          className="hidden"
                        />
                        <FiImage size={24} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                        <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Drag & drop product images here, or <span className="text-blue-400 group-hover:underline">browse</span></span>
                        <span className="text-[10px] text-slate-500">Supports multiple files (JPG, PNG, WEBP)</span>
                      </div>
                      {addProductImageFiles.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-4 p-4 bg-slate-800/50 border border-white/10 rounded-xl">
                          {addProductImageFiles.map((file, i) => (
                            <div key={i} className="relative w-28 h-28 border border-white/10 rounded-xl overflow-hidden group bg-slate-800 shadow-sm flex items-center justify-center">
                              <img src={URL.createObjectURL(file)} alt="Preview" className="max-w-full max-h-full object-contain bg-white p-2" />
                              <button 
                                type="button"
                                onClick={() => setAddProductImageFiles(addProductImageFiles.filter((_, index) => index !== i))}
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

                {/* Product Variants */}
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 space-y-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>Product Variants</h3>
                  <div className="space-y-4">
                    {addVariants.map((variant, index) => (
                      <div key={index} className="bg-transparent border border-white/10 shadow-lg shadow-black/50 rounded-2xl overflow-hidden group">
                        {/* Accordion Header */}
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors bg-slate-800/30"
                          onClick={() => setExpandedAddVariantIndex(expandedAddVariantIndex === index ? null : index)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold text-sm">
                              {index + 1}
                            </div>
                            <h3 className="text-sm font-bold text-white">
                              {variant.name || <span className="text-slate-500 italic">Unnamed Variant</span>}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveVariantUp(index); }} disabled={index === 0} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg disabled:opacity-30 transition-colors cursor-pointer" title="Move Up"><FiArrowUp /></button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveVariantDown(index); }} disabled={index === addVariants.length - 1} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg disabled:opacity-30 transition-colors cursor-pointer" title="Move Down"><FiArrowDown /></button>
                              <div className="w-px h-5 bg-white/10 mx-1"></div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleDuplicateVariant(index); }} className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer" title="Duplicate Variant"><FiCopy /></button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveVariant(index); }} className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer" title="Delete Variant"><FiTrash2 /></button>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="p-1 text-slate-400">
                              {expandedAddVariantIndex === index ? <FiChevronUp className="text-xl" /> : <FiChevronDown className="text-xl" />}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Content */}
                        {expandedAddVariantIndex === index && (
                          <div className="p-6 border-t border-white/10 bg-black/20">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                              <div className="sm:col-span-2 md:col-span-3">
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Variant Name</label>
                                <input type="text" value={variant.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} placeholder="e.g. Active Black" required className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white" />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity</label>
                                <input type="number" value={variant.quantity} onChange={e => handleVariantChange(index, 'quantity', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Price</label>
                                <input type="number" value={variant.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Offer Price</label>
                                <input type="number" value={variant.offerPrice} onChange={e => handleVariantChange(index, 'offerPrice', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L1 Price</label>
                                <input type="number" value={variant.l1Price} onChange={e => handleVariantChange(index, 'l1Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L2 Price</label>
                                <input type="number" value={variant.l2Price} onChange={e => handleVariantChange(index, 'l2Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">L3 Price</label>
                                <input type="number" value={variant.l3Price} onChange={e => handleVariantChange(index, 'l3Price', e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                              </div>
                              
                              <div className="sm:col-span-2 md:col-span-3">
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quantity Pricing Slabs</label>
                                {(variant.quantityPricing || []).map((qp, qpIndex) => (
                                  <div key={qpIndex} className="flex items-center gap-3 mb-3">
                                    <div className="flex-1">
                                      <input type="number" value={qp.minQty} onChange={e => handleVariantQuantityPricingChange(index, qpIndex, 'minQty', e.target.value)} placeholder="Minimum Quantity" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                                    </div>
                                    <div className="flex-1">
                                      <input type="number" value={qp.price} onChange={e => handleVariantQuantityPricingChange(index, qpIndex, 'price', e.target.value)} placeholder="Price per unit" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white scheme-dark" />
                                    </div>
                                    <button type="button" onClick={() => handleRemoveVariantQuantityPricing(index, qpIndex)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-colors shrink-0 cursor-pointer" title="Remove Slab">
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => handleAddVariantQuantityPricing(index)} className="px-4 py-2 mt-1 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-900/50 transition-colors border border-blue-500/30 cursor-pointer">
                                  + Add Quantity Slab
                                </button>
                              </div>
                              
                              <div className="sm:col-span-2 md:col-span-3">
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Image URLs (comma separated)</label>
                                <input type="text" value={variant.image_urls} onChange={e => handleVariantChange(index, 'image_urls', e.target.value)} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-500 text-white" />
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
                    ))}
                  </div>

                  <button type="button" onClick={handleAddVariant} className="w-full py-4 border-2 border-dashed border-blue-500/30 rounded-2xl text-blue-400 font-bold hover:bg-blue-900/20 hover:border-blue-400 transition-colors flex items-center justify-center cursor-pointer">
                    <FiPlus className="mr-2 text-xl" /> Add Product Variant
                  </button>
                </div>
              </form>
            </div>
            
            <div className="px-4 sm:px-6 py-4 border-t border-white/10 bg-slate-800/50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
              <button onClick={closeAddModal} className="w-full sm:w-auto px-5 py-2.5 text-slate-300 font-bold rounded-xl hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" form="addProductForm" className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30">
                <FiPlus className="mr-2" />
                Add Product
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Image View Modal */}
      {isImageViewOpen && currentProductForView && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setIsImageViewOpen(false)}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/50 text-blue-400 flex items-center justify-center text-lg">
                  <FiImage />
                </div>
                <h2 className="text-xl font-bold text-white">Images - {currentProductForView.name}</h2>
              </div>
              <button onClick={() => setIsImageViewOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {currentProductForView.images && currentProductForView.images.length > 0 ? (
                <div className="flex flex-col space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {currentProductForView.images.map((url, i) => (
                      <div key={i} className="relative aspect-square border border-white/10 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                        <img src={getImageUrl(url)} alt={`Product ${i+1}`} className="max-w-full max-h-full object-contain bg-white p-2" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Image URLs</label>
                    <textarea 
                      readOnly 
                      rows="3"
                      value={currentProductForView.images.map(url => getImageUrl(url)).join(', ')} 
                      className="w-full text-sm bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-text resize-none" 
                      onClick={(e) => e.target.select()} 
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <FiImage className="text-5xl mx-auto mb-3 opacity-50" />
                  <p>No images available for this product.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-white/10 bg-slate-800/50 flex justify-end shrink-0">
              <button onClick={() => setIsImageViewOpen(false)} className="px-6 py-2.5 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default ProductList;