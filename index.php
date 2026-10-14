<?php
/**
 * Fallback template for every request not routed elsewhere (the front page
 * and ?prototype=1 go to page-prototype.php; track URLs redirect). Renders
 * the legacy runtime shell from template-parts/content-main.php. Theme JS is
 * enqueued only on experience pages, so on other routes this is static markup.
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

get_header(); ?>

<?php 
// Load the main 3D experience template
get_template_part('template-parts/content', 'main'); 
?>

<?php get_footer(); ?>