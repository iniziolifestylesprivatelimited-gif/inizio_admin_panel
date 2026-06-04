import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiUpload, FiCheck, FiX, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { read, utils } from 'xlsx';
import { BASE_URL } from '../../../api/axios';

const ProductMapping = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mappedProducts, setMappedProducts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/products/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setFileUploaded(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws);
        
        processMapping(data);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Invalid file format. Please upload a valid Excel or CSV file.');
        setIsProcessing(false);
        setFileUploaded(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // Reset input
  };

  const processMapping = (excelData) => {
    const newMappedProducts = excelData.map((row, index) => {
      const ean = row['EAN'] || row['EAN Number'] || row['eanNumber'] || row['ean'];
      const name = row['Name'] || row['Product Name'] || row['name'];
      
      let matchedProduct = null;
      if (ean) {
        matchedProduct = products.find(p => String(p.eanNumber) === String(ean));
      }
      if (!matchedProduct && name) {
        matchedProduct = products.find(p => p.name?.toLowerCase() === name.toLowerCase());
      }

      if (matchedProduct) {
        const newBasePrice = row['Base Price'] || row['basePrice'] || matchedProduct.basePrice;
        const newOfferPrice = row['Offer Price'] || row['offerPrice'] || matchedProduct.offerPrice;
        const newQuantity = row['Total Quantity'] || row['totalQuantity'] || row['Quantity'] || matchedProduct.totalQuantity;
        
        const hasChanges = String(newBasePrice) !== String(matchedProduct.basePrice) || 
                           String(newOfferPrice) !== String(matchedProduct.offerPrice) || 
                           String(newQuantity) !== String(matchedProduct.totalQuantity);

        return {
          id: matchedProduct._id,
          key: index,
          name: matchedProduct.name,
          eanNumber: matchedProduct.eanNumber,
          oldBasePrice: matchedProduct.basePrice,
          newBasePrice: newBasePrice,
          oldOfferPrice: matchedProduct.offerPrice,
          newOfferPrice: newOfferPrice,
          oldQuantity: matchedProduct.totalQuantity,
          newQuantity: newQuantity,
          status: 'Matched',
          hasChanges,
          selected: hasChanges // Auto-select items that have differences
        };
      } else {
        return {
          key: index,
          name: name || 'Unknown',
          eanNumber: ean || 'Unknown',
          newBasePrice: row['Base Price'] || row['basePrice'] || 0,
          newOfferPrice: row['Offer Price'] || row['offerPrice'] || 0,
          newQuantity: row['Total Quantity'] || row['totalQuantity'] || row['Quantity'] || 0,
          status: 'Not Found',
          hasChanges: false,
          selected: false
        };
      }
    });

    setMappedProducts(newMappedProducts);
    setIsProcessing(false);
  };

  const toggleSelect = (index) => {
    const updated = [...mappedProducts];
    if (updated[index].status === 'Matched') {
      updated[index].selected = !updated[index].selected;
      setMappedProducts(updated);
    }
  };

  const toggleSelectAll = (e) => {
    const isChecked = e.target.checked;
    const updated = mappedProducts.map(p => 
      p.status === 'Matched' ? { ...p, selected: isChecked } : p
    );
    setMappedProducts(updated);
  };

  const handleSave = async () => {
    const toUpdate = mappedProducts.filter(p => p.selected && p.status === 'Matched' && p.hasChanges);
    if (toUpdate.length === 0) {
      alert('No matched products with changes selected for update.');
      return;
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      
      // Perform updates sequentially
      await Promise.all(toUpdate.map(async (p) => {
        const originalProduct = products.find(prod => prod._id === p.id);
        
        const formData = new FormData();
        formData.append('name', originalProduct.name || '');
        formData.append('description', originalProduct.description || '');
        formData.append('details', originalProduct.details || '');
        formData.append('expertNotes', originalProduct.expertNotes || '');
        formData.append('basePrice', p.newBasePrice !== undefined ? p.newBasePrice : (originalProduct.basePrice || 0));
        formData.append('offerPrice', p.newOfferPrice !== undefined ? p.newOfferPrice : (originalProduct.offerPrice || 0));
        formData.append('l1Price', originalProduct.l1Price || 0);
        formData.append('l2Price', originalProduct.l2Price || 0);
        formData.append('l3Price', originalProduct.l3Price || 0);
        formData.append('quantityPricing', JSON.stringify(originalProduct.quantityPricing || []));
        formData.append('eanNumber', originalProduct.eanNumber || '');
        formData.append('totalQuantity', p.newQuantity !== undefined ? p.newQuantity : (originalProduct.totalQuantity || 0));
        formData.append('cancellationPolicy', originalProduct.cancellationPolicy || '');
        formData.append('sevenDaysReturn', originalProduct.sevenDaysReturn || '');
        formData.append('warranty', originalProduct.warranty || '');

        const brandId = typeof originalProduct.brand === 'object' ? originalProduct.brand?._id : originalProduct.brand;
        const catId = typeof originalProduct.category === 'object' ? originalProduct.category?._id : originalProduct.category;
        
        if (brandId) formData.append('brand', brandId);
        if (catId) formData.append('category', catId);
        
        await axios.put(`${BASE_URL}/api/products/${p.id}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }));

      alert('Products updated successfully!');
      navigate('/products/list');
    } catch (error) {
      console.error('Failed to update products:', error);
      alert('Error updating some products. Please check the console.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><FiLoader className="animate-spin text-4xl text-blue-400" /></div>;
  }

  const allMatchedSelected = mappedProducts.filter(p => p.status === 'Matched').length > 0 && 
                             mappedProducts.filter(p => p.status === 'Matched').every(p => p.selected);

  return (
    <div className="relative space-y-6 min-h-full z-0">
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl shadow-sm transition-colors">
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Product Mapping</h1>
            <p className="text-slate-400 font-medium mt-1">Upload Excel/CSV to map and update products.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="file" 
            id="excel-upload" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <label htmlFor="excel-upload" className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/5 cursor-pointer">
            <FiUpload className="mr-2" />
            Upload File
          </label>
          {mappedProducts.length > 0 && (
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              {saving ? <FiLoader className="animate-spin mr-2" /> : <FiCheck className="mr-2" />}
              Approve & Update
            </button>
          )}
        </div>
      </div>

      {isProcessing && (
        <div className="flex justify-center py-10">
          <FiLoader className="animate-spin text-3xl text-blue-400 mr-3" />
          <span className="text-slate-300 font-medium">Processing file...</span>
        </div>
      )}

      {fileUploaded && !isProcessing && mappedProducts.length === 0 && (
        <div className="text-center py-10 text-slate-400 font-medium bg-slate-800/50 rounded-2xl border border-white/10">
          No data found in the uploaded file or unable to parse.
        </div>
      )}

      {mappedProducts.length > 0 && !isProcessing && (
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-800/50 border-b border-white/10 text-slate-300 text-sm">
                <tr>
                  <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50 transition-all cursor-pointer accent-blue-500 scheme-dark"
                      checked={allMatchedSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Status</th>
                  <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Product Info</th>
                  <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Base Price (Old &rarr; New)</th>
                  <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Offer Price (Old &rarr; New)</th>
                  <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">Quantity (Old &rarr; New)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {mappedProducts.map((p, index) => (
                  <tr key={p.key} className={`hover:bg-white/5 transition-colors ${!p.hasChanges && p.status === 'Matched' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50 transition-all cursor-pointer accent-blue-500 scheme-dark"
                        checked={p.selected}
                        disabled={p.status !== 'Matched'}
                        onChange={() => toggleSelect(index)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'Matched' ? (
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center w-fit">
                          <FiCheck className="mr-1" /> Matched
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg border border-red-500/20 flex items-center w-fit">
                          <FiX className="mr-1" /> Not Found
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white truncate max-w-[200px]" title={p.name}>{p.name}</p>
                      <p className="text-xs text-slate-400">EAN: {p.eanNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {p.status === 'Matched' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through">{p.oldBasePrice ?? '-'}</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className={String(p.oldBasePrice) !== String(p.newBasePrice) ? 'text-blue-400 font-bold' : 'text-slate-300'}>{p.newBasePrice ?? '-'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">{p.newBasePrice ?? '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {p.status === 'Matched' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through">{p.oldOfferPrice ?? '-'}</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className={String(p.oldOfferPrice) !== String(p.newOfferPrice) ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{p.newOfferPrice ?? '-'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">{p.newOfferPrice ?? '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {p.status === 'Matched' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through">{p.oldQuantity ?? '-'}</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className={String(p.oldQuantity) !== String(p.newQuantity) ? 'text-amber-400 font-bold' : 'text-slate-300'}>{p.newQuantity ?? '-'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">{p.newQuantity ?? '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!fileUploaded && !isProcessing && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FiAlertCircle className="text-4xl mb-4 opacity-50" />
          <p className="text-lg font-medium">Please upload an Excel or CSV file to start mapping.</p>
          <p className="text-sm mt-2 opacity-70">The file should contain headers like EAN, Name, Base Price, Offer Price, Quantity.</p>
        </div>
      )}
    </div>
  );
};

export default ProductMapping;