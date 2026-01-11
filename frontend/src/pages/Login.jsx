import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      onLogin(response.data.user, response.data.access_token);
      toast.success('Giriş başarılı!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1759661881353-5b9cc55e1cf4?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-effect rounded-2xl p-8 border border-slate-800/60 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-[#22c55e]/10 p-4 rounded-xl secure-glow">
              <ShieldCheck className="w-12 h-12 text-[#22c55e]" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-center mb-2 heading-font tracking-tight">
            Güvenli İletişim
          </h1>
          <p className="text-slate-400 text-center mb-8 text-sm">
            End-to-End Şifreli Mesajlaşma Sistemi
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">
                Kullanıcı Adı
              </Label>
              <Input
                id="username"
                data-testid="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-800 focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 placeholder:text-slate-600"
                placeholder="Kullanıcı adınızı girin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Şifre
              </Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-800 focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 placeholder:text-slate-600"
                placeholder="Şifrenizi girin"
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a] secure-glow font-semibold py-6 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Güvenli Giriş
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-2 justify-center text-xs text-slate-500 mono-font">
            <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
            <span>256-bit AES Şifreleme Aktif</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
