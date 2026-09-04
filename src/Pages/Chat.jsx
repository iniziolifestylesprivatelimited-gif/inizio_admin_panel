import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FiSearch, FiSend, FiPaperclip, FiMoreVertical, FiPhone, FiVideo,
  FiSmile, FiInfo, FiArrowLeft, FiCheck, FiCornerUpLeft, FiEdit2,
  FiTrash2, FiX, FiFileText, FiDownload, FiLoader, FiAlertCircle,
  FiShoppingCart, FiSmartphone, FiUser, FiShoppingBag, FiActivity, FiEye,
  FiPackage, FiAtSign, FiMessageSquare
} from 'react-icons/fi';
import { RiCheckDoubleFill } from "react-icons/ri";
import { api, BASE_URL } from '../api/axios';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { useOutletContext } from 'react-router-dom';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const getFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  const serverUrl = BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const isImageFile = (fileType, fileName, fileUrl) => {
  if (fileType?.startsWith('image/')) return true;
  const name = fileName || fileUrl || '';
  const ext = name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
};

const formatDividerDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return formatDateDDMMYYYY(date);
  }
};

const formatLastMessageDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return formatDateDDMMYYYY(date);
  }
};

const Chat = () => {
  const [activeContact, setActiveContact] = useState(null);
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const [activeCustomerDetails, setActiveCustomerDetails] = useState(null);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);
  const [customerLedgers, setCustomerLedgers] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [lastMessageSenders, setLastMessageSenders] = useState({}); // { userId: { isMe, isRead, lastMessageAt } }
  const { setChatUnreadCount } = useOutletContext() || {};
  // const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // const emojiPickerRef = useRef(null);

  // New States for Attachments, Replies, and Edits
  const [attachment, setAttachment] = useState(null); // stores { fileUrl, fileName, fileType }
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null); // message object being replied to
  const [editingMessage, setEditingMessage] = useState(null); // message object being edited
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const mentionMenuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  // '@' Mention Feature States for Products & Orders
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTab, setMentionTab] = useState('all'); // 'all' | 'products' | 'orders'
  const [mentionProducts, setMentionProducts] = useState([]);
  const [mentionOrders, setMentionOrders] = useState([]);
  const [mentionDataLoaded, setMentionDataLoaded] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  // Custom Confirmation & Alert States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [typedConfirmName, setTypedConfirmName] = useState('');
  const [showSendPreview, setShowSendPreview] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Media Preview Lightbox State
  const [mediaPreview, setMediaPreview] = useState(null); // { url, fileName, fileType }

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  // const popularEmojis = [
  //   '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤥', '😶', '🫥', '😐', '😑', '😬', '🫨', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🫵', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🤝', '👏', '🙌', '🫶', '👐', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💬', '💭', '✉️', '📦', '🎁', '🎈', '🎉', '🌟', '✨', '🔥', '💯', '🚀'
  // ];

  // Close emoji picker when clicking outside
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
  //       setShowEmojiPicker(false);
  //     }
  //   };
  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.get('/chat/unread/count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && setChatUnreadCount) {
        setChatUnreadCount(response.data.count ?? response.data.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('Failed to load total unread count:', err);
    }
  }, [setChatUnreadCount]);

  const fetchContacts = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.get('/chat/users/list', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const fetchedContacts = response.data || [];
      // Sort contacts by lastMessageAt descending to keep order consistent
      const sortedContacts = fetchedContacts.sort((a, b) => {
        const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return dateB - dateA;
      });

      setContacts(prev => {
        if (JSON.stringify(prev) === JSON.stringify(sortedContacts)) return prev;
        return sortedContacts;
      });
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (userId) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.get(`/chat/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const fetchedMessages = Array.isArray(response.data) ? response.data : response.data?.messages || [];

      setMessages(prev => {
        if (JSON.stringify(prev) === JSON.stringify(fetchedMessages)) {
          return prev;
        }
        return fetchedMessages;
      });

      // Mark messages as read
      await api.put(`/chat/read/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update unread counts
      fetchUnreadCount();
      fetchContacts();
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [fetchContacts, fetchUnreadCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContact]);

  // Auto-expand textarea height as message length grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minHeight = 40;
    const maxHeight = 180;
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [message]);

  useEffect(() => {
    fetchContacts();
    fetchUnreadCount();
    // Poll for new contacts every 5 seconds
    const intervalId = setInterval(() => {
      fetchContacts();
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [fetchContacts, fetchUnreadCount]);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact);
      // Poll for new active chat messages every 2 seconds
      const intervalId = setInterval(() => fetchMessages(activeContact), 30000);
      return () => clearInterval(intervalId);
    } else {
      setMessages([]);
    }
  }, [activeContact, fetchMessages]);

  // Effect to load last message senders for contacts list ticks
  useEffect(() => {
    const checkLastSenders = async () => {
      const newSenders = { ...lastMessageSenders };
      let updated = false;
      const token = sessionStorage.getItem('accessToken');
      if (!token) return;

      for (const contact of contacts) {
        if (!contact.lastMessageAt) continue;
        if (newSenders[contact.userId] && newSenders[contact.userId].lastMessageAt === contact.lastMessageAt) {
          continue;
        }

        try {
          const response = await api.get(`/chat/${contact.userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const fetchedMessages = Array.isArray(response.data) ? response.data : response.data?.messages || [];
          if (fetchedMessages.length > 0) {
            const lastMsg = fetchedMessages[fetchedMessages.length - 1];
            const senderId = typeof lastMsg.sender === 'object'
              ? (lastMsg.sender?._id || lastMsg.sender?.userId)
              : (lastMsg.senderId || lastMsg.sender || lastMsg.from);
            const isMe = senderId ? String(senderId) !== String(contact.userId) : false;
            const isRead = lastMsg.isRead || lastMsg.read || lastMsg.seen || lastMsg.isSeen || lastMsg.status === 'read' || lastMsg.status === 'seen';
            newSenders[contact.userId] = { isMe, isRead, lastMessageAt: contact.lastMessageAt };
            updated = true;
          } else {
            newSenders[contact.userId] = { isMe: false, isRead: false, lastMessageAt: contact.lastMessageAt };
            updated = true;
          }
        } catch (err) {
          console.error(`Failed to load messages for contact ${contact.userId}:`, err);
        }
      }

      if (updated) {
        setLastMessageSenders(newSenders);
      }
    };

    if (contacts.length > 0) {
      checkLastSenders();
    }
  }, [contacts]);

  // Sync active contact last message status instantly when active messages change
  useEffect(() => {
    if (activeContact && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const senderId = typeof lastMsg.sender === 'object'
        ? (lastMsg.sender?._id || lastMsg.sender?.userId)
        : (lastMsg.senderId || lastMsg.sender || lastMsg.from);
      const isMe = senderId ? String(senderId) !== String(activeContact) : false;
      const isRead = lastMsg.isRead || lastMsg.read || lastMsg.seen || lastMsg.isSeen || lastMsg.status === 'read' || lastMsg.status === 'seen';

      const activeContactInList = contacts.find(c => c.userId === activeContact);
      const lastMessageAt = activeContactInList?.lastMessageAt || lastMsg.createdAt;

      setLastMessageSenders(prev => {
        const existing = prev[activeContact];
        if (existing && existing.isMe === isMe && existing.isRead === isRead && existing.lastMessageAt === lastMessageAt) {
          return prev;
        }
        return {
          ...prev,
          [activeContact]: { isMe, isRead, lastMessageAt }
        };
      });
    }
  }, [messages, activeContact, contacts]);

  // Handle Escape key to exit from active chat or close modals first
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mediaPreview) {
          setMediaPreview(null);
          return;
        }
        if (deleteConfirmOpen) {
          setDeleteConfirmOpen(false);
          return;
        }
        if (alertOpen) {
          setAlertOpen(false);
          return;
        }
        if (editingMessage) {
          setEditingMessage(null);
          setMessage('');
          return;
        }
        if (replyToMessage) {
          setReplyToMessage(null);
          return;
        }
        setActiveContact(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mediaPreview, deleteConfirmOpen, alertOpen, editingMessage, replyToMessage]);

  useEffect(() => {
    if (!activeContact) {
      setActiveCustomerDetails(null);
      setCustomerLedgers([]);
      setCustomerOrders([]);
      return;
    }

    const fetchCustomerJourney = async () => {
      setLoadingCustomerDetails(true);
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch user details with fallback
        let userData = null;
        try {
          const userRes = await api.get(`/admin/users/${activeContact}`, { headers });
          userData = userRes.data?.user || userRes.data;
        } catch (e) {
          console.warn('Failed to fetch detailed user api, calling customer list instead', e);
          const custRes = await api.get('/admin/customers', { headers });
          const customers = Array.isArray(custRes.data)
            ? custRes.data
            : custRes.data?.data || custRes.data?.users || custRes.data?.customers || [];
          userData = customers.find(c => c._id === activeContact);
        }
        setActiveCustomerDetails(userData);

        // 2. Fetch all orders and filter locally
        try {
          const ordersRes = await api.get('/orders/all', { headers });
          const allOrders = Array.isArray(ordersRes.data)
            ? ordersRes.data
            : ordersRes.data?.orders || [];
          const filteredOrders = allOrders
            .filter(o => {
              const oUserId = typeof o.user === 'object' ? o.user?._id : o.user;
              return oUserId === activeContact;
            })
            .slice(0, 3);
          setCustomerOrders(filteredOrders);
        } catch (e) {
          console.error('Failed to load user orders', e);
        }

        // 3. Fetch all ledgers and filter locally
        try {
          const ledgersRes = await api.get('/ledger/all', { headers });
          const allLedgers = Array.isArray(ledgersRes.data)
            ? ledgersRes.data
            : ledgersRes.data?.ledgers || [];
          const filteredLedgers = allLedgers.filter(l => {
            const lUserId = typeof l.user === 'object' ? l.user?._id : l.user;
            return lUserId === activeContact;
          });
          setCustomerLedgers(filteredLedgers);
        } catch (e) {
          console.error('Failed to load user ledgers', e);
        }

      } catch (err) {
        console.error('Failed to fetch customer journey details:', err);
      } finally {
        setLoadingCustomerDetails(false);
      }
    };

    fetchCustomerJourney();
  }, [activeContact]);

  // Fetch Products and Orders for '@' Mention Menu
  const fetchMentionData = useCallback(async () => {
    if (mentionLoading || mentionDataLoaded) return;
    setMentionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };
      const [prodRes, orderRes] = await Promise.all([
        api.get('/products/').catch(() => ({ data: [] })),
        api.get('/orders/all', { headers }).catch(() => ({ data: [] }))
      ]);

      const prods = Array.isArray(prodRes.data) ? prodRes.data : [];
      const ords = Array.isArray(orderRes.data) ? orderRes.data : (orderRes.data?.orders || []);

      setMentionProducts(prods);
      setMentionOrders(ords);
      setMentionDataLoaded(true);
    } catch (err) {
      console.error('Failed to load products/orders for @ mention:', err);
    } finally {
      setMentionLoading(false);
    }
  }, [mentionLoading, mentionDataLoaded]);

  // Preload mention data
  useEffect(() => {
    fetchMentionData();
  }, [fetchMentionData]);

  // Close mention menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target)) {
        setShowMentionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Products & Orders for '@' Mention
  const filteredMentionItems = useMemo(() => {
    const q = (mentionQuery || '').toLowerCase().trim();
    let prods = [];
    let ords = [];

    if (mentionTab === 'all' || mentionTab === 'products') {
      prods = mentionProducts.filter(p => {
        if (!q) return true;
        const searchable = `${p._id || ''} ${p.name || ''} ${p.description || ''} ${p.eanNumber || ''} ${(p.variants || []).map(v => `${v.sku || ''} ${v._id || ''}`).join(' ')}`.toLowerCase();
        return searchable.includes(q);
      }).map(p => ({ ...p, _mentionType: 'product' }));
    }

    if (mentionTab === 'all' || mentionTab === 'orders') {
      ords = mentionOrders.filter(o => {
        if (!q) return true;
        const searchable = `${o._id || ''} ${o.orderId || ''} ${o.user?.name || ''} ${o.user?.phone || ''} ${o.shippingAddress?.fullName || ''} ${o.orderStatus || ''}`.toLowerCase();
        return searchable.includes(q);
      }).map(o => ({
        ...o,
        _mentionType: 'order',
        _isCustomerOrder: activeContact ? (String(typeof o.user === 'object' ? o.user?._id : o.user) === String(activeContact)) : false
      }));

      // Prioritize current customer's orders
      ords.sort((a, b) => (b._isCustomerOrder ? 1 : 0) - (a._isCustomerOrder ? 1 : 0));
    }

    if (mentionTab === 'products') return prods.slice(0, 25);
    if (mentionTab === 'orders') return ords.slice(0, 25);

    return [...ords.slice(0, 10), ...prods.slice(0, 10)];
  }, [mentionProducts, mentionOrders, mentionQuery, mentionTab, activeContact]);

  useEffect(() => {
    setMentionSelectedIndex(0);
  }, [mentionQuery, mentionTab]);

  const handleSelectMentionItem = (type, item) => {
    let formattedText = '';

    if (type === 'product') {
      const primaryVariant = item.variants?.[0] || {};
      const price = primaryVariant.offerPrice || primaryVariant.price || item.offerPrice || item.basePrice || 0;
      const sku = primaryVariant.sku || item.sku || 'N/A';
      const stock = item.totalQuantity !== undefined ? item.totalQuantity : (primaryVariant.quantity !== undefined ? primaryVariant.quantity : 'In Stock');

      formattedText = `📦 Product: ${item.name || 'Product'}\n` +
        `• SKU: ${sku}\n` +
        `• Price: ₹${price}\n` +
        `• Stock: ${stock}\n` +
        (item.brand?.name || item.brand ? `• Brand: ${item.brand?.name || item.brand}\n` : '') +
        (item.warranty ? `• Warranty: ${item.warranty}\n` : '') +
        `• Product ID: ${item._id}`;
    } else if (type === 'order') {
      const orderNum = item.orderId || item._id?.slice(-8).toUpperCase();
      const customerName = item.user?.name || item.shippingAddress?.fullName || 'Customer';
      const orderDate = item.createdAt ? formatDateDDMMYYYY(item.createdAt) : 'Recent';
      const itemsSummary = (item.items || [])
        .map(it => `${it.product?.name || it.name || 'Item'} (x${it.quantity || 1})`)
        .slice(0, 3)
        .join(', ');

      formattedText = `🛍️ Order Details: #${orderNum}\n` +
        `• Customer: ${customerName}\n` +
        `• Date: ${orderDate}\n` +
        (itemsSummary ? `• Items: ${itemsSummary}${item.items?.length > 3 ? ` +${item.items.length - 3} more` : ''}\n` : '') +
        `• Total: ₹${item.totalAmount || 0}\n` +
        `• Status: ${item.orderStatus || 'Pending'}\n` +
        (item.paymentMethod ? `• Payment: ${item.paymentMethod}\n` : '') +
        `• Order ID: ${item._id}`;
    }

    const textarea = textareaRef.current;
    const cursorPos = textarea ? textarea.selectionStart : message.length;
    const textBeforeCursor = message.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const beforeAt = message.slice(0, lastAtIndex);
      const afterCursor = message.slice(cursorPos);
      const newMessage = `${beforeAt}${formattedText}${afterCursor ? ' ' + afterCursor : ''}`;
      setMessage(newMessage);
    } else {
      setMessage(prev => (prev ? `${prev}\n\n${formattedText}` : formattedText));
    }

    setShowMentionMenu(false);
    setMentionQuery('');

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleMessageChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessage(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes('\n')) {
          setMentionQuery(query);
          setShowMentionMenu(true);
          if (!mentionDataLoaded) fetchMentionData();
          return;
        }
      }
    }
    setShowMentionMenu(false);
  };

  const handleTextareaKeyDown = (e) => {
    if (showMentionMenu && filteredMentionItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev + 1) % filteredMentionItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev - 1 + filteredMentionItems.length) % filteredMentionItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMentionItems[mentionSelectedIndex];
        if (selected) {
          handleSelectMentionItem(selected._mentionType, selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.post('/chat/upload-file', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data) {
        setAttachment({
          fileUrl: response.data.fileUrl,
          fileName: response.data.fileName,
          fileType: response.data.fileType
        });
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      showAlert('Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      await api.delete(`/chat/delete/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages(activeContact);
    } catch (err) {
      console.error('Failed to delete message:', err);
      showAlert('Failed to delete message.');
    }
  };

  const handleSend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if ((!message.trim() && !attachment) || !activeContact) return;

    const messageText = message.trim();
    const token = sessionStorage.getItem('accessToken');

    if (editingMessage) {
      try {
        await api.put(`/chat/edit/${editingMessage._id || editingMessage.id}`, {
          newText: messageText
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEditingMessage(null);
        setMessage('');
        fetchMessages(activeContact);
      } catch (err) {
        console.error('Failed to edit message:', err);
        showAlert('Failed to edit message.');
      }
    } else {
      setShowSendPreview(true);
    }
  };

  const confirmAndSendMessage = async () => {
    if ((!message.trim() && !attachment) || !activeContact) return;

    const messageText = message.trim();
    const token = sessionStorage.getItem('accessToken');
    const currentAttachment = attachment;

    setMessage(''); // Optimistic clear
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowSendPreview(false);

    // Optimistic UI update
    const tempId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        _id: tempId,
        senderId: 'admin',
        message: messageText,
        fileUrl: currentAttachment?.fileUrl,
        fileName: currentAttachment?.fileName,
        fileType: currentAttachment?.fileType,
        replyTo: replyToMessage,
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      const payload = {
        receiverId: activeContact,
        message: messageText || undefined
      };

      if (currentAttachment) {
        payload.fileUrl = currentAttachment.fileUrl;
        payload.fileName = currentAttachment.fileName;
        payload.fileType = currentAttachment.fileType;
      }

      if (replyToMessage) {
        payload.replyTo = replyToMessage._id || replyToMessage.id;
        setReplyToMessage(null);
      }

      await api.post('/chat/send', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchMessages(activeContact);
      fetchContacts();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const activeContactDetails = contacts.find(c => c.userId === activeContact);

  return (
    <div className="relative space-y-4 min-h-full z-0 w-full flex flex-col h-[calc(100dvh+6rem)] min-h-[960px]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiMessageSquare className="text-blue-400" />
            Chat & Support
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-0.5">
            Real-time customer messaging, support conversations, and order inquiries.
          </p>
        </div>
      </div>

      <div className="flex flex-1 w-full bg-transparent backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/50 min-w-0 min-h-0">
        {/* Sidebar - Contacts */}
        <div className={`${activeContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r border-white/10 flex-col bg-black/20`}>
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Messages</h2>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {contacts.filter(contact =>
              (contact.name || '').toLowerCase().includes(searchQuery.toLowerCase())
            ).map(contact => (
              <div
                key={contact.userId}
                onClick={() => setActiveContact(contact.userId)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${activeContact === contact.userId ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner ${activeContact === contact.userId ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    {contact.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-bold truncate flex items-center gap-1.5 ${activeContact === contact.userId ? 'text-white' : 'text-slate-200'}`}>
                      <span>{contact.name || 'Unknown User'}</span>
                      {contact.businessType && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold shrink-0">
                          {contact.businessType}
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-slate-500 shrink-0 ml-2">
                      {formatLastMessageDate(contact.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {lastMessageSenders[contact.userId]?.isMe && (
                        <span
                          className={`shrink-0 text-base ${lastMessageSenders[contact.userId]?.isRead ? 'text-blue-400' : 'text-slate-500'}`}
                          title={lastMessageSenders[contact.userId]?.isRead ? "Read" : "Sent"}
                        >
                          {lastMessageSenders[contact.userId]?.isRead ? (
                            <RiCheckDoubleFill />
                          ) : (
                            <FiCheck />
                          )}
                        </span>
                      )}
                      <p
                        title={contact.lastMessage || 'No messages yet'}
                        className={`text-sm truncate ${contact.unreadCount > 0 && activeContact !== contact.userId ? 'text-white font-semibold' : 'text-slate-400'}`}
                      >
                        {contact.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {contact.unreadCount > 0 && activeContact !== contact.userId && (
                      <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`${activeContact ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-black/10 min-w-0`}>
          {activeContactDetails ? (
            <div className="flex flex-1 flex-row min-h-0 min-w-0 overflow-hidden relative">
              {/* Chat Column */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0 border-r border-white/5">
                {/* Chat Header */}
                <div className="h-16 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setActiveContact(null)}
                      className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <FiArrowLeft className="text-xl" />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        {activeContactDetails.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      {activeContactDetails.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                      )}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-white truncate max-w-37.5 sm:max-w-xs">{activeContactDetails.name || 'Unknown User'}</h2>
                        {activeContactDetails.businessType && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold shrink-0">
                            {activeContactDetails.businessType}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                        {activeContactDetails.phone ? `Phone: ${activeContactDetails.phone}` : ''}
                        {activeContactDetails.phone && activeContactDetails.email ? ' • ' : ''}
                        {activeContactDetails.email ? `Email: ${activeContactDetails.email}` : ''}
                        {activeContactDetails.isOnline ? ' • Online' : activeContactDetails.lastActive ? ` • Last active: ${new Date(activeContactDetails.lastActive).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                      </p>
                    </div>
                  </div>
                  {/* Collapsible Info toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowProfileSidebar(!showProfileSidebar)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${showProfileSidebar
                      ? 'bg-blue-600 border-blue-500/30 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    title="Toggle Customer Info"
                  >
                    <FiInfo className="text-lg" />
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                  {messages.map((msg, index) => {
                    const senderId = typeof msg.sender === 'object' ? (msg.sender?._id || msg.sender?.userId) : (msg.senderId || msg.sender || msg.from);
                    const receiverId = typeof msg.receiver === 'object' ? (msg.receiver?._id || msg.receiver?.userId) : (msg.receiverId || msg.receiver || msg.to);

                    let isMe = true;
                    if (senderId) {
                      isMe = String(senderId) !== String(activeContact);
                    } else if (receiverId) {
                      isMe = String(receiverId) === String(activeContact);
                    }

                    const currentDateStr = msg.createdAt ? formatDividerDate(msg.createdAt) : 'Today';
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const prevDateStr = prevMsg && prevMsg.createdAt ? formatDividerDate(prevMsg.createdAt) : null;
                    const showDivider = currentDateStr !== prevDateStr;

                    const isSeen = msg.isRead || msg.read || msg.seen || msg.isSeen || msg.status === 'read' || msg.status === 'seen';

                    const isDeleted = msg.message === "This message was deleted" || msg.text === "This message was deleted" || msg.isDeleted === true;

                    const getReplyText = (replyTo) => {
                      if (!replyTo) return null;
                      if (typeof replyTo === 'object') {
                        return replyTo.message || replyTo.text;
                      }
                      const repliedMsg = messages.find(m => m._id === replyTo || m.id === replyTo);
                      return repliedMsg ? (repliedMsg.message || repliedMsg.text) : 'Message link...';
                    };

                    return (
                      <React.Fragment key={msg._id || msg.id || index}>
                        {showDivider && (
                          <div className="text-center my-4">
                            <span className="text-xs font-medium text-slate-500 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                              {currentDateStr}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative mb-2`}>
                          <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isMe && (
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-auto">
                                {activeContactDetails.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'} relative`}>

                              {/* Message Actions Overlay */}
                              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-lg z-10 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                {!isDeleted && (
                                  <button
                                    type="button"
                                    onClick={() => setReplyToMessage(msg)}
                                    className="p-1 text-slate-400 hover:text-indigo-400 rounded-md transition-colors cursor-pointer"
                                    title="Reply"
                                  >
                                    <FiCornerUpLeft className="text-xs" />
                                  </button>
                                )}
                                {isMe && !isDeleted && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => { setEditingMessage(msg); setMessage(msg.message || msg.text || ''); setReplyToMessage(null); }}
                                      className="p-1 text-slate-400 hover:text-blue-400 rounded-md transition-colors cursor-pointer"
                                      title="Edit"
                                    >
                                      <FiEdit2 className="text-xs" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setMessageToDelete(msg); setDeleteConfirmOpen(true); }}
                                      className="p-1 text-slate-400 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                                      title="Delete"
                                    >
                                      <FiTrash2 className="text-xs" />
                                    </button>
                                  </>
                                )}
                              </div>

                              <div
                                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl max-w-full ${isMe
                                  ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                                  : 'bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm shadow-sm'
                                  }`}
                              >
                                {/* Reply Context in Message */}
                                {msg.replyTo && !isDeleted && (
                                  <div className="mb-1.5 p-1.5 rounded-lg bg-black/30 border-l-2 border-indigo-400 text-slate-400 text-[11px] truncate max-w-full">
                                    <span className="font-bold block text-indigo-400 text-[9px] uppercase tracking-wider mb-0.5">Replied to message</span>
                                    {getReplyText(msg.replyTo)}
                                  </div>
                                )}

                                {/* File Attachment in Message */}
                                {msg.fileUrl && !isDeleted && (
                                  isImageFile(msg.fileType, msg.fileName, msg.fileUrl) ? (
                                    <div
                                      className="mb-1.5 rounded-lg overflow-hidden border border-white/5 bg-slate-900 flex items-center justify-center max-w-64 cursor-zoom-in group/img relative"
                                      onClick={() => setMediaPreview({ url: getImageUrl(msg.fileUrl), fileName: msg.fileName || 'Image', fileType: msg.fileType })}
                                    >
                                      <img src={getImageUrl(msg.fileUrl)} alt={msg.fileName || 'Attachment'} className="max-w-full max-h-48 object-contain transition-opacity group-hover/img:opacity-80" />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-2">
                                          <FiSearch className="text-white" size={16} />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className="mb-1.5 flex items-center gap-2 p-2 bg-black/25 border border-white/5 rounded-lg text-xs max-w-64 cursor-pointer hover:bg-black/40 transition-colors"
                                      onClick={() => setMediaPreview({ url: getImageUrl(msg.fileUrl), fileName: msg.fileName || 'Document', fileType: msg.fileType })}
                                    >
                                      <div className="w-8 h-8 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                                        <FiFileText className="text-lg" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-300 truncate">{msg.fileName || 'Attachment'}</p>
                                        <p className="text-[10px] text-slate-500 capitalize">{msg.fileType ? msg.fileType.split('/')[1] : 'document'}</p>
                                      </div>
                                      <a
                                        href={getImageUrl(msg.fileUrl)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-white rounded-md transition-colors shrink-0 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        title="Open / Download"
                                        download
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <FiDownload className="text-xs" />
                                      </a>
                                    </div>
                                  )
                                )}

                                {isDeleted ? (
                                  <p className="text-[13px] sm:text-sm leading-relaxed wrap-break-word whitespace-pre-wrap italic text-slate-500">This message was deleted</p>
                                ) : (
                                  (msg.message || msg.text) && (
                                    <p className="text-[13px] sm:text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">{msg.message || msg.text}</p>
                                  )
                                )}
                              </div>
                              <div className={`flex items-center gap-1 mt-1.5 mx-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span
                                  className="text-[10px] font-medium text-slate-500 cursor-help"
                                  title={msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                                >
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.time || '')}
                                </span>
                                {isMe && (
                                  <span className={`text-sm ${isSeen ? 'text-blue-400' : 'text-slate-500'}`} title={isSeen ? "Read" : "Sent"}>
                                    {isSeen ? (
                                      <div className="flex -space-x-1.5">
                                        <RiCheckDoubleFill />
                                      </div>
                                    ) : (
                                      <FiCheck />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 sm:p-4 border-t border-white/10 bg-black/20 shrink-0 animate-in fade-in duration-200 relative z-30">

                  {/* '@' Mention Menu for Products & Orders */}
                  {showMentionMenu && (
                    <div
                      ref={mentionMenuRef}
                      className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-4 mb-2 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 max-w-xl mx-auto flex flex-col max-h-[280px] sm:max-h-[320px]"
                    >
                      {/* Header & Filter Tabs */}
                      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-white/10 bg-slate-950/80 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5 shrink-0">
                            <FiAtSign className="text-blue-400 text-sm" /> Insert Details
                          </span>
                          {mentionQuery && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-mono truncate max-w-28 sm:max-w-40">
                              @{mentionQuery}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5 text-[11px] shrink-0">
                          <button
                            type="button"
                            onClick={() => setMentionTab('all')}
                            className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${mentionTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setMentionTab('products')}
                            className={`px-2.5 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${mentionTab === 'products' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            <FiPackage className="text-xs" /> Products
                          </button>
                          <button
                            type="button"
                            onClick={() => setMentionTab('orders')}
                            className={`px-2.5 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${mentionTab === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            <FiShoppingBag className="text-xs" /> Orders
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowMentionMenu(false)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Close"
                        >
                          <FiX className="text-sm" />
                        </button>
                      </div>

                      {/* Items List */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 min-h-0">
                        {mentionLoading ? (
                          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs font-semibold">
                            <FiLoader className="animate-spin text-blue-400 text-base" />
                            Loading products and orders...
                          </div>
                        ) : filteredMentionItems.length > 0 ? (
                          <div className="space-y-1">
                            {filteredMentionItems.map((item, idx) => {
                              const isProduct = item._mentionType === 'product';
                              const isSelected = idx === mentionSelectedIndex;

                              if (isProduct) {
                                const primaryVariant = item.variants?.[0] || {};
                                const price = primaryVariant.offerPrice || primaryVariant.price || item.offerPrice || item.basePrice || 0;
                                const imgUrl = (item.images && item.images[0]) || (primaryVariant.images && primaryVariant.images[0]);

                                return (
                                  <div
                                    key={`prod-${item._id}`}
                                    onClick={() => handleSelectMentionItem('product', item)}
                                    onMouseEnter={() => setMentionSelectedIndex(idx)}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-600/20 border border-blue-500/40 text-white' : 'hover:bg-white/5 border border-transparent text-slate-200'
                                      }`}
                                  >
                                    <div className="w-10 h-10 rounded-lg bg-white border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                      {imgUrl ? (
                                        <img src={getImageUrl(imgUrl)} alt={item.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <FiPackage className="text-slate-400 text-lg" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-0.5">
                                        <p className="text-xs font-bold truncate text-white">{item.name}</p>
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded ml-2 shrink-0">Product</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <span>SKU: {primaryVariant.sku || item.sku || 'N/A'}</span>
                                        <span>•</span>
                                        <span className="text-emerald-400 font-bold">₹{price}</span>
                                        {item.brand?.name && (
                                          <>
                                            <span>•</span>
                                            <span className="truncate">{item.brand.name}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                // Order item
                                const orderNum = item.orderId || item._id?.slice(-8).toUpperCase();
                                const customerName = item.user?.name || item.shippingAddress?.fullName || 'Customer';

                                return (
                                  <div
                                    key={`ord-${item._id}`}
                                    onClick={() => handleSelectMentionItem('order', item)}
                                    onMouseEnter={() => setMentionSelectedIndex(idx)}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' : 'hover:bg-white/5 border border-transparent text-slate-200'
                                      }`}
                                  >
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                                      <FiShoppingBag className="text-lg" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-0.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <p className="text-xs font-bold truncate text-white">Order #{orderNum}</p>
                                          {item._isCustomerOrder && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded shrink-0">
                                              This Customer
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded ml-2 shrink-0">Order</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <span className="truncate">{customerName}</span>
                                        <span>•</span>
                                        <span className="text-emerald-400 font-bold">₹{item.totalAmount || 0}</span>
                                        <span>•</span>
                                        <span className="text-slate-400 capitalize">{item.orderStatus || 'Pending'}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-slate-500 text-xs font-medium">
                            No products or orders found matching "{mentionQuery}"
                          </div>
                        )}
                      </div>

                      {/* Footer tip */}
                      <div className="px-3 py-1.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>Use <kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-300">↑</kbd> <kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-300">↓</kbd> to navigate, <kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-300">Enter</kbd> to insert</span>
                        <span>Type text after @ to filter</span>
                      </div>
                    </div>
                  )}

                  {/* Reply Preview */}
                  {replyToMessage && (
                    <div className="flex items-center justify-between p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl mb-2 animate-in fade-in slide-in-from-bottom-1 text-xs">
                      <div className="flex-1 min-w-0 border-l-2 border-indigo-500 pl-2">
                        <p className="font-semibold text-indigo-400">Reply to {String(replyToMessage.senderId || replyToMessage.sender || replyToMessage.from) === String(activeContact) ? 'Customer' : 'Support'}</p>
                        <p className="text-slate-300 truncate">{replyToMessage.message || replyToMessage.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyToMessage(null)}
                        className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  )}

                  {/* Edit Preview */}
                  {editingMessage && (
                    <div className="flex items-center justify-between p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl mb-2 animate-in fade-in slide-in-from-bottom-1 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-blue-400">Editing Message</p>
                        <p className="text-slate-300 truncate">{editingMessage.message || editingMessage.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setEditingMessage(null); setMessage(''); }}
                        className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  )}

                  {/* Attachment Preview */}
                  {attachment && (
                    <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl mb-2 animate-in fade-in slide-in-from-bottom-1 max-w-sm">
                      {isImageFile(attachment.fileType, attachment.fileName, attachment.fileUrl) ? (
                        <img src={getImageUrl(attachment.fileUrl)} alt="Preview" className="w-10 h-10 object-cover rounded-lg bg-white p-0.5 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                          <FiFileText className="text-lg" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{attachment.fileName}</p>
                        <p className="text-[10px] text-slate-400">Ready to send</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  )}

                  {/* Uploading File Indicator */}
                  {uploadingFile && (
                    <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl mb-2 animate-in fade-in max-w-xs text-xs text-slate-400">
                      <FiLoader className="animate-spin text-blue-400 text-sm" />
                      <span>Uploading file...</span>
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <div className="flex-1 bg-black/20 border border-white/10 rounded-2xl flex items-end p-1.5 focus-within:border-blue-500/50 focus-within:bg-black/40 shadow-inner backdrop-blur-md transition-all min-w-0">
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleMessageChange}
                        placeholder={editingMessage ? "Edit message..." : "Type a message or '@' to insert product/order details..."}
                        className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm px-3 py-2 focus:outline-none resize-none custom-scrollbar overflow-y-auto leading-relaxed"
                        rows="1"
                        style={{ minHeight: '40px', maxHeight: '180px' }}
                        onKeyDown={handleTextareaKeyDown}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowMentionMenu(prev => !prev);
                          if (!mentionDataLoaded) fetchMentionData();
                          if (textareaRef.current) textareaRef.current.focus();
                        }}
                        className={`p-2.5 transition-colors shrink-0 cursor-pointer ${showMentionMenu ? 'text-blue-400 bg-blue-500/10 rounded-xl' : 'text-slate-400 hover:text-blue-400'}`}
                        title="Insert Product or Order details (@)"
                      >
                        <FiAtSign className="text-xl" />
                      </button>
                      <button
                        type="button"
                        onClick={handleAttachClick}
                        className="p-2.5 text-slate-400 hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
                        title="Attach File"
                      >
                        <FiPaperclip className="text-xl" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={editingMessage ? !message.trim() : (!message.trim() && !attachment)}
                      className="h-10 w-10 sm:h-11 sm:w-11 mb-1 rounded-2xl text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
                    >
                      <FiSend className="text-xl" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Collapsible Sidebar */}
              <div className={`border-l border-white/10 bg-slate-950/40 backdrop-blur-2xl flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${showProfileSidebar ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none border-l-0'}`}>
                <div className="w-80 flex flex-col h-full">
                  {/* Sidebar Header */}
                  <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <FiUser className="text-blue-400 text-sm" /> Customer Info
                    </span>
                    <button
                      onClick={() => setShowProfileSidebar(false)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      title="Close Sidebar"
                    >
                      <FiX className="text-lg" />
                    </button>
                  </div>

                  {/* Sidebar Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-left">
                    {loadingCustomerDetails ? (
                      <div className="py-20 flex flex-col justify-center items-center gap-3">
                        <FiLoader className="animate-spin text-2xl text-blue-400" />
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading customer info...</span>
                      </div>
                    ) : (
                      <>
                        {/* User Details Profile */}
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">KYC Status</span>
                            {activeCustomerDetails?.isApproved || activeCustomerDetails?.userId ? (
                              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase">Approved</span>
                            ) : (
                              <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase">Pending</span>
                            )}
                          </div>

                          <div className="space-y-3 text-xs">
                            <div>
                              <span className="text-slate-500 font-medium block mb-0.5">Name</span>
                              <span className="font-bold text-white text-sm">{activeCustomerDetails?.name || activeContactDetails?.name || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium block mb-0.5">Phone</span>
                              <span className="text-slate-200 font-semibold">{activeCustomerDetails?.phone || activeContactDetails?.phone || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium block mb-0.5">Email</span>
                              <span className="text-slate-200 font-semibold break-all">{activeCustomerDetails?.email || activeContactDetails?.email || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium block mb-0.5">Business Type</span>
                              <span className="font-bold text-slate-200">{activeCustomerDetails?.businessType || activeContactDetails?.businessType || 'L1'}</span>
                            </div>
                            {activeCustomerDetails?.gstNumber && (
                              <div>
                                <span className="text-slate-500 font-medium block mb-0.5">GSTIN</span>
                                <span className="font-mono font-bold text-slate-200 text-[11px]">{activeCustomerDetails.gstNumber}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-500 font-medium block mb-0.5">Joined Date</span>
                              <span className="text-slate-200">{activeCustomerDetails?.createdAt ? formatDateDDMMYYYY(activeCustomerDetails.createdAt) : 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium block mb-0.5">Status</span>
                              <span className="text-slate-200 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${activeContactDetails?.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                                {activeContactDetails?.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-20 h-20 bg-transparent rounded-full flex items-center justify-center mb-4">
                <FiSend className="text-3xl" />
              </div>
              <p className="font-medium text-lg text-slate-400">Select a conversation</p>
              <p className="text-sm">Choose a contact from the sidebar to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && messageToDelete && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-lg animate-fade-in" onClick={() => { setDeleteConfirmOpen(false); setMessageToDelete(null); }}></div>
          <div className="relative bg-slate-950/25 border border-rose-500/20 rounded-2xl p-6 shadow-2xl shadow-rose-500/20 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-red-500 animate-pulse" /> Confirm Deletion
            </h3>
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              Are you sure you want to permanently delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setMessageToDelete(null); }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteMessage(messageToDelete._id || messageToDelete.id);
                  setDeleteConfirmOpen(false);
                  setMessageToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all text-sm bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
              >
                Proceed Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Send Preview Confirmation Modal */}
      {showSendPreview && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-lg animate-fade-in" onClick={() => setShowSendPreview(false)}></div>
          <div className="relative bg-slate-950/25 border border-blue-500/20 rounded-2xl p-6 shadow-2xl shadow-blue-500/20 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiSend className="text-blue-400" /> Preview Outgoing Message
              </h3>
              <button onClick={() => setShowSendPreview(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                <FiX size={18} />
              </button>
            </div>

            <p className="text-slate-400 text-xs mb-3 font-semibold uppercase tracking-wider">How it will look in the chat:</p>

            <div className="bg-black/20 border border-white/5 p-4 rounded-xl mb-6">
              <div className="flex justify-end">
                <div className="px-4 py-2.5 rounded-2xl text-white rounded-br-sm max-w-[90%] text-left bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  {replyToMessage && (
                    <div className="mb-1.5 p-1.5 rounded-lg bg-black/30 border-l-2 border-indigo-400 text-slate-400 text-[11px] truncate max-w-full">
                      <span className="font-bold block text-indigo-400 text-[9px] uppercase tracking-wider mb-0.5">Replied to message</span>
                      {replyToMessage.message || replyToMessage.text}
                    </div>
                  )}
                  {attachment && (
                    isImageFile(attachment.fileType, attachment.fileName, attachment.fileUrl) ? (
                      <div className="mb-1.5 rounded-lg overflow-hidden border border-white/5 bg-slate-900 flex items-center justify-center max-w-64">
                        <img src={getImageUrl(attachment.fileUrl)} alt="Preview" className="max-w-full max-h-48 object-contain" />
                      </div>
                    ) : (
                      <div className="mb-1.5 flex items-center gap-2 p-2 bg-black/25 border border-white/5 rounded-lg text-xs max-w-64 select-none">
                        <FiFileText className="text-lg shrink-0" />
                        <span className="truncate">{attachment.fileName}</span>
                      </div>
                    )
                  )}
                  {message && message.trim() && (
                    <p className="text-[13px] sm:text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">{message.trim()}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSendPreview(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                onClick={confirmAndSendMessage}
                className="flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all text-sm animate-pulse bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Alert Modal */}
      {alertOpen && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-lg animate-fade-in" onClick={() => setAlertOpen(false)}></div>
          <div className="relative bg-slate-950/25 border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiInfo className="text-blue-400" /> Alert
            </h3>
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              {alertMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertOpen(false)}
              className="w-full px-4 py-2.5 text-white font-bold rounded-xl transition-colors text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Media Preview Lightbox ── */}
      {mediaPreview && createPortal(
        <div
          className="fixed inset-0 z-[10002] flex flex-col items-center justify-center bg-black/85 backdrop-blur-lg animate-in fade-in duration-200"
          onClick={() => setMediaPreview(null)}
          onKeyDown={(e) => e.key === 'Escape' && setMediaPreview(null)}
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          {/* Top Bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white font-semibold text-sm truncate max-w-[60vw]">{mediaPreview.fileName}</span>
            <div className="flex items-center gap-2">
              <a
                href={mediaPreview.url}
                download={mediaPreview.fileName}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-colors bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={(e) => e.stopPropagation()}
              >
                <FiDownload size={13} />
                Download
              </a>
              <button
                type="button"
                onClick={() => setMediaPreview(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* Media Content (Image or PDF) */}
          <div
            className="flex items-center justify-center w-full h-full px-4 pt-14 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaPreview.fileType === 'application/pdf' || mediaPreview.fileName?.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={`${mediaPreview.url}#toolbar=0`}
                title={mediaPreview.fileName}
                className="w-full max-w-4xl h-[85vh] rounded-xl border border-white/10 shadow-2xl bg-slate-950"
              />
            ) : (
              <img
                src={mediaPreview.url}
                alt={mediaPreview.fileName}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 select-none"
                draggable={false}
              />
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Chat;