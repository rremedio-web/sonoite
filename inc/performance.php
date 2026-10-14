<?php
/**
 * Track data, caching and asset-manifest helpers.
 *
 * Builds the track list from the track CPT with one grouped postmeta query plus
 * a batched attachment lookup (12h transient, cleared on track save/delete),
 * which REST GET /tracks and sonoite_get_secure_tracks_data() read; the latter
 * drops tracks whose audio fails sonoite_validate_audio_url() before they reach
 * sonoiteData. Also loads the Vite manifest (dist/.vite/manifest.json) that
 * functions.php resolves bundles against, trims front-page core assets and
 * runs the daily security-log cleanup cron.
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

/**
 * Performance-optimized tracks data retrieval with multi-layer caching
 */
function sonoite_get_tracks_cached() {
    // Try object cache first (Redis/Memcached)
    $tracks = wp_cache_get('sonoite_tracks_v3', 'sonoite');
    if (false !== $tracks) {
        return $tracks;
    }

    // Try transient cache
    $cache_key = 'sonoite_tracks_cache_v3';
    $tracks = get_transient($cache_key);

    if (false === $tracks) {
        // Build fresh data with optimized query
        $tracks = sonoite_build_tracks_data_optimized();

        // Cache for 12 hours in transient
        set_transient($cache_key, $tracks, 12 * HOUR_IN_SECONDS);

        // Also store in object cache (6 hour expiry)
        wp_cache_set('sonoite_tracks_v3', $tracks, 'sonoite', 6 * HOUR_IN_SECONDS);

        // Log cache miss for monitoring
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('Sonoite: Tracks cache MISS - rebuilding data (' . count($tracks) . ' tracks)');
        }
    }

    return $tracks;
}

/**
 * Build tracks data with single optimized query
 */
function sonoite_build_tracks_data_optimized() {
    global $wpdb;

    // Single query to get all track data with metadata
    $tracks_query = $wpdb->prepare("
        SELECT p.ID, p.post_title, p.post_excerpt, p.post_name,
               p.post_date, p.post_modified, p.menu_order,
               GROUP_CONCAT(
                   CASE pm.meta_key 
                       WHEN 'audio_file' THEN CONCAT('audio_file:', IFNULL(pm.meta_value, ''))
                       WHEN 'duration' THEN CONCAT('duration:', IFNULL(pm.meta_value, ''))
                       WHEN 'track_order' THEN CONCAT('track_order:', IFNULL(pm.meta_value, '0'))
                       WHEN 'consciousness_type' THEN CONCAT('consciousness_type:', IFNULL(pm.meta_value, 'abstract'))
                       WHEN 'color_palette' THEN CONCAT('color_palette:', IFNULL(pm.meta_value, '#8B5CF6'))
                       WHEN 'intensity_level' THEN CONCAT('intensity_level:', IFNULL(pm.meta_value, '1.0'))
                       WHEN 'bpm' THEN CONCAT('bpm:', IFNULL(pm.meta_value, '0'))
                       WHEN 'key_signature' THEN CONCAT('key_signature:', IFNULL(pm.meta_value, ''))
                       WHEN 'file_size' THEN CONCAT('file_size:', IFNULL(pm.meta_value, '0'))
                       WHEN '_thumbnail_id' THEN CONCAT('thumbnail_id:', IFNULL(pm.meta_value, '0'))
                   END 
                   SEPARATOR '|'
               ) as meta_data
        FROM {$wpdb->posts} p
        LEFT JOIN {$wpdb->postmeta} pm ON (p.ID = pm.post_id AND pm.meta_key IN (
            'audio_file', 'duration', 'track_order', 'consciousness_type', 
            'color_palette', 'intensity_level', 'bpm', 'key_signature', 
            'file_size', '_thumbnail_id'
        ))
        WHERE p.post_type = %s 
        AND p.post_status = 'publish'
        GROUP BY p.ID
        ORDER BY CAST(MAX(CASE WHEN pm.meta_key = 'track_order' THEN pm.meta_value END) AS UNSIGNED) ASC, 
                 p.menu_order ASC, p.post_date ASC
    ", 'track');

    $results = $wpdb->get_results($tracks_query);

    if (empty($results)) {
        return array();
    }

    // Get all unique audio and thumbnail IDs for batch processing
    $audio_ids = array();
    $thumbnail_ids = array();

    foreach ($results as $row) {
        $meta_data = sonoite_parse_meta_data($row->meta_data);
        if (!empty($meta_data['audio_file'])) {
            $audio_ids[] = intval($meta_data['audio_file']);
        }
        if (!empty($meta_data['thumbnail_id'])) {
            $thumbnail_ids[] = intval($meta_data['thumbnail_id']);
        }
    }

    // Batch get attachment data
    $attachment_data = sonoite_get_attachments_batch(array_merge($audio_ids, $thumbnail_ids));

    // Build final tracks array
    $tracks = array();
    foreach ($results as $row) {
        $meta_data = sonoite_parse_meta_data($row->meta_data);
        $audio_id = intval($meta_data['audio_file'] ?? 0);
        $thumbnail_id = intval($meta_data['thumbnail_id'] ?? 0);

        // Get audio data
        $audio_url = '';
        $audio_mime_type = '';
        $audio_file_size = intval($meta_data['file_size'] ?? 0);

        if ($audio_id && isset($attachment_data[$audio_id])) {
            $audio_url = $attachment_data[$audio_id]['url'];
            $audio_mime_type = $attachment_data[$audio_id]['mime_type'];
        }

        // Get featured image URL
        $featured_image_url = '';
        if ($thumbnail_id && isset($attachment_data[$thumbnail_id])) {
            $featured_image_url = wp_get_attachment_image_url($thumbnail_id, 'sonoite-track-art');
        }

        $tracks[] = array(
            'id' => intval($row->ID),
            'title' => $row->post_title,
            'content' => '', // post_content is deliberately not exposed to the front end
            'excerpt' => $row->post_excerpt,
            'audio_url' => $audio_url,
            'audio_mime_type' => $audio_mime_type,
            'audio_file_size' => $audio_file_size,
            'duration' => $meta_data['duration'] ?? '',
            'order' => intval($meta_data['track_order'] ?? 0),
            'featured_image' => $featured_image_url,
            'date_created' => $row->post_date,
            'date_modified' => $row->post_modified,
            'slug' => $row->post_name,
            'consciousness' => array(
                'type' => $meta_data['consciousness_type'] ?? 'abstract',
                'color_palette' => $meta_data['color_palette'] ?? '#8B5CF6',
                'intensity_level' => floatval($meta_data['intensity_level'] ?? 1.0)
            ),
            'musical_data' => array(
                'bpm' => intval($meta_data['bpm'] ?? 0),
                'key_signature' => $meta_data['key_signature'] ?? ''
            )
        );
    }

    return $tracks;
}

/**
 * Parse concatenated meta data string
 */
function sonoite_parse_meta_data($meta_string) {
    $meta_data = array();

    if (empty($meta_string)) {
        return $meta_data;
    }

    $pairs = explode('|', $meta_string);
    foreach ($pairs as $pair) {
        if (strpos($pair, ':') !== false) {
            list($key, $value) = explode(':', $pair, 2);
            $meta_data[$key] = $value;
        }
    }

    return $meta_data;
}

/**
 * Batch get attachment data
 */
function sonoite_get_attachments_batch($attachment_ids) {
    if (empty($attachment_ids)) {
        return array();
    }

    global $wpdb;

    $ids_placeholders = implode(',', array_fill(0, count($attachment_ids), '%d'));
    $query = $wpdb->prepare("
        SELECT ID, guid, post_mime_type
        FROM {$wpdb->posts} 
        WHERE ID IN ($ids_placeholders)
        AND post_type = 'attachment'
    ", $attachment_ids);

    $results = $wpdb->get_results($query);
    $attachment_data = array();

    foreach ($results as $attachment) {
        $attachment_data[$attachment->ID] = array(
            'url' => $attachment->guid,
            'mime_type' => $attachment->post_mime_type
        );
    }

    return $attachment_data;
}

/**
 * Cache invalidation hooks
 */
function sonoite_clear_tracks_cache() {
    // Clear transient caches
    delete_transient('sonoite_tracks_cache_v3');

    // Clear object cache
    wp_cache_delete('sonoite_tracks_v3', 'sonoite');

    // Clear individual track caches
    $post_ids = get_posts(array(
        'post_type' => 'track',
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
        'update_post_meta_cache' => false,
        'update_post_term_cache' => false
    ));

    foreach ($post_ids as $post_id) {
        delete_transient('sonoite_track_' . $post_id);
        wp_cache_delete('sonoite_track_' . $post_id, 'sonoite');
    }

    // Log cache clear
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('Sonoite: All caches cleared (' . count($post_ids) . ' tracks)');
    }
}

// Hook cache invalidation to relevant actions
add_action('save_post_track', 'sonoite_clear_tracks_cache');
add_action('delete_post', 'sonoite_clear_tracks_cache');
add_action('wp_trash_post', 'sonoite_clear_tracks_cache');
add_action('untrash_post', 'sonoite_clear_tracks_cache');
add_action('set_object_terms', 'sonoite_clear_tracks_cache');

/**
 * Get secure tracks data for public consumption
 */
function sonoite_get_secure_tracks_data() {
    // Use cached tracks data
    $tracks = sonoite_get_tracks_cached();
    $secure_tracks = array();

    foreach ($tracks as $track) {
        // Security: Validate and sanitize each track
        $secure_track = array(
            'id' => intval($track['id']),
            'title' => sanitize_text_field($track['title']),
            'content' => wp_kses_post($track['content']),
            'audio_url' => esc_url($track['audio_url']),
            'duration' => sanitize_text_field($track['duration']),
            'order' => intval($track['order']),
            'slug' => sanitize_title($track['slug'] ?? $track['title']),
        );

        // Security: Only include tracks with valid audio URLs
        if (!empty($secure_track['audio_url']) && sonoite_validate_audio_url($secure_track['audio_url'])) {
            $secure_tracks[] = $secure_track;
        }
    }

    return $secure_tracks;
}

/**
 * Optimize database queries for archive pages
 */
function sonoite_optimize_queries($query) {
    if (is_admin() || !$query->is_main_query()) {
        return;
    }

    // For track archives, optimize the query
    if (is_post_type_archive('track')) {
        $query->set('posts_per_page', 20); // Limit posts per page
        $query->set('no_found_rows', true); // Don't count total posts if not needed
        $query->set('update_post_meta_cache', false); // Don't cache meta if not needed
        $query->set('update_post_term_cache', false); // Don't cache terms if not needed
    }
}
add_action('pre_get_posts', 'sonoite_optimize_queries');

/**
 * Optimize asset loading
 */
function sonoite_optimize_assets() {
    // Skip optimization in admin area to prevent breaking block editor
    if (is_admin()) {
        return;
    }
    
    if (!is_front_page()) {
        return;
    }

    // Remove unnecessary scripts/styles for single-page app
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('classic-theme-styles');
    wp_dequeue_script('wp-embed');

    // Remove emoji scripts (already done in theme setup)
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
}
add_action('wp_enqueue_scripts', 'sonoite_optimize_assets', 100);

/**
 * Add lazy loading attributes
 */
function sonoite_add_lazy_loading($attr, $attachment, $size) {
    if (!is_admin() && !wp_is_mobile()) {
        $attr['loading'] = 'lazy';
        $attr['decoding'] = 'async';
    }

    return $attr;
}
add_filter('wp_get_attachment_image_attributes', 'sonoite_add_lazy_loading', 10, 3);

/**
 * Database optimization for security logs
 */
function sonoite_optimize_security_logs() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'sonoite_security_violations';

    // Check if table exists first
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        return;
    }

    // Delete old logs (older than 30 days)
    $deleted = $wpdb->query(
        "DELETE FROM {$table_name} WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );

    if ($deleted) {
        error_log("Sonoite: Cleaned up {$deleted} old security log entries");
    }

    // Optimize table if it's getting large
    $table_size = $wpdb->get_var("SELECT COUNT(*) FROM {$table_name}");
    if ($table_size > 10000) {
        $wpdb->query("OPTIMIZE TABLE {$table_name}");
        error_log("Sonoite: Optimized security logs table ({$table_size} entries)");
    }
}

// Schedule daily cleanup
if (!wp_next_scheduled('sonoite_cleanup_logs')) {
    wp_schedule_event(time(), 'daily', 'sonoite_cleanup_logs');
}
add_action('sonoite_cleanup_logs', 'sonoite_optimize_security_logs');

// Unschedule when switching away from the theme so the event doesn't outlive it
add_action('switch_theme', function () {
    wp_clear_scheduled_hook('sonoite_cleanup_logs');
});

/**
 * Asset manifest loading with proper transient caching
 * BUILD-03: Skip transient cache in debug mode to avoid stale assets during dev
 */
function sonoite_get_asset_manifest() {
    $transient_key = 'sonoite_asset_manifest';
    $is_debug = defined('WP_DEBUG') && WP_DEBUG;

    // Load from disk
    $manifest_path = get_template_directory() . '/dist/.vite/manifest.json';
    if (!file_exists($manifest_path)) {
        // Fall back to old location
        $manifest_path = get_template_directory() . '/dist/manifest.json';
    }

    if (!file_exists($manifest_path)) {
        if ($is_debug) {
            error_log('Sonoite: Asset manifest not found. Run npm run build first.');
        }
        return array();
    }

    $manifest_mtime = filemtime($manifest_path);

    // BUILD-03: Skip cache entirely in debug mode - always load fresh
    if (!$is_debug) {
        $manifest = get_transient($transient_key);
        $cached_mtime = get_transient($transient_key . '_mtime');

        if (false !== $manifest && (int) $cached_mtime === (int) $manifest_mtime) {
            return $manifest;
        }
    }

    $manifest_content = file_get_contents($manifest_path);
    $manifest_data = json_decode($manifest_content, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        if ($is_debug) {
            error_log('Sonoite: Invalid asset manifest JSON');
        }
        return array();
    }

    // BUILD-03: Only cache in production (not debug mode)
    if (!$is_debug) {
        // Tie cache to manifest mtime for automatic invalidation
        set_transient($transient_key, $manifest_data, HOUR_IN_SECONDS);
        set_transient($transient_key . '_mtime', $manifest_mtime, HOUR_IN_SECONDS);
    }

    return $manifest_data;
}

/**
 * Clear asset manifest cache on theme switch
 */
function sonoite_clear_asset_manifest() {
    delete_transient('sonoite_asset_manifest');
}
add_action('after_switch_theme', 'sonoite_clear_asset_manifest');

/**
 * Accept only audio URLs on this site's own host with an audio file extension.
 * sonoite_get_secure_tracks_data() drops tracks that fail this check.
 */
function sonoite_validate_audio_url($url) {
    // SEC-04: Use wp_parse_url with null checks to avoid undefined index
    $parsed_url = wp_parse_url($url);
    if (!$parsed_url || !isset($parsed_url['host'])) {
        return false;
    }

    // SEC-01: Only allow local domain - no CDN for audio files
    $home_parsed = wp_parse_url(home_url());
    $home_host = isset($home_parsed['host']) ? $home_parsed['host'] : '';

    $allowed_hosts = array($home_host);

    if (!in_array($parsed_url['host'], $allowed_hosts, true)) {
        return false;
    }

    // Check file extension
    $allowed_extensions = array('mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac');
    $path = isset($parsed_url['path']) ? $parsed_url['path'] : '';
    $extension = pathinfo($path, PATHINFO_EXTENSION);

    return in_array(strtolower($extension), $allowed_extensions, true);
}
