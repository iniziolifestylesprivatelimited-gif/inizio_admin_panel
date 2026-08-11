import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api/axios';
import { FiArrowLeft, FiUpload, FiRefreshCcw, FiLoader, FiCheckCircle, FiAlertTriangle, FiFilter, FiX, FiDatabase } from 'react-icons/fi';
import * as XLSX from 'xlsx';

const ProductMapping = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');
  
  const [products, setProducts] = useState([]);
  const [mappedData, setMappedData] = useState([]);
  const [syncingStates, setSyncingStates] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  const [syncedProducts, setSyncedProducts] = useState([]);

  // Stock Update Section States
  const [activeTab, setActiveTab] = useState('tally');
  const [stockFile, setStockFile] = useState(null);
  const [isUploadingStock, setIsUploadingStock] = useState(false);
  const [stockUploadSuccess, setStockUploadSuccess] = useState(false);
  const [stockMappedData, setStockMappedData] = useState([]);
  const [stockSyncingStates, setStockSyncingStates] = useState({});
  const [stockSyncStatus, setStockSyncStatus] = useState({});
  const [isSyncingStock, setIsSyncingStock] = useState(false);
  const [stockSyncResult, setStockSyncResult] = useState(null);
  const [tallyFilter, setTallyFilter] = useState('all'); // 'all' | 'unmatched' | 'missing'
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'diff' | 'unmatched' | 'missing'
  
  // Bulk sync status modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalTitle, setStatusModalTitle] = useState('');
  const [isSyncingInProgress, setIsSyncingInProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [syncLogs, setSyncLogs] = useState([]);

  const getMissingTallyItems = () => {
    const missing = [];
    products.forEach(p => {
      if (!p.variants || p.variants.length === 0) {
        const isMatched = mappedData.some(m => m.matchedProduct?._id === p._id);
        if (!isMatched) {
          missing.push({ product: p, variant: null });
        }
      } else {
        p.variants.forEach(v => {
          const isMatched = mappedData.some(m => 
            m.matchedProduct?._id === p._id && 
            m.matchedVariant && 
            (m.matchedVariant._id === v._id || m.matchedVariant.name === v.name)
          );
          if (!isMatched) {
            missing.push({ product: p, variant: v });
          }
        });
      }
    });
    return missing;
  };

  const getMissingStockItems = () => {
    const missing = [];
    products.forEach(p => {
      if (!p.variants || p.variants.length === 0) {
        const isMatched = stockMappedData.some(m => m.matchedProduct?._id === p._id);
        if (!isMatched) {
          missing.push({ product: p, variant: null });
        }
      } else {
        p.variants.forEach(v => {
          const isMatched = stockMappedData.some(m => 
            m.matchedProduct?._id === p._id && 
            m.matchedVariant && 
            (m.matchedVariant._id === v._id || m.matchedVariant.name === v.name)
          );
          if (!isMatched) {
            missing.push({ product: p, variant: v });
          }
        });
      }
    });
    return missing;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products/');
        setProducts(response.data);
      } catch (err) {
        console.error('Failed to fetch products', err);
      }
    };
    fetchProducts();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadSuccess(false);
    setSyncResult(null);
    setError('');
    setMappedData([]);
    setSyncingStates({});
    setSyncStatus({});
    setSyncedProducts([]);
    setTallyFilter('all');
  };

  const handleStockFileChange = (e) => {
    setStockFile(e.target.files[0]);
    setStockUploadSuccess(false);
    setStockMappedData([]);
    setStockSyncingStates({});
    setStockSyncStatus({});
    setStockSyncResult(null);
    setError('');
    setStockFilter('all');
  };

  const findProductAndVariant = (excelName, productsList) => {
    if (!excelName) return { matchedProduct: null, matchedVariant: null };

    const rawStr = String(excelName).trim();
    const searchName = rawStr.toLowerCase();

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const scoreVariantMatch = (product, varHint) => {
      if (!product || !product.variants || product.variants.length === 0) return null;
      if (!varHint) return null;

      const target = String(varHint).trim().toLowerCase();
      if (!target) return null;

      const prodNameLower = product.name?.trim().toLowerCase() || '';

      let bestVariant = null;
      let highestScore = 0;

      product.variants.forEach(v => {
        const vName = v.name?.trim().toLowerCase() || '';
        const vSku = v.sku?.trim().toLowerCase() || '';
        
        let score = 0;

        // 1. Exact match on SKU or variant name
        if (vName === target || vSku === target) {
          score = 100;
        } else {
          // 2. Strip product name from vName if vName contains full product name (e.g. "Boat Airdopes 161 ANC Elite Black" -> "black")
          let vClean = vName;
          if (prodNameLower && vClean.includes(prodNameLower)) {
            vClean = vClean.replace(prodNameLower, '').trim();
          }

          if (vClean && vClean === target) {
            score = 95;
          } else {
            // 3. Whole-word match check using word boundaries \b
            try {
              const regex = new RegExp(`(?:^|\\b|_)${escapeRegExp(target)}(?:$|\\b|_)`, 'i');
              if (regex.test(vName) || (vClean && regex.test(vClean)) || (vSku && regex.test(vSku))) {
                score = 80;
              } else {
                // Reverse whole-word check: target contains vClean or vName as whole word
                const vCheck = vClean || vName;
                if (vCheck && vCheck.length > 1) {
                  const vRegex = new RegExp(`(?:^|\\b|_)${escapeRegExp(vCheck)}(?:$|\\b|_)`, 'i');
                  if (vRegex.test(target)) {
                    score = 75;
                  }
                }
              }
            } catch (err) {
              // Ignore regex parse errors
            }
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestVariant = v;
        }
      });

      return highestScore > 0 ? bestVariant : null;
    };

    let matchedProduct = null;
    let matchedVariant = null;

    // Pattern 1: Parentheses e.g. "Product (Variant)"
    const parenMatch = rawStr.match(/(.+?)\s*\(([^)]+)\)$/);
    if (parenMatch) {
      const prodName = parenMatch[1].trim().toLowerCase();
      const varName = parenMatch[2].trim();
      matchedProduct = productsList.find(p => p.name?.trim().toLowerCase() === prodName);
      if (matchedProduct) {
        matchedVariant = scoreVariantMatch(matchedProduct, varName);
      }
    }

    // Pattern 2: Square Brackets e.g. "Product [Variant]"
    if (!matchedProduct) {
      const bracketMatch = rawStr.match(/(.+?)\s*\[([^\]]+)\]$/);
      if (bracketMatch) {
        const prodName = bracketMatch[1].trim().toLowerCase();
        const varName = bracketMatch[2].trim();
        matchedProduct = productsList.find(p => p.name?.trim().toLowerCase() === prodName);
        if (matchedProduct) {
          matchedVariant = scoreVariantMatch(matchedProduct, varName);
        }
      }
    }

    // Pattern 3: Separators e.g. "Product - Variant" or "Product / Variant"
    if (!matchedProduct) {
      const separators = [' - ', '-', ' / ', '/'];
      for (const sep of separators) {
        if (rawStr.includes(sep)) {
          const parts = rawStr.split(sep);
          const varName = parts[parts.length - 1].trim();
          const prodName = parts.slice(0, -1).join(sep).trim().toLowerCase();

          const tempProd = productsList.find(p => p.name?.trim().toLowerCase() === prodName);
          if (tempProd) {
            const tempVar = scoreVariantMatch(tempProd, varName);
            if (tempVar) {
              matchedProduct = tempProd;
              matchedVariant = tempVar;
              break;
            }
          }
        }
      }
    }

    // Pattern 4: Direct Product Match e.g. "Product"
    if (!matchedProduct) {
      matchedProduct = productsList.find(p => p.name?.trim().toLowerCase() === searchName);
      if (matchedProduct && matchedProduct.variants && matchedProduct.variants.length > 0) {
        matchedVariant = scoreVariantMatch(matchedProduct, searchName);
      }
    }

    // Pattern 5: Fallback Search across all products
    if (!matchedProduct) {
      for (const p of productsList) {
        const vMatch = scoreVariantMatch(p, searchName);
        if (vMatch) {
          matchedProduct = p;
          matchedVariant = vMatch;
          break;
        }

        if (p.variants && p.variants.length > 0) {
          const pNameLower = p.name?.trim().toLowerCase() || '';
          if (pNameLower && searchName.includes(pNameLower)) {
            const remainingHint = searchName.replace(pNameLower, '').trim();
            const vMatch2 = scoreVariantMatch(p, remainingHint || searchName);
            if (vMatch2) {
              matchedProduct = p;
              matchedVariant = vMatch2;
              break;
            }
          }
        }
      }
    }

    return { matchedProduct, matchedVariant };
  };

  const handleStockUpload = async () => {
    if (!stockFile) {
      setError('Please select a file to upload.');
      return;
    }
    setIsUploadingStock(true);
    setError('');
    setStockUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const mapped = jsonData.map(row => {
            let excelName = row['Name'] || row['name'] || row['Item Name'] || row['Item'] || row['Product'] || row['Product Name'] || row['Particulars'];
            let excelQty = row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || row['Closing Balance'] || row['Stock'] || row['Total Quantity'] || row['Count'] || row['Stock / Qty'] || row['Stock/Qty'] || row['Stock / qty'] || row['Stock/qty'];

            if (!excelName && Object.keys(row).length > 0) {
              const keys = Object.keys(row);
              excelName = row[keys[0]];
              for (let key of keys) {
                if (typeof row[key] === 'number') {
                  excelQty = row[key];
                  break;
                }
              }
            }

            if (!excelName) return null;

            const { matchedProduct, matchedVariant } = findProductAndVariant(excelName, products);

            return {
              excelName: String(excelName),
              excelQty: excelQty != null ? Number(excelQty) : 0,
              isVariant: !!matchedVariant || (matchedProduct && matchedProduct.variants && matchedProduct.variants.length > 0),
              matchedProduct,
              matchedVariant,
              rawRow: row
            };
          }).filter(Boolean);

          setStockMappedData(mapped);
          setStockUploadSuccess(true);
        } catch (err) {
          console.error('Excel parsing error:', err);
          setError('Failed to parse excel file. Ensure format is correct.');
        } finally {
          setIsUploadingStock(false);
        }
      };
      reader.readAsBinaryString(stockFile);
    } catch (err) {
      console.error(err);
      setError('An error occurred during file upload.');
      setIsUploadingStock(false);
    }
  };

  const handleSyncStockProduct = async (mapping, index) => {
    if (!mapping.matchedProduct) return;

    setStockSyncingStates(prev => ({ ...prev, [index]: true }));
    setStockSyncStatus(prev => ({ ...prev, [index]: null }));

    try {
      const p = products.find(prod => prod._id === mapping.matchedProduct._id) || mapping.matchedProduct;
      let updatedVariants = p.variants ? [...p.variants.map(v => ({ ...v }))] : [];

      // Find all mappings for this product in stockMappedData to avoid overwriting sibling variants
      const productMappings = stockMappedData.filter(m => m.matchedProduct && m.matchedProduct._id === p._id);
      
      productMappings.forEach(m => {
        if (m.matchedVariant) {
          updatedVariants = updatedVariants.map(v => {
            const isMatch = v.name && m.matchedVariant.name && v.name.trim().toLowerCase() === m.matchedVariant.name.trim().toLowerCase();
            if (isMatch) {
              return { ...v, quantity: Number(m.excelQty) || 0 };
            }
            return v;
          });
        }
      });

      let updatedTotalQuantity = 0;
      if (updatedVariants.length > 0) {
        updatedTotalQuantity = updatedVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
      } else {
        updatedTotalQuantity = Number(mapping.excelQty) || 0;
      }

      const payloadVariants = updatedVariants.map(v => {
        const parsedQP = (v.quantityPricing || [])
          .map(qp => ({ minQty: Number(qp.minQty) || 0, price: Number(qp.price) || 0 }))
          .filter(qp => qp.minQty > 0 || qp.price > 0);
        
        return {
          ...v,
          quantity: Number(v.quantity) || 0,
          price: Number(v.price ?? v.basePrice ?? v.price) || 0,
          offerPrice: Number(v.offerPrice) || 0,
          l1Price: Number(v.l1Price) || 0,
          l2Price: Number(v.l2Price) || 0,
          l3Price: Number(v.l3Price) || 0,
          quantityPricing: parsedQP,
          isActive: v.isActive !== false
        };
      });

      // Check if stock actually changed from DB values
      const hasStockChanged = productMappings.some(m => {
        const currentDbQty = m.matchedVariant
          ? Number(m.matchedVariant.quantity) || 0
          : Number(m.matchedProduct.totalQuantity) || 0;
        return Number(m.excelQty) !== currentDbQty;
      });

      if (!hasStockChanged) {
        setStockSyncStatus(prev => ({ ...prev, [index]: 'success' }));
        return;
      }

      const formData = new FormData();
      formData.append('name', p.name || '');
      formData.append('description', p.description || '');
      formData.append('details', p.details || '');
      formData.append('expertNotes', p.expertNotes || '');
      formData.append('basePrice', p.basePrice || 0);
      formData.append('offerPrice', p.offerPrice || 0);
      formData.append('l1Price', p.l1Price || 0);
      formData.append('l2Price', p.l2Price || 0);
      formData.append('l3Price', p.l3Price || 0);
      formData.append('quantityPricing', JSON.stringify(p.quantityPricing || []));
      formData.append('eanNumber', p.eanNumber || '');
      formData.append('totalQuantity', updatedTotalQuantity);
      formData.append('cancellationPolicy', p.cancellationPolicy || '');
      formData.append('sevenDaysReturn', p.sevenDaysReturn || '');
      formData.append('warranty', p.warranty || '');

      const brandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
      const catId = typeof p.category === 'object' ? p.category?._id : p.category;
      
      if (brandId) formData.append('brand', brandId);
      if (catId) formData.append('category', catId);
      
      formData.append('variants', JSON.stringify(payloadVariants));
      
      if (p.images && p.images.length > 0) {
        formData.append('images', JSON.stringify(p.images));
      }

      await api.put(`/products/${p._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local products list reference
      setProducts(prevProducts => prevProducts.map(item => 
        item._id === p._id ? { ...item, totalQuantity: updatedTotalQuantity, variants: payloadVariants } : item
      ));

      // Update local state mappings to reflect the updated quantities
      setStockMappedData(prevData => prevData.map((item, idx) => {
        if (item.matchedProduct?._id === p._id) {
          const newProd = { ...item.matchedProduct, totalQuantity: updatedTotalQuantity, variants: payloadVariants };
          const newVar = item.matchedVariant ? newProd.variants?.find(v => v.name === item.matchedVariant.name) : null;
          return { ...item, matchedProduct: newProd, matchedVariant: newVar };
        }
        return item;
      }));

      setStockSyncStatus(prev => ({ ...prev, [index]: 'success' }));
    } catch (err) {
      console.error('Failed to sync stock', err);
      setStockSyncStatus(prev => ({ ...prev, [index]: 'error' }));
    } finally {
      setStockSyncingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleBulkSyncStock = async () => {
    setIsSyncingStock(true);
    setStockSyncResult(null);
    setError('');

    // Group the mappings by matchedProduct ID
    const productGroups = {};
    stockMappedData.forEach((mapping, index) => {
      if (!mapping.matchedProduct) return;
      const pid = mapping.matchedProduct._id;
      if (!productGroups[pid]) {
        productGroups[pid] = {
          product: mapping.matchedProduct,
          mappings: [],
          indices: []
        };
      }
      productGroups[pid].mappings.push(mapping);
      productGroups[pid].indices.push(index);
    });

    const pids = Object.keys(productGroups);
    if (pids.length === 0) {
      setError('No matched products to sync.');
      setIsSyncingStock(false);
      return;
    }

    // Open progress and status modal
    setStatusModalTitle('Synchronizing Stock Quantities');
    setIsSyncingInProgress(true);
    setSyncProgress({ current: 0, total: pids.length });
    setSyncLogs([{ name: 'Bulk Stock Update', status: 'pending', message: `Initializing synchronization for ${pids.length} products...` }]);
    setShowStatusModal(true);

    let successCount = 0;
    let failedCount = 0;
    const syncedItemsLog = [];
    const updatedProductsMap = {};

    for (let i = 0; i < pids.length; i++) {
      const pid = pids[i];
      setSyncProgress(prev => ({ ...prev, current: i + 1 }));
      const group = productGroups[pid];
      
      try {
        const p = products.find(prod => prod._id === pid) || group.product;
        let updatedVariants = p.variants ? [...p.variants.map(v => ({ ...v }))] : [];

        // Apply all mappings for this product
        group.mappings.forEach((mapping) => {
          if (mapping.matchedVariant) {
            updatedVariants = updatedVariants.map(v => {
              const isMatch = v.name && mapping.matchedVariant.name && v.name.trim().toLowerCase() === mapping.matchedVariant.name.trim().toLowerCase();
              if (isMatch) {
                return { ...v, quantity: Number(mapping.excelQty) || 0 };
              }
              return v;
            });
          }
        });

        let updatedTotalQuantity = 0;
        if (updatedVariants.length > 0) {
          updatedTotalQuantity = updatedVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
        } else if (group.mappings.length > 0) {
          updatedTotalQuantity = Number(group.mappings[group.mappings.length - 1].excelQty) || 0;
        }

        const payloadVariants = updatedVariants.map(v => {
          const parsedQP = (v.quantityPricing || [])
            .map(qp => ({ minQty: Number(qp.minQty) || 0, price: Number(qp.price) || 0 }))
            .filter(qp => qp.minQty > 0 || qp.price > 0);
          
          return {
            ...v,
            quantity: Number(v.quantity) || 0,
            price: Number(v.price ?? v.basePrice ?? v.price) || 0,
            offerPrice: Number(v.offerPrice) || 0,
            l1Price: Number(v.l1Price) || 0,
            l2Price: Number(v.l2Price) || 0,
            l3Price: Number(v.l3Price) || 0,
            quantityPricing: parsedQP,
            isActive: v.isActive !== false
          };
        });

        // Check if stock actually changed from DB values
        const hasStockChanged = group.mappings.some(m => {
          const currentDbQty = m.matchedVariant
            ? Number(m.matchedVariant.quantity) || 0
            : Number(m.matchedProduct.totalQuantity) || 0;
          return Number(m.excelQty) !== currentDbQty;
        });

        if (!hasStockChanged) {
          group.indices.forEach((index) => {
            setStockSyncStatus(prev => ({ ...prev, [index]: 'success' }));
          });

          group.mappings.forEach((mapping) => {
            const currentQty = mapping.matchedVariant ? (mapping.matchedVariant.quantity || 0) : (p.totalQuantity || 0);
            setSyncLogs(prev => [
              {
                name: mapping.excelName,
                status: 'info',
                message: `Stock already matches database (${currentQty} pcs). No update needed.`
              },
              ...prev
            ]);
          });

          successCount++;
          continue;
        }

        const formData = new FormData();
        formData.append('name', p.name || '');
        formData.append('description', p.description || '');
        formData.append('details', p.details || '');
        formData.append('expertNotes', p.expertNotes || '');
        formData.append('basePrice', p.basePrice || 0);
        formData.append('offerPrice', p.offerPrice || 0);
        formData.append('l1Price', p.l1Price || 0);
        formData.append('l2Price', p.l2Price || 0);
        formData.append('l3Price', p.l3Price || 0);
        formData.append('quantityPricing', JSON.stringify(p.quantityPricing || []));
        formData.append('eanNumber', p.eanNumber || '');
        formData.append('totalQuantity', updatedTotalQuantity);
        formData.append('cancellationPolicy', p.cancellationPolicy || '');
        formData.append('sevenDaysReturn', p.sevenDaysReturn || '');
        formData.append('warranty', p.warranty || '');

        const brandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
        const catId = typeof p.category === 'object' ? p.category?._id : p.category;
        
        if (brandId) formData.append('brand', brandId);
        if (catId) formData.append('category', catId);
        
        formData.append('variants', JSON.stringify(payloadVariants));
        
        if (p.images && p.images.length > 0) {
          formData.append('images', JSON.stringify(p.images));
        }

        await api.put(`/products/${p._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        group.indices.forEach((index) => {
          setStockSyncStatus(prev => ({ ...prev, [index]: 'success' }));
        });

        setProducts(prevProducts => prevProducts.map(item => 
          item._id === p._id ? { ...item, totalQuantity: updatedTotalQuantity, variants: payloadVariants } : item
        ));

        group.mappings.forEach((mapping) => {
          const oldQty = mapping.matchedVariant ? mapping.matchedVariant.quantity : p.totalQuantity;
          syncedItemsLog.push({
            name: mapping.excelName,
            oldQuantity: oldQty,
            newQuantity: mapping.excelQty
          });

          // Log success message in the modal
          setSyncLogs(prev => [
            {
              name: mapping.excelName,
              status: 'success',
              message: `Successfully synchronized stock: ${oldQty} → ${mapping.excelQty}`
            },
            ...prev
          ]);
        });

        updatedProductsMap[pid] = { totalQuantity: updatedTotalQuantity, variants: updatedVariants };

        successCount++;
      } catch (err) {
        console.error(`Failed to bulk sync product ${pid}`, err);
        group.indices.forEach((index) => {
          setStockSyncStatus(prev => ({ ...prev, [index]: 'error' }));
        });
        
        group.mappings.forEach((mapping) => {
          setSyncLogs(prev => [
            {
              name: mapping.excelName,
              status: 'error',
              message: err.response?.data?.message || 'Sync request failed.'
            },
            ...prev
          ]);
        });
        
        failedCount++;
      }
    }

    setStockSyncResult({
      updatedProducts: successCount,
      failedProducts: failedCount,
      syncedLog: syncedItemsLog
    });
    
    // Dynamically update the mapped stock values too
    setStockMappedData(prevData => prevData.map((item) => {
      const pid = item.matchedProduct?._id;
      if (pid && updatedProductsMap[pid]) {
        const { totalQuantity, variants } = updatedProductsMap[pid];
        const newProd = { ...item.matchedProduct, totalQuantity, variants };
        const newVar = item.matchedVariant ? variants.find(v => v.name === item.matchedVariant.name) : null;
        return { ...item, matchedProduct: newProd, matchedVariant: newVar };
      }
      return item;
    }));

    setIsSyncingStock(false);
    setIsSyncingInProgress(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    setIsUploading(true);
    setError('');
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/tally/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadSuccess(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const mapped = jsonData.map(row => {
            let excelName = row['Name'] || row['name'] || row['Item Name'] || row['Item'] || row['Product'] || row['Product Name'];
            let excelQty = row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || row['Closing Balance'] || row['Stock'] || row['Total Quantity'] || row['Stock / Qty'] || row['Stock/Qty'] || row['Stock / qty'] || row['Stock/qty'];
            
            if (!excelName && Object.keys(row).length > 0) {
              const keys = Object.keys(row);
              excelName = row[keys[0]];
              for (let key of keys) {
                 if (typeof row[key] === 'number') {
                     excelQty = row[key];
                     break;
                 }
              }
            }
            
            let matchedProduct = null;
            let matchedVariant = null;
            if (excelName) {
              const res = findProductAndVariant(excelName, products);
              matchedProduct = res.matchedProduct;
              matchedVariant = res.matchedVariant;
            }
            
            return {
              excelName: String(excelName || 'Unknown'),
              excelQty: excelQty != null ? Number(excelQty) : 0,
              isVariant: !!matchedVariant || (matchedProduct && matchedProduct.variants && matchedProduct.variants.length > 0),
              matchedProduct,
              matchedVariant,
              rawRow: row
            };
          });
          
          setMappedData(mapped);
        } catch (err) {
          console.error('Excel parsing error for preview:', err);
        }
      };
      reader.readAsBinaryString(file);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload Tally data.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError('');
    setSyncResult(null);

    // Open loading popup
    setStatusModalTitle('Synchronizing Tally Products');
    setIsSyncingInProgress(true);
    setSyncProgress({ current: 0, total: 1 });
    setSyncLogs([{ name: 'Tally Database Sync', status: 'pending', message: 'Connecting to Tally database & fetching mapping rules...' }]);
    setShowStatusModal(true);

    try {
      const response = await api.post('/tally/sync');
      setSyncResult(response.data);
      
      const bulkSynced = mappedData.filter(m => m.matchedProduct).map(m => ({
        id: m.matchedProduct._id,
        name: m.matchedProduct.name,
        eanNumber: m.matchedProduct.eanNumber,
        oldQuantity: m.matchedProduct.totalQuantity,
        newQuantity: m.excelQty
      }));
      setSyncedProducts(bulkSynced);

      setSyncProgress({ current: 1, total: 1 });
      setSyncLogs(prev => [
        { name: 'Tally Database Sync', status: 'success', message: `Sync complete. Updated ${response.data.updatedProducts || 0} products. Unmatched: ${response.data.unmatchedProducts || 0}` },
        ...bulkSynced.map(item => ({
          name: item.name,
          status: 'success',
          message: `Updated stock/details: ${item.oldQuantity} → ${item.newQuantity}`
        }))
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to sync Tally data.';
      setError(errMsg);
      console.error('Sync error:', err);

      setSyncLogs(prev => [
        ...prev,
        { name: 'Tally Database Sync', status: 'error', message: errMsg }
      ]);
    } finally {
      setIsSyncing(false);
      setIsSyncingInProgress(false);
    }
  };

  const handleSyncProduct = async (mapping, index) => {
    if (!mapping.matchedProduct) return;
    
    setSyncingStates(prev => ({ ...prev, [index]: true }));
    setSyncStatus(prev => ({ ...prev, [index]: null }));
    
    try {
      const p = products.find(prod => prod._id === mapping.matchedProduct._id) || mapping.matchedProduct;
      let updatedTotalQuantity = p.totalQuantity;
      let updatedVariants = p.variants ? [...p.variants.map(v => ({ ...v }))] : [];

      if (mapping.matchedVariant) {
        updatedVariants = updatedVariants.map(v => {
          if (v._id === mapping.matchedVariant._id || (v.name && mapping.matchedVariant.name && v.name.trim().toLowerCase() === mapping.matchedVariant.name.trim().toLowerCase())) {
            return { ...v, quantity: mapping.excelQty };
          }
          return v;
        });
        updatedTotalQuantity = updatedVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
      } else {
        updatedTotalQuantity = mapping.excelQty;
      }

      const formData = new FormData();
      
      formData.append('name', p.name || '');
      formData.append('description', p.description || '');
      formData.append('details', p.details || '');
      formData.append('expertNotes', p.expertNotes || '');
      formData.append('basePrice', p.basePrice || 0);
      formData.append('offerPrice', p.offerPrice || 0);
      formData.append('l1Price', p.l1Price || 0);
      formData.append('l2Price', p.l2Price || 0);
      formData.append('l3Price', p.l3Price || 0);
      formData.append('quantityPricing', JSON.stringify(p.quantityPricing || []));
      formData.append('eanNumber', p.eanNumber || '');
      formData.append('totalQuantity', updatedTotalQuantity);
      formData.append('cancellationPolicy', p.cancellationPolicy || '');
      formData.append('sevenDaysReturn', p.sevenDaysReturn || '');
      formData.append('warranty', p.warranty || '');

      const brandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
      const catId = typeof p.category === 'object' ? p.category?._id : p.category;
      
      if (brandId) formData.append('brand', brandId);
      if (catId) formData.append('category', catId);
      
      formData.append('variants', JSON.stringify(updatedVariants));
      
      if (p.images && p.images.length > 0) {
        formData.append('images', JSON.stringify(p.images));
      }

      await api.put(`/products/${p._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSyncStatus(prev => ({ ...prev, [index]: 'success' }));
      setSyncedProducts(prev => {
        if (prev.some(item => item.id === p._id)) return prev;
        return [...prev, {
          id: p._id,
          name: p.name,
          eanNumber: p.eanNumber,
          oldQuantity: p.totalQuantity,
          newQuantity: updatedTotalQuantity
        }];
      });
      
    } catch (err) {
      console.error('Failed to sync product', err);
      setSyncStatus(prev => ({ ...prev, [index]: 'error' }));
    } finally {
      setSyncingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="relative space-y-4 min-h-full z-0">
      <div className="flex items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiFilter className='text-blue-400'/>Product Mapping</h1>
          <p className="text-slate-400 font-medium mt-1">Upload inventory report or Tally files to sync product quantities.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 gap-6 mb-4">
        <button
          onClick={() => {
            setActiveTab('tally');
            setError('');
          }}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'tally'
              ? 'text-blue-400 border-blue-500'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Tally Mapping (Standard)
        </button>
        <button
          onClick={() => {
            setActiveTab('stock');
            setError('');
          }}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'stock'
              ? 'text-blue-400 border-blue-500'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Stock Update (Detailed & Variants)
        </button>
      </div>

      <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl md:rounded-3xl p-6 space-y-6">
        {activeTab === 'tally' ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Step 1: Upload Tally Export File</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="tally-upload"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="tally-upload" className="grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-400 hover:file:bg-blue-800/50 transition-colors cursor-pointer text-slate-400 border border-dashed border-slate-600 rounded-xl p-4 text-center">
                    {file ? file.name : 'Click to select a file'}
                  </label>
                  <button
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className="flex items-center justify-center px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? <FiLoader className="animate-spin mr-2" /> : <FiUpload className="mr-2" />}
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>

              {uploadSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center">
                  <FiCheckCircle className="mr-3 text-xl" />
                  File uploaded successfully. You can now proceed to sync.
                </div>
              )}
            </div>

            {mappedData.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Mapped Products Preview</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Preview of excel import data and match status.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setTallyFilter('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        tallyFilter === 'all'
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      Show All ({mappedData.length})
                    </button>
                    <button
                      onClick={() => setTallyFilter('unmatched_missing')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        tallyFilter === 'unmatched_missing'
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      Unmatched & Missing ({mappedData.filter(m => !m.matchedProduct).length + getMissingTallyItems().length})
                    </button>
                  </div>
                </div>

                {tallyFilter === 'unmatched_missing' ? (
                  <div className="space-y-6">
                    {/* Section 1: Unmatched Excel Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <FiAlertTriangle /> Excel Items Not Found in System ({mappedData.filter(m => !m.matchedProduct).length})
                      </h4>
                      <div className="overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-xl border border-white/10 max-h-60">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead className="bg-slate-800/80 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                              <th className="px-4 py-3 font-medium w-12 text-center">S.No</th>
                              <th className="px-4 py-3 font-medium">Excel Product</th>
                              <th className="px-4 py-3 font-medium text-center">Excel Qty</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {mappedData.filter(m => !m.matchedProduct).length === 0 ? (
                              <tr>
                                <td colSpan="4" className="px-4 py-6 text-center text-slate-500 italic">No unmatched Excel items. All items mapped!</td>
                              </tr>
                            ) : (
                              mappedData
                                .map((mapping, idx) => ({ mapping, idx }))
                                .filter(({ mapping }) => !mapping.matchedProduct)
                                .map(({ mapping, idx }, listIdx) => (
                                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-400 text-center font-medium">{listIdx + 1}</td>
                                    <td className="px-4 py-3 text-sm text-slate-300">{mapping.excelName}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-amber-400 text-center">{mapping.excelQty}</td>
                                    <td className="px-4 py-3 text-sm text-red-400/80 italic font-semibold">Not Found</td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Missing System Products */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                        <FiDatabase /> System Products Missing from Excel ({getMissingTallyItems().length})
                      </h4>
                      <div className="overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-xl border border-white/10 max-h-60">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead className="bg-slate-800/80 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                              <th className="px-4 py-3 font-medium w-12 text-center">S.No</th>
                              <th className="px-4 py-3 font-medium">System Product</th>
                              <th className="px-4 py-3 font-medium">Variant</th>
                              <th className="px-4 py-3 font-medium">EAN / SKU</th>
                              <th className="px-4 py-3 font-medium text-center">System Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {getMissingTallyItems().length === 0 ? (
                              <tr>
                                <td colSpan="5" className="px-4 py-6 text-center text-slate-500 italic">No missing system products. All are matched!</td>
                              </tr>
                            ) : (
                              getMissingTallyItems().map((item, index) => {
                                const brandStr = typeof item.product.brand === 'object' ? item.product.brand?.name : item.product.brand;
                                return (
                                  <tr key={index} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-400 text-center font-medium">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                      <div>
                                        <span className="font-semibold text-white">{item.product.name}</span>
                                        {brandStr && <span className="ml-2 text-xs text-slate-400">({brandStr})</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">
                                      {item.variant ? (
                                        <span className="text-blue-400 font-medium">{item.variant.name}</span>
                                      ) : (
                                        <span className="text-slate-500 font-normal">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                                      {item.variant ? item.variant.sku : item.product.eanNumber || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-amber-500 text-center">
                                      {item.variant ? item.variant.quantity : item.product.totalQuantity}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-xl border border-white/10 max-h-96">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-slate-800/80 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          <th className="px-4 py-3 font-medium w-12 text-center">S.No</th>
                          <th className="px-4 py-3 font-medium">Excel Product</th>
                          <th className="px-4 py-3 font-medium text-center">Excel Qty</th>
                          <th className="px-4 py-3 font-medium">Matched System Product</th>
                          <th className="px-4 py-3 font-medium text-center">System Qty</th>
                          <th className="px-4 py-3 font-medium text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {mappedData.map((mapping, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-400 text-center font-medium">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-slate-300">{mapping.excelName}</td>
                            <td className="px-4 py-3 text-sm font-bold text-amber-400 text-center">{mapping.excelQty}</td>
                            <td className="px-4 py-3 text-sm">
                              {mapping.matchedProduct ? (
                                <span className="text-emerald-400 font-medium">{mapping.matchedProduct.name}</span>
                              ) : (
                                <span className="text-red-400/80 italic">Not Found</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400 text-center">
                              {mapping.matchedProduct ? mapping.matchedProduct.totalQuantity : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleSyncProduct(mapping, index)}
                                disabled={!mapping.matchedProduct || syncingStates[index] || syncStatus[index] === 'success'}
                                className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                  syncStatus[index] === 'success' 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                    : syncStatus[index] === 'error'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                    : 'bg-blue-600/50 text-white hover:bg-blue-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                              >
                                {syncingStates[index] ? <FiLoader className="animate-spin mr-1.5" /> : syncStatus[index] === 'success' ? <FiCheckCircle className="mr-1.5" /> : <FiRefreshCcw className="mr-1.5" />}
                                {syncStatus[index] === 'success' ? 'Synced' : syncStatus[index] === 'error' ? 'Retry' : 'Sync'}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Step 2: Synchronize Products</label>
                <button
                  onClick={handleSync}
                  disabled={!uploadSuccess || isSyncing}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? <FiLoader className="animate-spin mr-2" /> : <FiRefreshCcw className="mr-2" />}
                  {isSyncing ? 'Syncing...' : 'Bulk Sync'}
                </button>
              </div>
            </div>

            {syncResult && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-lg font-bold text-white">Sync Complete</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400">Products Updated</p>
                    <p className="text-2xl font-bold text-emerald-400">{syncResult.updatedProducts}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400">Products Not Found</p>
                    <p className="text-2xl font-bold text-amber-400">{syncResult.unmatchedProducts}</p>
                  </div>
                </div>
                {syncedProducts.length > 0 && (
                  <div>
                    <h4 className="text-md font-bold text-white mb-2">Successfully Synced Log</h4>
                    <div className="max-h-60 overflow-y-auto bg-slate-900/50 p-2 rounded-lg custom-scrollbar">
                      <ul className="text-sm text-slate-400 space-y-1">
                        {syncedProducts.map((item, index) => (
                          <li key={index} className="p-2 bg-slate-800/50 rounded flex justify-between">
                            <span>{item.name}</span>
                            <span className="font-mono text-xs">
                              <span className="text-slate-500 font-bold">{item.oldQuantity}</span>
                              <span className="mx-2 text-slate-500">→</span>
                              <span className="text-emerald-400 font-bold">{item.newQuantity}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {syncResult.unmatched && syncResult.unmatched.length > 0 && (
                  <div>
                    <h4 className="text-md font-bold text-white mb-2">Unmatched Products</h4>
                    <div className="max-h-60 overflow-y-auto bg-slate-900/50 p-2 rounded-lg custom-scrollbar">
                      <ul className="text-sm text-slate-400 space-y-1">
                        {syncResult.unmatched.map((item, index) => (
                          <li key={index} className="p-2 bg-slate-800/50 rounded">
                            {item.name || 'Unknown Name'} (EAN: {item.eanNumber || 'N/A'})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* New Stock Update UI */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Step 1: Upload Detailed Inventory File</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="stock-upload"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleStockFileChange}
                  />
                  <label htmlFor="stock-upload" className="grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-400 hover:file:bg-blue-800/50 transition-colors cursor-pointer text-slate-400 border border-dashed border-slate-600 rounded-xl p-4 text-center">
                    {stockFile ? stockFile.name : 'Click to select a stock list file'}
                  </label>
                  <button
                    onClick={handleStockUpload}
                    disabled={!stockFile || isUploadingStock}
                    className="flex items-center justify-center px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingStock ? <FiLoader className="animate-spin mr-2" /> : <FiUpload className="mr-2" />}
                    {isUploadingStock ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>

              {stockUploadSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center">
                  <FiCheckCircle className="mr-3 text-xl" />
                  Stock list parsed successfully. Verify matches below and synchronize.
                </div>
              )}
            </div>

            {stockMappedData.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Stock Mapping Preview</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {
                        stockMappedData.filter(m => {
                          if (!m.matchedProduct) return false;
                          const current = m.matchedVariant ? (m.matchedVariant.quantity || 0) : (m.matchedProduct.totalQuantity || 0);
                          return Number(m.excelQty) !== Number(current);
                        }).length
                      } items have stock differences. Unchanged items are automatically skipped during sync.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setStockFilter('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        stockFilter === 'all'
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      Show All ({stockMappedData.length})
                    </button>
                    <button
                      onClick={() => setStockFilter('diff')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        stockFilter === 'diff'
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      Only Differences ({
                        stockMappedData.filter(m => {
                          if (!m.matchedProduct) return false;
                          const current = m.matchedVariant ? (m.matchedVariant.quantity || 0) : (m.matchedProduct.totalQuantity || 0);
                          return Number(m.excelQty) !== Number(current);
                        }).length
                      })
                    </button>
                    <button
                      onClick={() => setStockFilter('unmatched_missing')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        stockFilter === 'unmatched_missing'
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      Unmatched & Missing ({stockMappedData.filter(m => !m.matchedProduct).length + getMissingStockItems().length})
                    </button>
                  </div>
                </div>

                {stockFilter === 'unmatched_missing' ? (
                  <div className="space-y-6">
                    {/* Section 1: Unmatched Excel Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <FiAlertTriangle /> Excel Items Not Found in System ({stockMappedData.filter(m => !m.matchedProduct).length})
                      </h4>
                      <div className="overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-xl border border-white/10 max-h-60">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead className="bg-slate-800/80 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                              <th className="px-4 py-3 font-medium w-12 text-center">S.No</th>
                              <th className="px-4 py-3 font-medium">Excel Item Name</th>
                              <th className="px-4 py-3 font-medium text-center">Excel Stock</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {stockMappedData.filter(m => !m.matchedProduct).length === 0 ? (
                              <tr>
                                <td colSpan="4" className="px-4 py-6 text-center text-slate-500 italic">No unmatched Excel items. All items mapped!</td>
                              </tr>
                            ) : (
                              stockMappedData
                                .map((mapping, originalIndex) => ({ mapping, originalIndex }))
                                .filter(({ mapping }) => !mapping.matchedProduct)
                                .map(({ mapping, originalIndex }, listIdx) => (
                                  <tr key={originalIndex} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-400 text-center font-medium">{listIdx + 1}</td>
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                      {mapping.excelName}
                                      {mapping.isVariant && (
                                        <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Variant</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-amber-400 text-center">{mapping.excelQty}</td>
                                    <td className="px-4 py-3 text-sm text-red-400/80 italic font-semibold">Not Found</td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Missing System Products */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                        <FiDatabase /> System Products Missing from Excel ({getMissingStockItems().length})
                      </h4>
                      <div className="overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-xl border border-white/10 max-h-60">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead className="bg-slate-800/80 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                              <th className="px-4 py-3 font-medium w-12 text-center">S.No</th>
                              <th className="px-4 py-3 font-medium">System Product</th>
                              <th className="px-4 py-3 font-medium">Variant</th>
                              <th className="px-4 py-3 font-medium">EAN / SKU</th>
                              <th className="px-4 py-3 font-medium text-center font-medium">System Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {getMissingStockItems().length === 0 ? (
                              <tr>
                                <td colSpan="5" className="px-4 py-6 text-center text-slate-500 italic">No missing system products. All are matched!</td>
                              </tr>
                            ) : (
                              getMissingStockItems().map((item, index) => {
                                const brandStr = typeof item.product.brand === 'object' ? item.product.brand?.name : item.product.brand;
                                return (
                                  <tr key={index} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-400 text-center font-medium">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                      <div>
                                        <span className="font-semibold text-white">{item.product.name}</span>
                                        {brandStr && <span className="ml-2 text-xs text-slate-400">({brandStr})</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">
                                      {item.variant ? (
                                        <span className="text-blue-400 font-medium">{item.variant.name}</span>
                                      ) : (
                                        <span className="text-slate-500 font-normal">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                                      {item.variant ? item.variant.sku : item.product.eanNumber || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-amber-500 text-center">
                                      {item.variant ? item.variant.quantity : item.product.totalQuantity}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-xl border border-white/10 max-h-96">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-slate-800/80 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          <th className="px-4 py-3 font-medium w-12 text-center">S.No</th>
                          <th className="px-4 py-3 font-medium">Excel Item Name</th>
                          <th className="px-4 py-3 font-medium text-center font-medium">Excel Stock</th>
                          <th className="px-4 py-3 font-medium">Matched System Product</th>
                          <th className="px-4 py-3 font-medium">Matched Variant</th>
                          <th className="px-4 py-3 font-medium text-center font-medium">Current Stock</th>
                          <th className="px-4 py-3 font-medium text-center font-medium">Status / Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {stockMappedData
                          .map((mapping, originalIndex) => ({ mapping, originalIndex }))
                          .filter(({ mapping }) => {
                            if (stockFilter === 'diff') {
                              if (!mapping.matchedProduct) return false;
                              const current = mapping.matchedVariant ? (mapping.matchedVariant.quantity || 0) : (mapping.matchedProduct.totalQuantity || 0);
                              return Number(mapping.excelQty) !== Number(current);
                            }
                            return true;
                          })
                          .map(({ mapping, originalIndex }) => {
                            const currentStock = mapping.matchedProduct ? (mapping.matchedVariant ? (mapping.matchedVariant.quantity || 0) : (mapping.matchedProduct.totalQuantity || 0)) : null;
                            const isDiff = currentStock !== null && Number(mapping.excelQty) !== Number(currentStock);

                            return (
                              <tr key={originalIndex} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 text-sm text-slate-400 text-center font-medium">{originalIndex + 1}</td>
                                <td className="px-4 py-3 text-sm text-slate-300">
                                  {mapping.excelName}
                                  {mapping.isVariant && (
                                    <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Variant</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-amber-400 text-center">{mapping.excelQty}</td>
                                <td className="px-4 py-3 text-sm">
                                  {mapping.matchedProduct ? (
                                    <span className="text-emerald-400 font-medium">{mapping.matchedProduct.name}</span>
                                  ) : (
                                    <span className="text-red-400/80 italic">Not Found</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-300">
                                  {mapping.matchedVariant ? (
                                    <span className="text-blue-400 font-medium">{mapping.matchedVariant.name}</span>
                                  ) : mapping.isVariant && mapping.matchedProduct ? (
                                    <span className="text-amber-500/80 italic" title="Product exists, but this variant wasn't found">Variant Not Found</span>
                                  ) : (
                                    <span className="text-slate-500 font-normal">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400 text-center font-medium">
                                  {currentStock !== null ? (
                                    <span className="inline-flex items-center gap-1.5 justify-center">
                                      <span>{currentStock}</span>
                                      {isDiff ? (
                                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">Differs</span>
                                      ) : (
                                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400/80 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-normal">Unchanged</span>
                                      )}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleSyncStockProduct(mapping, originalIndex)}
                                    disabled={!mapping.matchedProduct || (mapping.isVariant && !mapping.matchedVariant) || stockSyncingStates[originalIndex] || stockSyncStatus[originalIndex] === 'success'}
                                    className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                      stockSyncStatus[originalIndex] === 'success' 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : stockSyncStatus[originalIndex] === 'error'
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                        : 'bg-blue-600/50 text-white hover:bg-blue-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                                  >
                                    {stockSyncingStates[originalIndex] ? <FiLoader className="animate-spin mr-1.5" /> : stockSyncStatus[originalIndex] === 'success' ? <FiCheckCircle className="mr-1.5" /> : <FiRefreshCcw className="mr-1.5" />}
                                    {stockSyncStatus[originalIndex] === 'success' ? (!isDiff ? 'Up to date' : 'Synced') : stockSyncStatus[originalIndex] === 'error' ? 'Retry' : 'Sync'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Step 2: Sync All Stock Quantities</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleBulkSyncStock}
                    disabled={!stockUploadSuccess || isSyncingStock}
                    className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSyncingStock ? <FiLoader className="animate-spin mr-2" /> : <FiRefreshCcw className="mr-2" />}
                    {isSyncingStock ? 'Syncing Stock...' : 'Bulk Sync Stock'}
                  </button>
                </div>
              </div>
            </div>

            {stockSyncResult && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-lg font-bold text-white">Stock Sync Complete</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400">Products Synchronized</p>
                    <p className="text-2xl font-bold text-emerald-400">{stockSyncResult.updatedProducts}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400">Products Failed / Not Synced</p>
                    <p className="text-2xl font-bold text-amber-400">{stockSyncResult.failedProducts}</p>
                  </div>
                </div>
                {stockSyncResult.syncedLog && stockSyncResult.syncedLog.length > 0 && (
                  <div>
                    <h4 className="text-md font-bold text-white mb-2">Successfully Synced Log</h4>
                    <div className="max-h-60 overflow-y-auto bg-slate-900/50 p-2 rounded-lg custom-scrollbar">
                      <ul className="text-sm text-slate-400 space-y-1">
                        {stockSyncResult.syncedLog.map((item, index) => (
                          <li key={index} className="p-2 bg-slate-800/50 rounded flex justify-between">
                            <span>{item.name}</span>
                            <span className="font-mono text-xs">
                              <span className="text-slate-500 font-bold">{item.oldQuantity}</span>
                              <span className="mx-2 text-slate-500">→</span>
                              <span className="text-emerald-400 font-bold">{item.newQuantity}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center">
            <FiAlertTriangle className="mr-3 text-xl" />
            {error}
          </div>
        )}
      </div>

      {/* Progress & Log Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all">
          <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <FiDatabase size={18} className={`text-blue-400 ${isSyncingInProgress ? 'animate-spin' : ''}`} />
                {statusModalTitle}
              </h3>
              {!isSyncingInProgress && (
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
                  <span>{syncProgress.current} / {syncProgress.total} items</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Header */}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Operation Logs
              </div>

              {/* Logs output */}
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-3 h-64 overflow-y-auto font-mono text-[10px] space-y-2">
                {syncLogs.length === 0 ? (
                  <div className="text-slate-600 italic">Starting bulk operation...</div>
                ) : (
                  syncLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                        log.status === 'success' 
                          ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400' 
                          : log.status === 'pending'
                          ? 'bg-blue-950/20 border-blue-500/10 text-blue-400'
                          : 'bg-rose-950/20 border-rose-500/10 text-rose-400'
                      }`}
                    >
                      <div className="flex justify-between font-bold text-[11px]">
                        <span>{log.name}</span>
                        <span className="uppercase">{log.status}</span>
                      </div>
                      <div className="opacity-80 text-[10px]">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex justify-end bg-slate-950/40">
              <button
                disabled={isSyncingInProgress}
                onClick={() => setShowStatusModal(false)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isSyncingInProgress 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isSyncingInProgress ? 'Executing Bulk Job...' : 'Close & Refresh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMapping;