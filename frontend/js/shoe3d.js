// shoe3d.js — Three.js 360° viewer for real scanned/reconstructed sneaker meshes.
// Rotation follows the cursor's horizontal position while hovering (classic
// product-360 UX); it idles with a slow auto-spin otherwise, and supports
// touch-drag on mobile. Falls back to a stylized procedural sneaker if a
// model file fails to load, so the section never renders empty.

const SHOE_MODELS = [
  { url: "models/shoe-classic.glb", name: "Sneaker Scan 1", color: 0xc9a24d },
  { url: "models/nike_air_max_90.glb", name: "Nike Air Max", color: 0x1a1a1a },
  { url: "models/newww.glb", name: "Sneaker Scan 3", color: 0xf3efe6 },
];

// ---- Fallback procedural sneaker (used only if a .glb fails to load) ----
function buildFallbackSneaker(color) {
  const group = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });

  const sole = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 1.0), soleMat);
  sole.position.set(0.05, -0.56, 0);
  group.add(sole);

  const segments = [
    { x: -1.05, w: 0.5, h: 0.78, d: 0.86, y: -0.02 },
    { x: -0.58, w: 0.56, h: 0.64, d: 0.92, y: -0.1 },
    { x: -0.08, w: 0.6, h: 0.58, d: 0.94, y: -0.14 },
    { x: 0.42, w: 0.56, h: 0.5, d: 0.9, y: -0.18 },
    { x: 0.86, w: 0.46, h: 0.36, d: 0.82, y: -0.24 },
    { x: 1.16, w: 0.3, h: 0.24, d: 0.66, y: -0.3 },
  ];
  segments.forEach((s) => {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mainMat);
    seg.position.set(s.x, s.y, 0);
    group.add(seg);
  });

  return group;
}

// ---- Center, re-orient (so the shoe's long axis faces the camera as width),
//      and scale any loaded mesh to a consistent on-screen size ----
function normalizeObject(object, targetSize) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  object.position.sub(center);

  const holder = new THREE.Group();
  holder.add(object);

  // Reconstructed meshes sometimes come out "depth-first" rather than
  // "width-first" — if so, rotate 90° so the profile reads left-to-right.
  if (size.z > size.x) {
    object.rotation.y = Math.PI / 2;
  }

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  holder.scale.setScalar(targetSize / maxDim);

  return holder;
}

function fixNormalsForShading(object) {
  object.traverse((child) => {
    if (child.isMesh && child.geometry && !child.geometry.attributes.normal) {
      // Some reconstructed meshes ship with POSITION only (no NORMAL
      // attribute), which leaves MeshStandardMaterial with nothing to shade
      // against — it renders essentially unlit/black. Only patch this when
      // normals are actually missing; otherwise leave the mesh's original
      // material completely alone so any real texture map (baseColorTexture
      // from a properly textured .glb) or embedded vertex colors keep
      // working exactly as GLTFLoader already set them up.
      child.geometry.computeVertexNormals();
    }
  });
}

function initShoeViewer(container, modelConfig) {
  const width = container.clientWidth || 300;
  const height = container.clientHeight || 300;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
  camera.position.set(0, 0.35, 4.4);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-2, 1, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xc9a24d, 0.6);
  rim.position.set(-3, 2, -4);
  scene.add(rim);

  // "shoe" is the group that gets rotated by the cursor; its contents
  // (the actual model) get swapped in once loading resolves.
  const shoe = new THREE.Group();
  scene.add(shoe);
  shoe.add(buildFallbackSneaker(modelConfig.color)); // shown until the real model loads

  const loader = new THREE.GLTFLoader();
  loader.load(
    modelConfig.url,
    (gltf) => {
      shoe.clear();
      const normalized = normalizeObject(gltf.scene, 2.4);
      fixNormalsForShading(normalized);
      shoe.add(normalized);
    },
    undefined,
    (err) => {
      console.warn(`Could not load ${modelConfig.url}, using fallback shoe.`, err);
      // fallback sneaker (already added above) stays in place
    }
  );

  let targetRotation = 0;
  let hovering = false;
  let dragging = false;
  let lastX = 0;

  container.addEventListener("mousemove", (e) => {
    hovering = true;
    const rect = container.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    targetRotation = (relX - 0.5) * Math.PI * 2.2;
  });
  container.addEventListener("mouseenter", () => { hovering = true; });
  container.addEventListener("mouseleave", () => { hovering = false; });

  container.addEventListener("touchstart", (e) => {
    dragging = true;
    hovering = true;
    lastX = e.touches[0].clientX;
  }, { passive: true });
  container.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - lastX;
    lastX = e.touches[0].clientX;
    targetRotation += dx * 0.02;
  }, { passive: true });
  container.addEventListener("touchend", () => { dragging = false; hovering = false; });

  function animate() {
    requestAnimationFrame(animate);
    if (!hovering) targetRotation += 0.004;
    shoe.rotation.y += (targetRotation - shoe.rotation.y) * 0.08;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const wraps = document.querySelectorAll(".shoe3d-canvas-wrap");
  if (wraps.length === 0 || typeof THREE === "undefined") return;

  if (typeof THREE.GLTFLoader === "undefined") {
    console.warn("THREE.GLTFLoader not found — check that GLTFLoader.js is loaded before shoe3d.js.");
    wraps.forEach((wrap, i) => {
      const scheme = SHOE_MODELS[i % SHOE_MODELS.length];
      initFallbackOnly(wrap, scheme);
    });
    return;
  }

  wraps.forEach((wrap, i) => initShoeViewer(wrap, SHOE_MODELS[i % SHOE_MODELS.length]));
});

// Used only in the (unlikely) case GLTFLoader itself didn't load at all.
function initFallbackOnly(container, modelConfig) {
  const width = container.clientWidth || 300;
  const height = container.clientHeight || 300;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
  camera.position.set(0, 0.35, 4.4);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 4, 5);
  scene.add(key);
  const shoe = buildFallbackSneaker(modelConfig.color);
  scene.add(shoe);
  let targetRotation = 0, hovering = false;
  container.addEventListener("mousemove", (e) => {
    hovering = true;
    const rect = container.getBoundingClientRect();
    targetRotation = (((e.clientX - rect.left) / rect.width) - 0.5) * Math.PI * 2.2;
  });
  container.addEventListener("mouseleave", () => { hovering = false; });
  function animate() {
    requestAnimationFrame(animate);
    if (!hovering) targetRotation += 0.004;
    shoe.rotation.y += (targetRotation - shoe.rotation.y) * 0.08;
    renderer.render(scene, camera);
  }
  animate();
}