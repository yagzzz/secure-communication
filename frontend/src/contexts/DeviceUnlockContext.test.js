import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { DeviceUnlockProvider, useDeviceUnlock } from './DeviceUnlockContext';

const renderWithProvider = (onReady) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const TestHarness = () => {
    const ctx = useDeviceUnlock();
    onReady(ctx);
    return null;
  };

  act(() => {
    root.render(
      <DeviceUnlockProvider>
        <TestHarness />
      </DeviceUnlockProvider>
    );
  });

  return { root, container };
};

describe('DeviceUnlockContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('unlock -> isUnlocked true', () => {
    let latest;
    const { root, container } = renderWithProvider((ctx) => {
      latest = ctx;
    });

    act(() => {
      latest.unlockWithPin('1234');
    });

    expect(latest.isUnlocked).toBe(true);

    root.unmount();
    container.remove();
  });

  test('expiry -> auto lock', () => {
    let latest;
    const { root, container } = renderWithProvider((ctx) => {
      latest = ctx;
    });

    act(() => {
      latest.unlockWithPin('1234');
    });

    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000 + 1000);
    });

    expect(latest.isUnlocked).toBe(false);

    root.unmount();
    container.remove();
  });
});
