// 3D view of the base (three.js + Bexultan's FBX models). Optional: game.js falls back to the SVG scene
// if WebGL or a model fails. Units are metres; models have their pivot at the base centre.
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const FILES = {
  habitat: "SM_Module_Habitat", greenhouse: "SM_Module_Greenhouse", solar: "SM_Module_SolarPanel",
  station: "SM_Module_WeatherStation", shelter: "SM_Module_Shelter", battery: "SM_Module_Battery",
  astronaut: "SM_Astronaut",
  rock1: "SM_Decor_Rock_01", rock2: "SM_Decor_Rock_02", rock3: "SM_Decor_Rock_03", rock4: "SM_Decor_Rock_04",
};

const SKY = { calm: ["#2a1530", "#c46a42"], dust: ["#7a4a2a", "#d39a62"] };
const lerpColor = (c, hex, k) => c.lerp(new THREE.Color(hex), k);

/** Merge all meshes of a model into one (one draw call); keeps the group if shapes don't match. */
function mergeModel(root) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const material = [].concat(meshes[0].material)[0];
  const geos = meshes.map((m) => {
    let g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    return g;
  });
  const merged = geos.every((g) => g.attributes.uv && g.attributes.normal) ? mergeGeometries(geos, false) : null;
  if (!merged) return root;
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = root.name;
  return mesh;
}

function makeSky() {
  const geo = new THREE.SphereGeometry(600, 32, 16);
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  const top = new THREE.Color(), bottom = new THREE.Color(), tmp = new THREE.Color();
  mesh.userData.paint = (topHex, bottomHex) => {
    top.set(topHex); bottom.set(bottomHex);
    const pos = geo.attributes.position, col = geo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const k = THREE.MathUtils.clamp(pos.getY(i) / 600, 0, 1) ** 0.6;
      tmp.copy(bottom).lerp(top, k);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  };
  return mesh;
}

function makeGround() {
  const geo = new THREE.PlaneGeometry(700, 700, 90, 90);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    const far = THREE.MathUtils.smoothstep(r, 55, 140);
    pos.setY(i, far * (Math.sin(x * 0.05) * Math.cos(z * 0.04) * 3 + Math.sin(x * 0.13 + z * 0.07) * 1.2) - 0.05);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#b35a2e", roughness: 1, flatShading: true }));
  mesh.receiveShadow = true;
  return mesh;
}

function makeMountains() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#8c4224", roughness: 1, flatShading: true });
  const peaks = [[0, -260, 80, 75], [-120, -230, 55, 40], [130, -240, 60, 45], [-230, -150, 50, 35], [240, -140, 55, 38],
    [-60, -300, 70, 50], [80, -310, 65, 48], [-280, 20, 45, 28], [290, 30, 40, 26]];
  for (const [x, z, r, h] of peaks) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), mat);
    m.position.set(x, h / 2 - 2, z);
    m.rotation.y = x * 0.01;
    g.add(m);
  }
  return g;
}

function makeStreaks(n) {
  const pos = new Float32Array(n * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#ff7a9a", transparent: true, opacity: 0.85, fog: false }));
  const seeds = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0, v: 0 }));
  const reset = (s, anyY) => {
    s.x = THREE.MathUtils.randFloat(-60, 90); s.z = THREE.MathUtils.randFloat(-40, 40);
    s.y = anyY ? THREE.MathUtils.randFloat(0, 80) : THREE.MathUtils.randFloat(60, 90); s.v = THREE.MathUtils.randFloat(40, 70);
  };
  seeds.forEach((s) => reset(s, true));
  lines.userData.step = (dt) => {
    seeds.forEach((s, i) => {
      s.y -= s.v * dt; s.x -= s.v * dt * 0.6;
      if (s.y < 0) reset(s, false);
      pos.set([s.x, s.y, s.z, s.x + 3, s.y + 5, s.z], i * 6);
    });
    geo.attributes.position.needsUpdate = true;
  };
  lines.frustumCulled = false;
  return lines;
}

function makeDust(n) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([THREE.MathUtils.randFloat(-90, 90), THREE.MathUtils.randFloat(0, 25), THREE.MathUtils.randFloat(-60, 50)], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#e0a870", size: 0.7, transparent: true, opacity: 0.8 }));
  pts.userData.step = (dt) => {
    for (let i = 0; i < n; i++) {
      let x = pos[i * 3] + dt * (18 + (i % 7) * 3);
      if (x > 90) x = -90;
      pos[i * 3] = x;
    }
    geo.attributes.position.needsUpdate = true;
  };
  pts.frustumCulled = false;
  return pts;
}

export async function createScene3D(wrap) {
  const canvas = document.createElement("canvas");
  canvas.className = "scene3d";
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  } catch {
    return null; // no WebGL
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const small = Math.min(screen.width, screen.height) < 600;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---- models (all textures point to the one shared colour palette)
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => (/\.(png|jpe?g|tga)$/i.test(url) ? "models/palette.png" : url));
  const loader = new FBXLoader(manager);
  const entries = await Promise.all(Object.entries(FILES).map(async ([key, file]) => {
    const root = await loader.loadAsync(`models/${file}.fbx`);
    return [key, root];
  }));
  const M = {};
  for (const [key, root] of entries) {
    const obj = mergeModel(root);
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      for (const m of [].concat(o.material)) {
        if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.magFilter = THREE.NearestFilter; m.map.needsUpdate = true; }
        m.shininess = 8;
      }
    });
    M[key] = obj;
  }

  // ---- scene
  const scene = new THREE.Scene();
  const sky = makeSky(); scene.add(sky);
  scene.fog = new THREE.Fog("#c46a42", 120, 520);
  scene.add(makeGround(), makeMountains());

  const hemi = new THREE.HemisphereLight("#ffe2c4", "#6b3020", 1.1);
  const sun = new THREE.DirectionalLight("#fff0d6", 2.4);
  sun.position.set(70, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 10, far: 250 });
  scene.add(hemi, sun);
  const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff1c8", fog: false, transparent: true }));
  sunDisk.position.set(170, 120, -330);
  scene.add(sunDisk);

  const place = (obj, x, z, rotY = 0, s = 1) => { obj.position.set(x, 0, z); obj.rotation.y = rotY; obj.scale.setScalar(s); scene.add(obj); return obj; };
  place(M.habitat, 0, 0);
  const shelter = place(M.shelter, -25, -4);
  place(M.greenhouse, 25, -5);
  [-31, -22, -13].forEach((x, i) => place(i === 0 ? M.solar : M.solar.clone(), x, 21, 0.15));
  place(M.battery, -40, -22, 0.4);
  const station = place(M.station, 13, 17, -0.4);
  const astro = place(M.astronaut, 14, 32, -0.6, 1.5);
  const rocks = [M.rock1, M.rock2, M.rock3, M.rock4];
  [[38, 14, 1.6], [-42, 15, 1.4], [42, -22, 2.2], [-46, -18, 2], [-34, 34, 1.1], [-20, 40, 1.3], [30, 34, 1.2], [-6, -26, 1.8]]
    .forEach(([x, z, s], i) => place(i < 4 ? rocks[i] : rocks[i % 4].clone(), x, z, i * 1.3, s));

  // storm shield: translucent dome over the habitat (the shelter also glows)
  const dome = new THREE.Group();
  const domeGeo = new THREE.SphereGeometry(15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeFill = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ color: "#9d8cff", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  const domeWire = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ color: "#c9bfff", wireframe: true, transparent: true, opacity: 0.18 }));
  dome.add(domeFill, domeWire);
  dome.position.set(0, 0, 0);
  scene.add(dome);

  const streaks = makeStreaks(140); scene.add(streaks);
  const dust = makeDust(500); scene.add(dust);

  const camera = new THREE.PerspectiveCamera(34, 2, 0.5, 1500);
  const look = new THREE.Vector3(-3, 6, -6);

  // ---- state from the game
  const target = { solar: false, dust: false, solarFactor: 1, shield: 0, station: false, science: 0 };
  let skyKey = "";
  const fogCalm = new THREE.Color("#c46a42"), fogDust = new THREE.Color("#c98a55");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function update(s) {
    Object.assign(target, s);
    const key = target.dust ? "dust" : "calm";
    if (key !== skyKey) { sky.userData.paint(...SKY[key]); skyKey = key; }
    station.visible = !!target.station;
    astro.visible = target.science > 0;
    dome.visible = target.shield > 0;
    domeFill.material.opacity = 0.08 + 0.035 * target.shield;
    streaks.visible = !!target.solar;
    dust.visible = !!target.dust;
    for (const m of [].concat(shelter.material || [])) {
      if (m.emissive) m.emissive.set(target.shield > 0 ? "#3a2c80" : "#000000");
    }
  }

  // ---- size + loop
  wrap.appendChild(canvas);
  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep about the same width of the base in view whatever the panel shape
    const hHalf = Math.tan(THREE.MathUtils.degToRad(31));
    camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(hHalf / camera.aspect)), 28, 70);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(wrap);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    // camera: slow sway around the base
    const sway = reduced ? 0 : Math.sin(t * 0.12) * 6;
    camera.position.set(2 + sway, 11, 62);
    camera.lookAt(look);
    // light follows the sun power and storms
    const sf = target.solarFactor ?? 1;
    sun.intensity = THREE.MathUtils.lerp(sun.intensity, 0.6 + 1.9 * sf, 0.05);
    sunDisk.material.opacity = THREE.MathUtils.lerp(sunDisk.material.opacity, 0.25 + 0.75 * sf, 0.05);
    const flash = target.solar && !reduced ? 0.5 + 0.5 * Math.sin(t * 3) : target.solar ? 1 : 0;
    hemi.color.set("#ffe2c4"); if (flash) lerpColor(hemi.color, "#ff7d96", 0.45 * flash);
    scene.fog.color.lerp(target.dust ? fogDust : fogCalm, 0.05);
    scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, target.dust ? 15 : 120, 0.05);
    scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, target.dust ? 170 : 520, 0.05);
    if (streaks.visible) streaks.userData.step(reduced ? 0 : dt);
    if (dust.visible && !reduced) dust.userData.step(dt);
    if (astro.visible && !reduced) {
      astro.position.x = 14 + Math.sin(t * 0.5) * 6;
      astro.rotation.y = Math.cos(t * 0.5) > 0 ? Math.PI / 2 - 0.3 : -Math.PI / 2 + 0.3;
      astro.position.y = Math.abs(Math.sin(t * 3)) * 0.25;
    }
    if (dome.visible && !reduced) domeWire.rotation.y = t * 0.05;
    renderer.render(scene, camera);
  });

  update(target);
  return { update };
}
