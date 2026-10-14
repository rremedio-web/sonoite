<?php
/**
 * wp-admin screens for the theme.
 *
 * Dashboard widgets (cache, security log, tracks missing audio), the Sonoite
 * menu (settings, performance, security log, cache, particle counts), the
 * preview-page settings and subscriber list under Album Tracks, and the AJAX
 * handlers those screens call. Loaded by functions.php.
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

/**
 * Add admin dashboard widgets
 */
function sonoite_add_dashboard_widgets() {
    // Performance dashboard widget
    wp_add_dashboard_widget(
        'sonoite_performance_widget',
        __('Sonoite Performance', SONOITE_TEXT_DOMAIN),
        'sonoite_performance_dashboard_widget'
    );

    // Security dashboard widget
    wp_add_dashboard_widget(
        'sonoite_security_widget',
        __('Sonoite Security Status', SONOITE_TEXT_DOMAIN),
        'sonoite_security_dashboard_widget'
    );

    // Tracks overview widget
    wp_add_dashboard_widget(
        'sonoite_tracks_widget',
        __('Tracks Overview', SONOITE_TEXT_DOMAIN),
        'sonoite_tracks_dashboard_widget'
    );
}
add_action('wp_dashboard_setup', 'sonoite_add_dashboard_widgets');

/**
 * AJAX handler to attach audio to track
 */
function sonoite_ajax_attach_audio() {
    check_ajax_referer('sonoite-admin-ajax', 'nonce');

    $track_id = isset($_POST['track_id']) ? intval($_POST['track_id']) : 0;
    $audio_id = isset($_POST['audio_id']) ? intval($_POST['audio_id']) : 0;
    
    if (!$track_id || !$audio_id) {
        wp_send_json_error('Invalid parameters');
    }
    
    // Verify track exists and is correct post type
    $track = get_post($track_id);
    if (!$track || $track->post_type !== 'track') {
        wp_send_json_error('Invalid track');
    }

    if (
        !current_user_can('edit_post', $track_id) ||
        !current_user_can('upload_files')
    ) {
        wp_send_json_error('Unauthorized', 403);
    }
    
    // Verify audio exists and is audio type
    $audio = get_post($audio_id);
    if (!$audio || strpos($audio->post_mime_type, 'audio/') !== 0) {
        wp_send_json_error('Invalid audio file');
    }

    if (!current_user_can('edit_post', $audio_id)) {
        wp_send_json_error('Unauthorized audio file', 403);
    }
    
    // Update the audio_file meta
    update_post_meta($track_id, 'audio_file', $audio_id);
    
    // Set audio parent to track
    wp_update_post(array(
        'ID' => $audio_id,
        'post_parent' => $track_id
    ));
    
    // Clear cache
    delete_transient('sonoite_tracks_cache_v3');
    
    wp_send_json_success(array(
        'message' => 'Audio attached successfully',
        'audio_url' => wp_get_attachment_url($audio_id)
    ));
}
add_action('wp_ajax_sonoite_attach_audio', 'sonoite_ajax_attach_audio');

/**
 * AJAX handler to check for unattached audio files
 */
function sonoite_ajax_check_unattached_audio() {
    check_ajax_referer('sonoite-admin-ajax', 'nonce');

    if (!current_user_can('edit_posts') || !current_user_can('upload_files')) {
        wp_send_json_error('Unauthorized', 403);
    }
    
    // Find track without audio
    $track_without_audio = get_posts(array(
        'post_type' => 'track',
        'post_status' => 'publish',
        'meta_query' => array(
            array(
                'key' => 'audio_file',
                'compare' => 'NOT EXISTS'
            )
        ),
        'posts_per_page' => 1
    ));
    
    if (empty($track_without_audio)) {
        wp_send_json_success(array('found' => false));
    }
    
    $track = $track_without_audio[0];

    if (!current_user_can('edit_post', $track->ID)) {
        wp_send_json_success(array('found' => false));
    }
    
    // Find audio files not attached to any post
    $unattached_audio = get_posts(array(
        'post_type' => 'attachment',
        'post_mime_type' => 'audio',
        'post_parent' => 0,
        'posts_per_page' => 1,
        'orderby' => 'date',
        'order' => 'DESC'
    ));
    
    if (empty($unattached_audio)) {
        // Try finding any audio file
        $any_audio = get_posts(array(
            'post_type' => 'attachment',
            'post_mime_type' => 'audio',
            'posts_per_page' => 1,
            'orderby' => 'date',
            'order' => 'DESC'
        ));
        
        if (!empty($any_audio)) {
            $audio = $any_audio[0];
            if (!current_user_can('edit_post', $audio->ID)) {
                wp_send_json_success(array('found' => false));
            }
            wp_send_json_success(array(
                'found' => true,
                'track_id' => $track->ID,
                'track_title' => sanitize_text_field($track->post_title),
                'audio_id' => $audio->ID,
                'audio_title' => sanitize_text_field($audio->post_title)
            ));
        }
    } else {
        $audio = $unattached_audio[0];
        if (!current_user_can('edit_post', $audio->ID)) {
            wp_send_json_success(array('found' => false));
        }
        wp_send_json_success(array(
            'found' => true,
            'track_id' => $track->ID,
            'track_title' => sanitize_text_field($track->post_title),
            'audio_id' => $audio->ID,
            'audio_title' => sanitize_text_field($audio->post_title)
        ));
    }
    
    wp_send_json_success(array('found' => false));
}
add_action('wp_ajax_sonoite_check_unattached_audio', 'sonoite_ajax_check_unattached_audio');


/**
 * Performance dashboard widget content
 */
function sonoite_performance_dashboard_widget() {
    $cache_status = array(
        'object_cache' => wp_using_ext_object_cache(),
        'tracks_cached' => get_transient('sonoite_tracks_cache_v3') !== false,
        'asset_manifest_cached' => get_transient('sonoite_asset_manifest') !== false,
    );

    $memory_usage = round(memory_get_usage() / 1024 / 1024, 2);
    $peak_memory = round(memory_get_peak_usage() / 1024 / 1024, 2);
    ?>
    <div class="sonoite-dashboard-widget">
        <h4><?php _e('Cache Status', SONOITE_TEXT_DOMAIN); ?></h4>
        <ul>
            <li>
                <?php _e('Object Cache:', SONOITE_TEXT_DOMAIN); ?>
                <span class="status-<?php echo $cache_status['object_cache'] ? 'active' : 'inactive'; ?>">
                    <?php echo $cache_status['object_cache'] ? __('Active', SONOITE_TEXT_DOMAIN) : __('Inactive', SONOITE_TEXT_DOMAIN); ?>
                </span>
            </li>
            <li>
                <?php _e('Tracks Cache:', SONOITE_TEXT_DOMAIN); ?>
                <span class="status-<?php echo $cache_status['tracks_cached'] ? 'active' : 'inactive'; ?>">
                    <?php echo $cache_status['tracks_cached'] ? __('Cached', SONOITE_TEXT_DOMAIN) : __('Not Cached', SONOITE_TEXT_DOMAIN); ?>
                </span>
            </li>
            <li>
                <?php _e('Assets Cache:', SONOITE_TEXT_DOMAIN); ?>
                <span class="status-<?php echo $cache_status['asset_manifest_cached'] ? 'active' : 'inactive'; ?>">
                    <?php echo $cache_status['asset_manifest_cached'] ? __('Cached', SONOITE_TEXT_DOMAIN) : __('Not Cached', SONOITE_TEXT_DOMAIN); ?>
                </span>
            </li>
        </ul>

        <h4><?php _e('Memory Usage', SONOITE_TEXT_DOMAIN); ?></h4>
        <p>
            <?php printf(__('Current: %sMB | Peak: %sMB', SONOITE_TEXT_DOMAIN), $memory_usage, $peak_memory); ?>
        </p>

        <p>
            <a href="<?php echo esc_url(admin_url('admin.php?page=sonoite-performance')); ?>" class="button">
                <?php _e('View Detailed Performance', SONOITE_TEXT_DOMAIN); ?>
            </a>
            <button type="button" class="button" onclick="sonoiteClearCache()">
                <?php _e('Clear Cache', SONOITE_TEXT_DOMAIN); ?>
            </button>
        </p>
    </div>

    <script>
    function sonoiteClearCache() {
        if (!confirm('<?php echo esc_js(__('Are you sure you want to clear the cache?', SONOITE_TEXT_DOMAIN)); ?>')) {
            return;
        }

        // Show loading state
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = '<?php echo esc_js(__('Clearing...', SONOITE_TEXT_DOMAIN)); ?>';

        // Use AJAX with nonce for security
        jQuery.ajax({
            url: '<?php echo esc_url(admin_url('admin-ajax.php')); ?>',
            type: 'POST',
            data: {
                action: 'sonoite_clear_cache',
                nonce: '<?php echo esc_js(wp_create_nonce('sonoite-clear-cache-nonce')); ?>'
            },
            success: function(response) {
                if (response.success) {
                    alert(response.data.message || '<?php echo esc_js(__('Cache cleared successfully!', SONOITE_TEXT_DOMAIN)); ?>');
                    // Reload to show updated stats
                    window.location.reload();
                } else {
                    alert(response.data.message || '<?php echo esc_js(__('Failed to clear cache.', SONOITE_TEXT_DOMAIN)); ?>');
                    button.disabled = false;
                    button.textContent = originalText;
                }
            },
            error: function() {
                alert('<?php echo esc_js(__('Error clearing cache. Please try again.', SONOITE_TEXT_DOMAIN)); ?>');
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }
    </script>

    <style>
    .sonoite-dashboard-widget .status-active { color: #46b450; font-weight: bold; }
    .sonoite-dashboard-widget .status-inactive { color: #dc3232; font-weight: bold; }
    .sonoite-dashboard-widget ul { margin: 0 0 15px 0; }
    .sonoite-dashboard-widget li { margin-bottom: 5px; }
    </style>
    <?php
}

/**
 * Security dashboard widget content
 */
function sonoite_security_dashboard_widget() {
    global $wpdb;

    $security_table = $wpdb->prefix . 'sonoite_security_violations';
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$security_table'") === $security_table;

    if ($table_exists) {
        $total_violations = $wpdb->get_var("SELECT COUNT(*) FROM {$security_table}");
        $recent_violations = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$security_table} WHERE timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
        );
        $critical_violations = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$security_table} WHERE severity = %s",
            'critical'
        ));

        $recent_entries = $wpdb->get_results(
            "SELECT violation_type, ip_address, timestamp FROM {$security_table} 
             ORDER BY timestamp DESC LIMIT 5"
        );
    } else {
        $total_violations = 0;
        $recent_violations = 0;
        $critical_violations = 0;
        $recent_entries = array();
    }
    ?>
    <div class="sonoite-dashboard-widget">
        <h4><?php _e('Security Statistics', SONOITE_TEXT_DOMAIN); ?></h4>
        <ul>
            <li><?php printf(__('Total Violations: %d', SONOITE_TEXT_DOMAIN), $total_violations); ?></li>
            <li><?php printf(__('Last 24 Hours: %d', SONOITE_TEXT_DOMAIN), $recent_violations); ?></li>
            <li>
                <?php printf(__('Critical: %d', SONOITE_TEXT_DOMAIN), $critical_violations); ?>
                <?php if ($critical_violations > 0): ?>
                    <span style="color: #dc3232; font-weight: bold;">⚠</span>
                <?php endif; ?>
            </li>
        </ul>

        <?php if (!empty($recent_entries)): ?>
            <h4><?php _e('Recent Violations', SONOITE_TEXT_DOMAIN); ?></h4>
            <ul style="font-size: 12px;">
                <?php foreach ($recent_entries as $entry): ?>
                    <li>
                        <strong><?php echo esc_html($entry->violation_type); ?></strong>
                        from <?php echo esc_html($entry->ip_address); ?>
                        <br><small><?php echo esc_html($entry->timestamp); ?></small>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>

        <p>
            <a href="<?php echo esc_url(admin_url('admin.php?page=sonoite-security')); ?>" class="button">
                <?php _e('View Security Logs', SONOITE_TEXT_DOMAIN); ?>
            </a>
        </p>
    </div>
    <?php
}

/**
 * Tracks overview dashboard widget content
 */
function sonoite_tracks_dashboard_widget() {
    $tracks_count = wp_count_posts('track');
    $published_tracks = $tracks_count->publish ?? 0;
    $draft_tracks = $tracks_count->draft ?? 0;

    // Get tracks without audio files
    $tracks_without_audio = get_posts(array(
        'post_type' => 'track',
        'post_status' => 'publish',
        'meta_query' => array(
            array(
                'key' => 'audio_file',
                'compare' => 'NOT EXISTS'
            )
        ),
        'fields' => 'ids',
        'posts_per_page' => -1
    ));

    $missing_audio_count = count($tracks_without_audio);

    // Get recent tracks
    $recent_tracks = get_posts(array(
        'post_type' => 'track',
        'post_status' => 'publish',
        'posts_per_page' => 5,
        'orderby' => 'date',
        'order' => 'DESC'
    ));
    ?>
    <div class="sonoite-dashboard-widget">
        <h4><?php _e('Track Statistics', SONOITE_TEXT_DOMAIN); ?></h4>
        <ul>
            <li><?php printf(__('Published: %d', SONOITE_TEXT_DOMAIN), $published_tracks); ?></li>
            <li><?php printf(__('Drafts: %d', SONOITE_TEXT_DOMAIN), $draft_tracks); ?></li>
            <li>
                <?php printf(__('Missing Audio: %d', SONOITE_TEXT_DOMAIN), $missing_audio_count); ?>
                <?php if ($missing_audio_count > 0): ?>
                    <span style="color: #dc3232; font-weight: bold;">⚠</span>
                <?php endif; ?>
            </li>
        </ul>

        <?php if (!empty($recent_tracks)): ?>
            <h4><?php _e('Recent Tracks', SONOITE_TEXT_DOMAIN); ?></h4>
            <ul style="font-size: 12px;">
                <?php foreach ($recent_tracks as $track): ?>
                    <li>
                        <a href="<?php echo esc_url(get_edit_post_link($track->ID)); ?>">
                            <?php echo esc_html($track->post_title); ?>
                        </a>
                        <br><small><?php echo esc_html(get_the_date('', $track)); ?></small>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>

        <p>
            <a href="<?php echo esc_url(admin_url('edit.php?post_type=track')); ?>" class="button">
                <?php _e('Manage Tracks', SONOITE_TEXT_DOMAIN); ?>
            </a>
            <a href="<?php echo esc_url(admin_url('post-new.php?post_type=track')); ?>" class="button button-primary">
                <?php _e('Add New Track', SONOITE_TEXT_DOMAIN); ?>
            </a>
        </p>
        
        <?php if ($missing_audio_count > 0): ?>
            <div id="sonoite-audio-fix-status"></div>
            <script>
            jQuery(document).ready(function($) {
                // Check for unattached audio files and auto-fix
                $.post(ajaxurl, {
                    action: 'sonoite_check_unattached_audio',
                    nonce: '<?php echo esc_js(wp_create_nonce('sonoite-admin-ajax')); ?>'
                }, function(response) {
                    if (response.success && response.data.found) {
                        var $status = $('#sonoite-audio-fix-status').empty();
                        var $notice = $('<div>').css({
                            background: '#d4edda',
                            padding: '10px',
                            margin: '10px 0',
                            border: '1px solid #c3e6cb'
                        });
                        $('<strong>')
                            .text('Found audio file: ' + response.data.audio_title)
                            .appendTo($notice);
                        $('<br>').appendTo($notice);
                        $('<button>')
                            .addClass('button button-primary')
                            .text('Attach to track')
                            .on('click', function() {
                                sonoiteAttachAudio(response.data.track_id, response.data.audio_id);
                            })
                            .appendTo($notice);
                        $status.append($notice);
                    }
                });
            });
            
            function sonoiteAttachAudio(trackId, audioId) {
                jQuery.post(ajaxurl, {
                    action: 'sonoite_attach_audio',
                    track_id: trackId,
                    audio_id: audioId,
                    nonce: '<?php echo esc_js(wp_create_nonce('sonoite-admin-ajax')); ?>'
                }, function(response) {
                    if (response.success) {
                        location.reload();
                    }
                });
            }
            </script>
        <?php endif; ?>
    </div>
    <?php
}

/**
 * Add admin menu pages
 */
function sonoite_add_admin_menu() {
    // Main Sonoite menu
    add_menu_page(
        __('Sonoite Settings', SONOITE_TEXT_DOMAIN),
        __('Sonoite', SONOITE_TEXT_DOMAIN),
        'manage_options',
        'sonoite-settings',
        'sonoite_settings_page',
        'dashicons-format-audio',
        30
    );

    // Performance submenu
    add_submenu_page(
        'sonoite-settings',
        __('Performance Monitor', SONOITE_TEXT_DOMAIN),
        __('Performance', SONOITE_TEXT_DOMAIN),
        'manage_options',
        'sonoite-performance',
        'sonoite_performance_page'
    );

    // Security submenu (violation summary and log)
    add_submenu_page(
        'sonoite-settings',
        __('Security', SONOITE_TEXT_DOMAIN),
        __('Security', SONOITE_TEXT_DOMAIN),
        'manage_options',
        'sonoite-security',
        'sonoite_security_page'
    );

    // Cache management submenu
    add_submenu_page(
        'sonoite-settings',
        __('Cache Management', SONOITE_TEXT_DOMAIN),
        __('Cache', SONOITE_TEXT_DOMAIN),
        'manage_options',
        'sonoite-cache',
        'sonoite_cache_page'
    );

    // Preview settings submenu
    add_submenu_page(
        'edit.php?post_type=track',
        __('Preview Settings', SONOITE_TEXT_DOMAIN),
        __('Preview Settings', SONOITE_TEXT_DOMAIN),
        'manage_options',
        'sonoite-preview-settings',
        'sonoite_preview_settings_page'
    );

    // Preview subscribers submenu
    add_submenu_page(
        'edit.php?post_type=track',
        __('Preview Subscribers', SONOITE_TEXT_DOMAIN),
        __('Subscribers', SONOITE_TEXT_DOMAIN),
        'manage_options',
        'sonoite-preview-subscribers',
        'sonoite_preview_subscribers_page'
    );
}
add_action('admin_menu', 'sonoite_add_admin_menu');

/**
 * Main settings page
 */
function sonoite_settings_page() {
    ?>
    <div class="wrap">
        <h1><?php _e('Sonoite Theme Settings', SONOITE_TEXT_DOMAIN); ?></h1>
        
        <div class="sonoite-admin-grid">
            <div class="sonoite-admin-card">
                <h3><?php _e('Theme Information', SONOITE_TEXT_DOMAIN); ?></h3>
                <p><?php printf(__('Version: %s', SONOITE_TEXT_DOMAIN), SONOITE_VERSION); ?></p>
                <p><?php printf(__('Security Version: %s', SONOITE_TEXT_DOMAIN), SONOITE_SECURITY_VERSION); ?></p>
                <p><?php _e('Interactive Three.js audio-reactive album experience theme', SONOITE_TEXT_DOMAIN); ?></p>
            </div>

            <div class="sonoite-admin-card">
                <h3><?php _e('Quick Actions', SONOITE_TEXT_DOMAIN); ?></h3>
                <p>
                    <a href="<?php echo esc_url(admin_url('post-new.php?post_type=track')); ?>" class="button button-primary">
                        <?php _e('Add New Track', SONOITE_TEXT_DOMAIN); ?>
                    </a>
                </p>
                <p>
                    <button type="button" class="button" onclick="sonoiteClearAllCache()">
                        <?php _e('Clear All Cache', SONOITE_TEXT_DOMAIN); ?>
                    </button>
                </p>
                <p>
                    <a href="<?php echo esc_url(admin_url('admin.php?page=sonoite-performance')); ?>" class="button">
                        <?php _e('Performance Monitor', SONOITE_TEXT_DOMAIN); ?>
                    </a>
                </p>
            </div>

            <div class="sonoite-admin-card">
                <h3><?php _e('System Status', SONOITE_TEXT_DOMAIN); ?></h3>
                <ul>
                    <li>
                        <?php _e('Object Cache:', SONOITE_TEXT_DOMAIN); ?>
                        <strong><?php echo wp_using_ext_object_cache() ? __('Active', SONOITE_TEXT_DOMAIN) : __('Inactive', SONOITE_TEXT_DOMAIN); ?></strong>
                    </li>
                    <li>
                        <?php _e('Security Enabled:', SONOITE_TEXT_DOMAIN); ?>
                        <strong><?php echo SONOITE_SECURITY_ENABLED ? __('Yes', SONOITE_TEXT_DOMAIN) : __('No', SONOITE_TEXT_DOMAIN); ?></strong>
                    </li>
                    <li>
                        <?php _e('Debug Mode:', SONOITE_TEXT_DOMAIN); ?>
                        <strong><?php echo (defined('WP_DEBUG') && WP_DEBUG) ? __('On', SONOITE_TEXT_DOMAIN) : __('Off', SONOITE_TEXT_DOMAIN); ?></strong>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <script>
    function sonoiteClearAllCache() {
        if (!confirm('<?php echo esc_js(__('Clear all caches? This will temporarily slow down the site.', SONOITE_TEXT_DOMAIN)); ?>')) {
            return;
        }

        fetch('<?php echo esc_url(rest_url('sonoite/v1/cache')); ?>', {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': '<?php echo esc_js(wp_create_nonce('wp_rest')); ?>',
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('<?php echo esc_js(__('All caches cleared successfully!', SONOITE_TEXT_DOMAIN)); ?>');
            } else {
                alert('<?php echo esc_js(__('Failed to clear cache.', SONOITE_TEXT_DOMAIN)); ?>');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('<?php echo esc_js(__('Error clearing cache.', SONOITE_TEXT_DOMAIN)); ?>');
        });
    }
    </script>

    <style>
    .sonoite-admin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    .sonoite-admin-card {
        background: #fff;
        border: 1px solid #ccd0d4;
        padding: 20px;
        border-radius: 4px;
    }
    .sonoite-admin-card h3 {
        margin-top: 0;
    }
    .sonoite-admin-card ul {
        margin: 0;
    }
    .sonoite-admin-card li {
        margin-bottom: 8px;
    }
    </style>
    <?php
}

/**
 * Performance monitoring page
 */
function sonoite_performance_page() {
    // Dispatch the REST route in-process: an HTTP loopback carries no auth
    // cookie, so core's nonce check would reject it with a 403.
    $response = rest_do_request(new WP_REST_Request('GET', '/sonoite/v1/performance'));
    $metrics = $response->is_error() ? array() : $response->get_data();
    ?>
    <div class="wrap">
        <h1><?php _e('Performance Monitor', SONOITE_TEXT_DOMAIN); ?></h1>

        <?php if (!empty($metrics)): ?>
            <div class="sonoite-admin-grid">
                <div class="sonoite-admin-card">
                    <h3><?php _e('Cache Status', SONOITE_TEXT_DOMAIN); ?></h3>
                    <ul>
                        <li>
                            <?php _e('Object Cache:', SONOITE_TEXT_DOMAIN); ?>
                            <strong><?php echo $metrics['cache_status']['object_cache_active'] ? __('Active', SONOITE_TEXT_DOMAIN) : __('Inactive', SONOITE_TEXT_DOMAIN); ?></strong>
                        </li>
                        <li>
                            <?php _e('Tracks Cache:', SONOITE_TEXT_DOMAIN); ?>
                            <strong><?php echo $metrics['cache_status']['tracks_cached'] ? __('Hit', SONOITE_TEXT_DOMAIN) : __('Miss', SONOITE_TEXT_DOMAIN); ?></strong>
                        </li>
                        <li>
                            <?php _e('Asset Manifest:', SONOITE_TEXT_DOMAIN); ?>
                            <strong><?php echo $metrics['cache_status']['asset_manifest_cached'] ? __('Cached', SONOITE_TEXT_DOMAIN) : __('Not Cached', SONOITE_TEXT_DOMAIN); ?></strong>
                        </li>
                    </ul>
                </div>

                <div class="sonoite-admin-card">
                    <h3><?php _e('Database Statistics', SONOITE_TEXT_DOMAIN); ?></h3>
                    <ul>
                        <li><?php printf(__('Total Tracks: %d', SONOITE_TEXT_DOMAIN), $metrics['database_stats']['total_tracks']); ?></li>
                        <li><?php printf(__('Queries (Last Request): %d', SONOITE_TEXT_DOMAIN), $metrics['database_stats']['total_queries_last_request']); ?></li>
                    </ul>
                </div>

                <div class="sonoite-admin-card">
                    <h3><?php _e('Memory Usage', SONOITE_TEXT_DOMAIN); ?></h3>
                    <ul>
                        <li><?php printf(__('Current: %s', SONOITE_TEXT_DOMAIN), $metrics['memory_usage']['current']); ?></li>
                        <li><?php printf(__('Peak: %s', SONOITE_TEXT_DOMAIN), $metrics['memory_usage']['peak']); ?></li>
                        <li><?php printf(__('Limit: %s', SONOITE_TEXT_DOMAIN), $metrics['memory_usage']['limit']); ?></li>
                    </ul>
                </div>
            </div>
        <?php else: ?>
            <div class="notice notice-error">
                <p><?php _e('Unable to retrieve performance metrics.', SONOITE_TEXT_DOMAIN); ?></p>
            </div>
        <?php endif; ?>

        <h2><?php _e('Cache Management', SONOITE_TEXT_DOMAIN); ?></h2>
        <p>
            <button type="button" class="button" onclick="sonoiteClearSpecificCache('tracks')">
                <?php _e('Clear Tracks Cache', SONOITE_TEXT_DOMAIN); ?>
            </button>
            <button type="button" class="button" onclick="sonoiteClearSpecificCache('assets')">
                <?php _e('Clear Assets Cache', SONOITE_TEXT_DOMAIN); ?>
            </button>
            <button type="button" class="button" onclick="sonoiteClearSpecificCache('all')">
                <?php _e('Clear All Cache', SONOITE_TEXT_DOMAIN); ?>
            </button>
        </p>
    </div>

    <script>
    function sonoiteClearSpecificCache(type) {
        const messages = {
            'tracks': '<?php echo esc_js(__('Clear tracks cache?', SONOITE_TEXT_DOMAIN)); ?>',
            'assets': '<?php echo esc_js(__('Clear assets cache?', SONOITE_TEXT_DOMAIN)); ?>',
            'all': '<?php echo esc_js(__('Clear all caches?', SONOITE_TEXT_DOMAIN)); ?>'
        };

        if (!confirm(messages[type])) {
            return;
        }

        fetch('<?php echo esc_url(rest_url('sonoite/v1/cache')); ?>', {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': '<?php echo esc_js(wp_create_nonce('wp_rest')); ?>',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cache_type: type })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                location.reload();
            } else {
                alert('<?php echo esc_js(__('Failed to clear cache.', SONOITE_TEXT_DOMAIN)); ?>');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('<?php echo esc_js(__('Error clearing cache.', SONOITE_TEXT_DOMAIN)); ?>');
        });
    }
    </script>
    <?php
}

/**
 * Security page: violation counts plus a paginated log of the
 * sonoite_security_violations table.
 */
function sonoite_security_page() {
    global $wpdb;

    $security_table = $wpdb->prefix . 'sonoite_security_violations';
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$security_table'") === $security_table;

    // Get violations with pagination
    $page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $per_page = 20;
    $offset = ($page - 1) * $per_page;
    $total_violations = 0;
    $violations = array();

    if ($table_exists) {
        $total_violations = $wpdb->get_var("SELECT COUNT(*) FROM {$security_table}");
        $violations = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$security_table} ORDER BY timestamp DESC LIMIT %d OFFSET %d",
            $per_page,
            $offset
        ));
    }

    $total_pages = ceil($total_violations / $per_page);
    ?>
    <div class="wrap">
        <h1><?php _e('Security', SONOITE_TEXT_DOMAIN); ?></h1>

        <div class="sonoite-admin-grid">
            <div class="sonoite-admin-card">
                <h2><?php _e('Security Summary', SONOITE_TEXT_DOMAIN); ?></h2>
                <?php sonoite_display_detailed_security_status(); ?>
            </div>
        </div>

        <?php if (!$table_exists): ?>
            <div class="notice notice-info">
                <p><?php _e('Security violations table not found. Violations will be logged when they occur.', SONOITE_TEXT_DOMAIN); ?></p>
            </div>
        <?php else: ?>
            <h2><?php _e('Security Logs', SONOITE_TEXT_DOMAIN); ?></h2>

            <div class="sonoite-security-stats">
                <p><?php printf(__('Total Violations: %d', SONOITE_TEXT_DOMAIN), $total_violations); ?></p>
            </div>

            <?php if (!empty($violations)): ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th><?php _e('Time', SONOITE_TEXT_DOMAIN); ?></th>
                            <th><?php _e('Type', SONOITE_TEXT_DOMAIN); ?></th>
                            <th><?php _e('IP Address', SONOITE_TEXT_DOMAIN); ?></th>
                            <th><?php _e('Severity', SONOITE_TEXT_DOMAIN); ?></th>
                            <th><?php _e('Details', SONOITE_TEXT_DOMAIN); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($violations as $violation): ?>
                            <tr>
                                <td><?php echo esc_html($violation->timestamp); ?></td>
                                <td><?php echo esc_html($violation->violation_type); ?></td>
                                <td><?php echo esc_html($violation->ip_address); ?></td>
                                <td>
                                    <span class="severity-<?php echo esc_attr($violation->severity); ?>">
                                        <?php echo esc_html(ucfirst($violation->severity)); ?>
                                    </span>
                                </td>
                                <td><?php echo esc_html(wp_trim_words($violation->violation_details, 10)); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <?php if ($total_pages > 1): ?>
                    <div class="tablenav">
                        <div class="tablenav-pages">
                            <?php
                            echo paginate_links(array(
                                'base' => add_query_arg('paged', '%#%'),
                                'format' => '',
                                'prev_text' => __('&laquo; Previous', SONOITE_TEXT_DOMAIN),
                                'next_text' => __('Next &raquo;', SONOITE_TEXT_DOMAIN),
                                'total' => $total_pages,
                                'current' => $page
                            ));
                            ?>
                        </div>
                    </div>
                <?php endif; ?>
            <?php else: ?>
                <div class="notice notice-success">
                    <p><?php _e('No security violations recorded.', SONOITE_TEXT_DOMAIN); ?></p>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>

    <style>
    .severity-low { color: #46b450; }
    .severity-medium { color: #ffb900; }
    .severity-high { color: #dc3232; }
    .severity-critical { color: #dc3232; font-weight: bold; }
    .sonoite-security-stats { margin: 20px 0; }
    </style>
    <?php
}

/**
 * Cache management page
 */
function sonoite_cache_page() {
    // Dispatched in-process for the same reason as sonoite_performance_page()
    $response = rest_do_request(new WP_REST_Request('GET', '/sonoite/v1/cache'));
    $cache_data = $response->is_error() ? array() : $response->get_data();
    ?>
    <div class="wrap">
        <h1><?php _e('Cache Management', SONOITE_TEXT_DOMAIN); ?></h1>

        <?php if (!empty($cache_data)): ?>
            <div class="sonoite-admin-grid">
                <div class="sonoite-admin-card">
                    <h3><?php _e('Cache Status', SONOITE_TEXT_DOMAIN); ?></h3>
                    <ul>
                        <?php foreach ($cache_data['status'] as $cache_type => $status): ?>
                            <li>
                                <?php echo esc_html(ucwords(str_replace('_', ' ', $cache_type))); ?>:
                                <strong class="status-<?php echo $status ? 'active' : 'inactive'; ?>">
                                    <?php echo $status ? __('Active', SONOITE_TEXT_DOMAIN) : __('Inactive', SONOITE_TEXT_DOMAIN); ?>
                                </strong>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>

                <?php if (!empty($cache_data['expirations'])): ?>
                    <div class="sonoite-admin-card">
                        <h3><?php _e('Cache Expiration', SONOITE_TEXT_DOMAIN); ?></h3>
                        <ul>
                            <?php foreach ($cache_data['expirations'] as $cache_type => $expiration): ?>
                                <li>
                                    <strong><?php echo esc_html(ucwords(str_replace('_', ' ', $cache_type))); ?>:</strong><br>
                                    <?php printf(__('Expires: %s', SONOITE_TEXT_DOMAIN), esc_html($expiration['expires_at'])); ?><br>
                                    <small><?php printf(__('In: %s', SONOITE_TEXT_DOMAIN), esc_html($expiration['expires_in'])); ?></small>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <h2><?php _e('Cache Actions', SONOITE_TEXT_DOMAIN); ?></h2>
        <div class="sonoite-cache-actions">
            <button type="button" class="button" onclick="sonoiteClearCacheType('tracks')">
                <?php _e('Clear Tracks Cache', SONOITE_TEXT_DOMAIN); ?>
            </button>
            <button type="button" class="button" onclick="sonoiteClearCacheType('assets')">
                <?php _e('Clear Assets Cache', SONOITE_TEXT_DOMAIN); ?>
            </button>
            <button type="button" class="button button-primary" onclick="sonoiteClearCacheType('all')">
                <?php _e('Clear All Caches', SONOITE_TEXT_DOMAIN); ?>
            </button>
        </div>

        <div id="cache-messages" style="margin-top: 20px;"></div>
    </div>

    <script>
    function sonoiteClearCacheType(type) {
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = '<?php echo esc_js(__('Clearing...', SONOITE_TEXT_DOMAIN)); ?>';

        fetch('<?php echo esc_url(rest_url('sonoite/v1/cache')); ?>', {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': '<?php echo esc_js(wp_create_nonce('wp_rest')); ?>',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cache_type: type })
        })
        .then(response => response.json())
        .then(data => {
            const messagesDiv = document.getElementById('cache-messages');
            if (data.success) {
                messagesDiv.innerHTML = '<div class="notice notice-success"><p>' + data.message + '</p></div>';
                setTimeout(() => location.reload(), 1000);
            } else {
                messagesDiv.innerHTML = '<div class="notice notice-error"><p><?php echo esc_js(__('Failed to clear cache.', SONOITE_TEXT_DOMAIN)); ?></p></div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('cache-messages').innerHTML = '<div class="notice notice-error"><p><?php echo esc_js(__('Error clearing cache.', SONOITE_TEXT_DOMAIN)); ?></p></div>';
        })
        .finally(() => {
            button.disabled = false;
            button.textContent = originalText;
        });
    }
    </script>

    <style>
    .sonoite-cache-actions { margin: 20px 0; }
    .sonoite-cache-actions .button { margin-right: 10px; }
    .status-active { color: #46b450; }
    .status-inactive { color: #dc3232; }
    </style>
    <?php
}

/**
 * Warn on the Tracks list when published tracks have no audio file attached.
 */
function sonoite_admin_notices() {
    $screen = get_current_screen();
    
    // Only show on relevant admin pages
    if (!in_array($screen->id, array('dashboard', 'edit-track', 'track'))) {
        return;
    }

    // Check for tracks without audio files
    if ($screen->id === 'edit-track') {
        $tracks_without_audio = get_posts(array(
            'post_type' => 'track',
            'post_status' => 'publish',
            'meta_query' => array(
                array(
                    'key' => 'audio_file',
                    'compare' => 'NOT EXISTS'
                )
            ),
            'fields' => 'ids',
            'posts_per_page' => -1
        ));

        if (!empty($tracks_without_audio)) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <strong><?php _e('Missing Audio Files:', SONOITE_TEXT_DOMAIN); ?></strong>
                    <?php printf(__('%d published tracks are missing audio files.', SONOITE_TEXT_DOMAIN), count($tracks_without_audio)); ?>
                </p>
            </div>
            <?php
        }
    }
}
add_action('admin_notices', 'sonoite_admin_notices');

/**
 * Show a build notice when no Vite manifest can be loaded (the theme then
 * enqueues no JS). Uses the same lookup as the front end.
 */
function sonoite_build_admin_notices() {
    $screen = get_current_screen();

    // Only show on relevant admin pages
    if (!$screen || !in_array($screen->id, array('dashboard', 'themes', 'toplevel_page_sonoite-settings'))) {
        return;
    }

    if (empty(sonoite_get_asset_manifest())) {
        ?>
        <div class="notice notice-error is-dismissible">
            <p>
                <strong><?php _e('Sonoite Build Notice:', SONOITE_TEXT_DOMAIN); ?></strong>
                <?php _e('Asset manifest not found. Run `npm run build` to generate compiled assets.', SONOITE_TEXT_DOMAIN); ?>
            </p>
        </div>
        <?php
    }
}
add_action('admin_notices', 'sonoite_build_admin_notices');

/**
 * Display detailed security status information
 */
function sonoite_display_detailed_security_status() {
    global $wpdb;
    
    $security_table = $wpdb->prefix . 'sonoite_security_violations';
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$security_table'") === $security_table;
    
    if (!$table_exists) {
        echo '<p class="description">' . __('Security violations table not found.', SONOITE_TEXT_DOMAIN) . '</p>';
        return;
    }
    
    $recent_violations = $wpdb->get_var(
        "SELECT COUNT(*) FROM {$security_table} WHERE timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );
    
    $critical_violations = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$security_table} WHERE severity = %s",
        'critical'
    ));
    
    echo '<ul>';
    echo '<li>' . sprintf(__('Recent violations (24h): %d', SONOITE_TEXT_DOMAIN), $recent_violations) . '</li>';
    echo '<li>' . sprintf(__('Critical violations: %d', SONOITE_TEXT_DOMAIN), $critical_violations) . '</li>';
    echo '</ul>';
}

/**
 * Preview Settings Page Content
 */
function sonoite_preview_settings_page() {
    // Handle form submission
    if (isset($_POST['submit']) && wp_verify_nonce($_POST['sonoite_preview_nonce'], 'sonoite_preview_settings')) {
        $preview_track_id = intval($_POST['preview_track_id']);
        $coming_soon_message = sanitize_textarea_field($_POST['coming_soon_message']);
        $email_capture_enabled = isset($_POST['email_capture_enabled']) ? 1 : 0;
        $social_sharing_enabled = isset($_POST['social_sharing_enabled']) ? 1 : 0;

        // Validate track selection
        if ($preview_track_id > 0) {
            $track = get_post($preview_track_id);
            if (!$track || $track->post_type !== 'track') {
                add_settings_error('sonoite_preview', 'invalid_track', __('Invalid track selected.', SONOITE_TEXT_DOMAIN));
            } else {
                $audio_id = get_post_meta($track->ID, 'audio_file', true);
                if (!$audio_id) {
                    add_settings_error('sonoite_preview', 'no_audio', __('Selected track has no audio file.', SONOITE_TEXT_DOMAIN));
                } else {
                    update_option('sonoite_preview_track', $preview_track_id);
                    add_settings_error('sonoite_preview', 'settings_saved', __('Preview settings saved successfully.', SONOITE_TEXT_DOMAIN), 'updated');
                }
            }
        }

        update_option('sonoite_coming_soon_message', $coming_soon_message);
        update_option('sonoite_email_capture_enabled', $email_capture_enabled);
        update_option('sonoite_social_sharing_enabled', $social_sharing_enabled);
    }

    // Get current settings
    $current_track_id = get_option('sonoite_preview_track', 0);
    $coming_soon_message = get_option('sonoite_coming_soon_message', __('Full Album Experience Coming Soon', SONOITE_TEXT_DOMAIN));
    $email_capture_enabled = get_option('sonoite_email_capture_enabled', 1);
    $social_sharing_enabled = get_option('sonoite_social_sharing_enabled', 1);

    // Get available tracks
    $tracks = get_posts(array(
        'post_type' => 'track',
        'posts_per_page' => -1,
        'orderby' => 'menu_order',
        'order' => 'ASC',
        'post_status' => 'publish'
    ));

    // Get email subscribers count
    $subscribers_count = count(get_option('sonoite_preview_subscribers', array()));

    ?>
    <div class="wrap">
        <h1><?php esc_html_e('Sonoite Preview Settings', SONOITE_TEXT_DOMAIN); ?></h1>

        <?php settings_errors('sonoite_preview'); ?>

        <div class="sonoite-admin-container">
            <div class="sonoite-admin-main">
                <form method="post" action="">
                    <?php wp_nonce_field('sonoite_preview_settings', 'sonoite_preview_nonce'); ?>

                    <table class="form-table" role="presentation">
                        <tbody>
                            <tr>
                                <th scope="row">
                                    <label for="preview_track_id"><?php esc_html_e('Preview Track', SONOITE_TEXT_DOMAIN); ?></label>
                                </th>
                                <td>
                                    <select id="preview_track_id" name="preview_track_id" class="regular-text">
                                        <option value="0"><?php esc_html_e('Select a track...', SONOITE_TEXT_DOMAIN); ?></option>
                                        <?php foreach ($tracks as $track):
                                            $audio_id = get_post_meta($track->ID, 'audio_file', true);
                                            $has_audio = !empty($audio_id);
                                            ?>
                                            <option value="<?php echo esc_attr($track->ID); ?>" <?php selected($current_track_id, $track->ID); ?> <?php if (!$has_audio) echo 'disabled'; ?>>
                                                <?php echo esc_html($track->post_title); ?>
                                                <?php if (!$has_audio) echo ' (' . __('No audio file', SONOITE_TEXT_DOMAIN) . ')'; ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                    <p class="description">
                                        <?php esc_html_e('Choose which track visitors will experience in the preview.', SONOITE_TEXT_DOMAIN); ?>
                                        <?php if (empty($tracks)): ?>
                                            <br><strong><?php esc_html_e('No tracks found.', SONOITE_TEXT_DOMAIN); ?>
                                            <a href="<?php echo esc_url(admin_url('post-new.php?post_type=track')); ?>">
                                                <?php esc_html_e('Add your first track', SONOITE_TEXT_DOMAIN); ?>
                                            </a></strong>
                                        <?php endif; ?>
                                    </p>

                                    <?php if ($current_track_id):
                                        $current_track = get_post($current_track_id);
                                        $audio_id = get_post_meta($current_track_id, 'audio_file', true);
                                        $audio_url = $audio_id ? wp_get_attachment_url($audio_id) : '';
                                        ?>
                                        <div class="current-preview-track">
                                            <h4><?php esc_html_e('Current Preview Track:', SONOITE_TEXT_DOMAIN); ?></h4>
                                            <p><strong><?php echo esc_html($current_track->post_title); ?></strong></p>
                                            <?php if ($audio_url): ?>
                                                <audio controls style="width: 100%; max-width: 400px;">
                                                    <source src="<?php echo esc_url($audio_url); ?>" type="<?php echo esc_attr(get_post_mime_type($audio_id)); ?>">
                                                    <?php esc_html_e('Your browser does not support the audio element.', SONOITE_TEXT_DOMAIN); ?>
                                                </audio>
                                            <?php endif; ?>
                                            <p>
                                                <a href="<?php echo esc_url(home_url('/preview/')); ?>" target="_blank" class="button button-secondary">
                                                    <?php esc_html_e('View Preview Page', SONOITE_TEXT_DOMAIN); ?>
                                                </a>
                                            </p>
                                        </div>
                                    <?php endif; ?>
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    <label for="coming_soon_message"><?php esc_html_e('Coming Soon Message', SONOITE_TEXT_DOMAIN); ?></label>
                                </th>
                                <td>
                                    <input type="text" id="coming_soon_message" name="coming_soon_message" value="<?php echo esc_attr($coming_soon_message); ?>" class="large-text">
                                    <p class="description">
                                        <?php esc_html_e('The main headline for the "coming soon" section.', SONOITE_TEXT_DOMAIN); ?>
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    <label for="email_capture_enabled"><?php esc_html_e('Email Capture', SONOITE_TEXT_DOMAIN); ?></label>
                                </th>
                                <td>
                                    <input type="checkbox" id="email_capture_enabled" name="email_capture_enabled" value="1" <?php checked($email_capture_enabled, 1); ?>>
                                    <label for="email_capture_enabled">
                                        <?php esc_html_e('Enable email signup for launch notifications', SONOITE_TEXT_DOMAIN); ?>
                                    </label>
                                    <p class="description">
                                        <?php echo wp_kses(
                                            sprintf(
                                                __('Currently %d subscribers. <a href="%s">View subscribers</a>', SONOITE_TEXT_DOMAIN),
                                                $subscribers_count,
                                                esc_url(admin_url('edit.php?post_type=track&page=sonoite-preview-subscribers'))
                                            ),
                                            array('a' => array('href' => array()))
                                        ); ?>
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    <label for="social_sharing_enabled"><?php esc_html_e('Social Sharing', SONOITE_TEXT_DOMAIN); ?></label>
                                </th>
                                <td>
                                    <input type="checkbox" id="social_sharing_enabled" name="social_sharing_enabled" value="1" <?php checked($social_sharing_enabled, 1); ?>>
                                    <label for="social_sharing_enabled">
                                        <?php esc_html_e('Enable social media sharing buttons', SONOITE_TEXT_DOMAIN); ?>
                                    </label>
                                    <p class="description">
                                        <?php esc_html_e('Allow visitors to share the preview on social media.', SONOITE_TEXT_DOMAIN); ?>
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <?php submit_button(__('Save Preview Settings', SONOITE_TEXT_DOMAIN)); ?>
                </form>
            </div>

            <div class="sonoite-admin-sidebar">
                <div class="sonoite-admin-box">
                    <h3><?php esc_html_e('Preview Page Setup', SONOITE_TEXT_DOMAIN); ?></h3>
                    <p><?php esc_html_e('Follow these steps to set up your preview:', SONOITE_TEXT_DOMAIN); ?></p>
                    <ol>
                        <li><?php esc_html_e('Upload at least one track with audio', SONOITE_TEXT_DOMAIN); ?></li>
                        <li><?php esc_html_e('Select which track to use as preview', SONOITE_TEXT_DOMAIN); ?></li>
                        <li><?php esc_html_e('Assign the "Sonoite Preview Experience" template to a page at /preview/', SONOITE_TEXT_DOMAIN); ?></li>
                        <li><?php esc_html_e('Test the preview experience', SONOITE_TEXT_DOMAIN); ?></li>
                        <li><?php esc_html_e('Share with your audience', SONOITE_TEXT_DOMAIN); ?></li>
                    </ol>
                </div>

                <div class="sonoite-admin-box">
                    <h3><?php esc_html_e('Preview URL', SONOITE_TEXT_DOMAIN); ?></h3>
                    <?php $preview_url = home_url('/preview/'); ?>
                    <p>
                        <a href="<?php echo esc_url($preview_url); ?>" target="_blank">
                            <?php echo esc_url($preview_url); ?>
                        </a>
                    </p>
                    <p>
                        <button type="button" class="button button-secondary" onclick="navigator.clipboard.writeText('<?php echo esc_js($preview_url); ?>')">
                            <?php esc_html_e('Copy URL', SONOITE_TEXT_DOMAIN); ?>
                        </button>
                    </p>
                </div>

                <div class="sonoite-admin-box">
                    <h3><?php esc_html_e('Email List Stats', SONOITE_TEXT_DOMAIN); ?></h3>
                    <p>
                        <strong><?php echo esc_html($subscribers_count); ?></strong>
                        <?php esc_html_e('people signed up for launch notifications', SONOITE_TEXT_DOMAIN); ?>
                    </p>
                    <?php if ($subscribers_count > 0): ?>
                        <p>
                            <a href="<?php echo esc_url(admin_url('edit.php?post_type=track&page=sonoite-preview-subscribers')); ?>" class="button button-secondary">
                                <?php esc_html_e('View Subscribers', SONOITE_TEXT_DOMAIN); ?>
                            </a>
                        </p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <style>
    .sonoite-admin-container {
        display: flex;
        gap: 20px;
        margin-top: 20px;
    }
    .sonoite-admin-main {
        flex: 2;
    }
    .sonoite-admin-sidebar {
        flex: 1;
        max-width: 300px;
    }
    .sonoite-admin-box {
        background: #fff;
        border: 1px solid #ccd0d4;
        padding: 20px;
        margin-bottom: 20px;
        border-radius: 4px;
    }
    .sonoite-admin-box h3 {
        margin-top: 0;
    }
    .current-preview-track {
        background: #f0f0f1;
        padding: 15px;
        margin-top: 15px;
        border-radius: 4px;
    }
    .current-preview-track h4 {
        margin-top: 0;
    }
    @media (max-width: 782px) {
        .sonoite-admin-container {
            flex-direction: column;
        }
        .sonoite-admin-sidebar {
            max-width: none;
        }
    }
    </style>
    <?php
}

/**
 * Subscribers Management Page
 */
function sonoite_preview_subscribers_page() {
    // Handle bulk actions
    if (isset($_POST['action']) && $_POST['action'] === 'export' && wp_verify_nonce($_POST['subscribers_nonce'], 'sonoite_subscribers_action')) {
        sonoite_export_subscribers();
        return;
    }

    // Get subscribers
    $subscribers = get_option('sonoite_preview_subscribers', array());
    $subscribers = array_reverse($subscribers); // Most recent first

    ?>
    <div class="wrap">
        <h1><?php esc_html_e('Preview Subscribers', SONOITE_TEXT_DOMAIN); ?></h1>

        <div class="tablenav top">
            <div class="alignleft actions">
                <form method="post" style="display: inline;">
                    <?php wp_nonce_field('sonoite_subscribers_action', 'subscribers_nonce'); ?>
                    <input type="hidden" name="action" value="export">
                    <input type="submit" class="button" value="<?php esc_attr_e('Export CSV', SONOITE_TEXT_DOMAIN); ?>">
                </form>
            </div>
            <div class="tablenav-pages">
                <span class="displaying-num">
                    <?php echo sprintf(_n('%s subscriber', '%s subscribers', count($subscribers), SONOITE_TEXT_DOMAIN), number_format_i18n(count($subscribers))); ?>
                </span>
            </div>
        </div>

        <?php if (empty($subscribers)): ?>
            <div class="notice notice-info">
                <p><?php esc_html_e('No subscribers yet. When people sign up for launch notifications, they\'ll appear here.', SONOITE_TEXT_DOMAIN); ?></p>
            </div>
        <?php else: ?>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th scope="col" class="manage-column"><?php esc_html_e('Email Address', SONOITE_TEXT_DOMAIN); ?></th>
                        <th scope="col" class="manage-column"><?php esc_html_e('Date Subscribed', SONOITE_TEXT_DOMAIN); ?></th>
                        <th scope="col" class="manage-column"><?php esc_html_e('Status', SONOITE_TEXT_DOMAIN); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($subscribers as $subscriber): ?>
                        <tr>
                            <td>
                                <strong><?php echo esc_html($subscriber['email']); ?></strong>
                            </td>
                            <td>
                                <?php
                                $date = new DateTime($subscriber['date']);
                                echo esc_html($date->format(get_option('date_format') . ' ' . get_option('time_format')));
                                ?>
                            </td>
                            <td>
                                <span class="status-<?php echo esc_attr($subscriber['status']); ?>">
                                    <?php
                                    switch ($subscriber['status']) {
                                        case 'confirmed':
                                            esc_html_e('Confirmed', SONOITE_TEXT_DOMAIN);
                                            break;
                                        case 'pending':
                                            esc_html_e('Pending Confirmation', SONOITE_TEXT_DOMAIN);
                                            break;
                                        default:
                                            esc_html_e('Unknown', SONOITE_TEXT_DOMAIN);
                                    }
                                    ?>
                                </span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>

        <div class="tablenav bottom">
            <div class="alignleft actions">
                <p class="description">
                    <?php esc_html_e('Subscribers will receive an email notification when you launch the full album experience.', SONOITE_TEXT_DOMAIN); ?>
                </p>
            </div>
        </div>
    </div>

    <style>
    .status-confirmed {
        color: #00a32a;
        font-weight: 600;
    }
    .status-pending {
        color: #dba617;
        font-weight: 600;
    }
    </style>
    <?php
}

/**
 * Export Subscribers CSV
 */
function sonoite_export_subscribers() {
    $subscribers = get_option('sonoite_preview_subscribers', array());

    if (empty($subscribers)) {
        wp_die(__('No subscribers to export.', SONOITE_TEXT_DOMAIN));
    }

    $filename = 'sonoite-subscribers-' . date('Y-m-d') . '.csv';

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $output = fopen('php://output', 'w');

    // CSV headers
    fputcsv($output, array('Email', 'Date Subscribed', 'Status'));

    // CSV data
    foreach ($subscribers as $subscriber) {
        fputcsv($output, array(
            $subscriber['email'],
            $subscriber['date'],
            $subscriber['status']
        ));
    }

    fclose($output);
    exit;
}

/**
 * Register Particle Settings
 */
function sonoite_register_particle_settings() {
    // Register settings
    register_setting('sonoite_particle_settings', 'sonoite_particle_counts', array(
        'type' => 'array',
        'sanitize_callback' => 'sonoite_sanitize_particle_settings',
        'default' => sonoite_get_default_particle_counts()
    ));
    
    // Add settings section
    add_settings_section(
        'sonoite_particle_section',
        __('Particle System Configuration', SONOITE_TEXT_DOMAIN),
        'sonoite_particle_section_callback',
        'sonoite-particle-settings'
    );
    
    // Flow Realm settings
    add_settings_field(
        'flow_realm_particles',
        __('Flow Realm Particles', SONOITE_TEXT_DOMAIN),
        'sonoite_flow_realm_field_callback',
        'sonoite-particle-settings',
        'sonoite_particle_section'
    );
    
    // Flow Consciousness settings
    add_settings_field(
        'flow_consciousness_particles',
        __('Flow Consciousness Particles', SONOITE_TEXT_DOMAIN),
        'sonoite_flow_consciousness_field_callback',
        'sonoite-particle-settings',
        'sonoite_particle_section'
    );
    
    // Structure Consciousness settings
    add_settings_field(
        'structure_consciousness_particles',
        __('Structure Consciousness Particles', SONOITE_TEXT_DOMAIN),
        'sonoite_structure_consciousness_field_callback',
        'sonoite-particle-settings',
        'sonoite_particle_section'
    );
}
add_action('admin_init', 'sonoite_register_particle_settings');

/**
 * Get default particle counts
 */
function sonoite_get_default_particle_counts() {
    return array(
        'flow_realm' => array(
            'mobile' => 200,
            'desktop' => 500
        ),
        'flow_consciousness' => array(
            'low' => 100,
            'medium' => 200,
            'high' => 400
        ),
        'structure_consciousness' => array(
            'low' => 50,
            'medium' => 100,
            'high' => 200
        )
    );
}

/**
 * Sanitize particle settings
 */
function sonoite_sanitize_particle_settings($input) {
    $sanitized = array();
    $defaults = sonoite_get_default_particle_counts();
    
    // Flow Realm
    $sanitized['flow_realm'] = array(
        'mobile' => isset($input['flow_realm']['mobile']) ? absint($input['flow_realm']['mobile']) : $defaults['flow_realm']['mobile'],
        'desktop' => isset($input['flow_realm']['desktop']) ? absint($input['flow_realm']['desktop']) : $defaults['flow_realm']['desktop']
    );
    
    // Flow Consciousness
    $sanitized['flow_consciousness'] = array(
        'low' => isset($input['flow_consciousness']['low']) ? absint($input['flow_consciousness']['low']) : $defaults['flow_consciousness']['low'],
        'medium' => isset($input['flow_consciousness']['medium']) ? absint($input['flow_consciousness']['medium']) : $defaults['flow_consciousness']['medium'],
        'high' => isset($input['flow_consciousness']['high']) ? absint($input['flow_consciousness']['high']) : $defaults['flow_consciousness']['high']
    );
    
    // Structure Consciousness
    $sanitized['structure_consciousness'] = array(
        'low' => isset($input['structure_consciousness']['low']) ? absint($input['structure_consciousness']['low']) : $defaults['structure_consciousness']['low'],
        'medium' => isset($input['structure_consciousness']['medium']) ? absint($input['structure_consciousness']['medium']) : $defaults['structure_consciousness']['medium'],
        'high' => isset($input['structure_consciousness']['high']) ? absint($input['structure_consciousness']['high']) : $defaults['structure_consciousness']['high']
    );
    
    return $sanitized;
}

/**
 * Particle settings section callback
 */
function sonoite_particle_section_callback() {
    echo '<p>' . __('Configure the number of particles for each consciousness module. Higher values provide richer visuals but require more processing power.', SONOITE_TEXT_DOMAIN) . '</p>';
    echo '<p class="description">' . __('GPU instancing is enabled, allowing for efficient rendering of many particles.', SONOITE_TEXT_DOMAIN) . '</p>';
}

/**
 * Flow Realm field callback
 */
function sonoite_flow_realm_field_callback() {
    $options = get_option('sonoite_particle_counts', sonoite_get_default_particle_counts());
    ?>
    <fieldset>
        <label>
            <?php _e('Mobile:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[flow_realm][mobile]" 
                   value="<?php echo esc_attr($options['flow_realm']['mobile']); ?>" 
                   min="50" max="5000" step="50" />
        </label>
        <br><br>
        <label>
            <?php _e('Desktop:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[flow_realm][desktop]" 
                   value="<?php echo esc_attr($options['flow_realm']['desktop']); ?>" 
                   min="100" max="20000" step="100" />
        </label>
        <p class="description"><?php _e('Organic particle flow system for Flow Realm', SONOITE_TEXT_DOMAIN); ?></p>
    </fieldset>
    <?php
}

/**
 * Flow Consciousness field callback
 */
function sonoite_flow_consciousness_field_callback() {
    $options = get_option('sonoite_particle_counts', sonoite_get_default_particle_counts());
    ?>
    <fieldset>
        <label>
            <?php _e('Low Quality:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[flow_consciousness][low]" 
                   value="<?php echo esc_attr($options['flow_consciousness']['low']); ?>" 
                   min="50" max="2000" step="50" />
        </label>
        <br><br>
        <label>
            <?php _e('Medium Quality:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[flow_consciousness][medium]" 
                   value="<?php echo esc_attr($options['flow_consciousness']['medium']); ?>" 
                   min="100" max="5000" step="100" />
        </label>
        <br><br>
        <label>
            <?php _e('High Quality:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[flow_consciousness][high]" 
                   value="<?php echo esc_attr($options['flow_consciousness']['high']); ?>" 
                   min="200" max="10000" step="100" />
        </label>
        <p class="description"><?php _e('Dream-like particle systems for Flow Consciousness', SONOITE_TEXT_DOMAIN); ?></p>
    </fieldset>
    <?php
}

/**
 * Structure Consciousness field callback
 */
function sonoite_structure_consciousness_field_callback() {
    $options = get_option('sonoite_particle_counts', sonoite_get_default_particle_counts());
    ?>
    <fieldset>
        <label>
            <?php _e('Low Quality:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[structure_consciousness][low]" 
                   value="<?php echo esc_attr($options['structure_consciousness']['low']); ?>" 
                   min="20" max="500" step="10" />
        </label>
        <br><br>
        <label>
            <?php _e('Medium Quality:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[structure_consciousness][medium]" 
                   value="<?php echo esc_attr($options['structure_consciousness']['medium']); ?>" 
                   min="50" max="2000" step="50" />
        </label>
        <br><br>
        <label>
            <?php _e('High Quality:', SONOITE_TEXT_DOMAIN); ?>
            <input type="number" name="sonoite_particle_counts[structure_consciousness][high]" 
                   value="<?php echo esc_attr($options['structure_consciousness']['high']); ?>" 
                   min="100" max="5000" step="100" />
        </label>
        <p class="description"><?php _e('Geometric pattern particles for Structure Consciousness', SONOITE_TEXT_DOMAIN); ?></p>
    </fieldset>
    <?php
}

/**
 * Add particle settings page to admin menu
 */
function sonoite_add_particle_settings_menu() {
    add_submenu_page(
        'sonoite-settings',
        __('Particle Settings', SONOITE_TEXT_DOMAIN),
        __('Particle Settings', SONOITE_TEXT_DOMAIN),
        'manage_options',
        'sonoite-particle-settings',
        'sonoite_particle_settings_page'
    );
}
add_action('admin_menu', 'sonoite_add_particle_settings_menu');

/**
 * Particle settings page
 */
function sonoite_particle_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    
    // Check if settings were saved
    if (isset($_GET['settings-updated'])) {
        add_settings_error('sonoite_messages', 'sonoite_message', __('Settings Saved', SONOITE_TEXT_DOMAIN), 'updated');
    }
    
    settings_errors('sonoite_messages');
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        
        <form action="options.php" method="post">
            <?php
            settings_fields('sonoite_particle_settings');
            do_settings_sections('sonoite-particle-settings');
            submit_button(__('Save Settings', SONOITE_TEXT_DOMAIN));
            ?>
        </form>
        
        <div class="sonoite-admin-card" style="margin-top: 30px;">
            <h3><?php _e('Performance Guidelines', SONOITE_TEXT_DOMAIN); ?></h3>
            <ul>
                <li><?php _e('Low-end devices: Use 50-200 particles per system', SONOITE_TEXT_DOMAIN); ?></li>
                <li><?php _e('Mid-range devices: Use 200-1000 particles per system', SONOITE_TEXT_DOMAIN); ?></li>
                <li><?php _e('High-end devices: Use 1000-5000 particles per system', SONOITE_TEXT_DOMAIN); ?></li>
            </ul>
            <p class="description"><?php _e('GPU instancing allows for efficient rendering, but total particle count still affects performance.', SONOITE_TEXT_DOMAIN); ?></p>
        </div>
    </div>
    <?php
}

/**
 * AJAX handler for the dashboard widget's "Clear Cache" button (POST + nonce,
 * manage_options only).
 */
function sonoite_ajax_clear_cache() {
    // Verify nonce
    check_ajax_referer('sonoite-clear-cache-nonce', 'nonce');

    // Check user capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(array(
            'message' => __('You do not have permission to clear cache.', SONOITE_TEXT_DOMAIN)
        ), 403);
    }

    // Clear all caches
    delete_transient('sonoite_asset_manifest');
    delete_transient('sonoite_tracks_cache_v3');

    // Clear opcache if available
    $opcache_cleared = false;
    if (function_exists('opcache_reset')) {
        $opcache_cleared = opcache_reset();
    }

    // Log the cache clear action
    error_log(sprintf(
        'Sonoite cache cleared by user %d (%s)',
        get_current_user_id(),
        wp_get_current_user()->user_login
    ));

    wp_send_json_success(array(
        'message' => __('Cache cleared successfully.', SONOITE_TEXT_DOMAIN),
        'opcache_cleared' => $opcache_cleared,
        'timestamp' => current_time('mysql')
    ));
}
add_action('wp_ajax_sonoite_clear_cache', 'sonoite_ajax_clear_cache');
