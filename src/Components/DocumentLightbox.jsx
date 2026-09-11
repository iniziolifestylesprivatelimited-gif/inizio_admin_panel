import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCw,
  FiRotateCcw,
  FiMaximize2,
  FiX,
  FiDownload,
  FiExternalLink,
  FiCheck,
  FiLoader,
  FiFileText,
  FiAlertCircle,
  FiRefreshCw,
  FiUserMinus
} from 'react-icons/fi';
import CopyButton from './CopyButton';
import { useEscapeKey } from '../utils/useEscapeKey';

const isPdfUrl = (url = '') => {
  const clean = (url || '').split('?')[0].toLowerCase();
  return clean.endsWith('.pdf') || clean.includes('.pdf');
};

/**
 * High-performance Document Lightbox.
 * For PDFs: displays clean native PDF viewer with its full built-in tools (zoom, rotate, pages, print).
 * For Images: provides interactive CSS zoom (+/-), rotation (90deg), and pan/drag.
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Closes the lightbox
 * @param {string} src - Document URL
 * @param {string} title - Document title (e.g. user name or certificate name)
 * @param {string} [subtitle] - Subtitle (e.g. GSTIN number)
 * @param {function} [onApprove] - Optional callback to approve KYC
 * @param {function} [onReject] - Optional callback to reject KYC
 * @param {boolean} [isActionLoading] - Loading state for action buttons
 */
const DocumentLightbox = ({
  isOpen,
  onClose,
  src,
  title = 'Document Inspection',
  subtitle = '',
  onApprove,
  onReject,
  isActionLoading = false
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef(null);

  const isPdf = isPdfUrl(src);

  // Global LIFO Escape key registration
  useEscapeKey(onClose, isOpen);

  // Reset transforms whenever modal opens or document changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isOpen, src]);

  // Zoom controls (for images)
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleRotateCw = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleRotateCcw = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (!isPdf) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleRotateCw();
        } else if (e.key === '0') {
          e.preventDefault();
          handleReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isPdf, handleZoomIn, handleZoomOut, handleRotateCw, handleReset]);

  // Mouse drag to pan when zoomed in (images only)
  const handleMouseDown = (e) => {
    if (isPdf || scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isPdf || !isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom (for images only so PDF native scrolling is uninterrupted)
  const handleWheel = (e) => {
    if (isPdf) return; // Allow natural scrolling inside the PDF!
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!isOpen || !src) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
            <FiFileText size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">{title}</h2>
              {isPdf && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 shrink-0">
                  PDF Document
                </span>
              )}
            </div>
            {subtitle && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-slate-400 font-mono tracking-wider truncate">{subtitle}</p>
                <CopyButton text={subtitle} className="text-slate-400 hover:text-white" size={10} />
              </div>
            )}
          </div>
        </div>

        {/* Right side header actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Open original document in new browser tab"
          >
            <FiExternalLink size={15} />
            <span className="hidden sm:inline">Open in Tab</span>
          </a>

          <a
            href={src}
            download
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Download document file"
          >
            <FiDownload size={15} />
            <span className="hidden sm:inline">Download</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer"
            title="Close Lightbox (Esc)"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* Main Document Inspection Viewport */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-3 sm:p-5 ${
          !isPdf && scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {isPdf ? (
          /* Native Full-Screen PDF Viewer with 100% interactive native controls */
          <div className="w-full h-full max-w-6xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/15 relative flex flex-col">
            <iframe
              src={`${src}#toolbar=1&navpanes=0`}
              title={title}
              className="w-full h-full border-0 rounded-2xl bg-white"
            />
          </div>
        ) : (
          /* Interactive Zoom & Rotate Canvas for Images */
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="relative max-w-full max-h-full flex items-center justify-center pointer-events-auto"
          >
            {/* Loading Spinner */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
                <FiLoader className="animate-spin text-4xl text-blue-500" />
                <span className="text-xs font-medium">Loading document image...</span>
              </div>
            )}

            {/* Error Message */}
            {imageError && (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex flex-col items-center gap-3 text-center max-w-md">
                <FiAlertCircle size={36} />
                <div>
                  <p className="font-bold text-sm">Failed to load document image preview</p>
                  <p className="text-xs text-rose-300/80 mt-1">
                    The certificate file could not be rendered directly. You can open or download it using the buttons above.
                  </p>
                </div>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all shadow-lg"
                >
                  Open in New Tab
                </a>
              </div>
            )}

            {/* Interactive Image */}
            <img
              src={src}
              alt={title}
              draggable={false}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              style={{
                maxWidth: '90vw',
                maxHeight: '76vh',
                objectFit: 'contain'
              }}
              className={`rounded-xl shadow-2xl transition-opacity duration-200 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        )}
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="px-4 sm:px-6 py-3.5 bg-slate-900/95 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-20 backdrop-blur-md">
        {/* Left: Quick Decision Actions (Approve / Reject) */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-start">
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              disabled={isActionLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-xs"
            >
              <FiUserMinus size={14} />
              <span>Reject KYC</span>
            </button>
          )}

          {onApprove && (
            <button
              type="button"
              onClick={onApprove}
              disabled={isActionLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {isActionLoading ? <FiLoader className="animate-spin" size={14} /> : <FiCheck size={14} />}
              <span>{isActionLoading ? 'Processing...' : 'Approve & Verify'}</span>
            </button>
          )}
        </div>

        {/* Center/Right: Interactive Zoom & Rotation Toolset (FOR IMAGES ONLY) */}
        {!isPdf ? (
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-white/10 px-2 py-1 rounded-2xl shadow-xl">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
              title="Zoom Out (-)"
            >
              <FiZoomOut size={16} />
            </button>

            {/* Current Zoom Badge / Click to reset */}
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
              title="Reset Zoom to 100% (0)"
            >
              {Math.round(scale * 100)}%
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
              title="Zoom In (+)"
            >
              <FiZoomIn size={16} />
            </button>

            <div className="w-px h-5 bg-white/15 mx-1"></div>

            {/* Rotate Counter-Clockwise */}
            <button
              type="button"
              onClick={handleRotateCcw}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Rotate Counter-Clockwise (-90°)"
            >
              <FiRotateCcw size={16} />
            </button>

            {/* Current Rotation indicator (if rotated) */}
            {rotation !== 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-400 font-bold bg-amber-400/10">
                {rotation}°
              </span>
            )}

            {/* Rotate Clockwise */}
            <button
              type="button"
              onClick={handleRotateCw}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Rotate Clockwise (+90° / R)"
            >
              <FiRotateCw size={16} />
            </button>

            <div className="w-px h-5 bg-white/15 mx-1"></div>

            {/* Reset All */}
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Reset View"
            >
              <FiRefreshCw size={14} />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Use PDF toolbar above for native zoom, rotate, search & printing</span>
          </div>
        )}

        {/* Keyboard hints */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-medium">
          {!isPdf && (
            <>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">Scroll</kbd> Zoom</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">Drag</kbd> Pan</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">R</kbd> Rotate</span>
            </>
          )}
          <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">Esc</kbd> Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DocumentLightbox;
