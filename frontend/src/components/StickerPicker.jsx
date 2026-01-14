import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StickerPicker({ onClose, onSelectSticker, config }) {
  const [stickers, setStickers] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStickers = async () => {
    try {
      const response = await axios.get(`${API}/stickers`, config);
      setStickers(response.data);
    } catch (error) {
      toast.error('Stickerlar yüklenemedi');
    }
  };

  const handleUploadSticker = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.split('.')[0]);

      await axios.post(`${API}/stickers/upload`, formData, {
        ...config,
        headers: {
          ...config.headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('✅ Sticker yüklendi');
      fetchStickers();
    } catch (error) {
      toast.error('Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  // Komik emoji/sticker örnekleri
  const defaultEmojis = [
    { name: 'Gülme Gözyaşı', emoji: '😂' },
    { name: 'Ağlama Kahkaha', emoji: '😭' },
    { name: 'Kalp', emoji: '❤️' },
    { name: 'Ateş', emoji: '🔥' },
    { name: 'Beğendim', emoji: '👍' },
    { name: 'Parti', emoji: '🎉' },
    { name: 'Gülen Yüz', emoji: '😃' },
    { name: 'Düşünen', emoji: '🤔' },
    { name: 'Şok', emoji: '😮' },
    { name: 'Göz Kırp', emoji: '😉' },
    { name: 'Havalı', emoji: '😎' },
    { name: 'Ağlayan', emoji: '😢' },
    { name: 'Kızgın', emoji: '😠' },
    { name: 'Kahkaha', emoji: '🤣' },
    { name: 'Türkiye', emoji: '🇹🇷' },
    { name: 'Kürdistan', emoji: '☀️💚❤️' },
    { name: 'Yıldız', emoji: '⭐' },
    { name: 'Patlama', emoji: '💥' },
    { name: 'Kafa Patlatan', emoji: '🤯' },
    { name: 'Gözler', emoji: '👀' },
    { name: 'Alkış', emoji: '👏' },
    { name: 'Güç', emoji: '💪' },
    { name: 'Şeytan', emoji: '😈' },
    { name: 'Kafayı Yemiş', emoji: '🤪' },
  ];

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
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100 heading-font flex items-center gap-2">
            <Smile className="w-6 h-6 text-[#22c55e]" />
            Sticker Seç
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

        <div className="mb-4">
          <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-[#22c55e] transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-400">
              {uploading ? 'Yükleniyor...' : 'Yeni Sticker Yükle'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadSticker}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        <ScrollArea className="h-96">
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Hazır Emojiler</h3>
            <div className="grid grid-cols-6 gap-3 mb-6">
              {defaultEmojis.map((item, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    onSelectSticker({ name: item.emoji, filepath: null });
                    onClose();
                  }}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-3xl"
                  title={item.name}
                >
                  {item.emoji}
                </motion.button>
              ))}
            </div>

            {stickers.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Özel Stickerlar</h3>
                <div className="grid grid-cols-4 gap-3">
                  {stickers.map((sticker) => (
                    <motion.button
                      key={sticker.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onSelectSticker(sticker);
                        onClose();
                      }}
                      className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <img
                        src={BACKEND_URL + sticker.filepath}
                        alt={sticker.name}
                        className="w-full h-20 object-contain"
                      />
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </motion.div>
  );
}
