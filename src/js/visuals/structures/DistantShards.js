import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

export class DistantShards extends VisualLayer {
  mount(){
    super.mount();
    const env = this.ctx?.envMap || null;
    this.material = new THREE.MeshPhysicalMaterial({
      transmission: 0.7, ior: 1.03, thickness: 0.15,
      roughness: 0.45, reflectivity: 0.08,
      color: '#cfd6df', envMap: env
    });

    // Shard geometry: thin tetra/prism variants
    const geos = [
      new THREE.ConeGeometry(0.08, 0.45, 3),
      new THREE.ConeGeometry(0.06, 0.38, 4),
      new THREE.CylinderGeometry(0.03, 0.08, 0.5, 5)
    ];
    geos.forEach(g => g.computeVertexNormals());

    this.shards = new THREE.Group();
    const count = Math.max(40, Math.min(this.cfg.count ?? 80, 200));
    for (let i=0;i<count;i++){
      const g = geos[i % geos.length].clone();
      const m = this.material.clone();
      const mesh = new THREE.Mesh(g, m);

      // place far & sparse
      mesh.position.set(
        (Math.random()-0.5)*10.0,
        (Math.random()-0.5)*4.0,
        -10.0 - Math.random()*10.0
      );
      mesh.rotation.set(Math.random()*0.4, Math.random()*Math.PI, Math.random()*0.4);
      const s = 0.25 + Math.random()*0.25; // make shards noticeably smaller
      mesh.scale.set(s, s, s);
      mesh.userData.baseOpacity = 0.05 + Math.random()*0.15;
      this.shards.add(mesh);
    }
    this.group.add(this.shards);

    this._ema={bass:0,loud:0}; this._alpha=0.22;
    this._t=0;
  }

  _s(k,v,a=this._alpha){ this._ema[k]=this._ema[k]*(1-a)+v*a; return this._ema[k]; }

  update(audio, dt){
    this._t += dt;
    const b=this._s('bass', Math.min(1,audio?.bass??0));
    const l=this._s('loud', Math.min(1,audio?.loudness??0));

    this.shards.children.forEach((m, i) => {
      // gentle shudder on bass
      const amp = 0.002 + b*0.006;
      m.rotation.y += amp;

      // appear/disappear with loudness (faint visibility)
      const base = m.userData.baseOpacity;
      const target = base + l*0.25;
      m.material.opacity = Math.min(0.35, target);
      m.material.transparent = true;
    });
  }

  unmount() {
    // Dispose geometries and materials
    this.shards.children.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    
    super.unmount();
  }
}
