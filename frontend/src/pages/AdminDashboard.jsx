import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, ShieldCheck, Plus, Trash2, LogOut, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    security_passphrase: '',
    role: 'user',
  });

  const token = localStorage.getItem('token');
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, newUser, config);
      toast.success('Kullanıcı başarıyla oluşturuldu');
      setShowCreateUser(false);
      setNewUser({ username: '', password: '', security_passphrase: '', role: 'user' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı oluşturulamadı');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API}/users/${userId}`, config);
      toast.success('Kullanıcı silindi');
      fetchUsers();
      fetchMetadata();
    } catch (error) {
      toast.error('Kullanıcı silinemedi');
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
                Admin Kontrol Paneli
              </h1>
              <p className="text-slate-400">Sistem yönetimi ve güvenlik gözetimi</p>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-slate-100">Kullanıcı Yönetimi</CardTitle>
                  <CardDescription className="text-slate-400">Tüm kullanıcıları görüntüle ve yönet</CardDescription>
                </div>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-user-button" className="bg-[#22c55e] text-black hover:bg-[#16a34a]">
                      <Plus className="w-4 h-4 mr-2" />
                      Yeni Kullanıcı
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800">
                    <DialogHeader>
                      <DialogTitle className="text-slate-100">Yeni Kullanıcı Oluştur</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-slate-300">Kullanıcı Adı</Label>
                          <Input
                            id="username"
                            data-testid="new-user-username-input"
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                            required
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-slate-300">Şifre</Label>
                          <Input
                            id="password"
                            data-testid="new-user-password-input"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            required
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="passphrase" className="text-slate-300">Güvenli Kelime</Label>
                          <Input
                            id="passphrase"
                            data-testid="new-user-passphrase-input"
                            value={newUser.security_passphrase}
                            onChange={(e) => setNewUser({ ...newUser, security_passphrase: e.target.value })}
                            required
                            className="bg-slate-800 border-slate-700"
                            placeholder="Kurtarma için güvenli kelime"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-slate-300">Rol</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                          >
                            <SelectTrigger data-testid="new-user-role-select" className="bg-slate-800 border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="user">Kullanıcı</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" data-testid="create-user-submit-button" className="bg-[#22c55e] text-black hover:bg-[#16a34a]">
                          Oluştur
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
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
                            {u.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}
                          </p>
                        </div>
                      </div>
                      {u.id !== user.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`delete-user-${u.id}`}
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
          </div>
        </div>
      </motion.div>
    </div>
  );
}
