import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Copy, Check, Globe, Eye, Lock, Server, Shield, AlertCircle, Code, Info, Activity, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import axios from 'axios';
import { useSettings } from '@/contexts/SettingsContext';
import { useDeviceUnlock } from '@/contexts/DeviceUnlockContext';
import { useUser } from '@/contexts/UserContext';
import { formatPublicHandle, copyToClipboard } from '@/utils/identity';
import { createDebugReport } from '@/utils/debugReport';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const AdminSettings = () => {
  const { user } = useUser();
  const { settings: userSettings } = useSettings();
  const { isUnlocked } = useDeviceUnlock();
  const [systemInfo, setSystemInfo] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ status: 'unknown', lastCheck: null });
  const [copied, setCopied] = useState({});
  const [lastErrorCode, setLastErrorCode] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadSystemInfo();
    checkConnection();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/admin/metadata`, config);
      setSystemInfo(response.data);
    } catch (error) {
      setSystemInfo(null);
      setLastErrorCode('SYSTEM_INFO_UNAVAILABLE');
    }
  };

  const checkConnection = async () => {
    try {
      const start = Date.now();
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.get(`${API}/health`, config);
      const latency = Date.now() - start;
      setConnectionStatus({
        status: 'connected',
        lastCheck: new Date().toISOString(),
        latency: `${latency}ms`,
        error: null
      });
      setLastErrorCode(null);
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        lastCheck: new Date().toISOString(),
        error: error.message,
        latency: null
      });
      setLastErrorCode('BACKEND_UNREACHABLE');
    }
  };

  const handleCopy = async (text, key) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied({ ...copied, [key]: true });
      toast.success('Kopyalandı!');
      setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
    } else {
      toast.error('Kopyalama başarısız');
    }
  };

  const generateDebugReport = () => {
    const report = createDebugReport({
      appVersion: 'v1.0.0',
      environment: process.env.NODE_ENV || 'development',
      platform: navigator.platform,
      theme: userSettings.theme,
      accent: userSettings.accent,
      isUnlocked,
      lastErrorCode,
      latency: connectionStatus.latency
    });
    return JSON.stringify(report, null, 2);
  };

  const copyDebugReport = async () => {
    const report = generateDebugReport();
    const success = await copyToClipboard(report);
    if (success) {
      toast.success('📋 Debug raporu kopyalandı');
    } else {
      toast.error('Rapor kopyalanamadı');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[#22c55e]/10 p-3 rounded-lg border border-[#22c55e]/20">
            <Info className="w-6 h-6 text-[#22c55e]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Sistem Bilgileri</h2>
            <p className="text-slate-400 text-sm">Görüntüleme ve teşhis (değişiklik yapmaz)</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <TabsTrigger value="system">🖥️ Sistem</TabsTrigger>
          <TabsTrigger value="identity">🆔 Kimlik</TabsTrigger>
          <TabsTrigger value="diagnostics">🔍 Teşhis</TabsTrigger>
          <TabsTrigger value="debug">🐛 Debug</TabsTrigger>
        </TabsList>

        {/* SYSTEM INFO */}
        <TabsContent value="system" className="space-y-4 mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#22c55e]" />
                Uygulama Bilgileri
              </CardTitle>
              <CardDescription className="text-slate-400">
                Sadece görüntüleme - değişiklik yapmaz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Versiyon', value: 'v1.0.0', icon: Code },
                { label: 'Ortam', value: process.env.NODE_ENV || 'development', icon: Server },
                { label: 'Platform', value: navigator.platform, icon: Activity },
                { label: 'Tema', value: userSettings.theme === 'dark' ? 'Karanlık Mod' : 'Aydınlık Mod', icon: Eye },
                { label: 'Accent', value: userSettings.accent.toUpperCase(), icon: Eye },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 text-sm">{item.label}</span>
                    </div>
                    <span className="text-white font-mono text-sm">{item.value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" />
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-slate-300 text-xs">Backend URL</Label>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm">
                    {BACKEND_URL}
                  </div>
                  <Button
                    onClick={() => handleCopy(BACKEND_URL, 'backend_url')}
                    variant="outline"
                    className="border-slate-700"
                  >
                    {copied.backend_url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IDENTITY */}
        <TabsContent value="identity" className="space-y-4 mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#22c55e]" />
                Kimlik Bilgileri
              </CardTitle>
              <CardDescription className="text-slate-400">
                Public handle paylaşım için, internal ID teknik bağlantı için
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipProvider>
                {/* Public Handle */}
                <div className="p-4 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-slate-300 text-sm">Public Handle</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="w-4 h-4 text-slate-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Paylaşmak için görünen kod</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-3 text-[#22c55e] font-mono text-lg font-bold">
                      {formatPublicHandle(user.user_code || 'N/A', userSettings.kurdPrefixEnabled)}
                    </div>
                    <Button
                      onClick={() => handleCopy(formatPublicHandle(user.user_code || '', userSettings.kurdPrefixEnabled), 'public_handle')}
                      variant="outline"
                      className="border-slate-700"
                    >
                      {copied.public_handle ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    * KURD prefix ayarı Settings'te değiştirilebilir (sadece görünümü etkiler)
                  </p>
                </div>

                {/* Internal ID */}
                <div className="p-4 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-slate-300 text-sm">Internal ID</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="w-4 h-4 text-slate-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Bağlantı için kullanılan teknik ID</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-xs text-slate-500">İleri Düzey</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-3 text-slate-400 font-mono text-sm">
                      {user.user_code || 'N/A'}
                    </div>
                    <Button
                      onClick={() => handleCopy(user.user_code || '', 'internal_id')}
                      variant="outline"
                      className="border-slate-700"
                    >
                      {copied.internal_id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* User Info */}
                <div className="p-4 bg-slate-800/50 rounded border border-slate-700/50">
                  <Label className="text-slate-300 text-sm mb-3 block">Hesap Bilgileri</Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kullanıcı Adı</span>
                      <span className="text-white font-medium">{user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rol</span>
                      <span className="text-[#22c55e] font-medium">
                        {user.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIAGNOSTICS */}
        <TabsContent value="diagnostics" className="space-y-4 mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Bağlantı Durumu
              </CardTitle>
              <CardDescription className="text-slate-400">
                Backend bağlantı teşhisi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded border border-slate-700/50">
                <div>
                  <p className="text-sm text-slate-300 mb-1">Durum</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus.status === 'connected' ? 'bg-green-500 animate-pulse' : 
                      connectionStatus.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-white font-medium">
                      {connectionStatus.status === 'connected' ? 'Bağlı' : 
                       connectionStatus.status === 'error' ? 'Hata' : 'Bilinmiyor'}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={checkConnection}
                  variant="outline"
                  size="sm"
                  className="border-slate-700"
                >
                  Yenile
                </Button>
              </div>

              {connectionStatus.latency && (
                <div className="p-4 bg-slate-800/50 rounded border border-slate-700/50">
                  <p className="text-sm text-slate-300 mb-1">Gecikme</p>
                  <p className="text-white font-mono text-lg">{connectionStatus.latency}</p>
                </div>
              )}

              {connectionStatus.error && (
                <div className="p-4 bg-red-900/20 rounded border border-red-700/50">
                  <p className="text-sm text-red-300 mb-1">Hata</p>
                  <p className="text-red-200 text-xs font-mono">{connectionStatus.error}</p>
                </div>
              )}

              {connectionStatus.lastCheck && (
                <div className="text-xs text-slate-500 text-center">
                  Son kontrol: {new Date(connectionStatus.lastCheck).toLocaleString('tr-TR')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#22c55e]" />
                Güvenlik Durumu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: '✓ E2E Şifreleme', status: 'active' },
                { label: '✓ JWT Token Auth', status: 'active' },
                { label: '✓ CORS Koruması', status: 'active' },
                { label: window.location.protocol === 'https:' ? '✓ HTTPS Aktif' : '⚠️ HTTP (SSL Önerilir)', status: window.location.protocol === 'https:' ? 'active' : 'warning' }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded border ${
                    item.status === 'active' 
                      ? 'bg-green-900/20 border-green-700/50' 
                      : 'bg-yellow-900/20 border-yellow-700/50'
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    item.status === 'active' ? 'text-green-300' : 'text-yellow-300'
                  }`}>
                    {item.label}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEBUG */}
        <TabsContent value="debug" className="space-y-4 mt-6">
          {userSettings.debugMode ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-400" />
                  Debug Raporu
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Sorun bildirimi için tam sistem raporu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-800 rounded border border-slate-700 font-mono text-xs text-slate-300 max-h-64 overflow-y-auto">
                  <pre>{generateDebugReport()}</pre>
                </div>
                <Button
                  onClick={copyDebugReport}
                  className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a]"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Raporu Kopyala
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  Bu raporu teknik destek ekibiyle paylaşabilirsiniz
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-slate-800 border-yellow-700/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
                  <div>
                    <h3 className="text-white font-medium mb-2">Debug Modu Kapalı</h3>
                    <p className="text-slate-400 text-sm">
                      Debug raporunu görmek için Settings'ten Debug Mode'u açın
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
