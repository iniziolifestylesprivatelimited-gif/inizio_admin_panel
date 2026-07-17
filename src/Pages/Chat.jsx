import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiSearch, FiSend, FiPaperclip, FiMoreVertical, FiPhone, FiVideo,
  FiSmile, FiInfo, FiArrowLeft, FiCheck, FiCornerUpLeft, FiEdit2,
  FiTrash2, FiX, FiFileText, FiDownload, FiLoader
} from 'react-icons/fi';
import { api, BASE_URL } from '../api/axios';
import { useOutletContext } from 'react-router-dom';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
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
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
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
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const Chat = () => {
  const [activeContact, setActiveContact] = useState(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const { setChatUnreadCount } = useOutletContext() || {};
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // New States for Attachments, Replies, and Edits
  const [attachment, setAttachment] = useState(null); // stores { fileUrl, fileName, fileType }
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null); // message object being replied to
  const [editingMessage, setEditingMessage] = useState(null); // message object being edited
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  const popularEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤥', '😶', '🫥', '😐', '😑', '😬', '🫨', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🫵', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🤝', '👏', '🙌', '🫶', '👐', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💬', '💭', '✉️', '📦', '🎁', '🎈', '🎉', '🌟', '✨', '🔥', '💯', '🚀'
  ];

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      alert('Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      const token = sessionStorage.getItem('accessToken');
      await api.delete(`/chat/delete/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages(activeContact);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
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
        alert('Failed to edit message.');
      }
    } else {
      const currentAttachment = attachment;
      setMessage(''); // Optimistic clear
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

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
    }
  };

  const activeContactDetails = contacts.find(c => c.userId === activeContact);

  return (
    <div className="relative flex h-[calc(100dvh-12rem)] md:h-[calc(85dvh-6rem)] z-0 w-full">


      <div className="flex w-full h-full bg-transparent backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/50 min-w-0">
        {/* Sidebar - Contacts */}
        <div className={`${activeContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r border-white/10 flex-col bg-black/20`}>
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Messages</h2>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
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
                    <p className={`text-sm truncate ${contact.unreadCount > 0 && activeContact !== contact.userId ? 'text-white font-semibold' : 'text-slate-400'}`}>
                      {contact.lastMessage || 'No messages yet'}
                    </p>
                    {contact.unreadCount > 0 && activeContact !== contact.userId && (
                      <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2">
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
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveContact(null)}
                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <FiArrowLeft className="text-xl" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-inner">
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
                                    onClick={() => handleDeleteMessage(msg._id || msg.id)}
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
                                msg.fileType?.startsWith('image/') ? (
                                  <div className="mb-1.5 rounded-lg overflow-hidden border border-white/5 bg-slate-900 flex items-center justify-center max-w-64">
                                    <img src={getImageUrl(msg.fileUrl)} alt={msg.fileName || 'Attachment'} className="max-w-full max-h-48 object-contain" />
                                  </div>
                                ) : (
                                  <div className="mb-1.5 flex items-center gap-2 p-2 bg-black/25 border border-white/5 rounded-lg text-xs max-w-64 select-none">
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
                                      className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shrink-0 cursor-pointer"
                                      title="Open / Download"
                                      download
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
                                      <FiCheck /><FiCheck />
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
              <div className="p-3 sm:p-4 border-t border-white/10 bg-black/20 shrink-0 animate-in fade-in duration-200">

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
                    {attachment.fileType.startsWith('image/') ? (
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
                  <div className="flex-1 bg-black/20 border border-white/10 rounded-2xl flex items-end p-1 focus-within:border-blue-500/50 focus-within:bg-black/40 shadow-inner backdrop-blur-md transition-all min-w-0">
                    <div className="relative shrink-0 flex items-center" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2.5 transition-colors rounded-xl ${showEmojiPicker ? 'text-blue-400 bg-white/5' : 'text-slate-400 hover:text-blue-400'}`}
                        title="Emoji"
                      >
                        <FiSmile className="text-xl cursor-pointer" />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-3 w-64 sm:w-80 h-48 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-3 z-50 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-2">
                          <div className="grid grid-cols-8 gap-2">
                            {popularEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setMessage(prev => prev + emoji)}
                                className="text-xl p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center select-none"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                      className="flex-1 max-h-32 bg-transparent text-white placeholder-slate-500 text-sm px-2 py-3 focus:outline-none resize-none custom-scrollbar"
                      rows="1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAttachClick}
                      className="p-2.5 text-slate-400 hover:text-blue-400 transition-colors shrink-0"
                      title="Attach File"
                    >
                      <FiPaperclip className="text-xl" />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={editingMessage ? !message.trim() : (!message.trim() && !attachment)}
                    className="h-10 w-10 sm:h-11 sm:w-11 mb-1 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 shrink-0"
                  >
                    <FiSend className="text-xl" />
                  </button>
                </form>
              </div>
            </>
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
    </div>
  );
};

export default Chat;