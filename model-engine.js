import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEFAULTS } from './settings-schema.mjs';

function makeStage(canvasHost, thumbnail = false, initialSettings = DEFAULTS) {
  let settings = initialSettings;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: thumbnail });
  renderer.setPixelRatio(thumbnail ? 1 : Math.min(devicePixelRatio, settings.pixelRatio));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdceeff, 0x3c4455, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9abfff, 2); rim.position.set(-5, 2, -4); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(38, 1, .01, 10000);
  const controls = thumbnail ? null : new OrbitControls(camera, renderer.domElement);
  if (canvasHost) canvasHost.append(renderer.domElement);
  function render() { renderer.render(scene, camera); }
  function resize() {
    const w = thumbnail ? Number(settings.thumbnailResolution) : Math.max(1, canvasHost.clientWidth);
    const h = thumbnail ? Number(settings.thumbnailResolution)*.75 : Math.max(1, canvasHost.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
  }
  if (controls) { controls.addEventListener('change', render); new ResizeObserver(resize).observe(canvasHost); }
  const lights=scene.children.filter(item=>item.isLight);
  lights.forEach(light=>{light.userData.baseIntensity=light.intensity;});
  function configure(next) {
    settings=next;
    renderer.setPixelRatio(thumbnail?1:Math.min(devicePixelRatio,settings.pixelRatio));
    renderer.setClearColor(thumbnail?0:settings.background,thumbnail?0:1);
    lights.forEach(light=>{light.intensity=light.userData.baseIntensity*settings.lighting;});
    if(controls) {
      controls.rotateSpeed=settings.rotateSpeed;controls.zoomSpeed=settings.zoomSpeed;controls.panSpeed=settings.panSpeed;
      controls.autoRotate=settings.autoRotate;controls.autoRotateSpeed=settings.autoRotateSpeed;
      let previous=0;
      renderer.setAnimationLoop(settings.autoRotate ? time=>{const delta=previous?Math.min((time-previous)/1000,.1):0;previous=time;controls.update(delta);} : null);
    }
    resize();
  }
  configure(settings);
  return { renderer, scene, camera, controls, render, resize, configure };
}

function dispose(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(item => {
    if (item.geometry) geometries.add(item.geometry);
    for (const material of [].concat(item.material || [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}

function parseModel(bytes, type, settings = DEFAULTS) {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  let object;
  if (type === 'STL') {
    const geometry = new STLLoader().parse(data);
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
    object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: settings.modelColor, metalness: .08, roughness: .52, side: THREE.DoubleSide }));
  } else {
    object = new ThreeMFLoader().parse(data);
    object.traverse(item => {
      for (const material of [].concat(item.material || [])) material.side = THREE.DoubleSide;
    });
  }
  // Printing files conventionally use Z-up; OrbitControls uses Y-up.
  const group = new THREE.Group(); group.add(object); group.rotation.x = -Math.PI / 2;
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
  if (box.isEmpty() || ![size.x, size.y, size.z].every(Number.isFinite) || size.length() === 0) {
    dispose(group); throw new Error('This file contains no viewable geometry.');
  }
  let triangles = 0;
  group.traverse(item => { if (item.isMesh) triangles += (item.geometry.index?.count ?? item.geometry.attributes.position?.count ?? 0) / 3; });
  // Shift the wrapper rather than modifying original geometry.
  const wrapper = new THREE.Group(); wrapper.add(group);
  wrapper.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-1);
  wrapper.updateMatrixWorld(true);
  wrapper.userData = { size, triangles: Math.round(triangles) };
  return wrapper;
}

function fit(targetStage, model, view = 'iso') {
  if (!model) return;
  const { camera, controls } = targetStage;
  const radius = model.userData.size.length() / 2;
  const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.15;
  const direction = { iso: [1, .75, 1], front: [0, 0, 1], top: [0, 1, .00001], right: [1, 0, 0] }[view];
  camera.position.fromArray(direction).normalize().multiplyScalar(distance);
  camera.near = Math.max(radius / 10000, .000001); camera.far = radius * 1000;
  camera.updateProjectionMatrix(); camera.lookAt(0, 0, 0);
  if (controls) { controls.target.set(0, 0, 0); controls.minDistance = radius * .03; controls.maxDistance = radius * 100; controls.update(); }
  targetStage.render();
}


export { makeStage, parseModel, fit, dispose };
