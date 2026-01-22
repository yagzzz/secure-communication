/**
 * Identity and Public Handle Management
 * 
 * Internal IDs are always 8 characters, uppercase A-Z + 2-9 (no I/O/0/1 for clarity)
 * Public Handles add optional KURD- prefix for display purposes only
 */

/**
 * Validate an internal ID format
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid internal ID format
 */
export const isValidInternalId = (id) => {
  if (!id || typeof id !== 'string') return false;
  
  // Must be exactly 8 characters
  if (id.length !== 8) return false;
  
  // Must be uppercase A-Z and 2-9 only (no I, O, 0, 1 for clarity)
  const validPattern = /^[A-HJ-NP-Z2-9]{8}$/;
  return validPattern.test(id);
};

/**
 * Normalize peer input by removing KURD prefix and hyphens
 * Converts: "KURD-ABCD3F7Z" or "KURD-ABCD-3F7Z" or "abcd3f7z" → "ABCD3F7Z"
 * @param {string} input - User input (may contain KURD prefix, hyphens, lowercase)
 * @returns {string} Normalized internal ID (8 chars uppercase)
 */
export const normalizePeerInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove whitespace
  let normalized = input.trim();
  
  // Remove KURD- prefix (case insensitive)
  normalized = normalized.replace(/^kurd[-\s]*/i, '');
  
  // Remove all hyphens and spaces
  normalized = normalized.replace(/[-\s]/g, '');
  
  // Convert to uppercase
  normalized = normalized.toUpperCase();
  
  // Take first 8 characters if longer
  if (normalized.length > 8) {
    normalized = normalized.substring(0, 8);
  }
  
  return normalized;
};

/**
 * Format an internal ID as a public handle
 * @param {string} internalId - The 8-character internal ID
 * @param {boolean} kurdPrefixEnabled - Whether to show KURD- prefix
 * @returns {string} Formatted public handle for display
 */
export const formatPublicHandle = (internalId, kurdPrefixEnabled = true) => {
  if (!internalId) return '';
  
  // Ensure ID is normalized
  const normalizedId = internalId.toUpperCase().replace(/[-\s]/g, '');
  
  // Return with or without prefix based on settings
  return kurdPrefixEnabled ? `KURD-${normalizedId}` : normalizedId;
};

/**
 * Generate a readable format with optional hyphen grouping
 * @param {string} internalId - The 8-character internal ID
 * @param {boolean} kurdPrefixEnabled - Whether to show KURD- prefix
 * @param {boolean} useHyphens - Whether to add hyphens for readability (ABCD-3F7Z)
 * @returns {string} Formatted handle
 */
export const formatReadableHandle = (internalId, kurdPrefixEnabled = true, useHyphens = false) => {
  if (!internalId) return '';
  
  const normalizedId = internalId.toUpperCase().replace(/[-\s]/g, '');
  
  // Add hyphens every 4 characters if requested
  const displayId = useHyphens && normalizedId.length === 8
    ? `${normalizedId.substring(0, 4)}-${normalizedId.substring(4)}`
    : normalizedId;
  
  return kurdPrefixEnabled ? `KURD-${displayId}` : displayId;
};

/**
 * Extract internal ID from any format (with or without KURD prefix)
 * @param {string} handle - Public handle or internal ID
 * @returns {string|null} Internal ID if valid, null otherwise
 */
export const extractInternalId = (handle) => {
  const normalized = normalizePeerInput(handle);
  return isValidInternalId(normalized) ? normalized : null;
};

/**
 * Copy text to clipboard with user feedback
 * @param {string} text - Text to copy
 * @param {string} successMessage - Optional success message
 * @returns {Promise<boolean>} True if successful
 */
export const copyToClipboard = async (text, successMessage = 'Kopyalandı!') => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (_) {
        textArea.remove();
        return false;
      }
    }
  } catch (_) {
    return false;
  }
};
