import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Image, Video, FileText, MapPin, Mic, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileMenu({ 
  onImageSelect, 
  onVideoSelect, 
  onFileSelect, 
  onLocationSend, 
  onVoiceRecord, 
  onStickerOpen,
  recording 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-button bg-slate-800 hover:bg-slate-700"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="grid grid-cols-3 gap-2 p-3 min-w-[200px]">
              <Button
                type="button"
                onClick={() => handleAction(onImageSelect)}
                className="flex flex-col items-center gap-1 h-auto py-3 bg-slate-900 hover:bg-slate-700"
              >
                <Image className="w-6 h-6 text-blue-400" />
                <span className="text-xs">Resim</span>
              </Button>
              
              <Button
                type="button"
                onClick={() => handleAction(onVideoSelect)}
                className="flex flex-col items-center gap-1 h-auto py-3 bg-slate-900 hover:bg-slate-700"
              >
                <Video className="w-6 h-6 text-purple-400" />
                <span className="text-xs">Video</span>
              </Button>
              
              <Button
                type="button"
                onClick={() => handleAction(onFileSelect)}
                className="flex flex-col items-center gap-1 h-auto py-3 bg-slate-900 hover:bg-slate-700"
              >
                <FileText className="w-6 h-6 text-yellow-400" />
                <span className="text-xs">Dosya</span>
              </Button>
              
              <Button
                type="button"
                onClick={() => handleAction(onLocationSend)}
                className="flex flex-col items-center gap-1 h-auto py-3 bg-slate-900 hover:bg-slate-700"
              >
                <MapPin className="w-6 h-6 text-green-400" />
                <span className="text-xs">Konum</span>
              </Button>
              
              <Button
                type="button"
                onClick={() => handleAction(onVoiceRecord)}
                className={`flex flex-col items-center gap-1 h-auto py-3 ${
                  recording ? 'bg-red-900 hover:bg-red-800' : 'bg-slate-900 hover:bg-slate-700'
                }`}
              >
                <Mic className={`w-6 h-6 ${recording ? 'text-red-400' : 'text-red-400'}`} />
                <span className="text-xs">Ses</span>
              </Button>
              
              <Button
                type="button"
                onClick={() => handleAction(onStickerOpen)}
                className="flex flex-col items-center gap-1 h-auto py-3 bg-slate-900 hover:bg-slate-700"
              >
                <Smile className="w-6 h-6 text-yellow-400" />
                <span className="text-xs">Sticker</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
