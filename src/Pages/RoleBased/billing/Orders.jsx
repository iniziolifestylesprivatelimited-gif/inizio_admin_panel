import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BASE_URL, api } from '../api/axios';
import { 
  FiBox, FiLoader, FiAlertCircle, FiChevronDown, FiCalendar, 
  FiX, FiMapPin, FiCreditCard, FiUser, FiPhone, FiMail, 
  FiFileText, FiUpload, FiDownload, FiCheckCircle, FiTrash2, FiInfo, FiRefreshCcw, FiCheck,
  FiTruck
} from 'react-icons/fi';
import CustomDropdown from '../../../Components/CustomDropdown';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../../utils/dateUtils';
import { useOutletContext } from 'react-router-dom';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const Orders = ({ defaultStatus = 'all' }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  
  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  // Shipping details state for 'Shipped' status
  const [shippingInputOpen, setShippingInputOpen] = useState(false);
  const [awbNumberText, setAwbNumberText] = useState('');
  const [courierNameText, setCourierNameText] = useState('');

  // Tracking details state
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Delivered tab configuration
  const [activeDeliveredTab, setActiveDeliveredTab] = useState('orders'); // 'orders' or 'returns'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'pending'
  
  // Return requests state
  const [returnsList, setReturnsList] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [errorReturns, setErrorReturns] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [rejectionInputOpen, setRejectionInputOpen] = useState(false);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [currentReturnsPage, setCurrentReturnsPage] = useState(1);
  const itemsPerPage = 10;

  const { setOrdersUnreadCount } = useOutletContext() || {};

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedOrders = Array.isArray(response.data) ? response.data : response.data.orders || [];
      // Sort latest first
      setOrders(fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      
      if (setOrdersUnreadCount) {
        setOrdersUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoadingReturns(true);
      setErrorReturns('');
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/returns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedReturns = Array.isArray(response.data) ? response.data : response.data.returns || [];
      setReturnsList(fetchedReturns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error(err);
      setErrorReturns('Failed to load return requests.');
    } finally {
      setLoadingReturns(false);
    }
  };

  // console.log(returnsList)

  useEffect(() => {
    setCurrentPage(1);
    setCurrentReturnsPage(1);
    fetchOrders();
    if (defaultStatus === 'delivered') {
      fetchReturns();
    }
  }, [defaultStatus]);

  const fetchTrackingInfo = async (orderId) => {
    try {
      setLoadingTracking(true);
      setTrackingError('');
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/orders/${orderId}/track`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrackingData(response.data);
    } catch (err) {
      console.error('Failed to fetch tracking data', err);
      setTrackingError('Failed to fetch live tracking details.');
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus, shippingInfo = {}) => {
    try {
      setUpdatingId(orderId);
      const token = sessionStorage.getItem('accessToken');
      const payload = { 
        orderStatus: newStatus,
        ...shippingInfo
      };
      const response = await axios.put(
        `${BASE_URL}/api/orders/${orderId}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedOrder = response.data.order || response.data;

      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, ...updatedOrder } : order
      ));

      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, ...updatedOrder }));
        if (updatedOrder.awbNumber) {
          fetchTrackingInfo(orderId);
        }
      }
      setShippingInputOpen(false);
    } catch (err) {
      console.error('Failed to update status', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update order status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReturnStatusChange = async (returnId, newStatus, rejectionReason = '') => {
    try {
      setUpdatingId(returnId);
      const token = sessionStorage.getItem('accessToken');
      const payload = { status: newStatus };
      if (newStatus === 'Rejected' && rejectionReason) {
        payload.rejectionReason = rejectionReason;
      }
      
      const response = await axios.put(
        `${BASE_URL}/api/returns/${returnId}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = response.data.return || response.data;
      setReturnsList(returnsList.map(item =>
        (item._id === returnId || item.id === returnId) ? { ...item, status: updated.status || newStatus, rejectionReason: updated.rejectionReason || rejectionReason } : item
      ));

      if (selectedReturn && (selectedReturn._id === returnId || selectedReturn.id === returnId)) {
        setSelectedReturn({ ...selectedReturn, status: updated.status || newStatus, rejectionReason: updated.rejectionReason || rejectionReason });
      }

      setRejectionInputOpen(false);
      setRejectionReasonText('');
      alert(`Return status successfully set to: ${newStatus}`);
    } catch (err) {
      console.error('Failed to update return status:', err);
      alert(err.response?.data?.message || 'Failed to update return status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'shipped': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const getReturnStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'approved': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'requested': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30'; // Pending/Requested
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
    setTrackingData(null);
    setTrackingError('');
    if (order.awbNumber) {
      fetchTrackingInfo(order._id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setShippingInputOpen(false);
    setAwbNumberText('');
    setCourierNameText('');
    setTrackingData(null);
    setTrackingError('');
  };

  const closeReturnModal = () => {
    setIsReturnModalOpen(false);
    setSelectedReturn(null);
    setRejectionInputOpen(false);
    setRejectionReasonText('');
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }

    setIsUploadingInvoice(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('invoice', file);
      const response = await axios.post(
        `${BASE_URL}/api/admin/orders/${selectedOrder._id}/invoice`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const updatedInvoiceUrl = response.data.invoiceUrl;

      // Update states
      setSelectedOrder({ ...selectedOrder, invoiceUrl: updatedInvoiceUrl });
      setOrders(orders.map(order => 
        order._id === selectedOrder._id ? { ...order, invoiceUrl: updatedInvoiceUrl } : order
      ));

      alert('✅ Invoice uploaded & email sent successfully');
    } catch (err) {
      console.error('Invoice upload failed', err);
      alert(`Error: ${err.response?.data?.message || 'Failed to upload invoice.'}`);
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  // Filter orders according to sub-menu state and payment status
  const filteredOrders = orders.filter(order => {
    // 1. Filter by orderStatus
    if (defaultStatus !== 'all') {
      if (order.orderStatus?.toLowerCase() !== defaultStatus.toLowerCase()) return false;
    }
    
    // 2. Filter by paymentStatus
    if (paymentFilter === 'paid') {
      return order.paymentStatus?.toLowerCase() === 'paid';
    }
    if (paymentFilter === 'pending') {
      return order.paymentStatus?.toLowerCase() !== 'paid';
    }
    
    return true;
  });

  const handlePaymentFilterChange = (filter) => {
    setPaymentFilter(filter);
    setCurrentPage(1);
  };

  // Pagination for orders
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Pagination for returns
  const indexOfLastReturn = currentReturnsPage * itemsPerPage;
  const indexOfFirstReturn = indexOfLastReturn - itemsPerPage;
  const currentReturns = returnsList.slice(indexOfFirstReturn, indexOfLastReturn);
  const totalReturnsPages = Math.ceil(returnsList.length / itemsPerPage);

  return (
    <div className="relative space-y-4 min-h-full z-0">


      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiBox className="text-blue-400" /> 
            {defaultStatus === 'all' && 'All Orders'}
            {defaultStatus === 'processing' && 'Processing Orders'}
            {defaultStatus === 'shipped' && 'Shipped Orders'}
            {defaultStatus === 'cancelled' && 'Cancelled Orders'}
            {defaultStatus === 'delivered' && 'Delivered & Returns'}
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            {defaultStatus === 'delivered' 
              ? 'Review finished customer orders and process user product return logs.' 
              : 'View and manage customer order fulfillment statuses.'}
          </p>
        </div>
      </div>

      {loading && (
        <div className="h-64 flex flex-col justify-center items-center bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400">Loading orders...</p>
        </div>
      )}

      {error && (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full">
          
          {/* Delivered Tab Header Switching Section */}
          {defaultStatus === 'delivered' && (
            <div className="flex border-b border-white/10 px-6 py-4 bg-slate-900/40 gap-6">
              <button
                onClick={() => setActiveDeliveredTab('orders')}
                className={`pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeDeliveredTab === 'orders' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Delivered Orders ({filteredOrders.length})
              </button>
              <button
                onClick={() => setActiveDeliveredTab('returns')}
                className={`pb-2 text-sm font-bold border-b-2 transition-colors relative cursor-pointer ${activeDeliveredTab === 'returns' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Return Requests ({returnsList.length})
                {returnsList.filter(r => r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'requested').length > 0 && (
                  <span className="absolute -top-1 -right-3 w-2 h-2 rounded-full bg-red-500"></span>
                )}
              </button>
            </div>
          )}

          {/* Payment Status Filter Switching Section */}
          {(defaultStatus !== 'delivered' || activeDeliveredTab === 'orders') && (
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-b border-white/10 bg-slate-900/20">
              <div className="flex bg-slate-950/40 p-1 rounded-xl border border-white/5 w-fit">
                {[
                  { id: 'all', label: 'All Payments' },
                  { id: 'paid', label: 'Paid Only' },
                  { id: 'pending', label: 'Pending Only' }
                ].map((tab) => {
                  const count = orders.filter(order => {
                    if (defaultStatus !== 'all' && order.orderStatus?.toLowerCase() !== defaultStatus.toLowerCase()) return false;
                    if (tab.id === 'paid') return order.paymentStatus?.toLowerCase() === 'paid';
                    if (tab.id === 'pending') return order.paymentStatus?.toLowerCase() !== 'paid';
                    return true;
                  }).length;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handlePaymentFilterChange(tab.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        paymentFilter === tab.id
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {tab.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DELIVERED ORDERS VIEW TAB OR OTHER VIEWS */}
          {(defaultStatus !== 'delivered' || activeDeliveredTab === 'orders') ? (
            <>
              <div className="overflow-auto custom-scrollbar max-h-[70vh]">
                <table className="w-full text-left border-collapse min-w-200">
                  <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                    <tr className="border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-2 pl-6 w-16">S.No</th>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4 pr-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {currentOrders.map((order, index) => (
                      <tr 
                        key={order._id} 
                        onClick={() => handleViewDetails(order)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors group align-middle"
                      >
                        <td className="p-3 pl-6 text-sm text-slate-400 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="p-4 font-mono text-sm text-blue-300 font-medium" title={order._id}>
                          <div className="flex flex-col">
                            <span>{order._id}</span>
                            {order.invoiceUrl && (
                              <span className="text-[10px] text-emerald-400 font-sans mt-0.5 flex items-center gap-1">
                                <FiFileText className="shrink-0" /> Invoiced
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="text-slate-500 shrink-0" />
                            {formatDateDDMMYYYY(order.createdAt)}
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-slate-200 font-medium capitalize line-clamp-1">{order.address?.name || 'Unknown Customer'}</span>
                            <span className="text-slate-400 text-xs tracking-wider">{order.address?.phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-3">
                            {order.items && (order.items[0]?.image || order.items[0]?.variant?.images?.[0] || order.items[0]?.product?.images?.[0]) && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/5">
                                <img src={order.items[0].image || order.items[0].variant?.images?.[0] || order.items[0].product?.images?.[0]} alt="Product" className="w-full h-full object-cover bg-white" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-slate-200 font-medium line-clamp-1 max-w-37.5" title={order.items?.[0]?.product?.name || order.items?.[0]?.name}>
                                {order.items?.[0]?.product?.name || order.items?.[0]?.name || 'Product'}
                              </span>
                              {order.items?.[0]?.variant?.name && (
                                <span className="text-amber-400 text-xs mt-0.5 line-clamp-1" title={order.items[0].variant.name}>
                                  Variant: {order.items[0].variant.name}
                                </span>
                              )}
                              <span className="text-xs text-slate-400 mt-0.5">
                                {order.items?.length > 1 ? `+ ${order.items.length - 1} more item(s)` : `Qty: ${order.items?.[0]?.quantity || 1}`}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-bold text-emerald-400">
                          ₹{order.totalAmount?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className="text-slate-200 font-medium">{order.paymentMethod}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${order.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {order.paymentStatus || 'Pending'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 pr-6">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(order.orderStatus)}`}>
                            {order.orderStatus || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredOrders.length === 0 && (
                  <div className="p-16 flex flex-col items-center justify-center text-slate-500">
                    <FiBox className="text-5xl mb-4 opacity-50" />
                    <p className="text-lg font-medium text-slate-400">No orders found.</p>
                    <p className="text-sm mt-1">Orders placed under this category status will appear here.</p>
                  </div>
                )}
              </div>

              {filteredOrders.length > itemsPerPage && (
                <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20">
                  <span className="text-sm text-slate-400 text-center sm:text-left">
                    Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, filteredOrders.length)}</span> of <span className="font-bold text-white">{filteredOrders.length}</span> orders
                  </span>
                  <div className="flex space-x-2 w-full sm:w-auto justify-center sm:justify-end">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-transparent hover:bg-white/10 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-white/10"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1 mx-1 sm:mx-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 items-center">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                            page === currentPage
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="px-4 py-2 bg-transparent hover:bg-white/10 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-white/10"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* RETURNS LOG VIEW TAB */
            <>
              <div className="overflow-auto custom-scrollbar max-h-[70vh]">
                {loadingReturns ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <FiLoader className="animate-spin text-3xl mb-3 text-blue-400" />
                    <span>Loading return requests...</span>
                  </div>
                ) : errorReturns ? (
                  <div className="p-6 text-red-400 bg-red-950/20 border-b border-white/10 flex items-center gap-2">
                    <FiAlertCircle /> {errorReturns}
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-collapse min-w-200">
                      <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                        <tr className="border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-2 pl-6 w-16">S.No</th>
                          <th className="p-4">Return ID</th>
                          {/* <th className="p-4">Order ID</th> */}
                          <th className="p-4">Customer</th>
                          <th className="p-4">Reason</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-transparent">
                        {currentReturns.map((ret, index) => {
                          const returnId = ret._id || ret.id;
                          const orderId = ret.order?._id || ret.orderId || 'N/A';
                          const returnReason = ret.items?.[0]?.reason || ret.reason || 'No reason provided';
                          
                          return (
                            <tr 
                              key={returnId} 
                              onClick={() => { setSelectedReturn(ret); setIsReturnModalOpen(true); }}
                              className="hover:bg-white/[0.02] cursor-pointer transition-colors group align-middle"
                            >
                              <td className="p-3 pl-6 text-sm text-slate-400 font-medium">
                                {(currentReturnsPage - 1) * itemsPerPage + index + 1}
                              </td>
                              <td className="p-4 font-mono text-sm text-blue-300 font-medium">
                                {returnId}
                              </td>
                              {/* <td className="p-4 font-mono text-sm text-slate-400">
                                {orderId}
                              </td> */}
                              <td className="p-4 text-sm">
                                <div className="flex flex-col">
                                  <span className="text-slate-200 font-medium capitalize">{ret.user?.name || 'N/A'}</span>
                                  <span className="text-slate-500 text-xs mt-0.5">{ret.user?.email || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-slate-300 truncate max-w-50" title={returnReason}>
                                {returnReason}
                              </td>
                              <td className="p-4 text-sm">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getReturnStatusColor(ret.status)}`}>
                                  {ret.status || 'Pending'}
                                </span>
                              </td>
                              <td className="p-4 pr-6 text-right space-x-2">
                                <span className="text-xs text-slate-500 italic">No actions available</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {returnsList.length === 0 && (
                      <div className="p-16 flex flex-col items-center justify-center text-slate-500">
                        <FiRefreshCcw className="text-5xl mb-4 opacity-50" />
                        <p className="text-lg font-medium text-slate-400">No return requests found.</p>
                        <p className="text-sm mt-1">Return request tickets raised by clients will appear here.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {returnsList.length > itemsPerPage && (
                <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20">
                  <span className="text-sm text-slate-400 text-center sm:text-left">
                    Showing <span className="font-bold text-white">{indexOfFirstReturn + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastReturn, returnsList.length)}</span> of <span className="font-bold text-white">{returnsList.length}</span> tickets
                  </span>
                  <div className="flex space-x-2 w-full sm:w-auto justify-center sm:justify-end">
                    <button
                      onClick={() => setCurrentReturnsPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentReturnsPage === 1}
                      className="px-4 py-2 bg-transparent hover:bg-white/10 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-white/10"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1 mx-1 sm:mx-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 items-center">
                      {Array.from({ length: totalReturnsPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentReturnsPage(page)}
                          className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                            page === currentReturnsPage
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentReturnsPage(prev => Math.min(prev + 1, totalReturnsPages))}
                      disabled={currentReturnsPage === totalReturnsPages || totalReturnsPages === 0}
                      className="px-4 py-2 bg-transparent hover:bg-white/10 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-white/10"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {isModalOpen && selectedOrder && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeModal}></div>
          
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-5xl h-[90vh] md:h-[85vh] max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50 shrink-0">
              <div>
                <h3 className="font-bold text-white text-xl flex items-center gap-2">
                  <FiBox className="text-blue-400" />
                  Order Details
                </h3>
                <p className="text-sm font-mono text-slate-400 mt-1">#{selectedOrder._id}</p>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors cursor-pointer">
                <FiX className="text-2xl" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto w-full flex-1 custom-scrollbar p-4 sm:p-6 space-y-6 bg-black/20">
              
              {/* Quick Info Badges */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-slate-800 border border-white/5 rounded-xl flex items-center gap-2 text-sm">
                  <FiCalendar className="text-slate-400" />
                  <span className="text-slate-200">Date:</span>
                  <span className="font-bold text-white">{new Date(selectedOrder.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm font-medium">Status:</span>
                  <div className="relative">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(selectedOrder.orderStatus)}`}>
                      {selectedOrder.orderStatus || 'Pending'}
                    </span>
                  </div>
                </div>


                {selectedOrder.deliveredAt && (
                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-sm">
                    <FiCalendar className="text-emerald-400" />
                    <span className="text-emerald-200">Delivered:</span>
                    <span className="font-bold text-emerald-400">{new Date(selectedOrder.deliveredAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                )}
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Customer Details */}
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FiUser className="text-blue-400" /> Customer Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="block text-xs text-slate-500 mb-0.5">Name</span>
                      <span className="font-medium text-white capitalize">{selectedOrder.user?.name || selectedOrder.address?.name || 'N/A'}</span>
                    </div>
                    {selectedOrder.user?.email && (
                      <div>
                        <span className="block text-xs text-slate-500 mb-0.5">Email</span>
                        <span className="font-medium text-white flex items-center gap-1.5"><FiMail className="text-slate-400" /> {selectedOrder.user.email}</span>
                      </div>
                    )}
                    <div>
                      <span className="block text-xs text-slate-500 mb-0.5">Phone</span>
                      <span className="font-medium text-white flex items-center gap-1.5"><FiPhone className="text-slate-400"/> {selectedOrder.address?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FiMapPin className="text-emerald-400" /> Shipping Address
                    </h4>
                    <div className="text-sm text-slate-300 leading-relaxed">
                      <p className="font-medium text-white mb-1">{selectedOrder.address?.addressLine1 || 'N/A'}</p>
                      {selectedOrder.address?.addressLine2 && <p>{selectedOrder.address.addressLine2}</p>}
                      <p>{selectedOrder.address?.city}, {selectedOrder.address?.state}</p>
                      <p>{selectedOrder.address?.country} - <span className="font-mono text-slate-400">{selectedOrder.address?.pincode}</span></p>
                    </div>
                  </div>
                  
                  {(selectedOrder.awbNumber || selectedOrder.courierName) && (
                    <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FiBox className="text-purple-400" /> Tracking & Delivery
                      </h5>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="block text-slate-500">Courier Partner</span>
                          <span className="font-semibold text-slate-200">{selectedOrder.courierName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">AWB Tracking No.</span>
                          <span className="font-semibold text-slate-200 font-mono select-all">{selectedOrder.awbNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Shipment Tracking Timeline */}
              {selectedOrder.awbNumber && (
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FiTruck className="text-blue-400" /> Shipment Tracking Details
                  </h4>
                  
                  {loadingTracking ? (
                    <div className="py-6 flex flex-col justify-center items-center">
                      <FiLoader className="animate-spin text-2xl text-blue-400 mb-2" />
                      <span className="text-xs text-slate-400">Fetching live tracking information...</span>
                    </div>
                  ) : trackingError ? (
                    <div className="text-red-400 bg-red-900/10 p-3 rounded-xl border border-red-500/20 text-xs flex items-center gap-2">
                      <FiAlertCircle /> {trackingError}
                    </div>
                  ) : trackingData ? (
                    <div className="space-y-4">
                      {/* Tracking Meta */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-black/25 p-4 rounded-xl border border-white/5 text-sm">
                        <div>
                          <span className="block text-xs text-slate-500 mb-0.5">Courier Status</span>
                          <span className="font-bold text-white capitalize">{trackingData.status || 'In Transit'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-500 mb-0.5">Expected Delivery</span>
                          <span className="font-bold text-white">
                            {trackingData.expectedDeliveryDate 
                              ? formatDateDDMMYYYY(trackingData.expectedDeliveryDate) 
                              : 'Pending Courier Update'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-500 mb-0.5">Awb Number</span>
                          <span className="font-mono font-bold text-blue-300">{trackingData.awbNumber}</span>
                        </div>
                      </div>

                      {/* Activities Timeline */}
                      {trackingData.activities && trackingData.activities.length > 0 ? (
                        <div className="relative pl-6 border-l-2 border-slate-700/60 space-y-6 ml-3 py-2">
                          {trackingData.activities.map((act, i) => (
                            <div key={i} className="relative">
                              {/* Timeline dot */}
                              <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-slate-900 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              </span>
                              <div className="text-sm">
                                <p className="font-bold text-white">{act.activity}</p>
                                <div className="flex flex-wrap gap-x-4 text-xs text-slate-400 mt-1">
                                  {act.location && (
                                    <span>Location: <strong className="text-slate-300">{act.location}</strong></span>
                                  )}
                                  <span>Time: <strong className="text-slate-300">{new Date(act.timestamp).toLocaleString()}</strong></span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic pl-1">No shipment tracking history recorded yet.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic pl-1">No tracking details returned.</p>
                  )}
                </div>
              )}

              {/* Order Items */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FiBox className="text-purple-400" /> Purchased Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 justify-between p-4 bg-transparent rounded-xl border border-white/5">
                      <div className="flex flex-col gap-3 flex-1 min-w-0">
                        <div className="min-w-0">
                          <p className="font-bold text-white line-clamp-2">
                            {item.product?.name || item.name || 'Unknown Product'}
                            {item.variant?.name && <span className="text-amber-400 ml-2 text-sm">({item.variant.name})</span>}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Quantity: <span className="font-bold text-white">{item.quantity}</span></p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const displayImages = item.variant?.images?.length > 0 
                              ? item.variant.images 
                              : item.product?.images?.length > 0 
                                ? item.product.images 
                                : item.image 
                                  ? [item.image] 
                                  : [];
                            
                            return displayImages.length > 0 ? (
                              displayImages.map((img, imgIdx) => (
                                <div key={imgIdx} className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/10 flex items-center justify-center">
                                  <img src={img} alt={`Product ${imgIdx + 1}`} className="w-full h-full object-cover bg-white" />
                                </div>
                              ))
                            ) : (
                              <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/10 flex items-center justify-center">
                                <FiBox className="text-xl text-slate-500" />
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-xs text-slate-400">Price/Unit</p>
                        <p className="font-bold text-emerald-400">₹{(item.price || item.variant?.offerPrice || item.variant?.price || item.product?.basePrice || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FiCreditCard className="text-amber-400" /> Payment Summary
                </h4>
                <div className="flex flex-wrap md:flex-nowrap justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Payment Method</span>
                      <span className="font-bold text-white">{selectedOrder.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Payment Status</span>
                      <span className={`font-bold ${selectedOrder.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedOrder.paymentStatus || 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Paid Amount</span>
                      <span className="font-bold text-white">₹{(selectedOrder.paidAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {selectedOrder.remainingAmount !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Remaining Amount</span>
                        <span className="font-bold text-white">₹{selectedOrder.remainingAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full h-px md:w-px md:h-auto bg-white/10 shrink-0"></div>
                  
                  <div className="flex-1 flex flex-col justify-center items-end bg-black/20 p-4 rounded-xl border border-white/5">
                    <span className="text-sm text-slate-400 mb-1">Total Order Amount</span>
                    <span className="text-3xl font-black text-emerald-400">₹{(selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Section */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FiFileText className="text-blue-400" /> Invoice Management
                </h4>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex-1 space-y-1">
                    {selectedOrder.invoiceUrl ? (
                      <div>
                        <span className="text-emerald-400 text-sm font-medium flex items-center gap-1.5">
                          <FiCheckCircle /> Invoice is ready & sent to customer
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          You can download the invoice or upload a new one to overwrite it.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-amber-400 text-sm font-medium flex items-center gap-1.5">
                          <FiAlertCircle /> No Invoice Uploaded
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          Upload the invoice (PDF) to attach it to the order and notify the customer via email.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-end">
                    {selectedOrder.invoiceUrl && (
                      <a
                        href={getImageUrl(selectedOrder.invoiceUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors text-sm font-medium border border-emerald-500/20 flex items-center gap-2 cursor-pointer"
                      >
                        <FiDownload /> Download Invoice
                      </a>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      , document.body)}

      {/* RETURN DETAILS MODAL */}
      {isReturnModalOpen && selectedReturn && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeReturnModal}></div>
          
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 sm:py-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50 shrink-0">
              <div>
                <h3 className="font-bold text-white text-xl flex items-center gap-2">
                  <FiRefreshCcw className="text-blue-400" />
                  Return Request Ticket
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-1">Ticket ID: {selectedReturn._id || selectedReturn.id}</p>
              </div>
              <button onClick={closeReturnModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors cursor-pointer">
                <FiX className="text-2xl" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto w-full flex-1 custom-scrollbar p-6 space-y-6 bg-black/20">
              {/* Status Indicator */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-slate-800 border border-white/5 rounded-xl flex items-center gap-2 text-sm">
                  <FiCalendar className="text-slate-400" />
                  <span className="text-slate-200">Request Date:</span>
                  <span className="font-bold text-white">{selectedReturn.createdAt ? new Date(selectedReturn.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                {selectedReturn.status && (
                  <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 text-sm font-bold ${getReturnStatusColor(selectedReturn.status)}`}>
                    Status: {selectedReturn.status}
                  </div>
                )}
                {(selectedReturn.orderId || selectedReturn.order?._id) && (
                  <div className="px-4 py-2 bg-slate-800 border border-white/5 rounded-xl flex items-center gap-2 text-sm">
                    <FiBox className="text-slate-400" />
                    <span className="text-slate-200">Order Ref:</span>
                    <span className="font-bold text-white font-mono">#{selectedReturn.order?._id || selectedReturn.orderId}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FiUser className="text-blue-400" /> Customer Contact
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="block text-xs text-slate-500">Name</span>
                      <span className="font-medium text-white capitalize">{selectedReturn.user?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">Email</span>
                      <span className="font-medium text-white">{selectedReturn.user?.email || 'N/A'}</span>
                    </div>
                    {selectedReturn.user?.phone && (
                      <div>
                        <span className="block text-xs text-slate-500">Phone</span>
                        <span className="font-medium text-white">{selectedReturn.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason Info */}
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <FiInfo className="text-amber-400" /> Reason for Return
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed italic bg-black/25 p-3 rounded-xl border border-white/5">
                      "{selectedReturn.items?.[0]?.reason || selectedReturn.reason || 'No description provided.'}"
                    </p>
                  </div>
                  {selectedReturn.rejectionReason && (
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Rejection Remarks</span>
                      <p className="text-xs text-red-300 leading-relaxed bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                        {selectedReturn.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiBox className="text-purple-400" /> Return Items ({selectedReturn.items.length})
                  </h4>
                  <div className="space-y-4">
                    {selectedReturn.items.map((item, idx) => {
                      const productName = item.product?.name || item.name || 'Unknown Product';
                      const productImg = item.product?.images?.[0] || item.image || '';
                      
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row gap-4 justify-between p-4 bg-transparent rounded-xl border border-white/5">
                          <div className="flex gap-4 items-start flex-1 min-w-0">
                            {productImg ? (
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 border border-white/5 shrink-0">
                                <img src={getImageUrl(productImg)} alt={productName} className="w-full h-full object-cover bg-white" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-white/5 shrink-0 flex items-center justify-center">
                                <FiBox className="text-xl text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0 space-y-1">
                              <p className="font-bold text-white truncate">{productName}</p>
                              <p className="text-xs text-slate-400">Returned Qty: <span className="font-bold text-white">{item.quantity || 1}</span></p>
                              {item.reason && <p className="text-xs text-amber-400">Reason: <span className="text-slate-300 font-medium">{item.reason}</span></p>}
                              {item.note && <p className="text-xs text-slate-400 italic">Note: "{item.note}"</p>}
                            </div>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <p className="text-xs text-slate-400">Total Price Value</p>
                            <p className="font-bold text-emerald-400">₹{(item.price || item.product?.basePrice || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


            </div>

            {/* Footer / Actions */}
            <div className="px-6 py-4 border-t border-white/10 flex flex-wrap gap-2 justify-between bg-slate-800/30 shrink-0">
              <button 
                onClick={closeReturnModal}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
              >
                Close
              </button>


            </div>

          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default Orders;