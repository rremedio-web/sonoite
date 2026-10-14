<?php
/**
 * Template Name: Sonoite Preview Experience
 *
 * Self-contained single-track marketing page: plays the track chosen in
 * Album Tracks > Preview Settings (`sonoite_preview_track` option) through
 * src/js/preview-experience.js, with launch-email capture (POST
 * sonoite/v1/preview-email) and share buttons. Prints its own <head>; data
 * reaches the script as window.sonoitePreviewData. Admins are redirected to
 * the settings screen until a track with audio is selected.
 *
 * @package SonoiteTheme
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

// Get selected preview track
$preview_track_id = get_option('sonoite_preview_track', 0);
$preview_track = null;

if ($preview_track_id) {
    $track_post = get_post($preview_track_id);
    if ($track_post && $track_post->post_type === 'track' && $track_post->post_status === 'publish') {
        $audio_id = get_post_meta($track_post->ID, 'audio_file', true);
        $audio_url = $audio_id ? wp_get_attachment_url($audio_id) : '';

        if ($audio_url) {
            $preview_track = array(
                'id' => $track_post->ID,
                'title' => $track_post->post_title,
                'content' => $track_post->post_content,
                'excerpt' => $track_post->post_excerpt,
                'audio_url' => $audio_url,
                'audio_mime_type' => $audio_id ? get_post_mime_type($audio_id) : '',
                'duration' => get_post_meta($track_post->ID, 'duration', true) ?: '0:00',
                'featured_image' => get_the_post_thumbnail_url($track_post->ID, 'sonoite-track-art'),
                'consciousness' => array(
                    'type' => get_post_meta($track_post->ID, 'consciousness_type', true) ?: 'abstract',
                    'color_palette' => get_post_meta($track_post->ID, 'color_palette', true) ?: '#8B5CF6',
                    'intensity_level' => floatval(get_post_meta($track_post->ID, 'intensity_level', true) ?: 1.0)
                ),
                'musical_data' => array(
                    'bpm' => intval(get_post_meta($track_post->ID, 'bpm', true)),
                    'key_signature' => get_post_meta($track_post->ID, 'key_signature', true)
                )
            );
        }
    }
}

// If no valid preview track, redirect admins to setup or show coming soon
if (!$preview_track) {
    if (current_user_can('manage_options')) {
        wp_redirect(admin_url('edit.php?post_type=track&page=sonoite-preview-settings'));
        exit;
    } else {
        // Show coming soon message for non-admin users
        $preview_track = array(
            'id' => 0,
            'title' => __('Preview Coming Soon', SONOITE_TEXT_DOMAIN),
            'content' => __('The preview experience is being prepared. Check back soon!', SONOITE_TEXT_DOMAIN),
            'audio_url' => '',
            'duration' => '0:00',
            'consciousness' => array(
                'type' => 'abstract',
                'color_palette' => '#8B5CF6',
                'intensity_level' => 1.0
            )
        );
    }
}

$nonce = sonoite_get_csp_nonce();

// Social preview image: the track artwork, else the theme screenshot.
$share_image = !empty($preview_track['featured_image'])
    ? $preview_track['featured_image']
    : get_template_directory_uri() . '/screenshot.png';
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO and Social Meta -->
    <title><?php echo esc_html(get_bloginfo('name')); ?> - <?php esc_html_e('Preview Experience', SONOITE_TEXT_DOMAIN); ?></title>
    <meta name="description" content="<?php esc_attr_e('Experience a preview of the Sonoite album\'s interactive consciousness journey. Full album coming soon.', SONOITE_TEXT_DOMAIN); ?>">
    
    <!-- Open Graph Meta -->
    <meta property="og:title" content="<?php echo esc_attr(get_bloginfo('name')); ?> - <?php esc_attr_e('Interactive Album Preview', SONOITE_TEXT_DOMAIN); ?>">
    <meta property="og:description" content="<?php esc_attr_e('Experience consciousness through sound and visuals. Preview the journey.', SONOITE_TEXT_DOMAIN); ?>">
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo esc_url(get_permalink()); ?>">
    <meta property="og:image" content="<?php echo esc_url($share_image); ?>">
    
    <!-- Twitter Card Meta -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php echo esc_attr(get_bloginfo('name')); ?> - <?php esc_attr_e('Interactive Album Preview', SONOITE_TEXT_DOMAIN); ?>">
    <meta name="twitter:description" content="<?php esc_attr_e('Experience consciousness through sound and visuals. Preview the journey.', SONOITE_TEXT_DOMAIN); ?>">
    <meta name="twitter:image" content="<?php echo esc_url($share_image); ?>">
    
    <?php wp_head(); ?>
</head>
<body <?php body_class('sonoite-preview'); ?>>
    <?php wp_body_open(); ?>

    <div id="sonoite-preview-experience" class="preview-experience-container" role="main" aria-label="<?php esc_attr_e('Sonoite Album Preview Experience', SONOITE_TEXT_DOMAIN); ?>">
        
        <!-- Loading Screen -->
        <div id="loading-screen" class="loading-screen" aria-live="polite">
            <div class="loading-content">
                <h1><?php echo esc_html(get_bloginfo('name')); ?></h1>
                <p class="preview-subtitle"><?php esc_html_e('Album Preview', SONOITE_TEXT_DOMAIN); ?></p>
                <div class="loading-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="loading-progress" id="loading-progress"></div>
                </div>
                <p class="loading-text" id="loading-text"><?php esc_html_e('Preparing consciousness experience...', SONOITE_TEXT_DOMAIN); ?></p>
            </div>
        </div>

        <!-- Three.js Canvas -->
        <canvas id="three-canvas" role="img" aria-label="<?php esc_attr_e('Interactive consciousness visualization', SONOITE_TEXT_DOMAIN); ?>"></canvas>

        <!-- Preview UI Overlay -->
        <div class="preview-ui-overlay">
            <!-- Preview Header -->
            <header class="preview-header">
                <div class="preview-logo">
                    <h1><?php echo esc_html(get_bloginfo('name')); ?></h1>
                    <p class="preview-tagline"><?php esc_html_e('Interactive Album Experience', SONOITE_TEXT_DOMAIN); ?></p>
                </div>
                <div class="preview-status">
                    <span class="preview-badge"><?php esc_html_e('Preview', SONOITE_TEXT_DOMAIN); ?></span>
                </div>
            </header>

            <!-- Current Track Info -->
            <div class="preview-track-info" role="region" aria-live="polite" aria-label="<?php esc_attr_e('Current track information', SONOITE_TEXT_DOMAIN); ?>">
                <h2 class="preview-track-title" id="preview-track-title">
                    <?php echo esc_html($preview_track['title']); ?>
                </h2>
                <?php if (!empty($preview_track['content'])): ?>
                    <p class="preview-track-description" id="preview-track-description">
                        <?php echo esc_html(wp_strip_all_tags($preview_track['content'])); ?>
                    </p>
                <?php endif; ?>
            </div>

            <!-- Audio Controls -->
            <?php if ($preview_track['audio_url']): ?>
            <div class="preview-audio-controls" role="region" aria-label="<?php esc_attr_e('Audio controls', SONOITE_TEXT_DOMAIN); ?>">
                <button id="preview-play-pause" class="preview-control-button" aria-label="<?php esc_attr_e('Play/Pause', SONOITE_TEXT_DOMAIN); ?>">
                    <svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg class="pause-icon" viewBox="0 0 24 24" style="display:none;" aria-hidden="true">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                </button>

                <div class="preview-progress-container">
                    <div class="preview-progress-bar" role="slider" aria-label="<?php esc_attr_e('Seek through track', SONOITE_TEXT_DOMAIN); ?>" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
                        <div class="preview-progress-fill" id="preview-progress-fill"></div>
                    </div>
                    <div class="preview-time-display">
                        <span id="preview-current-time">0:00</span> / <span id="preview-total-time"><?php echo esc_html($preview_track['duration']); ?></span>
                    </div>
                </div>

                <div class="preview-volume-control">
                    <button class="preview-volume-button" aria-label="<?php esc_attr_e('Mute/Unmute', SONOITE_TEXT_DOMAIN); ?>" id="preview-volume-button">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                        </svg>
                    </button>
                    <input type="range" class="preview-volume-slider" min="0" max="100" value="70" aria-label="<?php esc_attr_e('Volume control', SONOITE_TEXT_DOMAIN); ?>" id="preview-volume-slider">
                </div>
            </div>
            <?php endif; ?>

            <!-- Coming Soon Section -->
            <div class="coming-soon-section" role="region" aria-label="<?php esc_attr_e('Full album information', SONOITE_TEXT_DOMAIN); ?>">
                <div class="coming-soon-content">
                    <h3 class="coming-soon-title"><?php echo esc_html(get_option('sonoite_coming_soon_message', __('Full Album Experience Coming Soon', SONOITE_TEXT_DOMAIN))); ?></h3>
                    <p class="coming-soon-description">
                        <?php esc_html_e('This is just the beginning. Experience all consciousness journeys in the complete interactive album.', SONOITE_TEXT_DOMAIN); ?>
                    </p>
                    <div class="coming-soon-features">
                        <ul>
                            <li><?php esc_html_e('Multiple consciousness visualizations', SONOITE_TEXT_DOMAIN); ?></li>
                            <li><?php esc_html_e('Full album audio experience', SONOITE_TEXT_DOMAIN); ?></li>
                            <li><?php esc_html_e('Interactive navigation between tracks', SONOITE_TEXT_DOMAIN); ?></li>
                            <li><?php esc_html_e('Enhanced consciousness exploration', SONOITE_TEXT_DOMAIN); ?></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Email Capture Form -->
            <?php if (get_option('sonoite_email_capture_enabled', 1)): ?>
            <div class="email-capture-section" role="region" aria-label="<?php esc_attr_e('Launch notification signup', SONOITE_TEXT_DOMAIN); ?>">
                <div class="email-capture-content">
                    <h3 class="email-capture-title"><?php esc_html_e('Be First to Experience the Full Journey', SONOITE_TEXT_DOMAIN); ?></h3>
                    <p class="email-capture-description">
                        <?php esc_html_e('Get notified when the complete album experience launches.', SONOITE_TEXT_DOMAIN); ?>
                    </p>

                    <form id="preview-email-form" class="preview-email-form" role="form">
                        <div class="email-form-group">
                            <label for="preview-email" class="screen-reader-text">
                                <?php esc_html_e('Email address', SONOITE_TEXT_DOMAIN); ?>
                            </label>
                            <input type="email" id="preview-email" name="preview_email" placeholder="<?php esc_attr_e('Enter your email address', SONOITE_TEXT_DOMAIN); ?>" required autocomplete="email" aria-describedby="email-privacy-note">
                            
                            <button type="submit" class="email-submit-button" id="email-submit-button">
                                <span class="button-text"><?php esc_html_e('Notify Me', SONOITE_TEXT_DOMAIN); ?></span>
                                <span class="button-loading" style="display: none;">
                                    <svg class="spinner" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                                    </svg>
                                </span>
                            </button>
                        </div>

                        <p id="email-privacy-note" class="email-privacy-note">
                            <?php esc_html_e('We respect your privacy. Unsubscribe at any time. No spam, just the album launch.', SONOITE_TEXT_DOMAIN); ?>
                        </p>

                        <div id="email-form-message" class="email-form-message" role="alert" aria-live="polite" style="display: none;"></div>
                    </form>
                </div>
            </div>
            <?php endif; ?>

            <!-- Social Sharing Section -->
            <?php if (get_option('sonoite_social_sharing_enabled', 1)): ?>
            <div class="social-sharing-section" role="region" aria-label="<?php esc_attr_e('Share preview', SONOITE_TEXT_DOMAIN); ?>">
                <div class="social-sharing-content">
                    <h3 class="social-sharing-title"><?php esc_html_e('Share the Preview', SONOITE_TEXT_DOMAIN); ?></h3>
                    <p class="social-sharing-description">
                        <?php esc_html_e('Help others discover this consciousness journey.', SONOITE_TEXT_DOMAIN); ?>
                    </p>

                    <div class="social-buttons">
                        <button class="social-button social-twitter" data-platform="twitter" aria-label="<?php esc_attr_e('Share on Twitter', SONOITE_TEXT_DOMAIN); ?>">
                            <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                            </svg>
                            <span><?php esc_html_e('Twitter', SONOITE_TEXT_DOMAIN); ?></span>
                        </button>

                        <button class="social-button social-facebook" data-platform="facebook" aria-label="<?php esc_attr_e('Share on Facebook', SONOITE_TEXT_DOMAIN); ?>">
                            <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                            </svg>
                            <span><?php esc_html_e('Facebook', SONOITE_TEXT_DOMAIN); ?></span>
                        </button>

                        <button class="social-button social-copy" data-platform="copy" aria-label="<?php esc_attr_e('Copy link', SONOITE_TEXT_DOMAIN); ?>">
                            <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            <span><?php esc_html_e('Copy Link', SONOITE_TEXT_DOMAIN); ?></span>
                        </button>
                    </div>

                    <div id="social-share-message" class="social-share-message" role="alert" aria-live="polite" style="display: none;"></div>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <!-- Consciousness Navigation Help -->
        <div class="consciousness-help" role="region" aria-label="<?php esc_attr_e('How to explore', SONOITE_TEXT_DOMAIN); ?>">
            <button class="help-toggle" aria-label="<?php esc_attr_e('Show exploration guide', SONOITE_TEXT_DOMAIN); ?>" aria-expanded="false">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <circle cx="12" cy="17" r="1"/>
                </svg>
            </button>

            <div class="help-content" id="help-content" style="display: none;">
                <h4><?php esc_html_e('Explore Consciousness', SONOITE_TEXT_DOMAIN); ?></h4>
                <ul>
                    <li><?php esc_html_e('Move your mouse to shift consciousness states', SONOITE_TEXT_DOMAIN); ?></li>
                    <li><?php esc_html_e('Use arrow keys for keyboard navigation', SONOITE_TEXT_DOMAIN); ?></li>
                    <li><?php esc_html_e('On mobile: touch and drag to explore', SONOITE_TEXT_DOMAIN); ?></li>
                    <li><?php esc_html_e('Let the audio guide your consciousness journey', SONOITE_TEXT_DOMAIN); ?></li>
                </ul>
            </div>
        </div>

        <!-- Error Messages -->
        <div id="preview-error-container" class="preview-error-container" role="alert" aria-live="assertive" style="display: none;">
            <div class="preview-error-message">
                <h3><?php esc_html_e('Experience Error', SONOITE_TEXT_DOMAIN); ?></h3>
                <p id="preview-error-text"></p>
                <button id="preview-error-retry" class="preview-control-button"><?php esc_html_e('Try Again', SONOITE_TEXT_DOMAIN); ?></button>
            </div>
        </div>

        <!-- User Activation Prompt -->
        <div id="user-activation-prompt" class="user-activation-prompt" style="display: none;">
            <div class="activation-content">
                <h3><?php esc_html_e('Enable Audio Experience', SONOITE_TEXT_DOMAIN); ?></h3>
                <p><?php esc_html_e('Click anywhere to activate the consciousness journey', SONOITE_TEXT_DOMAIN); ?></p>
                <button id="activate-audio" class="preview-control-button"><?php esc_html_e('Begin Experience', SONOITE_TEXT_DOMAIN); ?></button>
            </div>
        </div>
    </div>

    <?php
    // JavaScript data for preview experience
    $preview_data = array(
        'track' => $preview_track,
        'apiUrl' => home_url('/wp-json/sonoite/v1/'),
        'themeUrl' => get_template_directory_uri(),
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('wp_rest'), // Sent as X-WP-Nonce; core validates it against 'wp_rest'
        'shareUrl' => get_permalink(),
        'shareTitle' => get_bloginfo('name') . ' - ' . __('Interactive Album Preview', SONOITE_TEXT_DOMAIN),
        'shareDescription' => __('Experience consciousness through sound and visuals. Preview the journey.', SONOITE_TEXT_DOMAIN),
        'strings' => array(
            'loading' => __('Loading preview...', SONOITE_TEXT_DOMAIN),
            'emailSuccess' => __('Thank you! You\'ll be notified when the full album launches.', SONOITE_TEXT_DOMAIN),
            'emailError' => __('Something went wrong. Please try again.', SONOITE_TEXT_DOMAIN),
            'shareSuccess' => __('Link copied to clipboard!', SONOITE_TEXT_DOMAIN),
            'shareError' => __('Unable to copy link. Please copy manually.', SONOITE_TEXT_DOMAIN),
            'noAudio' => __('Audio preview not available', SONOITE_TEXT_DOMAIN),
            'userActivation' => __('Click anywhere to enable audio', SONOITE_TEXT_DOMAIN),
            'experienceReady' => __('Experience ready!', SONOITE_TEXT_DOMAIN),
            'loadingAudio' => __('Loading audio...', SONOITE_TEXT_DOMAIN),
            'audioError' => __('Audio failed to load', SONOITE_TEXT_DOMAIN)
        )
    );
    ?>

    <script type="text/javascript" nonce="<?php echo esc_attr($nonce); ?>">
        window.sonoitePreviewData = <?php echo wp_json_encode($preview_data); ?>;
    </script>

    <?php wp_footer(); ?>
</body>
</html>