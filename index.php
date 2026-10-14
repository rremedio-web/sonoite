<?php
/**
 * Main template file for Sonoite Theme
 * 
 * @package SonoiteTheme
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

// Safety check for WordPress functions
if (!function_exists('wp_head')) {
    wp_die('WordPress not properly loaded');
}

get_header(); ?>

<?php 
// Load the main 3D experience template
get_template_part('template-parts/content', 'main'); 
?>

<?php get_footer(); ?>