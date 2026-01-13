import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// South Park Karakterler (Gerçek resimler referansları)
const SOUTH_PARK_OPTIONS = {
  stan: {
    name: 'Stan',
    color: 'from-blue-600 to-red-600',
    emoji: '👨‍🎓'
  },
  kyle: {
    name: 'Kyle',
    color: 'from-green-600 to-yellow-500',
    emoji: '🟢'
  },
  cartman: {
    name: 'Cartman',
    color: 'from-orange-600 to-red-500',
    emoji: '🤡'
  },
  kenny: {
    name: 'Kenny',
    color: 'from-green-700 to-yellow-600',
    emoji: '🟡'
  }
};

// Ek profil seçenekleri (gönderilen resimler)
const EXTRA_OPTIONS = [
  { id: 'extra1', name: 'Custom 1', emoji: '😎' },
  { id: 'extra2', name: 'Custom 2', emoji: '🎭' },
  { id: 'extra3', name: 'Custom 3', emoji: '🎪' },
  { id: 'extra4', name: 'Custom 4', emoji: '🎨' },
];

export default function ProfilePictureSelector({ currentCharacter, onSelectCharacter, config }) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('characters');

  const handleUploadCustomPicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya çok büyük (Max 5MB)');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/users/profile-picture`, formData, {
        headers: { ...config.headers, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('✅ Profil resmi yüklendi');
      // Refresh page to see new picture
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('characters')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'characters'
              ? 'border-[#22c55e] text-[#22c55e]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          South Park Karakterleri
        </button>
        <button
          onClick={() => setActiveTab('extras')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'extras'
              ? 'border-[#22c55e] text-[#22c55e]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Ekstra Seçenekler
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-[#22c55e] text-[#22c55e]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Yükle
        </button>
      </div>

      {/* South Park Karakterleri */}
      {activeTab === 'characters' && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(SOUTH_PARK_OPTIONS).map(([key, option]) => (
            <motion.button
              key={key}
              onClick={() => onSelectCharacter(key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-lg border-2 transition-all ${
                currentCharacter === key
                  ? 'border-[#22c55e] bg-slate-800/80 ring-2 ring-[#22c55e]'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              <div className={`text-4xl mb-2 bg-gradient-to-br ${option.color} bg-clip-text text-transparent`}>
                {option.emoji}
              </div>
              <div className="text-sm font-medium text-slate-200">{option.name}</div>
              {currentCharacter === key && (
                <div className="text-xs text-[#22c55e] mt-1">✓ Seçili</div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Ekstra Seçenekler */}
      {activeTab === 'extras' && (
        <div className="grid grid-cols-2 gap-3">
          {EXTRA_OPTIONS.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => onSelectCharacter(option.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-lg border-2 transition-all ${
                currentCharacter === option.id
                  ? 'border-[#22c55e] bg-slate-800/80 ring-2 ring-[#22c55e]'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              <div className="text-4xl mb-2">{option.emoji}</div>
              <div className="text-sm font-medium text-slate-200">{option.name}</div>
              {currentCharacter === option.id && (
                <div className="text-xs text-[#22c55e] mt-1">✓ Seçili</div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Yükle */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Kendi profil resminizi yükleyin. PNG, JPG veya GIF (Max 5MB)
          </p>
          <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-[#22c55e] transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-400">
              {uploading ? 'Yükleniyor...' : 'Resim Seç ve Yükle'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadCustomPicture}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <p className="text-xs text-slate-500">
            💡 İpucu: Yüklenen resim hemen uygulanır
          </p>
        </div>
      )}
    </div>
  );
}
