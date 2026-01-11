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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { toast } from 'sonner';
import io from 'socket.io-client';
import VideoCallModal from '@/components/VideoCallModal';

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
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [messageType, setMessageType] = useState('text');
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
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('new_message', (message) => {
      setMessages((prev) => [...prev, message]);
      toast.success(`Yeni mesaj: ${message.sender_username}`);
    });

    newSocket.on('user_typing', (data) => {
      setTypingUser(data.username);
      setTimeout(() => setTypingUser(null), 3000);
    });

    newSocket.on('call_start', (data) => {
      if (data.caller_id !== user.id) {
        setIncomingCall(data);
      }
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
      const response = await axios.post(
        `${API}/conversations`,
        [selectedUserId],
        config
      );
      setConversations([...conversations, response.data]);
      setSelectedConversation(response.data);
      setShowNewConversation(false);
      setSelectedUserId('');
      toast.success('Konuşma oluşturuldu');
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
      toast.success(`Dosya seçildi: ${file.name}`);
    }
  };

  const handleStartCall = async (callType) => {
    if (!selectedConversation) return;

    try {
      await axios.post(
        `${API}/calls/start`,
        {
          conversation_id: selectedConversation.id,
          call_type: callType,
        },
        config
      );
      setShowVideoCall(true);
    } catch (error) {
      toast.error('Arama başlatılamadı');
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
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setMessageInput(`Konum: ${location.latitude}, ${location.longitude}`);
          setMessageType('location');
          toast.success('Konum alındı');
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
        toast.success('Ses kaydı tamamlandı');
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      toast.success('Ses kaydı başlatıldı...');

      setTimeout(() => {
        mediaRecorder.stop();
      }, 10000);
    } catch (error) {
      toast.error('Mikrofon erişimi reddedildi');
    }
  };

  const getOtherParticipants = (conv) => {
    return conv.participant_usernames.filter((name) => name !== user.username).join(', ') || 'Siz';
  };

  const renderMessage = (message) => {
    const isSent = message.sender_id === user.id;

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}
        data-testid={`message-${message.id}`}
      >
        <div
          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
            isSent
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/50'
          }`}
        >
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
          
          {message.message_type === 'text' && <p className="text-sm">{message.content}</p>}
          
          <p className="text-xs opacity-70 mt-1">
            {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-screen bg-[#020617] flex flex-col md:flex-row">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={messageType === 'image' ? 'image/*' : messageType === 'video' ? 'video/*' : '*'}
      />

      <div className="w-full md:w-80 bg-slate-950/50 border-r border-slate-800/50 flex flex-col">
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-100 heading-font">Mesajlar</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              data-testid="chat-logout-button"
              className="text-slate-400 hover:text-slate-200"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
            <DialogTrigger asChild>
              <Button data-testid="new-conversation-button" className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a]">
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
                        {u.username}
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
            {conversations.map((conv) => (
              <motion.div
                key={conv.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedConversation(conv)}
                data-testid={`conversation-${conv.id}`}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-slate-900/50 hover:bg-slate-800/70'
                }`}
              >
                <p className="font-medium text-slate-100 text-sm">{getOtherParticipants(conv)}</p>
                <p className="text-xs text-slate-500 mono-font">
                  {conv.last_message_at
                    ? new Date(conv.last_message_at).toLocaleDateString('tr-TR')
                    : 'Yeni konuşma'}
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-2 text-xs text-slate-500 mono-font">
            <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
            <span>End-to-End Şifreli</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-950/30">
        {selectedConversation ? (
          <>
            <div className="glass-effect p-4 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-[#22c55e]" />
                <div>
                  <h3 className="font-semibold text-slate-100">{getOtherParticipants(selectedConversation)}</h3>
                  <p className="text-xs text-slate-400">End-to-end şifreli</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartCall('audio')}
                  data-testid="start-audio-call-button"
                  className="text-slate-400 hover:text-[#22c55e]"
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartCall('video')}
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
                  <div className="text-xs text-slate-500 italic">{typingUser} yazıyor...</div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="glass-effect p-4 border-t border-slate-800/50">
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 p-2 bg-slate-800 rounded-lg">
                  <Paperclip className="w-4 h-4 text-[#22c55e]" />
                  <span className="text-sm text-slate-300 flex-1">{selectedFile.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFileSelect('image')}
                    data-testid="attach-image-button"
                    className="text-slate-400 hover:text-[#22c55e]"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFileSelect('video')}
                    data-testid="attach-video-button"
                    className="text-slate-400 hover:text-[#22c55e]"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFileSelect('file')}
                    data-testid="attach-file-button"
                    className="text-slate-400 hover:text-[#22c55e]"
                  >
                    <FileText className="w-5 h-5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleSendLocation}
                    data-testid="send-location-button"
                    className="text-slate-400 hover:text-[#22c55e]"
                  >
                    <MapPin className="w-5 h-5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={startRecording}
                    data-testid="record-audio-button"
                    className="text-slate-400 hover:text-[#22c55e]"
                  >
                    <Mic className="w-5 h-5" />
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
                  className="flex-1 bg-slate-900/50 border-slate-800 focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50"
                />
                <Button
                  type="submit"
                  data-testid="send-message-button"
                  className="bg-[#22c55e] text-black hover:bg-[#16a34a] secure-glow"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">Bir konuşma seçin veya yeni bir tane oluşturun</p>
            </div>
          </div>
        )}
      </div>

      {showVideoCall && selectedConversation && (
        <VideoCallModal
          conversation={selectedConversation}
          user={user}
          socket={socket}
          onClose={() => setShowVideoCall(false)}
        />
      )}
    </div>
  );
}
