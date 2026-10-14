<?php
/**
 * Template Name: Sonoite Prototype
 *
 * Minimal full-bleed shell for Path B prototype work.
 *
 * @package SonoiteTheme
 */

if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

$tracks = function_exists('sonoite_get_secure_tracks_data') ? sonoite_get_secure_tracks_data() : array();
$requested_track = isset($_GET['track']) ? sanitize_title(wp_unslash($_GET['track'])) : 'sonoite';
$entry_track = null;

foreach ($tracks as $track) {
    if (($track['slug'] ?? '') === $requested_track) {
        $entry_track = $track;
        break;
    }
}

if (!$entry_track) {
    foreach ($tracks as $track) {
        if (($track['slug'] ?? '') === 'sonoite') {
            $entry_track = $track;
            break;
        }
    }
}

$album_name = get_bloginfo('name');
$track_title = $entry_track['title'] ?? '';
$page_title = $album_name . ($track_title ? ' | ' . $track_title : '');
$theme_uri = get_template_directory_uri();
$track_number = isset($entry_track['order']) ? (int) $entry_track['order'] : 0;
$track_label = $track_number > 0
    ? sprintf('Track %02d', $track_number)
    : '';
$first_paint_line = trim($track_title . ($track_label ? ' · ' . $track_label : ''));
if ($first_paint_line === '') {
    $first_paint_line = $album_name;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo esc_html($page_title); ?></title>
    <link rel="preload" href="<?php echo esc_url($theme_uri . '/assets/fonts/cormorant-garamond-latin.woff2'); ?>" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?php echo esc_url($theme_uri . '/assets/fonts/ibm-plex-mono-latin.woff2'); ?>" as="font" type="font/woff2" crossorigin>
    <?php wp_head(); ?>
    <style nonce="<?php echo esc_attr( sonoite_get_csp_nonce() ); ?>">
        html, body { margin: 0; min-height: 100%; background: #000; }
        body.sonoite-prototype-page { overflow: hidden; }
        #sonoite-prototype-root {
            position: fixed;
            inset: 0;
            overflow: hidden;
            background: #000;
            color: rgba(240, 236, 230, 0.9);
        }
        .prototype-first-paint {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }
        .prototype-first-paint-line {
            margin: 0;
            max-width: min(92vw, 720px);
            padding: 0 24px;
            font-family: 'Cormorant Garamond', 'Times New Roman', serif;
            font-size: clamp(20px, 3.2vw, 34px);
            font-weight: 400;
            letter-spacing: 0.12em;
            text-align: center;
            color: rgba(240, 236, 230, 0.9);
        }
    </style>
</head>
<body <?php body_class('sonoite-prototype-page'); ?>>
<noscript>
    <div style="position:fixed;inset:0;display:grid;place-items:center;background:#000;color:rgba(240,236,230,.9);font:400 clamp(20px,3.2vw,34px)/1.4 'Cormorant Garamond','Times New Roman',serif;letter-spacing:.12em;text-align:center;padding:24px;">
        <div>
            <p style="margin:0 0 12px;"><?php echo esc_html($album_name); ?></p>
            <p style="margin:0;font-size:14px;letter-spacing:.18em;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;color:rgba(240,236,230,.64);">Enable JavaScript to enter the room.</p>
        </div>
    </div>
</noscript>
<?php wp_body_open(); ?>
<div id="sonoite-prototype-root" aria-label="<?php echo esc_attr(sprintf('%s — %s', $album_name, $track_title ?: __('album', SONOITE_TEXT_DOMAIN))); ?>">
    <div class="prototype-first-paint" aria-hidden="true">
        <p class="prototype-first-paint-line"><?php echo esc_html($first_paint_line); ?></p>
    </div>
</div>
<?php wp_footer(); ?>
</body>
</html>
