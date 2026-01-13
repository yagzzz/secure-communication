import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Copy, Check, Globe, Eye, Lock, Zap, Bell, Database, Server, Shield, Gauge, AlertCircle, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const AdminSettings = ({ user }) => {
  const [settings, setSettings] = useState({
    app_title: 'EncrypTalk',
    app_description: 'End-to-End Şifreli Güvenli Mesajlaşma',
    primary_color: '#22c55e',
    secondary_color: '#020617',
    max_upload_size: 50,
    enable_notifications: true,
    enable_call_logs: true,
    enable_message_search: true,
    enable_encryption: true,
    enable_read_receipts: true,
    retention_days: 30,
    max_group_members: 100,
  });
  const [copied, setCopied] = useState({});
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/admin/settings`, config);
      setSettings(response.data);
    } catch (error) {
      console.log('Backend ayarları yüklenemedi, yerel ayarlar kullanılıyor');
      const saved = localStorage.getItem('admin_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...settings,
        max_upload_size: parseInt(settings.max_upload_size),
        retention_days: parseInt(settings.retention_days),
        max_group_members: parseInt(settings.max_group_members),
      };
      await axios.put(`${API}/admin/settings`, payload, config);
      localStorage.setItem('admin_settings', JSON.stringify(settings));
      toast.success('✅ Ayarlar kaydedildi ve sistem uygulandı');
    } catch (error) {
      console.error('Hata:', error);
      toast.error(error.response?.data?.detail || 'Ayarlar kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#22c55e]/10 p-3 rounded-lg border border-[#22c55e]/20">
              <Settings className="w-8 h-8 text-[#22c55e]" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Admin Kontrol Paneli</h1>
              <p className="text-slate-400 mt-1">Sistem konfigürasyonu, güvenlik ve izleme</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-900/50 border border-slate-800 rounded-lg">
            <TabsTrigger value="branding">🎨 Branding</TabsTrigger>
            <TabsTrigger value="features">⚡ Özellikler</TabsTrigger>
            <TabsTrigger value="security">🔒 Güvenlik</TabsTrigger>
            <TabsTrigger value="system">🖥️ Sistem</TabsTrigger>
            <TabsTrigger value="info">ℹ️ Bilgi</TabsTrigger>
          </TabsList>

          {/* BRANDING */}
          <TabsContent value="branding" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#22c55e]" />
                    Uygulama Özellikleri
                  </CardTitle>
                  <CardDescription>Uygulamanın adı ve açıklaması</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <Label className="text-slate-300 font-semibold">Uygulama Adı</Label>
                    <Input
                      value={settings.app_title}
                      onChange={(e) => setSettings({...settings, app_title: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 font-semibold">Açıklama</Label>
                    <Input
                      value={settings.app_description}
                      onChange={(e) => setSettings({...settings, app_description: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-700">
                    <div>
                      <Label className="text-slate-300 font-semibold">Ana Renk</Label>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="color"
                          value={settings.primary_color}
                          onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                          className="w-14 h-10 rounded border border-slate-700 cursor-pointer"
                        />
                        <Input
                          value={settings.primary_color}
                          onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                          className="flex-1 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                        />
                        <Button
                          onClick={() => handleCopy(settings.primary_color, 'primary')}
                          variant="outline"
                          className="border-slate-700"
                        >
                          {copied.primary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300 font-semibold">İkincil Renk</Label>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="color"
                          value={settings.secondary_color}
                          onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                          className="w-14 h-10 rounded border border-slate-700 cursor-pointer"
                        />
                        <Input
                          value={settings.secondary_color}
                          onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                          className="flex-1 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                        />
                        <Button
                          onClick={() => handleCopy(settings.secondary_color, 'secondary')}
                          variant="outline"
                          className="border-slate-700"
                        >
                          {copied.secondary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* FEATURES */}
          <TabsContent value="features" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#22c55e]" />
                    Özellik Kontrolleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {[
                    { key: 'enable_notifications', label: '🔔 Bildirimler' },
                    { key: 'enable_call_logs', label: '📞 Çağrı Günlükleri' },
                    { key: 'enable_message_search', label: '🔍 Mesaj Arama' },
                    { key: 'enable_encryption', label: '🔐 Şifreleme' },
                    { key: 'enable_read_receipts', label: '✅ Okundu Belirteci' },
                  ].map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded border border-slate-700"
                    >
                      <span className="text-white font-semibold">{feature.label}</span>
                      <input
                        type="checkbox"
                        checked={settings[feature.key]}
                        onChange={(e) => setSettings({...settings, [feature.key]: e.target.checked})}
                        className="w-6 h-6 cursor-pointer accent-[#22c55e]"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-white">İleri Ayarlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label className="text-slate-300 font-semibold">Max Yükleme (MB)</Label>
                    <Input
                      type="number"
                      value={settings.max_upload_size}
                      onChange={(e) => setSettings({...settings, max_upload_size: parseInt(e.target.value) || 50})}
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                      min="1"
                      max="500"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 font-semibold">Mesaj Bekletme (Gün)</Label>
                    <Input
                      type="number"
                      value={settings.retention_days}
                      onChange={(e) => setSettings({...settings, retention_days: parseInt(e.target.value) || 30})}
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                      min="1"
                      max="365"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 font-semibold">Max Grup Üyeleri</Label>
                    <Input
                      type="number"
                      value={settings.max_group_members}
                      onChange={(e) => setSettings({...settings, max_group_members: parseInt(e.target.value) || 100})}
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                      min="2"
                      max="1000"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* SECURITY */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#22c55e]" />
                    Güvenlik
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    '✓ E2E Şifreleme Etkin',
                    '✓ Argon2 Şifre Hashing',
                    '✓ JWT Token Doğrulaması',
                    '✓ CORS Koruması'
                  ].map((item, i) => (
                    <div key={i} className="bg-green-900/20 border border-green-700/50 rounded p-3">
                      <p className="text-green-300 text-sm font-semibold">{item}</p>
                    </div>
                  ))}

                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-4 mt-4">
                    <p className="text-yellow-300 text-sm font-semibold">⚠️ SSL/TLS Kullanın</p>
                    <p className="text-yellow-200/70 text-xs mt-1">Production ortamında HTTPS şifreli bağlantı kullanılmalıdır.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* SYSTEM */}
          <TabsContent value="system" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-400" />
                    API Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-slate-300 font-semibold text-sm">Backend URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={BACKEND_URL}
                        readOnly
                        className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                      />
                      <Button
                        onClick={() => handleCopy(BACKEND_URL, 'api')}
                        variant="outline"
                        className="border-slate-700"
                      >
                        {copied.api ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
                    <div className="bg-slate-800/50 p-3 rounded">
                      <p className="text-slate-400 text-xs">Health</p>
                      <p className="text-white font-mono text-sm mt-1">/api/health</p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded">
                      <p className="text-slate-400 text-xs">WebSocket</p>
                      <p className="text-white font-mono text-sm mt-1">ws://localhost:8001</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* INFO */}
          <TabsContent value="info" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-white">Sistem Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {[
                    ['Uygulama', 'EncrypTalk v1.0.0', '#22c55e'],
                    ['API', 'v1.0.0', '#22c55e'],
                    ['Database', 'MongoDB', '#3b82f6'],
                    ['WebSocket', 'Socket.IO', '#10b981'],
                    ['Tema', 'Cyberpunk Dark', '#a855f7'],
                    ['Admin', user?.username || 'N/A', '#64748b']
                  ].map((info, i) => (
                    <div key={i} className="flex justify-between p-3 bg-slate-800/50 rounded">
                      <span className="text-slate-300">{info[0]}</span>
                      <span className="font-mono font-bold" style={{ color: info[2] }}>{info[1]}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex justify-end gap-4"
        >
          <Button
            onClick={handleSaveSettings}
            disabled={loading}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold gap-2 px-8"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminSettings;
