<?php
/**
 * Track archive (/tracks/): there is no list view, so redirect to the front
 * page, which hosts the album.
 *
 * @package SonoiteTheme
 */

// For track archives, redirect to main experience
wp_redirect(home_url('/'));
exit;
?>