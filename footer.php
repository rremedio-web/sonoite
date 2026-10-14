<?php
/**
 * Closing markup for get_footer() templates: the #loading-screen and
 * #error-screen overlays the legacy runtime toggles, a hidden <audio>, a canvas
 * container and ARIA live regions, then wp_footer().
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}
?>

<!-- Audio Elements (hidden) -->
<audio id="background-drone" preload="none" style="display: none;">
    <source src="" type="audio/mpeg">
    <?php esc_html_e('Your browser does not support the audio element.', 'sonoite-theme'); ?>
</audio>

<!-- Loading Screen -->
<div id="loading-screen" class="loading-screen" aria-hidden="true">
    <div class="loading-content">
        <h1><?php bloginfo('name'); ?></h1>
        <div class="loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="loading-progress"></div>
        </div>
        <p class="loading-status" aria-live="polite"><?php esc_html_e('Initializing audio experience...', 'sonoite-theme'); ?></p>
    </div>
</div>

<!-- Error Screen -->
<div id="error-screen" class="error-screen" aria-hidden="true" role="alert">
    <div class="error-content">
        <h2><?php esc_html_e('Audio Experience Unavailable', 'sonoite-theme'); ?></h2>
        <p><?php esc_html_e('We encountered an issue loading the audio experience. Please try refreshing the page.', 'sonoite-theme'); ?></p>
        <button type="button" class="retry-button" id="sonoite-retry-button">
            <?php esc_html_e('Retry', 'sonoite-theme'); ?>
        </button>
    </div>
</div>

<!-- Three.js Canvas Container -->
<div id="three-canvas-container" aria-hidden="true"></div>

<!-- Screen Reader Announcements -->
<div id="sr-announcements" aria-live="assertive" aria-atomic="true" class="screen-reader-text">
    <!-- Dynamic announcements for track loading, playback status, etc. -->
</div>

<!-- Error Messages -->
<div id="error-messages" role="alert" aria-live="assertive" class="screen-reader-text">
    <!-- Error messages will be inserted here dynamically -->
</div>

<?php wp_footer(); ?>
</body>
</html>
