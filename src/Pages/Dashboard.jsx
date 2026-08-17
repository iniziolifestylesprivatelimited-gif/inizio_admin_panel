import React, { useEffect, useState } from 'react';
import { api, BASE_URL } from '../api/axios';
import {
  FiTrendingUp, FiUsers, FiBox, FiLayers,
  FiActivity, FiEye, FiSearch, FiLogIn, FiLogOut, FiX, FiCheck, FiBell, FiCalendar, FiPhone, FiTrash2
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  VisxAreaChart,
  VisxStackedBarChart,
  VisxDonutChart,
  VisxAppVersionsChart,
  VisxNotificationsDonutChart,
  VisxPriceTierGroupedBarChart
} from '../Components/VisxCharts';
import PageHeader from '../Components/PageHeader';
import { KPISkeleton, TableRowSkeleton } from '../Components/Skeleton';
import { formatDateDDMMYYYY, formatYYYYMMDDToDDMMYYYY } from '../utils/dateUtils';
import Card from '../Components/Card';
import CustomDropdown from '../Components/CustomDropdown';
import CustomDatePicker from '../Components/CustomDatePicker';



const formatActivityTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatDateDDMMYYYY(date);
};

const checkAppStatus = (u) => {
  if (!u.installedAt && !u.uninstalledAt) {
    if (u.isAppInstalled) return 'installed';
    return 'pending';
  }
  const instTime = u.installedAt ? new Date(u.installedAt).getTime() : 0;
  const uninstTime = u.uninstalledAt ? new Date(u.uninstalledAt).getTime() : 0;
  if (instTime > uninstTime) return 'installed';
  if (uninstTime > instTime) return 'uninstalled';
  return 'pending';
};

// --- Sub-components for Expanding Chart Cards ---

const SalesRevenueCard = ({ salesData, chartLabels, totalRev, expandedChart, setExpandedChart }) => {
  const peakIndex = salesData.reduce((maxIdx, val, idx, arr) => val > arr[maxIdx] ? idx : maxIdx, 0);
  const peakMonth = chartLabels[peakIndex] || 'N/A';
  const peakAmount = salesData[peakIndex] || 0;
  const avgMonthlyRev = totalRev / 6;

  const currentMonthRev = salesData[5] || 0;
  const prevMonthRev = salesData[4] || 0;
  const revDiff = currentMonthRev - prevMonthRev;
  const revPercent = prevMonthRev > 0 ? ((revDiff / prevMonthRev) * 100).toFixed(1) : '0';

  const cardClass = `transition-all duration-500 ease-in-out overflow-hidden flex flex-col relative group ${
    expandedChart === 'revenue'
      ? 'w-full min-h-[420px] h-auto cursor-default opacity-100 scale-100 !p-6 border-white/20'
      : expandedChart === null
      ? 'w-full h-[380px] cursor-pointer hover:border-white/20 hover:scale-[1.01] opacity-100 scale-100 !p-6'
      : 'hidden w-0 h-0 !p-0 !border-0 opacity-0 scale-95 pointer-events-none'
  }`;

  return (
    <Card 
      onClick={() => { if (!expandedChart) setExpandedChart('revenue'); }}
      className={cardClass}
    >
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
      {expandedChart === 'revenue' && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer z-20"
        >
          <FiX size={16} />
        </button>
      )}
      <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sales Revenue</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Historical sales trends & revenue growth</p>
        </div>
      </div>

      <div className={`flex flex-col ${expandedChart === 'revenue' ? 'lg:flex-row' : ''} gap-6 flex-1 w-full z-10`}>
        <div className={`transition-all duration-500 ease-in-out relative w-full z-10 ${expandedChart === 'revenue' ? 'lg:w-[65%] h-[280px] lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <VisxAreaChart labels={chartLabels} data={salesData} color="#3b82f6" valuePrefix="₹" />
        </div>

        <div className={`transition-all duration-500 ease-in-out w-full border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between overflow-hidden ${
          expandedChart === 'revenue'
            ? 'lg:w-[35%] pt-6 lg:pt-0 lg:pl-6 opacity-100 max-h-[1000px]'
            : 'w-0 h-0 max-h-0 opacity-0 !p-0 !border-0'
        }`}>
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Detailed Revenue Metrics</h4>
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Revenue (6m)</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">₹{totalRev.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex justify-between">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Peak Month</span>
                  <span className="text-sm font-bold text-white mt-1 block">{peakMonth} (₹{peakAmount.toLocaleString('en-IN')})</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Monthly Avg</span>
                  <span className="text-sm font-bold text-blue-400 mt-1 block">₹{avgMonthlyRev.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Current Month Growth</span>
                  <span className="text-xs font-bold text-slate-300 mt-1 block">
                    {revDiff >= 0 ? '+' : ''}₹{revDiff.toLocaleString('en-IN')} vs last month
                  </span>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                  revDiff >= 0 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {revDiff >= 0 ? '+' : ''}{revPercent}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-6 border-t border-white/5 pt-3">
            * All figures are aggregated across valid customer invoices.
          </div>
        </div>
      </div>
    </Card>
  );
};

const OrderVolumeCard = ({ deliveredCountData, processingCountData, cancelledCountData, chartLabels, ordersChartConfig, expandedChart, setExpandedChart }) => {
  const totalDelivered = deliveredCountData.reduce((a, b) => a + b, 0);
  const totalProcessing = processingCountData.reduce((a, b) => a + b, 0);
  const totalCancelled = cancelledCountData.reduce((a, b) => a + b, 0);
  const totalOrders = totalDelivered + totalProcessing + totalCancelled;
  const successRate = totalOrders > 0 ? ((totalDelivered / totalOrders) * 100).toFixed(1) : '0.0';

  const cardClass = `transition-all duration-500 ease-in-out overflow-hidden flex flex-col relative group ${
    expandedChart === 'volume'
      ? 'w-full min-h-[420px] h-auto cursor-default opacity-100 scale-100 !p-6 border-white/20'
      : expandedChart === null
      ? 'w-full h-[380px] cursor-pointer hover:border-white/20 hover:scale-[1.01] opacity-100 scale-100 !p-6'
      : 'hidden w-0 h-0 !p-0 !border-0 opacity-0 scale-95 pointer-events-none'
  }`;

  return (
    <Card 
      onClick={() => { if (!expandedChart) setExpandedChart('volume'); }}
      className={cardClass}
    >
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
      {expandedChart === 'volume' && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer z-20"
        >
          <FiX size={16} />
        </button>
      )}
      <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Order Volume</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Number of orders received over time</p>
        </div>
      </div>

      <div className={`flex flex-col ${expandedChart === 'volume' ? 'lg:flex-row' : ''} gap-6 flex-1 w-full z-10`}>
        <div className={`transition-all duration-500 ease-in-out relative w-full z-10 ${expandedChart === 'volume' ? 'lg:w-[65%] h-[280px] lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <VisxStackedBarChart labels={chartLabels} series={ordersChartConfig.series} />
        </div>

        <div className={`transition-all duration-500 ease-in-out w-full border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between overflow-hidden ${
          expandedChart === 'volume'
            ? 'lg:w-[35%] pt-6 lg:pt-0 lg:pl-6 opacity-100 max-h-[1000px]'
            : 'w-0 h-0 max-h-0 opacity-0 !p-0 !border-0'
        }`}>
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Detailed Volume Metrics</h4>
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Orders</span>
                  <span className="text-xl font-black text-indigo-400 mt-1 block">{totalOrders}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Delivery Success</span>
                  <span className="text-xl font-black text-emerald-400 mt-1 block">{successRate}%</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className="text-slate-400">Delivered</span>
                    <span className="text-emerald-400">{totalDelivered} ({totalOrders > 0 ? Math.round((totalDelivered/totalOrders)*100) : 0}%)</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalOrders > 0 ? (totalDelivered/totalOrders)*100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className="text-slate-400">Processing</span>
                    <span className="text-blue-400">{totalProcessing} ({totalOrders > 0 ? Math.round((totalProcessing/totalOrders)*100) : 0}%)</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" style={{ width: `${totalOrders > 0 ? (totalProcessing/totalOrders)*100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className="text-slate-400">Cancelled</span>
                    <span className="text-rose-400">{totalCancelled} ({totalOrders > 0 ? Math.round((totalCancelled/totalOrders)*100) : 0}%)</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${totalOrders > 0 ? (totalCancelled/totalOrders)*100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-6 border-t border-white/5 pt-3">
            * Includes all orders created within the select range.
          </div>
        </div>
      </div>
    </Card>
  );
};

const BrandShareCard = ({ brandShare, brandShareSorted, products, expandedChart, setExpandedChart }) => {
  const cardClass = `transition-all duration-500 ease-in-out overflow-hidden flex flex-col relative group ${
    expandedChart === 'brand'
      ? 'w-full min-h-[420px] h-auto cursor-default opacity-100 scale-100 !p-6 border-white/20'
      : expandedChart === null
      ? 'w-full h-[380px] cursor-pointer hover:border-white/20 hover:scale-[1.01] opacity-100 scale-100 !p-6'
      : 'hidden w-0 h-0 !p-0 !border-0 opacity-0 scale-95 pointer-events-none'
  }`;

  return (
    <Card 
      onClick={() => { if (!expandedChart) setExpandedChart('brand'); }}
      className={cardClass}
    >
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
      {expandedChart === 'brand' && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer z-20"
        >
          <FiX size={16} />
        </button>
      )}
      <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Brand Share</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Product distribution across brands</p>
        </div>
      </div>

      <div className={`flex flex-col ${expandedChart === 'brand' ? 'lg:flex-row' : ''} gap-6 flex-1 w-full z-10`}>
        <div className={`transition-all duration-500 ease-in-out relative w-full z-10 ${expandedChart === 'brand' ? 'lg:w-[60%] h-[280px] lg:h-auto lg:flex-1' : 'flex-1'} flex items-center justify-center`}>
          <VisxDonutChart data={brandShare} centerLabel="Products" />
        </div>

        <div className={`transition-all duration-500 ease-in-out w-full border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between overflow-hidden ${
          expandedChart === 'brand'
            ? 'lg:w-[40%] pt-6 lg:pt-0 lg:pl-6 opacity-100 max-h-[1000px]'
            : 'w-0 h-0 max-h-0 opacity-0 !p-0 !border-0'
        }`}>
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">All Brand Distribution</h4>
            <div className="max-h-[240px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {(brandShareSorted || []).map((b, idx) => {
                const percentage = products.length > 0 ? ((b.value / products.length) * 100).toFixed(1) : '0';
                return (
                  <div key={b.name || idx} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                    <span className="text-xs font-bold text-slate-300">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{b.value} items</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-6 border-t border-white/5 pt-3">
            * Total Catalog Size: {products.length} Products.
          </div>
        </div>
      </div>
    </Card>
  );
};

const AppVersionCard = ({ activityStats, expandedSecondRowChart, setExpandedSecondRowChart }) => {
  const versions = activityStats?.deviceMetrics?.appVersions || [];
  const totalDevices = versions.reduce((sum, v) => sum + (v.count || 0), 0);

  const cardClass = `transition-all duration-500 ease-in-out overflow-hidden flex flex-col relative group ${
    expandedSecondRowChart === 'version'
      ? 'w-full min-h-[460px] h-auto cursor-default opacity-100 scale-100 !p-6 border-white/20'
      : expandedSecondRowChart === null
      ? 'w-full h-[420px] cursor-pointer hover:border-white/20 hover:scale-[1.01] opacity-100 scale-100 !p-6'
      : 'hidden w-0 h-0 !p-0 !border-0 opacity-0 scale-95 pointer-events-none'
  }`;

  return (
    <Card
      onClick={() => { if (!expandedSecondRowChart) setExpandedSecondRowChart('version'); }}
      className={cardClass}
    >
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
      {expandedSecondRowChart === 'version' && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedSecondRowChart(null); }}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer z-20"
        >
          <FiX size={16} />
        </button>
      )}
      <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">App Version Distribution</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Registered devices per application release version</p>
        </div>
      </div>
      <div className={`flex flex-col ${expandedSecondRowChart === 'version' ? 'lg:flex-row' : ''} gap-6 flex-1 w-full z-10`}>
        <div className={`transition-all duration-500 ease-in-out relative w-full z-10 ${expandedSecondRowChart === 'version' ? 'lg:w-[65%] h-[280px] lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <VisxAppVersionsChart data={versions} />
        </div>

        <div className={`transition-all duration-500 ease-in-out w-full border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between overflow-hidden ${
          expandedSecondRowChart === 'version'
            ? 'lg:w-[35%] pt-6 lg:pt-0 lg:pl-6 opacity-100 max-h-[1000px]'
            : 'w-0 h-0 max-h-0 opacity-0 !p-0 !border-0'
        }`}>
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Version Analytics</h4>
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Active Devices</span>
                  <span className="text-xl font-black text-blue-400 mt-1 block">{totalDevices}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Versions Tracked</span>
                  <span className="text-xl font-black text-emerald-400 mt-1 block">{versions.length}</span>
                </div>
              </div>

              <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {versions.map((v, idx) => {
                  const pct = totalDevices > 0 ? ((v.count / totalDevices) * 100).toFixed(1) : '0';
                  return (
                    <div key={v.version || idx} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-xs font-bold text-slate-300">v{v.version || 'unknown'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{v.count} devices</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-6 border-t border-white/5 pt-3">
            * App versions are reported automatically from client-side handshakes.
          </div>
        </div>
      </div>
    </Card>
  );
};

const NotificationsCard = ({ notificationsMetrics, expandedSecondRowChart, setExpandedSecondRowChart, setSelectedNotificationsSegment, setIsNotificationsModalOpen }) => {
  const totalUsers = notificationsMetrics.enabled + notificationsMetrics.disabled;
  const enabledPct = totalUsers > 0 ? ((notificationsMetrics.enabled / totalUsers) * 100).toFixed(1) : '0';
  const disabledPct = totalUsers > 0 ? ((notificationsMetrics.disabled / totalUsers) * 100).toFixed(1) : '0';

  const cardClass = `transition-all duration-500 ease-in-out overflow-hidden flex flex-col relative group ${
    expandedSecondRowChart === 'notifications'
      ? 'w-full min-h-[460px] h-auto cursor-default opacity-100 scale-100 !p-6 border-white/20'
      : expandedSecondRowChart === null
      ? 'w-full h-[420px] cursor-pointer hover:border-white/20 hover:scale-[1.01] opacity-100 scale-100 !p-6'
      : 'hidden w-0 h-0 !p-0 !border-0 opacity-0 scale-95 pointer-events-none'
  }`;

  return (
    <Card
      onClick={() => { if (!expandedSecondRowChart) setExpandedSecondRowChart('notifications'); }}
      className={cardClass}
    >
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
      {expandedSecondRowChart === 'notifications' && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedSecondRowChart(null); }}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer z-20"
        >
          <FiX size={16} />
        </button>
      )}
      <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Push Alerts Permission</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Notification permissions enabled vs disabled ratio</p>
        </div>
      </div>
      <div className={`flex flex-col ${expandedSecondRowChart === 'notifications' ? 'lg:flex-row' : ''} gap-6 flex-1 w-full z-10`}>
        <div className={`transition-all duration-500 ease-in-out relative w-full z-10 ${expandedSecondRowChart === 'notifications' ? 'lg:w-[60%] h-[280px] lg:h-auto lg:flex-1' : 'flex-1'} flex items-center justify-center`}>
          <VisxNotificationsDonutChart
            enabled={notificationsMetrics.enabled}
            disabled={notificationsMetrics.disabled}
            onClick={(type) => {
              setSelectedNotificationsSegment(type);
              setIsNotificationsModalOpen(true);
            }}
          />
        </div>

        <div className={`transition-all duration-500 ease-in-out w-full border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between overflow-hidden ${
          expandedSecondRowChart === 'notifications'
            ? 'lg:w-[40%] pt-6 lg:pt-0 lg:pl-6 opacity-100 max-h-[1000px]'
            : 'w-0 h-0 max-h-0 opacity-0 !p-0 !border-0'
        }`}>
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Notification Engagement</h4>
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total User Base</span>
                  <span className="text-xl font-black text-purple-400 mt-1 block">{totalUsers} Users</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-slate-300">Enabled</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">{notificationsMetrics.enabled} users</span>
                    <span className="text-[10px] text-emerald-400 font-extrabold">{enabledPct}%</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-bold text-slate-300">Disabled</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">{notificationsMetrics.disabled} users</span>
                    <span className="text-[10px] text-rose-400 font-extrabold">{disabledPct}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedNotificationsSegment('All');
                  setIsNotificationsModalOpen(true);
                }}
                className="w-full mt-2 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/25 transition-all text-xs font-bold cursor-pointer"
              >
                View Registered Devices Details
              </button>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-6 border-t border-white/5 pt-3">
            * Enabled users have granted OS-level permissions for initial notifications.
          </div>
        </div>
      </div>
    </Card>
  );
};

const PriceTierCard = ({ priceTierEngagementData, expandedSecondRowChart, setExpandedSecondRowChart }) => {
  const totalViews = priceTierEngagementData.views.reduce((a, b) => a + b, 0);
  const totalCartAdds = priceTierEngagementData.cartAdds.reduce((a, b) => a + b, 0);

  const cardClass = `transition-all duration-500 ease-in-out overflow-hidden flex flex-col relative group ${
    expandedSecondRowChart === 'priceTier'
      ? 'w-full min-h-[460px] h-auto cursor-default opacity-100 scale-100 !p-6 border-white/20'
      : expandedSecondRowChart === null
      ? 'w-full h-[420px] cursor-pointer hover:border-white/20 hover:scale-[1.01] opacity-100 scale-100 !p-6'
      : 'hidden w-0 h-0 !p-0 !border-0 opacity-0 scale-95 pointer-events-none'
  }`;

  return (
    <Card
      onClick={() => { if (!expandedSecondRowChart) setExpandedSecondRowChart('priceTier'); }}
      className={cardClass}
    >
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
      {expandedSecondRowChart === 'priceTier' && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedSecondRowChart(null); }}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer z-20"
        >
          <FiX size={16} />
        </button>
      )}
      <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            Product Price Tier Engagement
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Views vs cart additions by price tier</p>
        </div>
      </div>
      <div className={`flex flex-col ${expandedSecondRowChart === 'priceTier' ? 'lg:flex-row' : ''} gap-6 flex-1 w-full z-10`}>
        <div className={`transition-all duration-500 ease-in-out relative w-full z-10 ${expandedSecondRowChart === 'priceTier' ? 'lg:w-[65%] h-[280px] lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <VisxPriceTierGroupedBarChart
            categories={priceTierEngagementData.categories}
            views={priceTierEngagementData.views}
            cartAdds={priceTierEngagementData.cartAdds}
          />
        </div>

        <div className={`transition-all duration-500 ease-in-out w-full border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between overflow-hidden ${
          expandedSecondRowChart === 'priceTier'
            ? 'lg:w-[35%] pt-6 lg:pt-0 lg:pl-6 opacity-100 max-h-[1000px]'
            : 'w-0 h-0 max-h-0 opacity-0 !p-0 !border-0'
        }`}>
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Conversion Analytics</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Tier Views</span>
                  <span className="text-xl font-black text-blue-400 mt-1 block">{totalViews}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Cart Adds</span>
                  <span className="text-xl font-black text-emerald-400 mt-1 block">{totalCartAdds}</span>
                </div>
              </div>

              <div className="space-y-3">
                {priceTierEngagementData.categories.map((cat, idx) => {
                  const cViews = priceTierEngagementData.views[idx] || 0;
                  const cAdds = priceTierEngagementData.cartAdds[idx] || 0;
                  const conv = cViews > 0 ? ((cAdds / cViews) * 100).toFixed(1) : '0.0';

                  return (
                    <div key={cat || idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                        <span>{cat}</span>
                        <span className="text-emerald-400">{conv}% Conv.</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Views: {cViews}</span>
                        <span>Cart Adds: {cAdds}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-6 border-t border-white/5 pt-3">
            * Conversion calculated as Cart Additions divided by Page Views.
          </div>
        </div>
      </div>
    </Card>
  );
};

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brands, setBrands] = useState([]);
  const [, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [requestStats, setRequestStats] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [breakdownType, setBreakdownType] = useState('day'); // 'day', 'month', 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedProductViews, setSelectedProductViews] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [selectedNotificationsSegment, setSelectedNotificationsSegment] = useState('All'); // 'All', 'Enabled', 'Disabled'
  const [notificationsSearchQuery, setNotificationsSearchQuery] = useState('');
  const [trendsRange, setTrendsRange] = useState('1w'); // '1d', '1w', '1y'
  const [expandedChart, setExpandedChart] = useState(null); // 'revenue' | 'volume' | 'brand' | null
  const [expandedSecondRowChart, setExpandedSecondRowChart] = useState(null); // 'version' | 'notifications' | 'priceTier' | null
  const navigate = useNavigate();

  const getActivityStatsUrl = () => {
    if (breakdownType === 'day') {
      return `/activity/stats?breakdown=true&breakdownInterval=day`;
    }
    if (breakdownType === 'month') {
      return `/activity/stats?breakdown=true&breakdownInterval=month`;
    }
    if (breakdownType === 'custom') {
      return `/activity/stats?startDate=${startDate}&endDate=${endDate}`;
    }
    return `/activity/stats`;
  };

  const getFilterQueryParams = () => {
    if (breakdownType === 'day') return '?breakdown=true&breakdownInterval=day';
    if (breakdownType === 'month') return '?breakdown=true&breakdownInterval=month';
    if (breakdownType === 'custom') return `?startDate=${startDate}&endDate=${endDate}`;
    return '';
  };

  useEffect(() => {
    const fetchData = async (isPoll = false) => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        const activityUrl = getActivityStatsUrl();
        const [
          productsResponse,
          brandsResponse,
          categoriesResponse,
          usersResponse,
          ordersResponse,
          activityResponse,
          requestResponse,
          subsResponse,
          analyticsResponse
        ] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/categories', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] })),
          api.get('/orders/all', { headers }).catch(() => ({ data: [] })),
          api.get(activityUrl, { headers }).catch(() => ({ data: null })),
          api.get('/admin/request-stats', { headers }).catch(() => ({ data: { stats: [] } })),
          api.get('/admin/products/subscriptions/all', { headers }).catch(() => ({ data: { subscriptions: [] } })),
          api.get('/admin/analytics', { headers }).catch(() => ({ data: null }))
        ]);
        const rawUsers = usersResponse.data || [];
        const actUsers = activityResponse?.data?.users || [];
        const mergedUsers = rawUsers.map(u => {
          const match = actUsers.find(au => au.userId === u._id || (au.email && u.email && au.email.toLowerCase() === u.email.toLowerCase()));
          const lastActive = u.lastActive || match?.lastActive;
          const isOnline = u.isOnline !== undefined ? u.isOnline : (lastActive ? (new Date() - new Date(lastActive) < 5 * 60 * 1000) : false);
          return {
            ...u,
            lastActive,
            isOnline,
            lastLoginAt: u.lastLoginAt || match?.lastLoginAt,
            appVersion: u.appVersion || match?.appVersion,
            notificationsEnabled: u.notificationsEnabled !== undefined ? u.notificationsEnabled : match?.notificationsEnabled,
            isAppInstalled: u.isAppInstalled !== undefined ? u.isAppInstalled : match?.isAppInstalled
          };
        });
        setUsers(mergedUsers);
        setProducts(productsResponse.data);
        setBrands(brandsResponse.data);
        setCategories(categoriesResponse.data);
        setActivityStats(activityResponse?.data || null);
        setRequestStats(requestResponse?.data?.stats || []);
        setSubscriptions(subsResponse?.data?.subscriptions || []);
        setAnalyticsData(analyticsResponse?.data || null);

        const fetchedOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data?.orders || [];
        setOrders(fetchedOrders);
        if (!isPoll) setLoading(false);
      } catch {
        if (!isPoll) {
          setError('Failed to load dashboard data.');
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData(false);

    // Setup polling every 30 seconds
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [breakdownType, startDate, endDate]);

  // console.log(products)
  // console.log(brands)

  const usernav = (index) => {
    const detailPaths = [
      'revenue',      // index 0
      'brands',       // index 1
      'products',     // index 2
      'variants',     // index 3
      'users',        // index 4
      'users-status'  // index 5
    ];
    if (detailPaths[index]) {
      navigate(`/dashboard/details/${detailPaths[index]}`);
    }
  }

  const handleProductViewsClick = (productItem) => {
    const resolvedProductId = productItem.productId || productItem.product?._id || productItem.product;
    const prod = products.find(p => p._id === resolvedProductId) || productItem.product || {};
    if (!prod || !prod._id) return;

    const userViewMap = {};

    // 1. Process viewers array attached directly to the product item (if breakdownType !== 'day')
    if (breakdownType !== 'day' && Array.isArray(productItem.viewers) && productItem.viewers.length > 0) {
      productItem.viewers.forEach(v => {
        let uObj = v.user;
        if (!uObj || typeof uObj === 'string') {
          const matchedUser = users.find(u => u._id === (v.user || v.userId || v._id));
          uObj = matchedUser || { name: 'Unknown User', email: 'N/A' };
        }
        const uId = uObj._id || uObj.email || uObj.name || 'unknown';
        userViewMap[uId] = {
          user: uObj,
          count: (userViewMap[uId]?.count || 0) + (v.count || 1),
          latestView: v.lastViewedAt || v.timestamp || v.createdAt
        };
      });
    }

    // 2. Process recentActivities / activityStream for additional product view logs
    const stream = activityStats?.recentActivities || activityStats?.activityStream || [];
    stream.forEach(act => {
      const action = (act.action || act.eventType || '').toUpperCase();
      const matchesAction = action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
      const pId = act.details?.productId || act.productId;
      if (matchesAction && pId === prod._id) {
        // If breakdownType is 'day', only include activities from today
        if (breakdownType === 'day') {
          const actDate = act.createdAt || act.timestamp;
          if (!actDate || !actDate.startsWith(todayStr)) return;
        }

        let uObj = act.user;
        if (!uObj || typeof uObj === 'string') {
          const matchedUser = users.find(u => u._id === (act.user || act.userId || act._id));
          uObj = matchedUser || { name: 'Unknown User', email: 'N/A' };
        }
        const uId = uObj._id || uObj.email || uObj.name || 'unknown';
        userViewMap[uId] = {
          user: uObj,
          count: (userViewMap[uId]?.count || 0) + 1,
          latestView: act.createdAt || act.timestamp || userViewMap[uId]?.latestView
        };
      }
    });

    const uniqueUsers = Object.values(userViewMap).sort((a, b) => b.count - a.count);

    setSelectedProductViews({
      product: prod,
      viewsList: uniqueUsers,
      totalViews: productItem.views || uniqueUsers.reduce((sum, u) => sum + u.count, 0)
    });
    setIsProductModalOpen(true);
  };

  // Process orders data for the chart (last 6 months)
  const processChartData = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentDate = new Date();

    const labels = [];
    const salesData = [0, 0, 0, 0, 0, 0];
    const deliveredCountData = [0, 0, 0, 0, 0, 0];
    const processingCountData = [0, 0, 0, 0, 0, 0];
    const cancelledCountData = [0, 0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
    }

    let totalRev = 0;

    orders.forEach(order => {
      const isPaid = order.paymentStatus?.toLowerCase() === 'paid';
      const status = order.orderStatus?.toLowerCase() || 'pending';

      if (order.totalAmount && isPaid) {
        totalRev += order.totalAmount;
      }

      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const monthsDiff = (currentDate.getFullYear() - orderDate.getFullYear()) * 12 + (currentDate.getMonth() - orderDate.getMonth());

        if (monthsDiff >= 0 && monthsDiff <= 5) {
          const index = 5 - monthsDiff;
          if (isPaid) {
            salesData[index] += order.totalAmount || 0;
          }
          if (status === 'delivered') {
            deliveredCountData[index] += 1;
          } else if (status === 'cancelled') {
            cancelledCountData[index] += 1;
          } else {
            processingCountData[index] += 1;
          }
        }
      }
    });

    // Brand Share: group products by brand accurately
    const brandCounts = {};
    (products || []).forEach(p => {
      let brandName = 'Unassigned';
      if (p.brand) {
        if (typeof p.brand === 'object' && p.brand !== null) {
          brandName = p.brand.name || (brands.find(b => String(b._id) === String(p.brand._id))?.name) || 'Other Brand';
        } else {
          const matchedBrand = (brands || []).find(b => String(b._id) === String(p.brand));
          brandName = matchedBrand ? matchedBrand.name : 'Other Brand';
        }
      }
      brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
    });

    const brandShareSorted = Object.entries(brandCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    let brandShare = [];
    if (brandShareSorted.length > 5) {
      const top5 = brandShareSorted.slice(0, 5);
      const otherSum = brandShareSorted.slice(5).reduce((sum, item) => sum + item.value, 0);
      brandShare = [...top5, { name: 'Other Brands', value: otherSum }];
    } else {
      brandShare = brandShareSorted;
    }

    if (brandShare.length === 0 && products.length > 0) {
      brandShare = [{ name: 'All Products', value: products.length }];
    }

    return { labels, salesData, deliveredCountData, processingCountData, cancelledCountData, brandShare, totalRev, brandShareSorted };
  };

  const { labels: chartLabels, salesData, deliveredCountData, processingCountData, cancelledCountData, brandShare, totalRev, brandShareSorted } = processChartData();

  const ordersChartConfig = {
    series: [
      { name: 'Delivered', data: deliveredCountData },
      { name: 'Processing', data: processingCountData },
      { name: 'Cancelled', data: cancelledCountData }
    ]
  };

  // Notification Push Alert Metrics calculation across ALL registered users
  const notificationsMetrics = React.useMemo(() => {
    let enabled = 0;
    let disabled = 0;

    (users || []).forEach(u => {
      const isEnabled = u.notificationsEnabled === true || (Array.isArray(u.devices) && u.devices.some(d => d.notificationsEnabled === true));
      if (isEnabled) {
        enabled++;
      } else {
        disabled++;
      }
    });

    if (users && users.length > 0) {
      return { enabled, disabled };
    }

    return {
      enabled: Number(activityStats?.deviceMetrics?.notificationsEnabled) || 0,
      disabled: Number(activityStats?.deviceMetrics?.notificationsDisabled) || 0
    };
  }, [users, activityStats]);

  // Filtered users for the Notifications details popup
  const filteredNotificationsUsers = React.useMemo(() => {
    return (users || []).filter(u => {
      // 1. Filter by notification status segment
      const isEnabled = u.notificationsEnabled === true || (Array.isArray(u.devices) && u.devices.some(d => d.notificationsEnabled === true));
      if (selectedNotificationsSegment === 'Enabled' && !isEnabled) return false;
      if (selectedNotificationsSegment === 'Disabled' && isEnabled) return false;

      // 2. Filter by search query
      if (notificationsSearchQuery.trim() !== '') {
        const query = notificationsSearchQuery.toLowerCase();
        const nameMatch = (u.name || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const phoneMatch = (u.phone || '').toLowerCase().includes(query);
        return nameMatch || emailMatch || phoneMatch;
      }
      return true;
    });
  }, [users, selectedNotificationsSegment, notificationsSearchQuery]);



  // Calculate Product Price Tier Engagement (Grouped Bar Chart)
  const priceTierEngagementData = React.useMemo(() => {
    const tiers = {
      budget: { label: 'Budget (< ₹1k)', views: 0, cartAdds: 0 },
      mid: { label: 'Mid-Tier (₹1k-10k)', views: 0, cartAdds: 0 },
      premium: { label: 'Premium (₹10k-20k)', views: 0, cartAdds: 0 }
    };

    const getTierKey = (price) => {
      const p = Number(price) || 0;
      if (p < 1000) return 'budget';
      if (p < 10000) return 'mid';
      return 'premium';
    };

    const productPriceMap = {};
    (products || []).forEach(prod => {
      if (prod && prod._id) {
        productPriceMap[prod._id] = Number(prod.offerPrice || prod.basePrice) || 0;
      }
    });

    const stream = [
      ...(activityStats?.recentActivities || []),
      ...(activityStats?.activityStream || []),
      ...(analyticsData?.activityStream || [])
    ];

    const productViewsMap = {};

    // 1. Accumulate views from mostViewedProducts API
    const mostViewed = activityStats?.mostViewedProducts || [];
    mostViewed.forEach(item => {
      const prodId = item.productId || (typeof item.product === 'object' ? item.product?._id : item.product);
      if (!prodId) return;

      let views = Number(item.views || item.count || 0);
      if (!views && Array.isArray(item.viewers)) {
        views = item.viewers.reduce((s, v) => s + (v.count || 1), 0);
      }

      productViewsMap[prodId] = (productViewsMap[prodId] || 0) + views;
    });

    // 2. Accumulate views from activity streams for products not in mostViewed
    const seenEvents = new Set();
    stream.forEach(evt => {
      const eventKey = evt._id || `${evt.userId || evt.user?._id || ''}-${evt.timestamp || evt.createdAt || ''}-${evt.eventType || evt.action || ''}`;
      if (seenEvents.has(eventKey)) return;
      seenEvents.add(eventKey);

      const action = (evt.action || evt.eventType || evt.type || '').toUpperCase();
      const isProductView = action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'VIEW_PRODUCT' || (action.includes('PRODUCT') && action.includes('VIEW'));

      if (isProductView) {
        const prodId = evt.details?.productId || evt.productId || (typeof evt.product === 'object' ? evt.product?._id : evt.product);
        if (prodId && !mostViewed.some(mv => (mv.productId || (typeof mv.product === 'object' ? mv.product?._id : mv.product)) === prodId)) {
          productViewsMap[prodId] = (productViewsMap[prodId] || 0) + 1;
        }
      }

      // Accumulate cart additions per price tier
      if (action === 'ADD_TO_CART' || action === 'CART_ADD' || (action.includes('CART') && !action.includes('REMOVE') && !action.includes('CLEAR'))) {
        const prodId = evt.details?.productId || evt.productId || (typeof evt.product === 'object' ? evt.product?._id : evt.product);
        const price = (evt.details?.offerPrice || evt.details?.price || (typeof evt.product === 'object' ? (evt.product?.offerPrice || evt.product?.basePrice) : undefined)) ?? productPriceMap[prodId] ?? 0;
        const key = getTierKey(price);
        tiers[key].cartAdds += 1;
      }
    });

    // 3. Map views to price tiers
    Object.entries(productViewsMap).forEach(([prodId, views]) => {
      const prodObj = (products || []).find(p => p._id === prodId);
      const price = (prodObj?.offerPrice || prodObj?.basePrice) ?? productPriceMap[prodId] ?? 0;
      const key = getTierKey(price);
      tiers[key].views += views;
    });

    return {
      categories: [tiers.budget.label, tiers.mid.label, tiers.premium.label],
      views: [tiers.budget.views, tiers.mid.views, tiers.premium.views],
      cartAdds: [tiers.budget.cartAdds, tiers.mid.cartAdds, tiers.premium.cartAdds]
    };
  }, [products, activityStats, analyticsData]);



  const todayStr = React.useMemo(() => {
    let target = new Date().toISOString().split('T')[0];
    const allDates = (activityStats?.recentActivities || [])
      .map(act => (act.createdAt || act.timestamp)?.split('T')[0])
      .filter(Boolean);
    if (allDates.length > 0 && !(activityStats?.recentActivities || []).some(act => (act.createdAt || act.timestamp)?.startsWith(target))) {
      allDates.sort((a, b) => b.localeCompare(a));
      target = allDates[0];
    }
    return target;
  }, [activityStats]);

  const totalProductViews = breakdownType === 'day'
    ? (activityStats?.recentActivities || []).filter(act => {
        const action = (act.action || '').toUpperCase();
        return (action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT') && (act.createdAt || act.timestamp)?.startsWith(todayStr);
      }).length
    : ((activityStats?.mostViewedProducts?.reduce((sum, item) => sum + (item.views !== undefined ? item.views : (Array.isArray(item.viewers) ? item.viewers.reduce((s, v) => s + (v.count || 0), 0) : 0)), 0)) || (activityStats?.recentActivities?.filter(act => {
        const action = (act.action || '').toUpperCase();
        return action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
      }).length) || (activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.productViews || 0), 0)) || 0);

  const sortedMostViewedProducts = React.useMemo(() => {
    if (breakdownType === 'day') {
      const todayProductViewsMap = {};
      (activityStats?.recentActivities || []).forEach(act => {
        const action = (act.action || '').toUpperCase();
        const isProductView = action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
        if (isProductView && (act.createdAt || act.timestamp)?.startsWith(todayStr)) {
          const resolvedProductId = act.productId || act.details?.productId;
          if (resolvedProductId) {
            todayProductViewsMap[resolvedProductId] = (todayProductViewsMap[resolvedProductId] || 0) + 1;
          }
        }
      });
      return Object.entries(todayProductViewsMap)
        .map(([productId, views]) => ({ productId, views }))
        .sort((a, b) => b.views - a.views);
    }
    return activityStats?.mostViewedProducts || [];
  }, [activityStats, breakdownType, todayStr]);

  // Calculate aggregate daily counts for trends chart
  const dailyCounts = React.useMemo(() => {
    const map = {};
    const add = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(item => {
        if (item.date) {
          map[item.date] = (map[item.date] || 0) + (item.count || 0);
        }
      });
    };
    add(activityStats?.trends?.products);
    add(activityStats?.trends?.brands);
    add(activityStats?.trends?.categories);
    add(activityStats?.trends?.searches);

    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activityStats]);

  const dailyLabels = React.useMemo(() => dailyCounts.map(d => formatYYYYMMDDToDDMMYYYY(d.date)), [dailyCounts]);
  const dailyValues = React.useMemo(() => dailyCounts.map(d => d.count), [dailyCounts]);

  const { trendsLabels, trendsValues, trendsBreakdowns } = React.useMemo(() => {
    const isTrendAction = (actionStr) => {
      const act = (actionStr || '').toUpperCase();
      return (
        act.includes('PRODUCT') ||
        act.includes('BRAND') ||
        act.includes('CATEGORY') ||
        act.includes('SEARCH')
      );
    };

    const getActionBreakdown = (logs) => {
      const counts = {};
      logs.forEach(log => {
        let type = 'Other';
        const act = (log.action || '').toUpperCase();
        if (act.includes('LOGIN')) type = 'Login';
        else if (act.includes('LOGOUT')) type = 'Logout';
        else if (act.includes('VIEW') || act.includes('GET')) {
          if (act.includes('PRODUCT')) type = 'Product View';
          else if (act.includes('BRAND')) type = 'Brand View';
          else if (act.includes('CATEGORY')) type = 'Category View';
          else type = 'Page View';
        }
        else if (act.includes('CREATE') || act.includes('ADD') || act.includes('POST')) {
          if (act.includes('PRODUCT')) type = 'Product Add';
          else if (act.includes('BRAND')) type = 'Brand Add';
          else if (act.includes('CATEGORY')) type = 'Category Add';
          else type = 'Item Creation';
        }
        else if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('PUT')) {
          if (act.includes('PRODUCT')) type = 'Product Edit';
          else if (act.includes('BRAND')) type = 'Brand Edit';
          else if (act.includes('CATEGORY')) type = 'Category Edit';
          else type = 'Cart Item Edit';
        }
        else if (act.includes('DELETE')) {
          if (act.includes('PRODUCT')) type = 'Product Delete';
          else if (act.includes('BRAND')) type = 'Brand Delete';
          else if (act.includes('CATEGORY')) type = 'Category Delete';
          else type = 'Item Delete';
        }
        else if (act.includes('SEARCH')) {
          type = 'Search Query';
        }
        
        counts[type] = (counts[type] || 0) + 1;
      });
      return counts;
    };

    // Calculate synchronized count for a specific date
    const getSynchronizedCount = (dateStr) => {
      // Find count in dailyCounts (which represents pre-aggregated server trends for views/searches)
      const dailyObj = dailyCounts.find(d => d.date === dateStr);
      const trendCount = dailyObj ? dailyObj.count : 0;

      // Find non-trend actions (like LOGIN, LOGOUT) in recentActivities for this date
      const nonTrendCount = (activityStats?.recentActivities || []).filter(act => {
        if (!act.createdAt || !act.createdAt.startsWith(dateStr)) return false;
        return !isTrendAction(act.action);
      }).length;

      const sumTrendAndNonTrend = trendCount + nonTrendCount;

      // Find total count directly from recentActivities as a fallback/realtime verify
      const totalRecentCount = (activityStats?.recentActivities || []).filter(act =>
        act.createdAt && act.createdAt.startsWith(dateStr)
      ).length;

      return Math.max(sumTrendAndNonTrend, totalRecentCount);
    };

    if (trendsRange === '1d') {
      // 1. One Day (Hourly intervals)
      let targetDateStr = new Date().toISOString().split('T')[0];
      const allDates = (activityStats?.recentActivities || [])
        .map(act => act.createdAt?.split('T')[0])
        .filter(Boolean);

      if (allDates.length > 0 && !(activityStats?.recentActivities || []).some(act => act.createdAt?.startsWith(targetDateStr))) {
        allDates.sort((a, b) => b.localeCompare(a));
        targetDateStr = allDates[0];
      }

      const hours = Array.from({ length: 24 }, (_, i) => ({
        hourNum: i,
        count: 0,
        breakdown: {}
      }));

      const targetLogs = (activityStats?.recentActivities || []).filter(act => act.createdAt?.startsWith(targetDateStr));
      targetLogs.forEach(act => {
        const date = new Date(act.createdAt);
        const hour = date.getHours();
        if (hours[hour]) {
          hours[hour].count += 1;
        }
      });

      hours.forEach(h => {
        const hourLogs = targetLogs.filter(act => {
          const d = new Date(act.createdAt);
          return d.getHours() === h.hourNum;
        });
        h.breakdown = getActionBreakdown(hourLogs);
      });

      const labels = hours.map(h => {
        const h12 = h.hourNum % 12 === 0 ? 12 : h.hourNum % 12;
        const ampm = h.hourNum < 12 ? 'AM' : 'PM';
        return `${h12} ${ampm}`;
      });
      const values = hours.map(h => h.count);

      return { 
        trendsLabels: labels, 
        trendsValues: values,
        trendsBreakdowns: hours.map(h => h.breakdown)
      };

    } else if (trendsRange === '1y') {
      // 2. One Year (12 months)
      let targetDateStr = new Date().toISOString().split('T')[0];
      const allDates = (activityStats?.recentActivities || [])
        .map(act => act.createdAt?.split('T')[0])
        .filter(Boolean);
      if (allDates.length > 0 && !(activityStats?.recentActivities || []).some(act => act.createdAt?.startsWith(targetDateStr))) {
        allDates.sort((a, b) => b.localeCompare(a));
        targetDateStr = allDates[0];
      }

      const last12Months = [];
      const baseMonthDate = allDates.length > 0 ? new Date(targetDateStr) : new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(baseMonthDate.getFullYear(), baseMonthDate.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        last12Months.push({
          yearMonth,
          label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          count: 0,
          breakdown: {}
        });
      }

      // Group and sum synchronized daily counts for each month
      last12Months.forEach(month => {
        const monthDates = new Set();
        dailyCounts.forEach(d => {
          if (d.date.startsWith(month.yearMonth)) {
            monthDates.add(d.date);
          }
        });
        const monthLogs = (activityStats?.recentActivities || []).filter(act =>
          act.createdAt && act.createdAt.startsWith(month.yearMonth)
        );

        let monthSum = 0;
        monthDates.forEach(dateStr => {
          monthSum += getSynchronizedCount(dateStr);
        });

        if (monthSum === 0) {
          monthSum = monthLogs.length;
        }

        month.count = monthSum;
        month.breakdown = getActionBreakdown(monthLogs);
      });

      return {
        trendsLabels: last12Months.map(m => m.label),
        trendsValues: last12Months.map(m => m.count),
        trendsBreakdowns: last12Months.map(m => m.breakdown)
      };

    } else if (trendsRange === '1m') {
      // 3. One Month (30 days)
      let targetDateStr = new Date().toISOString().split('T')[0];
      const allDates = (activityStats?.recentActivities || [])
        .map(act => act.createdAt?.split('T')[0])
        .filter(Boolean);
      if (allDates.length > 0 && !(activityStats?.recentActivities || []).some(act => act.createdAt?.startsWith(targetDateStr))) {
        allDates.sort((a, b) => b.localeCompare(a));
        targetDateStr = allDates[0];
      }

      const last30Days = [];
      const baseDate = allDates.length > 0 ? new Date(targetDateStr) : new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last30Days.push({
          dateStr,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: 0,
          breakdown: {}
        });
      }

      last30Days.forEach(day => {
        day.count = getSynchronizedCount(day.dateStr);
        const dayLogs = (activityStats?.recentActivities || []).filter(act =>
          act.createdAt && act.createdAt.startsWith(day.dateStr)
        );
        day.breakdown = getActionBreakdown(dayLogs);
      });

      return {
        trendsLabels: last30Days.map(d => d.label),
        trendsValues: last30Days.map(d => d.count),
        trendsBreakdowns: last30Days.map(d => d.breakdown)
      };

    } else {
      // 4. One Week (7 days) - default
      let targetDateStr = new Date().toISOString().split('T')[0];
      const allDates = (activityStats?.recentActivities || [])
        .map(act => act.createdAt?.split('T')[0])
        .filter(Boolean);
      if (allDates.length > 0 && !(activityStats?.recentActivities || []).some(act => act.createdAt?.startsWith(targetDateStr))) {
        allDates.sort((a, b) => b.localeCompare(a));
        targetDateStr = allDates[0];
      }

      const last7Days = [];
      const baseDate = allDates.length > 0 ? new Date(targetDateStr) : new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last7Days.push({
          dateStr,
          label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          count: 0,
          breakdown: {}
        });
      }

      last7Days.forEach(day => {
        day.count = getSynchronizedCount(day.dateStr);
        const dayLogs = (activityStats?.recentActivities || []).filter(act =>
          act.createdAt && act.createdAt.startsWith(day.dateStr)
        );
        day.breakdown = getActionBreakdown(dayLogs);
      });

      return {
        trendsLabels: last7Days.map(d => d.label),
        trendsValues: last7Days.map(d => d.count),
        trendsBreakdowns: last7Days.map(d => d.breakdown)
      };
    }
  }, [trendsRange, dailyCounts, activityStats]);

  const [activeLabels, setActiveLabels] = useState(() => trendsLabels);
  const [activeValues, setActiveValues] = useState(() => trendsValues);
  const [activeBreakdowns, setActiveBreakdowns] = useState(() => trendsBreakdowns);
  const [chartOpacity, setChartOpacity] = useState(1);

  useEffect(() => {
    if (activeLabels.length > 0) {
      setChartOpacity(0);
      const t = setTimeout(() => {
        setActiveLabels(trendsLabels);
        setActiveValues(trendsValues);
        setActiveBreakdowns(trendsBreakdowns);
        setChartOpacity(1);
      }, 150);
      return () => clearTimeout(t);
    } else {
      setActiveLabels(trendsLabels);
      setActiveValues(trendsValues);
      setActiveBreakdowns(trendsBreakdowns);
    }
  }, [trendsRange, trendsLabels, trendsValues, trendsBreakdowns]);

  // Extract top trending highlights to display in the side list
  const trendingHighlights = React.useMemo(() => {
    const list = [];
    if (activityStats?.trends?.products) {
      activityStats.trends.products.forEach(p => {
        list.push({
          name: p.productName || 'Unknown Product',
          type: 'Product',
          date: formatYYYYMMDDToDDMMYYYY(p.date),
          count: p.count || 0
        });
      });
    }
    if (activityStats?.trends?.brands) {
      activityStats.trends.brands.forEach(b => {
        list.push({
          name: b.brandName || 'Unknown Brand',
          type: 'Brand',
          date: formatYYYYMMDDToDDMMYYYY(b.date),
          count: b.count || 0
        });
      });
    }
    if (activityStats?.trends?.categories) {
      activityStats.trends.categories.forEach(c => {
        list.push({
          name: c.categoryName || 'Unknown Category',
          type: 'Category',
          date: formatYYYYMMDDToDDMMYYYY(c.date),
          count: c.count || 0
        });
      });
    }
    if (activityStats?.trends?.searches) {
      activityStats.trends.searches.forEach(s => {
        list.push({
          name: `"${s.query}"`,
          type: 'Search',
          date: formatYYYYMMDDToDDMMYYYY(s.date),
          count: s.count || 0
        });
      });
    }
    return list.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [activityStats]);

  // Dynamic data metrics
  const metrics = [
    {
      title: "Total Revenue",
      value: `₹${totalRev.toLocaleString('en-IN')}`,
      icon: BiRupee,
      groupHover: "group-hover:text-emerald-400",
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
      fromColor: "from-emerald-500/25",
      hoverBorder: "hover:border-emerald-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
    },
    {
      title: "No of Brands",
      value: brands.length,
      icon: FiTrendingUp,
      groupHover: "group-hover:text-blue-400",
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      fromColor: "from-blue-500/25",
      hoverBorder: "hover:border-blue-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
    },
    {
      title: "No of Products",
      value: products.length,
      icon: FiBox,
      groupHover: "group-hover:text-purple-400",
      color: "text-purple-400",
      bg: "bg-purple-500/20",
      fromColor: "from-purple-500/25",
      hoverBorder: "hover:border-purple-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
    },
    {
      title: "Total Products (with Variants)",
      value: products.reduce((sum, p) => sum + (Array.isArray(p.variants) && p.variants.length > 1 ? p.variants.length : 1), 0),
      icon: FiLayers,
      groupHover: "group-hover:text-rose-400",
      color: "text-rose-400",
      bg: "bg-rose-500/20",
      fromColor: "from-rose-500/25",
      hoverBorder: "hover:border-rose-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(255,0,0,0.3)]"
    },
    {
      title: "Total Users",
      value: users.length,
      icon: FiUsers,
      groupHover: "group-hover:text-amber-400",
      color: "text-amber-400",
      bg: "bg-amber-500/20",
      fromColor: "from-amber-500/25",
      hoverBorder: "hover:border-orange-500/20",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
    },
  ];

  // Dynamic activity metrics cards configurations
  const brandViewsCount = breakdownType === 'day'
    ? (activityStats?.recentActivities || []).filter(act => {
        const action = (act.action || '').toUpperCase();
        return (action === 'BRAND_VIEW' || action === 'BRAND') && (act.createdAt || act.timestamp)?.startsWith(todayStr);
      }).length
    : ((activityStats?.mostSearchedBrands?.reduce((sum, item) => sum + (item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((s, v) => s + (v.count || 0), 0) : 0)), 0)) || (activityStats?.recentActivities?.filter(act => {
        const action = (act.action || '').toUpperCase();
        return action === 'BRAND_VIEW' || action === 'BRAND';
      }).length) || (activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.brandViews || 0), 0)) || 0);

  const categoryViewsCount = breakdownType === 'day'
    ? (activityStats?.recentActivities || []).filter(act => {
        const action = (act.action || '').toUpperCase();
        return (action === 'CATEGORY_VIEW' || action === 'CATEGORY') && (act.createdAt || act.timestamp)?.startsWith(todayStr);
      }).length
    : ((activityStats?.mostSearchedCategories?.reduce((sum, item) => sum + (item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((s, v) => s + (v.count || 0), 0) : 0)), 0)) || (activityStats?.recentActivities?.filter(act => {
        const action = (act.action || '').toUpperCase();
        return action === 'CATEGORY_VIEW' || action === 'CATEGORY';
      }).length) || (activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.categoryViews || 0), 0)) || 0);

  const activityMetricCards = [
    {
      title: "Total Logins",
      value: breakdownType === 'day'
        ? (activityStats?.recentActivities || []).filter(act => (act.action || '').toUpperCase() === 'LOGIN' && (act.createdAt || act.timestamp)?.startsWith(todayStr)).length
        : ((activityStats?.summary?.totalLogins !== undefined && activityStats?.summary?.totalLogins !== null)
            ? activityStats.summary.totalLogins
            : ((activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.logins || 0), 0)) || (activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'LOGIN').length) || 0)),
      desc: "Active user logins log",
      path: "/dashboard/details/logins",
      icon: FiLogIn,
      color: "text-emerald-400",
      hoverColor: "group-hover:text-emerald-400",
      bg: "bg-emerald-500/15",
      fromColor: "from-emerald-500/20",
      hoverBorder: "hover:border-emerald-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
      theme: "emerald"
    },
    {
      title: "Total Logouts",
      value: breakdownType === 'day'
        ? (activityStats?.recentActivities || []).filter(act => (act.action || '').toUpperCase() === 'LOGOUT' && (act.createdAt || act.timestamp)?.startsWith(todayStr)).length
        : ((activityStats?.summary?.totalLogouts !== undefined && activityStats?.summary?.totalLogouts !== null)
            ? activityStats.summary.totalLogouts
            : ((activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.logouts || 0), 0)) || (activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'LOGOUT').length) || 0)),
      desc: "Active user logouts log",
      path: "/dashboard/details/logouts",
      icon: FiLogOut,
      color: "text-rose-400",
      hoverColor: "group-hover:text-rose-400",
      bg: "bg-rose-500/15",
      fromColor: "from-rose-500/20",
      hoverBorder: "hover:border-rose-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]",
      theme: "rose"
    },
    {
      title: "Product Views",
      value: totalProductViews,
      desc: "Product catalogs visited",
      path: "/dashboard/details/product-views",
      icon: FiEye,
      color: "text-blue-400",
      hoverColor: "group-hover:text-blue-400",
      bg: "bg-blue-500/15",
      fromColor: "from-blue-500/20",
      hoverBorder: "hover:border-blue-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
      theme: "blue"
    },
    {
      title: "Brand Views",
      value: brandViewsCount,
      desc: "Brand catalogs visited",
      path: "/dashboard/details/brand-views",
      icon: FiTrendingUp,
      color: "text-indigo-400",
      hoverColor: "group-hover:text-indigo-400",
      bg: "bg-indigo-500/15",
      fromColor: "from-indigo-500/20",
      hoverBorder: "hover:border-indigo-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]",
      theme: "indigo"
    },
    {
      title: "Category Views",
      value: categoryViewsCount,
      desc: "Category segments visited",
      path: "/dashboard/details/category-views",
      icon: FiLayers,
      color: "text-purple-400",
      hoverColor: "group-hover:text-purple-400",
      bg: "bg-purple-500/15",
      fromColor: "from-purple-500/20",
      hoverBorder: "hover:border-purple-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]",
      theme: "purple"
    },
    {
      title: "Search Queries",
      value: (() => {
        if (breakdownType === 'day') {
          const directCount = (activityStats?.recentActivities || []).filter(act => (act.action || '').toUpperCase() === 'SEARCH' && (act.createdAt || act.timestamp)?.startsWith(todayStr)).length;
          if (directCount > 0) return directCount;

          if (activityStats?.users) {
            return activityStats.users.filter(u => u.activityStats?.searches > 0 && (u.lastActive || '').startsWith(todayStr)).length;
          }
          return 0;
        }

        const totalDirect = (activityStats?.recentActivities || []).filter(act => (act.action || '').toUpperCase() === 'SEARCH').length;
        if (totalDirect > 0) return totalDirect;

        const sumMostSearched = activityStats?.mostSearched?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
        if (sumMostSearched > 0) return sumMostSearched;

        return activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.searches || 0), 0) || 0;
      })(),
      desc: "Catalog searches made",
      path: "/dashboard/details/search-queries",
      icon: FiSearch,
      color: "text-amber-400",
      hoverColor: "group-hover:text-amber-400",
      bg: "bg-amber-500/15",
      fromColor: "from-amber-500/20",
      hoverBorder: "hover:border-amber-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
      theme: "amber"
    },
    {
      title: "Users Stats",
      value: `${users.filter(u => u.isOnline).length} Online`,
      desc: `${users.filter(u => u.isAppLockEnabled).length} App Lock Secured`,
      path: "/dashboard/details/users-status",
      icon: FiActivity,
      color: "text-teal-400",
      hoverColor: "group-hover:text-teal-400",
      bg: "bg-teal-500/15",
      fromColor: "from-teal-500/20",
      hoverBorder: "hover:border-teal-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(20,184,166,0.2)]",
      theme: "teal"
    },
    {
      title: "App Installed",
      value: users.filter(u => checkAppStatus(u) === 'installed').length,
      desc: "Active Installations count",
      path: "/dashboard/details/installed",
      icon: FiCheck,
      color: "text-orange-400",
      hoverColor: "group-hover:text-orange-400",
      bg: "bg-orange-500/15",
      fromColor: "from-orange-500/20",
      hoverBorder: "hover:border-orange-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]",
      theme: "orange"
    },
    {
      title: "App Uninstalled",
      value: users.filter(u => checkAppStatus(u) === 'uninstalled').length,
      desc: "Device app uninstalls count",
      path: "/dashboard/details/uninstalled",
      icon: FiX,
      color: "text-fuchsia-400",
      hoverColor: "group-hover:text-fuchsia-400",
      bg: "bg-fuchsia-500/15",
      fromColor: "from-fuchsia-500/20",
      hoverBorder: "hover:border-fuchsia-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]",
      theme: "fuchsia"
    },
    {
      title: "API Request Stats",
      value: requestStats.reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString(),
      desc: "Total tracked API endpoint hits",
      path: "/dashboard/details/request-stats",
      icon: FiActivity,
      color: "text-violet-400",
      hoverColor: "group-hover:text-violet-400",
      bg: "bg-violet-500/15",
      fromColor: "from-violet-500/20",
      hoverBorder: "hover:border-violet-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]",
      theme: "violet"
    },
    {
      title: "Product Subscriptions",
      value: subscriptions.length,
      desc: "Back in stock alerts subscribed",
      path: "/dashboard/details/product-subscriptions",
      icon: FiBell,
      color: "text-cyan-400",
      hoverColor: "group-hover:text-cyan-400",
      bg: "bg-cyan-500/15",
      fromColor: "from-cyan-500/20",
      hoverBorder: "hover:border-cyan-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]",
      theme: "cyan"
    },
    {
      title: "Funnel & Cart Analytics",
      value: `${analyticsData?.cartMetrics?.activeCartsCount || 0} Active Carts`,
      desc: `Total Cart Adds: ${analyticsData?.funnel?.cartAdds || 0}`,
      path: "/dashboard/details/analytics",
      icon: FiTrendingUp,
      color: "text-pink-400",
      hoverColor: "group-hover:text-pink-400",
      bg: "bg-pink-500/15",
      fromColor: "from-pink-500/20",
      hoverBorder: "hover:border-pink-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]",
      theme: "pink"
    }
  ];

  if (loading) {
    return (
      <div className="relative space-y-6 min-h-full z-0 isolate w-full">
        <PageHeader
          title="Dashboard Overview"
          icon={FiTrendingUp}
          description="Live metrics covering sales performance, user behavior, and catalog analytics."
        />

        <KPISkeleton cards={5} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative mt-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="h-6 bg-white/5 rounded-lg w-1/4 mb-6 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="p-6 min-h-[300px]">
              <div className="h-6 bg-white/5 rounded-lg w-1/2 mb-6 animate-pulse" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center animate-pulse">
                    <div className="h-4 bg-white/5 rounded-md w-2/3" />
                    <div className="h-6 bg-white/5 rounded-md w-12" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[80vh] flex flex-col justify-center items-center relative z-10 w-full">
        <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 backdrop-blur-xl flex flex-col items-center gap-4 max-w-md text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <FiActivity size={24} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-lg tracking-tight">Dashboard Connection Error</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full">



      {/* Header Section */}
      <PageHeader
        title="Dashboard Overview"
        icon={FiTrendingUp}
        description="Live metrics covering sales performance, user behavior, and catalog analytics."
        action={
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 px-4.5 py-2 rounded-2xl flex items-center gap-3 shadow-lg shrink-0 w-fit self-start md:self-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-[10px] md:text-xs">
              {/* <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Live Connection</span> */}
              <span className="text-white font-extrabold font-mono mt-0.5 block">
                {formatDateDDMMYYYY(new Date())}
              </span>
            </div>
          </div>
        }
      />

      {/* Metric Cards Grid */}
      <div className="relative grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-6 z-10">
        {metrics.map((metric, index) => (
          <Card
            key={index}
            hoverable
            glowing
            style={{
              '--glow-color': metric.title === "Total Revenue" ? '#10b981' :
                              metric.title === "No of Brands" ? '#3b82f6' :
                              metric.title === "No of Products" ? '#8b5cf6' :
                              metric.title === "Total Products (with Variants)" ? '#f43f5e' :
                              metric.title === "Total Users" ? '#f59e0b' : '#3b82f6',
              '--glow-color-alt': metric.title === "Total Revenue" ? '#34d399' :
                                  metric.title === "No of Brands" ? '#60a5fa' :
                                  metric.title === "No of Products" ? '#a78bfa' :
                                  metric.title === "Total Products (with Variants)" ? '#fb7185' :
                                  metric.title === "Total Users" ? '#fbbf24' : '#60a5fa',
              '--glow-shadow': metric.title === "Total Revenue" ? 'rgba(16, 185, 129, 0.4)' :
                               metric.title === "No of Brands" ? 'rgba(59, 130, 246, 0.4)' :
                               metric.title === "No of Products" ? 'rgba(139, 92, 246, 0.4)' :
                               metric.title === "Total Products (with Variants)" ? 'rgba(244, 63, 94, 0.4)' :
                               metric.title === "Total Users" ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)'
            }}
            className={`p-4 sm:p-5 xl:p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden group ${metric.hoverBorder}`}
            onClick={() => {
              if (metric.path) {
                navigate(`${metric.path}${getFilterQueryParams()}`);
              } else {
                usernav(index);
              }
            }}
          >
            <div className={`absolute inset-0 bg-linear-to-b ${metric.fromColor} to-transparent pointer-events-none`}></div>
            <div className="relative flex items-center justify-between mb-4 z-10">
              <div className={`p-3.5 rounded-xl ${metric.bg}`}>
                <metric.icon className={`text-xl ${metric.color}`} />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className={`text-slate-400 text-sm font-bold tracking-wide ${metric.groupHover}`}>{metric.title}</h3>
              <p
                className="text-2xl xl:text-xl 2xl:text-3xl font-extrabold text-white mt-1 tracking-tight truncate"
                title={metric.value.toString()}
              >
                {metric.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Activity & engagement Analytics Section */}
      {!loading && activityStats && (
        <div className="mt-8 space-y-2 relative z-10">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <FiActivity className="text-blue-400" /> Activity & Engagement Analytics
            </h2>
            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-3 flex-1">
              {/* Interval Selection Dropdown */}
              <div className="flex items-center gap-2 w-64">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">Interval:</span>
                <CustomDropdown
                  value={breakdownType}
                  onChange={(val) => setBreakdownType(val)}
                  options={[
                    { value: 'day', label: 'Daily Breakdown' },
                    { value: 'month', label: 'Monthly Breakdown' },
                    { value: 'custom', label: 'Custom Date Range' }
                  ]}
                  statusColor="border-white/10 hover:border-blue-500/30 text-white font-bold bg-slate-800/80 !py-1.5 !rounded-xl text-xs"
                />
              </div>

              {/* Custom Date Pickers */}
              {breakdownType === 'custom' && (
                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                  <CustomDatePicker
                    label="From"
                    value={startDate}
                    max={endDate}
                    onChange={setStartDate}
                  />
                  <CustomDatePicker
                    label="To"
                    value={endDate}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={setEndDate}
                  />
                </div>
              )}

              <button
                onClick={() => navigate(`/dashboard/details/all${getFilterQueryParams()}`)}
                className="flex items-center px-4 py-2 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] w-fit"
              >
                <FiActivity className="mr-1.5" /> View Detailed Log Feed
              </button>
            </div>
          </div>

          {/* Main Activity Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Engagement Categories Grid */}
            <Card className="lg:col-span-2 h-full gap-6">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

              <div className="relative grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10">
                {activityMetricCards.map((card, idx) => (
                  <Card
                    key={idx}
                    glowing
                    onClick={() => navigate(`${card.path}${getFilterQueryParams()}`)}
                    style={{
                      '--glow-color': card.theme === "emerald" ? '#10b981' :
                                      card.theme === "rose" ? '#f43f5e' :
                                      card.theme === "blue" ? '#3b82f6' :
                                      card.theme === "indigo" ? '#6366f1' :
                                      card.theme === "purple" ? '#8b5cf6' :
                                      card.theme === "amber" ? '#f59e0b' :
                                      card.theme === "teal" ? '#14b8a6' :
                                      card.theme === "orange" ? '#f97316' :
                                      card.theme === "fuchsia" ? '#d946ef' :
                                      card.theme === "violet" ? '#7c3aed' :
                                      card.theme === "cyan" ? '#06b6d4' :
                                      card.theme === "pink" ? '#ec4899' : '#3b82f6',
                      '--glow-color-alt': card.theme === "emerald" ? '#34d399' :
                                          card.theme === "rose" ? '#fb7185' :
                                          card.theme === "blue" ? '#60a5fa' :
                                          card.theme === "indigo" ? '#818cf8' :
                                          card.theme === "purple" ? '#a78bfa' :
                                          card.theme === "amber" ? '#fbbf24' :
                                          card.theme === "teal" ? '#2dd4bf' :
                                          card.theme === "orange" ? '#fb923c' :
                                          card.theme === "fuchsia" ? '#f472b6' :
                                          card.theme === "violet" ? '#a78bfa' :
                                          card.theme === "cyan" ? '#22d3ee' :
                                          card.theme === "pink" ? '#f472b6' : '#60a5fa',
                      '--glow-shadow': card.theme === "emerald" ? 'rgba(16, 185, 129, 0.4)' :
                                       card.theme === "rose" ? 'rgba(244, 63, 94, 0.4)' :
                                       card.theme === "blue" ? 'rgba(59, 130, 246, 0.4)' :
                                       card.theme === "indigo" ? 'rgba(99, 102, 241, 0.4)' :
                                       card.theme === "purple" ? 'rgba(139, 92, 246, 0.4)' :
                                       card.theme === "amber" ? 'rgba(245, 158, 11, 0.4)' :
                                       card.theme === "teal" ? 'rgba(20, 184, 166, 0.4)' :
                                       card.theme === "orange" ? 'rgba(249, 115, 22, 0.4)' :
                                       card.theme === "fuchsia" ? 'rgba(217, 70, 239, 0.4)' :
                                       card.theme === "violet" ? 'rgba(124, 58, 237, 0.4)' :
                                       card.theme === "cyan" ? 'rgba(6, 182, 212, 0.4)' :
                                       card.theme === "pink" ? 'rgba(236, 72, 153, 0.4)' : 'rgba(59, 130, 246, 0.4)'
                    }}
                    className={`relative overflow-hidden bg-slate-950/20 border border-white/5 ${card.hoverBorder} p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[145px] group hover:bg-slate-950/45 hover:shadow-xl shadow-black/30`}
                  >
                    <div className={`absolute inset-0 bg-linear-to-b ${card.fromColor} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>
                    <div className="relative flex justify-between items-center mb-3 z-10">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors">{card.title}</span>
                      <div className={`p-2 rounded-xl ${card.bg}`}>
                        <card.icon className={`${card.color} text-lg`} />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <p className="text-3xl font-black text-white tracking-tight">{card.value}</p>
                      <p className={`text-[10px] text-slate-500 font-bold mt-2.5 ${card.hoverColor || 'group-hover:text-blue-400'} transition-colors flex items-center gap-1.5 uppercase tracking-wider`}>
                        {card.desc} &rarr;
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Right Column: Most Viewed Products */}
            <Card className="lg:min-h-full min-h-fit bg-transparent backdrop-blur-2xl border border-white/10">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

              <div className="relative border-b border-white/5 pb-4 mb-6 z-10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Most viewed Products
                </h3>
                <button
                  onClick={() => navigate(`/dashboard/details/most-viewed-products${getFilterQueryParams()}`)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 hover:underline"
                >
                  View All &rarr;
                </button>
              </div>

              <div className="relative z-10 flex-1 max-h-[620px] overflow-y-auto space-y-3 p-0.5 custom-scrollbar pr-1">
                {!sortedMostViewedProducts || sortedMostViewedProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <FiBox className="mx-auto text-slate-600 text-3xl mb-2" />
                    <p className="text-xs text-slate-500 font-medium">No product views recorded yet.</p>
                  </div>
                ) : (
                  sortedMostViewedProducts.map((item, idx) => {
                    const resolvedProductId = item.productId || item.product?._id || item.product;
                    const prod = products.find(p => p._id === resolvedProductId) || item.product || {};
                    const firstImg = prod.images?.[0] || '';
                    const imgUrl = firstImg.startsWith('http') ? firstImg : (firstImg ? `${BASE_URL}${firstImg.startsWith('/') ? '' : '/'}${firstImg}` : '');

                    let rankBg = 'bg-slate-800/80 text-slate-400 border-white/10';
                    let itemBorder = 'border-white/5 hover:border-blue-500/30 bg-transparent backdrop-blur-2xl hover:bg-white/5';
                    let rankLabel = `${idx + 1}`;

                    if (idx === 0) {
                      rankBg = 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-amber-300/30';
                      itemBorder = 'border-amber-500/30 hover:border-amber-400/60 bg-gradient-to-r from-amber-500/30 via-yellow-600/20 to-transparent';
                      rankLabel = '1st';
                    } else if (idx === 1) {
                      rankBg = 'bg-gradient-to-r from-slate-300 to-slate-500 text-slate-950 font-black shadow-lg shadow-slate-400/25 border-slate-200/30';
                      itemBorder = 'border-slate-400/30 hover:border-slate-300/60 bg-gradient-to-r from-slate-400/30 via-slate-500/20 to-transparent';
                      rankLabel = '2nd';
                    } else if (idx === 2) {
                      rankBg = 'bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 font-black shadow-lg shadow-orange-500/25 border-orange-300/30';
                      itemBorder = 'border-orange-500/30 hover:border-orange-400/60 bg-gradient-to-r from-orange-500/30 via-amber-600/20 to-transparent';
                      rankLabel = '3rd';
                    }

                    return (
                      <div
                        key={prod._id || idx}
                        onClick={() => handleProductViewsClick(item)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group cursor-pointer hover:scale-[1.01] shadow-sm ${itemBorder}`}
                      >
                        {/* Rank Badge */}
                        <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-xl text-[10px] font-black border uppercase tracking-wider ${rankBg}`}>
                          {rankLabel}
                        </div>

                        {/* Product Image preview */}
                        {imgUrl ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center shadow-inner p-0.5 group-hover:scale-105 transition-transform duration-300">
                            <img src={imgUrl} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800/80 shrink-0 flex items-center justify-center text-slate-500 border border-white/5 group-hover:scale-105 transition-transform duration-300">
                            <FiBox size={18} />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-white truncate group-hover:text-blue-400 transition-colors leading-snug" title={prod.name || 'Unknown Product'}>
                            {prod.name || 'Unknown Product'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 font-mono">
                            <span className="text-[10px] text-emerald-400 font-extrabold">
                              ₹{(prod.offerPrice && Number(prod.offerPrice) > 0 ? Number(prod.offerPrice) : Number(prod.basePrice || 0)).toLocaleString('en-IN')}
                            </span>
                            {prod.offerPrice && Number(prod.offerPrice) > 0 && Number(prod.offerPrice) < Number(prod.basePrice || 0) && (
                              <span className="text-[9px] text-slate-500 line-through">
                                ₹{(prod.basePrice || 0).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Views counter */}
                        <div className="shrink-0 bg-blue-500/15 text-blue-300 text-xs font-black font-mono px-3 py-1.5 rounded-xl border border-blue-500/30 shadow-xs group-hover:bg-blue-500/25 transition-all">
                          {item.views || 0} views
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Trends Graph Row */}
      {!loading && activityStats && activityStats.trends && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative mt-6">
          {/* Trends Area Chart */}
          <Card className="lg:col-span-2 !p-5 overflow-hidden flex flex-col h-[320px]">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
            <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"></span>
                  User Engagement Analytics
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {trendsRange === '1d' ? 'Hourly activity intervals for the day' :
                    trendsRange === '1m' ? 'Daily activity counts for the last 30 days' :
                      trendsRange === '1y' ? 'Monthly aggregate activity counts' :
                        'Daily aggregate activity and query counts'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-950/40 p-1 rounded-xl border border-white/5">
                  {['1d', '1w', '1m', '1y'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTrendsRange(range)}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${trendsRange === range
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <span className="hidden sm:inline text-[10px] text-slate-500 font-bold uppercase">live insights</span>
              </div>
            </div>

            <div
              className="relative w-full h-[220px] z-10 transition-all duration-200 ease-in-out"
              style={{ opacity: chartOpacity, transform: `scale(${chartOpacity === 0 ? 0.98 : 1})` }}
            >
              <VisxAreaChart labels={activeLabels} data={activeValues} breakdowns={activeBreakdowns} color="#3b82f6" valueSuffix=" actions" />
            </div>
          </Card>

          {/* Top Trending List */}
          <Card className="!p-5 overflow-hidden flex flex-col h-[320px]">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FiTrendingUp className="text-indigo-400" />
                Trending Highlights
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Top active items by date</p>
            </div>

            <div className="relative flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar z-10">
              {trendingHighlights.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-12 italic">
                  No highlight events recorded.
                </div>
              ) : (
                trendingHighlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/10 border border-white/5 hover:border-indigo-500/10 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{item.name}</span>
                      <span className="text-[9px] text-slate-500 font-semibold">{item.type} &bull; {item.date}</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border shrink-0 ${item.type === 'Product' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      item.type === 'Brand' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        item.type === 'Category' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                      {item.count} views
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Area (Analytics Charts Grid) */}
      <div className={`grid ${expandedChart ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6 mt-10 relative z-10 transition-all duration-500`}>
        <SalesRevenueCard
          salesData={salesData}
          chartLabels={chartLabels}
          totalRev={totalRev}
          expandedChart={expandedChart}
          setExpandedChart={setExpandedChart}
        />
        <OrderVolumeCard
          deliveredCountData={deliveredCountData}
          processingCountData={processingCountData}
          cancelledCountData={cancelledCountData}
          chartLabels={chartLabels}
          ordersChartConfig={ordersChartConfig}
          expandedChart={expandedChart}
          setExpandedChart={setExpandedChart}
        />
        <BrandShareCard
          brandShare={brandShare}
          brandShareSorted={brandShareSorted}
          products={products}
          expandedChart={expandedChart}
          setExpandedChart={setExpandedChart}
        />
      </div>

      {/* Device & Search Analytics Section */}
      <div className={`grid ${expandedSecondRowChart ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6 mt-10 relative z-10 transition-all duration-500`}>
        <AppVersionCard
          activityStats={activityStats}
          expandedSecondRowChart={expandedSecondRowChart}
          setExpandedSecondRowChart={setExpandedSecondRowChart}
        />
        <NotificationsCard
          notificationsMetrics={notificationsMetrics}
          expandedSecondRowChart={expandedSecondRowChart}
          setExpandedSecondRowChart={setExpandedSecondRowChart}
          setSelectedNotificationsSegment={setSelectedNotificationsSegment}
          setIsNotificationsModalOpen={setIsNotificationsModalOpen}
        />
        <PriceTierCard
          priceTierEngagementData={priceTierEngagementData}
          expandedSecondRowChart={expandedSecondRowChart}
          setExpandedSecondRowChart={setExpandedSecondRowChart}
        />
      </div>

      {/* Product Views Details Modal */}
      {isProductModalOpen && selectedProductViews && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-linear-to-br from-slate-950 via-slate-900 to-blue-950/95 border border-white/10 shadow-2xl rounded-3xl p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            {(() => {
              const firstImg = selectedProductViews.product?.images?.[0] || '';
              const imgUrl = firstImg.startsWith('http') ? firstImg : (firstImg ? `${BASE_URL}${firstImg.startsWith('/') ? '' : '/'}${firstImg}` : '');
              return (
                <div className="flex justify-between items-start mb-5 relative z-1000">
                  <div className="flex items-center gap-3">
                    {imgUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5 shadow-inner">
                        <img src={imgUrl} alt={selectedProductViews.product.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                        <FiEye size={20} />
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-black text-white tracking-tight leading-snug truncate max-w-[240px]" title={selectedProductViews.product.name}>
                        {selectedProductViews.product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                        <span className="text-emerald-400 font-extrabold">
                          Price: ₹{(selectedProductViews.product.offerPrice && Number(selectedProductViews.product.offerPrice) > 0 ? Number(selectedProductViews.product.offerPrice) : Number(selectedProductViews.product.basePrice || 0)).toLocaleString('en-IN')}
                        </span>
                        {selectedProductViews.product.offerPrice && Number(selectedProductViews.product.offerPrice) > 0 && Number(selectedProductViews.product.offerPrice) < Number(selectedProductViews.product.basePrice || 0) && (
                          <span className="text-slate-500 line-through">
                            ₹{(selectedProductViews.product.basePrice || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsProductModalOpen(false);
                      setSelectedProductViews(null);
                    }}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              );
            })()}

            {/* Total Metric Highlight Banner */}
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 rounded-2xl p-4.5 mb-5 flex justify-between items-center text-xs relative z-10">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Total System Views</span>
              <button
                onClick={() => {
                  setIsProductModalOpen(false);
                  navigate(`/dashboard/details/product-views${getFilterQueryParams()}`);
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-500/25 hover:bg-blue-500/40 text-blue-300 font-black border border-blue-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                {selectedProductViews.totalViews} views &rarr;
              </button>
            </div>

            {/* Scrollable list of user view metrics */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                User View Breakdown ({selectedProductViews.viewsList.length} user{selectedProductViews.viewsList.length !== 1 ? 's' : ''})
              </span>
              {selectedProductViews.viewsList.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6 text-center">No individual user view statistics recorded.</p>
              ) : (
                selectedProductViews.viewsList.map((item, index) => {
                  const u = item.user || {};
                  const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const percent = selectedProductViews.totalViews > 0
                    ? Math.round(((item.count || 0) / selectedProductViews.totalViews) * 100)
                    : 0;

                  return (
                    <div
                      key={u._id || u.email || index}
                      className="flex items-center justify-between bg-transparent backdrop-blur-2xl border border-white/10 p-3 rounded-xl hover:border-white/20 transition-colors animate-in fade-in duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="w-8 h-8 rounded-lg border bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border-white/10 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-white font-extrabold block truncate">{u.name || 'Unknown User'}</span>
                          <span className="text-[9px] text-slate-400 font-mono block truncate select-all">{u.email || '-'}</span>
                          {u.phone && (
                            <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <FiPhone size={8} /> {u.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.count || 0} view{item.count !== 1 ? 's' : ''} ({percent}%)
                        </span>
                        {item.latestView && (
                          <span className="text-[9px] text-slate-500 font-medium mt-1 font-mono">
                            {formatActivityTime(item.latestView)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                setIsProductModalOpen(false);
                setSelectedProductViews(null);
              }}
              className="w-full mt-6 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              Close Details
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Push Alerts Permissions Modal */}
      {isNotificationsModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-linear-to-br from-slate-950 via-slate-900 to-blue-950/95 border border-white/10 shadow-2xl rounded-3xl p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            <div className="flex justify-between items-start mb-5 relative z-1000">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${selectedNotificationsSegment === 'Enabled'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : selectedNotificationsSegment === 'Disabled'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-blue-500/20 text-blue-400'
                  }`}>
                  <FiBell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight leading-snug">
                    Push Notification Users
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    Showing {selectedNotificationsSegment} notifications ({filteredNotificationsUsers.length} user{filteredNotificationsUsers.length !== 1 ? 's' : ''})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsNotificationsModalOpen(false);
                  setNotificationsSearchQuery('');
                }}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4 z-10">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <FiSearch size={14} />
              </span>
              <input
                type="text"
                value={notificationsSearchQuery}
                onChange={(e) => setNotificationsSearchQuery(e.target.value)}
                placeholder="Search by name, email or phone..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950/40 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:outline-hidden text-xs text-white placeholder-slate-500 rounded-xl transition-all"
              />
              {notificationsSearchQuery && (
                <button
                  onClick={() => setNotificationsSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>

            {/* Scrollable list of users */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
              {filteredNotificationsUsers.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-8 text-center">No matching users found.</p>
              ) : (
                filteredNotificationsUsers.map((u, index) => {
                  const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const isEnabled = u.notificationsEnabled === true || (Array.isArray(u.devices) && u.devices.some(d => d.notificationsEnabled === true));

                  // Collect devices list to show
                  const devicesList = Array.isArray(u.devices) ? u.devices.map(d => d.deviceModel || d.devicePlatform).filter(Boolean) : [];
                  const deviceText = devicesList.length > 0 ? devicesList.join(', ') : '';

                  return (
                    <div
                      key={u._id || u.email || index}
                      className="flex items-center justify-between bg-transparent backdrop-blur-2xl border border-white/10 p-3 rounded-xl hover:border-white/20 transition-colors animate-in fade-in duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className={`w-8 h-8 rounded-lg border text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner ${isEnabled
                          ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border-emerald-500/20'
                          : 'bg-gradient-to-tr from-rose-500/20 to-pink-500/20 border-rose-500/20'
                          }`}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-white font-extrabold block truncate">{u.name || 'Unknown User'}</span>
                          <span className="text-[9px] text-slate-400 font-mono block truncate select-all">{u.email || '-'}</span>
                          {deviceText && (
                            <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                              Device: {deviceText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                setIsNotificationsModalOpen(false);
                setNotificationsSearchQuery('');
              }}
              className="w-full mt-6 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              Close Details
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;