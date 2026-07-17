import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FiSearch, FiPackage, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { BASE_URL } from '../../api/axios';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const token = sessionStorage.getItem('accessToken');
        
        // Fetching products to search through them. 
        // If your backend has a dedicated search endpoint like `/api/search?q=${query}`, 
        // you should swap this to use that endpoint for better performance.
        const response = await axios.get(`${BASE_URL}/api/products/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Local filtering logic based on the query
        const filteredProducts = response.data.filter(product => {
          const term = query.toLowerCase();
          const nameMatch = product.name?.toLowerCase().includes(term);
          const descMatch = product.description?.toLowerCase().includes(term);
          const skuMatch = product.variants?.[0]?.sku?.toLowerCase().includes(term);
          
          return nameMatch || descMatch || skuMatch;
        });

        setResults(filteredProducts);
      } catch (err) {
        console.error('Failed to fetch search results', err);
        setError('An error occurred while fetching search results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="relative space-y-6 min-h-full z-0">


      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Search Results</h1>
        <p className="text-slate-400 font-medium">
          Showing results for: <span className="text-blue-600 font-bold">"{query}"</span>
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl">
          <FiLoader className="animate-spin text-4xl text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl text-red-400">
          <FiAlertCircle className="text-4xl mb-4" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Results List */}
      {!loading && !error && (
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6">
          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {results.map((item) => (
                <Link 
                  key={item._id} 
                  to={`/products/variants/${item._id}`}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all bg-black/20 group cursor-pointer"
                >
                  <div className="w-16 h-16 shrink-0 bg-transparent rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                    <FiPackage className="text-2xl text-slate-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate group-hover:text-blue-400 transition-colors">{item.name}</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1">SKU: {item.variants?.[0]?.sku || 'N/A'}</p>
                    <p className="text-sm font-bold text-emerald-600 mt-2">${item.variants?.[0]?.price || '0.00'}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FiSearch className="text-5xl text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No results found</h3>
              <p className="text-slate-500">We couldn't find anything matching "{query}". Try adjusting your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResults;