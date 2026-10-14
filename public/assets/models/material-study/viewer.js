import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Standalone look-development page: no album runtime, audio or shared settings.
const views = [];
let syncing = false;
const loader = new GLTFLoader();
const assets = await Promise.all([
    loader.loadAsync('./source-smooth.glb'),
    loader.loadAsync('./material-regions-v1.glb'),
    loader.loadAsync('./source-flat.glb')
]).catch((error) => {
    document.querySelector('#status').textContent = `Asset load failed: ${error.message}`;
    throw error;
});

function fitAsset(root) {
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.sub(center);
    root.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => { material.envMapIntensity = 0.35; });
    });
    return root;
}

for (const [index, id] of ['left', 'right'].entries()) {
    const host = document.getElementById(id);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#131416');
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.5, 12);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);
    controls.update();
    const key = new THREE.DirectionalLight('#fff6e9', 3);
    key.position.set(-4, 6, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -5, near: 0.1, far: 30 });
    key.shadow.normalBias = 0.025;
    const fill = new THREE.HemisphereLight('#d8e1ec', '#252525', 0.65);
    const rim = new THREE.DirectionalLight('#d8e1ec', 1.7);
    rim.position.set(4, 3, -3);
    scene.add(key, fill, rim);
    const root = fitAsset(assets[index].scene);
    scene.add(root);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#171819', roughness: 0.95 }));
    floor.rotation.x = -Math.PI/2;
    floor.position.y = new THREE.Box3().setFromObject(root).min.y - 0.01;
    floor.receiveShadow = true;
    scene.add(floor);
    const view = { host, renderer, scene, camera, controls, root, key, fill, rim, floor, environment };
    views.push(view);
    controls.addEventListener('change', () => {
        if (syncing) return;
        syncing = true;
        views.filter((other) => other !== view).forEach((other) => {
            other.camera.position.copy(camera.position);
            other.controls.target.copy(controls.target);
            other.controls.update();
        });
        syncing = false;
        render();
    });
    new ResizeObserver(() => {
        const { width, height } = host.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width/height;
        camera.updateProjectionMatrix();
        render();
    }).observe(host);
}

function render() {
    views.forEach(({ renderer, scene, camera }) => renderer.render(scene, camera));
}

document.querySelectorAll('[data-angle]').forEach((button) => button.addEventListener('click', () => {
    const angle = Number(button.dataset.angle)*Math.PI/180;
    syncing = true;
    views.forEach(({ camera, controls }) => {
        camera.position.set(Math.sin(angle)*12, 0.5, Math.cos(angle)*12);
        controls.target.set(0, 0, 0);
        controls.update();
    });
    syncing = false;
    document.querySelectorAll('[data-angle]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
}));

document.querySelector('#lighting').addEventListener('change', (event) => {
    const mode = event.target.value;
    views.forEach(({ key, fill, rim, scene }) => {
        key.position.set(mode === 'cold' ? -6 : -4, mode === 'cold' ? 1 : 6, mode === 'cold' ? 1 : 6);
        key.color.set(mode === 'sodium' ? '#ffb755' : mode === 'cold' ? '#dce5f0' : '#fff6e9');
        key.intensity = mode === 'neutral' ? 3 : 2;
        fill.intensity = mode === 'neutral' ? 0.65 : 0.14;
        rim.color.set(mode === 'sodium' ? '#ffb755' : '#d8e1ec');
        rim.intensity = mode === 'neutral' ? 1.7 : 0.5;
        scene.background.set(mode === 'neutral' ? '#131416' : '#040405');
    });
    render();
});

const smooth = views[0].root;
const flat = fitAsset(assets[2].scene);
document.querySelector('#flat').addEventListener('change', (event) => {
    const view = views[0];
    view.scene.remove(view.root);
    view.root = event.target.checked ? flat : smooth;
    view.scene.add(view.root);
    render();
});
document.querySelector('#status').textContent = 'Ready · drag to rotate';
window.materialStudy = { views, render, assets };
render();
