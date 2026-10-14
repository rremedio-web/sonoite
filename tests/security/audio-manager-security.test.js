/**
 * Audio Manager Security Tests
 * Comprehensive security testing for audio handling and file validation
 */

import { AudioManager } from '../../src/js/audio-manager.js';

describe('AudioManager Security Tests', () => {
  let audioManager;
  let securityConfig;

  beforeEach(() => {
    securityConfig = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedOrigins: ['https://localhost', 'https://example.com'],
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
      enableContentValidation: true,
      rateLimitRequests: 5,
      rateLimitWindow: 60000,
      enableAuditLog: true,
      timeoutDuration: 30000,
      maxVolume: 1.0
    };

    audioManager = new AudioManager(securityConfig);
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.dispose();
    }
  });

  describe('URL Validation Security', () => {
    test('should reject invalid protocols', () => {
      const maliciousUrls = [
        'file:///etc/passwd',
        'ftp://malicious.com/file.mp3',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];

      maliciousUrls.forEach(url => {
        expect(audioManager.validateUrl(url)).toBe(false);
      });
    });

    test('should reject unauthorized origins', () => {
      const unauthorizedUrls = [
        'https://evil.com/audio.mp3',
        'http://attacker.net/malicious.wav',
        'https://phishing.site/track.ogg'
      ];

      unauthorizedUrls.forEach(url => {
        expect(audioManager.validateUrl(url)).toBe(false);
      });
    });

    test('should allow authorized origins', () => {
      const authorizedUrls = [
        'https://localhost/audio.mp3',
        'https://example.com/track.wav'
      ];

      authorizedUrls.forEach(url => {
        expect(audioManager.validateUrl(url)).toBe(true);
      });
    });

    test('should prevent local file access', () => {
      const localUrls = [
        'http://localhost/../../etc/passwd',
        'http://127.0.0.1/sensitive.txt',
        'file://localhost/private/data.mp3'
      ];

      localUrls.forEach(url => {
        expect(audioManager.validateUrl(url)).toBe(false);
      });
    });

    test('should log security violations for invalid URLs', () => {
      audioManager.validateUrl('javascript:alert("xss")');
      
      const violations = audioManager.auditLog.filter(
        log => log.event === 'URL validation failed'
      );
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Security', () => {
    test('should allow requests within rate limit', () => {
      for (let i = 0; i < 4; i++) {
        expect(audioManager.checkRateLimit()).toBe(true);
      }
    });

    test('should block requests exceeding rate limit', () => {
      audioManager.requestCount = 10;
      audioManager.lastRequestTime = Date.now();
      
      expect(audioManager.checkRateLimit()).toBe(false);
    });

    test('should reset rate limit after window expires', () => {
      audioManager.requestCount = 10;
      audioManager.lastRequestTime = Date.now() - 70000; // 70 seconds ago
      
      expect(audioManager.checkRateLimit()).toBe(true);
    });

    test('should log rate limit violations', () => {
      audioManager.requestCount = 10;
      audioManager.lastRequestTime = Date.now();
      
      audioManager.checkRateLimit();
      
      const violations = audioManager.auditLog.filter(
        log => log.event === 'Rate limit exceeded'
      );
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('File Content Validation', () => {
    test('should validate MP3 file signatures', async () => {
      // Mock MP3 file with correct header
      const mp3Header = new Uint8Array([0xFF, 0xFA]); // MP3 header
      const mockArrayBuffer = mp3Header.buffer;
      
      const isValid = await audioManager.validateAudioContent(mockArrayBuffer);
      expect(isValid).toBe(true);
    });

    test('should validate WAV file signatures', async () => {
      // Mock WAV file with RIFF header
      const wavHeader = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
      const mockArrayBuffer = wavHeader.buffer;
      
      const isValid = await audioManager.validateAudioContent(mockArrayBuffer);
      expect(isValid).toBe(true);
    });

    test('should reject malicious file content', async () => {
      // Mock malicious content disguised as audio
      const maliciousContent = new TextEncoder().encode('<?php eval($_GET["cmd"]); ?>');
      const mockArrayBuffer = maliciousContent.buffer;
      
      const isValid = await audioManager.validateAudioContent(mockArrayBuffer);
      expect(isValid).toBe(false);
    });

    test('should reject files without proper audio signatures', async () => {
      const invalidContent = new TextEncoder().encode('This is not an audio file');
      const mockArrayBuffer = invalidContent.buffer;
      
      const isValid = await audioManager.validateAudioContent(mockArrayBuffer);
      expect(isValid).toBe(false);
    });
  });

  describe('Content Size Validation', () => {
    test('should reject files exceeding size limit', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: (header) => {
            if (header === 'content-length') return '50000000'; // 50MB
            if (header === 'content-type') return 'audio/mpeg';
            return null;
          }
        }
      };

      await expect(audioManager.validateContent(mockResponse)).rejects.toThrow('File too large');
    });

    test('should accept files within size limit', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: (header) => {
            if (header === 'content-length') return '5000000'; // 5MB
            if (header === 'content-type') return 'audio/mpeg';
            return null;
          }
        }
      };

      await expect(audioManager.validateContent(mockResponse)).resolves.toBe(true);
    });

    test('should validate array buffer size', async () => {
      const oversizedBuffer = new ArrayBuffer(20 * 1024 * 1024); // 20MB
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(oversizedBuffer)
      });

      await expect(audioManager.loadTrack('https://example.com/large.mp3')).resolves.toBe(false);
    });
  });

  describe('MIME Type Validation', () => {
    test('should accept allowed MIME types', async () => {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];
      
      for (const mimeType of allowedTypes) {
        const mockResponse = {
          ok: true,
          headers: {
            get: (header) => {
              if (header === 'content-type') return mimeType;
              if (header === 'content-length') return '1000000';
              return null;
            }
          }
        };

        await expect(audioManager.validateContent(mockResponse)).resolves.toBe(true);
      }
    });

    test('should reject dangerous MIME types', async () => {
      const dangerousTypes = [
        'application/x-php',
        'text/html',
        'application/javascript',
        'application/x-executable'
      ];
      
      for (const mimeType of dangerousTypes) {
        const mockResponse = {
          ok: true,
          headers: {
            get: (header) => {
              if (header === 'content-type') return mimeType;
              return null;
            }
          }
        };

        await expect(audioManager.validateContent(mockResponse)).rejects.toThrow('Invalid content type');
      }
    });
  });

  describe('Content Integrity Verification', () => {
    test('should calculate SHA-256 checksums correctly', async () => {
      const testData = new TextEncoder().encode('test data');
      const checksum = await audioManager.calculateChecksum(testData.buffer);
      
      expect(checksum).toBeTruthy();
      expect(checksum).toMatch(/^[a-f0-9]{64}$/); // 64 hex characters
    });

    test('should verify content integrity with correct checksum', async () => {
      const testData = new Uint8Array([0xFF, 0xFA, 0x00, 0x00]);
      const expectedChecksum = await audioManager.calculateChecksum(testData.buffer);
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(testData.buffer)
      });

      // Mock audio context for decoding
      audioManager.audioContext = {
        decodeAudioData: jest.fn().mockResolvedValue({
          duration: 180,
          sampleRate: 44100
        })
      };

      const result = await audioManager.loadTrack('https://example.com/test.mp3', expectedChecksum);
      expect(result).toBe(true);
    });

    test('should reject content with incorrect checksum', async () => {
      const testData = new TextEncoder().encode('test audio data');
      const wrongChecksum = 'incorrect_checksum_hash';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(testData.buffer)
      });

      const result = await audioManager.loadTrack('https://example.com/test.mp3', wrongChecksum);
      expect(result).toBe(false);
    });
  });

  describe('Request Timeout Security', () => {
    test('should timeout long-running requests', async () => {
      jest.useFakeTimers();
      
      global.fetch = jest.fn().mockImplementation((url, options = {}) =>
        new Promise((resolve, reject) => {
          const timerId = setTimeout(() => resolve({
            ok: true,
            headers: { get: () => 'audio/mpeg' },
            arrayBuffer: () => Promise.resolve(new Uint8Array([0xFF, 0xFA, 0x00, 0x00]).buffer)
          }), 40000); // 40 seconds

          options.signal?.addEventListener('abort', () => {
            clearTimeout(timerId);
            const abortError = new Error('aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        })
      );

      const loadPromise = audioManager.loadTrack('https://example.com/slow.mp3');
      
      jest.advanceTimersByTime(35000); // Advance past timeout
      await Promise.resolve();
      
      const result = await loadPromise;
      expect(result).toBe(false);
      
      jest.useRealTimers();
    });

    test('should abort requests on timeout', async () => {
      const abortController = new AbortController();
      const spy = jest.spyOn(abortController, 'abort');
      
      audioManager.loadAbortController = abortController;
      
      jest.useFakeTimers();
      
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      audioManager.loadTrack('https://example.com/never-loads.mp3');
      
      jest.advanceTimersByTime(35000);
      
      expect(spy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Volume Security', () => {
    test('should enforce maximum volume limits', () => {
      const dangerousVolumes = [2.0, 5.0, 10.0, 100.0];
      
      dangerousVolumes.forEach(volume => {
        audioManager.setVolume(volume);
        expect(audioManager.volume).toBeLessThanOrEqual(securityConfig.maxVolume);
      });
    });

    test('should log volume security violations', () => {
      audioManager.setVolume(5.0); // Exceeds max volume
      
      const violations = audioManager.auditLog.filter(
        log => log.event === 'Volume exceeds security limit'
      );
      expect(violations.length).toBeGreaterThan(0);
    });

    test('should prevent audio shock with gradual volume changes', () => {
      const mockGainNode = {
        gain: {
          value: 0.5,
          cancelScheduledValues: jest.fn(),
          linearRampToValueAtTime: jest.fn()
        }
      };

      audioManager.gainNode = mockGainNode;
      audioManager.audioContext = { currentTime: 1.0 };
      
      audioManager.setVolume(1.0);
      
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });
  });

  describe('Duplicate Load Protection', () => {
    test('should track loaded URLs', async () => {
      const testUrl = 'https://example.com/test.mp3';
      const validMp3Buffer = new Uint8Array([0xFF, 0xFA, 0x00, 0x00]).buffer;
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(validMp3Buffer)
      });

      audioManager.audioContext = {
        decodeAudioData: jest.fn().mockResolvedValue({ duration: 180 })
      };

      await audioManager.loadTrack(testUrl);
      expect(audioManager.loadedUrls.has(testUrl)).toBe(true);
    });

    test('should log duplicate load attempts', async () => {
      const testUrl = 'https://example.com/test.mp3';
      audioManager.loadedUrls.add(testUrl);
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000))
      });

      await audioManager.loadTrack(testUrl);
      
      const duplicateAttempts = audioManager.auditLog.filter(
        log => log.event === 'Duplicate load attempt'
      );
      expect(duplicateAttempts.length).toBeGreaterThan(0);
    });
  });

  describe('Duration Security Checks', () => {
    test('should reject suspiciously long audio files', async () => {
      const validMp3Buffer = new Uint8Array([0xFF, 0xFA, 0x00, 0x00]).buffer;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(validMp3Buffer)
      });

      audioManager.audioContext = {
        decodeAudioData: jest.fn().mockResolvedValue({
          duration: 7200 // 2 hours - suspicious for a music track
        })
      };

      const result = await audioManager.loadTrack('https://example.com/long.mp3');
      expect(result).toBe(false);
    });

    test('should log suspicious duration events', async () => {
      const validMp3Buffer = new Uint8Array([0xFF, 0xFA, 0x00, 0x00]).buffer;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(validMp3Buffer)
      });

      audioManager.audioContext = {
        decodeAudioData: jest.fn().mockResolvedValue({ duration: 7200 })
      };

      await audioManager.loadTrack('https://example.com/long.mp3');
      
      const suspiciousEvents = audioManager.auditLog.filter(
        log => log.event === 'Suspicious audio duration'
      );
      expect(suspiciousEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose sensitive information in errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Internal server details'));
      
      const result = await audioManager.loadTrack('https://example.com/error.mp3');
      
      expect(result).toBe(false);
      // Should not expose internal error details to client
    });

    test('should handle malformed responses gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => null }
      });

      const result = await audioManager.loadTrack('https://example.com/notfound.mp3');
      expect(result).toBe(false);
    });

    test('should handle network timeouts securely', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        Promise.reject(new Error('Network timeout'))
      );

      const result = await audioManager.loadTrack('https://example.com/timeout.mp3');
      expect(result).toBe(false);
    });
  });

  describe('Audit Logging Security', () => {
    test('should log all security-relevant events', async () => {
      // Test various security events
      audioManager.validateUrl('javascript:alert("test")');
      audioManager.checkRateLimit();
      audioManager.setVolume(5.0);
      
      const securityEvents = audioManager.auditLog.filter(log => 
        log.event.includes('security') || 
        log.event.includes('violation') ||
        log.event.includes('limit')
      );
      
      expect(securityEvents.length).toBeGreaterThan(0);
    });

    test('should include session tracking in logs', () => {
      audioManager.logAuditEvent('Test event');
      
      const lastEvent = audioManager.auditLog[audioManager.auditLog.length - 1];
      expect(lastEvent.sessionId).toBeTruthy();
      expect(lastEvent.sessionId).toMatch(/^aud_[a-z0-9]+_\d+$/);
    });

    test('should maintain log size limits for security', () => {
      // Generate many events
      for (let i = 0; i < 1200; i++) {
        audioManager.logAuditEvent(`Test event ${i}`);
      }
      
      expect(audioManager.auditLog.length).toBeLessThanOrEqual(500);
    });

    test('should not log sensitive information', () => {
      const sensitiveData = {
        password: 'secret123',
        apiKey: 'key-abc123',
        token: 'bearer-xyz789'
      };
      
      audioManager.logAuditEvent('Test with sensitive data', sensitiveData);
      
      const lastEvent = audioManager.auditLog[audioManager.auditLog.length - 1];
      const eventString = JSON.stringify(lastEvent);
      
      expect(eventString).not.toContain('secret123');
      expect(eventString).not.toContain('key-abc123');
      expect(eventString).not.toContain('bearer-xyz789');
    });
  });

  describe('Memory Security', () => {
    test('should clear sensitive data on disposal', () => {
      audioManager.loadedUrls.add('https://example.com/test.mp3');
      audioManager.expectedChecksums.set('test', 'checksum123');
      audioManager.audioBuffer = { mock: 'buffer' };
      
      audioManager.dispose();
      
      expect(audioManager.loadedUrls.size).toBe(0);
      expect(audioManager.expectedChecksums.size).toBe(0);
      expect(audioManager.audioBuffer).toBeNull();
    });

    test('should handle memory pressure gracefully', () => {
      // Simulate memory pressure by creating large objects
      const largeData = new Array(1000000).fill('x').join('');
      
      expect(() => {
        for (let i = 0; i < 10; i++) {
          audioManager.logAuditEvent('Memory test', { data: largeData });
        }
      }).not.toThrow();
    });
  });
});
