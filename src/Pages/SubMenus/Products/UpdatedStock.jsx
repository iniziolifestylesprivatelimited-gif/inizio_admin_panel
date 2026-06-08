import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBox, FiCheckCircle } from 'react-icons/fi';

const UpdatedStock = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const updatedProducts = location.state?.updatedProducts || [];

  return (
    <div className="relative space-y-4 min-h-full z-0">
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/products/mapping')} className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl shadow-sm transition-colors">
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Updated Stock</h1>
            <p className="text-slate-400 font-medium mt-1">Recently updated product quantities.</p>
          </div>
        </div>
      </div>

      <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full">
        {updatedProducts.length > 0 ? (
          <div className="overflow-auto custom-scrollbar max-h-[70vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-slate-300 text-sm shadow-md">
                <tr>
                  <th className="px-4 py-4 font-medium uppercase tracking-wider text-xs w-16">S.No.</th>
                  <th className="px-4 py-4 font-medium uppercase tracking-wider text-xs">Product Name</th>
                  <th className="px-4 py-4 font-medium uppercase tracking-wider text-xs">EAN Number</th>
                  <th className="px-4 py-4 font-medium uppercase tracking-wider text-xs">Previous Quantity</th>
                  <th className="px-4 py-4 font-medium uppercase tracking-wider text-xs">New Quantity</th>
                  <th className="px-4 py-4 font-medium uppercase tracking-wider text-xs text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {updatedProducts.map((p, index) => (
                  <tr key={p.id || index} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-slate-400">{index + 1}</td>
                    <td className="px-4 py-4 text-sm font-bold text-white max-w-62.5 truncate" title={p.name}>{p.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-300">{p.eanNumber}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{p.oldQuantity ?? '-'}</td>
                    <td className="px-4 py-4 text-sm font-bold text-amber-400">{p.newQuantity ?? '-'}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                        <FiCheckCircle className="mr-1" /> Updated
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FiBox className="text-5xl mb-4 opacity-50" />
            <p className="text-lg font-medium text-white mb-1">No recent updates</p>
            <p className="text-sm">Products with updated stock will appear here after mapping.</p>
            <button 
              onClick={() => navigate('/products/mapping')}
              className="mt-6 px-6 py-2.5 bg-blue-600/50 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
            >
              Go to Product Mapping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdatedStock;