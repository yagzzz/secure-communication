import { useState, useEffect } from 'react';
import { getJSON, setJSON } from '../utils/storage';
import { isValidInternalId } from '../utils/identity';

const STORAGE_KEY = 'app.my_internal_id.v1';

/**
 * Generate a valid internal ID (8 chars, A-Z + 2-9, no I/O/0/1)
 * @returns {string} Valid 8-character internal ID
 */
const generateInternalId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let id = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    id += chars[randomIndex];
  }
  
  return id;
};

/**
 * Hook to get or create user's internal ID
 * @returns {string|null} Internal ID or null if loading
 */
export const useMyInternalId = () => {
  const [internalId, setInternalId] = useState(null);

  useEffect(() => {
    // Try to load from storage
    const stored = getJSON(STORAGE_KEY, null);
    
    if (stored && typeof stored === 'string' && isValidInternalId(stored)) {
      // Valid ID exists
      setInternalId(stored);
    } else {
      // Generate new ID
      const newId = generateInternalId();
      
      // Validate it (should always pass, but double-check)
      if (isValidInternalId(newId)) {
        setInternalId(newId);
        setJSON(STORAGE_KEY, newId);
      } else {
        // Fallback: try again
        const fallbackId = generateInternalId();
        setInternalId(fallbackId);
        setJSON(STORAGE_KEY, fallbackId);
      }
    }
  }, []);

  return internalId;
};
