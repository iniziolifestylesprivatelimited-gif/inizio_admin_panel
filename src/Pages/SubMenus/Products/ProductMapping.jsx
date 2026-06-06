import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api/axios';
import { FiArrowLeft, FiUpload, FiRefreshCcw, FiLoader, FiCheckCircle, FiAlertTriangle, FiFilter } from 'react-icons/fi';
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
            let excelQty = row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || row['Closing Balance'] || row['Stock'] || row['Total Quantity'];
            
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
            if (excelName) {
              matchedProduct = products.find(p => 
                p.name?.toLowerCase() === String(excelName).toLowerCase() || 
                p.eanNumber === String(excelName) ||
                p.variants?.some(v => v.sku?.toLowerCase() === String(excelName).toLowerCase())
              );
            }
            
            return {
              excelName: String(excelName || 'Unknown'),
              excelQty: excelQty != null ? Number(excelQty) : 0,
              matchedProduct,
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sync Tally data.');
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncProduct = async (mapping, index) => {
    if (!mapping.matchedProduct) return;
    
    setSyncingStates(prev => ({ ...prev, [index]: true }));
    setSyncStatus(prev => ({ ...prev, [index]: null }));
    
    try {
      const p = mapping.matchedProduct;
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
      formData.append('totalQuantity', mapping.excelQty || 0);
      formData.append('cancellationPolicy', p.cancellationPolicy || '');
      formData.append('sevenDaysReturn', p.sevenDaysReturn || '');
      formData.append('warranty', p.warranty || '');

      const brandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
      const catId = typeof p.category === 'object' ? p.category?._id : p.category;
      
      if (brandId) formData.append('brand', brandId);
      if (catId) formData.append('category', catId);
      
      const v = p.variants || [];
      formData.append('variants', JSON.stringify(v));
      
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
          newQuantity: mapping.excelQty
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
    <div className="relative space-y-6 min-h-full z-0">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiFilter className='text-blue-400'/>Product Mapping</h1>
          <p className="text-slate-400 font-medium mt-1">Upload Tally stock report to sync product quantities.</p>
        </div>
      </div>

      <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl md:rounded-3xl p-6 space-y-6">
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
            <h3 className="text-lg font-bold text-white">Mapped Products Preview</h3>
            <div className="overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-xl border border-white/10 max-h-96">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-800/80 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium">Excel Product</th>
                    <th className="px-4 py-3 font-medium">Excel Qty</th>
                    <th className="px-4 py-3 font-medium">Matched System Product</th>
                    <th className="px-4 py-3 font-medium">System Qty</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mappedData.map((mapping, index) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300">{mapping.excelName}</td>
                      <td className="px-4 py-3 text-sm font-bold text-amber-400">{mapping.excelQty}</td>
                      <td className="px-4 py-3 text-sm">
                        {mapping.matchedProduct ? (
                          <span className="text-emerald-400 font-medium">{mapping.matchedProduct.name}</span>
                        ) : (
                          <span className="text-red-400/80 italic">Not Found</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
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
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Step 2: Synchronize Products</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSync}
                disabled={!uploadSuccess || isSyncing}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? <FiLoader className="animate-spin mr-2" /> : <FiRefreshCcw className="mr-2" />}
                {isSyncing ? 'Syncing...' : 'Bulk Sync'}
              </button>
              {syncedProducts.length > 0 && (
                <button
                  onClick={() => navigate('/products/updated-stock', { state: { updatedProducts: syncedProducts } })}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30"
                >
                  View Updated Stock ({syncedProducts.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center">
            <FiAlertTriangle className="mr-3 text-xl" />
            {error}
          </div>
        )}

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
      </div>
    </div>
  );
};

export default ProductMapping;