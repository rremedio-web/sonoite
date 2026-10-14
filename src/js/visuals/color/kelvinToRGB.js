/**
 * Color temperature (Kelvin) to RGB conversion
 * Fast polynomial approximation with sRGB transfer
 * @module kelvinToRGB
 */

/**
 * Convert color temperature in Kelvin to RGB values
 * @param {number} kelvin - Temperature in Kelvin (1000-12000K)
 * @returns {{r: number, g: number, b: number}} RGB values in 0-1 range
 */
export function kelvinToRGB(kelvin) {
  // Clamp to valid range and scale
  const K = Math.max(1000, Math.min(12000, kelvin)) / 100;
  
  let r, g, b;
  
  if (K <= 66) {
    // Warm temperatures (1000K - 6600K)
    r = 255;
    g = K < 13 ? 0 : 99.4708025861 * Math.log(K) - 161.1195681661;
    b = K <= 19 ? 0 : 138.5177312231 * Math.log(K - 10) - 305.0447927307;
  } else {
    // Cool temperatures (6600K - 12000K)
    r = 329.698727446 * Math.pow(K - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(K - 60, -0.0755148492);
    b = 255;
  }
  
  // Apply sRGB transfer and clamp to 0-1 range
  const toLinear = (v) => {
    v = Math.max(0, Math.min(255, v)) / 255;
    // Simplified sRGB to linear conversion
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  
  return {
    r: toLinear(r),
    g: toLinear(g),
    b: toLinear(b)
  };
}

/**
 * Create a color temperature LUT for shader use
 * @param {number} steps - Number of LUT entries (default 64)
 * @param {number} minK - Minimum Kelvin (default 2000)
 * @param {number} maxK - Maximum Kelvin (default 10000)
 * @returns {Float32Array} RGB LUT data
 */
export function createKelvinLUT(steps = 64, minK = 2000, maxK = 10000) {
  const lut = new Float32Array(steps * 3);
  
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const kelvin = minK + (maxK - minK) * t;
    const rgb = kelvinToRGB(kelvin);
    
    lut[i * 3] = rgb.r;
    lut[i * 3 + 1] = rgb.g;
    lut[i * 3 + 2] = rgb.b;
  }
  
  return lut;
}

/**
 * Interpolate between two Kelvin temperatures
 * @param {number} k1 - Start temperature in Kelvin
 * @param {number} k2 - End temperature in Kelvin
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated Kelvin value
 */
export function lerpKelvin(k1, k2, t) {
  // Perceptually linear interpolation in Mired space
  // Mired = 1,000,000 / Kelvin
  const m1 = 1000000 / k1;
  const m2 = 1000000 / k2;
  const m = m1 + (m2 - m1) * t;
  return 1000000 / m;
}

/**
 * Get a warmer temperature based on bass response
 * @param {number} baseKelvin - Base temperature (default 4000K)
 * @param {number} bass - Bass level (0-1)
 * @returns {number} Adjusted Kelvin value
 */
export function getWarmthFromBass(baseKelvin = 4000, bass = 0) {
  // Map bass to temperature shift
  // 0 bass = base temperature
  // 1 bass = warm candlelight (2000K)
  const targetKelvin = 2000;
  return lerpKelvin(baseKelvin, targetKelvin, bass * 0.7); // Cap at 70% to avoid too orange
}