import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiSearch, FiPackage, FiLoader, FiAlertCircle, FiTag, FiGrid, FiFileText } from 'react-icons/fi';
import { api, BASE_URL } from '../../api/axios';
import { useAuth } from '../../Context/AuthContext';
import { getAccessibleMenus } from '../../config/menus';

const SearchResults = () => {
  const { user } = useAuth();
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
        const [prodRes, brandRes, catRes, userRes] = await Promise.all([
          api.get('/products/').catch(() => ({ data: [] })),
          api.get('/brands/admin').catch(() => ({ data: [] })),
          api.get('/categories/admin/all').catch(() => ({ data: [] })),
          api.get('/admin/customers').catch(() => ({ data: [] }))
        ]);

        const terms = query.toLowerCase().trim().split(/\s+/);
        let searchResultsList = [];

        // 1. Search Menus/Pages
        if (user) {
          const userMenus = getAccessibleMenus();
          const flattenMenus = [];
          userMenus.forEach(m => {
            if (!m) return;
            if (m.subMenus) {
              m.subMenus.forEach(s => flattenMenus.push({ ...s, parent: m.name }));
            } else {
              flattenMenus.push(m);
            }
          });
          
          const matchedMenus = flattenMenus.filter(m => 
            terms.every(term => m.name.toLowerCase().includes(term))
          );
          searchResultsList = searchResultsList.concat(matchedMenus.map(m => ({
            _id: `menu-${m.path}`,
            title: m.name,
            subtitle: m.parent ? `${m.parent} Menu` : 'Page',
            type: 'Page',
            url: m.path
          })));
        }

        // 2. Search Products
        const productsData = prodRes.data || [];
        const matchedProducts = productsData.filter(product => {
          const searchableText = `${product.name || ''} ${product.description || ''} ${product.variants?.[0]?.sku || ''}`.toLowerCase();
          return terms.every(term => searchableText.includes(term));
        });
        searchResultsList = searchResultsList.concat(matchedProducts.map(p => ({
          _id: `prod-${p._id}`,
          title: p.name,
          subtitle: `SKU: ${p.variants?.[0]?.sku || 'N/A'}`,
          type: 'Product',
          url: `/products/list`,
          state: { viewProductId: p._id },
          price: p.variants?.[0]?.price
        })));

        // 3. Search Brands
        const brandsData = brandRes.data || [];
        const matchedBrands = brandsData.filter(b => 
          terms.every(term => b.name?.toLowerCase().includes(term))
        );
        searchResultsList = searchResultsList.concat(matchedBrands.map(b => ({
          _id: `brand-${b._id}`,
          title: b.name,
          subtitle: 'Brand',
          type: 'Brand',
          url: `/products/brands`
        })));

        // 4. Search Categories
        const categoriesData = catRes.data || [];
        const matchedCategories = categoriesData.filter(c => 
          terms.every(term => c.name?.toLowerCase().includes(term))
        );
        searchResultsList = searchResultsList.concat(matchedCategories.map(c => ({
          _id: `cat-${c._id}`,
          title: c.name,
          subtitle: 'Category',
          type: 'Category',
          url: `/products/categories`
        })));

        // 5. Search Users
        const usersData = userRes.data || [];
        const matchedUsers = usersData.filter(u => {
          const nameText = (u.name || '').toLowerCase();
          const emailText = (u.email || '').toLowerCase();
          const phoneText = (u.phone || '').toLowerCase();
          return terms.every(term => nameText.includes(term) || emailText.includes(term) || phoneText.includes(term));
        });
        searchResultsList = searchResultsList.concat(matchedUsers.map(u => ({
          _id: `user-${u._id}`,
          title: u.name || 'No Name',
          subtitle: `${u.email || 'No Email'}${u.phone ? ` • ${u.phone}` : ''}`,
          type: 'User',
          url: `/users/list/${u._id}`
        })));

        setResults(searchResultsList);
      } catch (err) {
        console.error('Failed to fetch search results', err);
        setError('An error occurred while fetching search results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, user]);

  return (
    <div className="relative space-y-6 min-h-full z-0">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Search Results</h1>
        <p className="text-slate-400 font-medium">
          Showing results for: <span className="text-blue-500 font-bold">"{query}"</span>
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
              {results.map((item) => {
                let Icon = FiFileText;
                if (item.type === 'Product') Icon = FiPackage;
                else if (item.type === 'Brand') Icon = FiTag;
                else if (item.type === 'Category') Icon = FiGrid;
                else if (item.type === 'User') Icon = FiUser;

                return (
                  <Link 
                    key={item._id} 
                    to={item.url}
                    state={item.state}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all bg-black/20 group cursor-pointer"
                  >
                    <div className="w-16 h-16 shrink-0 bg-transparent rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                      <Icon className="text-2xl text-slate-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-0.5">
                        <h3 className="font-bold text-white truncate group-hover:text-blue-400 transition-colors">{item.title}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md shrink-0">{item.type}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-1">{item.subtitle}</p>
                      {item.type === 'Product' && item.price !== undefined && (
                        <p className="text-sm font-bold text-emerald-600 mt-2">${item.price}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
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