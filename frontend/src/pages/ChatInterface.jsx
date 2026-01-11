import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  Mic,
  Phone,
  VideoIcon,
  LogOut,
  ShieldCheck,
  Lock,
  Plus,
  Paperclip,
  X,
  Pin,
  Edit2,
  Smile,
  User,
  Search,
  Menu,
  HardDrive,
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ChatInterface({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem('token');
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    fetchUsers();
    fetchConversations();

    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('new_message', (message) => {
      setMessages((prev) => [...prev, message]);
      toast.success(`💬 ${message.sender_username}`);
    });

    newSocket.on('user_typing', (data) => {
      setTypingUser(data.username);
      setTimeout(() => setTypingUser(null), 3000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedConversation && socket) {
      socket.emit('join_conversation', {
        conversation_id: selectedConversation.id,
        user_id: user.id,
      });
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, config);
      setUsers(response.data.filter((u) => u.id !== user.id));
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/conversations`, config);
      setConversations(response.data);
    } catch (error) {
      toast.error('Konuşmalar yüklenemedi');
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}/messages`, config);
      setMessages(response.data);
    } catch (error) {
      toast.error('Mesajlar yüklenemedi');
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedUserId) return;

    try {
      const response = await axios.post(`${API}/conversations`, [selectedUserId], config);
      setConversations([...conversations, response.data]);
      setSelectedConversation(response.data);
      setShowNewConversation(false);
      setSelectedUserId('');
      toast.success('✅ Konuşma oluşturuldu');
    } catch (error) {
      toast.error('Konuşma oluşturulamadı');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('content', messageInput || 'Dosya paylaşıldı');
      formData.append('message_type', messageType);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/messages`,
        formData,
        {
          ...config,
          headers: {
            ...config.headers,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessages([...messages, response.data]);
      setMessageInput('');
      setSelectedFile(null);
      setMessageType('text');
    } catch (error) {
      toast.error('Mesaj gönderilemedi');
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      await axios.patch(`${API}/messages/${messageId}/pin`, {}, config);
      fetchMessages(selectedConversation.id);
      toast.success('📌 Mesaj sabitleme güncellendi');
    } catch (error) {
      toast.error('İşlem başarısız');
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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
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

  const handleSendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setMessageInput(`📍 Konum: ${location.latitude}, ${location.longitude}`);
          setMessageType('location');
          toast.success('📍 Konum alındı');
        },
        (error) => {
          toast.error('Konum alınamadı');
        }
      );
    } else {
      toast.error('Tarayıcınız konumu desteklemiyor');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(file);
        setMessageType('audio');
        toast.success('🎤 Ses kaydı tamamlandı');
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      toast.success('🎤 Kayıt başladı (10 sn)');

      setTimeout(() => {
        mediaRecorder.stop();
      }, 10000);
    } catch (error) {
      toast.error('Mikrofon erişimi reddedildi');
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

  const getOtherParticipants = (conv) => {
    return conv.participant_usernames.filter((name) => name !== user.username).join(', ') || 'Siz';
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
        data-testid={`message-${message.id}`}
      >
        <div className="flex items-end gap-2 max-w-[75%]">
          {!isSent && (
            <Avatar className="w-8 h-8 border border-slate-700">
              <AvatarImage src={getUserAvatar(message.sender_username)} />
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
            
            {message.message_type === 'location' && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{message.content}</span>
              </div>
            )}
            
            {message.message_type === 'audio' && (
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Ses kaydı</span>
              </div>
            )}
            
            {message.message_type === 'image' && (
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span className="text-sm">{message.metadata?.filename || 'Resim'}</span>
              </div>
            )}
            
            {message.message_type === 'video' && (
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span className="text-sm">{message.metadata?.filename || 'Video'}</span>
              </div>
            )}
            
            {message.message_type === 'file' && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">{message.metadata?.filename || 'Dosya'}</span>
              </div>
            )}
            
            {message.message_type === 'sticker' && message.metadata?.sticker_url && (
              <img src={BACKEND_URL + message.metadata.sticker_url} alt="sticker" className="w-32 h-32 object-contain" />
            )}
            
            {message.message_type === 'text' && (
              <p className="text-sm break-words">{message.content}</p>
            )}
            
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {message.edited && ' (düzenlendi)'}
              </p>
            </div>
            
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(message.reactions).map(([emoji, users]) => (
                  users.length > 0 && (
                    <span
                      key={emoji}
                      className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-slate-700"
                      onClick={() => handleReaction(message.id, emoji)}
                    >
                      {emoji} {users.length}
                    </span>
                  )
                ))}
              </div>
            )}
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 flex gap-1">
              <button
                onClick={() => handleReaction(message.id, '👍')}
                className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-xs"
              >
                👍
              </button>
              <button
                onClick={() => handleReaction(message.id, '❤️')}
                className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-xs"
              >
                ❤️
              </button>
              <button
                onClick={() => handleReaction(message.id, '😂')}
                className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-xs"
              >
                😂
              </button>
              <button
                onClick={() => handlePinMessage(message.id)}
                className="p-1 bg-slate-800 rounded hover:bg-slate-700"
              >
                <Pin className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-screen bg-[#020617] flex flex-col md:flex-row overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={messageType === 'image' ? 'image/*' : messageType === 'video' ? 'video/*' : '*'}
      />

      <div
        className={`${showSidebar ? 'block' : 'hidden'} md:block w-full md:w-80 bg-slate-950/50 border-r border-slate-800/50 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-[#22c55e] cursor-pointer" onClick={() => setShowProfile(true)}>
                <AvatarImage src={user.profile_picture ? BACKEND_URL + user.profile_picture : null} />
                <AvatarFallback className="bg-slate-800">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-slate-100 heading-font">{user.username}</h2>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="text-xs text-slate-400">Çevrimiçi</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user.role === 'admin' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNAS(true)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <HardDrive className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                data-testid="chat-logout-button"
                className="text-slate-400 hover:text-red-400"
              >
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

          <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
            <DialogTrigger asChild>
              <Button data-testid="new-conversation-button" className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a] font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Konuşma
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Yeni Konuşma Başlat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user-trigger" className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Kullanıcı seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={u.profile_picture ? BACKEND_URL + u.profile_picture : null} />
                            <AvatarFallback className="text-xs bg-slate-700">
                              {u.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {u.username}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateConversation}
                  data-testid="create-conversation-button"
                  className="bg-[#22c55e] text-black hover:bg-[#16a34a]"
                >
                  Oluştur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredConversations.map((conv) => (
              <motion.div
                key={conv.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedConversation(conv);
                  setShowSidebar(false);
                }}
                data-testid={`conversation-${conv.id}`}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedConversation?.id === conv.id
                    ? 'bg-slate-800 border-l-4 border-[#22c55e]'
                    : 'bg-slate-900/50 hover:bg-slate-800/70 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-slate-700">
                    <AvatarFallback className="bg-slate-700">
                      {getOtherParticipants(conv)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 text-sm truncate">
                      {getOtherParticipants(conv)}
                    </p>
                    <p className="text-xs text-slate-500 mono-font">
                      {conv.last_message_at
                        ? new Date(conv.last_message_at).toLocaleDateString('tr-TR')
                        : 'Yeni'}
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
            <span>End-to-End Şifreli</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-950/30">
        {selectedConversation ? (
          <>
            <div className="glass-effect p-3 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="md:hidden text-slate-400"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Lock className="w-5 h-5 text-[#22c55e]" />
                <div>
                  <h3 className="font-semibold text-slate-100">{getOtherParticipants(selectedConversation)}</h3>
                  <p className="text-xs text-slate-400">Şifrelenmiş mesajlaşma</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="start-audio-call-button"
                  className="text-slate-400 hover:text-[#22c55e]"
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="start-video-call-button"
                  className="text-slate-400 hover:text-[#22c55e]"
                >
                  <VideoIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 message-scroll">
              <div className="space-y-2">
                {messages.map(renderMessage)}
                {typingUser && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-slate-500 italic flex items-center gap-2"
                  >
                    <span>{typingUser} yazıyor</span>
                    <span className="flex gap-1">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>.</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>.</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>.</motion.span>
                    </span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="glass-effect p-3 border-t border-slate-800/50">
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2 flex items-center gap-2 p-2 bg-slate-800 rounded-lg"
                >
                  <Paperclip className="w-4 h-4 text-[#22c55e]" />
                  <span className="text-sm text-slate-300 flex-1 truncate">{selectedFile.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-400 hover:text-red-400 h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFileSelect('image')}
                    data-testid="attach-image-button"
                    className="text-slate-400 hover:text-[#22c55e] h-8 w-8 p-0"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFileSelect('video')}
                    data-testid="attach-video-button"
                    className="text-slate-400 hover:text-[#22c55e] h-8 w-8 p-0"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFileSelect('file')}
                    data-testid="attach-file-button"
                    className="text-slate-400 hover:text-[#22c55e] h-8 w-8 p-0"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleSendLocation}
                    data-testid="send-location-button"
                    className="text-slate-400 hover:text-[#22c55e] h-8 w-8 p-0"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={startRecording}
                    data-testid="record-audio-button"
                    className="text-slate-400 hover:text-[#22c55e] h-8 w-8 p-0"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowStickers(true)}
                    className="text-slate-400 hover:text-[#22c55e] h-8 w-8 p-0"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  data-testid="message-input"
                  placeholder="Mesaj yazın..."
                  className="flex-1 bg-slate-900/50 border-slate-800 focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 h-10"
                />
                <Button
                  type="submit"
                  data-testid="send-message-button"
                  className="bg-[#22c55e] text-black hover:bg-[#16a34a] secure-glow h-10 w-10 p-0"
                >
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
              <p className="text-slate-600 text-sm mt-2">veya yeni bir tane oluşturun</p>
            </div>
          </div>
        )}
      </div>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} config={config} />}
      {showStickers && (
        <StickerPicker
          onClose={() => setShowStickers(false)}
          onSelectSticker={(sticker) => {
            setMessageType('sticker');
            setMessageInput(sticker.name);
            setShowStickers(false);
          }}
          config={config}
        />
      )}
      {showNAS && <NASModal onClose={() => setShowNAS(false)} user={user} config={config} />}
    </div>
  );
}
