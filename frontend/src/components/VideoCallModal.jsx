import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SimplePeer from 'simple-peer';

export default function VideoCallModal({ conversation, user, socket, onClose }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    initCall();

    socket.on('webrtc_offer', handleReceiveOffer);
    socket.on('webrtc_answer', handleReceiveAnswer);
    socket.on('webrtc_ice_candidate', handleReceiveIceCandidate);

    return () => {
      cleanup();
    };
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
        socket.emit('webrtc_offer', {
          target_user_id: targetUserId,
          signal: data,
          sender_id: user.id,
        });
      });

      peer.on('stream', (stream) => {
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      peerRef.current = peer;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Kamera veya mikrofon erişimi reddedildi');
      onClose();
    }
  };

  const handleReceiveOffer = (data) => {
    if (data.sender_id === user.id) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: stream,
      });

      peer.on('signal', (answerSignal) => {
        socket.emit('webrtc_answer', {
          target_user_id: data.sender_id,
          signal: answerSignal,
          sender_id: user.id,
        });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.signal(data.signal);
      peerRef.current = peer;
    });
  };

  const handleReceiveAnswer = (data) => {
    if (peerRef.current && data.sender_id !== user.id) {
      peerRef.current.signal(data.signal);
    }
  };

  const handleReceiveIceCandidate = (data) => {
    if (peerRef.current && data.sender_id !== user.id) {
      peerRef.current.signal(data.candidate);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !videoEnabled;
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !audioEnabled;
      setAudioEnabled(!audioEnabled);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
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
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      data-testid="video-call-modal"
    >
      <div className="relative w-full h-full">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        <div className="absolute top-4 right-4 w-48 h-36 bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-700">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <Button
            size="lg"
            onClick={toggleVideo}
            data-testid="toggle-video-button"
            className={`rounded-full w-14 h-14 ${
              videoEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            onClick={toggleAudio}
            data-testid="toggle-audio-button"
            className={`rounded-full w-14 h-14 ${
              audioEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            onClick={handleEndCall}
            data-testid="end-call-button"
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
