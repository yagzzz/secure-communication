/**
 * Storage utility for secure localStorage management
 * No logging to prevent sensitive data leakage
 */

/**
 * Get a JSON value from localStorage with a fallback
 * @param {string} key - The localStorage key
 * @param {*} fallback - Default value if key doesn't exist
 * @returns {*} Parsed JSON value or fallback
 */
export const getJSON = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    // Silent fail - return fallback without logging
    return fallback;
  }
};

/**
 * Set a JSON value in localStorage
 * @param {string} key - The localStorage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export const setJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // Silent fail - no logging for security
    return false;
  }
};

/**
 * Remove a key from localStorage
 * @param {string} key - The localStorage key to remove
 * @returns {boolean} Success status
 */
export const remove = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    // Silent fail
    return false;
  }
};

/**
 * Check if a key exists in localStorage
 * @param {string} key - The localStorage key
 * @returns {boolean} True if key exists
 */
export const has = (key) => {
  return localStorage.getItem(key) !== null;
};

/**
 * Clear all localStorage data
 * Use with caution
 */
export const clearAll = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    return false;
  }
};
