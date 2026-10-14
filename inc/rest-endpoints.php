<?php
/**
 * Sonoite Theme REST API Endpoints
 * Handles all custom REST API endpoints with security and caching
 * 
 * @package SonoiteTheme
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

/**
 * Register custom REST API routes
 */
function sonoite_register_rest_routes() {
    // Tracks endpoint
    register_rest_route('sonoite/v1', '/tracks', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'sonoite_rest_get_tracks',
        'permission_callback' => '__return_true',
        'args' => array(
            'include_meta' => array(
                'description' => 'Include metadata in response',
                'type' => 'boolean',
                'default' => false,
            ),
            'order' => array(
                'description' => 'Order tracks by',
                'type' => 'string',
                'enum' => array('date', 'title', 'track_order'),
                'default' => 'track_order',
            ),
        ),
    ));

    // CSP violation reporting endpoint
    register_rest_route('sonoite/v1', '/csp-report', array(
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'sonoite_rest_handle_csp_violation',
        'permission_callback' => '__return_true', // CSP reports don't need authentication
    ));

    // Preview email capture endpoint
    register_rest_route('sonoite/v1', '/preview-email', array(
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'sonoite_rest_handle_preview_email',
        'permission_callback' => '__return_true',
        'args' => array(
            'email' => array(
                'required' => true,
                'type' => 'string',
                'format' => 'email',
                'validate_callback' => 'is_email',
                'sanitize_callback' => 'sanitize_email'
            )
        )
    ));

    // Individual track endpoint
    register_rest_route('sonoite/v1', '/tracks/(?P<id>\d+)', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'sonoite_rest_get_track',
        'permission_callback' => '__return_true',
        'args' => array(
            'id' => array(
                'description' => 'Track ID',
                'type' => 'integer',
                'required' => true,
            ),
        ),
    ));

    // Security reporting endpoint
    register_rest_route('sonoite/v1', '/security-report', array(
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'sonoite_rest_security_report',
        'permission_callback' => '__return_true',
        'args' => sonoite_security_report_args(),
    ));

    // Performance metrics endpoint (admin only)
    register_rest_route('sonoite/v1', '/performance', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'sonoite_rest_get_performance_metrics',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        },
    ));

    // Cache management endpoint (admin only)
    register_rest_route('sonoite/v1', '/cache', array(
        array(
            'methods' => WP_REST_Server::DELETABLE,
            'callback' => 'sonoite_rest_clear_cache',
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
            'args' => array(
                'cache_type' => array(
                    'description' => 'Type of cache to clear',
                    'type' => 'string',
                    'enum' => array('tracks', 'assets', 'all'),
                    'default' => 'all',
                ),
            ),
        ),
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sonoite_rest_get_cache_status',
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ),
    ));
    
    // Performance report endpoint (for frontend performance monitoring)
    register_rest_route('sonoite/v1', '/performance-report', array(
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'sonoite_rest_handle_performance_report',
        'permission_callback' => '__return_true', // Allow anonymous performance reports
    ));
    
    // Security violation endpoint (alias for compatibility)
    register_rest_route('sonoite/v1', '/security-violation', array(
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'sonoite_rest_security_report',
        'permission_callback' => '__return_true',
        'args' => sonoite_security_report_args(),
    ));
}
add_action('rest_api_init', 'sonoite_register_rest_routes');

/**
 * Shared schema for anonymous frontend security telemetry routes.
 */
function sonoite_security_report_args() {
    return array(
        'violation_type' => array(
            'description' => 'Type of security violation',
            'type' => 'string',
            'required' => true,
            'enum' => sonoite_allowed_security_violation_types(),
            'sanitize_callback' => 'sanitize_key',
        ),
        'details' => array(
            'description' => 'Violation details',
            'type' => 'string',
            'required' => true,
            'maxLength' => 2000,
            'sanitize_callback' => 'sonoite_truncate_report_field',
            'validate_callback' => 'sonoite_validate_security_details',
        ),
        'url' => array(
            'description' => 'URL where violation occurred',
            'type' => 'string',
            'format' => 'uri',
            'sanitize_callback' => 'sonoite_sanitize_report_url',
        ),
    );
}

/**
 * Public report types accepted from browser-side telemetry.
 */
function sonoite_allowed_security_violation_types() {
    return array(
        'csp_violation',
        'integrity_failure',
        'xss_attempt',
        'injection_attempt',
        'track_loader_error',
        'audio_security_violation',
        'security_violation',
        'performance_error',
        'critical_error'
    );
}

/**
 * Keep public report payloads bounded before storing or logging them.
 */
function sonoite_truncate_report_field($value, $max_length = 2000) {
    if (!is_int($max_length)) {
        $max_length = 2000;
    }

    $value = sanitize_textarea_field((string) $value);

    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max_length);
    }

    return substr($value, 0, $max_length);
}

/**
 * Sanitize optional report URLs without passing null into WordPress URL helpers.
 */
function sonoite_sanitize_report_url($value) {
    return esc_url_raw((string) $value);
}

/**
 * Site-level alert throttling. Public telemetry should not be able to mail-spam admins.
 */
function sonoite_can_send_security_alert($alert_key, $window = HOUR_IN_SECONDS) {
    $transient_key = 'sonoite_alert_' . md5($alert_key);

    if (get_transient($transient_key)) {
        return false;
    }

    set_transient($transient_key, 1, $window);
    return true;
}

/**
 * Sanitize a single track REST response before caching or returning it.
 */
function sonoite_sanitize_track_response($track_data) {
    $track_data = is_array($track_data) ? $track_data : array();
    $audio_url = isset($track_data['audio_url']) ? esc_url_raw($track_data['audio_url']) : '';

    return array(
        'id' => isset($track_data['id']) ? intval($track_data['id']) : 0,
        'title' => isset($track_data['title']) ? sanitize_text_field($track_data['title']) : '',
        'content' => isset($track_data['content']) ? wp_kses_post($track_data['content']) : '',
        'excerpt' => isset($track_data['excerpt']) ? sanitize_text_field($track_data['excerpt']) : '',
        'audio_url' => $audio_url,
        'audio_mime_type' => isset($track_data['audio_mime_type']) ? sanitize_text_field($track_data['audio_mime_type']) : '',
        'duration' => isset($track_data['duration']) ? sanitize_text_field($track_data['duration']) : '',
        'order' => isset($track_data['order']) ? intval($track_data['order']) : 0,
        'featured_image' => isset($track_data['featured_image']) ? esc_url_raw($track_data['featured_image']) : '',
        'consciousness' => array(
            'type' => sanitize_text_field($track_data['consciousness']['type'] ?? 'abstract'),
            'color_palette' => sanitize_hex_color($track_data['consciousness']['color_palette'] ?? '#8B5CF6') ?: '#8B5CF6',
            'intensity_level' => floatval($track_data['consciousness']['intensity_level'] ?? 1.0)
        ),
        'musical_data' => array(
            'bpm' => intval($track_data['musical_data']['bpm'] ?? 0),
            'key_signature' => sanitize_text_field($track_data['musical_data']['key_signature'] ?? '')
        )
    );
}

/**
 * REST endpoint: Get tracks with caching
 */
function sonoite_rest_get_tracks($request) {
    $include_meta = $request->get_param('include_meta');
    $order = $request->get_param('order');

    // Rate limiting check
    if (!sonoite_check_rate_limit('tracks_api', 100, 3600)) {
        return new WP_Error(
            'rate_limit_exceeded',
            __('Rate limit exceeded. Please try again later.', SONOITE_TEXT_DOMAIN),
            array('status' => 429)
        );
    }

    try {
        // Use cached tracks data for performance
        $tracks = sonoite_get_tracks_cached();

        if (empty($tracks)) {
            return new WP_REST_Response(array(
                'tracks' => array(),
                'total' => 0,
                'cache_status' => 'miss'
            ), 200);
        }

        // Sort tracks based on order parameter
        if ($order === 'title') {
            usort($tracks, function($a, $b) {
                return strcmp($a['title'], $b['title']);
            });
        } elseif ($order === 'date') {
            usort($tracks, function($a, $b) {
                return strtotime($b['date_created']) - strtotime($a['date_created']);
            });
        }
        // Default is track_order (already sorted in cached data)

        // Filter out sensitive data if meta not requested
        if (!$include_meta) {
            $tracks = array_map(function($track) {
                return array(
                    'id' => $track['id'],
                    'title' => $track['title'],
                    'audio_url' => $track['audio_url'],
                    'duration' => $track['duration'],
                    'order' => $track['order'],
                    'consciousness' => $track['consciousness']
                );
            }, $tracks);
        }

        // Set cache headers
        $response = new WP_REST_Response(array(
            'tracks' => $tracks,
            'total' => count($tracks),
            'cache_status' => 'hit'
        ), 200);

        $response->header('Cache-Control', 'public, max-age=3600');
        $response->header('ETag', md5(serialize($tracks)));

        return $response;

    } catch (Exception $e) {
        error_log('Sonoite REST API Error (tracks): ' . $e->getMessage());
        
        return new WP_Error(
            'internal_error',
            __('Unable to retrieve tracks at this time.', SONOITE_TEXT_DOMAIN),
            array('status' => 500)
        );
    }
}

/**
 * REST endpoint: Get individual track
 */
function sonoite_rest_get_track($request) {
    $track_id = intval($request->get_param('id'));

    if ($track_id <= 0) {
        return new WP_Error(
            'invalid_track_id',
            __('Invalid track ID.', SONOITE_TEXT_DOMAIN),
            array('status' => 400)
        );
    }

    // Rate limiting check
    if (!sonoite_check_rate_limit('track_api_' . $track_id, 50, 3600)) {
        return new WP_Error(
            'rate_limit_exceeded',
            __('Rate limit exceeded for this track.', SONOITE_TEXT_DOMAIN),
            array('status' => 429)
        );
    }

    try {
        // Try to get from cache first
        $cache_key = 'sonoite_track_' . $track_id;
        $track_data = get_transient($cache_key);

        if (false === $track_data) {
            // Get track from database
            $track_post = get_post($track_id);

            if (!$track_post || $track_post->post_type !== 'track' || $track_post->post_status !== 'publish') {
                return new WP_Error(
                    'track_not_found',
                    __('Track not found.', SONOITE_TEXT_DOMAIN),
                    array('status' => 404)
                );
            }

            // Build track data
            $audio_id = get_post_meta($track_id, 'audio_file', true);
            $track_data = array(
                'id' => $track_id,
                'title' => $track_post->post_title,
                'content' => $track_post->post_content,
                'excerpt' => $track_post->post_excerpt,
                'audio_url' => $audio_id ? wp_get_attachment_url($audio_id) : '',
                'audio_mime_type' => $audio_id ? get_post_mime_type($audio_id) : '',
                'duration' => get_post_meta($track_id, 'duration', true),
                'order' => intval(get_post_meta($track_id, 'track_order', true)),
                'featured_image' => get_the_post_thumbnail_url($track_id, 'sonoite-track-art'),
                'consciousness' => array(
                    'type' => get_post_meta($track_id, 'consciousness_type', true) ?: 'abstract',
                    'color_palette' => get_post_meta($track_id, 'color_palette', true) ?: '#8B5CF6',
                    'intensity_level' => floatval(get_post_meta($track_id, 'intensity_level', true) ?: 1.0)
                ),
                'musical_data' => array(
                    'bpm' => intval(get_post_meta($track_id, 'bpm', true)),
                    'key_signature' => get_post_meta($track_id, 'key_signature', true)
                )
            );

            $track_data = sonoite_sanitize_track_response($track_data);

            // Cache for 6 hours
            set_transient($cache_key, $track_data, 6 * HOUR_IN_SECONDS);
        }

        $track_data = sonoite_sanitize_track_response($track_data);

        // Security validation
        if (!empty($track_data['audio_url']) && !sonoite_validate_audio_url($track_data['audio_url'])) {
            unset($track_data['audio_url']);
        }

        $response = new WP_REST_Response($track_data, 200);
        $response->header('Cache-Control', 'public, max-age=3600');

        return $response;

    } catch (Exception $e) {
        error_log('Sonoite REST API Error (track ' . $track_id . '): ' . $e->getMessage());
        
        return new WP_Error(
            'internal_error',
            __('Unable to retrieve track at this time.', SONOITE_TEXT_DOMAIN),
            array('status' => 500)
        );
    }
}

/**
 * REST endpoint: Security violation reporting
 */
function sonoite_rest_security_report($request) {
    $violation_type = sanitize_text_field($request->get_param('violation_type'));
    $details = sonoite_truncate_report_field($request->get_param('details'), 2000);
    $url = sonoite_sanitize_report_url($request->get_param('url'));
    if (!empty($url) && strpos($details, $url) === false) {
        $details = sonoite_truncate_report_field($details . "\nURL: " . $url, 2000);
    }
    $allowed_violation_types = sonoite_allowed_security_violation_types();

    if (!in_array($violation_type, $allowed_violation_types, true)) {
        return new WP_Error(
            'invalid_violation_type',
            __('Invalid security report type.', SONOITE_TEXT_DOMAIN),
            array('status' => 400)
        );
    }

    // Rate limiting for security reports
    $client_ip = sonoite_get_client_ip();
    if (!sonoite_check_rate_limit('security_report_' . md5($client_ip), 5, HOUR_IN_SECONDS)) {
        return new WP_REST_Response(array('received' => true), 200);
    }

    try {
        $severity = sonoite_determine_violation_severity($violation_type);

        // Log security violation
        $violation_data = array(
            'violation_type' => $violation_type,
            'violation_details' => $details,
            'ip_address' => $client_ip,
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'severity' => $severity,
            'timestamp' => current_time('mysql', true)
        );

        // Store in database if security table exists
        global $wpdb;
        $table_name = $wpdb->prefix . 'sonoite_security_violations';
        
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name) {
            $wpdb->insert($table_name, $violation_data);
        }

        // Avoid turning anonymous frontend telemetry into an error-log spam vector.
        if (
            in_array($severity, array('high', 'critical'), true) &&
            sonoite_can_send_security_alert('security_log_' . $violation_type . '_' . md5($client_ip), 10 * MINUTE_IN_SECONDS)
        ) {
            error_log('Sonoite Security Violation: ' . $violation_type . ' from ' . $client_ip . ' - ' . $details);
        }

        // Send email alert for critical violations
        if (
            $violation_data['severity'] === 'critical' &&
            sonoite_can_send_security_alert('security_' . $violation_type, 6 * HOUR_IN_SECONDS)
        ) {
            sonoite_send_security_alert($violation_data);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => __('Security report received.', SONOITE_TEXT_DOMAIN)
        ), 200);

    } catch (Exception $e) {
        error_log('Sonoite Security Report Error: ' . $e->getMessage());
        
        return new WP_Error(
            'report_failed',
            __('Failed to process security report.', SONOITE_TEXT_DOMAIN),
            array('status' => 500)
        );
    }
}

/**
 * REST endpoint: Get performance metrics (admin only)
 */
function sonoite_rest_get_performance_metrics($request) {
    try {
        global $wpdb;

        $metrics = array(
            'cache_status' => array(
                'object_cache_active' => function_exists('wp_cache_get'),
                'tracks_cached' => get_transient('sonoite_tracks_cache_v3') !== false,
                'asset_manifest_cached' => get_transient('sonoite_asset_manifest') !== false,
            ),
            'database_stats' => array(
                'total_tracks' => wp_count_posts('track')->publish,
                'total_queries_last_request' => get_num_queries(),
            ),
            'memory_usage' => array(
                'current' => round(memory_get_usage() / 1024 / 1024, 2) . 'MB',
                'peak' => round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB',
                'limit' => ini_get('memory_limit'),
            ),
            'security_logs' => array(),
        );

        // Get security log stats if table exists
        $security_table = $wpdb->prefix . 'sonoite_security_violations';
        if ($wpdb->get_var("SHOW TABLES LIKE '$security_table'") === $security_table) {
            $metrics['security_logs'] = array(
                'total_violations' => $wpdb->get_var("SELECT COUNT(*) FROM {$security_table}"),
                'violations_last_24h' => $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$security_table} WHERE timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
                )),
                'critical_violations' => $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$security_table} WHERE severity = 'critical'"
                )),
            );
        }

        return new WP_REST_Response($metrics, 200);

    } catch (Exception $e) {
        error_log('Sonoite Performance Metrics Error: ' . $e->getMessage());
        
        return new WP_Error(
            'metrics_failed',
            __('Failed to retrieve performance metrics.', SONOITE_TEXT_DOMAIN),
            array('status' => 500)
        );
    }
}

/**
 * REST endpoint: Clear cache (admin only)
 */
function sonoite_rest_clear_cache($request) {
    $cache_type = $request->get_param('cache_type');

    try {
        $cleared = array();

        switch ($cache_type) {
            case 'tracks':
                sonoite_clear_tracks_cache();
                $cleared[] = 'tracks';
                break;

            case 'assets':
                delete_transient('sonoite_asset_manifest');
                delete_transient('sonoite_critical_css_v2');
                $cleared[] = 'assets';
                break;

            case 'all':
            default:
                sonoite_clear_tracks_cache();
                delete_transient('sonoite_asset_manifest');
                delete_transient('sonoite_critical_css_v2');
                
                // Clear WordPress object cache if available
                if (function_exists('wp_cache_flush')) {
                    wp_cache_flush();
                }
                
                $cleared = array('tracks', 'assets', 'object_cache');
                break;
        }

        return new WP_REST_Response(array(
            'success' => true,
            'cleared' => $cleared,
            'message' => sprintf(__('Cache cleared: %s', SONOITE_TEXT_DOMAIN), implode(', ', $cleared))
        ), 200);

    } catch (Exception $e) {
        error_log('Sonoite Cache Clear Error: ' . $e->getMessage());
        
        return new WP_Error(
            'cache_clear_failed',
            __('Failed to clear cache.', SONOITE_TEXT_DOMAIN),
            array('status' => 500)
        );
    }
}

/**
 * REST endpoint: Get cache status (admin only)
 */
function sonoite_rest_get_cache_status($request) {
    try {
        $status = array(
            'object_cache' => function_exists('wp_cache_get'),
            'tracks_cache' => get_transient('sonoite_tracks_cache_v3') !== false,
            'asset_manifest_cache' => get_transient('sonoite_asset_manifest') !== false,
            'critical_css_cache' => get_transient('sonoite_critical_css_v2') !== false,
        );

        // Get cache expiration times
        $expirations = array();
        $transients = array(
            'tracks' => 'sonoite_tracks_cache_v3',
            'asset_manifest' => 'sonoite_asset_manifest',
            'critical_css' => 'sonoite_critical_css_v2'
        );

        foreach ($transients as $key => $transient) {
            $expiration = get_option('_transient_timeout_' . $transient);
            if ($expiration) {
                $expirations[$key] = array(
                    'expires_at' => date('Y-m-d H:i:s', $expiration),
                    'expires_in' => max(0, $expiration - time()) . ' seconds'
                );
            }
        }

        return new WP_REST_Response(array(
            'status' => $status,
            'expirations' => $expirations
        ), 200);

    } catch (Exception $e) {
        error_log('Sonoite Cache Status Error: ' . $e->getMessage());
        
        return new WP_Error(
            'cache_status_failed',
            __('Failed to get cache status.', SONOITE_TEXT_DOMAIN),
            array('status' => 500)
        );
    }
}

/**
 * Rate limiting functionality
 */
function sonoite_check_rate_limit($key, $limit, $window) {
    $rate_key = 'rate_limit_' . md5($key . sonoite_get_client_ip());
    $current_count = get_transient($rate_key);

    if (false === $current_count) {
        set_transient($rate_key, 1, $window);
        return true;
    }

    if ($current_count >= $limit) {
        return false;
    }

    set_transient($rate_key, $current_count + 1, $window);
    return true;
}

/**
 * Get client IP address securely
 * Trust forwarded headers only when explicitly enabled via `sonoite_allow_proxy_ip_headers`.
 */
function sonoite_get_client_ip() {
    $allow_proxy_headers = (bool) apply_filters('sonoite_allow_proxy_ip_headers', false);
    $ip_keys = $allow_proxy_headers
        ? array('HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR')
        : array('REMOTE_ADDR');

    foreach ($ip_keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = sanitize_text_field(wp_unslash($_SERVER[$key]));
            // Take first IP if comma-separated (X-Forwarded-For can have chain)
            $ip = explode(',', $ip)[0];
            $ip = trim($ip);

            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }

    // Fallback to REMOTE_ADDR directly (never trust forwarded headers by default).
    $fallback = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : '127.0.0.1';
    return filter_var($fallback, FILTER_VALIDATE_IP) ? $fallback : '127.0.0.1';
}

/**
 * Validate security details input
 */
function sonoite_validate_security_details($details, $request, $param) {
    if (strlen($details) > 2000) {
        return new WP_Error(
            'details_too_long',
            __('Security details too long (max 2000 characters).', SONOITE_TEXT_DOMAIN)
        );
    }

    // Basic XSS prevention
    if (preg_match('/<script|javascript:|data:/i', $details)) {
        return new WP_Error(
            'invalid_details',
            __('Invalid characters in security details.', SONOITE_TEXT_DOMAIN)
        );
    }

    return true;
}

/**
 * Determine violation severity
 */
function sonoite_determine_violation_severity($violation_type) {
    $severity_map = array(
        'csp_violation' => 'medium',
        'integrity_failure' => 'high',
        'xss_attempt' => 'critical',
        'injection_attempt' => 'critical',
        'track_loader_error' => 'medium',
        'audio_security_violation' => 'high',
        'security_violation' => 'medium',
        'performance_error' => 'low',
        'critical_error' => 'critical'
    );

    return $severity_map[$violation_type] ?? 'medium';
}

/**
 * Send security alert email for critical violations
 */
function sonoite_send_security_alert($violation_data) {
    $admin_email = get_option('admin_email');
    $site_name = get_bloginfo('name');

    $subject = sprintf('[%s] Critical Security Violation Detected', $site_name);
    
    $message = sprintf(
        "A critical security violation has been detected on your site:\n\n" .
        "Type: %s\n" .
        "IP Address: %s\n" .
        "Time: %s\n" .
        "Details: %s\n\n" .
        "Please review your security logs immediately.",
        $violation_data['violation_type'],
        $violation_data['ip_address'],
        $violation_data['timestamp'],
        $violation_data['violation_details']
    );

    wp_mail($admin_email, $subject, $message);
}

/**
 * REST endpoint: Handle CSP violation reports
 */
function sonoite_rest_handle_csp_violation($request) {
    // CSP reports are sent as raw JSON in the body
    $raw_body = $request->get_body();
    
    if (empty($raw_body)) {
        return new WP_Error(
            'empty_report',
            __('Empty CSP violation report.', SONOITE_TEXT_DOMAIN),
            array('status' => 400)
        );
    }

    if (strlen($raw_body) > 8192) {
        return new WP_REST_Response(array('received' => true), 200);
    }

    try {
        $csp_report = json_decode($raw_body, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error(
                'invalid_json',
                __('Invalid JSON in CSP report.', SONOITE_TEXT_DOMAIN),
                array('status' => 400)
            );
        }

        // Extract relevant data from CSP report
        $report_data = $csp_report['csp-report'] ?? $csp_report;
        $client_ip = sonoite_get_client_ip();
        
        // Rate limiting for CSP reports
        if (!sonoite_check_rate_limit('csp_report_' . md5($client_ip), 10, HOUR_IN_SECONDS)) {
            return new WP_REST_Response(array('received' => true), 200); // Silent rate limiting
        }

        // Extract violation details
        $violation_details = array(
            'violated_directive' => sanitize_text_field($report_data['violated-directive'] ?? ''),
            'blocked_uri' => esc_url_raw($report_data['blocked-uri'] ?? ''),
            'document_uri' => esc_url_raw($report_data['document-uri'] ?? ''),
            'original_policy' => sanitize_textarea_field($report_data['original-policy'] ?? ''),
            'referrer' => esc_url_raw($report_data['referrer'] ?? ''),
            'script_sample' => sanitize_text_field(substr($report_data['script-sample'] ?? '', 0, 200)),
            'status_code' => intval($report_data['status-code'] ?? 0),
            'line_number' => intval($report_data['line-number'] ?? 0),
            'column_number' => intval($report_data['column-number'] ?? 0)
        );

        // Determine severity based on violation type
        $severity = 'medium';
        $violated_directive = $violation_details['violated_directive'];
        
        if (strpos($violated_directive, 'script-src') !== false) {
            $severity = 'high'; // Script violations are serious
        } elseif (strpos($violated_directive, 'unsafe-inline') !== false) {
            $severity = 'critical'; // Inline script attempts
        }

        // Store violation in database
        global $wpdb;
        $table_name = $wpdb->prefix . 'sonoite_security_violations';
        
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name) {
            $wpdb->insert($table_name, array(
                'violation_type' => 'csp_violation',
                'violation_details' => wp_json_encode($violation_details),
                'ip_address' => $client_ip,
                'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
                'timestamp' => current_time('mysql', true),
                'severity' => $severity,
                'status' => 'new'
            ));
        }

        // Log for immediate attention
        error_log(sprintf(
            'Sonoite CSP Violation [%s]: %s blocked from %s (IP: %s)',
            $severity,
            $violation_details['violated_directive'],
            $violation_details['blocked_uri'],
            $client_ip
        ));

        // Send alert for critical violations
        if (
            $severity === 'critical' &&
            sonoite_can_send_security_alert('csp_' . $violation_details['violated_directive'], 6 * HOUR_IN_SECONDS)
        ) {
            sonoite_send_csp_alert($violation_details, $client_ip);
        }

        // Always return success to avoid revealing information
        return new WP_REST_Response(array('received' => true), 200);

    } catch (Exception $e) {
        error_log('Sonoite CSP Report Error: ' . $e->getMessage());
        
        // Don't reveal error details in CSP reports
        return new WP_REST_Response(array('received' => true), 200);
    }
}

/**
 * Send CSP violation alert email
 */
function sonoite_send_csp_alert($violation_details, $client_ip) {
    $admin_email = get_option('admin_email');
    $site_name = get_bloginfo('name');

    $subject = sprintf('[%s] Critical CSP Violation Detected', $site_name);
    
    $message = sprintf(
        "A critical Content Security Policy violation has been detected:\n\n" .
        "Violated Directive: %s\n" .
        "Blocked URI: %s\n" .
        "Document URI: %s\n" .
        "IP Address: %s\n" .
        "Script Sample: %s\n\n" .
        "This may indicate an attempted XSS attack or unauthorized script injection.\n" .
        "Please review your security logs immediately.",
        $violation_details['violated_directive'],
        $violation_details['blocked_uri'],
        $violation_details['document_uri'],
        $client_ip,
        $violation_details['script_sample']
    );

    wp_mail($admin_email, $subject, $message);
}

/**
 * Handle preview email capture
 */
function sonoite_rest_handle_preview_email($request) {
    $email = strtolower(sanitize_email($request->get_param('email')));
    $client_ip = sonoite_get_client_ip();
    $honeypot = sanitize_text_field($request->get_param('website'));

    if (!empty($honeypot)) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => __('Thank you! You\'ll be notified when the full album experience launches.', SONOITE_TEXT_DOMAIN)
        ), 200);
    }

    if (empty($email) || strlen($email) > 254 || !is_email($email)) {
        return new WP_Error(
            'invalid_email',
            __('Please provide a valid email address.', SONOITE_TEXT_DOMAIN),
            array('status' => 400)
        );
    }
    
    // Rate limiting for email submissions
    if (!sonoite_check_rate_limit('preview_email_' . md5($client_ip), 3, HOUR_IN_SECONDS)) {
        return new WP_Error(
            'rate_limit_exceeded',
            __('Too many email submissions from this IP address. Please try again later.', SONOITE_TEXT_DOMAIN),
            array('status' => 429)
        );
    }

    // Check if email capture is enabled
    if (!get_option('sonoite_email_capture_enabled', 1)) {
        return new WP_Error(
            'email_capture_disabled',
            __('Email capture is currently disabled.', SONOITE_TEXT_DOMAIN),
            array('status' => 403)
        );
    }

    try {
        // Get current subscribers
        $subscribers = get_option('sonoite_preview_subscribers', array());

        if (!is_array($subscribers)) {
            $subscribers = array();
        }

        if (count($subscribers) >= 1000) {
            return new WP_Error(
                'subscriber_limit_reached',
                __('Email capture is temporarily unavailable.', SONOITE_TEXT_DOMAIN),
                array('status' => 503)
            );
        }
        
        // Check if email already exists
        foreach ($subscribers as $subscriber) {
            if (isset($subscriber['email']) && strtolower($subscriber['email']) === $email) {
                return new WP_REST_Response(array(
                    'success' => true,
                    'message' => __('You\'re already signed up! We\'ll notify you when the full album launches.', SONOITE_TEXT_DOMAIN),
                    'already_subscribed' => true
                ), 200);
            }
        }

        // Add new subscriber
        $new_subscriber = array(
            'email' => $email,
            'date' => current_time('mysql', true),
            'ip_address' => $client_ip,
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'status' => 'confirmed', // Simple confirmation for now
            'source' => 'preview_page'
        );

        $subscribers[] = $new_subscriber;
        update_option('sonoite_preview_subscribers', $subscribers);

        // Log the subscription
        error_log("Sonoite: New preview subscriber - {$email} from {$client_ip}");

        if (get_option('sonoite_send_preview_welcome_email', 0)) {
            sonoite_send_welcome_email($email);
        }

        // Send admin notification for first few subscribers
        if (
            count($subscribers) <= 10 &&
            sonoite_can_send_security_alert('preview_subscriber_notification', HOUR_IN_SECONDS)
        ) {
            sonoite_send_subscriber_notification($email, count($subscribers));
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => __('Thank you! You\'ll be notified when the full album experience launches.', SONOITE_TEXT_DOMAIN),
            'subscriber_count' => count($subscribers)
        ), 200);

    } catch (Exception $e) {
        error_log('Sonoite Preview Email Error: ' . $e->getMessage());
        
        return new WP_Error(
            'email_capture_failed',
            __('Something went wrong. Please try again.', SONOITE_TEXT_DOMAIN),
            array('status' => 500)
        );
    }
}

/**
 * Send welcome email to new subscriber
 */
function sonoite_send_welcome_email($email) {
    $site_name = get_bloginfo('name');
    $subject = sprintf(__('Welcome to the %s journey!', SONOITE_TEXT_DOMAIN), $site_name);
    
    $message = sprintf(
        __("Thank you for joining the %s consciousness journey!\n\n" .
        "You'll be among the first to experience the full interactive album when it launches.\n\n" .
        "In the meantime, feel free to share the preview with others who might enjoy this unique audio-visual experience.\n\n" .
        "Preview: %s\n\n" .
        "Stay conscious,\n" .
        "The %s Team", SONOITE_TEXT_DOMAIN),
        $site_name,
        home_url('/preview/'),
        $site_name
    );

    $headers = array(
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . $site_name . ' <' . get_option('admin_email') . '>'
    );

    wp_mail($email, $subject, $message, $headers);
}

/**
 * Send admin notification for new subscribers
 */
function sonoite_send_subscriber_notification($email, $total_count) {
    $admin_email = get_option('admin_email');
    $site_name = get_bloginfo('name');
    
    $subject = sprintf(__('[%s] New Preview Subscriber (#%d)', SONOITE_TEXT_DOMAIN), $site_name, $total_count);
    
    $message = sprintf(
        __("A new person has signed up for the %s album preview notifications!\n\n" .
        "Email: %s\n" .
        "Total Subscribers: %d\n" .
        "Preview URL: %s\n\n" .
        "View all subscribers: %s", SONOITE_TEXT_DOMAIN),
        $site_name,
        $email,
        $total_count,
        home_url('/preview/'),
        admin_url('edit.php?post_type=track&page=sonoite-preview-subscribers')
    );

    wp_mail($admin_email, $subject, $message);
}

/**
 * REST endpoint: Handle performance report
 */
function sonoite_rest_handle_performance_report($request) {
    $client_ip = sonoite_get_client_ip();
    if (!sonoite_check_rate_limit('performance_report_' . md5($client_ip), 30, HOUR_IN_SECONDS)) {
        return new WP_Error(
            'rate_limit_exceeded',
            __('Too many performance reports from this IP.', SONOITE_TEXT_DOMAIN),
            array('status' => 429)
        );
    }

    // Simply log and return success - no need for complex processing
    if (strlen($request->get_body()) > 8192) {
        return new WP_Error(
            'report_too_large',
            __('Performance report is too large.', SONOITE_TEXT_DOMAIN),
            array('status' => 413)
        );
    }

    $report_data = $request->get_json_params();
    
    // Optional: Log performance data
    if (defined("WP_DEBUG") && WP_DEBUG) {
        error_log("Sonoite Performance Report: " . wp_json_encode($report_data));
    }
    
    return rest_ensure_response(array(
        "success" => true,
        "message" => "Performance report received",
    ));
}
