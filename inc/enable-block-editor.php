<?php
/**
 * Enable Block Editor for Track Post Type
 * Simple fix without diagnostics
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

// Ensure post type supports editor
add_action('init', function() {
    if (post_type_exists('track')) {
        add_post_type_support('track', 'editor');
    }
}, 999);

// Make sure required scripts are loaded
add_action('admin_enqueue_scripts', function() {
    global $pagenow, $typenow;
    
    if (in_array($pagenow, array('post.php', 'post-new.php')) && $typenow === 'track') {
        // Core dependencies for block editor
        wp_enqueue_script('wp-blocks');
        wp_enqueue_script('wp-element');
        wp_enqueue_script('wp-i18n');
        wp_enqueue_script('wp-data');
        wp_enqueue_script('wp-compose');
        wp_enqueue_script('wp-components');
        wp_enqueue_script('wp-editor');
        wp_enqueue_script('wp-edit-post');
        wp_enqueue_script('wp-format-library');
        wp_enqueue_script('wp-block-library');
        
        // Styles
        wp_enqueue_style('wp-block-library');
        wp_enqueue_style('wp-edit-post');
        wp_enqueue_style('wp-editor');
        wp_enqueue_style('wp-components');
        wp_enqueue_style('wp-format-library');
    }
}, 999);