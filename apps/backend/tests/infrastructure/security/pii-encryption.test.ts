import { describe, it, expect, vi, beforeAll } from 'vitest';

// Must mock config before importing the service
vi.mock('../../../src/config/encryption.config.js', () => ({
  encryptionConfig: {
    key: Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'),
    algorithm: 'aes-256-gcm' as const,
  },
}));

import { PiiEncryptionService } from '../../../src/infrastructure/security/pii-encryption.service.js';

describe('PiiEncryptionService', () => {
  let service: PiiEncryptionService;

  beforeAll(() => {
    service = new PiiEncryptionService();
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a CPF number', () => {
      const cpf = '52998224725';
      const encrypted = service.encrypt(cpf);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(cpf);
    });

    it('should encrypt and decrypt a CURP', () => {
      const curp = 'GARC850101HDFRRL09';
      const encrypted = service.encrypt(curp);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(curp);
    });

    it('should encrypt and decrypt empty string', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should encrypt and decrypt unicode text', () => {
      const text = 'João García ñ ü';
      const encrypted = service.encrypt(text);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(text);
    });
  });

  describe('encryption format', () => {
    it('should produce iv:authTag:ciphertext format', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      // IV is 12 bytes = 24 hex chars
      expect(parts[0].length).toBe(24);
      // Auth tag is 16 bytes = 32 hex chars
      expect(parts[1].length).toBe(32);
      // Ciphertext is hex
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should produce different ciphertexts for same input (random IV)', () => {
      const input = 'same-input';
      const encrypted1 = service.encrypt(input);
      const encrypted2 = service.encrypt(input);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryption errors', () => {
    it('should throw on invalid format (missing parts)', () => {
      expect(() => service.decrypt('invalid')).toThrow('Invalid ciphertext format');
      expect(() => service.decrypt('a:b')).toThrow('Invalid ciphertext format');
    });

    it('should throw on corrupted ciphertext', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      parts[2] = 'deadbeef';
      expect(() => service.decrypt(parts.join(':'))).toThrow();
    });

    it('should throw on corrupted auth tag', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      parts[1] = '00'.repeat(16);
      expect(() => service.decrypt(parts.join(':'))).toThrow();
    });
  });
});
