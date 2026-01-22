import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import PeerIdInput from '@/components/PeerIdInput';
import { extractInternalId } from '@/utils/identity';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FindUserModal({ onClose, onUserFound, config }) {
  const [usernameOrCode, setUsernameOrCode] = useState('');
  const [securityWord, setSecurityWord] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!usernameOrCode || !securityWord) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    setSearching(true);
    try {
      const normalizedPeerId = extractInternalId(usernameOrCode);
      const usernameOrCodeParam = normalizedPeerId || usernameOrCode;
      const response = await axios.post(
        `${API}/conversations/find-user`,
        null,
        {
          params: { username_or_code: usernameOrCodeParam, security_word: securityWord },
          ...config,
        }
      );

      toast.success(`✅ ${response.data.username} bulundu!`);
      onUserFound(response.data);
      onClose();
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('❌ Kullanıcı bulunamadı');
      } else if (error.response?.status === 401) {
        toast.error('❌ Güvenlik kelimesi yanlış');
      } else {
        toast.error('❌ Bir hata oluştu');
      }
    } finally {
      setSearching(false);
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
          <h2 className="text-2xl font-bold text-slate-100 heading-font flex items-center gap-2">
            <Search className="w-6 h-6 text-[#22c55e]" />
            Kullanıcı Bul
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <PeerIdInput
            label="Kullanıcı Adı veya Kod"
            placeholder="örn: KURD-ABCD3F7Z veya kullaniciadi"
            value={usernameOrCode}
            onChange={setUsernameOrCode}
            allowNonId
          />

          <div className="space-y-2">
            <Label className="text-slate-300">Güvenlik Kelimesi</Label>
            <Input
              type="password"
              value={securityWord}
              onChange={(e) => setSecurityWord(e.target.value)}
              placeholder="Karşı tarafın güvenlik kelimesi"
              className="bg-slate-800 border-slate-700"
              required
            />
            <p className="text-xs text-slate-500">Bu bilgiyi karşı taraftan almanız gerekiyor</p>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              type="submit"
              disabled={searching}
              className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a] font-semibold py-6"
            >
              {searching ? '🔍 Aranıyor...' : '🔍 Kullanıcı Bul'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="w-full border-slate-700"
            >
              İptal
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-[#22c55e]">💡 Nasıl Çalışır?</span><br />
            1. Kullanıcının KURD kodunu veya kullanıcı adını girin<br />
            2. Güvenlik kelimesini girin (karşı taraftan alın)<br />
            3. Doğrulanırsa konuşma başlatabilirsiniz
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
