/**
 * The site's only Vite entry (index.html loads it). ES imports evaluate in the order written, so
 * site-data.js sets window.sonoiteData and window.__sonoiteStaticLoader before the Path B runtime
 * (../prototype/main.js and everything it imports) evaluates. Add nothing here: a top-level statement in
 * this file would run after both imports.
 */

import './site-data.js';
import '../prototype/main.js';
