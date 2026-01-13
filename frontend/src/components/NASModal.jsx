import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, HardDrive, Download, Trash2, Lock, Unlock, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default function NASModal({ onClose, user, config }) {
  const [files, setFiles] = useState([]);
  const [uploaders, setUploaders] = useState({});
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState('');
  const [copiedLink, setCopiedLink] = useState({});

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API}/nas/files`, config);
      setFiles(response.data);
      
      const uploaderMap = {};
      for (const file of response.data) {
        if (!uploaderMap[file.uploaded_by]) {
          try {
            const userResponse = await axios.get(`${API}/users/${file.uploaded_by}`, config);
            uploaderMap[file.uploaded_by] = userResponse.data.username;
          } catch (e) {
            uploaderMap[file.uploaded_by] = 'Bilinmiyor';
          }
        }
      }
      setUploaders(uploaderMap);
    } catch (error) {
      toast.error('Dosyalar yüklenemedi');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_public', isPublic);
    formData.append('allowed_users', allowedUsers);

    try {
      await axios.post(`${API}/nas/upload`, formData, {
        headers: { ...config.headers, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('✅ Dosya yüklendi');
      fetchFiles();
      setAllowedUsers('');
      setIsPublic(false);
    } catch (error) {
      toast.error('Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyDownloadLink = (filepath) => {
    const fullUrl = BACKEND_URL + filepath;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink({ ...copiedLink, [filepath]: true });
    toast.success('📋 Link kopyalandı');
    setTimeout(() => setCopiedLink({ ...copiedLink, [filepath]: false }), 2000);
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;

    try {
      await axios.delete(`${API}/nas/files/${fileId}`, config);
      toast.success('🗑️ Dosya silindi');
      fetchFiles();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100 heading-font flex items-center gap-2">
            <HardDrive className="w-7 h-7 text-[#22c55e]" />
            NAS Depolama Sunucusu
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {user.role === 'admin' && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Yeni Dosya Yükle</h3>
            
            <div className="space-y-3 mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  className="data-[state=checked]:bg-[#22c55e]"
                />
                <Label className="text-sm text-slate-400">
                  {isPublic ? <Unlock className="inline w-4 h-4 mr-1" /> : <Lock className="inline w-4 h-4 mr-1" />}
                  {isPublic ? 'Herkese Açık' : 'Özel Erişim'}
                </Label>
              </div>

              {!isPublic && (
                <Input
                  placeholder="İzin verilen kullanıcı ID'leri (virgülle ayırın)"
                  value={allowedUsers}
                  onChange={(e) => setAllowedUsers(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              )}
            </div>

            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-[#22c55e] transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-400">
                {uploading ? 'Yükleniyor...' : 'Dosya Seç ve Yükle'}
              </span>
              <input
                type="file"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Dosyalar ({files.length})</h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-lg border border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-100 truncate text-lg">{file.filename}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">
                            <span className="text-[#22c55e] font-semibold">{uploaders[file.uploaded_by]}</span> tarafından yüklendi
                          </span>
                        </div>
                        <span className="text-xs text-right text-slate-400">
                          📥 {file.download_count || 0} download
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{new Date(file.uploaded_at).toLocaleDateString('tr-TR')}</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <div>
                        {file.is_public ? (
                          <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Açık
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Özel
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyDownloadLink(file.filepath)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-[#22c55e]"
                        >
                          {copiedLink[file.filepath] ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>

                        <a href={BACKEND_URL + file.filepath} download target="_blank" rel="noopener noreferrer">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#22c55e]"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>

                        {(user.role === 'admin' || user.id === file.uploaded_by) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(file.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {files.length === 0 && (
                <div className="text-center py-12">
                  <HardDrive className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">Henüz dosya yok</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </motion.div>
  );
}
