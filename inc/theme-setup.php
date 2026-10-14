<?php
/**
 * Sonoite Theme Setup and Configuration
 * Handles theme supports, post types, and basic WordPress integration
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

/**
 * Enhanced theme setup with proper internationalization
 */
function sonoite_enhanced_theme_setup() {
    // Load text domain first
    load_theme_textdomain(
        SONOITE_TEXT_DOMAIN,
        get_template_directory() . '/languages'
    );

    // Enhanced theme support with proper labeling
    add_theme_support('html5', array(
        'comment-list',
        'comment-form',
        'search-form',
        'gallery',
        'caption',
        'style',
        'script'
    ));

    add_theme_support('post-thumbnails');
    add_theme_support('title-tag');
    add_theme_support('customize-selective-refresh-widgets');
    add_theme_support('automatic-feed-links');
    add_theme_support('responsive-embeds');
    
    // Add block editor support
    add_theme_support('editor-styles');
    add_theme_support('wp-block-styles');
    add_theme_support('align-wide');

    // Navigation menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', SONOITE_TEXT_DOMAIN),
        'footer' => __('Footer Menu', SONOITE_TEXT_DOMAIN),
    ));

    // Custom image sizes
    add_image_size('sonoite-track-art', 800, 800, true);
    add_image_size('sonoite-track-art-large', 1200, 1200, true);
    add_image_size('sonoite-thumbnail', 300, 300, true);
    add_image_size('sonoite-thumbnail-small', 150, 150, true);

    // Security: Remove unnecessary WordPress features
    remove_action('wp_head', 'wp_generator');
    remove_action('wp_head', 'wlwmanifest_link');
    remove_action('wp_head', 'rsd_link');
    remove_action('wp_head', 'wp_shortlink_wp_head');
    remove_action('wp_head', 'adjacent_posts_rel_link_wp_head');

    // Security: Disable XML-RPC
    add_filter('xmlrpc_enabled', '__return_false');

    // Clean up wp_head
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('admin_print_styles', 'print_emoji_styles');
}
add_action('after_setup_theme', 'sonoite_enhanced_theme_setup', 5);

/**
 * Register Custom Post Type for Tracks with enhanced options
 */
function sonoite_register_track_post_type() {
    $labels = array(
        'name'                  => _x('Tracks', 'Post Type General Name', SONOITE_TEXT_DOMAIN),
        'singular_name'         => _x('Track', 'Post Type Singular Name', SONOITE_TEXT_DOMAIN),
        'menu_name'             => __('Album Tracks', SONOITE_TEXT_DOMAIN),
        'all_items'             => __('All Tracks', SONOITE_TEXT_DOMAIN),
        'add_new_item'          => __('Add New Track', SONOITE_TEXT_DOMAIN),
        'add_new'               => __('Add New Track', SONOITE_TEXT_DOMAIN),
        'edit_item'             => __('Edit Track', SONOITE_TEXT_DOMAIN),
        'update_item'           => __('Update Track', SONOITE_TEXT_DOMAIN),
        'view_item'             => __('View Track', SONOITE_TEXT_DOMAIN),
        'search_items'          => __('Search Tracks', SONOITE_TEXT_DOMAIN),
        'not_found'             => __('No tracks found', SONOITE_TEXT_DOMAIN),
        'not_found_in_trash'    => __('No tracks found in Trash', SONOITE_TEXT_DOMAIN),
        'featured_image'        => __('Track Artwork', SONOITE_TEXT_DOMAIN),
        'set_featured_image'    => __('Set Track Artwork', SONOITE_TEXT_DOMAIN),
        'remove_featured_image' => __('Remove Track Artwork', SONOITE_TEXT_DOMAIN),
        'use_featured_image'    => __('Use as Track Artwork', SONOITE_TEXT_DOMAIN),
        'insert_into_item'      => __('Insert into track', SONOITE_TEXT_DOMAIN),
        'uploaded_to_this_item' => __('Uploaded to this track', SONOITE_TEXT_DOMAIN),
        'items_list'            => __('Tracks list', SONOITE_TEXT_DOMAIN),
        'items_list_navigation' => __('Tracks list navigation', SONOITE_TEXT_DOMAIN),
        'filter_items_list'     => __('Filter tracks list', SONOITE_TEXT_DOMAIN),
    );

    $args = array(
        'label'                 => __('Track', SONOITE_TEXT_DOMAIN),
        'description'           => __('Individual tracks from the album', SONOITE_TEXT_DOMAIN),
        'labels'                => $labels,
        'supports'              => array('title', 'editor', 'excerpt', 'thumbnail', 'custom-fields', 'page-attributes', 'revisions'),
        'hierarchical'          => false,
        'public'                => true,
        'show_ui'               => true,
        'show_in_menu'          => true,
        'menu_position'         => 5,
        'menu_icon'             => 'dashicons-format-audio',
        'has_archive'           => 'tracks',
        'publicly_queryable'    => true,
        'capability_type'       => 'post',
        'show_in_rest'          => true,
        'rest_base'             => 'tracks',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        // Keep pretty permalinks at /track/{slug}/ but do NOT register `track` as the
        // public query_var — that collides with front-page deep links like /?track=slug.
        'query_var'             => 'sonoite_track',
        'rewrite'               => array(
            'slug' => 'track',
            'with_front' => false,
        ),
        'can_export'            => true,
        'delete_with_user'      => false,
        'template'              => array(
            array('core/paragraph', array(
                'placeholder' => __('Describe this track...', SONOITE_TEXT_DOMAIN)
            )),
        ),
    );

    register_post_type('track', $args);
}
add_action('init', 'sonoite_register_track_post_type');

/**
 * Add custom meta boxes for track data
 */
function sonoite_add_track_meta_boxes() {
    // Audio file meta box
    add_meta_box(
        'track_audio',
        __('Audio File', SONOITE_TEXT_DOMAIN),
        'sonoite_track_audio_callback',
        'track',
        'normal',
        'high'
    );

    // Track details meta box
    add_meta_box(
        'track_details',
        __('Track Details', SONOITE_TEXT_DOMAIN),
        'sonoite_track_details_callback',
        'track',
        'side',
        'default'
    );

    // Consciousness visualization meta box
    add_meta_box(
        'consciousness_visualization',
        __('Visualization Settings', SONOITE_TEXT_DOMAIN),
        'sonoite_consciousness_meta_callback',
        'track',
        'normal',
        'default'
    );
}
add_action('add_meta_boxes', 'sonoite_add_track_meta_boxes');

/**
 * Audio file meta box callback with enhanced security
 */
function sonoite_track_audio_callback($post) {
    wp_nonce_field('sonoite_track_audio_meta', 'sonoite_track_audio_nonce');

    $audio_id = get_post_meta($post->ID, 'audio_file', true);
    $duration = get_post_meta($post->ID, 'duration', true);
    $file_size = get_post_meta($post->ID, 'file_size', true);
    ?>
    <table class="form-table">
        <tr>
            <th scope="row">
                <label for="track_audio_id"><?php _e('Audio File', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <input type="hidden" id="track_audio_id" name="track_audio_id" value="<?php echo esc_attr($audio_id); ?>">
                <button type="button" class="button" id="upload_audio_button">
                    <?php echo $audio_id ? esc_html__('Change Audio File', SONOITE_TEXT_DOMAIN) : esc_html__('Upload Audio File', SONOITE_TEXT_DOMAIN); ?>
                </button>

                <?php if ($audio_id): ?>
                    <div class="audio-file-info">
                        <p><strong><?php echo esc_html__('Current file:', SONOITE_TEXT_DOMAIN); ?></strong>
                           <?php echo esc_html(basename(get_attached_file($audio_id))); ?></p>

                        <?php if ($duration): ?>
                            <p><strong><?php echo esc_html__('Duration:', SONOITE_TEXT_DOMAIN); ?></strong>
                               <?php echo esc_html($duration); ?></p>
                        <?php endif; ?>

                        <?php if ($file_size): ?>
                            <p><strong><?php echo esc_html__('File Size:', SONOITE_TEXT_DOMAIN); ?></strong>
                               <?php echo esc_html(size_format($file_size)); ?></p>
                        <?php endif; ?>

                        <audio controls preload="metadata" style="width: 100%; margin-top: 10px;">
                            <source src="<?php echo esc_url(wp_get_attachment_url($audio_id)); ?>"
                                    type="<?php echo esc_attr(get_post_mime_type($audio_id)); ?>">
                            <?php esc_html_e('Your browser does not support the audio element.', SONOITE_TEXT_DOMAIN); ?>
                        </audio>
                    </div>
                <?php endif; ?>
            </td>
        </tr>
    </table>

    <script>
    jQuery(document).ready(function($) {
        $('#upload_audio_button').click(function(e) {
            e.preventDefault();

            var mediaUploader = wp.media({
                title: <?php echo wp_json_encode(__('Select Audio File', SONOITE_TEXT_DOMAIN)); ?>,
                button: {
                    text: <?php echo wp_json_encode(__('Use this audio', SONOITE_TEXT_DOMAIN)); ?>
                },
                multiple: false,
                library: { type: 'audio' }
            }).on('select', function() {
                var attachment = mediaUploader.state().get('selection').first().toJSON();
                $('#track_audio_id').val(attachment.id);

                // Auto-populate duration if available
                if (attachment.fileLength) {
                    $('input[name="duration"]').val(attachment.fileLength);
                }

                location.reload(); // Refresh to show audio player
            }).open();
        });
    });
    </script>
    <?php
}

/**
 * Track details meta box callback
 */
function sonoite_track_details_callback($post) {
    wp_nonce_field('sonoite_track_details_meta', 'sonoite_track_details_nonce');

    $duration = get_post_meta($post->ID, 'duration', true);
    $track_order = get_post_meta($post->ID, 'track_order', true);
    $bpm = get_post_meta($post->ID, 'bpm', true);
    $key_signature = get_post_meta($post->ID, 'key_signature', true);
    ?>
    <table class="form-table">
        <tr>
            <th scope="row">
                <label for="duration"><?php _e('Duration', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <input type="text" id="duration" name="duration" value="<?php echo esc_attr($duration); ?>"
                       placeholder="00:00" class="regular-text">
                <p class="description"><?php _e('Format: MM:SS or HH:MM:SS', SONOITE_TEXT_DOMAIN); ?></p>
            </td>
        </tr>
        <tr>
            <th scope="row">
                <label for="track_order"><?php _e('Track Order', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <input type="number" id="track_order" name="track_order" value="<?php echo esc_attr($track_order); ?>"
                       min="1" max="100" class="small-text">
                <p class="description"><?php _e('Order in the album (1-100)', SONOITE_TEXT_DOMAIN); ?></p>
            </td>
        </tr>
        <tr>
            <th scope="row">
                <label for="bpm"><?php _e('BPM', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <input type="number" id="bpm" name="bpm" value="<?php echo esc_attr($bpm); ?>"
                       min="60" max="200" class="small-text">
                <p class="description"><?php _e('Beats per minute (optional)', SONOITE_TEXT_DOMAIN); ?></p>
            </td>
        </tr>
        <tr>
            <th scope="row">
                <label for="key_signature"><?php _e('Key Signature', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <select id="key_signature" name="key_signature">
                    <option value=""><?php _e('Select key...', SONOITE_TEXT_DOMAIN); ?></option>
                    <?php
                    $keys = array(
                        'C' => 'C Major', 'Cm' => 'C Minor',
                        'Db' => 'D♭ Major', 'C#m' => 'C# Minor',
                        'D' => 'D Major', 'Dm' => 'D Minor',
                        'Eb' => 'E♭ Major', 'D#m' => 'D# Minor',
                        'E' => 'E Major', 'Em' => 'E Minor',
                        'F' => 'F Major', 'Fm' => 'F Minor',
                        'F#' => 'F# Major', 'F#m' => 'F# Minor',
                        'G' => 'G Major', 'Gm' => 'G Minor',
                        'Ab' => 'A♭ Major', 'G#m' => 'G# Minor',
                        'A' => 'A Major', 'Am' => 'A Minor',
                        'Bb' => 'B♭ Major', 'A#m' => 'A# Minor',
                        'B' => 'B Major', 'Bm' => 'B Minor'
                    );
                    foreach ($keys as $value => $label): ?>
                        <option value="<?php echo esc_attr($value); ?>" <?php selected($key_signature, $value); ?>><?php echo esc_html($label); ?></option>
                    <?php endforeach; ?>
                </select>
            </td>
        </tr>
    </table>
    <?php
}

/**
 * Consciousness visualization meta box callback
 */
function sonoite_consciousness_meta_callback($post) {
    wp_nonce_field('sonoite_consciousness_meta', 'sonoite_consciousness_nonce');

    $visualization_type = get_post_meta($post->ID, 'consciousness_type', true) ?: 'abstract';
    $color_palette = get_post_meta($post->ID, 'color_palette', true) ?: '#8B5CF6';
    $intensity_level = get_post_meta($post->ID, 'intensity_level', true) ?: '1.0';
    $custom_shader = get_post_meta($post->ID, 'custom_shader', true);
    ?>
    <table class="form-table">
        <tr>
            <th scope="row">
                <label for="consciousness_type"><?php _e('Visualization Type', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <select id="consciousness_type" name="consciousness_type">
                    <option value="abstract" <?php selected($visualization_type, 'abstract'); ?>><?php _e('Abstract Flow', SONOITE_TEXT_DOMAIN); ?></option>
                    <option value="structural" <?php selected($visualization_type, 'structural'); ?>><?php _e('Structural Duality', SONOITE_TEXT_DOMAIN); ?></option>
                    <option value="manifold" <?php selected($visualization_type, 'manifold'); ?>><?php _e('Frequency Manifold', SONOITE_TEXT_DOMAIN); ?></option>
                    <option value="realm" <?php selected($visualization_type, 'realm'); ?>><?php _e('Realm Transition', SONOITE_TEXT_DOMAIN); ?></option>
                    <option value="particle" <?php selected($visualization_type, 'particle'); ?>><?php _e('Particle System', SONOITE_TEXT_DOMAIN); ?></option>
                    <option value="geometric" <?php selected($visualization_type, 'geometric'); ?>><?php _e('Geometric Forms', SONOITE_TEXT_DOMAIN); ?></option>
                </select>
                <p class="description"><?php _e('Choose the visual style for this track', SONOITE_TEXT_DOMAIN); ?></p>
            </td>
        </tr>
        <tr>
            <th scope="row">
                <label for="color_palette"><?php _e('Primary Color', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <input type="color" id="color_palette" name="color_palette" value="<?php echo esc_attr($color_palette); ?>" />
                <p class="description"><?php _e('Primary color for consciousness visualization', SONOITE_TEXT_DOMAIN); ?></p>
            </td>
        </tr>
        <tr>
            <th scope="row">
                <label for="intensity_level"><?php _e('Intensity Level', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <input type="range" id="intensity_level" name="intensity_level"
                       min="0.1" max="3.0" step="0.1" value="<?php echo esc_attr($intensity_level); ?>" />
                <span id="intensity_value"><?php echo esc_html($intensity_level); ?></span>
                <p class="description"><?php _e('Visual intensity and animation speed', SONOITE_TEXT_DOMAIN); ?></p>
                <script>
                document.getElementById('intensity_level').addEventListener('input', function() {
                    document.getElementById('intensity_value').textContent = this.value;
                });
                </script>
            </td>
        </tr>
        <tr>
            <th scope="row">
                <label for="custom_shader"><?php _e('Custom Shader', SONOITE_TEXT_DOMAIN); ?></label>
            </th>
            <td>
                <textarea id="custom_shader" name="custom_shader" rows="5" cols="50"
                          class="large-text code"><?php echo esc_textarea($custom_shader); ?></textarea>
                <p class="description"><?php _e('Optional: Custom GLSL fragment shader code (advanced)', SONOITE_TEXT_DOMAIN); ?></p>
            </td>
        </tr>
    </table>
    <?php
}

/**
 * Save track meta data with enhanced validation and cache clearing
 */
function sonoite_save_track_meta($post_id) {
    // Verify nonces
    $nonces = array(
        'audio' => array('sonoite_track_audio_nonce', 'sonoite_track_audio_meta'),
        'details' => array('sonoite_track_details_nonce', 'sonoite_track_details_meta'),
        'consciousness' => array('sonoite_consciousness_nonce', 'sonoite_consciousness_meta')
    );

    $valid_nonce = false;
    foreach ($nonces as $type => $nonce_data) {
        if (isset($_POST[$nonce_data[0]]) && wp_verify_nonce($_POST[$nonce_data[0]], $nonce_data[1])) {
            $valid_nonce = true;
            break;
        }
    }

    if (!$valid_nonce) {
        return;
    }

    // Security checks
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    // Audio file handling
    if (isset($_POST['track_audio_id'])) {
        $audio_id = intval($_POST['track_audio_id']);

        if ($audio_id > 0) {
            $attachment = get_post($audio_id);
            if (
                $attachment &&
                strpos($attachment->post_mime_type, 'audio/') === 0 &&
                current_user_can('upload_files') &&
                current_user_can('edit_post', $audio_id)
            ) {
                update_post_meta($post_id, 'audio_file', $audio_id);

                // Store file metadata
                $file_path = get_attached_file($audio_id);
                if ($file_path && file_exists($file_path)) {
                    update_post_meta($post_id, 'file_size', filesize($file_path));
                }
            }
        } else {
            delete_post_meta($post_id, 'audio_file');
            delete_post_meta($post_id, 'file_size');
        }
    }

    // Track details
    $details_fields = array(
        'duration' => 'sanitize_text_field',
        'track_order' => 'intval',
        'bpm' => 'intval',
        'key_signature' => 'sanitize_text_field'
    );

    foreach ($details_fields as $field => $sanitizer) {
        if (isset($_POST[$field])) {
            $value = call_user_func($sanitizer, $_POST[$field]);
            if (!empty($value)) {
                update_post_meta($post_id, $field, $value);
            } else {
                delete_post_meta($post_id, $field);
            }
        }
    }

    // Consciousness settings
    $consciousness_fields = array(
        'consciousness_type' => 'sanitize_text_field',
        'color_palette' => 'sanitize_hex_color',
        'intensity_level' => 'floatval',
        'custom_shader' => 'sanitize_textarea_field'
    );

    foreach ($consciousness_fields as $field => $sanitizer) {
        if (isset($_POST[$field])) {
            $value = call_user_func($sanitizer, $_POST[$field]);
            if (!empty($value) || $field === 'intensity_level') {
                update_post_meta($post_id, $field, $value);
            } else {
                delete_post_meta($post_id, $field);
            }
        }
    }

    // Clear performance caches
    if (function_exists('sonoite_clear_tracks_cache')) {
        sonoite_clear_tracks_cache();
    }
}
add_action('save_post_track', 'sonoite_save_track_meta');

/**
 * Admin enqueue media scripts
 */
function sonoite_admin_enqueue_media() {
    global $pagenow, $typenow;

    if (in_array($pagenow, array('post.php', 'post-new.php')) && $typenow === 'track') {
        wp_enqueue_media();
        wp_enqueue_script('jquery');
        
        // Ensure block editor scripts are loaded
        wp_enqueue_script('wp-blocks');
        wp_enqueue_script('wp-element');
        wp_enqueue_script('wp-editor');
        wp_enqueue_script('wp-components');
        wp_enqueue_script('wp-data');
        wp_enqueue_script('wp-i18n');
        
        // Enqueue block editor styles
        wp_enqueue_style('wp-edit-blocks');
    }
}
add_action('admin_enqueue_scripts', 'sonoite_admin_enqueue_media');

/**
 * Add custom columns to track list table
 */
function sonoite_track_columns($columns) {
    $new_columns = array();
    $new_columns['cb'] = $columns['cb'];
    $new_columns['title'] = $columns['title'];
    $new_columns['track_order'] = __('Order', SONOITE_TEXT_DOMAIN);
    $new_columns['duration'] = __('Duration', SONOITE_TEXT_DOMAIN);
    $new_columns['audio_file'] = __('Audio', SONOITE_TEXT_DOMAIN);
    $new_columns['consciousness_type'] = __('Visualization', SONOITE_TEXT_DOMAIN);
    $new_columns['date'] = $columns['date'];

    return $new_columns;
}
add_filter('manage_track_posts_columns', 'sonoite_track_columns');

/**
 * Populate custom columns
 */
function sonoite_track_column_content($column, $post_id) {
    switch ($column) {
        case 'track_order':
            $order = get_post_meta($post_id, 'track_order', true);
            echo $order ? esc_html($order) : '—';
            break;

        case 'duration':
            $duration = get_post_meta($post_id, 'duration', true);
            echo $duration ? esc_html($duration) : '—';
            break;

        case 'audio_file':
            $audio_id = get_post_meta($post_id, 'audio_file', true);
            if ($audio_id) {
                $filename = basename(get_attached_file($audio_id));
                echo '<span title="' . esc_attr($filename) . '">🎵</span>';
            } else {
                echo '—';
            }
            break;

        case 'consciousness_type':
            $type = get_post_meta($post_id, 'consciousness_type', true);
            $types = array(
                'abstract' => __('Abstract', SONOITE_TEXT_DOMAIN),
                'structural' => __('Structural', SONOITE_TEXT_DOMAIN),
                'manifold' => __('Manifold', SONOITE_TEXT_DOMAIN),
                'realm' => __('Realm', SONOITE_TEXT_DOMAIN),
                'particle' => __('Particle', SONOITE_TEXT_DOMAIN),
                'geometric' => __('Geometric', SONOITE_TEXT_DOMAIN)
            );
            echo isset($types[$type]) ? esc_html($types[$type]) : '—';
            break;
    }
}
add_action('manage_track_posts_custom_column', 'sonoite_track_column_content', 10, 2);

/**
 * Make custom columns sortable
 */
function sonoite_track_sortable_columns($columns) {
    $columns['track_order'] = 'track_order';
    $columns['duration'] = 'duration';
    $columns['consciousness_type'] = 'consciousness_type';

    return $columns;
}
add_filter('manage_edit-track_sortable_columns', 'sonoite_track_sortable_columns');

/**
 * Handle sorting by custom columns
 */
function sonoite_track_orderby($query) {
    if (!is_admin() || !$query->is_main_query()) {
        return;
    }

    $orderby = $query->get('orderby');

    if ('track_order' === $orderby) {
        $query->set('meta_key', 'track_order');
        $query->set('orderby', 'meta_value_num');
    } elseif ('duration' === $orderby) {
        $query->set('meta_key', 'duration');
        $query->set('orderby', 'meta_value');
    } elseif ('consciousness_type' === $orderby) {
        $query->set('meta_key', 'consciousness_type');
        $query->set('orderby', 'meta_value');
    }
}
add_action('pre_get_posts', 'sonoite_track_orderby');

/**
 * Auto-attach audio files when uploaded via media library in track edit screen
 */
function sonoite_auto_attach_audio_to_track($attachment_id) {
    // Check if this is an audio file
    $attachment = get_post($attachment_id);
    if (!$attachment || strpos($attachment->post_mime_type, 'audio/') !== 0) {
        return;
    }

    if (!current_user_can('upload_files') || !current_user_can('edit_post', $attachment_id)) {
        return;
    }
    
    // Only attach when WordPress gives us a trusted upload context for a specific track.
    if (isset($_POST['post_id'])) {
        $post_id = intval($_POST['post_id']);
        $post = get_post($post_id);

        if ($post && $post->post_type === 'track' && current_user_can('edit_post', $post_id)) {
            update_post_meta($post_id, 'audio_file', $attachment_id);
            wp_update_post(array(
                'ID' => $attachment_id,
                'post_parent' => $post_id
            ));
            delete_transient('sonoite_tracks_cache_v3');
        }
    }
}
add_action('add_attachment', 'sonoite_auto_attach_audio_to_track');

/**
 * Auto-populate audio file field in admin when editing a track
 */
function sonoite_check_for_uploaded_audio() {
    global $pagenow, $typenow;
    
    // Only run on track edit screen
    if ($pagenow !== 'post.php' || $typenow !== 'track') {
        return;
    }
    
    $post_id = isset($_GET['post']) ? intval($_GET['post']) : 0;
    if (!$post_id) {
        return;
    }

    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    // Check if track already has audio
    $existing_audio = get_post_meta($post_id, 'audio_file', true);
    if ($existing_audio) {
        return;
    }
    
    // Look for audio files attached to this post
    $audio_attachments = get_posts(array(
        'post_type' => 'attachment',
        'post_mime_type' => 'audio',
        'post_parent' => $post_id,
        'posts_per_page' => 1,
        'orderby' => 'date',
        'order' => 'DESC'
    ));
    
    if (!empty($audio_attachments)) {
        $audio = $audio_attachments[0];
        if (!current_user_can('edit_post', $audio->ID)) {
            return;
        }
        update_post_meta($post_id, 'audio_file', $audio->ID);
        
        // Clear cache
        delete_transient('sonoite_tracks_cache_v3');
    }
}
add_action('admin_init', 'sonoite_check_for_uploaded_audio');
