import React, { useState } from 'react';
import { FiSearch, FiSend, FiPaperclip, FiMoreVertical, FiPhone, FiVideo, FiSmile, FiInfo, FiArrowLeft } from 'react-icons/fi';

const Chat = () => {
  const [activeContact, setActiveContact] = useState(null);
  const [message, setMessage] = useState('');

  // Mock data
  const contacts = [
    { id: 1, name: 'Alice Smith', avatar: 'A', lastMessage: 'Thanks for your help!', time: '10:42 AM', unread: 2, online: true },
    { id: 2, name: 'Bob Jones', avatar: 'B', lastMessage: 'When will my order arrive?', time: '09:15 AM', unread: 0, online: false },
    { id: 3, name: 'Charlie Davis', avatar: 'C', lastMessage: 'I need a refund.', time: 'Yesterday', unread: 1, online: true },
    { id: 4, name: 'Diana Evans', avatar: 'D', lastMessage: 'Great products!', time: 'Yesterday', unread: 0, online: false },
  ];

  const messages = [
    { id: 1, sender: 'Alice Smith', text: 'Hi, I have a question about my recent order.', time: '10:30 AM', isMe: false },
    { id: 2, sender: 'Me', text: 'Hello Alice! I\'d be happy to help. What is your order number?', time: '10:32 AM', isMe: true },
    { id: 3, sender: 'Alice Smith', text: 'It\'s #123456789.', time: '10:35 AM', isMe: false },
    { id: 4, sender: 'Me', text: 'Let me check that for you. One moment please.', time: '10:36 AM', isMe: true },
    { id: 5, sender: 'Alice Smith', text: 'Thanks for your help!', time: '10:42 AM', isMe: false },
  ];

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      // Add logic to send message
      setMessage('');
    }
  };

  const activeContactDetails = contacts.find(c => c.id === activeContact);

  return (
    <div className="relative flex h-[calc(100vh-8rem)] z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      {/* <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div> */}
      
      <div className="flex w-full h-full bg-transparent backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
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
              key={contact.id} 
              onClick={() => setActiveContact(contact.id)}
              className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${activeContact === contact.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-transparent border border-transparent'}`}
            >
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner ${activeContact === contact.id ? 'bg-blue-600' : 'bg-slate-700'}`}>
                  {contact.avatar}
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`font-bold truncate ${activeContact === contact.id ? 'text-white' : 'text-slate-200'}`}>
                    {contact.name}
                  </h3>
                  <span className="text-xs text-slate-500 shrink-0 ml-2">{contact.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-sm truncate ${contact.unread && activeContact !== contact.id ? 'text-white font-semibold' : 'text-slate-400'}`}>
                    {contact.lastMessage}
                  </p>
                  {contact.unread > 0 && activeContact !== contact.id && (
                    <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                      {contact.unread}
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
                    {activeContactDetails.avatar}
                  </div>
                  {activeContactDetails.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-white">{activeContactDetails.name}</h2>
                  <p className="text-xs text-emerald-400 font-medium">
                    {activeContactDetails.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Voice Call"><FiPhone /></button>
                <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Video Call"><FiVideo /></button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Info"><FiInfo /></button>
                <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="More Options"><FiMoreVertical /></button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="text-center">
                <span className="text-xs font-medium text-slate-500 bg-black/20 px-3 py-1 rounded-full border border-white/5">Today</span>
              </div>
              
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[75%] ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!msg.isMe && (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-auto">
                        {activeContactDetails.avatar}
                      </div>
                    )}
                    <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`px-4 py-2.5 rounded-2xl ${
                          msg.isMe 
                            ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' 
                            : 'bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 mt-1.5 mx-1">{msg.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="flex-1 bg-black/20 border border-white/10 rounded-2xl flex items-end p-1 focus-within:border-blue-500/50 focus-within:bg-black/40 shadow-inner backdrop-blur-md transition-all">
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
                  className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 shrink-0"
                >
                  <FiSend className="text-xl ml-1" />
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