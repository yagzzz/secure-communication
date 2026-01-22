import { redirectRoot } from './guards';

describe('route guards', () => {
  test('logged out -> /login', () => {
    expect(redirectRoot({ isAuthenticated: false, isUnlocked: false })).toBe('/login');
  });

  test('logged in locked -> /unlock', () => {
    expect(redirectRoot({ isAuthenticated: true, isUnlocked: false })).toBe('/unlock');
  });

  test('logged in unlocked -> /home', () => {
    expect(redirectRoot({ isAuthenticated: true, isUnlocked: true })).toBe('/home');
  });
});
