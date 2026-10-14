import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

export class GlitchingCage extends VisualLayer {
  mount(){
    super.mount();
    const color = this.ctx?.palette?.accent || '#d7d7e0';

    // thin wire cube (edges)
    const cageG = new THREE.BoxGeometry(2.6, 2.6, 2.6, 4, 4, 4);
    const edges = new THREE.EdgesGeometry(cageG, 20);
    const mat = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.55 });
    this.wire = new THREE.LineSegments(edges, mat);
    this.group.add(this.wire);

    this._ema={bass:0,mid:0,treble:0,loud:0}; this._alpha=0.18;
    this._t=0;
  }
  _s(k,v,a=this._alpha){ this._ema[k]=this._ema[k]*(1-a)+v*a; return this._ema[k]; }

  update(audio, dt){
    this._t += dt;
    const b=this._s('bass',  Math.min(1,audio?.bass??0));
    const m=this._s('mid',   Math.min(1,audio?.mid??0));
    const t=this._s('treble',Math.min(1,audio?.treble??0));
    const l=this._s('loud',  Math.min(1,audio?.loudness??0));

    // "veiled" vibrato: tiny vertex jitter via object-space rotation wiggle
    const wig = 0.001 + b*0.004;     // bass → gentle vibrato
    this.wire.rotation.x = Math.sin(this._t*2.7)*wig;
    this.wire.rotation.y = Math.cos(this._t*2.1)*wig;

    // shimmer on treble = opacity mod
    this.wire.material.opacity = 0.45 + t*0.20;

    // slow precession
    this.group.rotation.y += dt * 0.08 * (0.6 + 0.4*m);

    // small breath with loudness
    const s = 1.0 + l*0.05;
    this.group.scale.setScalar(s);
  }

  unmount() {
    if (this.wire) {
      if (this.wire.geometry) this.wire.geometry.dispose();
      if (this.wire.material) this.wire.material.dispose();
    }
    super.unmount();
  }
}