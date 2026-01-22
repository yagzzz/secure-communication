import { normalizePeerInput, isValidInternalId } from './identity';

describe('identity utils', () => {
  test('normalizePeerInput strips KURD prefix', () => {
    expect(normalizePeerInput('KURD-ABCD3F7Z')).toBe('ABCD3F7Z');
  });

  test('invalid characters are rejected', () => {
    expect(isValidInternalId('ABCD3F7!')).toBe(false);
    expect(isValidInternalId('ABCD3F7O')).toBe(false);
  });
});
