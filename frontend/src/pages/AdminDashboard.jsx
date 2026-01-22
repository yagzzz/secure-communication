import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, ShieldCheck, LogOut, Eye, HardDrive, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { toast } from 'sonner';
import NASModal from '@/components/NASModal';
import AdminSettings from './AdminSettings';
import { useUser } from '@/contexts/UserContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { user, logout } = useUser();
  const [users, setUsers] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [showNAS, setShowNAS] = useState(false);

  const token = localStorage.getItem('token');
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  React.useEffect(() => {
    fetchUsers();
    fetchMetadata();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, config);
      setUsers(response.data);
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
    }
  };

  const fetchMetadata = async () => {
    try {
      const response = await axios.get(`${API}/admin/metadata`, config);
      setMetadata(response.data);
    } catch (error) {
      toast.error('Metadata yüklenemedi');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, config);
    } catch (_) {
      // Silent by design
    } finally {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold heading-font tracking-tight text-slate-100 mb-2">
                👑 Admin Kontrol Paneli
              </h1>
              <p className="text-slate-400">Sistem yönetimi ve güvenlik gözetimi</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowNAS(true)}
                className="bg-[#22c55e] text-black hover:bg-[#16a34a]"
              >
                <HardDrive className="w-4 h-4 mr-2" />
                NAS Depolama
              </Button>
              <Button
                onClick={handleLogout}
                data-testid="admin-logout-button"
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Toplam Kullanıcı</CardTitle>
                <Users className="h-5 w-5 text-[#22c55e]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{metadata?.total_users || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Toplam Konuşma</CardTitle>
                <MessageSquare className="h-5 w-5 text-[#3b82f6]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{metadata?.total_conversations || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Toplam Mesaj</CardTitle>
                <ShieldCheck className="h-5 w-5 text-[#22c55e]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{metadata?.total_messages || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">NAS Dosyaları</CardTitle>
                <HardDrive className="h-5 w-5 text-[#f59e0b]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{metadata?.total_nas_files || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="bg-slate-900/50 border-slate-800">
              <TabsTrigger value="users" className="data-[state=active]:bg-[#22c55e] data-[state=active]:text-black">
                Kullanıcı Yönetimi
              </TabsTrigger>
              <TabsTrigger value="metadata" className="data-[state=active]:bg-[#22c55e] data-[state=active]:text-black">
                Konuşma Metadata
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-[#22c55e] data-[state=active]:text-black">
                <Settings className="w-4 h-4 mr-2" />
                Ayarlar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-slate-100">Kullanıcı Yönetimi</CardTitle>
                    <CardDescription className="text-slate-400">Tüm kullanıcıları görüntüle ve yönet</CardDescription>
                  </div>
                  <div className="text-xs text-slate-500">
                    Okuma modu: yönetimsel değişiklikler devre dışı
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto message-scroll">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        data-testid={`user-item-${u.id}`}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover-lift"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${u.online ? 'bg-[#22c55e]' : 'bg-slate-600'}`} />
                          <div>
                            <p className="font-medium text-slate-100">{u.username}</p>
                            <p className="text-xs text-slate-400 mono-font">
                              {u.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'} • {u.user_code || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">Salt okuma</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadata" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-100">Konuşma Metadata</CardTitle>
                  <CardDescription className="text-slate-400">Mesaj içeriği gösterilmez (E2E Şifreleme)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto message-scroll">
                    {metadata?.conversation_metadata?.map((conv) => (
                      <div
                        key={conv.conversation_id}
                        data-testid={`conversation-metadata-${conv.conversation_id}`}
                        className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-100">
                            {conv.participants.join(' ↔ ')}
                          </p>
                          <Eye className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="text-xs text-slate-400 space-y-1 mono-font">
                          <p>Mesaj sayısı: {conv.message_count}</p>
                          <p>Son mesaj türü: {conv.last_message_type || 'N/A'}</p>
                          <p>Son gönderen: {conv.last_sender || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                    {!metadata?.conversation_metadata?.length && (
                      <p className="text-center text-slate-500 py-8">Henüz konuşma yok</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <AdminSettings />
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>

      {showNAS && <NASModal onClose={() => setShowNAS(false)} user={user} config={config} />}
    </div>
  );
}
