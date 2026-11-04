// Real 3D laptop (Three.js) for the scroll-scrubbed intro on index.html.
// Replaces the earlier flat-CSS version: actual geometry, real lighting,
// a soft contact shadow, and a metal material that picks up specular
// highlights as the device rotates — things flat divs can't do.
//
// Driven by the exact same scroll-progress idea as the rest of the site's
// scroll effects: ".laptop-zoom" is a tall wrapper, ".laptop-stage" is
// sticky inside it, and scrolling through that extra height produces a
// 0..1 progress value this file maps onto the lid hinge, the device's
// rise/settle, and the push-in zoom. No autoplay — it renders a frame
// only when scroll moves, so it holds exactly still when you stop.

window.initLaptopScene = function initLaptopScene() {
  const wrap = document.querySelector('.laptop-zoom');
  const canvas = document.getElementById('laptopCanvas');
  if (!wrap || !canvas || typeof THREE === 'undefined') return;

  // ---- renderer / scene / camera -----------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.62, 5.6);
  camera.lookAt(0, 0.35, 0);

  function fitRenderer() {
    const w = wrap.clientWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  fitRenderer();

  // ---- lighting -------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x8ea0c8, 0.55));

  const key = new THREE.DirectionalLight(0xfff3e8, 1.55);
  key.position.set(3.2, 4.4, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 14;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x6f8fd6, 0.55);
  fill.position.set(-4, 1.6, 2.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xff8f78, 0.9);
  rim.position.set(-1.6, 2.4, -4);
  scene.add(rim);

  // contact shadow
  const shadowGeo = new THREE.PlaneGeometry(10, 10);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.45 });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.52;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ---- helpers ----------------------------------------------------------
  function roundedRectShape(w, d, r) {
    const shape = new THREE.Shape();
    const x = -w / 2, y = -d / 2;
    shape.moveTo(x, y + r);
    shape.lineTo(x, y + d - r);
    shape.quadraticCurveTo(x, y + d, x + r, y + d);
    shape.lineTo(x + w - r, y + d);
    shape.quadraticCurveTo(x + w, y + d, x + w, y + d - r);
    shape.lineTo(x + w, y + r);
    shape.quadraticCurveTo(x + w, y, x + w - r, y);
    shape.lineTo(x + r, y);
    shape.quadraticCurveTo(x, y, x, y + r);
    return shape;
  }

  // a flat rounded slab lying in the XZ plane (W wide, D deep), thickness T,
  // built by extruding in the shape's local "Y" then laying it down flat
  function roundedSlab(w, d, t, radius, material) {
    const shape = roundedRectShape(w, d, radius);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: t, bevelEnabled: true, bevelThickness: t * 0.22, bevelSize: t * 0.22, bevelSegments: 2, curveSegments: 8,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -t / 2, 0);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function canvasTexture(draw, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  // ---- materials ----------------------------------------------------
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xaeb4c0, metalness: 0.82, roughness: 0.28, side: THREE.DoubleSide });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.35, roughness: 0.55, side: THREE.DoubleSide });

  const keyboardTex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1c1e24'; ctx.fillRect(0, 0, w, h);
    const cols = 15, rows = 5, gap = 6;
    const kw = (w - gap * (cols + 1)) / cols, kh = (h - gap * (rows + 1)) / rows;
    ctx.fillStyle = '#2d303a';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = gap + c * (kw + gap), y = gap + r * (kh + gap);
        const rad = 3;
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + kw, y, x + kw, y + kh, rad);
        ctx.arcTo(x + kw, y + kh, x, y + kh, rad);
        ctx.arcTo(x, y + kh, x, y, rad);
        ctx.arcTo(x, y, x + kw, y, rad);
        ctx.fill();
      }
    }
  }, 640, 220);
  keyboardTex.wrapS = keyboardTex.wrapT = THREE.ClampToEdgeWrapping;
  const keyboardMat = new THREE.MeshStandardMaterial({ map: keyboardTex, metalness: 0.1, roughness: 0.75, side: THREE.DoubleSide });

  const trackpadMat = new THREE.MeshStandardMaterial({ color: 0x8b93a2, metalness: 0.5, roughness: 0.18, side: THREE.DoubleSide });

  const screenTex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#0a1428'; ctx.fillRect(0, 0, w, h);
    // browser chrome
    ctx.fillStyle = '#101d38'; ctx.fillRect(0, 0, w, 64);
    ['#555', '#555', '#555'].forEach((c, i) => {
      ctx.fillStyle = 'rgba(244,237,224,0.35)';
      ctx.beginPath(); ctx.arc(26 + i * 22, 32, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#1e3258';
    const tx = 100, ty = 14, tw = 220, th = 36;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(tx, ty, tw, th, 8) : ctx.rect(tx, ty, tw, th);
    ctx.fill();
    ctx.fillStyle = '#f4ede0';
    ctx.font = '600 20px Arial';
    ctx.fillText('youtube.com', tx + 16, ty + 25);
    ctx.strokeStyle = 'rgba(244,237,224,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(w, 64); ctx.stroke();

    // lock card
    const cx = w / 2, cy = h / 2 + 30;
    ctx.fillStyle = '#1e3258';
    ctx.beginPath();
    const bx = cx - 56, by = cy - 150, bw = 112, bh = 112, br = 24;
    ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, br) : ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.fillStyle = '#ff6b5b';
    ctx.save();
    ctx.translate(cx, by + bh / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-26, -26, 52, 52);
    ctx.restore();

    ctx.fillStyle = '#f4ede0';
    ctx.textAlign = 'center';
    ctx.font = '600 40px Georgia';
    ctx.fillText('Site locked', cx, cy + 40);
    ctx.fillStyle = '#9ba3ba';
    ctx.font = '400 24px Arial';
    ctx.fillText('Back to work — 18:42 left', cx, cy + 82);
    ctx.textAlign = 'left';
  }, 1024, 640);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, side: THREE.DoubleSide });

  // ---- build the laptop ----------------------------------------------
  const W = 2.5, D = 1.62, baseT = 0.09, lidAluT = 0.05, lidBezelT = 0.018, radius = 0.1;

  const device = new THREE.Group();
  scene.add(device);

  // base
  const base = roundedSlab(W, D, baseT, radius, bodyMat);
  base.position.set(0, baseT / 2, 0);
  device.add(base);

  const kbW = W * 0.72, kbD = D * 0.5;
  const keyboard = new THREE.Mesh(new THREE.PlaneGeometry(kbW, kbD), keyboardMat);
  keyboard.rotation.x = -Math.PI / 2;
  keyboard.position.set(0, baseT + 0.002, -D * 0.1);
  device.add(keyboard);

  const trackpad = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.26, D * 0.22), trackpadMat);
  trackpad.rotation.x = -Math.PI / 2;
  trackpad.position.set(0, baseT + 0.002, D * 0.3);
  device.add(trackpad);

  // hinge barrel
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, W * 0.86, 16),
    darkMat
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, baseT * 0.5, -D / 2);
  hinge.castShadow = true;
  device.add(hinge);

  // lid, pivoted at the hinge edge
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, baseT / 2, -D / 2);
  device.add(lidPivot);

  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0, 0);
  lidPivot.add(lidGroup);

  const lidBack = roundedSlab(W, D, lidAluT, radius, bodyMat);
  lidBack.rotation.x = Math.PI / 2;
  lidBack.position.set(0, D / 2, -(lidAluT / 2) - 0.08);
  lidGroup.add(lidBack);

  const lidFront = roundedSlab(W * 0.98, D * 0.98, lidBezelT, radius * 0.9, darkMat);
  lidFront.rotation.x = Math.PI / 2;
  lidFront.position.set(0, D / 2, 0);
  lidGroup.add(lidFront);

  const camDot = new THREE.Mesh(new THREE.CircleGeometry(0.014, 16), darkMat);
  camDot.position.set(0, D - 0.05, 0.05);
  lidGroup.add(camDot);

  const screenW = W * 0.88, screenD = D * 0.84;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenD), screenMat);
  screen.position.set(0, D / 2 - 0.02, 0.08);
  lidGroup.add(screen);

  // screen glare — a soft additive sheen
  const glareTex = canvasTexture((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.03)');
    g.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, 256, 256);
  const glareMat = new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const glare = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenD), glareMat);
  glare.position.set(0, D / 2 - 0.02, 0.12);
  lidGroup.add(glare);

  device.position.y = -0.52;

  // ---- scroll-driven animation ----------------------------------------
  const OPEN_END = 0.35;
  const CLOSED_ANGLE = Math.PI / 2 + 0.05;
  const OPEN_ANGLE = -0.12;
  let ticking = false;

  function render() { renderer.render(scene, camera); }

  function update() {
    ticking = false;
    const rect = wrap.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const progress = Math.min(1, Math.max(0, -rect.top / total));

    const openT = Math.min(1, progress / OPEN_END);
    const openEased = 1 - Math.pow(1 - openT, 3);
    lidPivot.rotation.x = CLOSED_ANGLE + (OPEN_ANGLE - CLOSED_ANGLE) * openEased;

    const rise = (1 - openEased) * 0.8;
    const settleRotY = (-0.42 + openEased * 0.3);
    const settleRotZ = (0.12 - openEased * 0.12);
    device.position.set(0, -0.52 - rise, 0);

    const zoomT = Math.max(0, (progress - OPEN_END) / (1 - OPEN_END));
    const zoomEased = zoomT * zoomT;
    device.scale.setScalar(1 + zoomEased * 7.2);
    device.rotation.set(0, settleRotY * (1 - Math.min(1, zoomT * 1.6)), settleRotZ);
    device.position.y = -0.52 - rise + zoomEased * 0.42;

    const fadeOut = Math.max(0, Math.min(1, (zoomT - 0.82) / 0.18));
    canvas.style.opacity = String(openEased * (1 - fadeOut));

    const hint = wrap.querySelector('.laptop-hint');
    if (hint) hint.style.opacity = String(progress < 0.08 ? 1 : Math.max(0, 1 - progress / 0.3));

    render();
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  fitRenderer();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { fitRenderer(); update(); });
};
