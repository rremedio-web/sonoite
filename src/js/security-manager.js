/**
 * Client-Side Security Manager for Sonoite Theme
 * Comprehensive client-side security measures and validation
 */

export class SecurityManager {
    constructor(config = {}) {
        this.config = {
            enableCSPReporting: config.enableCSPReporting !== false,
            enableIntegrityChecks: config.enableIntegrityChecks !== false,
            enableInputValidation: config.enableInputValidation !== false,
            enableXSSProtection: config.enableXSSProtection !== false,
            enableAuditLogging: config.enableAuditLogging !== false,
            maxFormSubmissions: config.maxFormSubmissions || 5,
            formSubmissionWindow: config.formSubmissionWindow || 60000, // 1 minute
            allowedDomains: config.allowedDomains || [window.location.hostname],
            reportingEndpoint: config.reportingEndpoint || null,
            ...config
        };

        this.formSubmissions = 0;
        this.lastFormSubmission = 0;
        this.auditLog = [];
        this.sessionId = this.generateSessionId();
        this.trustedOrigins = new Set(this.config.allowedDomains);
        this.debugLogging = Boolean(config.debugLogging || window.SONOITE_DEBUG === true);
        
        // Enhanced security properties
        this.isDevMode = process.env.NODE_ENV === 'development';
        this.devtoolsDetected = false;
        this.securityViolations = 0;
        this.maxViolations = 5;
        this.mutationObservers = new Set();
        this.intervalIds = new Set();
        this.timeoutIds = new Set();
        this.originalGlobals = {
            eval: window.eval,
            Function: window.Function,
            setTimeout: window.setTimeout,
            setInterval: window.setInterval,
            localStorageSetItem: null,
            sessionStorageSetItem: null,
            consoleMethods: null
        };

        // P0-MEMORY-FIX: AbortController for event listener cleanup
        this.abortController = new AbortController();

        this.init();
    }

    /**
     * Initialize security manager
     */
    init() {
        this.logSecurityEvent('SecurityManager initialized', { config: this.config });
        
        // Set up security measures
        this.setupCSPReporting();
        this.setupInputValidation();
        this.setupXSSProtection();
        this.setupIntegrityChecks();
        this.setupFormSecurity();
        this.setupNavigationSecurity();
        this.setupStorageSecurity();
        
        // Enhanced security initialization
        if (!this.isDevMode) {
            this.setupAdvancedSecurityMonitoring();
        }

        // Devtools detection is treated as a debug-only diagnostic
        if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
            this.setupAdvancedDevtoolsDetection();
        }

        // Monitor for suspicious activity
        this.startSecurityMonitoring();

        if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
            console.log('🔒 Sonoite Security Manager initialized');
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'sec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    registerObserver(observer) {
        this.mutationObservers.add(observer);
        return observer;
    }

    registerInterval(callback, intervalMs) {
        const intervalId = this.originalGlobals.setInterval.call(window, callback, intervalMs);
        this.intervalIds.add(intervalId);
        return intervalId;
    }

    registerTimeout(callback, timeoutMs) {
        const timeoutId = this.originalGlobals.setTimeout.call(window, () => {
            this.timeoutIds.delete(timeoutId);
            callback();
        }, timeoutMs);
        this.timeoutIds.add(timeoutId);
        return timeoutId;
    }

    restorePatchedGlobals() {
        if (this.originalGlobals.eval) {
            window.eval = this.originalGlobals.eval;
        }

        if (this.originalGlobals.Function) {
            window.Function = this.originalGlobals.Function;
        }

        if (this.originalGlobals.setTimeout) {
            window.setTimeout = this.originalGlobals.setTimeout;
        }

        if (this.originalGlobals.setInterval) {
            window.setInterval = this.originalGlobals.setInterval;
        }

        if (this.originalGlobals.localStorageSetItem) {
            localStorage.setItem = this.originalGlobals.localStorageSetItem;
        }

        if (this.originalGlobals.sessionStorageSetItem) {
            sessionStorage.setItem = this.originalGlobals.sessionStorageSetItem;
        }

        if (this.originalGlobals.consoleMethods) {
            Object.keys(this.originalGlobals.consoleMethods).forEach((key) => {
                if (typeof this.originalGlobals.consoleMethods[key] === 'function') {
                    console[key] = this.originalGlobals.consoleMethods[key];
                }
            });
        }
    }

    /**
     * Setup Content Security Policy reporting
     */
    setupCSPReporting() {
        if (!this.config.enableCSPReporting) return;

        // Listen for CSP violations (P0-MEMORY-FIX: add abort signal)
        document.addEventListener('securitypolicyviolation', (event) => {
            this.handleCSPViolation(event);
        }, { signal: this.abortController.signal });

        // Legacy webkit CSP reporting (P0-MEMORY-FIX: add abort signal)
        window.addEventListener('beforeload', (event) => {
            if (event.url && !this.isUrlAllowed(event.url)) {
                this.logSecurityEvent('Potential CSP violation (webkit)', {
                    url: event.url,
                    element: event.target.tagName
                });
            }
        }, { signal: this.abortController.signal });
    }

    /**
     * Handle CSP violation
     */
    handleCSPViolation(event) {
        const violation = {
            blockedURI: event.blockedURI,
            columnNumber: event.columnNumber,
            documentURI: event.documentURI,
            effectiveDirective: event.effectiveDirective,
            lineNumber: event.lineNumber,
            originalPolicy: event.originalPolicy,
            referrer: event.referrer,
            sourceFile: event.sourceFile,
            violatedDirective: event.violatedDirective
        };

        this.logSecurityEvent('CSP violation detected', violation);
        this.reportSecurityIncident('csp_violation', violation);
    }

    /**
     * Setup input validation for all forms
     */
    setupInputValidation() {
        if (!this.config.enableInputValidation) return;

        // Monitor all form inputs (P0-MEMORY-FIX: add abort signal)
        document.addEventListener('input', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                this.validateInput(event.target);
            }
        }, { signal: this.abortController.signal });

        // Monitor form submissions (P0-MEMORY-FIX: add abort signal)
        document.addEventListener('submit', (event) => {
            if (!this.validateForm(event.target)) {
                event.preventDefault();
                this.logSecurityEvent('Form submission blocked', {
                    form: event.target.action,
                    reason: 'Validation failed'
                });
            }
        }, { signal: this.abortController.signal });
    }

    /**
     * Validate individual input
     */
    validateInput(input) {
        if (!input || typeof input !== 'object') {
            return false;
        }

        const rawValue = input.value;
        const value = typeof rawValue === 'string' ? rawValue : String(rawValue || '');
        const type = typeof input.type === 'string' ? input.type.toLowerCase() : '';
        const name = typeof input.name === 'string' ? input.name : '';
        let isValid = true;

        if (type === 'email' && value) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
                this.logSecurityEvent('Invalid email input', { name, value: value.substring(0, 100) });
                isValid = false;
            }
        }

        // Check for XSS patterns
        if (this.containsXSSPattern(value)) {
            this.logSecurityEvent('XSS pattern detected in input', {
                name,
                type,
                pattern: this.getXSSPattern(value)
            });
            
            // Sanitize input
            input.value = this.sanitizeInput(value);
            this.showSecurityWarning('Potentially dangerous input detected and sanitized');
            isValid = false;
        }

        // Check for SQL injection patterns
        if (this.containsSQLInjectionPattern(value)) {
            this.logSecurityEvent('SQL injection pattern detected', {
                name,
                type,
                value: value.substring(0, 100) // Log first 100 chars only
            });
            isValid = false;
        }

        // File upload validation
        if (type === 'file') {
            const fileValid = this.validateFileInput(input);
            if (!fileValid) {
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * Validate file input
     */
    validateFileInput(input) {
        const files = input.files;
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        for (let file of files) {
            // Check file type
            if (!allowedTypes.includes(file.type)) {
                this.logSecurityEvent('Invalid file type uploaded', {
                    filename: file.name,
                    type: file.type,
                    size: file.size
                });
                input.value = '';
                this.showSecurityWarning(`File type ${file.type} not allowed`);
                return false;
            }

            // Check file size
            if (file.size > maxSize) {
                this.logSecurityEvent('File size exceeds limit', {
                    filename: file.name,
                    size: file.size,
                    limit: maxSize
                });
                input.value = '';
                this.showSecurityWarning('File size exceeds limit (50MB)');
                return false;
            }

            // Check filename for dangerous patterns
            if (this.containsDangerousFilename(file.name)) {
                this.logSecurityEvent('Dangerous filename detected', {
                    filename: file.name
                });
                input.value = '';
                this.showSecurityWarning('Filename contains dangerous characters');
                return false;
            }
        }

        return true;
    }

    /**
     * Validate entire form
     */
    validateForm(form) {
        // Rate limiting
        if (!this.checkFormRateLimit()) {
            this.showSecurityWarning('Too many form submissions. Please wait.');
            return false;
        }

        // Check for honeypot fields
        const honeypot = form.querySelector('input[name="website"], input[name="url"], input[style*="display:none"]');
        if (honeypot && honeypot.value) {
            this.logSecurityEvent('Honeypot field filled', {
                form: form.action,
                field: honeypot.name
            });
            return false;
        }

        // Validate all inputs
        const inputs = form.querySelectorAll('input, textarea, select');
        for (let input of inputs) {
            if (!this.validateInput(input)) {
                return false;
            }
        }

        // Check CSRF token
        const csrfToken = form.querySelector('input[name="_token"], input[name="csrf_token"]');
        if (csrfToken && !this.validateCSRFToken(csrfToken.value)) {
            this.logSecurityEvent('Invalid CSRF token', {
                form: form.action
            });
            return false;
        }

        this.formSubmissions++;
        this.lastFormSubmission = Date.now();
        return true;
    }

    /**
     * Check form submission rate limiting
     */
    checkFormRateLimit() {
        const now = Date.now();
        
        // Reset count if window expired
        if (now - this.lastFormSubmission > this.config.formSubmissionWindow) {
            this.formSubmissions = 0;
        }

        const isAllowed = this.formSubmissions < this.config.maxFormSubmissions;
        if (!isAllowed) {
            this.logSecurityEvent('Rate limit exceeded', {
                submissions: this.formSubmissions,
                max: this.config.maxFormSubmissions,
                windowMs: this.config.formSubmissionWindow
            });
        }

        return isAllowed;
    }

    /**
     * Setup XSS protection
     */
    setupXSSProtection() {
        if (!this.config.enableXSSProtection) return;

        // Monitor DOM mutations for potential XSS
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkElementForXSS(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        this.registerObserver(observer);

        // Override dangerous functions
        this.overrideDangerousFunctions();
    }

    /**
     * Check element for XSS
     */
    checkElementForXSS(element) {
        if (!element || typeof element !== 'object') {
            return;
        }

        const hasAttribute = typeof element.hasAttribute === 'function';
        const getAttribute = typeof element.getAttribute === 'function';
        const removeAttribute = typeof element.removeAttribute === 'function';
        const tagName = typeof element.tagName === 'string' ? element.tagName : 'UNKNOWN';

        // Check for inline scripts
        if (tagName === 'SCRIPT' && element.innerHTML) {
            this.logSecurityEvent('Inline script detected', {
                content: element.innerHTML.substring(0, 100)
            });
        }

        // Check for dangerous event handlers
        const dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus'];
        dangerousAttributes.forEach(attr => {
            if (hasAttribute && element.hasAttribute(attr)) {
                this.logSecurityEvent('Dangerous event handler detected', {
                    element: tagName,
                    attribute: attr,
                    value: getAttribute ? element.getAttribute(attr) : null
                });
                if (removeAttribute) {
                    element.removeAttribute(attr);
                }
            }
        });

        // Check for javascript: URLs
        const urlAttributes = ['href', 'src', 'action'];
        urlAttributes.forEach(attr => {
            if (!getAttribute) {
                return;
            }

            const value = element.getAttribute(attr);
            if (value && value.toLowerCase().startsWith('javascript:')) {
                this.logSecurityEvent('JavaScript URL detected', {
                    element: tagName,
                    attribute: attr,
                    value
                });
                if (removeAttribute) {
                    element.removeAttribute(attr);
                }
            }
        });
    }

    /**
     * Override potentially dangerous functions
     */
    overrideDangerousFunctions() {
        const manager = this;
        // Override eval
        const originalEval = this.originalGlobals.eval;
        window.eval = (code) => {
            manager.logSecurityEvent('eval() called', {
                code: typeof code === 'string' ? code.substring(0, 100) : typeof code
            });
            // In production, you might want to block eval entirely
            return originalEval(code);
        };

        // Override Function constructor
        const originalFunction = this.originalGlobals.Function;
        window.Function = function(...args) {
            manager.logSecurityEvent('Function constructor called', {
                args: args.map(arg => typeof arg === 'string' ? arg.substring(0, 50) : typeof arg)
            });
            return originalFunction.apply(this, args);
        };
        window.Function.prototype = originalFunction.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(window.Function, originalFunction);
        }

        // Override setTimeout/setInterval with string arguments
        const originalSetTimeout = this.originalGlobals.setTimeout;
        window.setTimeout = (handler, timeout, ...args) => {
            if (typeof handler === 'string') {
                manager.logSecurityEvent('setTimeout with string handler', {
                    handler: handler.substring(0, 100)
                });
            }
            return originalSetTimeout(handler, timeout, ...args);
        };

        const originalSetInterval = this.originalGlobals.setInterval;
        window.setInterval = (handler, timeout, ...args) => {
            if (typeof handler === 'string') {
                manager.logSecurityEvent('setInterval with string handler', {
                    handler: handler.substring(0, 100)
                });
            }
            return originalSetInterval(handler, timeout, ...args);
        };
    }

    /**
     * Setup integrity checks
     */
    setupIntegrityChecks() {
        if (!this.config.enableIntegrityChecks) return;

        // Check script integrity
        document.addEventListener('DOMContentLoaded', () => {
            this.checkScriptIntegrity();
            this.checkLinkIntegrity();
        }, { signal: this.abortController.signal, once: true });
    }

    /**
     * Check script tag integrity
     */
    checkScriptIntegrity() {
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const src = script.src;
            const integrity = script.integrity;
            
            if (!integrity && !this.isInternalScript(src)) {
                this.logSecurityEvent('External script without integrity', { src });
            }
        });
    }

    /**
     * Check link tag integrity
     */
    checkLinkIntegrity() {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            const href = link.href;
            const integrity = link.integrity;
            
            if (!integrity && !this.isInternalResource(href)) {
                this.logSecurityEvent('External stylesheet without integrity', { href });
            }
        });
    }

    /**
     * Setup form security measures
     */
    setupFormSecurity() {
        // Add CSRF tokens to forms
        document.addEventListener('DOMContentLoaded', () => {
            this.addCSRFTokensToForms();
        }, { signal: this.abortController.signal, once: true });

        // Monitor form creation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'FORM') {
                        this.secureForm(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        this.registerObserver(observer);
    }

    /**
     * Secure individual form
     */
    secureForm(form) {
        // Add CSRF token if not present
        if (!form.querySelector('input[name="_token"], input[name="csrf_token"]')) {
            this.addCSRFToken(form);
        }

        // Add honeypot field
        this.addHoneypotField(form);

        // Ensure HTTPS for sensitive forms
        if (form.action && form.action.startsWith('http://') && this.isSensitiveForm(form)) {
            this.logSecurityEvent('Insecure form action', {
                action: form.action,
                method: form.method
            });
        }
    }

    /**
     * Add CSRF token to form
     */
    addCSRFToken(form) {
        const token = this.generateCSRFToken();
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_token';
        input.value = token;
        form.appendChild(input);
    }

    /**
     * Add honeypot field to form
     */
    addHoneypotField(form) {
        const honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = 'website';
        honeypot.style.display = 'none';
        honeypot.tabIndex = -1;
        honeypot.autocomplete = 'off';
        form.appendChild(honeypot);
    }

    /**
     * Setup navigation security
     */
    setupNavigationSecurity() {
        // Monitor navigation events (P0-MEMORY-FIX: add abort signal)
        window.addEventListener('beforeunload', (event) => {
            this.logSecurityEvent('Page unload');
        }, { signal: this.abortController.signal });

        // Monitor hash changes (P0-MEMORY-FIX: add abort signal)
        window.addEventListener('hashchange', (event) => {
            if (this.containsDangerousHash(window.location.hash)) {
                this.logSecurityEvent('Dangerous hash detected', {
                    hash: window.location.hash
                });
            }
        }, { signal: this.abortController.signal });

        // Monitor postMessage events (P0-MEMORY-FIX: add abort signal)
        window.addEventListener('message', (event) => {
            if (!this.isOriginTrusted(event.origin)) {
                this.logSecurityEvent('Untrusted postMessage', {
                    origin: event.origin,
                    data: typeof event.data
                });
            }
        }, { signal: this.abortController.signal });
    }

    /**
     * Setup storage security
     */
    setupStorageSecurity() {
        // Monitor localStorage usage
        const localStorageProto = Object.getPrototypeOf(localStorage);
        if (!this.originalGlobals.localStorageSetItem) {
            this.originalGlobals.localStorageSetItem = localStorageProto?.setItem || localStorage.setItem;
        }
        const originalSetItem = this.originalGlobals.localStorageSetItem;
        const localStorageSetItem = (key, value) => {
            if (
                this.containsSensitiveData(String(key || '')) ||
                this.containsSensitiveData(String(value || ''))
            ) {
                this.logSecurityEvent('Sensitive data in localStorage', { key });
            }
            return originalSetItem.call(localStorage, key, value);
        };
        localStorage.setItem = localStorageSetItem;
        if (localStorageProto && typeof localStorageProto.setItem === 'function') {
            localStorageProto.setItem = localStorageSetItem;
        }

        // Monitor sessionStorage usage
        const sessionStorageProto = Object.getPrototypeOf(sessionStorage);
        if (!this.originalGlobals.sessionStorageSetItem) {
            this.originalGlobals.sessionStorageSetItem = sessionStorageProto?.setItem || sessionStorage.setItem;
        }
        const originalSessionSetItem = this.originalGlobals.sessionStorageSetItem;
        const sessionStorageSetItem = (key, value) => {
            if (
                this.containsSensitiveData(String(key || '')) ||
                this.containsSensitiveData(String(value || ''))
            ) {
                this.logSecurityEvent('Sensitive data in sessionStorage', { key });
            }
            return originalSessionSetItem.call(sessionStorage, key, value);
        };
        sessionStorage.setItem = sessionStorageSetItem;
        if (sessionStorageProto && typeof sessionStorageProto.setItem === 'function') {
            sessionStorageProto.setItem = sessionStorageSetItem;
        }
    }

    /**
     * Start security monitoring
     */
    startSecurityMonitoring() {
        // Monitor console access (devtools detection)
        // Temporarily disabled console clearing for debugging
        /*
        let devtools = false;
        setInterval(() => {
            const before = performance.now();
            console.clear();
            const after = performance.now();
            
            if (!devtools && after - before > 100) {
                devtools = true;
                this.logSecurityEvent('Developer tools opened');
            }
        }, 1000);
        */

        // Monitor for suspicious JavaScript execution patterns
        this.monitorExecutionPatterns();
        
        // Periodic security health check
        this.registerInterval(() => {
            this.performSecurityHealthCheck();
        }, 30000); // Every 30 seconds
    }

    /**
     * Monitor execution patterns
     */
    monitorExecutionPatterns() {
        // Monitor global variable pollution
        const originalKeys = Object.keys(window);
        this.registerInterval(() => {
            const currentKeys = Object.keys(window);
            const newKeys = currentKeys.filter(key => !originalKeys.includes(key));
            
            if (newKeys.length > 0) {
                this.logSecurityEvent('Global namespace pollution', {
                    newVariables: newKeys.slice(0, 10) // Log first 10
                });
            }
        }, 10000);
    }

    /**
     * Perform security health check
     */
    performSecurityHealthCheck() {
        const healthCheck = {
            timestamp: new Date().toISOString(),
            cspEnabled: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
            httpsEnabled: window.location.protocol === 'https:',
            auditLogSize: this.auditLog.length,
            formSubmissions: this.formSubmissions,
            trustedOrigins: this.trustedOrigins.size
        };

        this.logSecurityEvent('Security health check', healthCheck);
    }

    /**
     * Utility methods for security checks
     */
    containsXSSPattern(input) {
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe[^>]*>.*?<\/iframe>/i,
            /eval\s*\(/i,
            /expression\s*\(/i,
            /['"`]\s*;?\s*alert\s*\(/i
        ];

        return xssPatterns.some(pattern => pattern.test(input));
    }

    getXSSPattern(input) {
        const xssPatterns = [
            { name: 'script', pattern: /<script[^>]*>.*?<\/script>/i },
            { name: 'javascript', pattern: /javascript:/i },
            { name: 'event_handler', pattern: /on\w+\s*=/i },
            { name: 'iframe', pattern: /<iframe[^>]*>.*?<\/iframe>/i },
            { name: 'eval', pattern: /eval\s*\(/i },
            { name: 'expression', pattern: /expression\s*\(/i },
            { name: 'alert_injection', pattern: /['"`]\s*;?\s*alert\s*\(/i }
        ];

        for (let item of xssPatterns) {
            if (item.pattern.test(input)) {
                return item.name;
            }
        }
        return 'unknown';
    }

    containsSQLInjectionPattern(input) {
        const sqlPatterns = [
            /(\'|\").*(\;|union|select|insert|update|delete|drop|create|alter)/i,
            /union\s+select/i,
            /\'\s*or\s*\'/i,
            /\;\s*drop/i
        ];

        return sqlPatterns.some(pattern => pattern.test(input));
    }

    containsDangerousFilename(filename) {
        const dangerousPatterns = [
            /\.\./,
            /[<>:"|?*]/,
            /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,
            /\.(exe|bat|cmd|scr|pif|com|php|phtml|phar)$/i
        ];

        return dangerousPatterns.some(pattern => pattern.test(filename));
    }

    containsDangerousHash(hash) {
        return this.containsXSSPattern(hash) || hash.includes('javascript:');
    }

    containsSensitiveData(data) {
        const sensitivePatterns = [
            /password/i,
            /token/i,
            /api[-_]?key/i,
            /secret/i,
            /private[-_]?key/i
        ];

        return sensitivePatterns.some(pattern => pattern.test(data));
    }

    isUrlAllowed(url) {
        try {
            if (typeof url !== 'string' || url.length === 0) {
                return false;
            }

            if (/(?:\.\.\/|%2e%2e%2f)/i.test(url)) {
                return false;
            }

            if (
                url.startsWith('/') ||
                url.startsWith('./') ||
                url.startsWith('#') ||
                url.startsWith('mailto:') ||
                url.startsWith('tel:') ||
                url.startsWith('blob:')
            ) {
                return true;
            }

            const urlObj = new URL(url, window.location.origin);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return false;
            }

            const isCurrentOrigin = urlObj.origin === window.location.origin;
            const isTrustedHost = this.trustedOrigins.has(urlObj.hostname);

            if (isTrustedHost && urlObj.port && urlObj.port !== window.location.port && !['80', '443'].includes(urlObj.port)) {
                return false;
            }

            return isCurrentOrigin || isTrustedHost;
        } catch {
            return false;
        }
    }

    isOriginTrusted(origin) {
        try {
            const urlObj = new URL(origin);
            return this.trustedOrigins.has(urlObj.hostname);
        } catch {
            return false;
        }
    }

    isInternalScript(src) {
        return src.startsWith(window.location.origin) || src.startsWith('/');
    }

    isInternalResource(href) {
        return href.startsWith(window.location.origin) || href.startsWith('/');
    }

    isSensitiveForm(form) {
        const sensitiveTypes = ['password', 'email'];
        const inputs = form.querySelectorAll('input');
        
        return Array.from(inputs).some(input => 
            sensitiveTypes.includes(input.type) || 
            input.name.toLowerCase().includes('password') ||
            input.name.toLowerCase().includes('email')
        );
    }

    sanitizeInput(input) {
        return input
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    }

    generateCSRFToken() {
        const randomPart = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 16).padEnd(16, '0');
        return `csrf_${Date.now()}_${randomPart}`;
    }

    validateCSRFToken(token) {
        return typeof token === 'string' && /^csrf_\d+_[a-zA-Z0-9]{16}$/.test(token);
    }

    isDebugLoggingEnabled() {
        return this.debugLogging || window.SONOITE_DEBUG === true;
    }

    addCSRFTokensToForms() {
        const forms = document.querySelectorAll('form:not([data-csrf-added])');
        forms.forEach(form => {
            this.secureForm(form);
            form.setAttribute('data-csrf-added', 'true');
        });
    }

    logSecurityEvent(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            event,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.auditLog.push(logEntry);

        // Keep log size manageable
        if (this.auditLog.length > 500) {
            this.auditLog = this.auditLog.slice(-500);
        }

        if (this.isDebugLoggingEnabled()) {
            console.log('🔒 SECURITY EVENT:', logEntry);
        }
    }

    getReportingNonce() {
        if (typeof window === 'undefined') {
            return '';
        }

        return window.sonoiteData?.restNonce
            || window.sonoiteData?.nonce
            || window.sonoiteSecurityConfig?.restNonce
            || window.sonoiteSecurityConfig?.nonce
            || '';
    }

    normalizeViolationType(type, fallback = 'security_violation') {
        const allowedTypes = [
            'csp_violation',
            'integrity_failure',
            'xss_attempt',
            'injection_attempt',
            'track_loader_error',
            'audio_security_violation',
            'security_violation',
            'performance_error',
            'critical_error'
        ];

        if (typeof type === 'string' && allowedTypes.includes(type)) {
            return type;
        }

        return fallback;
    }

    buildSecurityReportDetails(eventType, details) {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const payload = {
            eventType,
            details,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            url,
            userAgent: navigator.userAgent
        };

        let serialized = '';
        try {
            serialized = JSON.stringify(payload);
        } catch (error) {
            serialized = String(eventType || 'security_event');
        }

        if (serialized.length > 10000) {
            serialized = serialized.slice(0, 10000);
        }

        return serialized;
    }

    async reportSecurityIncident(type, data) {
        if (!this.config.reportingEndpoint) return;
        if (typeof fetch !== 'function') return;

        try {
            const violationType = this.normalizeViolationType(type);
            const url = typeof window !== 'undefined' ? window.location.href : '';
            const headers = {
                'Content-Type': 'application/json',
                'X-Security-Report': 'true'
            };
            const nonce = this.getReportingNonce();
            if (nonce) {
                headers['X-WP-Nonce'] = nonce;
            }

            await fetch(this.config.reportingEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    violation_type: violationType,
                    details: this.buildSecurityReportDetails(type, data),
                    url
                })
            });
        } catch (error) {
            console.error('Failed to report security incident:', error);
        }
    }

    getSecurityReport() {
        return {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            config: this.config,
            auditLog: this.auditLog,
            formSubmissions: this.formSubmissions,
            trustedOrigins: Array.from(this.trustedOrigins)
        };
    }

    /**
     * Advanced devtools detection
     */
    setupAdvancedDevtoolsDetection() {
        // Method 1: Performance-based detection
        let devtools = {
            open: false,
            orientation: null
        };

        this.registerInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 ||
                window.outerWidth - window.innerWidth > 200) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.handleDevtoolsDetection();
                }
            } else {
                devtools.open = false;
            }
        }, 500);

        // Method 2: Console API monitoring
        if (!this.originalGlobals.consoleMethods) {
            this.originalGlobals.consoleMethods = {};
            Object.keys(console).forEach((key) => {
                if (typeof console[key] === 'function') {
                    this.originalGlobals.consoleMethods[key] = console[key];
                }
            });
        }

        const originalConsole = this.originalGlobals.consoleMethods;

        Object.keys(console).forEach(key => {
            if (typeof console[key] === 'function') {
                console[key] = (...args) => {
                    if (!this.isDevMode) {
                        this.handleConsoleUsage(key, args);
                    }
                    return originalConsole[key].apply(console, args);
                };
            }
        });

        // Method 3: Debugger statement detection
        this.registerInterval(() => {
            const start = performance.now();
            debugger; // This will cause a delay if devtools are open
            const end = performance.now();

            if (end - start > 100) {
                this.handleDevtoolsDetection();
            }
        }, 3000);

        // Method 4: Context menu detection (P0-MEMORY-FIX: add abort signal)
        document.addEventListener('contextmenu', (e) => {
            if (!this.isDevMode) {
                e.preventDefault();
                this.reportSecurityViolation('Context menu access attempted', {
                    target: e.target.tagName,
                    timestamp: new Date().toISOString()
                });
            }
        }, { signal: this.abortController.signal });

        // Method 5: Key combination detection (P0-MEMORY-FIX: add abort signal)
        document.addEventListener('keydown', (e) => {
            if (!this.isDevMode) {
                // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
                if (e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key)) ||
                    (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault();
                    this.handleDevtoolsDetection();
                }
            }
        }, { signal: this.abortController.signal });
    }

    /**
     * Handle devtools detection
     */
    handleDevtoolsDetection() {
        if (this.isDevMode) return;

        this.devtoolsDetected = true;
        this.securityViolations++;

        // Log security event
        this.reportSecurityViolation('Developer tools detected', {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            violationCount: this.securityViolations
        });

        // Progressive response based on violation count
        if (this.securityViolations >= this.maxViolations) {
            this.initiateSecurityLockdown();
        } else {
            // Show warning
            this.showSecurityWarning('Developer tools detected. This session is being monitored.');
        }
    }

    /**
     * Handle console usage
     */
    handleConsoleUsage(method, args) {
        this.reportSecurityViolation(`Console ${method} usage detected`, {
            method: method,
            args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg)),
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Setup advanced security monitoring
     */
    setupAdvancedSecurityMonitoring() {
        // Monitor for security-related changes
        const securityObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for script injection attempts
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeName === 'SCRIPT' && !node.src) {
                            // Inline script added
                            this.validateInlineScript(node);
                        }
                    });
                }
            });
        });

        securityObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        this.registerObserver(securityObserver);
    }

    /**
     * Validate inline script
     */
    validateInlineScript(scriptElement) {
        const scriptContent = scriptElement.textContent || scriptElement.innerHTML;

        // Check for suspicious patterns
        const suspiciousPatterns = [
            /eval\s*\(/,
            /Function\s*\(/,
            /setTimeout\s*\(\s*["'`]/,
            /setInterval\s*\(\s*["'`]/,
            /document\.write/,
            /\.innerHTML\s*=/,
            /javascript:/
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(scriptContent));

        if (isSuspicious) {
            this.reportSecurityViolation('Suspicious inline script detected', {
                content: scriptContent.substring(0, 100) + '...',
                timestamp: new Date().toISOString()
            });

            // Remove suspicious script
            scriptElement.remove();
        }
    }

    /**
     * Report security violation
     */
    reportSecurityViolation(type, details) {
        const url = window.location.href;
        const violation = {
            violation_type: 'security_violation',
            eventType: type,
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url
        };

        // Send to server
        if (this.config.reportingEndpoint && typeof fetch === 'function') {
            const headers = {
                'Content-Type': 'application/json',
                'X-Security-Report': 'true'
            };
            const nonce = this.getReportingNonce();
            if (nonce) {
                headers['X-WP-Nonce'] = nonce;
            }

            fetch(this.config.reportingEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    violation_type: 'security_violation',
                    details: this.buildSecurityReportDetails(type, details),
                    url
                })
            }).catch(err => {
                console.error('Failed to report security violation:', err);
            });
        }

        // Store locally as backup
        try {
            const violations = JSON.parse(localStorage.getItem('sonoite_security_violations') || '[]');
            violations.push(violation);
            localStorage.setItem('sonoite_security_violations', JSON.stringify(violations.slice(-50)));
        } catch (e) {
            // Ignore localStorage errors
        }
    }

    /**
     * Initiate security lockdown
     */
    initiateSecurityLockdown() {
        // Clear sensitive data
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (e) {
            // Ignore storage errors
        }

        // Disable audio context
        if (window.sonoiteExperience?.audioManager) {
            window.sonoiteExperience.audioManager.dispose();
        }

        // Show lockdown message
        this.showSecurityWarning('Security lockdown initiated. Please refresh the page.', true);

        // Redirect after delay
        this.registerTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }

    /**
     * Show security warning
     */
    showSecurityWarning(message, isLockdown = false) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'security-warning';

        const warningContent = document.createElement('div');
        warningContent.className = 'security-warning-content';

        const title = document.createElement('h3');
        title.textContent = isLockdown ? 'Security Alert' : 'Warning';

        const body = document.createElement('p');
        body.textContent = message;

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'sm-dismiss';
        dismissBtn.type = 'button';
        dismissBtn.textContent = 'Dismiss';

        warningContent.appendChild(title);
        warningContent.appendChild(body);
        warningContent.appendChild(dismissBtn);
        warningDiv.appendChild(warningContent);

        warningDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        document.body.appendChild(warningDiv);

        // Attach CSP-safe dismiss handler
        dismissBtn.addEventListener('click', () => {
            if (warningDiv.parentElement) {
                warningDiv.remove();
            }
        }, { signal: this.abortController.signal });

        // Auto-dismiss after 5 seconds if not lockdown
        if (!isLockdown) {
            this.registerTimeout(() => {
                if (warningDiv.parentElement) {
                    warningDiv.remove();
                }
            }, 5000);
        }
    }

    exportAuditLog() {
        const data = this.getSecurityReport();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sonoite-security-log-${this.sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * P0-MEMORY-FIX: Dispose method to clean up all event listeners
     * Call this when SecurityManager is no longer needed
     */
    dispose() {
        // Abort all event listeners registered with the signal
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.mutationObservers.forEach((observer) => observer.disconnect());
        this.mutationObservers.clear();

        this.intervalIds.forEach((intervalId) => clearInterval(intervalId));
        this.intervalIds.clear();

        this.timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
        this.timeoutIds.clear();

        this.restorePatchedGlobals();

        // Clear audit log to release memory
        this.auditLog = [];

        if (this.isDebugLoggingEnabled()) {
            console.log('[SecurityManager] Disposed - all listeners removed');
        }
    }
}

// Initialize security manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.sonoiteSecurityConfig) {
        window.sonoiteSecurityManager = new SecurityManager(window.sonoiteSecurityConfig);
    } else {
        window.sonoiteSecurityManager = new SecurityManager();
    }
}, { once: true });

export default SecurityManager;
