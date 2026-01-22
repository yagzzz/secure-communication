import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Unlock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeviceUnlock } from '@/contexts/DeviceUnlockContext';
import { toast } from 'sonner';

const UnlockScreen = () => {
  const navigate = useNavigate();
  const { unlockWithPin } = useDeviceUnlock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = (e) => {
    e.preventDefault();
    setError('');

    if (!pin || pin.trim().length === 0) {
      setError('Lütfen bir PIN girin');
      return;
    }

    setUnlocking(true);

    // Simulate async unlock
    setTimeout(() => {
      const success = unlockWithPin(pin);
      
      if (success) {
        toast.success('🔓 Cihaz kilidi açıldı');
        navigate('/home');
      } else {
        setError('Geçersiz PIN');
        setUnlocking(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center border border-[#22c55e]/20">
              <Lock className="w-8 h-8 text-[#22c55e]" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white mb-2">Cihaz Kilidi</CardTitle>
              <CardDescription className="text-slate-400">
                Devam etmek için cihazınızın kilidini açın
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN girin"
                  className="bg-slate-800 border-slate-700 text-white text-center text-lg tracking-wider h-12"
                  autoFocus
                  disabled={unlocking}
                />
                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}
                <p className="text-xs text-slate-500 text-center">
                  Demo: Herhangi bir PIN girin
                </p>
              </div>

              <Button
                type="submit"
                disabled={unlocking || !pin}
                className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a] font-semibold h-12 text-base"
              >
                {unlocking ? (
                  <>
                    <Lock className="w-5 h-5 mr-2 animate-pulse" />
                    Açılıyor...
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5 mr-2" />
                    Kilidi Aç
                  </>
                )}
              </Button>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Shield className="w-4 h-4" />
                  <span>10 dakika süreyle aktif kalır</span>
                </div>
              </div>
            </form>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-[#22c55e]">💡 Bilgi</span><br />
                Cihaz kilidi authentication'dan ayrıdır. Oturum açmış olsanız bile,
                cihazınızın kilidini açmanız gerekir.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UnlockScreen;
