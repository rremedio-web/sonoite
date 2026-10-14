/**
 * AIVideoBackground: experimental legacy-runtime flow layer, registered as 'ai_video_background' in
 * register-defaults.js. Plays public/assets/ai-backgrounds/{slug}.webm|.mp4|.mov (tried in order) on
 * a blended plane behind the scene. Only phase42/o-livro-azul-ai-test.json and
 * paralisia-do-sono-ai-test.json reference it, and ai-backgrounds/ is not in this snapshot, so every
 * source errors and the layer falls back to an animated dark gradient. Path B does not use it.
 */

import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

export class AIVideoBackground extends VisualLayer {
  mount() {
    if (!this.group) {
      this.group = new THREE.Group();
    }
    super.mount();

    // Get track slug from config or current track
    this.trackSlug = this.cfg?.trackSlug ||
                     window.sonoiteData?.currentTrack?.slug ||
                     'test';

    // Config with defaults
    this.opacity = this.cfg?.opacity ?? 0.5;
    this.blendMode = this.cfg?.blendMode || 'screen';
    this.syncTolerance = this.cfg?.syncTolerance ?? 0.15; // seconds

    // Create video element
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';

    // Try multiple formats
    const basePath = `/wp-content/themes/sonoite-theme/public/assets/ai-backgrounds/${this.trackSlug}`;
    this.videoSources = [
      `${basePath}.webm`,
      `${basePath}.mp4`,
      `${basePath}.mov`
    ];
    this.currentSourceIndex = 0;
    this.videoLoaded = false;
    this.videoError = false;

    // Set up video events
    this.video.oncanplaythrough = () => {
      this.videoLoaded = true;
      this.videoError = false;
      if (window.SONOITE_DEBUG) {
        console.log(`[AIVideoBackground] Video loaded: ${this.trackSlug}`);
      }
      this.createVideoMesh();
    };

    this.video.onerror = () => {
      this.currentSourceIndex++;
      if (this.currentSourceIndex < this.videoSources.length) {
        // Try next format
        this.video.src = this.videoSources[this.currentSourceIndex];
        this.video.load();
      } else {
        this.videoError = true;
        if (window.SONOITE_DEBUG) {
          console.warn(`[AIVideoBackground] No video found for track: ${this.trackSlug}`);
        }
        // Fall back to color gradient
        this.createFallbackMesh();
      }
    };

    // Start loading
    this.video.src = this.videoSources[0];
    this.video.load();

    // EMA smoothing for audio reactivity
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    this._alpha = 0.15;

    // Track last sync time to avoid constant seeking
    this._lastSyncCheck = 0;
  }

  createVideoMesh() {
    if (this.mesh) return; // Already created

    // Create video texture
    this.videoTexture = new THREE.VideoTexture(this.video);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.format = THREE.RGBAFormat;

    // Create full-screen quad
    const aspect = window.innerWidth / window.innerHeight;
    const geo = new THREE.PlaneGeometry(50 * aspect, 50);

    this.mat = new THREE.MeshBasicMaterial({
      map: this.videoTexture,
      transparent: true,
      opacity: this.opacity,
      depthWrite: false,
      depthTest: false,
      blending: this.getBlending(this.blendMode)
    });

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.z = -30; // Far back
    this.mesh.renderOrder = -100; // Render first (behind everything)
    this.group.add(this.mesh);

    // Start playback
    this.video.play().catch(e => {
      if (window.SONOITE_DEBUG) {
        console.warn('[AIVideoBackground] Autoplay blocked, waiting for user interaction');
      }
    });
  }

  createFallbackMesh() {
    if (this.mesh) return;

    // Create animated gradient as fallback
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    this.fallbackCtx = canvas.getContext('2d');
    this.fallbackTexture = new THREE.CanvasTexture(canvas);

    const aspect = window.innerWidth / window.innerHeight;
    const geo = new THREE.PlaneGeometry(50 * aspect, 50);

    this.mat = new THREE.MeshBasicMaterial({
      map: this.fallbackTexture,
      transparent: true,
      opacity: this.opacity * 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.z = -30;
    this.mesh.renderOrder = -100;
    this.group.add(this.mesh);

    this.updateFallbackGradient(0);
  }

  updateFallbackGradient(time) {
    if (!this.fallbackCtx) return;

    const ctx = this.fallbackCtx;
    const w = 512, h = 512;

    // Animated dark gradient
    const hue = (time * 10) % 360;
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    gradient.addColorStop(0, `hsla(${hue}, 30%, 8%, 0.8)`);
    gradient.addColorStop(0.5, `hsla(${hue + 20}, 20%, 5%, 0.6)`);
    gradient.addColorStop(1, `hsla(${hue + 40}, 10%, 2%, 0.4)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.fallbackTexture.needsUpdate = true;
  }

  getBlending(mode) {
    const modes = {
      'normal': THREE.NormalBlending,
      'additive': THREE.AdditiveBlending,
      'screen': THREE.AdditiveBlending, // Approximation
      'multiply': THREE.MultiplyBlending,
      'subtractive': THREE.SubtractiveBlending
    };
    return modes[mode] || THREE.AdditiveBlending;
  }

  _s(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }

  update(audio, dt) {
    const time = performance.now() * 0.001;

    // Smooth audio values
    const bass = this._s('bass', audio?.bass ?? 0);
    const loud = this._s('loud', audio?.loudness ?? 0);

    // Sync video to audio playback (throttled)
    if (this.videoLoaded && !this.videoError && time - this._lastSyncCheck > 0.5) {
      this._lastSyncCheck = time;
      this.syncToAudio();
    }

    // Update fallback gradient if no video
    if (this.videoError && this.fallbackCtx) {
      this.updateFallbackGradient(time);
    }

    // Audio-reactive opacity modulation
    if (this.mat) {
      const baseOpacity = this.opacity;
      const targetOpacity = baseOpacity * (0.8 + loud * 0.4); // 80%-120% of base
      this.mat.opacity += (targetOpacity - this.mat.opacity) * 0.1;
      this.mat.opacity = THREE.MathUtils.clamp(this.mat.opacity, baseOpacity * 0.5, baseOpacity * 1.2);
    }

    // Subtle scale breathing on bass
    if (this.mesh) {
      const targetScale = 1.0 + bass * 0.05;
      this.mesh.scale.x += (targetScale - this.mesh.scale.x) * 0.08;
      this.mesh.scale.y += (targetScale - this.mesh.scale.y) * 0.08;
    }

    // Update video texture
    if (this.videoTexture && this.video.readyState >= 2) {
      this.videoTexture.needsUpdate = true;
    }
  }

  syncToAudio() {
    // Get current audio time from experience
    const audioTime = window.SonoiteExperience?.audioManager?.currentTime ??
                      window.SonoiteExperience?.audio?.currentTime ??
                      null;

    if (audioTime === null || !this.video || this.video.paused) return;

    const videoDuration = this.video.duration;
    const audioDuration = window.SonoiteExperience?.audioManager?.duration ?? videoDuration;

    // Handle different durations (loop video if shorter than audio)
    let targetVideoTime;
    if (videoDuration < audioDuration) {
      targetVideoTime = audioTime % videoDuration;
    } else {
      targetVideoTime = audioTime;
    }

    // Only seek if drift exceeds tolerance
    const drift = Math.abs(this.video.currentTime - targetVideoTime);
    if (drift > this.syncTolerance) {
      this.video.currentTime = targetVideoTime;
      if (window.SONOITE_DEBUG) {
        console.log(`[AIVideoBackground] Sync correction: ${drift.toFixed(2)}s drift`);
      }
    }
  }

  setTrack(trackSlug) {
    this.trackSlug = trackSlug;
    this.currentSourceIndex = 0;
    this.videoLoaded = false;
    this.videoError = false;

    const basePath = `/wp-content/themes/sonoite-theme/public/assets/ai-backgrounds/${trackSlug}`;
    this.videoSources = [
      `${basePath}.webm`,
      `${basePath}.mp4`,
      `${basePath}.mov`
    ];

    // Remove old mesh
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }

    // Load new video
    this.video.src = this.videoSources[0];
    this.video.load();
  }

  play() {
    if (this.video && this.videoLoaded) {
      this.video.play().catch(() => {});
    }
  }

  pause() {
    if (this.video) {
      this.video.pause();
    }
  }

  unmount() {
    // Clean up video
    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video.load();
    }

    // Clean up textures
    if (this.videoTexture) {
      this.videoTexture.dispose();
    }
    if (this.fallbackTexture) {
      this.fallbackTexture.dispose();
    }

    // Clean up mesh
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
    }

    super.unmount();
  }
}

export default AIVideoBackground;
