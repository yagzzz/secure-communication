export const createDebugReport = ({
  appVersion = 'v1.0.0',
  environment = process.env.NODE_ENV || 'development',
  platform,
  theme,
  accent,
  isUnlocked,
  lastErrorCode,
  latency
}) => ({
  timestamp: new Date().toISOString(),
  app: {
    version: appVersion,
    environment
  },
  platform: {
    name: platform || (typeof navigator !== 'undefined' ? navigator.platform : 'unknown'),
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown'
  },
  ui: {
    theme,
    accent
  },
  security: {
    unlock_state: isUnlocked ? 'unlocked' : 'locked'
  },
  diagnostics: {
    last_error_code: lastErrorCode || null,
    latency: latency || null
  }
});
