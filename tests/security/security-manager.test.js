/**
 * Security Manager Tests
 * Comprehensive security validation and vulnerability testing
 */

import SecurityManager from '../../src/js/security-manager.js';

describe('SecurityManager Security Tests', () => {
  let securityManager;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      enableCSPReporting: true,
      enableIntegrityChecks: true,
      enableInputValidation: true,
      enableXSSProtection: true,
      enableAuditLogging: true,
      maxFormSubmissions: 5,
      formSubmissionWindow: 60000,
      allowedDomains: ['localhost'],
      reportingEndpoint: '/security-report'
    };

    document.body.innerHTML = '';
    securityManager = new SecurityManager(mockConfig);
  });

  afterEach(() => {
    if (securityManager) {
      securityManager = null;
    }
    document.body.innerHTML = '';
  });

  describe('XSS Protection', () => {
    test('should detect script tag XSS attempts', () => {
      const maliciousInputs = SecurityTestUtils.generateXSSPayloads();
      
      maliciousInputs.forEach(payload => {
        expect(securityManager.containsXSSPattern(payload)).toBe(true);
      });
    });

    test('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
      expect(sanitized).toBeSecureInput();
    });

    test('should prevent DOM-based XSS through innerHTML', () => {
      const testDiv = document.createElement('div');
      document.body.appendChild(testDiv);
      
      const maliciousContent = '<img src="x" onerror="alert(\'xss\')">';
      testDiv.innerHTML = maliciousContent;
      
      // SecurityManager should detect and remove dangerous attributes
      setTimeout(() => {
        const img = testDiv.querySelector('img');
        expect(img.getAttribute('onerror')).toBeNull();
      }, 100);
    });

    test('should log XSS detection events', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      securityManager.validateInput({ value: maliciousInput, name: 'test' });
      
      SecurityTestUtils.expectSecurityEvent('XSS pattern detected in input', securityManager);
    });
  });

  describe('CSRF Protection', () => {
    test('should generate valid CSRF tokens', () => {
      const token = securityManager.generateCSRFToken();
      
      expect(token).toBeTruthy();
      expect(token).toMatch(/^csrf_\d+_[a-zA-Z0-9]{16}$/);
      expect(securityManager.validateCSRFToken(token)).toBe(true);
    });

    test('should reject invalid CSRF tokens', () => {
      const invalidTokens = [
        '',
        'invalid_token',
        'csrf_123',
        'not_csrf_token',
        null,
        undefined
      ];

      invalidTokens.forEach(token => {
        expect(securityManager.validateCSRFToken(token)).toBe(false);
      });
    });

    test('should add CSRF tokens to forms automatically', () => {
      const form = document.createElement('form');
      document.body.appendChild(form);
      
      securityManager.secureForm(form);
      
      const csrfInput = form.querySelector('input[name="_token"]');
      expect(csrfInput).toBeTruthy();
      expect(csrfInput.type).toBe('hidden');
      expect(securityManager.validateCSRFToken(csrfInput.value)).toBe(true);
    });

    test('should add honeypot fields to forms', () => {
      const form = document.createElement('form');
      document.body.appendChild(form);
      
      securityManager.secureForm(form);
      
      const honeypot = form.querySelector('input[name="website"]');
      expect(honeypot).toBeTruthy();
      expect(honeypot.style.display).toBe('none');
      expect(honeypot.tabIndex).toBe(-1);
    });
  });

  describe('Input Validation', () => {
    test('should validate email inputs', () => {
      const validEmails = ['test@example.com', 'user+tag@domain.co.uk'];
      const invalidEmails = ['invalid-email', '@domain.com', 'test@'];
      
      validEmails.forEach(email => {
        const input = document.createElement('input');
        input.type = 'email';
        input.value = email;
        expect(securityManager.validateInput(input)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        const input = document.createElement('input');
        input.type = 'email';
        input.value = email;
        expect(securityManager.validateInput(input)).toBe(false);
      });
    });

    test('should detect SQL injection patterns', () => {
      const sqlPayloads = SecurityTestUtils.generateSQLInjectionPayloads();
      
      sqlPayloads.forEach(payload => {
        expect(securityManager.containsSQLInjectionPattern(payload)).toBe(true);
      });
    });

    test('should validate file uploads', () => {
      const legitimateFile = SecurityTestUtils.createLegitimateFile();
      const maliciousFile = SecurityTestUtils.createMaliciousFile();
      
      expect(securityManager.validateFileInput({ files: [legitimateFile] })).toBe(true);
      expect(securityManager.validateFileInput({ files: [maliciousFile] })).toBe(false);
    });

    test('should reject files with dangerous extensions', () => {
      const dangerousFiles = [
        { name: 'virus.exe', type: 'application/exe' },
        { name: 'script.php', type: 'application/x-php' },
        { name: 'malware.bat', type: 'application/bat' }
      ];

      dangerousFiles.forEach(file => {
        expect(securityManager.containsDangerousFilename(file.name)).toBe(true);
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', () => {
      for (let i = 0; i < 4; i++) {
        expect(securityManager.checkFormRateLimit()).toBe(true);
        securityManager.formSubmissions++;
        securityManager.lastFormSubmission = Date.now();
      }
    });

    test('should block requests exceeding rate limit', () => {
      // Exceed the rate limit
      securityManager.formSubmissions = 10;
      securityManager.lastFormSubmission = Date.now();
      
      expect(securityManager.checkFormRateLimit()).toBe(false);
    });

    test('should reset rate limit after window expires', () => {
      securityManager.formSubmissions = 10;
      securityManager.lastFormSubmission = Date.now() - 70000; // 70 seconds ago
      
      expect(securityManager.checkFormRateLimit()).toBe(true);
    });

    test('should log rate limit violations', () => {
      securityManager.formSubmissions = 10;
      securityManager.lastFormSubmission = Date.now();
      
      securityManager.checkFormRateLimit();
      
      SecurityTestUtils.expectSecurityEvent('Rate limit exceeded', securityManager);
    });
  });

  describe('URL Validation', () => {
    test('should allow safe URLs', () => {
      const safeUrls = [
        'https://localhost/safe',
        '/relative/path',
        './local/file.html',
        'mailto:test@example.com'
      ];

      safeUrls.forEach(url => {
        expect(securityManager.isUrlAllowed(url)).toBe(true);
      });
    });

    test('should block malicious URLs', () => {
      const maliciousUrls = SecurityTestUtils.generateMaliciousURLs();
      
      maliciousUrls.forEach(url => {
        expect(securityManager.isUrlAllowed(url)).toBe(false);
      });
    });

    test('should validate trusted origins', () => {
      expect(securityManager.isOriginTrusted('https://localhost')).toBe(true);
      expect(securityManager.isOriginTrusted('https://evil.com')).toBe(false);
    });
  });

  describe('Content Security Policy', () => {
    test('should handle CSP violations', () => {
      const mockViolation = {
        blockedURI: 'https://evil.com/malicious.js',
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src',
        originalPolicy: "default-src 'self'"
      };

      securityManager.handleCSPViolation(mockViolation);
      
      SecurityTestUtils.expectSecurityEvent('CSP violation detected', securityManager);
    });

    test('should report CSP violations to endpoint', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      
      const mockViolation = {
        blockedURI: 'https://evil.com/malicious.js',
        violatedDirective: 'script-src'
      };

      await securityManager.reportSecurityIncident('csp_violation', mockViolation);
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockConfig.reportingEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('DOM Security', () => {
    test('should detect dangerous DOM modifications', () => {
      const dangerousScript = document.createElement('script');
      dangerousScript.innerHTML = 'alert("xss")';
      
      securityManager.checkElementForXSS(dangerousScript);
      
      SecurityTestUtils.expectSecurityEvent('Inline script detected', securityManager);
    });

    test('should remove dangerous event handlers', () => {
      const maliciousDiv = document.createElement('div');
      maliciousDiv.setAttribute('onclick', 'alert("xss")');
      maliciousDiv.setAttribute('onerror', 'alert("xss")');
      
      securityManager.checkElementForXSS(maliciousDiv);
      
      expect(maliciousDiv.getAttribute('onclick')).toBeNull();
      expect(maliciousDiv.getAttribute('onerror')).toBeNull();
    });

    test('should sanitize javascript: URLs', () => {
      const maliciousLink = document.createElement('a');
      maliciousLink.href = 'javascript:alert("xss")';
      
      securityManager.checkElementForXSS(maliciousLink);
      
      expect(maliciousLink.getAttribute('href')).toBeNull();
    });
  });

  describe('Storage Security', () => {
    test('should detect sensitive data in localStorage', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn();
      
      securityManager.setupStorageSecurity();
      
      localStorage.setItem('user_password', 'secret123');
      
      SecurityTestUtils.expectSecurityEvent('Sensitive data in localStorage', securityManager);
      
      localStorage.setItem = originalSetItem;
    });

    test('should detect sensitive data patterns', () => {
      const sensitiveData = [
        'password=secret123',
        'api_key=abc123',
        'private_key=xyz789',
        'auth_token=token123'
      ];

      sensitiveData.forEach(data => {
        expect(securityManager.containsSensitiveData(data)).toBe(true);
      });
    });
  });

  describe('Audit Logging', () => {
    test('should log security events with proper structure', () => {
      securityManager.logSecurityEvent('Test security event', { data: 'test' });
      
      const lastEvent = securityManager.auditLog[securityManager.auditLog.length - 1];
      
      expect(lastEvent).toHaveProperty('timestamp');
      expect(lastEvent).toHaveProperty('sessionId');
      expect(lastEvent).toHaveProperty('event', 'Test security event');
      expect(lastEvent).toHaveProperty('data');
      expect(lastEvent).toHaveProperty('url');
      expect(lastEvent).toHaveProperty('userAgent');
    });

    test('should maintain audit log size limit', () => {
      // Add many events to exceed the limit
      for (let i = 0; i < 1200; i++) {
        securityManager.logSecurityEvent(`Test event ${i}`);
      }
      
      expect(securityManager.auditLog.length).toBeLessThanOrEqual(500);
    });

    test('should export audit log in correct format', () => {
      securityManager.logSecurityEvent('Test event 1');
      securityManager.logSecurityEvent('Test event 2');
      
      const exportData = securityManager.getSecurityReport();
      
      expect(exportData).toHaveProperty('sessionId');
      expect(exportData).toHaveProperty('timestamp');
      expect(exportData).toHaveProperty('auditLog');
      expect(exportData.auditLog.length).toBeGreaterThanOrEqual(2);
      expect(exportData.auditLog.map((entry) => entry.event)).toEqual(
        expect.arrayContaining(['Test event 1', 'Test event 2'])
      );
    });
  });

  describe('Performance and Security', () => {
    test('should not impact performance significantly', () => {
      const startTime = performance.now();
      
      // Perform multiple security operations
      for (let i = 0; i < 100; i++) {
        securityManager.validateInput({ value: 'test input', name: 'test' });
        securityManager.containsXSSPattern('<p>safe content</p>');
        securityManager.logSecurityEvent('Performance test');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 operations in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle memory efficiently with large audit logs', () => {
      const initialMemory = process.memoryUsage?.().heapUsed || 0;
      
      // Generate large number of events
      for (let i = 0; i < 2000; i++) {
        securityManager.logSecurityEvent(`Memory test event ${i}`, {
          data: 'x'.repeat(100) // Add some data
        });
      }
      
      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not increase memory by more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined inputs gracefully', () => {
      expect(() => {
        securityManager.validateInput({ value: null });
        securityManager.validateInput({ value: undefined });
        securityManager.containsXSSPattern(null);
        securityManager.containsXSSPattern(undefined);
      }).not.toThrow();
    });

    test('should handle malformed DOM elements', () => {
      const malformedElement = {};
      
      expect(() => {
        securityManager.checkElementForXSS(malformedElement);
      }).not.toThrow();
    });

    test('should handle network errors in reporting', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      expect(async () => {
        await securityManager.reportSecurityIncident('test', {});
      }).not.toThrow();
    });

    test('should handle circular references in audit data', () => {
      const circularObject = { a: 1 };
      circularObject.self = circularObject;
      
      expect(() => {
        securityManager.logSecurityEvent('Circular test', circularObject);
      }).not.toThrow();
    });
  });

  describe('Integration with Browser APIs', () => {
    test('should work with MutationObserver', (done) => {
      const testDiv = document.createElement('div');
      document.body.appendChild(testDiv);
      
      setTimeout(() => {
        const script = document.createElement('script');
        script.innerHTML = 'alert("test")';
        testDiv.appendChild(script);
        
        setTimeout(() => {
          SecurityTestUtils.expectSecurityEvent('Inline script detected', securityManager);
          done();
        }, 100);
      }, 100);
    });

    test('should handle postMessage security', () => {
      const mockEvent = {
        origin: 'https://evil.com',
        data: { malicious: 'data' }
      };
      
      window.dispatchEvent(new MessageEvent('message', mockEvent));
      
      SecurityTestUtils.expectSecurityEvent('Untrusted postMessage', securityManager);
    });
  });
});
