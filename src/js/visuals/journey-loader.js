/**
 * Journey JSON loader shared by the legacy runtime (three-experience.js) and Path B (prototype/experience.js).
 * loadJourneyByTrackId() resolves an id/slug, fetches phase42/{slug}.json (phase42/reduced/ first under
 * prefers-reduced-motion), coerces the phase42/v1.2 shapes to one, then appends {slug}-enriched-moments.json.
 * Path B reads only palette, meta and the hero/prototype_chamber structure elements; the moment merge and
 * the Track 5 camera-spline injection matter only to the legacy runtime.
 * @module journey-loader
 */

import { dlog, dwarn, derr } from '../utils/devlog.js';

/**
 * Load a journey JSON file from the phase42 directory (modern format)
 * @param {string} trackFile - The filename of the track JSON (e.g., 'sonoite.json')
 * @returns {Promise<Object>} The parsed journey JSON data
 * @throws {Error} If the file cannot be loaded or parsed
 */
export async function loadJourneyJson(trackFile) {
  // Get the base URL from WordPress data or construct it
  let baseUrl = '';

  // Check if WordPress has provided the theme URL (best practice)
  if (typeof window.sonoiteData !== 'undefined' && window.sonoiteData.themeUrl) {
    baseUrl = `${window.sonoiteData.themeUrl}/public/assets/journeys/phase42/${trackFile}`;
  } else {
    // Fallback: try to detect the correct path
    const paths = [
      `/homem/wp-content/themes/sonoite-theme/public/assets/journeys/phase42/${trackFile}`,
      `/wp-content/themes/sonoite-theme/public/assets/journeys/phase42/${trackFile}`,
      `./public/assets/journeys/phase42/${trackFile}`
    ];
    
    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          if (window.SONOITE_DEBUG) {
            dlog(`✅ Journey loaded from: ${path}`);
          }
          return await res.json();
        }
      } catch (e) {
        // Try next path
      }
    }
    
    throw new Error(`Journey load failed: ${trackFile} (tried ${paths.length} paths)`);
  }
  
  // Load from WordPress-provided URL
  const res = await fetch(baseUrl);
  if (!res.ok) throw new Error(`Journey load failed: ${trackFile}`);
  return await res.json();
}

/**
 * Load all available journey tracks
 * @returns {Promise<Object[]>} Array of all journey JSON data
 */
export async function loadAllJourneys() {
  const trackFiles = [
    'track_01_sonoite.json',
    'track_02_paralisia_do_sono.json',
    'track_03_o_livro_azul.json',
    'track_04_horas_mortas.json',
    'track_05_nao_querer_nada.json',
    'track_06_o_filho.json',
    'track_07_homem_educado.json'
  ];
  
  const journeys = await Promise.all(
    trackFiles.map(file => loadJourneyJson(file))
  );
  
  return journeys;
}

/**
 * MP13: Load enriched moments JSON for a track (optional)
 * @param {string} slug - Track slug (e.g., 'paralisia-do-sono')
 * @param {string} themeUrl - Theme base URL
 * @returns {Promise<Object|null>} Enriched moments data or null if not found
 */
async function loadEnrichedMoments(slug, themeUrl) {
  // CACHE-FIX: Add cache busting to prevent stale server responses
  const enrichedPath = `${themeUrl}/public/assets/journeys/phase42/${slug}-enriched-moments.json`;

  try {
    const r = await fetch(enrichedPath, { cache: 'no-store' });

    if (r.ok) {
      const enrichedData = await r.json();

      if (window.SONOITE_DEBUG) {
        dlog(`[MP13] Loaded enriched moments for ${slug}:`, {
          additionalFlows: enrichedData.additionalFlowElements?.length || 0,
          additionalStructures: enrichedData.additionalStructureElements?.length || 0,
          moments: enrichedData.enrichedMoments?.length || 0
        });
      }

      return enrichedData;
    } else {
      // Not an error - enriched moments are optional
      if (window.SONOITE_DEBUG) {
        dlog(`[MP13] No enriched moments for ${slug} (optional)`);
      }
      return null;
    }
  } catch (e) {
    // Not an error - enriched moments are optional
    if (window.SONOITE_DEBUG) {
      dlog(`[MP13] Enriched moments fetch failed for ${slug}:`, e.message);
    }
    return null;
  }
}

/**
 * MP13: Merge enriched moments into base journey
 * @param {Object} baseJourney - The base journey data
 * @param {Object} enrichedData - The enriched moments data
 * @returns {Object} Merged journey data
 */
function mergeEnrichedMoments(baseJourney, enrichedData) {
  if (!enrichedData) return baseJourney;

  const merged = { ...baseJourney };

  // Merge additionalFlowElements into flowElements array
  if (enrichedData.additionalFlowElements && Array.isArray(enrichedData.additionalFlowElements)) {
    merged.flowElements = merged.flowElements || [];
    merged.flowElements.push(...enrichedData.additionalFlowElements);

    if (window.SONOITE_DEBUG) {
      dlog(`[MP13] Added ${enrichedData.additionalFlowElements.length} additional flow elements`);
    }
  }

  // Merge additionalStructureElements into structureElements array
  if (enrichedData.additionalStructureElements && Array.isArray(enrichedData.additionalStructureElements)) {
    merged.structureElements = merged.structureElements || [];
    merged.structureElements.push(...enrichedData.additionalStructureElements);

    if (window.SONOITE_DEBUG) {
      dlog(`[MP13] Added ${enrichedData.additionalStructureElements.length} additional structure elements`);
    }
  }

  // Merge enrichedMoments into moments array
  // ENRICHED-FIX: Check both "enrichedMoments" and "moments" keys for compatibility
  const enrichedMoments = enrichedData.enrichedMoments || enrichedData.moments;
  if (enrichedMoments && Array.isArray(enrichedMoments)) {
    merged.moments = merged.moments || [];
    merged.moments.push(...enrichedMoments);

    if (window.SONOITE_DEBUG) {
      dlog(`[MP13] Added ${enrichedMoments.length} signature moments:`,
        enrichedMoments.map(m => `${m.id} at ${m.at}`));
    }
  }

  return merged;
}

/**
 * Load a journey by track ID (without file extension)
 * @param {string|number} trackId - sonoiteData.tracks[].id (Path B), slug (legacy runtime) or '02_paralisia_do_sono' form
 * @returns {Promise<Object>} The parsed journey JSON data
 */
export async function loadJourneyByTrackId(trackId) {
  const slug = trackIdToSlug(trackId);
  const themeUrl = (typeof window !== 'undefined' && window.sonoiteData?.themeUrl) || '';

  // MP-01: Log journey resolution
  dlog(`[MP-01] Journey load: trackId=${trackId}, slug=${slug}`);

  // REDUCED-MOTION-01: Check for reduced-motion preference
  const reducedMotionFlag = typeof window !== 'undefined' && window.SONOITE_REDUCED_MOTION === true;
  const reducedMotionMedia = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const useReducedMotion = reducedMotionFlag || reducedMotionMedia;

  // REDUCED-MOTION-01: Try reduced-motion variant first if applicable
  if (useReducedMotion) {
    const reducedPath = `${themeUrl}/public/assets/journeys/phase42/reduced/${slug}.json`;
    try {
      if (window.SONOITE_DEBUG) {
        dlog(`[REDUCED-MOTION-01] Trying reduced-motion variant: ${reducedPath}`);
      }
      const r = await fetch(reducedPath);

      if (r.ok) {
        const json = await r.json();
        const coerced = coerceJourneyData(json);

        // MP13: Load and merge enriched moments
        const enrichedData = await loadEnrichedMoments(slug, themeUrl);
        const merged = mergeEnrichedMoments(coerced, enrichedData);

        const flowType = merged.flow?.type || 'none';
        const structureCount = merged.structureElements?.length || 0;

        if (window.SONOITE_DEBUG) {
          dlog(`[REDUCED-MOTION-01] Loaded reduced variant: slug=${slug}, flow=${flowType}, structures=${structureCount}`);
        }

        return merged;
      } else {
        if (window.SONOITE_DEBUG) {
          dlog(`[REDUCED-MOTION-01] Reduced variant not found (${r.status}), falling back to normal`);
        }
      }
    } catch (e) {
      if (window.SONOITE_DEBUG) {
        dwarn(`[REDUCED-MOTION-01] Reduced variant fetch failed: ${e.message}, falling back to normal`);
      }
    }
  }

  // phase42 path (Director's Cut)
  // CACHE-FIX: Add cache busting to prevent stale server responses
  const journeyPath = `${themeUrl}/public/assets/journeys/phase42/${slug}.json`;
  try {
    dlog(`[MP-01] Trying: ${journeyPath}`);
    const r = await fetch(journeyPath, { cache: 'no-store' });
    dlog(`[MP-01] HTTP status: ${r.status}`);

    if (r.ok) {
      const json = await r.json();
      const coerced = coerceJourneyData(json);

      // MP13: Load and merge enriched moments
      const enrichedData = await loadEnrichedMoments(slug, themeUrl);
      let merged = mergeEnrichedMoments(coerced, enrichedData);

      // TRACK5-CAMERA: Inject camera mode + spline triggers for Track 5
      merged = applyTrack5CameraInjections(merged, slug);

      // MP-01: Log journey structure after coercion + merge
      const flowType = merged.flow?.type || 'none';
      const structureCount = merged.structureElements?.length || 0;
      const momentCount = merged.moments?.length || 0;
      dlog(`[MP-01] Journey OK: slug=${slug}, status=${r.status}, flow=${flowType}, structures=${structureCount}, moments=${momentCount}`);

      return merged;
    }
    dlog(`[MP-01] Journey response not OK: ${r.status}`);
  } catch (e) {
    dwarn(`[MP-01] Journey fetch failed: ${e.message}`);
  }

  // Vestigial "v1.2 fallback": loadJourneyJson() looks in phase42/, which has no track_*.json (v1.2
  // files live in v1.2/ as track_0N_name.json), so this throws. Both runtimes catch it and use defaults.
  const trackFile = `track_${trackId}.json`;
  dlog(`[MP-01] Falling back to v1.2: ${trackFile}`);
  const v12 = await loadJourneyJson(trackFile);
  let coerced = coerceJourneyData(v12);
  coerced = applyTrack5CameraInjections(coerced, slug);

  // MP-01: Log v1.2 journey structure
  const flowType = coerced.flow?.type || 'none';
  const structureCount = coerced.structureElements?.length || 0;
  dlog(`[MP-01] Journey OK (v1.2): file=${trackFile}, flow=${flowType}, structures=${structureCount}`);

  return coerced;
}

/**
 * Validate journey data against expected schema
 * @param {Object} journeyData - The journey data to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateJourneyData(journeyData) {
  // Basic validation - check for required fields
  // Accept both v1.2 and phase42 style journeys (more lenient)
  const requiredFields = [];
  
  for (const field of requiredFields) {
    if (!(field in journeyData)) {
      derr(`Journey validation failed: missing field '${field}'`);
      return false;
    }
  }
  
  // Validate schema version
  // Allow unknown schema; we'll coerce later
  
  return true;
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.loadJourneyJson = loadJourneyJson;
  window.loadAllJourneys = loadAllJourneys;
  window.loadJourneyByTrackId = loadJourneyByTrackId;
}

/**
 * Convert trackId to slug, with fallback to track data lookup
 * @param {string|number} trackId - Can be numeric ID or string like '02_paralisia_do_sono'
 * @returns {string} Slug like 'paralisia-do-sono'
 */
function trackIdToSlug(trackId) {
  // SLUG-FIX-01: Try to find track in sonoiteData first
  if (typeof window !== 'undefined' && window.sonoiteData?.tracks) {
    const track = window.sonoiteData.tracks.find(t =>
      t.id === trackId ||
      t.id === parseInt(trackId) ||
      trackId === `0${t.order}_${sanitizeTitle(t.title)}`
    );

    if (track) {
      // Prefer explicit slug if present
      if (track.slug) {
        if (window.SONOITE_DEBUG) {
          dlog(`[SLUG-FIX-01] Found slug from track data: ${track.slug}`);
        }
        return track.slug;
      }

      // Fallback: derive from title
      if (track.title) {
        const derived = sanitizeTitle(track.title);
        if (window.SONOITE_DEBUG) {
          dwarn(`[SLUG-FIX-01] Slug missing, derived from title: ${derived}`);
        }
        return derived;
      }
    }
  }

  // Legacy fallback: parse trackId string
  const str = String(trackId);
  const noNum = str.replace(/^\d+_/, '');
  return noNum.replace(/_/g, '-');
}

/**
 * Sanitize title to slug format
 * @param {string} title - Track title
 * @returns {string} Slug-formatted title
 */
function sanitizeTitle(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim hyphens from ends
}

/**
 * Coerce various journey JSON shapes to a unified minimal shape our adapter can use.
 * - Accepts phase42 format (flow {type,params,reactivity}, structure.elements[])
 * - Accepts v1.2 format (single flow/structure objects)
 * - Accepts phase42 format (Director's Cut with visual_source string)
 * - MP2: Extracts palette configuration for per-track color identity
 */
function coerceJourneyData(json) {
  if (!json || typeof json !== 'object') return json;

  const out = { ...json };

  // DIRECTORS-CUT: Convert visual_source to structure format
  // Format: "structure/Monolith" or "flow/StarDust"
  if (json.config?.visual_source && typeof json.config.visual_source === 'string') {
    const [category, type] = json.config.visual_source.split('/');

    if (category === 'structure' && type) {
      out.structure = {
        type: type,
        params: {},
        reactivity: {}
      };
      if (window.SONOITE_DEBUG) {
        dlog(`[DIRECTORS-CUT] Converted visual_source to structure: ${type}`);
      }
    } else if (category === 'flow' && type) {
      out.flow = {
        type: type,
        params: {},
        reactivity: {}
      };
      if (window.SONOITE_DEBUG) {
        dlog(`[DIRECTORS-CUT] Converted visual_source to flow: ${type}`);
      }
    }
  }

  // MP2-PALETTE: Extract palette from journey root
  // Format: { primary: "#RRGGBB", secondary: "#RRGGBB", accent: "#RRGGBB" }
  if (json.palette && typeof json.palette === 'object') {
    out.palette = {
      primary: json.palette.primary || '#d7d7e0',
      secondary: json.palette.secondary || '#56667a',
      accent: json.palette.accent || '#718096'
    };
    if (window.SONOITE_DEBUG) {
      dlog(`[MP2-PALETTE] Journey palette found:`, out.palette);
    }
  }

  // DIRECTORS-CUT: Handle config.palette as string (e.g., "noir")
  if (json.config?.palette && typeof json.config.palette === 'string') {
    // Map named palettes to color values
    const palettes = {
      'noir': { primary: '#0a0a0a', secondary: '#1a1a1a', accent: '#2a2a2a' },
      'warm': { primary: '#ff6b35', secondary: '#f7931e', accent: '#fdc500' },
      'cold': { primary: '#0d3b66', secondary: '#1976d2', accent: '#42a5f5' },
      'neon': { primary: '#ff006e', secondary: '#8338ec', accent: '#3a86ff' }
    };

    out.palette = palettes[json.config.palette] || out.palette;
    if (window.SONOITE_DEBUG && palettes[json.config.palette]) {
      dlog(`[DIRECTORS-CUT] Applied named palette: ${json.config.palette}`, out.palette);
    }
  }

  // Coerce flow: prefer json.flow; accept json.flow.elements[0]
  if (json.flow && !json.flow.type && Array.isArray(json.flow.elements) && json.flow.elements.length) {
    const f = json.flow.elements[0];
    out.flow = { type: f.type, params: f.params || {}, reactivity: f.reactivity || f.reactors || {} };
    // MP2-PALETTE: Pass palette to flow params
    if (out.palette) {
      out.flow.params = { ...out.flow.params, palette: out.palette };
    }
  } else if (json.flow) {
    out.flow = { ...json.flow };
    // reactors vs reactivity
    out.flow.reactivity = json.flow.reactivity || json.flow.reactors || {};
    // MP2-PALETTE: Pass palette to flow params
    if (out.palette) {
      out.flow.params = { ...out.flow.params, palette: out.palette };
    }
  }

  if (Array.isArray(json.flowElements) && json.flowElements.length > 0) {
    out.flowElements = json.flowElements.map((el) => ({
      type: el.type,
      params: { ...(el.params || {}), ...(out.palette ? { palette: out.palette } : {}) },
      reactivity: el.reactivity || el.reactors || {}
    }));
  }

  // Coerce structure: if elements array present, take first for minimal support
  if (json.structure && Array.isArray(json.structure.elements) && json.structure.elements.length) {
    const s = json.structure.elements[0];
    out.structure = { type: s.type, params: s.params || {}, reactivity: s.reactivity || s.reactors || {} };
    // MP2-PALETTE: Pass palette to structure params
    if (out.palette) {
      out.structure.params = { ...out.structure.params, palette: out.palette };
    }

    // Preserve all elements for multi-structure support
    out.structureElements = json.structure.elements.map(el => ({
      type: el.type,
      params: { ...(el.params || {}), ...(out.palette ? { palette: out.palette } : {}) }, // MP2-PALETTE
      reactivity: el.reactivity || el.reactors || {}
    }));
  } else if (json.structure) {
    out.structure = { ...json.structure };
    out.structure.reactivity = json.structure.reactivity || json.structure.reactors || {};
    // MP2-PALETTE: Pass palette to structure params
    if (out.palette) {
      out.structure.params = { ...out.structure.params, palette: out.palette };
    }
  }

  return out;
}

/**
 * TRACK5-CAMERA: Inject camera mode and spline trigger moments for Track 5 (Nao Querer Nada)
 * so it doesn't fall back to prior track camera paths.
 */
function applyTrack5CameraInjections(journey, slug) {
  if (!journey || slug !== 'nao-querer-nada') return journey;

  const injected = { ...journey };
  injected.config = injected.config || {};
  // Force camera mode to void_drift for Track 5
  injected.config.camera_mode = injected.config.camera_mode || 'void_drift';

  // P0-3 FIX: Check if enriched moments already have camera_spline actions
  // If so, skip injection to avoid double-triggering splines
  injected.moments = injected.moments || [];
  const hasExistingCameraSplines = injected.moments.some(m =>
    m.actions?.some(a => a.type === 'camera_spline')
  );

  if (hasExistingCameraSplines) {
    if (window.SONOITE_DEBUG) {
      console.log('[journey-loader] Track 5: Skipping camera spline injection (enriched moments already have camera_spline actions)');
    }
    return injected;
  }

  // Fallback: Add spline trigger moments for v1.2 journeys or journeys without enriched moments
  const existingIds = new Set(injected.moments.map(m => m.id));

  const splineMoments = [
    { id: 't5_cam_act1', at: '0:05.00', spline: 'ACT1', duration: 96 },
    { id: 't5_cam_act2', at: '1:36.00', spline: 'ACT2', duration: 120 },
    { id: 't5_cam_act3', at: '3:36.00', spline: 'ACT3', duration: 65 },
    { id: 't5_cam_act4', at: '4:41.00', spline: 'ACT4', duration: 151 }
  ];

  splineMoments.forEach(sm => {
    if (existingIds.has(sm.id)) return;
    injected.moments.push({
      id: sm.id,
      at: sm.at,
      _phase: 'CAMERA',
      _segment: `Camera spline ${sm.spline}`,
      actions: [
        {
          type: 'camera_spline',
          target: 'camera',
          params: { spline: sm.spline, duration: sm.duration, easing: 'easeInOutQuad' }
        }
      ]
    });
  });

  if (window.SONOITE_DEBUG) {
    console.log(`[journey-loader] Track 5: Injected ${splineMoments.length} camera spline moments (fallback for v1.2/no-enriched)`);
  }

  return injected;
}
