<?php
/**
 * Forces the block editor for the track CPT, overriding Classic Editor-style
 * plugins that disable it. First entry in functions.php's $required_files.
 *
 * @package SonoiteTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

// Force block editor for track post type
add_filter('use_block_editor_for_post_type', function($use_block_editor, $post_type) {
    if ($post_type === 'track') {
        return true;
    }
    return $use_block_editor;
}, 999, 2);
