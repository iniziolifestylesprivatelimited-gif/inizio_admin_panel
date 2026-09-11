import { useState, useEffect, useMemo } from 'react';
import CustomDropdown from './CustomDropdown';
import { getPaginationDropdownLimit, DEFAULT_NOTIFICATION_SETTINGS } from '../utils/browserNotifications';

/**
 * Hook to reactively subscribe to the pagination dropdown threshold limit configured in Panel Settings.
 */
export const usePaginationDropdownLimit = () => {
  const [limit, setLimit] = useState(() => getPaginationDropdownLimit());

  useEffect(() => {
    const handleSettingsChange = (e) => {
      if (e?.detail?.paginationDropdownLimit !== undefined) {
        const val = Number(e.detail.paginationDropdownLimit);
        setLimit(!isNaN(val) && val >= 1 ? val : DEFAULT_NOTIFICATION_SETTINGS.paginationDropdownLimit);
      } else {
        setLimit(getPaginationDropdownLimit());
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'inizio_notification_settings_v1') {
        setLimit(getPaginationDropdownLimit());
      }
    };

    window.addEventListener('inizio:notification-settings-changed', handleSettingsChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('inizio:notification-settings-changed', handleSettingsChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return limit;
};

/**
 * Reusable Pagination Component with built-in Page Selection Dropdown.
 * 
 * @param {number} currentPage - Currently active page (1-based index)
 * @param {number} totalPages - Total available pages
 * @param {function} onPageChange - Callback when a page is selected or navigated to: (page: number) => void
 * @param {number} [showDropdownThreshold] - Optional override threshold; defaults to setting in PanelSettings
 * @param {string} [className] - Optional container classes
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showDropdownThreshold,
  className = ''
}) => {
  const settingsLimit = usePaginationDropdownLimit();
  const limit = showDropdownThreshold !== undefined ? showDropdownThreshold : settingsLimit;
  const showDropdown = totalPages > limit;

  // Generate page numbers using the project's standard 7-page window algorithm
  const pageNumbers = useMemo(() => {
    const numbers = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) numbers.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) numbers.push(i);
        numbers.push('...');
        numbers.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        numbers.push(1);
        numbers.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) numbers.push(i);
      } else {
        numbers.push(1);
        numbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) numbers.push(i);
        numbers.push('...');
        numbers.push(totalPages);
      }
    }
    return numbers;
  }, [totalPages, currentPage]);

  // Options for the quick-jump page selection dropdown
  const pageOptions = useMemo(() => {
    const opts = [];
    for (let i = 1; i <= totalPages; i++) {
      opts.push({
        value: i,
        label: `Page ${i}`
      });
    }
    return opts;
  }, [totalPages]);

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handleSelectPage = (val) => {
    const pageNum = Number(val);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages && onPageChange) {
      onPageChange(pageNum);
    }
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end ${className}`}>
      {/* Page Navigation Buttons */}
      <div className="flex space-x-1 sm:space-x-1.5 items-center">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1 || totalPages === 0}
          className="px-2.5 sm:px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-950/20 dark:hover:bg-white/10 dark:text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-slate-200 dark:border-white/10 transform-gpu cursor-pointer shadow-xs dark:shadow-none"
          title="Previous Page"
        >
          &larr;
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex gap-1 mx-0.5 sm:mx-1 overflow-x-auto custom-scrollbar pb-0.5 sm:pb-0 items-center">
          {pageNumbers.map((page, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (page !== '...' && onPageChange) onPageChange(page);
              }}
              disabled={page === '...'}
              className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium border transition-colors shrink-0 transform-gpu ${
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20 font-bold'
                  : page === '...'
                  ? 'bg-transparent text-slate-400 dark:text-slate-500 border-transparent cursor-default'
                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:bg-slate-950/20 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white border-slate-200 dark:border-white/10 cursor-pointer shadow-xs dark:shadow-none'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="px-2.5 sm:px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-950/20 dark:hover:bg-white/10 dark:text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-slate-200 dark:border-white/10 transform-gpu cursor-pointer shadow-xs dark:shadow-none"
          title="Next Page"
        >
          &rarr;
        </button>
      </div>

      {/* Page Selection Dropdown (Only when totalPages > limit) */}
      {showDropdown && (
        <div className="flex items-center gap-1.5 pl-2 sm:pl-2.5 border-l border-slate-200 dark:border-white/10">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap hidden min-[420px]:inline">
            Go to:
          </span>
          <div className="w-32 sm:w-36 shrink-0">
            <CustomDropdown
              value={currentPage}
              onChange={handleSelectPage}
              options={pageOptions}
              statusColor="bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:hover:bg-white/10 dark:text-slate-200 border-slate-200 dark:border-white/10 text-xs font-bold !py-1.5 !px-2.5 !rounded-xl shadow-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Pagination;
