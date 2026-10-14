<?php
/**
 * Simple content template
 * Basic layout without 3D visualization
 */
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}
?>
<div class="sonoite-container">
    <header class="site-header">
        <h1><?php echo esc_html(get_bloginfo('name')); ?></h1>
        <p><?php echo esc_html(get_bloginfo('description')); ?></p>
    </header>

    <main class="site-main">
        <div class="tracks-section">
            <h2><?php _e('Track List', 'sonoite-theme'); ?></h2>
            
            <?php
            $tracks = get_posts(array(
                'post_type' => 'track',
                'posts_per_page' => -1,
                'orderby' => 'meta_value_num',
                'meta_key' => 'track_order',
                'order' => 'ASC'
            ));
            
            if ($tracks) : ?>
                <div class="track-list">
                    <?php foreach ($tracks as $track) : 
                        $audio_id = get_post_meta($track->ID, 'audio_file', true);
                        $audio_url = $audio_id ? wp_get_attachment_url($audio_id) : '';
                        $track_order = get_post_meta($track->ID, 'track_order', true);
                    ?>
                        <div class="track-item" data-track-id="<?php echo esc_attr($track->ID); ?>">
                            <span class="track-number"><?php echo esc_html($track_order ?: '—'); ?></span>
                            <h3 class="track-title"><?php echo esc_html(get_the_title($track)); ?></h3>
                            
                            <?php if ($audio_url) : ?>
                                <audio controls>
                                    <source src="<?php echo esc_url($audio_url); ?>" type="audio/mpeg">
                                    <?php _e('Your browser does not support the audio element.', 'sonoite-theme'); ?>
                                </audio>
                            <?php else : ?>
                                <p class="no-audio"><?php _e('No audio file available', 'sonoite-theme'); ?></p>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else : ?>
                <p><?php _e('No tracks available. Please add tracks in the WordPress admin.', 'sonoite-theme'); ?></p>
            <?php endif; ?>
        </div>
    </main>
</div>
