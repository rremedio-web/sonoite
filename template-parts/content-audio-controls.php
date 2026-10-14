<?php
/**
 * Template part for displaying the audio controls
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}
?>

<!-- Audio Controls -->
<div class="audio-controls" role="region" aria-label="<?php esc_attr_e('Audio controls', 'sonoite-theme'); ?>" id="audio-controls">
    <!-- Previous Track -->
    <button id="prev-track" class="control-button prev-btn" 
            aria-label="<?php esc_attr_e('Previous track', 'sonoite-theme'); ?>"
            type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="btn-icon">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
    </button>

    <!-- Play/Pause -->
    <button id="play-pause" class="control-button play-pause-btn" 
            aria-label="<?php esc_attr_e('Play', 'sonoite-theme'); ?>"
            aria-describedby="track-info"
            type="button">
        <svg class="play-icon btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z"/>
        </svg>
        <svg class="pause-icon btn-icon" viewBox="0 0 24 24" style="display:none;" aria-hidden="true">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
    </button>

    <!-- Next Track -->
    <button id="next-track" class="control-button next-btn" 
            aria-label="<?php esc_attr_e('Next track', 'sonoite-theme'); ?>"
            type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="btn-icon">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
    </button>

    <!-- Progress Bar -->
    <div class="progress-bar progress-container" role="group" aria-label="<?php esc_attr_e('Track progress', 'sonoite-theme'); ?>">
        <div class="progress-fill" aria-hidden="true"></div>
        <input type="range" class="progress-slider" min="0" max="100" value="0"
               aria-label="<?php esc_attr_e('Seek through track', 'sonoite-theme'); ?>"
               aria-valuetext="0 seconds">
    </div>

    <!-- Volume Control -->
    <div class="volume-control" role="group" aria-label="<?php esc_attr_e('Volume control', 'sonoite-theme'); ?>">
        <button class="volume-button mute-btn" 
                aria-label="<?php esc_attr_e('Mute/Unmute', 'sonoite-theme'); ?>"
                type="button">
            <svg class="volume-on-icon volume-icon btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 9v6h4l5 5V4L7 9H3z"/>
            </svg>
            <svg class="volume-off-icon mute-icon btn-icon" viewBox="0 0 24 24" style="display:none;" aria-hidden="true">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
        </button>
        <input type="range" class="volume-slider" min="0" max="100" value="70"
               aria-label="<?php esc_attr_e('Volume level', 'sonoite-theme'); ?>"
               aria-valuetext="70%">
    </div>

    <!-- Track Time Display -->
    <div class="time-display" aria-live="polite" aria-label="<?php esc_attr_e('Playback time', 'sonoite-theme'); ?>">
        <span class="current-time">0:00</span>
        <span class="time-separator">/</span>
        <span class="total-time">0:00</span>
    </div>
</div>