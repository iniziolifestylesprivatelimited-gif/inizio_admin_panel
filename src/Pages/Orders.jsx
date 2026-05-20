import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BASE_URL } from '../api/axios';
import { FiBox, FiLoader, FiAlertCircle, FiChevronDown, FiCalendar, FiEye, FiX, FiMapPin, FiCreditCard, FiUser, FiPhone, FiMail } from 'react-icons/fi';
import CustomDropdown from '../Components/CustomDropdown';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.get(`${BASE_URL}/api/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // API returns an array, or an object with an array field (handling both safely)
      const fetchedOrders = Array.isArray(response.data) ? response.data : response.data.orders || [];
      // Sort by latest orders first
      setOrders(fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load orders.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      const token = sessionStorage.getItem('accessToken');
      const response = await axios.put(
        `${BASE_URL}/api/orders/${orderId}/status`,
        { orderStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
        // console.log(newStatus)

      // Update local state with the returned updated order
      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, orderStatus: response.data.orderStatus || newStatus } : order
      ));
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update order status. Please try again.');
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
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30'; // For 'Pending' and others
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = orders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

//   console.log(orders);
  
  return (
    <div className="relative space-y-6 min-h-full z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiBox className="text-blue-400" /> Orders Management
          </h1>
          <p className="text-slate-400 font-medium mt-1">View and manage customer order fulfillment statuses.</p>
        </div>
      </div>

      {loading && (
        <div className="h-64 flex flex-col justify-center items-center bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl">
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
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl md:rounded-3xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar touch-pan-x">
            <table className="w-full text-left border-collapse min-w-200">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3 pl-6 w-16">S.No</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-center">Details</th>
                  <th className="p-4 pr-6">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentOrders.map((order, index) => (
                  <tr key={order._id} className="hover:bg-white/5 transition-colors group align-middle">
                    <td className="p-3 pl-6 text-sm text-slate-400 font-medium">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="p-4 font-mono text-sm text-blue-300 font-medium" title={order._id}>
                      #{order._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-slate-500 shrink-0" />
                        {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                        {order.items && order.items[0]?.product?.images && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/5">
                            <img src={order.items[0].product.images[0]} alt="Product" className="w-full h-full object-cover bg-white" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-200 font-medium line-clamp-1 max-w-37.5" title={order.items?.[0]?.product?.name}>
                            {order.items?.[0]?.product?.name || 'Product'}
                          </span>
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${order.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                          {order.paymentStatus || 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-center">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-white rounded-lg transition-colors border border-blue-500/20 cursor-pointer mx-auto block"
                        title="View Full Details"
                      >
                        <FiEye className="text-lg" />
                      </button>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="relative inline-block w-full min-w-35">
                        {updatingId === order._id ? (
                          <div className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 bg-black/20 border border-white/5 rounded-lg w-full">
                            <FiLoader className="animate-spin" /> Updating
                          </div>
                        ) : (
                          <CustomDropdown
                            value={order.orderStatus || 'Pending'}
                            onChange={(newStatus) => handleStatusChange(order._id, newStatus)}
                            options={['Processing', 'Shipped', 'Delivered', 'Cancelled']}
                            statusColor={getStatusColor(order.orderStatus)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="p-16 flex flex-col items-center justify-center text-slate-500">
                <FiBox className="text-5xl mb-4 opacity-50" />
                <p className="text-lg font-medium text-slate-400">No orders found.</p>
                <p className="text-sm mt-1">Orders placed by customers will appear here.</p>
              </div>
            )}
          </div>

          {orders.length > itemsPerPage && (
            <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20">
              <span className="text-sm text-slate-400 text-center sm:text-left">
                Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, orders.length)}</span> of <span className="font-bold text-white">{orders.length}</span> orders
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-white/10"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-white/10"
                >
                  Next
                </button>
              </div>
            </div>
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
                <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 text-sm font-bold ${getStatusColor(selectedOrder.orderStatus)}`}>
                  Status: {selectedOrder.orderStatus || 'Pending'}
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
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-4">
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

              </div>

              {/* Order Items */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FiBox className="text-purple-400" /> Purchased Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex flex-col gap-3 flex-1 min-w-0">
                        <div className="min-w-0">
                          <p className="font-bold text-white line-clamp-2">{item.product?.name || 'Unknown Product'}</p>
                          <p className="text-xs text-slate-400 mt-1">Quantity: <span className="font-bold text-white">{item.quantity}</span></p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.product?.images?.length > 0 ? (
                            item.product.images.map((img, imgIdx) => (
                              <div key={imgIdx} className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/10 flex items-center justify-center">
                                <img src={img} alt={`Product ${imgIdx + 1}`} className="w-full h-full object-cover bg-white" />
                              </div>
                            ))
                          ) : (
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/10 flex items-center justify-center">
                              <FiBox className="text-xl text-slate-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-xs text-slate-400">Price/Unit</p>
                        <p className="font-bold text-emerald-400">₹{(item.product?.basePrice || 0).toLocaleString('en-IN')}</p>
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

            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default Orders;