import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const app = document.getElementById('app');
const loading = document.getElementById('loading');
const fill = document.getElementById('fill');
const pct = document.getElementById('pct');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#efb489');
scene.fog = new THREE.Fog('#efb489', 320, 1600);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.4, 8000);
camera.position.set(0, 24, 45);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 22, -60);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 8;
controls.maxDistance = 1200;
controls.autoRotateSpeed = 0.35;

// 与渲染一致的暖色环境
scene.add(new THREE.HemisphereLight('#ffd8bc', '#4a241b', 1.25));
scene.add(new THREE.AmbientLight('#ffd9c0', 0.22));

const key = new THREE.DirectionalLight('#ffd2bc', 1.9);
key.position.set(-120, 220, -260);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -360;
key.shadow.camera.right = 360;
key.shadow.camera.top = 360;
key.shadow.camera.bottom = -360;
key.shadow.camera.near = 20;
key.shadow.camera.far = 1200;
key.shadow.bias = -0.0006;
key.target.position.set(0, 0, -80);
scene.add(key.target);
scene.add(key);

const fillLight = new THREE.DirectionalLight('#ffe0d0', 0.85);
fillLight.position.set(120, 130, 300);
scene.add(fillLight);

const rim = new THREE.DirectionalLight('#ff9c66', 0.7);
rim.position.set(160, 40, -80);
scene.add(rim);

const VIEWS = {
  A: { pos: [0, 24, 45], target: [0, 22, -60], hfov: 65.5 },
  in: { pos: [0, 22, -30], target: [0, 24, 45], hfov: 73.7 },
  B: { pos: [200, 70, -180], target: [0, 28, -10], hfov: 48.5 },
  ext: { pos: [160, 45, 115], target: [22, 32, -26], hfov: 65.5 },
  over: { pos: [80, 170, 260], target: [10, 10, -70], hfov: 73.7 },
};

function fovForAspect(hfovDeg, aspect) {
  const h = (hfovDeg * Math.PI) / 180;
  return (2 * Math.atan(Math.tan(h / 2) / aspect) * 180) / Math.PI;
}

let model = null;
let wireframe = false;
let activeView = 'A';

// 分镜布景：A 机位隐藏 B_ 前缀对象，B 机位隐藏 A_ 前缀对象；总览全开。
function objectGroup(obj) {
  let p = obj;
  while (p && p !== model) {
    if (p.name && /^[AB]_/.test(p.name)) return p.name[0];
    p = p.parent;
  }
  return '';
}

function applySetVisibility(view) {
  if (!model) return;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const g = objectGroup(o);
    if (!g) { o.visible = true; return; }
    if (view === 'A') o.visible = g !== 'B';
    else if (view === 'B') o.visible = g !== 'A';
    else o.visible = true;
  });
}

function applyView(name, animate = true) {
  const v = VIEWS[name];
  if (!v) return;
  activeView = name;
  applySetVisibility(name);
  camera.fov = fovForAspect(v.hfov, camera.aspect);
  camera.updateProjectionMatrix();
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const toPos = new THREE.Vector3(...v.pos);
  const toTarget = new THREE.Vector3(...v.target);

  if (!animate) {
    camera.position.copy(toPos);
    controls.target.copy(toTarget);
    controls.update();
    return;
  }

  const start = performance.now();
  const dur = 650;
  controls.enabled = false;
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    camera.lookAt(controls.target);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      controls.enabled = true;
      controls.update();
    }
  }
  requestAnimationFrame(step);
}

function setActiveButton(name) {
  document.querySelectorAll('[data-view]').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === name);
  });
}

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setActiveButton(btn.dataset.view);
    applyView(btn.dataset.view, true);
  });
});

document.getElementById('wire').addEventListener('click', (e) => {
  if (!model) return;
  wireframe = !wireframe;
  model.traverse((o) => {
    if (o.isMesh && o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { m.wireframe = wireframe; });
    }
  });
  e.currentTarget.classList.toggle('active', wireframe);
});

document.getElementById('spin').addEventListener('click', (e) => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.classList.toggle('active', controls.autoRotate);
});

document.getElementById('reset').addEventListener('click', () => {
  setActiveButton('A');
  applyView('A', true);
});

window.addEventListener('keydown', (e) => {
  if (e.key === '1') { setActiveButton('A'); applyView('A', true); }
  if (e.key === '2') { setActiveButton('B'); applyView('B', true); }
  if (e.key === '3') { setActiveButton('ext'); applyView('ext', true); }
  if (e.key === '4') { setActiveButton('over'); applyView('over', true); }
  if (e.key === '5') { setActiveButton('in'); applyView('in', true); }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = fovForAspect(VIEWS[activeView].hfov, camera.aspect);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const loader = new GLTFLoader();
loader.load(
  './gothic_aqueduct.glb',
  (gltf) => {
    model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = true;
        if (o.material) o.material.envMapIntensity = 0.4;
        if (o.name !== 'SKY_backdrop') {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      }
    });
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    controls.maxDistance = Math.max(120, size.length() * 1.1);

    const params = new URLSearchParams(location.search);
    const initial = ['A', 'B', 'in', 'ext', 'over'].includes(params.get('view'))
      ? params.get('view') : 'A';
    setActiveButton(initial);
    applyView(initial, false);
    loading.classList.add('hide');
    setTimeout(() => loading.remove(), 700);
  },
  (xhr) => {
    if (xhr.total) {
      const p = Math.round((xhr.loaded / xhr.total) * 100);
      fill.style.width = p + '%';
      pct.textContent = p + '%';
    } else {
      pct.textContent = Math.round(xhr.loaded / 1048576) + ' MB';
    }
  },
  (err) => {
    pct.textContent = '加载失败：' + err;
    console.error(err);
  }
);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();





