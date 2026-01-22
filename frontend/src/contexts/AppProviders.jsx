import React from 'react';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { DeviceUnlockProvider } from '@/contexts/DeviceUnlockContext';
import { UserProvider } from '@/contexts/UserContext';

const AppProviders = ({ children }) => (
  <SettingsProvider>
    <DeviceUnlockProvider>
      <UserProvider>{children}</UserProvider>
    </DeviceUnlockProvider>
  </SettingsProvider>
);

export default AppProviders;
