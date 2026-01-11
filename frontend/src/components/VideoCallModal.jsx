import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SimplePeer from 'simple-peer';

export default function VideoCallModal({ conversation, user, socket, onClose }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    initCall();
    return () => cleanup();
  }, []);

  const initCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: stream,
      });

      peer.on('signal', (data) => {
        const targetUserId = conversation.participants.find((id) => id !== user.id);
        if (socket) {
          socket.emit('webrtc_offer', {
            target_user_id: targetUserId,
            signal: data,
            sender_id: user.id,
          });
        }
      });

      peer.on('stream', (stream) => {
        setRemoteStream(stream);
        setConnecting(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setConnecting(false);
      });

      peerRef.current = peer;

      if (socket) {
        socket.on('webrtc_answer', handleReceiveAnswer);
      }

      setTimeout(() => setConnecting(false), 10000);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Kamera veya mikrofon erişimi reddedildi');
      onClose();
    }
  };

  const handleReceiveAnswer = (data) => {
    if (peerRef.current && data.sender_id !== user.id) {
      try {
        peerRef.current.signal(data.signal);
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socket) {
      socket.off('webrtc_answer', handleReceiveAnswer);
    }
  };

  const handleEndCall = () => {
    cleanup();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      <Button onClick={onClose} className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700">
        <X className="w-4 h-4" />
      </Button>

      <div className="relative w-full h-full flex items-center justify-center">
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg">Bağlanıyor...</p>
            </div>
          </div>
        )}

        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

        <div className="absolute top-4 right-4 w-48 h-36 bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-700 shadow-xl">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <Button size="lg" onClick={toggleVideo} className={`rounded-full w-14 h-14 ${videoEnabled ? 'bg-slate-800' : 'bg-red-600'}`}>
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          <Button size="lg" onClick={toggleAudio} className={`rounded-full w-14 h-14 ${audioEnabled ? 'bg-slate-800' : 'bg-red-600'}`}>
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          <Button size="lg" onClick={handleEndCall} className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700">
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
