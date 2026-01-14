import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Image as ImageIcon, Video, FileText, MapPin, Mic,
  Phone, VideoIcon, LogOut, ShieldCheck, Lock, Plus, Paperclip, X, Pin,
  Smile, User, Search, Menu, HardDrive, Reply, Download, Users, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import axios from 'axios';
import { toast } from 'sonner';
import io from 'socket.io-client';
import ProfileModal from '@/components/ProfileModal';
import StickerPicker from '@/components/StickerPicker';
import NASModal from '@/components/NASModal';
import VideoCallModal from '@/components/VideoCallModal';
import MobileMenu from '@/components/MobileMenu';
import { requestNotificationPermission, notifyNewMessage, notifyIncomingCall } from '@/utils/notifications';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

export default function ChatInterface({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [messageType, setMessageType] = useState('text');
  const [showProfile, setShowProfile] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showNAS, setShowNAS] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showSidebarSheet, setShowSidebarSheet] = useState(false);
  const [showActionButtons, setShowActionButtons] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    requestNotificationPermission();
    fetchUsers();
    fetchConversations();
    initSocket();
  }, []);

  const initSocket = () => {
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket bağlandı:', newSocket.id);
      toast.success('🟢 Bağlantı kuruldu');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket bağlantısı kesildi');
      toast.error('🔴 Bağlantı kesildi');
    });

    newSocket.on('new_message', (message) => {
      console.log('📩 Yeni mesaj alındı:', message);
      setMessages((prev) => {
        // Duplicate check
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      
      if (message.sender_id !== user.id) {
        notifyNewMessage(message.sender_username, message.content);
        toast.success(`💬 ${message.sender_username}`);
      }
    });

    newSocket.on('user_typing', (data) => {
      setTypingUser(data.username);
      setTimeout(() => setTypingUser(null), 3000);
    });

    newSocket.on('call_start', (data) => {
      if (data.caller_id !== user.id) {
        notifyIncomingCall(data.caller_username, data.call_type);
        if (window.confirm(`${data.caller_username} sizi arıyor. Kabul ediyor musunuz?`)) {
          setShowVideoCall(true);
        }
      }
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  };

  useEffect(() => {
    if (selectedConversation && socket) {
      console.log('🔗 Konuşmaya katıldı:', selectedConversation.id);
      socket.emit('join_conversation', {
        conversation_id: selectedConversation.id,
        user_id: user.id,
      });
      fetchMessages(selectedConversation.id);
      
      // POLLING - 250ms'de bir mesaj kontrol et
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages(selectedConversation.id);
      }, 250);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedConversation]);

  const scrollToBottom = () => {
    // requestAnimationFrame ile daha güvenilir scroll
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  };

  useEffect(() => {
    // Mesaj sayısı değiştiğinde scroll
    if (messages.length > 0) {
      scrollToBottom();
    }
    setLastMessageCount(messages.length);
  }, [messages.length]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, config);
      setUsers(response.data.filter((u) => u.id !== user.id));
    } catch (error) {
      toast.error('❌ Kullanıcılar yüklenemedi');
    }
  };

  const getOtherUserProfile = async (userId) => {
    try {
      const response = await axios.get(`${API}/users/${userId}`, config);
      return response.data;
    } catch (error) {
      console.error('Profil yüklenemedi:', error);
      return null;
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/conversations`, config);
      setConversations(response.data);
    } catch (error) {
      toast.error('❌ Konuşmalar yüklenemedi');
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}/messages`, config);
      // Sadece yeni mesaj varsa güncelle (gereksiz render'ı önle)
      setMessages(prev => {
        const newData = response.data;
        if (JSON.stringify(prev.map(m => m.id)) !== JSON.stringify(newData.map(m => m.id))) {
          return newData;
        }
        return prev;
      });
    } catch (error) {
      // Sessiz hata - polling'de sürekli toast gösterme
      console.error('Mesaj yükleme hatası:', error);
    }
  };

  const handleCreateConversation = async (isGroup = false) => {
    if (!isGroup && selectedUserIds.length === 0) return;
    if (isGroup && (selectedUserIds.length === 0 || !groupName)) {
      toast.error('Grup adı ve üye seçin');
      return;
    }

    try {
      const payload = isGroup 
        ? { participant_ids: selectedUserIds, is_group: true, name: groupName }
        : selectedUserIds;
      
      const response = await axios.post(`${API}/conversations`, payload, config);
      setConversations([...conversations, response.data]);
      setSelectedConversation(response.data);
      setShowNewConversation(false);
      setShowNewGroup(false);
      setSelectedUserIds([]);
      setGroupName('');
      toast.success(`✅ ${isGroup ? 'Grup' : 'Konuşma'} oluşturuldu`);
    } catch (error) {
      toast.error('❌ Oluşturulamadı');
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        setSelectedFile(blob);
        setMessageType('image');
        toast.success('📋 Resim yapıştırıldı!');
        e.preventDefault();
        break;
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('content', messageInput || 'Dosya paylaşıldı');
      formData.append('message_type', messageType);
      
      if (replyingTo) {
        formData.append('metadata', JSON.stringify({ reply_to: replyingTo.id, reply_content: replyingTo.content }));
      }

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/messages`,
        formData,
        { ...config, headers: { ...config.headers, 'Content-Type': 'multipart/form-data' } }
      );

      console.log('📤 Mesaj gönderildi:', response.data);
      
      // Lokal güncelleme
      setMessages(prev => [...prev, response.data]);
      setMessageInput('');
      setSelectedFile(null);
      setMessageType('text');
      setReplyingTo(null);
      
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      toast.error('❌ Mesaj gönderilemedi');
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      await axios.patch(`${API}/messages/${messageId}/pin`, {}, config);
      fetchMessages(selectedConversation.id);
      toast.success('📌 Mesaj sabitleme güncellendi');
    } catch (error) {
      toast.error('❌ İşlem başarısız');
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await axios.post(`${API}/messages/${messageId}/react`, { emoji }, config);
      fetchMessages(selectedConversation.id);
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping && socket && selectedConversation) {
      setIsTyping(true);
      socket.emit('typing', {
        conversation_id: selectedConversation.id,
        username: user.username,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
  };

  const handleFileSelect = (type) => {
    setMessageType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`📎 ${file.name}`);
    }
  };

  const handleDownloadFile = (fileUrl, filename) => {
    const link = document.createElement('a');
    link.href = BACKEND_URL + fileUrl;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(file);
        setMessageType('audio');
        setRecording(false);
        setRecordingTime(0);
        stream.getTracks().forEach(track => track.stop());
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        toast.success('🎤 Ses kaydı tamamlandı');
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('🎤 Kayıt başladı');
    } catch (error) {
      toast.error('❌ Mikrofon erişimi reddedildi');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
    }
  };

  const handleStartCall = async (callType) => {
    if (!selectedConversation) return;
    setShowVideoCall(true);
  };

  // Gelen aramaları kontrol et
  useEffect(() => {
    if (!selectedConversation) return;
    
    const checkIncomingCalls = async () => {
      try {
        const response = await axios.get(`${API}/calls/pending/${selectedConversation.id}`, config);
        if (response.data && response.data.id && !showVideoCall) {
          setIncomingCall(response.data);
          notifyIncomingCall(response.data.caller_username, response.data.call_type);
          setShowVideoCall(true);
        }
      } catch (error) {
        // Sessiz hata
      }
    };

    const callPollInterval = setInterval(checkIncomingCalls, 2000);
    return () => clearInterval(callPollInterval);
  }, [selectedConversation, showVideoCall]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, config);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      onLogout();
    }
  };

  const handleSendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMessageInput(`📍 Konum: ${position.coords.latitude}, ${position.coords.longitude}`);
          setMessageType('location');
          toast.success('📍 Konum alındı');
        },
        () => toast.error('❌ Konum alınamadı')
      );
    } else {
      toast.error('❌ Tarayıcınız konumu desteklemiyor');
    }
  };

  const getOtherParticipants = (conv) => {
    if (conv.is_group) return conv.name || 'Grup';
    return conv.participant_usernames?.filter(name => name !== user.username).join(', ') || 'Siz';
  };

  const getUserAvatar = (username) => {
    const foundUser = users.find(u => u.username === username);
    return foundUser?.profile_picture || null;
  };

  const filteredConversations = conversations.filter(conv =>
    getOtherParticipants(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessage = (message) => {
    const isSent = message.sender_id === user.id;

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3 group`}
      >
        <div className="flex items-end gap-2 max-w-[75%]">
          {!isSent && (
            <Avatar 
              className="w-8 h-8 border border-slate-700 cursor-pointer"
              onClick={async () => {
                const otherUser = users.find(u => u.username === message.sender_username);
                if (otherUser) {
                  setViewingProfile(otherUser);
                } else if (message.sender_id) {
                  const profile = await getOtherUserProfile(message.sender_id);
                  if (profile) {
                    setViewingProfile(profile);
                  }
                }
              }}
            >
              <AvatarImage src={getUserAvatar(message.sender_username) ? BACKEND_URL + getUserAvatar(message.sender_username) : null} />
              <AvatarFallback className="bg-slate-800 text-xs">
                {message.sender_username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div
            className={`rounded-2xl px-4 py-2 relative ${
              isSent
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-sm'
                : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700/50'
            }`}
          >
            {message.pinned && (
              <div className="absolute -top-2 -right-2">
                <Pin className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>
            )}
            
            {!isSent && <p className="text-xs text-slate-400 mb-1">{message.sender_username}</p>}
            
            {message.metadata?.reply_to && (
              <div className="mb-2 p-2 bg-black/20 rounded-lg border-l-2 border-[#22c55e]">
                <p className="text-xs opacity-70">↩️ Yanıtlanan: {message.metadata.reply_content?.substring(0, 50)}</p>
              </div>
            )}
            
            {message.message_type === 'text' && <p className="text-sm break-words">{message.content}</p>}
            {message.message_type === 'location' && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{message.content}</span>
              </div>
            )}
            {message.message_type === 'audio' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  <span className="text-sm">Sesli mesaj</span>
                </div>
                {message.metadata?.file_url && (
                  <audio controls style={{ maxWidth: '250px', height: '40px' }}>
                    <source src={BACKEND_URL + message.metadata.file_url} type="audio/webm" />
                    <source src={BACKEND_URL + message.metadata.file_url} type="audio/mp3" />
                  </audio>
                )}
              </div>
            )}
            {(message.message_type === 'image' || message.message_type === 'video' || message.message_type === 'file') && (
              <div className="space-y-2">
                {message.message_type === 'image' && message.metadata?.file_url && (
                  <img 
                    src={BACKEND_URL + message.metadata.file_url} 
                    alt="shared" 
                    style={{ maxWidth: '200px', maxHeight: '200px', width: 'auto', height: 'auto' }}
                    className="rounded-lg cursor-pointer object-contain"
                    onClick={() => window.open(BACKEND_URL + message.metadata.file_url, '_blank')}
                  />
                )}
                {message.message_type === 'video' && message.metadata?.file_url && (
                  <video 
                    controls
                    style={{ maxWidth: '250px', maxHeight: '250px' }}
                    className="rounded-lg"
                  >
                    <source src={BACKEND_URL + message.metadata.file_url} />
                  </video>
                )}
                <div className="flex items-center gap-2">
                  {message.message_type === 'image' && <ImageIcon className="w-4 h-4" />}
                  {message.message_type === 'video' && <Video className="w-4 h-4" />}
                  {message.message_type === 'file' && <FileText className="w-4 h-4" />}
                  <span className="text-sm">{message.metadata?.filename || 'Dosya'}</span>
                  {message.metadata?.file_url && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDownloadFile(message.metadata.file_url, message.metadata.filename)}
                      className="h-6 px-2"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                {message.edited && ' (düzenlendi)'}
              </p>
            </div>
            
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(message.reactions).map(([emoji, userIds]) => (
                  userIds.length > 0 && (
                    <span
                      key={emoji}
                      className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-slate-700"
                      onClick={() => handleReaction(message.id, emoji)}
                    >
                      {emoji} {userIds.length}
                    </span>
                  )
                ))}
              </div>
            )}
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 flex gap-1 bg-slate-900 rounded-lg p-1">
              <button onClick={() => handleReaction(message.id, '👍')} className="p-1 hover:bg-slate-700 rounded text-xs">👍</button>
              <button onClick={() => handleReaction(message.id, '❤️')} className="p-1 hover:bg-slate-700 rounded text-xs">❤️</button>
              <button onClick={() => handleReaction(message.id, '😂')} className="p-1 hover:bg-slate-700 rounded text-xs">😂</button>
              <button onClick={() => setReplyingTo(message)} className="p-1 hover:bg-slate-700 rounded"><Reply className="w-3 h-3" /></button>
              <button onClick={() => handlePinMessage(message.id)} className="p-1 hover:bg-slate-700 rounded"><Pin className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-[100dvh] bg-[#020617] flex flex-col lg:flex-row overflow-hidden">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Mobile Header - Only visible on small screens */}
      <div className="lg:hidden bg-slate-950/50 border-b border-slate-800/50 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Sheet open={showSidebarSheet} onOpenChange={setShowSidebarSheet}>
          <SheetTrigger asChild>
            <Button size="sm" variant="ghost" className="text-slate-400">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-slate-950/50 border-slate-800/50 w-80 p-0">
            <div className="p-4 border-b border-slate-800/50 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-100">EncrypTalk</h2>
                <SheetClose asChild>
                  <Button size="sm" variant="ghost" className="text-slate-400">
                    <X className="w-4 h-4" />
                  </Button>
                </SheetClose>
              </div>
              
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-[#22c55e] cursor-pointer" onClick={() => { setShowProfile(true); setShowSidebarSheet(false); }}>
                  <AvatarImage src={user.profile_picture ? BACKEND_URL + user.profile_picture : null} />
                  <AvatarFallback className="bg-slate-800">{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{user.username}</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                    <span className="text-xs text-slate-400">Çevrimiçi</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100dvh-200px)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500" />
                <Input
                  placeholder="Konuşma ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-900/50 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-2">
                {filteredConversations.length === 0 ? (
                  <p className="text-slate-400 text-center py-8 text-sm">
                    {searchQuery ? 'Konuşma bulunamadı' : 'Henüz konuşma yok'}
                  </p>
                ) : (
                  filteredConversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        setShowSidebarSheet(false);
                      }}
                      className={`p-3 rounded cursor-pointer transition-colors text-sm ${
                        selectedConversation?.id === conv.id
                          ? 'bg-[#22c55e]/20 border border-[#22c55e]'
                          : 'bg-slate-800/50 hover:bg-slate-800'
                      }`}
                    >
                      <p className="font-medium text-slate-100 truncate">{conv.participant_usernames[0] || 'Konuşma'}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">Son mesaj...</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800/50 space-y-2">
              <Button className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a] text-sm" size="sm">
                <Plus className="w-3 h-3 mr-2" />Yeni Chat
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10 text-sm" 
                size="sm"
                onClick={() => { handleLogout(); setShowSidebarSheet(false); }}
              >
                <LogOut className="w-3 h-3 mr-2" />Çıkış
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <h1 className="text-lg font-bold text-slate-100 flex-1 text-center">EncrypTalk</h1>

        <div className="flex items-center gap-1">
          {user.role === 'admin' && (
            <Button size="sm" variant="ghost" onClick={() => setShowNAS(true)} className="text-slate-400 hover:text-[#22c55e]">
              <HardDrive className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowProfile(true)} className="text-slate-400 hover:text-[#22c55e]">
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Desktop Sidebar - Always visible on lg and above */}
      <div className="hidden lg:flex w-80 bg-slate-950/50 border-r border-slate-800/50 flex-col">
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-[#22c55e] cursor-pointer" onClick={() => setShowProfile(true)}>
                <AvatarImage src={user.profile_picture ? BACKEND_URL + user.profile_picture : null} />
                <AvatarFallback className="bg-slate-800">{user.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-slate-100 heading-font">{user.username}</h2>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-xs text-slate-400">Çevrimiçi</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user.role === 'admin' && (
                <Button size="sm" variant="ghost" onClick={() => setShowNAS(true)} className="text-slate-400">
                  <HardDrive className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-red-400">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Konuşma ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-800 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
              <DialogTrigger asChild>
                <Button className="flex-1 bg-[#22c55e] text-black hover:bg-[#16a34a] font-medium">
                  <Plus className="w-4 h-4 mr-2" />Yeni Chat
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Arkadaş Seç</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Henüz arkadaşın yok. KURD kodunla birini ekle!</p>
                  ) : (
                    conversations.map(conv => {
                      const friend = users.find(u => u.id === conv.participants.find(p => p !== user.id));
                      return friend ? (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setSelectedConversation(conv);
                            setShowNewConversation(false);
                          }}
                          className="p-3 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer transition-colors flex items-center gap-3"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={`${BACKEND_URL}/api/users/${friend.id}/profile-picture`} />
                            <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-medium">{friend.username}</p>
                            <p className="text-slate-400 text-sm">{friend.status || 'Çevrim içi'}</p>
                          </div>
                        </div>
                      ) : null;
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-700">
                  <Users className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader><DialogTitle className="text-slate-100">Yeni Grup Oluştur</DialogTitle></DialogHeader>
                <Input 
                  placeholder="Grup adı" 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {conversations.map(conv => {
                      const friend = users.find(u => u.id === conv.participants.find(p => p !== user.id));
                      return friend ? (
                        <label key={conv.id} className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedUserIds.includes(friend.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, friend.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter(id => id !== friend.id));
                              }
                            }}
                          />
                          <span className="text-slate-300">{friend.username}</span>
                        </label>
                      ) : null;
                    })}
                </div>
                <DialogFooter>
                  <Button onClick={() => handleCreateConversation(true)} className="bg-[#22c55e] text-black">Oluştur</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredConversations.map(conv => (
              <motion.div
                key={conv.id}
                whileHover={{ x: 4 }}
                onClick={() => { setSelectedConversation(conv); }}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedConversation?.id === conv.id
                    ? 'bg-slate-800 border-l-4 border-[#22c55e]'
                    : 'bg-slate-900/50 hover:bg-slate-800/70 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-slate-700">
                    <AvatarFallback className="bg-slate-700">
                      {conv.is_group ? '👥' : getOtherParticipants(conv)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 text-sm truncate">{getOtherParticipants(conv)}</p>
                    <p className="text-xs text-slate-500 mono-font">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString('tr-TR') : 'Yeni'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-slate-800/50">
          <div className="flex items-center gap-2 text-xs text-slate-500 mono-font justify-center">
            <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
            <span>E2E Şifreli</span>
          </div>
        </div>
      </div>

      {/* Tablet/Mobile Sidebar - Sheet Drawer on md screens and below */}
      <Sheet open={showSidebarSheet} onOpenChange={setShowSidebarSheet}>
        <div className="lg:hidden">
          <SheetTrigger asChild>
            <button className="fixed top-3 left-3 z-30 p-2 hover:bg-slate-800 rounded-lg lg:hidden">
              <Menu className="w-6 h-6 text-slate-300" />
            </button>
          </SheetTrigger>
        </div>
        <SheetContent side="left" className="w-80 bg-slate-950/95 border-slate-800/50 p-0 duration-300">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-10 h-10 border-2 border-[#22c55e] cursor-pointer" onClick={() => setShowProfile(true)}>
                    <AvatarImage src={user.profile_picture ? BACKEND_URL + user.profile_picture : null} />
                    <AvatarFallback className="bg-slate-800">{user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 heading-font">{user.username}</h2>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                      <span className="text-xs text-slate-400">Çevrimiçi</span>
                    </div>
                  </div>
                </div>
                <SheetClose asChild>
                  <Button size="sm" variant="ghost" className="text-slate-400">
                    <X className="w-4 h-4" />
                  </Button>
                </SheetClose>
              </div>
              <div className="flex items-center gap-1">
                {user.role === 'admin' && (
                  <Button size="sm" variant="ghost" onClick={() => setShowNAS(true)} className="text-slate-400">
                    <HardDrive className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-red-400">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="relative px-4 py-3">
              <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Konuşma ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-800 text-sm"
              />
            </div>

            <div className="flex gap-2 px-4 py-2">
              <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                <DialogTrigger asChild>
                  <Button className="flex-1 bg-[#22c55e] text-black hover:bg-[#16a34a] font-medium">
                    <Plus className="w-4 h-4 mr-2" />Yeni Chat
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader><DialogTitle className="text-slate-100">Yeni Konuşma</DialogTitle></DialogHeader>
                  <Select value={selectedUserIds[0] || ''} onValueChange={(val) => setSelectedUserIds([val])}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Kullanıcı seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <DialogFooter>
                    <Button onClick={() => handleCreateConversation(false)} className="bg-[#22c55e] text-black">Oluştur</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-slate-700">
                    <Users className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader><DialogTitle className="text-slate-100">Yeni Grup Oluştur</DialogTitle></DialogHeader>
                  <Input 
                    placeholder="Grup adı" 
                    value={groupName} 
                    onChange={(e) => setGroupName(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {users.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, u.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                            }
                          }}
                        />
                        <span className="text-slate-300">{u.username}</span>
                      </label>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => handleCreateConversation(true)} className="bg-[#22c55e] text-black">Oluştur</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {filteredConversations.map(conv => (
                  <motion.div
                    key={conv.id}
                    whileHover={{ x: 4 }}
                    onClick={() => { setSelectedConversation(conv); setShowSidebarSheet(false); }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedConversation?.id === conv.id
                        ? 'bg-slate-800 border-l-4 border-[#22c55e]'
                        : 'bg-slate-900/50 hover:bg-slate-800/70 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-slate-700">
                        <AvatarFallback className="bg-slate-700">
                          {conv.is_group ? '👥' : getOtherParticipants(conv)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-100 text-sm truncate">{getOtherParticipants(conv)}</p>
                        <p className="text-xs text-slate-500 mono-font">
                          {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString('tr-TR') : 'Yeni'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-slate-800/50">
              <div className="flex items-center gap-2 text-xs text-slate-500 mono-font justify-center">
                <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
                <span>E2E Şifreli</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-950/30 min-h-0">
        {selectedConversation ? (
          <>
            <div className="bg-slate-900 p-3 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={async () => {
                  if (!selectedConversation.is_group) {
                    const otherUserId = selectedConversation.participants.find(p => p !== user.id);
                    if (otherUserId) {
                      const profile = await getOtherUserProfile(otherUserId);
                      if (profile) setViewingProfile(profile);
                    }
                  }
                }}
              >
                <Lock style={{color: '#22c55e'}} className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold text-white text-sm">{getOtherParticipants(selectedConversation)}</h3>
                  <p className="text-xs text-slate-400">Şifrelenmiş</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleStartCall('audio')} className="p-2">
                  <Phone style={{color: '#94a3b8'}} className="w-5 h-5" />
                </button>
                <button onClick={() => handleStartCall('video')} className="p-2">
                  <VideoIcon style={{color: '#94a3b8'}} className="w-5 h-5" />
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 message-scroll">
              <div className="space-y-2">
                {messages.map(renderMessage)}
                {typingUser && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-500 italic flex items-center gap-2">
                    <span>{typingUser} yazıyor</span>
                    <span className="flex gap-1">
                      <motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 1 }}>.</motion.span>
                      <motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>.</motion.span>
                      <motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>.</motion.span>
                    </span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="message-input-container bg-slate-950 border-t border-slate-800/50 p-2 safe-area-bottom sticky bottom-0 z-10">
              {replyingTo && (
                <div className="mb-2 p-2 bg-slate-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-sm text-slate-300">↩️ {replyingTo.content.substring(0, 30)}...</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 p-2 bg-slate-800 rounded-lg">
                  <Paperclip className="w-4 h-4 text-[#22c55e]" />
                  <span className="text-sm text-slate-300 flex-1 truncate">{selectedFile.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)}><X className="w-4 h-4" /></Button>
                </div>
              )}
              {recording && (
                <div className="mb-2 p-2 bg-red-900/20 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-slate-300">Kayıt ediliyor... {recordingTime}s</span>
                  <Button size="sm" onClick={stopVoiceRecording} className="ml-auto bg-red-600">Durdur</Button>
                </div>
              )}
              
              {/* WhatsApp-style Compact Input */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-1">
                <Sheet open={showActionButtons} onOpenChange={setShowActionButtons}>
                  <SheetTrigger asChild>
                    <Button type="button" size="sm" variant="ghost" className="h-10 w-10 p-0 flex-shrink-0">
                      <Plus className="w-5 h-5 text-slate-400" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="bg-slate-950/95 border-slate-800/50 rounded-t-2xl duration-300 max-h-[60vh]">
                    <div className="w-full py-6">
                      <h3 className="text-center text-slate-100 text-sm font-medium mb-4">Seçenekler</h3>
                      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => { handleFileSelect('image'); setShowActionButtons(false); }}
                          className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          <ImageIcon className="w-8 h-8 text-blue-400" />
                          <span className="text-xs text-slate-300">Resim</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => { handleFileSelect('video'); setShowActionButtons(false); }}
                          className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          <Video className="w-8 h-8 text-purple-400" />
                          <span className="text-xs text-slate-300">Video</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => { handleFileSelect('file'); setShowActionButtons(false); }}
                          className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          <FileText className="w-8 h-8 text-yellow-400" />
                          <span className="text-xs text-slate-300">Dosya</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => { handleSendLocation(); setShowActionButtons(false); }}
                          className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          <MapPin className="w-8 h-8 text-green-400" />
                          <span className="text-xs text-slate-300">Konum</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => { recording ? stopVoiceRecording() : startVoiceRecording(); setShowActionButtons(false); }}
                          className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          <Mic className={`w-8 h-8 ${recording ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
                          <span className="text-xs text-slate-300">Ses</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => { setShowStickers(true); setShowActionButtons(false); }}
                          className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          <Smile className="w-8 h-8 text-yellow-500" />
                          <span className="text-xs text-slate-300">Stiker</span>
                        </motion.button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <Input
                  value={messageInput}
                  onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                  onPaste={handlePaste}
                  placeholder="Mesaj..."
                  className="flex-1 h-10 text-sm bg-slate-900/70 border-slate-700 rounded-full px-4 focus:bg-slate-900"
                />
                <Button type="submit" size="sm" className="h-10 w-10 p-0 flex-shrink-0 rounded-full bg-[#22c55e] text-black hover:bg-[#16a34a] transition-colors">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-20 h-20 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Bir konuşma seçin</p>
            </div>
          </div>
        )}
      </div>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} config={config} />}
      {viewingProfile && <ProfileModal user={viewingProfile} onClose={() => setViewingProfile(null)} config={config} viewOnly />}
      {showStickers && <StickerPicker onClose={() => setShowStickers(false)} onSelectSticker={(s) => { setMessageInput(s.emoji || s.name); setShowStickers(false); }} config={config} />}
      {showNAS && <NASModal onClose={() => setShowNAS(false)} user={user} config={config} />}
      {showVideoCall && selectedConversation && (
        <VideoCallModal 
          conversation={selectedConversation} 
          user={user} 
          socket={socket} 
          incomingCall={incomingCall}
          onClose={() => { setShowVideoCall(false); setIncomingCall(null); }} 
        />
      )}
    </div>
  );
}
