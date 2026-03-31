/* ============================================================
   EdgeSentinel — Viewer JS (Three.js + Animations)
   ============================================================ */

import * as THREE from 'three';

// ============================================================
// SECTION 1: HERO — Particle Field + Rotating Shield
// ============================================================
function initHero() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  // Particle Field
  const particleCount = 3000;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x00f5ff, size: 0.03, transparent: true, opacity: 0.6 });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Shield (Icosahedron wireframe)
  const shieldGeo = new THREE.IcosahedronGeometry(1.4, 1);
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, wireframe: true, transparent: true, opacity: 0.35 });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  scene.add(shield);

  // Inner shield
  const innerGeo = new THREE.IcosahedronGeometry(1.0, 0);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x00b8c4, wireframe: true, transparent: true, opacity: 0.2 });
  const innerShield = new THREE.Mesh(innerGeo, innerMat);
  scene.add(innerShield);

  // Lights
  const pointLight = new THREE.PointLight(0x00f5ff, 2, 10);
  pointLight.position.set(0, 0, 3);
  scene.add(pointLight);
  scene.add(new THREE.AmbientLight(0x001133, 1));

  // Mouse parallax
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 0.3;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 0.3;
  });

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.005;

    shield.rotation.y += 0.004;
    shield.rotation.x += 0.001;
    innerShield.rotation.y -= 0.006;
    innerShield.rotation.z += 0.002;

    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.0001;

    // Parallax
    camera.position.x += (mouseX - camera.position.x) * 0.03;
    camera.position.y += (-mouseY - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    // Pulse shield opacity
    shieldMat.opacity = 0.25 + Math.sin(t) * 0.1;
    pointLight.intensity = 1.5 + Math.sin(t * 1.5) * 0.5;

    renderer.render(scene, camera);
  }
  animate();
}

// ============================================================
// SECTION 3: ZERO-TRUST — Old vs New Node Graph
// ============================================================
function initZeroTrustGraphs() {
  // -- OLD NETWORK (chaotic red) --
  const oldCanvas = document.getElementById('old-network-canvas');
  const newCanvas = document.getElementById('new-network-canvas');
  if (!oldCanvas || !newCanvas) return;

  function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(canvas.offsetWidth, canvas.offsetHeight);
    return r;
  }

  function makeScene() {
    const s = new THREE.Scene();
    const c = new THREE.OrthographicCamera(-3, 3, 2, -2, 0.1, 100);
    c.position.z = 5;
    return { scene: s, camera: c };
  }

  const { scene: oldScene, camera: oldCam } = makeScene();
  const { scene: newScene, camera: newCam } = makeScene();
  const oldRenderer = makeRenderer(oldCanvas);
  const newRenderer = makeRenderer(newCanvas);

  // Node positions (ring)
  const nodePositions = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    nodePositions.push(new THREE.Vector3(Math.cos(angle) * 2, Math.sin(angle) * 1.4, 0));
  }

  function makeNode(color, scene) {
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color });
    nodePositions.forEach(pos => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      scene.add(mesh);
    });
  }

  function makeLines(from, to, color, scene) {
    const pts = [from.clone(), to.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Line(geo, mat));
  }

  // OLD: all-to-all connections (red)
  makeNode(0xff2d55, oldScene);
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      makeLines(nodePositions[i], nodePositions[j], 0xff2d55, oldScene);
    }
  }

  // NEW: all through central gateway (cyan)
  makeNode(0x00f5ff, newScene);
  // Central gateway
  const gwGeo = new THREE.SphereGeometry(0.22, 12, 12);
  const gwMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  const gateway = new THREE.Mesh(gwGeo, gwMat);
  newScene.add(gateway);

  nodePositions.forEach(pos => {
    makeLines(new THREE.Vector3(0, 0, 0), pos, 0x00f5ff, newScene);
  });

  // Animated data packets
  const packets = [];
  function makePacket(scene, color) {
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
  }

  // Old = random node-to-node
  for (let i = 0; i < 3; i++) {
    const p = makePacket(oldScene, 0xff6680);
    const fromIdx = Math.floor(Math.random() * count);
    const toIdx = (fromIdx + 1 + Math.floor(Math.random() * (count - 1))) % count;
    packets.push({ mesh: p, from: nodePositions[fromIdx], to: nodePositions[toIdx], t: Math.random(), speed: 0.005 + Math.random() * 0.01, type: 'old' });
  }

  // New = node -> gateway -> node
  for (let i = 0; i < 3; i++) {
    const p = makePacket(newScene, 0x00f5ff);
    const idx = Math.floor(Math.random() * count);
    packets.push({ mesh: p, from: nodePositions[idx], to: new THREE.Vector3(0, 0, 0), t: Math.random(), speed: 0.008, type: 'new', nodeIdx: idx });
  }

  const tmpVec = new THREE.Vector3();

  function animateGraphs() {
    requestAnimationFrame(animateGraphs);

    packets.forEach(p => {
      p.t += p.speed;
      if (p.t > 1) {
        p.t = 0;
        if (p.type === 'old') {
          const fromIdx = Math.floor(Math.random() * count);
          const toIdx = (fromIdx + 1 + Math.floor(Math.random() * (count - 1))) % count;
          p.from = nodePositions[fromIdx];
          p.to = nodePositions[toIdx];
        } else {
          // flip direction: outward vs inward
          p.nodeIdx = Math.floor(Math.random() * count);
          p.from = nodePositions[p.nodeIdx];
          p.to = new THREE.Vector3(0, 0, 0);
        }
      }
      tmpVec.lerpVectors(p.from, p.to, p.t);
      p.mesh.position.copy(tmpVec);
    });

    // Pulse gateway
    const s = 1 + Math.sin(Date.now() * 0.003) * 0.1;
    gateway.scale.setScalar(s);

    oldRenderer.render(oldScene, oldCam);
    newRenderer.render(newScene, newCam);
  }
  animateGraphs();
}

// ============================================================
// SECTION 4: 5 LAYERS — 3D Stacked Planes
// ============================================================
const LAYER_COLORS = [0x00f5ff, 0x00ff88, 0xbf5af2, 0xff9500, 0xff2d55];
const LAYER_NAMES  = ['ATECC608B', 'mTLS', 'WireGuard', 'eBPF', 'OPA'];

function initLayers() {
  const wrap = document.getElementById('layers-canvas-wrap');
  if (!wrap) return;

  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
  camera.position.set(0, 2, 6);
  camera.lookAt(0, 0, 0);

  const planes = [];
  for (let i = 0; i < 5; i++) {
    const y = (2 - i) * 1.2;
    const geo = new THREE.PlaneGeometry(4, 0.7);
    const mat = new THREE.MeshBasicMaterial({
      color: LAYER_COLORS[i],
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    mesh.rotation.x = -Math.PI / 8;
    scene.add(mesh);

    // Edges
    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: LAYER_COLORS[i], transparent: true, opacity: 0.8 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.y = y;
    edges.rotation.x = -Math.PI / 8;
    scene.add(edges);

    planes.push({ mesh, edges, mat, edgeMat, y, color: LAYER_COLORS[i] });
  }

  let activePlane = -1;
  let targetCamY = 2;

  // Listen to layer tab clicks
  document.querySelectorAll('.layer-tab').forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      activePlane = idx;
      targetCamY = planes[idx].y * 0.5;
    });
  });

  // Scroll-based camera movement
  const layerSection = document.getElementById('layers');
  let scrollStart = 0, scrollEnd = 0;

  function updateScrollBounds() {
    if (layerSection) {
      const rect = layerSection.getBoundingClientRect();
      scrollStart = window.scrollY + rect.top;
      scrollEnd   = scrollStart + layerSection.offsetHeight;
    }
  }

  window.addEventListener('scroll', () => {
    updateScrollBounds();
    const progress = Math.max(0, Math.min(1, (window.scrollY - scrollStart) / (scrollEnd - scrollStart)));
    targetCamY = 2 - progress * 5;
  });

  updateScrollBounds();

  function animate() {
    requestAnimationFrame(animate);

    camera.position.y += (targetCamY - camera.position.y) * 0.05;
    camera.lookAt(0, camera.position.y - 2, 0);

    const t = Date.now() * 0.001;
    planes.forEach((p, i) => {
      const isActive = activePlane === i;
      const pulse = isActive ? 0.35 + Math.sin(t * 3) * 0.1 : 0.1 + Math.sin(t + i) * 0.05;
      p.mat.opacity = pulse;
      p.edgeMat.opacity = isActive ? 1 : 0.6 + Math.sin(t + i) * 0.2;
      p.mesh.position.x = isActive ? Math.sin(t * 2) * 0.05 : 0;
    });

    renderer.render(scene, camera);
  }
  animate();
}

// ============================================================
// SECTION 6: ARCHITECTURE — Animated Data Flow
// ============================================================
function initArchitecture() {
  const wrap = document.getElementById('arch-canvas-wrap');
  if (!wrap) return;

  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);

  const W = wrap.clientWidth, H = wrap.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
  camera.position.set(0, 1, 8);
  camera.lookAt(0, 0, 0);

  // Helper: create a glowing box
  function makeBox(pos, size, color, opacity = 0.2) {
    const geo = new THREE.BoxGeometry(...size);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, wireframe: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    scene.add(mesh);

    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.set(...pos);
    scene.add(edges);

    return mesh;
  }

  // Devices (left cluster)
  const esp32   = makeBox([-4, 1, 0],  [0.6, 0.4, 0.4], 0x00f5ff);
  const piZero  = makeBox([-4, 0, 0],  [0.6, 0.4, 0.4], 0x00ff88);
  const rogueEsp= makeBox([-4, -1, 0], [0.6, 0.4, 0.4], 0xff2d55);

  // Gateway (center)
  const gateway = makeBox([0, 0, 0], [1.2, 2.5, 0.6], 0x00f5ff, 0.12);

  // Service boxes (right)
  const serviceColors = [0x00f5ff, 0x00ff88, 0xbf5af2, 0xff9500, 0xff2d55];
  const serviceY = [1.2, 0.6, 0, -0.6, -1.2];
  serviceY.forEach((y, i) => makeBox([3.5, y, 0], [0.8, 0.35, 0.3], serviceColors[i]));

  // Animated packets along paths
  const packetGeo = new THREE.SphereGeometry(0.07, 8, 8);

  function makePath(from, to, color, speed, blocked = false) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(packetGeo, mat);
    scene.add(sphere);

    // Line
    const pts = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 });
    scene.add(new THREE.Line(lineGeo, lineMat));

    return { sphere, from: new THREE.Vector3(...from), to: new THREE.Vector3(...to), t: Math.random(), speed, blocked, mat };
  }

  const paths = [
    makePath([-3.7, 1, 0],  [-0.6, 0, 0], 0x00f5ff, 0.006),  // ESP32 -> GW
    makePath([-3.7, 0, 0],  [-0.6, 0, 0], 0x00ff88, 0.005),  // Pi Zero -> GW
    makePath([-3.7, -1, 0], [-0.6, 0, 0], 0xff2d55, 0.008, true), // Rogue -> GW (blocked)
    // GW -> services
    makePath([0.6, 0, 0], [3.1, 1.2, 0],  0x00f5ff, 0.007),
    makePath([0.6, 0, 0], [3.1, 0.6, 0],  0x00ff88, 0.006),
    makePath([0.6, 0, 0], [3.1, 0, 0],    0xbf5af2, 0.005),
    makePath([0.6, 0, 0], [3.1, -0.6, 0], 0xff9500, 0.007),
    makePath([0.6, 0, 0], [3.1, -1.2, 0], 0xff2d55, 0.006),
  ];

  const tmpVec = new THREE.Vector3();

  function animateArch() {
    requestAnimationFrame(animateArch);

    const t = Date.now() * 0.001;

    paths.forEach(p => {
      p.t += p.speed;
      if (p.t > 1) p.t = 0;

      if (p.blocked && p.t > 0.5) {
        // Bounce back
        const bounce = 1 - p.t;
        tmpVec.lerpVectors(p.from, p.to, bounce + 0.5);
        p.mat.opacity = Math.max(0, 1 - (p.t - 0.5) * 3);
      } else {
        tmpVec.lerpVectors(p.from, p.to, p.t);
        p.mat.opacity = 1;
      }
      p.sphere.position.copy(tmpVec);
    });

    // Gateway pulse
    gateway.scale.setScalar(1 + Math.sin(t * 2) * 0.02);

    renderer.render(scene, camera);
  }
  animateArch();
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ============================================================
// ATTACK VS DEFENCE TABLE ANIMATION
// ============================================================
function initAttackDefence() {
  const table = document.querySelector('.ad-table');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      rows.forEach((row, i) => {
        setTimeout(() => row.classList.add('visible'), i * 120);
      });
      observer.disconnect();
    }
  }, { threshold: 0.2 });

  observer.observe(table);

  // Animate "0%" counter
  const counterEl = document.querySelector('.success-rate .counter');
  if (counterEl) {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        let val = 100;
        const interval = setInterval(() => {
          val -= 2;
          counterEl.textContent = val + '%';
          if (val <= 0) {
            counterEl.textContent = '0%';
            clearInterval(interval);
          }
        }, 30);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(counterEl);
  }
}

// ============================================================
// WIN COUNTER ANIMATION
// ============================================================
function initCounters() {
  document.querySelectorAll('[data-count-to]').forEach(el => {
    const target = parseFloat(el.dataset.countTo);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';

    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        let cur = 0;
        const step = target / 60;
        const interval = setInterval(() => {
          cur += step;
          if (cur >= target) { cur = target; clearInterval(interval); }
          el.textContent = prefix + Math.round(cur) + suffix;
        }, 20);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
  });
}

// ============================================================
// DEMO TIMELINE
// ============================================================
function initTimeline() {
  document.querySelectorAll('.timeline-step').forEach(step => {
    step.addEventListener('click', () => {
      step.classList.toggle('active');
    });
  });
}

// ============================================================
// LAYER TABS
// ============================================================
function initLayerTabs() {
  document.querySelectorAll('.layer-tab').forEach((tab, i, all) => {
    tab.addEventListener('click', () => {
      all.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

// ============================================================
// GLOSSARY SEARCH
// ============================================================
function initGlossary() {
  const input = document.querySelector('.glossary-search input');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll('.gloss-card').forEach(card => {
      const term = card.querySelector('.gloss-front h4').textContent.toLowerCase();
      card.style.display = term.includes(q) ? '' : 'none';
    });
  });
}

// ============================================================
// NAV SMOOTH + ACTIVE
// ============================================================
function initNav() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-links a');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => {
          link.style.color = link.getAttribute('href') === '#' + entry.target.id
            ? 'var(--cyan)' : '';
        });
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ============================================================
// INIT ALL
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initZeroTrustGraphs();
  initLayers();
  initArchitecture();
  initScrollReveal();
  initAttackDefence();
  initCounters();
  initTimeline();
  initLayerTabs();
  initGlossary();
  initNav();
});
