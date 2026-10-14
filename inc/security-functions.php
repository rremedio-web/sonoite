<?php
/**
 * Site-wide hardening hooks (SonoiteSecurityManager singleton).
 *
 * Validates uploads (size, extension, sniffed MIME) and limits upload_mimes to
 * the audio and image types the theme uses, throttles failed logins per IP,
 * disables file editing and XML-RPC, and records violations in the
 * sonoite_security_violations table (schema in functions.php). Required by
 * functions.php after the other inc/ modules. CSP headers live in functions.php;
 * the public report endpoints live in inc/rest-endpoints.php.
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

/**
 * Unified Security Manager Class
 * Centralized security management for the theme
 */
class SonoiteSecurityManager {

    private static $instance = null;
    private $upload_whitelist = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    private $max_file_size;
    private $rate_limit_attempts = 5;
    private $rate_limit_window = 3600; // 1 hour

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->max_file_size = defined('SONOITE_MAX_UPLOAD_SIZE') ? SONOITE_MAX_UPLOAD_SIZE : 50 * 1024 * 1024;
        $this->initSecurityHooks();
    }

    /**
     * Initialize all security hooks
     */
    private function initSecurityHooks() {
        add_action('wp_head', [$this, 'addSecurityMeta']);

        // File upload security
        add_filter('wp_handle_upload_prefilter', [$this, 'secureFileUpload']);
        add_filter('upload_mimes', [$this, 'restrictMimeTypes']);

        // Rate limiting
        add_action('wp_login_failed', [$this, 'handleFailedLogin']);
        add_filter('authenticate', [$this, 'checkRateLimit'], 30, 3);
        add_action('wp_login', [$this, 'log_successful_login'], 10, 2);

        // Admin security
        add_action('admin_init', [$this, 'adminSecurityChecks']);

        // Disable potentially dangerous features
        add_action('init', [$this, 'disableDangerousFeatures']);
    }

    /**
     * Add security meta tags
     */
    public function addSecurityMeta() {
        echo '<meta name="referrer" content="strict-origin-when-cross-origin">' . "\n";
    }

    /**
     * Secure file upload handling
     */
    public function secureFileUpload($file) {
        // Check file size
        if ($file['size'] > $this->max_file_size) {
            $file['error'] = sprintf(__('File size exceeds maximum allowed size (%s).', SONOITE_TEXT_DOMAIN), size_format($this->max_file_size));
            return $file;
        }

        // Check file extension
        $file_ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($file_ext, $this->upload_whitelist)) {
            $file['error'] = __('File type not allowed.', SONOITE_TEXT_DOMAIN);
            $this->log_security_violation('invalid_upload_type', [
                'filename' => $file['name'],
                'extension' => $file_ext
            ]);
            return $file;
        }

        // Check MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowed_mimes = [
            'mp3' => ['audio/mpeg'],
            'wav' => ['audio/wav'],
            'ogg' => ['audio/ogg'],
            'm4a' => ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
            'flac' => ['audio/flac'],
            'aac' => ['audio/aac'],
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'gif' => ['image/gif'],
            'webp' => ['image/webp']
        ];

        $allowed_for_ext = $allowed_mimes[$file_ext] ?? [];
        if (empty($allowed_for_ext) || !in_array($mime_type, $allowed_for_ext, true)) {
            $file['error'] = __('Invalid file type.', SONOITE_TEXT_DOMAIN);
            $this->log_security_violation('mime_type_mismatch', [
                'filename' => $file['name'],
                'expected' => $allowed_for_ext ?: ['unknown'],
                'actual' => $mime_type
            ]);
            return $file;
        }

        // Sanitize filename
        $file['name'] = sanitize_file_name($file['name']);

        return $file;
    }

    /**
     * Restrict MIME types: replaces the core list with the audio and image
     * types the theme accepts.
     */
    public function restrictMimeTypes($mimes) {
        return [
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'm4a' => 'audio/x-m4a',
            'flac' => 'audio/flac',
            'aac' => 'audio/aac',
            'jpg|jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp'
        ];
    }

    /**
     * Handle failed login attempts
     */
    public function handleFailedLogin($username) {
        $ip = $this->getClientIP();
        $attempts = get_transient("failed_login_attempts_$ip") ?: 0;
        $attempts++;

        set_transient("failed_login_attempts_$ip", $attempts, $this->rate_limit_window);

        if ($attempts >= $this->rate_limit_attempts) {
            $this->log_security_violation('rate_limit_exceeded', [
                'ip' => $ip,
                'username' => sanitize_user($username),
                'attempts' => $attempts
            ]);
        }
    }

    /**
     * Check rate limit before authentication
     */
    public function checkRateLimit($user, $username, $password) {
        $ip = $this->getClientIP();
        $attempts = get_transient("failed_login_attempts_$ip") ?: 0;

        if ($attempts >= $this->rate_limit_attempts) {
            return new WP_Error('rate_limit_exceeded', __('Too many failed login attempts. Please try again later.', SONOITE_TEXT_DOMAIN));
        }

        return $user;
    }

    /**
     * Get client IP address
     */
    private function getClientIP() {
        $allowProxyHeaders = (bool) apply_filters('sonoite_allow_proxy_ip_headers', false);
        $ip_headers = $allowProxyHeaders
            ? [
                'HTTP_CF_CONNECTING_IP',
                'HTTP_X_FORWARDED_FOR',
                'HTTP_X_FORWARDED',
                'HTTP_X_CLUSTER_CLIENT_IP',
                'HTTP_FORWARDED_FOR',
                'HTTP_FORWARDED',
                'REMOTE_ADDR'
            ]
            : ['REMOTE_ADDR'];

        foreach ($ip_headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = sanitize_text_field(wp_unslash($_SERVER[$header]));
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : '0.0.0.0';
    }

    /**
     * Admin security checks
     */
    public function adminSecurityChecks() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $this->checkFilePermissions();
        $this->checkConfigSecurity();
    }

    /**
     * Check file permissions
     */
    private function checkFilePermissions() {
        $critical_files = [
            ABSPATH . 'wp-config.php',
            ABSPATH . '.htaccess',
            get_template_directory() . '/functions.php'
        ];

        foreach ($critical_files as $file) {
            if (file_exists($file)) {
                $perms = fileperms($file);
                if ($perms & 0022) {
                    $this->log_security_violation('insecure_file_permissions', ['file' => $file]);
                }
            }
        }
    }

    /**
     * Check configuration security
     */
    private function checkConfigSecurity() {
        // Check for debug mode in production
        if (defined('WP_DEBUG') && WP_DEBUG && (!defined('WP_ENVIRONMENT_TYPE') || !in_array(WP_ENVIRONMENT_TYPE, ['local', 'development']))) {
            $this->log_security_violation('debug_mode_enabled_in_production');
        }
    }

    /**
     * Disable dangerous features
     */
    public function disableDangerousFeatures() {
        // Disable file editing
        if (!defined('DISALLOW_FILE_EDIT')) {
            define('DISALLOW_FILE_EDIT', true);
        }

        // Remove WordPress version from head
        remove_action('wp_head', 'wp_generator');

        // Disable XML-RPC
        add_filter('xmlrpc_enabled', '__return_false');
    }

    /**
     * Log security violation
     */
    public function log_security_violation($type, $details = []) {
        global $wpdb;

        $table_name = $wpdb->prefix . 'sonoite_security_violations';

        // Check if table exists
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
            if (function_exists('sonoite_secure_create_security_table')) {
                sonoite_secure_create_security_table();
            }
        }

        $violation_data = [
            'violation_type' => sanitize_text_field($type),
            'violation_details' => wp_json_encode($details),
            'ip_address' => $this->getClientIP(),
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'user_id' => get_current_user_id(),
            'severity' => $this->determine_severity($type),
            'status' => 'new'
        ];

        $result = $wpdb->insert($table_name, $violation_data);

        if ($result === false) {
            error_log('Sonoite: Failed to log security violation: ' . $wpdb->last_error);
        }
    }

    /**
     * Determine violation severity
     */
    private function determine_severity($type) {
        $high_types = ['rate_limit_exceeded', 'unauthorized_access'];
        $medium_types = ['invalid_audio_extension', 'unauthorized_audio_host', 'invalid_upload_type'];

        if (in_array($type, $high_types)) return 'high';
        if (in_array($type, $medium_types)) return 'medium';
        return 'low';
    }

    /**
     * Log successful login
     */
    public function log_successful_login($user_login, $user) {
        // Clear failed login attempts on successful login
        $ip = $this->getClientIP();
        delete_transient("failed_login_attempts_$ip");
    }
}

// Initialize security manager
SonoiteSecurityManager::getInstance();
