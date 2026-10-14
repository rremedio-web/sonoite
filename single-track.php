<?php
/**
 * Single Track Template
 * 
 * @package SonoiteTheme
 */

// Pretty /track/{slug}/ URLs should land on the main experience with ?track= preserved.
$slug = get_post_field('post_name', get_queried_object_id());
$target = $slug
    ? home_url('/?' . http_build_query(array('track' => $slug), '', '&', PHP_QUERY_RFC3986))
    : home_url('/');
wp_safe_redirect($target, 302);
exit;
?>