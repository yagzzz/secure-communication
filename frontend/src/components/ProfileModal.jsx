import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, User, Save, Copy, Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfilePictureSelector from '@/components/ProfilePictureSelector';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const SOUTH_PARK_CHARS = {
  cartman: { name: 'Cartman', emoji: '🤡' },
  kyle: { name: 'Kyle', emoji: '🟢' },
  stan: { name: 'Stan', emoji: '👨' },
  kenny: { name: 'Kenny', emoji: '🟡' }
};

export default function ProfileModal({ user, onClose, config }) {
  const [bio, setBio] = useState(user.bio || '');
  const [character, setCharacter] = useState(user.profile_character || 'cartman');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');

  const handleCopyKurdCode = () => {
    if (user.kurd_code) {
      navigator.clipboard.writeText(user.kurd_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('KURD Kodu kopyalandı!');
    }
  };

  const handleAddFriend = async () => {
    if (!friendCode.trim()) {
      toast.error('Lütfen KURD kodunu girin');
      return;
    }

    setAddingFriend(true);
    try {
      const response = await axios.post(
        `${API}/users/add-by-kurd/${friendCode.toUpperCase()}`,
        {},
        config
      );
      toast.success(`✅ ${response.data.user.username} arkadaş eklendi!`);
      setFriendCode('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Arkadaş eklenemedi');
    } finally {
      setAddingFriend(false);
    }
  };

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

  const handleChangeCharacter = async (newCharacter) => {
    try {
      await axios.patch(
        `${API}/users/character?character=${newCharacter}`,
        {},
        config
      );
      setCharacter(newCharacter);
      toast.success(`✅ Karakter ${SOUTH_PARK_CHARS[newCharacter].name} olarak değiştirildi!`);
    } catch (error) {
      toast.error('Karakter değiştirilemedi');
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
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100 heading-font">Profil Ayarları</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="info">Bilgiler</TabsTrigger>
            <TabsTrigger value="character">Karakter</TabsTrigger>
            <TabsTrigger value="picture">Resim</TabsTrigger>
            <TabsTrigger value="friends">Arkadaşlar</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-6">
            <div className="flex flex-col items-center mb-6">
              <Avatar className="w-32 h-32 border-4 border-[#22c55e]">
                <AvatarImage src={user.profile_picture ? BACKEND_URL + user.profile_picture : null} />
                <AvatarFallback className="bg-slate-800 text-4xl">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
          </TabsContent>

          {/* Character Tab */}
          <TabsContent value="character" className="space-y-4 mt-6">
            <p className="text-sm text-slate-400">Profil karakterinizi seçin</p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(SOUTH_PARK_CHARS).map(([key, value]) => (
                <motion.button
                  key={key}
                  onClick={() => handleChangeCharacter(key)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-3 rounded-lg font-bold transition-all ${
                    character === key
                      ? 'bg-[#22c55e] text-black border-2 border-[#16a34a] ring-2 ring-[#22c55e]'
                      : 'bg-slate-800 text-slate-300 border-2 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="text-3xl">{value.emoji}</div>
                  <div className="text-xs mt-1">{value.name}</div>
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">💡 Netflix'deki gibi karakter seç!</p>
          </TabsContent>

          {/* Picture Tab */}
          <TabsContent value="picture" className="space-y-4 mt-6">
            <ProfilePictureSelector 
              currentCharacter={character}
              onSelectCharacter={handleChangeCharacter}
              config={config}
            />
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4 mt-6">
            {/* PUBLIC HANDLE */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-[#22c55e]" />
                Public Handle
              </Label>
              <div className="flex gap-2">
                <Input
                  value={formatPublicHandle(user.user_code || '', settings.kurdPrefixEnabled)}
                  disabled
                  className="bg-slate-800 border-slate-700 text-[#22c55e] font-mono font-bold text-lg"
                />
                <Button
                  onClick={handleCopyKurdCode}
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Paylaşmak için görünen kod - KURD öneki Settings'te değiştirilebilir
              </p>
            </div>

            {/* ADD FRIEND BY KURD */}
            <div className="space-y-2 border-t border-slate-700 pt-4">
              <Label className="text-slate-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#22c55e]" />
                Arkadaş Ekle
              </Label>
              <Input
                placeholder="Arkadaşın KURD Kodunu girin..."
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                className="bg-slate-800 border-slate-700 text-white font-mono"
              />
              <Button
                onClick={handleAddFriend}
                disabled={addingFriend || !friendCode.trim()}
                className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a]"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {addingFriend ? 'Ekleniyor...' : 'Arkadaş Ekle'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
