import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, HardDrive, Download, Trash2, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function NASModal({ onClose, user, config }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API}/nas/files`, config);
      setFiles(response.data);
    } catch (error) {
      toast.error('Dosyalar yüklenemedi');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', isPublic);
      formData.append('allowed_users', allowedUsers);

      await axios.post(`${API}/nas/upload`, formData, {
        ...config,
        headers: {
          ...config.headers,
          'Content-Type': 'multipart/form-data',
        },
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

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
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
            <div className="space-y-2">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 truncate">{file.filename}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 mono-font">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {file.is_public ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <Unlock className="w-3 h-3" /> Herkese Açık
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <Lock className="w-3 h-3" /> Özel
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(file.uploaded_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={BACKEND_URL + file.filepath}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#22c55e] hover:text-[#16a34a]"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                      {user.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(file.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
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
