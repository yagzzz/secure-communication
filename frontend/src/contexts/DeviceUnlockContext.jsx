import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const UNLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_THROTTLE_MS = 10 * 1000;

const DeviceUnlockContext = createContext();

export const useDeviceUnlock = () => {
  const context = useContext(DeviceUnlockContext);
  if (!context) {
    throw new Error('useDeviceUnlock must be used within a DeviceUnlockProvider');
  }
  return context;
};

export const DeviceUnlockProvider = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState(null);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState(null);

  const lastTouchRef = useRef(0);

  // Auto-lock when expired
  useEffect(() => {
    if (!isUnlocked || !unlockExpiresAt) return;

    const now = Date.now();
    const timeUntilExpiry = unlockExpiresAt - now;

    if (timeUntilExpiry <= 0) {
      lock();
      return;
    }

    const timer = setTimeout(() => {
      lock();
    }, timeUntilExpiry);

    return () => clearTimeout(timer);
  }, [isUnlocked, unlockExpiresAt]);

  /**
   * Unlock device with PIN
   * @param {string} pin - User entered PIN (demo: any non-empty string works)
   * @returns {boolean} Success status
   */
  const unlockWithPin = useCallback((pin) => {
    if (!pin || pin.trim().length === 0) {
      return false;
    }

    const expiresAt = Date.now() + UNLOCK_DURATION_MS;
    
    setIsUnlocked(true);
    setUnlockMethod('pin');
    setUnlockExpiresAt(expiresAt);

    return true;
  }, []);

  /**
   * Unlock device with biometric (stub for future)
   * @returns {Promise<boolean>} Success status
   */
  const unlockWithBiometric = async () => {
    // Stub for future WebAuthn implementation
    // For now, not implemented
    return false;
  };

  /**
   * Lock the device
   */
  const lock = useCallback(() => {
    setIsUnlocked(false);
    setUnlockMethod(null);
    setUnlockExpiresAt(null);
  }, []);

  /**
   * Touch/refresh unlock timer (extend expiry on activity)
   */
  const touch = useCallback(() => {
    if (!isUnlocked) return;

    const expiresAt = Date.now() + UNLOCK_DURATION_MS;
    setUnlockExpiresAt(expiresAt);
  }, [isUnlocked]);

  useEffect(() => {
    const handleActivity = () => {
      if (!isUnlocked) return;
      const now = Date.now();
      if (now - lastTouchRef.current < ACTIVITY_THROTTLE_MS) return;
      lastTouchRef.current = now;
      touch();
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isUnlocked, touch]);

  const value = {
    isUnlocked,
    unlockMethod,
    unlockExpiresAt,
    unlockWithPin,
    unlockWithBiometric,
    lock,
    touch
  };

  return (
    <DeviceUnlockContext.Provider value={value}>
      {children}
    </DeviceUnlockContext.Provider>
  );
};
