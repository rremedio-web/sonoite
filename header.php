<?php
/**
 * Document head, opening <body> and skip links for index.php (via
 * get_header()). page-prototype.php and page-preview.php print their own <head>.
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<?php echo esc_attr(get_bloginfo('description')); ?>">
    
    <?php if (defined('WP_DEBUG') && WP_DEBUG): ?>
    <!-- Development: Disable caching -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <?php endif; ?>

    <?php wp_head(); ?>
</head>
<body <?php body_class('sonoite-theme'); ?>>
<?php wp_body_open(); ?>

<!-- Accessibility Skip Links -->
<div class="skip-links">
    <a href="#main-content" class="skip-link"><?php esc_html_e('Skip to main content', 'sonoite-theme'); ?></a>
    <a href="#track-list" class="skip-link"><?php esc_html_e('Skip to track list', 'sonoite-theme'); ?></a>
    <a href="#audio-controls" class="skip-link"><?php esc_html_e('Skip to audio controls', 'sonoite-theme'); ?></a>
</div>

<!-- Screen Reader Instructions -->
<div class="sr-only" aria-live="polite" id="screen-reader-announcements"></div>
<div class="sr-only">
    <h2><?php esc_html_e('Keyboard Shortcuts', 'sonoite-theme'); ?></h2>
    <ul class="keyboard-shortcuts">
        <li><?php esc_html_e('Space: Play/Pause', 'sonoite-theme'); ?></li>
        <li><?php esc_html_e('Arrow Keys: Navigate tracks', 'sonoite-theme'); ?></li>
        <li><?php esc_html_e('Enter: Select track', 'sonoite-theme'); ?></li>
        <li><?php esc_html_e('M: Mute/Unmute', 'sonoite-theme'); ?></li>
    </ul>
</div>
