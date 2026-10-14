<?php
/**
 * Legacy runtime track list: one .track-button per published track (from the
 * cached sonoite_get_tracks()), which the old runtime's selectTrack() handles.
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}
?>

<!-- Track Navigation -->
<nav class="track-nav" role="navigation" aria-label="<?php esc_attr_e('Album tracks', 'sonoite-theme'); ?>" id="track-navigation">
    <h2 class="screen-reader-text"><?php esc_html_e('Track List', 'sonoite-theme'); ?></h2>
    <ol class="track-list" id="track-list" role="list">
        <?php
        $tracks = sonoite_get_tracks();
        if (!empty($tracks)):
            foreach ($tracks as $index => $track): ?>
                <li class="track-item" data-track-id="<?php echo esc_attr($track['id']); ?>" role="listitem">
                    <button class="track-button"
                            data-track-index="<?php echo $index; ?>"
                            aria-label="<?php echo esc_attr(sprintf(__('Play track %d: %s', 'sonoite-theme'), $index + 1, $track['title'])); ?>"
                            aria-describedby="track-<?php echo esc_attr($track['id']); ?>-info"
                            type="button">
                        <span class="track-number"><?php echo str_pad($index + 1, 2, '0', STR_PAD_LEFT); ?></span>
                        <span class="track-title"><?php echo esc_html($track['title']); ?></span>
                        <?php if (!empty($track['duration'])): ?>
                            <span class="track-duration"><?php echo esc_html($track['duration']); ?></span>
                        <?php endif; ?>
                        <span id="track-<?php echo esc_attr($track['id']); ?>-info" class="screen-reader-text">
                            <?php echo esc_html($track['excerpt'] ?: $track['content']); ?>
                        </span>
                    </button>
                </li>
            <?php endforeach;
        else: ?>
            <li class="track-item no-tracks" role="listitem">
                <p><?php esc_html_e('No tracks available', 'sonoite-theme'); ?></p>
            </li>
        <?php endif; ?>
    </ol>
</nav>