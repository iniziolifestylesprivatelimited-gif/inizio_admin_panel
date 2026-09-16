import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FiX,
  FiSearch,
  FiExternalLink,
  FiPackage,
  FiEdit2,
  FiTag,
  FiFolder,
  FiAlertCircle,
  FiLayers,
  FiCheck
} from 'react-icons/fi';
import useEscapeKey from '../utils/useEscapeKey';
import OptimizedImage from './OptimizedImage';
import CopyButton from './CopyButton';
import { getImageUrl } from '../utils/imageUtils';

/**
 * Reusable modal for inspecting the products attached to a Brand or Category.
 * Supports quick search, variant breakdown, stock & price indicators,
 * deep-linking to /products/list?brand=... or /products/list?category=...,
 * and direct jumps to product editing.
 */
const CatalogProductsModal = ({
  isOpen,
  onClose,
  entityType = 'brand', // 'brand' | 'category'
  entity = null,
  products = []
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Register ESC key handling to close the modal
  useEscapeKey(onClose, isOpen);

  // Reset search when modal opens or entity changes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen, entity?._id]);

  // Extract thumbnail from product or its variants
  const getProductThumbnail = (prod) => {
    if (!prod) return '';
    if (Array.isArray(prod.images) && prod.images.length > 0 && prod.images[0]) {
      return prod.images[0];
    }
    if (typeof prod.images === 'string' && prod.images.trim()) {
      return prod.images.split(',')[0].trim();
    }
    if (Array.isArray(prod.image_urls) && prod.image_urls.length > 0 && prod.image_urls[0]) {
      return prod.image_urls[0];
    }
    if (typeof prod.image_urls === 'string' && prod.image_urls.trim()) {
      return prod.image_urls.split(',')[0].trim();
    }
    if (prod.image) return prod.image;

    // Fallback to first variant's image if available
    if (Array.isArray(prod.variants) && prod.variants.length > 0) {
      const v = prod.variants[0];
      if (Array.isArray(v.images) && v.images.length > 0 && v.images[0]) return v.images[0];
      if (typeof v.images === 'string' && v.images.trim()) return v.images.split(',')[0].trim();
      if (Array.isArray(v.image_urls) && v.image_urls.length > 0 && v.image_urls[0]) return v.image_urls[0];
      if (typeof v.image_urls === 'string' && v.image_urls.trim()) return v.image_urls.split(',')[0].trim();
      if (v.image) return v.image;
    }
    return '';
  };

  // Helper to match product with current entity
  const matchesEntity = (prod, type, id) => {
    if (!prod || !id) return false;
    const targetId = String(id);

    if (type === 'brand') {
      const b = prod.brand;
      if (!b) return false;
      if (typeof b === 'object') {
        return String(b._id || b.id) === targetId;
      }
      return String(b) === targetId;
    }

    if (type === 'category') {
      const c = prod.category;
      if (!c) return false;
      if (Array.isArray(c)) {
        return c.some(item => (typeof item === 'object' ? String(item._id || item.id) === targetId : String(item) === targetId));
      }
      if (typeof c === 'object') {
        return String(c._id || c.id) === targetId;
      }
      return String(c) === targetId;
    }

    return false;
  };

  // Filter products for this entity
  const entityProducts = useMemo(() => {
    if (!entity || !Array.isArray(products)) return [];
    return products.filter(p => matchesEntity(p, entityType, entity._id));
  }, [entity, entityType, products]);

  // Filter by local search term
  const filteredProducts = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return entityProducts;

    return entityProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      const id = String(p._id || '').toLowerCase();
      const ean = String(p.eanNumber || '').toLowerCase();
      const hasMatchingVariant = Array.isArray(p.variants) && p.variants.some(v =>
        (v.name || '').toLowerCase().includes(term) ||
        String(v._id || '').toLowerCase().includes(term)
      );
      return name.includes(term) || id.includes(term) || ean.includes(term) || hasMatchingVariant;
    });
  }, [entityProducts, searchTerm]);

  // Compute total variants count
  const totalVariantsCount = useMemo(() => {
    return entityProducts.reduce((sum, p) => {
      const count = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants.length : 1;
      return sum + count;
    }, 0);
  }, [entityProducts]);

  if (!isOpen || !entity) return null;

  const handleOpenFullList = () => {
    onClose();
    navigate(`/products/list?${entityType}=${entity._id}`);
  };

  const isBrand = entityType === 'brand';
  const entityTitle = entity.name || (isBrand ? 'Brand' : 'Category');
  const entityLogo = isBrand ? entity.logo : entity.image;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 dark:bg-slate-950/50 backdrop-blur-lg animate-fade-in transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white/40 dark:bg-slate-950/25 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {entityLogo ? (
              <OptimizedImage
                src={entityLogo}
                alt={entityTitle}
                width={80}
                quality={65}
                className="w-12 h-12 rounded-xl object-contain bg-white dark:bg-white p-1 border border-slate-200 dark:border-white/20 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                {isBrand ? <FiTag className="w-6 h-6" /> : <FiFolder className="w-6 h-6" />}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                  {entityTitle}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                  {isBrand ? 'Brand' : 'Category'}
                </span>
                {entity.isActive === false ? (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                    Hidden
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Total: <strong className="text-slate-700 dark:text-slate-200">{entityProducts.length}</strong> products</span>
                <span>•</span>
                <span><strong className="text-slate-700 dark:text-slate-200">{totalVariantsCount}</strong> variants</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleOpenFullList}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              title="Open filtered table in Product List page"
            >
              <span>View in Product List</span>
              <FiExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="px-6 py-3 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Filter products by title, ID, variant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                title="Clear filter"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 self-start sm:self-center font-medium">
            Showing <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> of {entityProducts.length} products
          </div>
        </div>

        {/* Scrollable Products Table / List */}
        <div className="flex-1 overflow-auto custom-scrollbar p-0">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 mb-3">
                <FiPackage className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {searchTerm ? 'No matching products found' : 'No products in this ' + (isBrand ? 'brand' : 'category')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-5">
                {searchTerm
                  ? `No products matched "${searchTerm}". Try adjusting your search query.`
                  : `There are currently no products associated with "${entityTitle}". You can assign products from the Product List page.`}
              </p>
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-colors cursor-pointer"
                >
                  Clear search query
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenFullList}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <span>Go to Product List</span>
                  <FiExternalLink />
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Variants</th>
                  <th className="px-4 py-3 text-center">Total Stock</th>
                  <th className="px-4 py-3">Price / Offer</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/10 text-sm">
                {filteredProducts.map((product, idx) => {
                  const thumb = getProductThumbnail(product);
                  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
                  const variantsCount = hasVariants ? product.variants.length : 1;

                  // Quantity calculation
                  const totalQty = hasVariants
                    ? product.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                    : Number(product.totalQuantity ?? product.quantity ?? 0);

                  // Price calculation
                  let displayPrice = '';
                  let originalPrice = '';
                  let discountPct = null;

                  if (hasVariants) {
                    const offerPrices = product.variants.map(v => Number(v.offerPrice || 0)).filter(p => p > 0);
                    const basePrices = product.variants.map(v => Number(v.price || v.basePrice || 0)).filter(p => p > 0);
                    const activePrices = offerPrices.length > 0 ? offerPrices : basePrices;

                    if (activePrices.length > 0) {
                      const min = Math.min(...activePrices);
                      const max = Math.max(...activePrices);
                      displayPrice = min === max ? `₹${min.toLocaleString()}` : `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
                    } else {
                      displayPrice = '₹0';
                    }
                  } else {
                    const base = Number(product.basePrice || product.price || 0);
                    const offer = Number(product.offerPrice || 0);
                    if (offer > 0) {
                      displayPrice = `₹${offer.toLocaleString()}`;
                      if (base > offer) {
                        originalPrice = `₹${base.toLocaleString()}`;
                        discountPct = Math.round(((base - offer) / base) * 100);
                      }
                    } else if (base > 0) {
                      displayPrice = `₹${base.toLocaleString()}`;
                    } else {
                      displayPrice = '₹0';
                    }
                  }

                  // Stock badge styling
                  let stockBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
                  if (totalQty <= 0) {
                    stockBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
                  } else if (totalQty <= 10) {
                    stockBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
                  }

                  return (
                    <tr
                      key={product._id}
                      className="hover:bg-slate-500/5 dark:hover:bg-white/5 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
                        {idx + 1}
                      </td>

                      {/* Product details */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white dark:bg-white border border-slate-200 dark:border-white/20 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-xs">
                            {thumb ? (
                              <OptimizedImage
                                src={thumb}
                                alt={product.name || 'Product'}
                                width={96}
                                quality={65}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <FiPackage className="text-slate-400 text-lg" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-md">
                            <span
                              className="font-bold text-slate-900 dark:text-white truncate block text-sm"
                              title={product.name}
                            >
                              {product.name || 'Unnamed Product'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                ID: {product._id?.slice(-8)}
                              </span>
                              <CopyButton text={product._id} size={10} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                              {product.eanNumber && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  • EAN: <span className="font-mono">{product.eanNumber}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Variants column */}
                      <td className="px-4 py-3 text-center">
                        {hasVariants ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                              title={product.variants.map(v => `${v.name || 'Variant'}: ${v.quantity ?? 0} in stock`).join('\n')}
                            >
                              <FiLayers className="w-3 h-3" />
                              {product.variants.length} Variants
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                            Single
                          </span>
                        )}
                      </td>

                      {/* Total Stock */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${stockBadgeClass}`}>
                          {totalQty}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {displayPrice}
                          </span>
                          {originalPrice && (
                            <span className="text-xs text-slate-400 line-through">
                              {originalPrice}
                            </span>
                          )}
                          {discountPct && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                              {discountPct}% OFF
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${product.isActive !== false ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'}`}>
                          {product.isActive !== false ? 'ACTIVE' : 'HIDDEN'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/products/variants/${product._id}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 rounded-lg border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                            title="Edit product & variants"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/products/list?search=${encodeURIComponent(product.name || product._id)}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Find in Product List"
                          >
                            <FiExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {entityTitle}: <strong>{entityProducts.length}</strong> total products listed
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleOpenFullList}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Open in Products Page</span>
              <FiExternalLink />
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default CatalogProductsModal;
