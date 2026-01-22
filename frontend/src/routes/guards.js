export const requireAuth = ({ isAuthenticated, redirectTo = '/login' }) => (
  isAuthenticated ? null : redirectTo
);

export const requireUnlock = ({ isUnlocked, redirectTo = '/unlock' }) => (
  isUnlocked ? null : redirectTo
);

export const requireRole = ({ role, requiredRole, redirectTo = '/login' }) => (
  role === requiredRole ? null : redirectTo
);

export const redirectRoot = ({ isAuthenticated, isUnlocked }) => {
  if (!isAuthenticated) return '/login';
  if (!isUnlocked) return '/unlock';
  return '/home';
};
