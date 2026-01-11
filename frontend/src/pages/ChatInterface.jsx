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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import axios from 'axios';
import { toast } from 'sonner';
import io from 'socket.io-client';
import ProfileModal from '@/components/ProfileModal';
import StickerPicker from '@/components/StickerPicker';
import NASModal from '@/components/NASModal';
import VideoCallModal from '@/components/VideoCallModal';
import { requestNotificationPermission, notifyNewMessage, notifyIncomingCall } from '@/utils/notifications';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  
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

  useEffect(() => {
    // Mesajlar değiştiğinde HEMEN en alta git
    if (messages.length > lastMessageCount) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
      setLastMessageCount(messages.length);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, config);
      setUsers(response.data.filter((u) => u.id !== user.id));
    } catch (error) {
      toast.error('❌ Kullanıcılar yüklenemedi');
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
      setMessages(response.data);
    } catch (error) {
      toast.error('❌ Mesajlar yüklenemedi');
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

    try {
      await axios.post(`${API}/calls/start`, {
        conversation_id: selectedConversation.id,
        call_type: callType,
      }, config);
      setShowVideoCall(true);
      toast.success(`📞 ${callType === 'video' ? 'Görüntülü' : 'Sesli'} arama başlatıldı`);
    } catch (error) {
      toast.error('❌ Arama başlatılamadı');
    }
  };

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
              onClick={() => setViewingProfile(users.find(u => u.username === message.sender_username))}
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
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Sesli mesaj</span>
                {message.metadata?.file_url && (
                  <Button size="sm" variant="ghost" onClick={() => handleDownloadFile(message.metadata.file_url, 'voice.webm')}>
                    <Download className="w-3 h-3" />
                  </Button>
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
    <div className="h-screen bg-[#020617] flex flex-col md:flex-row overflow-hidden">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Sidebar */}
      <div className={`${showSidebar ? 'block' : 'hidden'} md:block w-full md:w-80 bg-slate-950/50 border-r border-slate-800/50 flex flex-col`}>
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
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredConversations.map(conv => (
              <motion.div
                key={conv.id}
                whileHover={{ x: 4 }}
                onClick={() => { setSelectedConversation(conv); setShowSidebar(false); }}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-950/30">
        {selectedConversation ? (
          <>
            <div className="glass-effect p-3 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)} className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
                <Lock className="w-5 h-5 text-[#22c55e]" />
                <div>
                  <h3 className="font-semibold text-slate-100">{getOtherParticipants(selectedConversation)}</h3>
                  <p className="text-xs text-slate-400">Şifrelenmiş mesajlaşma</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleStartCall('audio')} className="text-slate-400 hover:text-[#22c55e]">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleStartCall('video')} className="text-slate-400 hover:text-[#22c55e]">
                  <VideoIcon className="w-5 h-5" />
                </Button>
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

            <div className="glass-effect p-3 border-t border-slate-800/50">
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
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleFileSelect('image')} className="h-8 w-8 p-0">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleFileSelect('video')} className="h-8 w-8 p-0">
                    <Video className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleFileSelect('file')} className="h-8 w-8 p-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={handleSendLocation} className="h-8 w-8 p-0">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost" 
                    onClick={recording ? stopVoiceRecording : startVoiceRecording}
                    className={`h-8 w-8 p-0 ${recording ? 'text-red-500' : 'text-slate-400'}`}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowStickers(true)} className="h-8 w-8 p-0">
                    <Smile className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
                <Input
                  value={messageInput}
                  onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                  onPaste={handlePaste}
                  placeholder="Mesaj yazın..."
                  className="message-input flex-1 bg-slate-900/50 border-slate-800"
                />
                <Button type="submit" className="send-button bg-[#22c55e] text-black hover:bg-[#16a34a]">
                  <Send className="w-5 h-5" />
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
        <VideoCallModal conversation={selectedConversation} user={user} socket={socket} onClose={() => setShowVideoCall(false)} />
      )}
    </div>
  );
}
