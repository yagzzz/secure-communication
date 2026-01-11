import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, User, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProfileModal({ user, onClose, config }) {
  const [bio, setBio] = useState(user.bio || '');
  const [uploading, setUploading] = useState(false);

  const handleUploadProfilePicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await axios.post(`${API}/users/profile-picture`, formData, {
        ...config,
        headers: {
          ...config.headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('✅ Profil resmi güncellendi');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateBio = async () => {
    try {
      await axios.patch(`${API}/users/bio?bio=${encodeURIComponent(bio)}`, {}, config);
      toast.success('✅ Biyografi güncellendi');
    } catch (error) {
      toast.error('Güncelleme başarısız');
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
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100 heading-font">Profil</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative group">
              <Avatar className="w-32 h-32 border-4 border-[#22c55e]">
                <AvatarImage src={user.profile_picture ? BACKEND_URL + user.profile_picture : null} />
                <AvatarFallback className="bg-slate-800 text-4xl">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-6 h-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadProfilePicture}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <p className="text-sm text-slate-400 mt-2">Yükleniyor...</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Kullanıcı Adı</Label>
            <Input
              value={user.username}
              disabled
              className="bg-slate-800 border-slate-700 text-slate-400"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Rol</Label>
            <Input
              value={user.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}
              disabled
              className="bg-slate-800 border-slate-700 text-slate-400"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Biyografi</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kendiniz hakkında birkaç şey yazın..."
              className="bg-slate-800 border-slate-700 resize-none h-24"
            />
            <Button
              onClick={handleUpdateBio}
              className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a]"
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
