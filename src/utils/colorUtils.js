export const VARIANT_COLOR_PALETTE = [
  {
    keywords: ['beige', 'cream', 'ivory', 'offwhite', 'off-white', 'sand', 'oatmeal', 'khaki', 'wheat', 'nude', 'tan', 'champagne'],
    hex: '#E8D5B5',
    activeBg: 'bg-[#E8D5B5]/25 text-[#FFF8E7] border-[#E8D5B5] shadow-lg shadow-[#E8D5B5]/20',
    idleBg: 'bg-[#E8D5B5]/10 text-slate-200 border-[#E8D5B5]/30 hover:border-[#E8D5B5]/60 hover:bg-[#E8D5B5]/15'
  },
  {
    keywords: ['black', 'dark', 'charcoal', 'onyx', 'jet'],
    hex: '#18181B',
    activeBg: 'bg-zinc-900 text-white border-zinc-400 shadow-lg shadow-black/60 ring-1 ring-white/20',
    idleBg: 'bg-zinc-900/60 text-slate-300 border-zinc-700/60 hover:border-zinc-500 hover:bg-zinc-800/60'
  },
  {
    keywords: ['white', 'pearl'],
    hex: '#FFFFFF',
    activeBg: 'bg-white/20 text-white border-white shadow-lg shadow-white/20 ring-1 ring-white/40',
    idleBg: 'bg-white/5 text-slate-200 border-white/20 hover:border-white/50 hover:bg-white/10'
  },
  {
    keywords: ['navy'],
    hex: '#1E3A8A',
    activeBg: 'bg-blue-950 text-white border-blue-400 shadow-lg shadow-blue-900/40',
    idleBg: 'bg-blue-950/40 text-slate-200 border-blue-800/40 hover:border-blue-600/60'
  },
  {
    keywords: ['blue', 'azure', 'cobalt', 'cyan', 'teal', 'aqua', 'sky'],
    hex: '#3B82F6',
    activeBg: 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30',
    idleBg: 'bg-blue-500/10 text-slate-200 border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/15'
  },
  {
    keywords: ['red', 'crimson', 'ruby', 'scarlet', 'maroon', 'cherry', 'wine', 'burgundy'],
    hex: '#EF4444',
    activeBg: 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-500/30',
    idleBg: 'bg-rose-500/10 text-slate-200 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/15'
  },
  {
    keywords: ['green', 'emerald', 'olive', 'sage', 'mint', 'forest', 'lime', 'jade'],
    hex: '#10B981',
    activeBg: 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/30',
    idleBg: 'bg-emerald-500/10 text-slate-200 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15'
  },
  {
    keywords: ['yellow', 'lemon', 'mustard'],
    hex: '#EAB308',
    activeBg: 'bg-yellow-500/30 text-yellow-100 border-yellow-400 shadow-lg shadow-yellow-500/25',
    idleBg: 'bg-yellow-500/10 text-slate-200 border-yellow-500/30 hover:border-yellow-500/60 hover:bg-yellow-500/15'
  },
  {
    keywords: ['gold', 'golden', 'amber'],
    hex: '#F59E0B',
    activeBg: 'bg-amber-600 text-white border-amber-300 shadow-lg shadow-amber-500/30',
    idleBg: 'bg-amber-500/10 text-slate-200 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/15'
  },
  {
    keywords: ['pink', 'rose', 'magenta', 'blush', 'coral', 'peach', 'salmon'],
    hex: '#EC4899',
    activeBg: 'bg-pink-600 text-white border-pink-400 shadow-lg shadow-pink-500/30',
    idleBg: 'bg-pink-500/10 text-slate-200 border-pink-500/30 hover:border-pink-500/60 hover:bg-pink-500/15'
  },
  {
    keywords: ['purple', 'violet', 'lavender', 'lilac', 'plum', 'indigo'],
    hex: '#8B5CF6',
    activeBg: 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/30',
    idleBg: 'bg-purple-500/10 text-slate-200 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/15'
  },
  {
    keywords: ['orange', 'rust', 'copper', 'bronze', 'terracotta'],
    hex: '#F97316',
    activeBg: 'bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-500/30',
    idleBg: 'bg-orange-500/50 text-slate-200 border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/15'
  },
  {
    keywords: ['brown', 'coffee', 'chocolate', 'mocha', 'caramel'],
    hex: '#8B5A2B',
    activeBg: 'bg-[#8B5A2B]/40 text-white border-[#B07D48] shadow-lg shadow-[#8B5A2B]/40',
    idleBg: 'bg-[#8B5A2B]/15 text-slate-200 border-[#8B5A2B]/35 hover:border-[#8B5A2B]/70 hover:bg-[#8B5A2B]/25'
  },
  {
    keywords: ['grey', 'gray', 'silver', 'slate', 'ash', 'metal'],
    hex: '#94A3B8',
    activeBg: 'bg-slate-700 text-white border-slate-400 shadow-lg shadow-slate-500/30',
    idleBg: 'bg-slate-700/20 text-slate-200 border-slate-600/30 hover:border-slate-500/60'
  },
  {
    keywords: ['burgandy'],
    hex: '#6A1B44',
    activeBg: 'bg-[#6A1B44] text-white border-[#F59E0B] shadow-lg shadow-[#6A1B44]',
    idleBg: 'bg-[#6A1B44]/20 text-slate-200 border-[#6A1B44] hover:border-[#6A1B44]'
  }
];

export const getVariantColorStyle = (variantName = '') => {
  const lower = String(variantName || '').toLowerCase().trim();
  for (const item of VARIANT_COLOR_PALETTE) {
    if (item.keywords.some(k => lower.includes(k))) {
      return item;
    }
  }
  return {
    hex: '#3B82F6',
    activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-blue-500',
    idleBg: 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border-white/10'
  };
};
