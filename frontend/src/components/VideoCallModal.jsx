import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VideoCallModal({ conversation, user, onClose, incomingCall = null }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState(incomingCall ? 'incoming' : 'connecting');
  const [callId, setCallId] = useState(incomingCall?.id || null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const pollingRef = useRef(null);
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ICE Servers - STUN/TURN servers for NAT traversal
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  }, [localStream]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Initialize media stream
  const initMedia = async (videoOn = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoOn,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Media error:', error);
      toast.error('Kamera/mikrofon erişimi reddedildi');
      return null;
    }
  };

  // Create peer connection
  const createPeerConnection = (stream, isInitiator) => {
    const pc = new RTCPeerConnection(iceServers);
    
    // Add local stream tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setCallStatus('connected');
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && callId) {
        try {
          await axios.post(`${API}/calls/${callId}/ice`, 
            { candidate: event.candidate.toJSON() }, 
            config
          );
        } catch (err) {
          console.error('ICE candidate error:', err);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    peerRef.current = pc;
    return pc;
  };

  // Start outgoing call
  const startCall = async () => {
    const stream = await initMedia(true);
    if (!stream) {
      onClose();
      return;
    }

    try {
      // Create call on server
      const formData = new FormData();
      formData.append('conversation_id', conversation.id);
      formData.append('call_type', 'video');
      
      const response = await axios.post(`${API}/calls/start`, formData, config);
      const newCallId = response.data.call_id;
      setCallId(newCallId);

      // Create peer connection and offer
      const pc = createPeerConnection(stream, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to server
      await axios.post(`${API}/calls/${newCallId}/signal`, 
        { type: 'offer', sdp: offer.sdp }, 
        config
      );

      setCallStatus('ringing');

      // Poll for answer
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API}/calls/${newCallId}/status`, config);
          const call = statusRes.data;

          if (call.status === 'rejected' || call.status === 'ended') {
            toast.error('Arama reddedildi');
            handleEndCall();
            return;
          }

          if (call.status === 'accepted' && call.answer_data) {
            // Set remote description
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: call.answer_data.sdp
            }));

            // Process ICE candidates
            if (call.ice_candidates) {
              for (const ice of call.ice_candidates) {
                if (ice.user_id !== user.id && ice.candidate) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(ice.candidate));
                  } catch (e) {
                    console.log('ICE candidate error:', e);
                  }
                }
              }
            }

            clearInterval(pollingRef.current);
            setCallStatus('connected');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 500);

    } catch (error) {
      console.error('Call start error:', error);
      toast.error('Arama başlatılamadı');
      onClose();
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall) return;

    const stream = await initMedia(incomingCall.call_type === 'video');
    if (!stream) {
      handleRejectCall();
      return;
    }

    try {
      // Get call signal data
      const statusRes = await axios.get(`${API}/calls/${incomingCall.id}/status`, config);
      const call = statusRes.data;

      if (!call.signal_data) {
        toast.error('Arama verisi alınamadı');
        handleRejectCall();
        return;
      }

      // Create peer connection
      const pc = createPeerConnection(stream, false);
      
      // Set remote description (offer)
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: call.signal_data.sdp
      }));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await axios.post(`${API}/calls/${incomingCall.id}/answer`, 
        { type: 'answer', sdp: answer.sdp }, 
        config
      );

      // Process existing ICE candidates
      if (call.ice_candidates) {
        for (const ice of call.ice_candidates) {
          if (ice.user_id !== user.id && ice.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(ice.candidate));
            } catch (e) {
              console.log('ICE candidate error:', e);
            }
          }
        }
      }

      // Poll for new ICE candidates
      pollingRef.current = setInterval(async () => {
        try {
          const res = await axios.get(`${API}/calls/${incomingCall.id}/status`, config);
          if (res.data.status === 'ended') {
            handleEndCall();
            return;
          }
          if (res.data.ice_candidates) {
            for (const ice of res.data.ice_candidates) {
              if (ice.user_id !== user.id && ice.candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(ice.candidate));
                } catch (e) {}
              }
            }
          }
        } catch (err) {}
      }, 1000);

      setCallStatus('connected');

    } catch (error) {
      console.error('Accept call error:', error);
      toast.error('Arama kabul edilemedi');
      handleRejectCall();
    }
  };

  // Reject incoming call
  const handleRejectCall = async () => {
    if (incomingCall) {
      try {
        await axios.post(`${API}/calls/${incomingCall.id}/reject`, {}, config);
      } catch (err) {}
    }
    cleanup();
    onClose();
  };

  // End call
  const handleEndCall = async () => {
    if (callId) {
      try {
        await axios.post(`${API}/calls/${callId}/end`, {}, config);
      } catch (err) {}
    }
    cleanup();
    onClose();
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  // Auto-start call if not incoming
  useEffect(() => {
    if (!incomingCall) {
      startCall();
    }
  }, []);

  // Incoming call UI
  if (callStatus === 'incoming') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="text-4xl">{incomingCall?.caller_username?.[0]?.toUpperCase() || '?'}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{incomingCall?.caller_username}</h2>
          <p className="text-slate-400 mb-8">
            {incomingCall?.call_type === 'video' ? 'Görüntülü' : 'Sesli'} arama geliyor...
          </p>
          
          <div className="flex items-center justify-center gap-6">
            <Button
              onClick={handleRejectCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            <Button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
            >
              <Phone className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      <Button 
        onClick={handleEndCall} 
        className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700"
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Connection status */}
        {(callStatus === 'connecting' || callStatus === 'ringing') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg">
                {callStatus === 'ringing' ? 'Çağrılıyor...' : 'Bağlanıyor...'}
              </p>
            </div>
          </div>
        )}

        {/* Remote video (fullscreen) */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />

        {/* Local video (small preview) */}
        <div className="absolute top-4 left-4 w-32 h-24 sm:w-48 sm:h-36 bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-700 shadow-xl">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-slate-500" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <Button 
            size="lg" 
            onClick={toggleVideo} 
            className={`rounded-full w-14 h-14 ${videoEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          <Button 
            size="lg" 
            onClick={toggleAudio} 
            className={`rounded-full w-14 h-14 ${audioEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          <Button 
            size="lg" 
            onClick={handleEndCall} 
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
