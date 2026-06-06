import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiSearch, FiSend, FiPaperclip, FiMoreVertical, FiPhone, FiVideo, FiSmile, FiInfo, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { api } from '../api/axios';
import { useOutletContext } from 'react-router-dom';

const Chat = () => {
  const [activeContact, setActiveContact] = useState(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const { setChatUnreadCount } = useOutletContext() || {};

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
      
      // Update unread count locally
      setContacts(prev => {
        let hasChanges = false;
        let countToSubtract = 0;
        const updated = prev.map(c => {
          if (c.userId === userId && c.unreadCount !== 0) {
            hasChanges = true;
            countToSubtract = c.unreadCount;
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
        
        if (hasChanges && setChatUnreadCount) {
          setChatUnreadCount(currentTotal => Math.max(0, currentTotal - countToSubtract));
        }
        
        return hasChanges ? updated : prev;
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContact]);

  useEffect(() => {
    fetchContacts();
    // Poll for new contacts/messages every 10 seconds
    const intervalId = setInterval(fetchContacts, 10000);
    return () => clearInterval(intervalId);
  }, [fetchContacts]);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact);
      // Poll for new active chat messages every 5 seconds
      const intervalId = setInterval(() => fetchMessages(activeContact), 5000);
      return () => clearInterval(intervalId);
    } else {
      setMessages([]);
    }
  }, [activeContact, fetchMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !activeContact) return;

    const messageText = message.trim();
    setMessage(''); // Optimistic clear

    // Optimistic UI update
    const tempId = Date.now().toString();
    setMessages(prev => [
      ...prev, 
      { 
        _id: tempId, 
        senderId: 'admin', // Assume admin ID isn't equal to the active customer's ID
        message: messageText, 
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      const token = sessionStorage.getItem('accessToken');
      await api.post('/chat/send', {
        receiverId: activeContact,
        message: messageText
      }, {
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
    <div className="relative flex h-[calc(100dvh-6rem)] md:h-[calc(100dvh-8rem)] z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      {/* <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div> */}
      
      <div className="flex w-full h-full bg-transparent backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Sidebar - Contacts */}
        <div className={`${activeContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r border-white/10 flex-col bg-black/20`}>
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Messages</h2>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
                className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {contacts.map(contact => (
            <div 
              key={contact.userId} 
              onClick={() => setActiveContact(contact.userId)}
              className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${activeContact === contact.userId ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-blue-600/5 border border-transparent'}`}
            >
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner ${activeContact === contact.userId ? 'bg-blue-600' : 'bg-slate-700'}`}>
                  {contact.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`font-bold truncate ${activeContact === contact.userId ? 'text-white' : 'text-slate-200'}`}>
                    {contact.name || 'Unknown User'}
                  </h3>
                  <span className="text-xs text-slate-500 shrink-0 ml-2">
                    {contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
      <div className={`${activeContact ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-black/10`}>
        {activeContactDetails ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
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
                </div>
                <div className="overflow-hidden min-w-0">
                  <h2 className="font-bold text-white truncate max-w-37.5 sm:max-w-xs">{activeContactDetails.name || 'Unknown User'}</h2>
                  <p className="text-xs text-slate-400 font-medium capitalize truncate">
                    {activeContactDetails.businessType || 'Customer'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Voice Call"><FiPhone /></button>
                <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Video Call"><FiVideo /></button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>*/}
                {/* <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Info"><FiInfo /></button>
                <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="More Options"><FiMoreVertical /></button> */}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              <div className="text-center">
                <span className="text-xs font-medium text-slate-500 bg-black/20 px-3 py-1 rounded-full border border-white/5">Today</span>
              </div>
              
              {messages.map((msg) => {
                const senderId = typeof msg.sender === 'object' ? (msg.sender?._id || msg.sender?.userId) : (msg.senderId || msg.sender || msg.from);
                const receiverId = typeof msg.receiver === 'object' ? (msg.receiver?._id || msg.receiver?.userId) : (msg.receiverId || msg.receiver || msg.to);
                
                let isMe = true;
                if (senderId) {
                  isMe = String(senderId) !== String(activeContact);
                } else if (receiverId) {
                  isMe = String(receiverId) === String(activeContact);
                }
                
                return (
                <div key={msg._id || msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-auto">
                        {activeContactDetails.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl max-w-full ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' 
                            : 'bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-[13px] sm:text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">{msg.message || msg.text}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1.5 mx-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] font-medium text-slate-500">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.time || '')}
                        </span>
                        {isMe && (
                          <span className={`text-sm ${msg.isRead || msg.read || msg.status === 'read' || msg.status === 'seen' ? 'text-blue-400' : 'text-slate-500'}`} title={msg.isRead || msg.read || msg.status === 'read' || msg.status === 'seen' ? "Read" : "Sent"}>
                            {(msg.isRead || msg.read || msg.status === 'read' || msg.status === 'seen') ? (
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
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/20 shrink-0">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="flex-1 bg-black/20 border border-white/10 rounded-2xl flex items-end p-1 focus-within:border-blue-500/50 focus-within:bg-black/40 shadow-inner backdrop-blur-md transition-all min-w-0">
                  <button type="button" className="p-2.5 text-slate-400 hover:text-blue-400 transition-colors shrink-0" title="Emoji">
                    <FiSmile className="text-xl" />
                  </button>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 max-h-32 bg-transparent text-white placeholder-slate-500 text-sm px-2 py-3 focus:outline-none resize-none custom-scrollbar"
                    rows="1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <button type="button" className="p-2.5 text-slate-400 hover:text-blue-400 transition-colors shrink-0" title="Attach File">
                    <FiPaperclip className="text-xl" />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!message.trim()}
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
  )
}
export default Chat