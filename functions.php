<?php
/**
 * Sonoite Theme - Main Functions File
 * Loads modular components and defines core constants
 * 
 * @package SonoiteTheme
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

// Theme constants
define('SONOITE_VERSION', '1.0.2');
define('SONOITE_SECURITY_VERSION', '1.0.0');
define('SONOITE_MAX_UPLOAD_SIZE', 50 * 1024 * 1024); // 50MB
define('SONOITE_THEME_DIR', get_template_directory());
define('SONOITE_THEME_URL', get_template_directory_uri());
define('SONOITE_SECURITY_ENABLED', true);
define('SONOITE_TEXT_DOMAIN', 'sonoite-theme');
define('SONOITE_SECURITY_TABLE_VERSION', '1.0.0');

// STAB-05: Environment toggle for CSP dev/prod branching
if (!defined('SONOITE_ENV')) {
    $wp_environment = function_exists('wp_get_environment_type') ? wp_get_environment_type() : 'production';
    define('SONOITE_ENV', in_array($wp_environment, array('local', 'development'), true) ? 'dev' : 'prod');
}

/**
 * Load modular components in correct order
 */
$required_files = array(
    'inc/enable-block-editor.php', // Simple block editor fix
    'inc/theme-setup.php',
    'inc/performance.php',
    'inc/rest-endpoints.php',
    'inc/admin-functions.php'
    // 'inc/simple-assets.php' // Disabled - was preventing main assets from loading
);

foreach ($required_files as $file) {
    $file_path = SONOITE_THEME_DIR . '/' . $file;
    if (file_exists($file_path)) {
        require_once $file_path;
    } else {
        error_log("Sonoite: Required file missing: {$file}");
    }
}

// Load consolidated security functions
$security_file = SONOITE_THEME_DIR . '/inc/security-functions.php';
if (file_exists($security_file)) {
    require_once $security_file;
} else {
    error_log("Sonoite: Critical security file missing: inc/security-functions.php");
}

/**
 * Enhanced asset enqueuing with performance optimization
 */
function sonoite_is_prototype_request() {
    return is_front_page()
        || is_page_template('page-prototype.php')
        || sonoite_query_flag_enabled('prototype');
}

/**
 * Read boolean query flags safely.
 *
 * This keeps debug/prototype controls bounded instead of comparing raw $_GET
 * values throughout the enqueue path.
 */
function sonoite_query_flag_enabled($key) {
    if (!isset($_GET[$key])) {
        return false;
    }

    $value = sanitize_text_field(wp_unslash($_GET[$key]));
    return in_array(strtolower($value), array('1', 'true', 'yes', 'on'), true);
}

/**
 * Allow quick access to the isolated prototype without a WP page assignment.
 *
 * Use: /?prototype=1
 */
function sonoite_maybe_use_prototype_template($template) {
    if (sonoite_is_prototype_request()) {
        $prototype_template = SONOITE_THEME_DIR . '/page-prototype.php';
        if (file_exists($prototype_template)) {
            return $prototype_template;
        }
    }

    return $template;
}
add_filter('template_include', 'sonoite_maybe_use_prototype_template', 99);

/**
 * Query vars allowed on the front-page experience (deep links + QA flags).
 * `track` must stay separate from the track CPT query_var (`sonoite_track`).
 */
function sonoite_front_page_query_vars() {
    return array(
        'track',
        'prototype',
        'variant',
        'post',
        'debug',
        't1director',
        'quality',
        'cinema',
        'dpr',
        'fps',
        'proof',
        'duration',
        'plate',
        'compositor',
        'msaa',
        'dither',
        'seed',
        'tweak',
        'probe',
        'recut',
        'lehr',
        'listen',
        'uikeep',
        'autonext',
        'lod',
        'shadows',
        'rescore',
    );
}

function sonoite_register_front_page_query_vars($vars) {
    return array_unique(array_merge($vars, sonoite_front_page_query_vars()));
}
add_filter('query_vars', 'sonoite_register_front_page_query_vars');

/**
 * WP's canonical redirect strips unknown query vars from the front page, which
 * kills clean track URLs like /?track=horas-mortas. Skip canonical redirect
 * when any allowlisted front-page query param is present.
 */
function sonoite_preserve_front_page_queries($redirect_url) {
    if (empty($_GET) || !is_front_page()) {
        return $redirect_url;
    }

    $allowed = array_flip(sonoite_front_page_query_vars());
    foreach (array_keys($_GET) as $key) {
        if (isset($allowed[$key])) {
            return false;
        }
    }

    return $redirect_url;
}
add_filter('redirect_canonical', 'sonoite_preserve_front_page_queries');

function sonoite_enqueue_scripts() {
    // Only log in debug mode
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('sonoite_enqueue_scripts called');
    }

    // POST-01: Post-processing is expensive; keep it opt-in even in WP_DEBUG.
    // Enable explicitly with ?post=1 when validating cinematic passes.
    $enable_post = sonoite_query_flag_enabled('post');
    if ($enable_post) {
        wp_add_inline_script('sonoite-init-experience', 'window.SONOITE_POST = true;', 'before');
    }

    // Check if this is a specialized experience page
    $is_preview_page = is_page_template('page-preview.php');
    $is_prototype_page = sonoite_is_prototype_request();
    
    // BUILD-02: Re-enable asset enqueue guard - SPA assets only on experience pages
    if (!is_front_page() && !is_page_template('page-album.php') && !$is_preview_page && !$is_prototype_page) {
        return;
    }

    $theme_version = SONOITE_VERSION;
    $theme_url = SONOITE_THEME_URL;
    $is_debug = defined('WP_DEBUG') && WP_DEBUG;

    // Load asset manifest for cache-busted filenames
    $manifest = sonoite_get_asset_manifest();
    // SEC-07: Gate manifest logging behind WP_DEBUG
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('Manifest loaded: ' . count($manifest) . ' entries');
    }

    // Get secure tracks data (now cached)
    $tracks_data = sonoite_get_secure_tracks_data();
    $security_config = sonoite_get_security_config();

    // Enqueue critical CSS first
    wp_enqueue_style(
        'sonoite-style',
        get_stylesheet_uri(),
        array(),
        $theme_version
    );
    
    // Enqueue preview-specific styles if on preview page
    if ($is_preview_page) {
        wp_enqueue_style(
            'sonoite-preview-style',
            $manifest['src/css/preview.css'] ?? $theme_url . '/dist/css/preview-styles.css',
            array('sonoite-style'),
            $theme_version
        );
    }

    // Load JavaScript modules in dependency order
    // First load the vendor chunks - find them dynamically
    $found_three = false;
    foreach ($manifest as $key => $value) {
        // SEC-07: Gate manifest iteration logging behind WP_DEBUG
        if ($is_debug) {
            error_log("Checking manifest key: $key");
        }
        if (strpos($key, '_three-vendor') === 0 && is_array($value) && isset($value['file'])) {
            $script_url = $theme_url . '/dist/' . $value['file'];
            if ($is_debug) {
                error_log("Enqueuing three-vendor: $script_url");
            }
            wp_enqueue_script(
                'sonoite-three-vendor',
                $script_url,
                array(),
                $theme_version,
                true
            );
            wp_script_add_data('sonoite-three-vendor', 'type', 'module');
            // Guard against stray global THREE injected by plugins/CDN before our vendor chunk
            $three_guard = 'try { if (window.THREE) { delete window.THREE; } } catch (e) { window.THREE = undefined; }';
            wp_add_inline_script('sonoite-three-vendor', $three_guard, 'before');
            $found_three = true;
            break;
        }
    }
    if (!$found_three && $is_debug) {
        error_log("three-vendor not found in manifest!");
    }
    
    foreach ($manifest as $key => $value) {
        if (strpos($key, '_audio-core') === 0 && is_array($value) && isset($value['file'])) {
            wp_enqueue_script(
                'sonoite-audio-core',
                $theme_url . '/dist/' . $value['file'],
                array('sonoite-three-vendor'),
                $theme_version,
                true
            );
            wp_script_add_data('sonoite-audio-core', 'type', 'module');
            break;
        }
    }
    
    // MIG-01: Legacy consciousness system disabled - using Visual Layer API via init-experience.js only
    // foreach ($manifest as $key => $value) {
    //     if (strpos($key, '_consciousness') === 0 && is_array($value) && isset($value['file'])) {
    //         wp_enqueue_script(
    //             'sonoite-consciousness',
    //             $theme_url . '/dist/' . $value['file'],
    //             array('sonoite-three-vendor'),
    //             $theme_version,
    //             true
    //         );
    //         wp_script_add_data('sonoite-consciousness', 'type', 'module');
    //         break;
    //     }
    // }

    // Load entry point scripts
    $js_modules = array(
        // Temporarily disable service worker
        // 'src/js/service-worker-manager.js' => array(
        //     'deps' => array(),
        //     'handle' => 'sonoite-service-worker'
        // ),
        'src/js/security-manager.js' => array(
            'deps' => array(),
            'handle' => 'sonoite-security'
        ),
        'src/js/prototype/main.js' => array(
            'deps' => array('sonoite-three-vendor', 'sonoite-audio-core'),
            'handle' => 'sonoite-prototype'
        ),
        'src/js/init-experience.js' => array(
            'deps' => array('sonoite-three-vendor'),
            'handle' => 'sonoite-init-experience'
        ),
        'src/js/main.js' => array(
            'deps' => array('sonoite-security', 'sonoite-init-experience'),
            'handle' => 'sonoite-main'
        ),
        'src/js/preview-experience.js' => array(
            'deps' => array('sonoite-three-vendor'),
            'handle' => 'sonoite-preview'
        )
    );

    foreach ($js_modules as $manifest_key => $config) {
        // Skip preview script unless on preview page
        if ($manifest_key === 'src/js/preview-experience.js' && !$is_preview_page) {
            continue;
        }

        if ($manifest_key === 'src/js/prototype/main.js' && !$is_prototype_page) {
            continue;
        }
        
        // Skip main scripts if on preview page
        if ($is_preview_page && $manifest_key === 'src/js/main.js') {
            continue;
        }

        // Prototype page uses its own isolated shell and runtime
        if ($is_prototype_page && in_array($manifest_key, array(
            'src/js/security-manager.js',
            'src/js/init-experience.js',
            'src/js/main.js',
            'src/js/preview-experience.js'
        ), true)) {
            continue;
        }
        
        // Get script URL from manifest
        if (isset($manifest[$manifest_key]) && is_array($manifest[$manifest_key]) && isset($manifest[$manifest_key]['file'])) {
            $script_url = $theme_url . '/dist/' . $manifest[$manifest_key]['file'];
        } else {
            continue; // Skip if not in manifest
        }

        wp_enqueue_script(
            $config['handle'],
            $script_url,
            $config['deps'],
            $theme_version,
            true
        );
        wp_script_add_data($config['handle'], 'type', 'module');
    }

    // Localize script data for main application or preview
    if ($is_prototype_page) {
        $script_handle = 'sonoite-prototype';
    } else {
        $script_handle = $is_preview_page ? 'sonoite-preview' : 'sonoite-init-experience';
    }

    // POST-01: Ensure post-processing and shadows flags are set BEFORE init script runs.
    // Allow enabling only via query parameters (?post=1&shadows=1).
    $enable_post = sonoite_query_flag_enabled('post');
    $enable_shadows = sonoite_query_flag_enabled('shadows');
    if ($enable_post || $enable_shadows) {
        $inline_flags = '';
        if ($enable_post) { $inline_flags .= 'window.SONOITE_POST = true;'; }
        if ($enable_shadows) { $inline_flags .= 'window.SONOITE_SHADOWS = true;'; }
        wp_add_inline_script($script_handle, $inline_flags, 'before');
    }
    $localized_data = array(
        'apiUrl' => esc_url(home_url('/wp-json/sonoite/v1/')),
        'tracks' => $tracks_data,
        'themeUrl' => esc_url($theme_url),
        'nonce' => wp_create_nonce('sonoite_nonce'),
        'previewEmailNonce' => wp_create_nonce('sonoite_preview_email'),
        'restNonce' => wp_create_nonce('wp_rest'),
        'version' => $theme_version,
        'isSecure' => is_ssl(),
        'isDebug' => $is_debug,
        'reportingEndpoint' => esc_url(home_url('/wp-json/sonoite/v1/security-report')),
        'particleCounts' => get_option('sonoite_particle_counts', sonoite_get_default_particle_counts()),
        'trackLoaderConfig' => array(
            'maxRetries' => 3,
            'retryDelay' => 1000,
            'timeoutDuration' => 30000,
            'maxCacheSize' => 5,
            'preloadNext' => true,
            'enableCrossfade' => false
        ),
        'audioConfig' => array(
            'maxFileSize' => SONOITE_MAX_UPLOAD_SIZE,
            'allowedMimeTypes' => array('audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/aac'),
            'maxVolume' => 1.0,
            'timeoutDuration' => 30000,
            'analysisTargetFps' => 30,
            'enableAdvancedAnalysis' => false
        ),
        'i18n' => sonoite_get_i18n_strings()
    );

    if ($is_prototype_page) {
        $localized_data = array(
            'tracks' => $tracks_data,
            'themeUrl' => esc_url($theme_url),
            'cspNonce' => sonoite_get_csp_nonce(),
            'version' => $theme_version,
            'isSecure' => is_ssl(),
            'isDebug' => $is_debug,
            'audioConfig' => array(
                'maxFileSize' => SONOITE_MAX_UPLOAD_SIZE,
                'allowedMimeTypes' => array('audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/aac'),
                'maxVolume' => 1.0,
                'timeoutDuration' => 30000,
                'analysisTargetFps' => 24,
                'enableAdvancedAnalysis' => false
            )
        );
    }

    wp_localize_script($script_handle, 'sonoiteData', $localized_data);

    if (wp_script_is('sonoite-security', 'enqueued')) {
        wp_localize_script('sonoite-security', 'sonoiteSecurityConfig', $security_config);
    }

    // Add security attributes to scripts
    add_filter('script_loader_tag', 'sonoite_add_script_attributes', 10, 3);
    add_filter('style_loader_tag', 'sonoite_add_style_attributes', 10, 4);
    // 01-03: Add nonce to inline scripts from wp_add_inline_script() (WordPress 5.7+)
    add_filter('wp_inline_script_attributes', 'sonoite_add_inline_script_nonce', 10, 2);
}
add_action('wp_enqueue_scripts', 'sonoite_enqueue_scripts', 10);

/**
 * Get internationalization strings
 */
function sonoite_get_i18n_strings() {
    return array(
        'loadingTrack' => __('Loading track...', SONOITE_TEXT_DOMAIN),
        'loading' => __('Loading...', SONOITE_TEXT_DOMAIN),
        'connecting' => __('Connecting to server...', SONOITE_TEXT_DOMAIN),
        'downloading' => __('Downloading...', SONOITE_TEXT_DOMAIN),
        'decoding' => __('Decoding audio...', SONOITE_TEXT_DOMAIN),
        'processing' => __('Processing audio...', SONOITE_TEXT_DOMAIN),
        'ready' => __('Ready', SONOITE_TEXT_DOMAIN),
        'nowPlaying' => __('Now playing: {title}', SONOITE_TEXT_DOMAIN),
        'trackLoadFailed' => __('Failed to load track. Please try again.', SONOITE_TEXT_DOMAIN),
        'retryingIn' => __('Retrying in {seconds}s...', SONOITE_TEXT_DOMAIN),
        'loadingAttempt' => __('Loading attempt {attempt}...', SONOITE_TEXT_DOMAIN),
        'tracksLoaded' => __('Tracks loaded successfully', SONOITE_TEXT_DOMAIN),
        'errorOccurred' => __('An error occurred', SONOITE_TEXT_DOMAIN),
        'tryAgain' => __('Try again', SONOITE_TEXT_DOMAIN),
        'audioUnavailable' => __('Audio unavailable', SONOITE_TEXT_DOMAIN)
    );
}

/**
 * Get security configuration for client-side
 * SEC-01: Removed CDN integrity hashes - Three.js now bundled locally
 */
function sonoite_get_security_config() {
    $csp_nonce = sonoite_get_csp_nonce();
    $parsed_home = wp_parse_url(home_url());
    $home_host = isset($parsed_home['host']) ? $parsed_home['host'] : '';

    return array(
        'enableCSPReporting' => true,
        'enableIntegrityChecks' => true,
        'enableInputValidation' => true,
        'enableXSSProtection' => true,
        'enableAuditLogging' => true,
        'maxFormSubmissions' => 5,
        'formSubmissionWindow' => 60000,
        'allowedDomains' => array($home_host),
        'reportingEndpoint' => esc_url(home_url('/wp-json/sonoite/v1/security-report')),
        'maxFileSize' => SONOITE_MAX_UPLOAD_SIZE,
        'allowedMimeTypes' => array('audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/aac'),
        'cspNonce' => $csp_nonce, // CSP nonce for inline scripts
    );
}

/**
 * Generate and manage CSP nonce
 */
/**
 * STAB-05: Per-request CSP nonce generation
 * Generates a cryptographically secure nonce for CSP compliance
 */
function sonoite_get_csp_nonce() {
    // Check global first for request-scoped nonce
    if (!isset($GLOBALS['sonoite_csp_nonce'])) {
        // Generate a cryptographically secure nonce (32 bytes = 256 bits)
        $GLOBALS['sonoite_csp_nonce'] = bin2hex(random_bytes(16)); // 32 hex chars
    }

    return $GLOBALS['sonoite_csp_nonce'];
}

/**
 * STAB-05: Public getter for CSP nonce (alias for backward compatibility)
 */
function sonoite_csp_nonce() {
    return sonoite_get_csp_nonce();
}

/**
 * STAB-05: Build CSP header with dev/prod branching
 * Production: Strict policy with nonces only
 * Development: Relaxed policy for easier debugging
 *
 * SEC-01: Removed CDN (cdn.jsdelivr.net) from CSP - Three.js now bundled locally
 */
function sonoite_build_csp_header() {
    $nonce = sonoite_get_csp_nonce();
    $is_dev = (SONOITE_ENV === 'dev');

    // Build base directives - SEC-01: No CDN references, all assets local
    $directives = array(
        "default-src 'self'",
        // STAB-05: Branch script-src based on environment (no CDN needed)
        "script-src 'self' 'nonce-{$nonce}'" . ($is_dev ? " 'unsafe-inline' 'unsafe-eval'" : ""),
        // STAB-05: Branch style-src based on environment (element styles)
        "style-src 'self' 'nonce-{$nonce}'" . ($is_dev ? " 'unsafe-inline'" : ""),
        // Allow style attributes without enabling inline <style> (CSP3 browsers)
        "style-src-attr 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        // SEC-01: Removed CDN from connect-src - all assets are local
        "connect-src 'self' " . wp_parse_url(home_url(), PHP_URL_HOST),
        "font-src 'self' data:",
        "object-src 'none'",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
    );

    // Only add block-all-mixed-content in production
    if (!$is_dev) {
        $directives[] = "block-all-mixed-content";
    }

    // SEC-01: Removed CDN hash injection - no longer using CDN

    return implode('; ', $directives);
}

/**
 * Send CSP header
 */
function sonoite_send_csp_header() {
    // Skip CSP headers in admin area to allow block editor to work
    if (is_admin()) {
        return;
    }

    if (!headers_sent()) {
        header('X-Frame-Options: DENY');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('X-XSS-Protection: 1; mode=block');

        // Allow disabling CSP via environment variable for local development only.
        if (defined('SONOITE_DISABLE_CSP') && SONOITE_DISABLE_CSP && (!defined('WP_ENVIRONMENT_TYPE') || WP_ENVIRONMENT_TYPE === 'local' || WP_ENVIRONMENT_TYPE === 'development')) {
            return;
        }

        $csp_header = sonoite_build_csp_header();
        header("Content-Security-Policy: {$csp_header}");

        // Also send as report-only for monitoring
        header("Content-Security-Policy-Report-Only: {$csp_header}; report-uri " . esc_url(home_url('/wp-json/sonoite/v1/csp-report')));
    }
}
// Emit CSP headers early in the response
remove_action('wp_head', 'sonoite_send_csp_header', 1);
add_action('send_headers', 'sonoite_send_csp_header');

/**
 * STAB-05: Add security attributes to script tags with universal nonce support
 * SEC-01: Removed CDN integrity injection - Three.js now bundled locally
 */
function sonoite_add_script_attributes($tag, $handle, $src) {
    $nonce = sonoite_get_csp_nonce();

    // STAB-05: Add nonce to ALL scripts (not just sonoite-*)
    if ($nonce && strpos($tag, 'nonce=') === false) {
        $tag = str_replace('<script ', '<script nonce="' . esc_attr($nonce) . '" ', $tag);
    }

    // Sonoite-specific enhancements
    if (strpos($handle, 'sonoite-') === 0) {
        // SEC-01: Removed CDN integrity injection - no longer using CDN

        // Add type="module" for all sonoite scripts
        if (strpos($tag, 'type=') === false) {
            $tag = str_replace('<script', '<script type="module"', $tag);
        }
    }

    return $tag;
}

/**
 * STAB-05: Add security attributes to style tags with universal nonce support
 */
function sonoite_add_style_attributes($html, $handle, $href, $media) {
    // STAB-05: Add nonce to ALL styles (not just sonoite-*)
    $nonce = sonoite_get_csp_nonce();
    if ($nonce && strpos($html, 'nonce=') === false) {
        $html = str_replace('<link ', '<link nonce="' . esc_attr($nonce) . '" ', $html);
    }

    return $html;
}

/**
 * 01-03: Add nonce to inline scripts from wp_add_inline_script()
 *
 * This filter was introduced in WordPress 5.7 and provides a way to add
 * attributes (including nonce) to inline scripts generated by wp_add_inline_script().
 * Without this, inline scripts violate CSP when script-src requires nonce.
 *
 * @param array  $attributes Inline script attributes (empty by default)
 * @param string $data       Inline script data (not used here)
 * @return array Modified attributes with nonce
 */
function sonoite_add_inline_script_nonce($attributes, $data) {
    $nonce = sonoite_get_csp_nonce();
    if ($nonce) {
        $attributes['nonce'] = $nonce;
    }
    return $attributes;
}

/**
 * SEC-01: REMOVED CDN importmap - Three.js is now bundled locally via Vite
 *
 * The previous implementation auto-generated integrity hashes from CDN content,
 * which defeated SRI purpose (compromised CDN → fresh hash → trusted).
 *
 * Three.js is now bundled in the 'three-vendor' chunk by Vite (see vite.config.js).
 * No importmap needed - imports resolve to local bundle.
 *
 * @deprecated Removed Dec 3, 2025 - SEC-01 fix
 */
// function sonoite_add_importmap() { /* REMOVED - Using local bundle */ }

/**
 * Secure database table creation with proper error handling
 */
function sonoite_secure_create_security_table() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'sonoite_security_violations';
    $installed_version = get_option('sonoite_security_table_version');

    // Only create if table doesn't exist or version changed
    if ($installed_version !== SONOITE_SECURITY_TABLE_VERSION) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            violation_type varchar(100) NOT NULL,
            violation_details longtext NOT NULL,
            ip_address varchar(45) NOT NULL,
            user_agent text NOT NULL,
            timestamp datetime DEFAULT CURRENT_TIMESTAMP,
            user_id bigint(20) DEFAULT 0,
            severity enum('low','medium','high','critical') DEFAULT 'medium',
            status enum('new','reviewed','resolved') DEFAULT 'new',
            PRIMARY KEY (id),
            KEY ip_address (ip_address),
            KEY timestamp (timestamp),
            KEY violation_type (violation_type),
            KEY severity (severity),
            KEY status (status)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        $result = dbDelta($sql);

        if ($result) {
            update_option('sonoite_security_table_version', SONOITE_SECURITY_TABLE_VERSION);
            error_log(__('Sonoite: Security violations table created successfully', SONOITE_TEXT_DOMAIN));
        } else {
            error_log(__('Sonoite: Failed to create security violations table', SONOITE_TEXT_DOMAIN));
        }
    }
}

/**
 * Initialize security table on theme activation
 */
add_action('after_switch_theme', 'sonoite_secure_create_security_table');
add_action('admin_init', function() {
    // Also check on admin init to ensure table exists
    $installed_version = get_option('sonoite_security_table_version');
    if (!$installed_version) {
        sonoite_secure_create_security_table();
    }
});

/**
 * Legacy function compatibility - wrapper for new cached function
 */
function sonoite_get_tracks() {
    return sonoite_get_tracks_cached();
}

/**
 * Debug information for administrators
 */
function sonoite_debug_info() {
    if (!current_user_can('manage_options') || !defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }

    echo "\n<!-- Sonoite Theme Debug Information -->\n";
    echo "<!-- Theme Version: " . SONOITE_VERSION . " -->\n";
    echo "<!-- Text Domain: " . SONOITE_TEXT_DOMAIN . " -->\n";
    echo "<!-- Security Enabled: " . (SONOITE_SECURITY_ENABLED ? 'Yes' : 'No') . " -->\n";
    echo "<!-- Object Cache: " . (function_exists('wp_cache_get') ? 'Active' : 'Inactive') . " -->\n";

    // Cache status
    $tracks_cached = get_transient('sonoite_tracks_cache_v3') !== false ? 'HIT' : 'MISS';
    echo "<!-- Tracks Cache Status: {$tracks_cached} -->\n";

    $manifest_cached = get_transient('sonoite_asset_manifest') !== false ? 'HIT' : 'MISS';
    echo "<!-- Asset Manifest Cache: {$manifest_cached} -->\n";

    // Performance metrics
    $memory_usage = round(memory_get_usage() / 1024 / 1024, 2);
    $query_count = get_num_queries();
    echo "<!-- Memory Usage: {$memory_usage}MB -->\n";
    echo "<!-- Database Queries: {$query_count} -->\n";
}
add_action('wp_footer', 'sonoite_debug_info', 1000);
