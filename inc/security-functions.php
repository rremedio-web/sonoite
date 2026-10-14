<?php
/**
 * Consolidated Sonoite Security Functions
 * Comprehensive security measures following OWASP best practices
 * Merged from root and inc/ security files
 *
 * @package SonoiteTheme
 * @version 1.0.0
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
        // Security headers (handled by functions.php, avoid duplication)
        // add_action('init', [$this, 'setSecurityHeaders']);
        add_action('wp_head', [$this, 'addSecurityMeta']);

        // File upload security
        add_filter('wp_handle_upload_prefilter', [$this, 'secureFileUpload']);
        add_filter('upload_mimes', [$this, 'restrictMimeTypes']);

        // REST API security
        add_action('rest_api_init', [$this, 'secure_rest_routes']);
        add_filter('rest_authentication_errors', [$this, 'secure_rest_authentication']);

        // AJAX security
        add_action('wp_ajax_sonoite_track_data', [$this, 'secure_track_data_handler']);
        add_action('wp_ajax_nopriv_sonoite_track_data', [$this, 'secure_track_data_handler']);

        // Form security
        add_filter('wp_kses_allowed_html', [$this, 'restrictAllowedHtml'], 10, 2);

        // Rate limiting
        add_action('wp_login_failed', [$this, 'handleFailedLogin']);
        add_filter('authenticate', [$this, 'checkRateLimit'], 30, 3);
        add_action('wp_login', [$this, 'log_successful_login'], 10, 2);

        // Content security
        add_filter('the_content', [$this, 'sanitizeContent']);
        add_filter('comment_text', [$this, 'sanitizeContent']);

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
     * Restrict MIME types
     */
    public function restrictMimeTypes($mimes) {
        // Remove potentially dangerous file types
        unset($mimes['exe'], $mimes['bat'], $mimes['cmd'], $mimes['com']);
        unset($mimes['pif'], $mimes['scr'], $mimes['vbs'], $mimes['js']);

        // Return only allowed types
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
     * Secure REST API routes
     * Note: Tracks endpoint is registered in inc/rest-endpoints.php to remain publicly accessible
     * This only registers security-specific endpoints to avoid conflicts
     */
    public function secure_rest_routes() {
        // REMOVED: /tracks endpoint - now handled by inc/rest-endpoints.php
        // The tracks endpoint needs to be public for frontend access
        // Rate limiting is still applied via sonoite_check_rate_limit() in the callback

        // Only register security-specific endpoints here to avoid duplication
        // This endpoint is NOT duplicated in rest-endpoints.php
        register_rest_route('sonoite/v1', '/security-violation-internal', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_security_report'],
            'permission_callback' => [$this, 'check_security_report_permissions'],
            'args' => [
                'violation_type' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => function($param) {
                        $allowed_types = ['csp_violation', 'xss_attempt', 'injection_attempt', 'rate_limit'];
                        return in_array($param, $allowed_types);
                    }
                ],
                'details' => [
                    'required' => true,
                    'sanitize_callback' => [$this, 'sanitize_security_details'],
                ]
            ]
        ]);
    }

    /**
     * Check permissions for track data access
     */
    public function check_track_permissions($request) {
        // Allow public access for tracks (they're meant to be public)
        // but still enforce rate limiting
        if (!$this->check_rate_limit('track_access', 30, 60)) {
            return new WP_Error(
                'rest_rate_limited',
                __('Rate limit exceeded. Please try again later.', SONOITE_TEXT_DOMAIN),
                ['status' => 429]
            );
        }
        return true;
    }

    /**
     * Check permissions for security report submission
     */
    public function check_security_report_permissions($request) {
        if (!$this->check_rate_limit('security_report', 5, 300)) {
            return new WP_Error(
                'rest_rate_limited',
                __('Rate limit exceeded for security reports.', SONOITE_TEXT_DOMAIN),
                ['status' => 429]
            );
        }
        return true;
    }

    /**
     * Get properly sanitized track data
     */
    public function get_sanitized_tracks($request) {
        $limit = $request->get_param('limit');
        $offset = $request->get_param('offset');

        $tracks = get_posts([
            'post_type' => 'track',
            'posts_per_page' => $limit,
            'offset' => $offset,
            'post_status' => 'publish',
            'orderby' => 'menu_order',
            'order' => 'ASC',
        ]);

        $sanitized_tracks = [];

        foreach ($tracks as $track) {
            $audio_id = get_post_meta($track->ID, 'audio_file', true);
            $audio_url = $audio_id ? wp_get_attachment_url($audio_id) : '';

            $sanitized_track = [
                'id' => intval($track->ID),
                'title' => sanitize_text_field($track->post_title),
                'content' => wp_kses_post($track->post_content),
                'excerpt' => sanitize_text_field($track->post_excerpt),
                'date' => sanitize_text_field($track->post_date),
                'modified' => sanitize_text_field($track->post_modified),
                'status' => sanitize_text_field($track->post_status),
                'audio_url' => esc_url_raw($audio_url),
                'duration' => sanitize_text_field(get_post_meta($track->ID, 'duration', true)),
                'order' => intval(get_post_meta($track->ID, 'track_order', true)),
                'featured_image' => esc_url_raw(get_the_post_thumbnail_url($track->ID, 'sonoite-track-art')),
            ];

            // Only include tracks with valid audio URLs
            if (!empty($sanitized_track['audio_url']) && $this->validate_audio_url($sanitized_track['audio_url'])) {
                $sanitized_tracks[] = $sanitized_track;
            }
        }

        return rest_ensure_response([
            'tracks' => $sanitized_tracks,
            'total' => count($sanitized_tracks),
            'limit' => $limit,
            'offset' => $offset,
            'timestamp' => current_time('timestamp'),
        ]);
    }

    /**
     * Handle security violation reports
     */
    public function handle_security_report($request) {
        $violation_type = $request->get_param('violation_type');
        $details = $request->get_param('details');

        $this->log_security_violation($violation_type, $details);

        return rest_ensure_response([
            'success' => true,
            'message' => __('Security violation reported successfully.', SONOITE_TEXT_DOMAIN)
        ]);
    }

    /**
     * Sanitize security details
     */
    public function sanitize_security_details($details) {
        if (is_array($details)) {
            return array_map('sanitize_text_field', $details);
        }
        return sanitize_text_field($details);
    }

    /**
     * Validate audio URL
     */
    public function validate_audio_url($url) {
        if (empty($url)) {
            return false;
        }

        $parsed_url = wp_parse_url($url);
        if (!$parsed_url) {
            return false;
        }

        // Check allowed hosts
        // SEC-01: CDN hosts removed (Dec 3, 2025) - all assets served locally
        $allowed_hosts = [
            wp_parse_url(home_url(), PHP_URL_HOST),
        ];

        if (!in_array($parsed_url['host'], $allowed_hosts)) {
            $this->log_security_violation('unauthorized_audio_host', [
                'url' => $url,
                'host' => $parsed_url['host']
            ]);
            return false;
        }

        // Check file extension
        $allowed_extensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
        $path_info = pathinfo($parsed_url['path']);
        $extension = isset($path_info['extension']) ? strtolower($path_info['extension']) : '';

        if (!in_array($extension, $allowed_extensions)) {
            $this->log_security_violation('invalid_audio_extension', [
                'url' => $url,
                'extension' => $extension
            ]);
            return false;
        }

        return true;
    }

    /**
     * Restrict allowed HTML tags
     */
    public function restrictAllowedHtml($allowed, $context) {
        if ($context === 'post' || $context === 'comment') {
            $allowed = [
                'p' => [],
                'br' => [],
                'strong' => [],
                'em' => [],
                'ul' => [],
                'ol' => [],
                'li' => [],
                'a' => ['href' => [], 'title' => [], 'rel' => []],
                'blockquote' => ['cite' => []],
                'code' => [],
                'pre' => []
            ];
        }
        return $allowed;
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
     * Enhanced rate limiting with IP-based tracking
     */
    public function check_rate_limit($action, $limit = 10, $window = 60) {
        $user_ip = $this->getClientIP();
        $transient_key = 'sonoite_rate_' . md5($action . $user_ip);
        $requests = get_transient($transient_key);

        if ($requests === false) {
            set_transient($transient_key, 1, $window);
            return true;
        }

        if ($requests >= $limit) {
            $this->log_security_violation('rate_limit_exceeded', [
                'action' => $action,
                'ip' => $user_ip,
                'requests' => $requests,
                'limit' => $limit
            ]);
            return false;
        }

        set_transient($transient_key, $requests + 1, $window);
        return true;
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
     * Sanitize content
     */
    public function sanitizeContent($content) {
        $content = wp_kses_post($content);
        $content = preg_replace('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi', '', $content);
        $content = preg_replace('/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/mi', '', $content);
        $content = preg_replace('/\s*(?:on\w+|javascript:|data:)[^>]*/', '', $content);
        return $content;
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
     * Secure REST authentication
     */
    public function secure_rest_authentication($result) {
        $blocked_ips = get_option('sonoite_blocked_ips', []);
        $current_ip = $this->getClientIP();

        if (isset($blocked_ips[$current_ip]) && $blocked_ips[$current_ip] > time()) {
            return new WP_Error(
                'rest_ip_blocked',
                __('Access denied. IP temporarily blocked due to security violations.', SONOITE_TEXT_DOMAIN),
                ['status' => 403]
            );
        }

        return $result;
    }

    /**
     * Secure track data handler
     */
    public function secure_track_data_handler() {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'sonoite_nonce')) {
            wp_die(__('Security check failed.', SONOITE_TEXT_DOMAIN));
        }

        if (!$this->check_rate_limit('track_data', 20, 60)) {
            wp_die(__('Rate limit exceeded.', SONOITE_TEXT_DOMAIN));
        }

        $response = $this->get_sanitized_tracks(new WP_REST_Request());
        wp_send_json_success($response);
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

        // Handle critical violations
        if ($violation_data['severity'] === 'critical') {
            $this->handle_critical_violation($type, $details);
        }
    }

    /**
     * Determine violation severity
     */
    private function determine_severity($type) {
        $critical_types = ['injection_attempt', 'xss_attempt'];
        $high_types = ['rate_limit_exceeded', 'unauthorized_access'];
        $medium_types = ['invalid_audio_extension', 'unauthorized_audio_host', 'invalid_upload_type'];

        if (in_array($type, $critical_types)) return 'critical';
        if (in_array($type, $high_types)) return 'high';
        if (in_array($type, $medium_types)) return 'medium';
        return 'low';
    }

    /**
     * Handle critical security violations
     */
    private function handle_critical_violation($type, $details) {
        $blocked_ips = get_option('sonoite_blocked_ips', []);
        $user_ip = $this->getClientIP();
        $blocked_ips[$user_ip] = time() + 3600; // Block for 1 hour
        update_option('sonoite_blocked_ips', $blocked_ips);

        // Send admin notification
        $admin_email = get_option('admin_email');
        $subject = sprintf(__('Critical Security Violation - %s', SONOITE_TEXT_DOMAIN), get_bloginfo('name'));
        $message = sprintf(
            __("Critical security violation detected:\n\nType: %s\nIP: %s\nDetails: %s\n\nThe IP has been temporarily blocked.", SONOITE_TEXT_DOMAIN),
            $type,
            $user_ip,
            wp_json_encode($details)
        );

        wp_mail($admin_email, $subject, $message);
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

/**
 * Security helper functions
 */

/**
 * Secure nonce verification
 */
function sonoite_verify_nonce($nonce, $action = 'sonoite_security_nonce') {
    return wp_verify_nonce($nonce, $action);
}

/**
 * Secure input sanitization
 */
function sonoite_sanitize_input($input, $type = 'text') {
    switch ($type) {
        case 'email':
            return sanitize_email($input);
        case 'url':
            return esc_url_raw($input);
        case 'filename':
            return sanitize_file_name($input);
        case 'textarea':
            return sanitize_textarea_field($input);
        case 'html':
            return wp_kses_post($input);
        default:
            return sanitize_text_field($input);
    }
}

/**
 * Secure output escaping
 */
function sonoite_escape_output($output, $context = 'html') {
    switch ($context) {
        case 'attr':
            return esc_attr($output);
        case 'url':
            return esc_url($output);
        case 'js':
            return wp_json_encode($output);
        case 'css':
            return esc_attr($output);
        default:
            return esc_html($output);
    }
}

/**
 * Check if user can perform action
 */
function sonoite_user_can($capability, $user_id = null) {
    if ($user_id === null) {
        $user_id = get_current_user_id();
    }
    return user_can($user_id, $capability);
}

/**
 * Secure file upload validation
 */
function sonoite_validate_file_upload($file) {
    $security_manager = SonoiteSecurityManager::getInstance();
    return $security_manager->secureFileUpload($file);
}

/**
 * Log security event
 */
function sonoite_log_security_event($event, $data = []) {
    $security_manager = SonoiteSecurityManager::getInstance();
    $security_manager->log_security_violation($event, $data);
}

/**
 * Validate audio URL
 * NOTE: Function implementation moved to inc/performance.php:596 to avoid redeclaration error
 */
// Removed duplicate function - using performance.php implementation
