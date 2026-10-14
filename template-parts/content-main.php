<?php
/**
 * Template part for displaying the main content
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

// Safety check for required functions
if (!function_exists('get_template_part')) {
    return;
}
?>

<div id="sonoite-experience" class="experience-container">
    <!-- Main Content -->
    <main id="main-content" class="main-content" role="main">
        
        <!-- Three.js Canvas -->
        <canvas id="three-canvas" aria-label="<?php esc_attr_e('Interactive consciousness visualization responding to music', 'sonoite-theme'); ?>" 
                aria-describedby="visualization-description"></canvas>
        <div id="visualization-description" class="sr-only">
            <?php esc_html_e('A three-dimensional consciousness visualization that changes colors, shapes, and movements based on the currently playing track. The visualization includes particle systems, geometric forms, and audio-reactive effects that represent different aspects of the music.', 'sonoite-theme'); ?>
        </div>

        <!-- UI Overlay -->
        <div class="ui-overlay">
            <?php get_template_part('template-parts/content', 'track-list'); ?>

            <?php get_template_part('template-parts/content', 'audio-controls'); ?>

            <!-- Current Track Info -->
            <section id="track-info" class="current-track-info track-info" role="region" 
                     aria-label="<?php esc_attr_e('Current track information', 'sonoite-theme'); ?>" 
                     aria-live="polite">
                <h2 class="current-track-title"><?php esc_html_e('Select a track to begin', 'sonoite-theme'); ?></h2>
                <p class="current-track-description"><?php esc_html_e('Choose from the track list to start your journey through the soundscape.', 'sonoite-theme'); ?></p>
            </section>

            <!-- Instructions -->
            <div class="instructions" role="contentinfo">
                <p><?php esc_html_e('Click tracks to switch • Use mouse to navigate • Space to play/pause • Arrow keys for next/previous', 'sonoite-theme'); ?></p>
                <p class="keyboard-shortcuts screen-reader-text">
                    <?php esc_html_e('Keyboard shortcuts: Space - Play/Pause, Left Arrow - Previous track, Right Arrow - Next track', 'sonoite-theme'); ?>
                </p>
            </div>
        </div>
    </main>
</div>