/**
 * Musical Audio Response Curves
 * Provides smooth, musical responses to audio input
 * @module audioResponse
 */

/**
 * Smoothstep function for smooth transitions
 */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Create musical response curves from audio data
 * @param {Object} audio - Audio analysis data
 * @returns {Object} Musical response values
 */
export function createMusicalResponse(audio) {
  const bass = audio?.bass ?? 0;
  const mid = audio?.mid ?? 0;
  const treble = audio?.treble ?? 0;
  const loudness = audio?.loudness ?? 0;
  
  // Resonance curve - bell-shaped response to bass
  const resonance = Math.sin(bass * Math.PI) * 0.5 + 0.5;
  
  // Exponential treble for sharper response
  const shimmer = Math.pow(treble, 2.0);
  
  // Gated loudness with threshold
  const pulse = smoothstep(0.3, 0.7, loudness);
  
  // Wave speed modulation based on mid frequencies
  const waveSpeed = 0.5 + mid * 2.0;
  
  // Composite intensity for overall effect strength
  const intensity = resonance * 0.4 + shimmer * 0.3 + pulse * 0.3;
  
  return {
    resonance,
    shimmer,
    pulse,
    waveSpeed,
    intensity,
    // Additional useful mappings
    transmission: 0.85 + resonance * 0.1,  // Glass transmission
    ior: 1.05 + bass * 0.02,               // Refraction index
    roughness: 0.15 + shimmer * 0.06,      // Surface roughness
    thickness: 0.2 + mid * 0.05            // Glass thickness
  };
}

/**
 * Create harmonic breathing animation
 * @param {number} time - Current time
 * @param {number} phase - Phase offset
 * @returns {number} Breathing value
 */
export function harmonicBreathing(time, phase = 0) {
  const fundamental = Math.sin(time * 0.3 + phase);
  const harmonic2 = Math.sin(time * 0.6 + phase * 1.5) * 0.3;
  const harmonic3 = Math.sin(time * 0.9 + phase * 2.0) * 0.1;
  return fundamental + harmonic2 + harmonic3;
}

/**
 * Calculate wave propagation delay
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} centerX - Wave center X
 * @param {number} centerY - Wave center Y
 * @returns {number} Delay value
 */
export function waveDelay(x, y, centerX = 0, centerY = 0) {
  const distance = Math.sqrt(
    Math.pow(x - centerX, 2) + 
    Math.pow(y - centerY, 2)
  );
  return distance * 0.1;
}