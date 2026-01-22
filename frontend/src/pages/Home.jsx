import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, Copy, Check, ArrowRight, Info, User, MessageCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { useMyInternalId } from '@/hooks/useMyInternalId';
import { formatPublicHandle, extractInternalId, copyToClipboard } from '@/utils/identity';
import { useUser } from '@/contexts/UserContext';
import PeerIdInput from '@/components/PeerIdInput';

const Home = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user } = useUser();
  const myInternalId = useMyInternalId();
  const [peerInput, setPeerInput] = useState('');
  const [peerValid, setPeerValid] = useState(false);
  const [copied, setCopied] = useState({ public: false, internal: false });

  const handleCopyPublicHandle = async () => {
    if (!myInternalId) return;
    const publicHandle = formatPublicHandle(myInternalId, settings.kurdPrefixEnabled);
    const success = await copyToClipboard(publicHandle);
    if (success) {
      setCopied({ ...copied, public: true });
      setTimeout(() => setCopied({ ...copied, public: false }), 2000);
      toast.success('📋 Public Handle kopyalandı');
    }
  };

  const handleCopyInternalId = async () => {
    if (!myInternalId) return;
    const success = await copyToClipboard(myInternalId);
    if (success) {
      setCopied({ ...copied, internal: true });
      setTimeout(() => setCopied({ ...copied, internal: false }), 2000);
      toast.success('📋 Internal ID kopyalandı');
    }
  };

  const handleConnect = () => {
    if (!peerInput || peerInput.trim().length === 0) {
      toast.error('Lütfen bir Peer ID girin');
      return;
    }

    const validPeerId = extractInternalId(peerInput);

    if (!validPeerId) {
      toast.error('Geçersiz Peer ID formatı');
      return;
    }

    // Navigate to chat with peer query param
    navigate(`/chat?peer=${validPeerId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#22c55e]/10 p-2 rounded-lg border border-[#22c55e]/20">
              <HomeIcon className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Home</h1>
              <p className="text-xs text-slate-400">
                {user?.username || 'Guest'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/chat')}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-[#22c55e]"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => navigate('/settings')}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-[#22c55e]"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* My Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#22c55e]" />
                My Identity
              </CardTitle>
              <CardDescription className="text-slate-400">
                Share your public handle to connect with others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipProvider>
                {/* Public Handle */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-300">Public Handle</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-slate-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Paylaşmak için görünen kod</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-800 border border-slate-700 rounded px-4 py-3 text-[#22c55e] font-mono text-lg font-bold">
                      {myInternalId ? formatPublicHandle(myInternalId, settings.kurdPrefixEnabled) : 'Loading...'}
                    </div>
                    <Button
                      onClick={handleCopyPublicHandle}
                      disabled={!myInternalId}
                      variant="outline"
                      className="border-slate-700"
                    >
                      {copied.public ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Internal ID (Advanced) */}
                <details className="space-y-2">
                  <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                    Advanced: Internal ID
                  </summary>
                  <div className="pl-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-slate-300 text-xs">Internal ID</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-slate-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Bağlantı için kullanılan teknik ID</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-400 font-mono text-sm">
                        {myInternalId || 'Loading...'}
                      </div>
                      <Button
                        onClick={handleCopyInternalId}
                        disabled={!myInternalId}
                        variant="outline"
                        size="sm"
                        className="border-slate-700"
                      >
                        {copied.internal ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </details>
              </TooltipProvider>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connect to Peer Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#22c55e]" />
                Connect to Peer
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enter a peer's public handle or internal ID to start a conversation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeerIdInput
                value={peerInput}
                onChange={setPeerInput}
                onValidChange={setPeerValid}
              />

              <Button
                onClick={handleConnect}
                disabled={!peerInput || !peerValid}
                className="w-full bg-[#22c55e] text-black hover:bg-[#16a34a] font-semibold h-12"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Connect / Chat
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 border-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-400 space-y-2">
                  <p className="font-semibold text-white">Nasıl Çalışır?</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Public Handle'ınızı paylaşın</li>
                    <li>Peer'in ID'sini girin ve Connect'e tıklayın</li>
                    <li>Chat sayfasında bağlantı kurulur</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
