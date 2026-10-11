(() => {
  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function drawLightTable(c, W, H, lt, t) {
    const breath = 0.98 + Math.sin(t * 1.1) * 0.02;
    const r = Math.floor((150 + 20 * lt) * breath);
    const g = Math.floor((38 + 62 * lt) * breath);
    const b = Math.floor((72 + 95 * lt) * breath);
    c.fillStyle = `rgb(${r},${g},${b})`;
    c.fillRect(0, 0, W, H);

    const vig = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.08 * breath, W / 2, H / 2, Math.max(W, H) * 0.78 * breath);
    vig.addColorStop(0, `rgba(${Math.min(255, r + 18)},${Math.min(255, g + 36)},${Math.min(255, b + 52)},0)`);
    vig.addColorStop(1, `rgba(${Math.max(0, r - 10)},${Math.max(0, g - 32)},${Math.max(0, b - 58)},0.54)`);
    c.fillStyle = vig;
    c.fillRect(0, 0, W, H);

    const bottomShade = c.createLinearGradient(0, H * 0.6, 0, H);
    bottomShade.addColorStop(0, "rgba(0,0,0,0)");
    bottomShade.addColorStop(1, "rgba(0,0,0,0.06)");
    c.fillStyle = bottomShade;
    c.fillRect(0, 0, W, H);

    const shimmerCount = 35;
    for (let i = 0; i < shimmerCount; i++) {
      const seed = i * 29.3 + t * 10;
      const x = rand(seed) * W;
      const y = rand(seed + 1) * H;
      const a = (0.05 + rand(seed + 2) * 0.12) * (0.5 + 0.5 * Math.sin(t * 2.2 + i));
      if (a > 0) {
        c.fillStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${a})`;
        c.beginPath();
        c.arc(x, y, 0.4 + rand(seed + 3) * 1.2, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawThinBed(c, W, H, lt) {
    const gridSize = 4;
    const cols = Math.ceil(W / gridSize);
    const rows = Math.ceil(H / gridSize);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seed = (row * cols + col) * 2.71;
        const r1 = rand(seed);
        const r2 = rand(seed + 1);
        const r3 = rand(seed + 2);
        if (r1 < 0.82) {
          const x = col * gridSize + r2 * gridSize;
          const y = row * gridSize + r3 * gridSize;
          const density = 0.28 + r1 * 0.32;
          const sr = 174 + Math.floor(r2 * 24);
          const sg = 182 + Math.floor(r3 * 20);
          const sb = 166 + Math.floor(r1 * 18);
          c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${density})`;
          c.fillRect(x, y, gridSize * 0.52, gridSize * 0.52);
        }
      }
    }

    const grainCount = 1500;
    for (let i = 0; i < grainCount; i++) {
      const seed = i * 15.7 + 200;
      const x = rand(seed) * W;
      const y = rand(seed + 1) * H;
      const size = 0.25 + rand(seed + 2) * 1.1;
      const alpha = (0.06 + rand(seed + 3) * 0.22);
      const gr = 144 + Math.floor(rand(seed + 4) * 42);
      const gg = 152 + Math.floor(rand(seed + 5) * 32);
      const gb = 136 + Math.floor(rand(seed + 6) * 26);
      c.fillStyle = `rgba(${Math.floor(gr * lt)},${Math.floor(gg * lt)},${Math.floor(gb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, size, 0, Math.PI * 2);
      c.fill();
    }
  }

  function _mountainNoise(x, li, seedBase) {
    const s1 = Math.sin(x * 0.0045 + li * 2.1 + seedBase) * 1.0;
    const s2 = Math.sin(x * 0.0105 + li * 3.7 + seedBase * 1.3) * 0.45;
    const s3 = Math.sin(x * 0.0022 + li * 1.3 + seedBase * 0.7) * 0.7;
    return s1 + s2 + s3;
  }

  function drawMountainsThick(c, W, H, lt, t) {
    const layers = [
      { baseY: H * 0.50, amp: 78, alpha: 0.44, dark: 0.62, seed: 11, shadowAlpha: 0.28 },
      { baseY: H * 0.60, amp: 58, alpha: 0.54, dark: 0.48, seed: 23, shadowAlpha: 0.32 },
      { baseY: H * 0.72, amp: 38, alpha: 0.72, dark: 0.33, seed: 37, shadowAlpha: 0.36 }
    ];
    layers.forEach((L, li) => {
      const points = [];
      const stepX = 3;
      for (let x = -10; x <= W + 10; x += stepX) {
        const noise = _mountainNoise(x, li, L.seed) * L.amp;
        const jitter = (Math.sin(x * 0.11 + li) * 3);
        points.push({ x, y: L.baseY + noise + jitter });
      }
      c.beginPath();
      c.moveTo(0, H);
      points.forEach(p => c.lineTo(p.x, p.y));
      c.lineTo(W, H);
      c.closePath();
      const r = Math.floor(126 * lt * L.dark);
      const g = Math.floor(134 * lt * L.dark);
      const b = Math.floor(118 * lt * L.dark);
      c.fillStyle = `rgba(${r},${g},${b},${L.alpha})`;
      c.fill();

      const jagginess = 28;
      for (let i = 0; i < jagginess; i++) {
        const seed = L.seed * 100 + i * 17.3;
        const t01 = i / jagginess;
        const x = t01 * W + (rand(seed) - 0.5) * 10;
        const idx = Math.min(points.length - 1, Math.floor(t01 * (points.length - 1)));
        const py = points[idx].y + (rand(seed + 1) - 0.5) * 12;
        const sr = Math.floor(186 * lt);
        const sg = Math.floor(192 * lt);
        const sb = Math.floor(174 * lt);
        c.fillStyle = `rgba(${sr},${sg},${sb},${L.alpha * 0.24})`;
        c.beginPath();
        c.arc(x, py, 1 + rand(seed + 2) * 3, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  function drawMoon(c, W, H, lt, t) {
    const cx = W * 0.76;
    const cy = H * 0.24;
    const r = 54;
    const breath = 0.97 + Math.sin(t * 1.3) * 0.03;
    for (let i = 0; i < 100; i++) {
      const ang = (i / 100) * Math.PI * 2;
      const jr = r * breath + (rand(i * 7.1 + 300) - 0.5) * 8;
      const jx = cx + Math.cos(ang) * jr;
      const jy = cy + Math.sin(ang) * jr;
      const glowR = Math.floor(205 * lt);
      const glowG = Math.floor(225 * lt);
      const glowB = Math.floor(240 * lt);
      c.fillStyle = `rgba(${glowR},${glowG},${glowB},${0.09 + rand(i * 3.3 + 400) * 0.17})`;
      c.beginPath();
      c.arc(jx, jy, 0.8 + rand(i * 5.5 + 500) * 2.3, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 340; i++) {
      const seed = 600 + i * 4.7;
      const ang = rand(seed) * Math.PI * 2;
      const dist = Math.pow(rand(seed + 1), 0.55) * r * 0.85 * breath;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      const fade = 1 - dist / r * 0.55;
      const mr = Math.floor(232 * lt);
      const mg = Math.floor(242 * lt);
      const mb = Math.floor(252 * lt);
      c.fillStyle = `rgba(${mr},${mg},${mb},${(0.16 + rand(seed + 2) * 0.34) * fade})`;
      c.beginPath();
      c.arc(x, y, 0.5 + rand(seed + 3) * 1.7, 0, Math.PI * 2);
      c.fill();
    }
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.22 - pass * 0.05})`;
      c.lineWidth = 3.2 - pass * 0.7;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 60;
      for (let s = 0; s <= steps; s++) {
        const ang = -Math.PI * 0.25 + (s / steps) * Math.PI * 0.9;
        const jr = r * breath * 0.72 + Math.sin(ang * 5 + pass) * 4 + (rand(s * 3.1 + pass * 100) - 0.5) * 2.5;
        const x = cx + Math.cos(ang) * jr;
        const y = cy + Math.sin(ang) * jr;
        if (s === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  }

  function drawMidSandTransition(c, W, H, lt, t) {
    const layers = [
      { baseY: H * 0.50, amp: 78, dark: 0.62, seed: 11 },
      { baseY: H * 0.60, amp: 58, dark: 0.48, seed: 23 },
      { baseY: H * 0.72, amp: 38, dark: 0.33, seed: 37 }
    ];
    layers.forEach((L, li) => {
      const stepX = 8;
      for (let x = 20; x < W - 20; x += stepX) {
        const noise = _mountainNoise(x, li, L.seed) * L.amp;
        const ridgeY = L.baseY + noise;
        const dabCount = 3 + Math.floor(rand(x + li * 99) * 4);
        for (let d = 0; d < dabCount; d++) {
          const seed = 700 + li * 5000 + x * 7.3 + d * 11;
          const jx = x + (rand(seed) - 0.5) * 22;
          const jy = ridgeY + 6 + rand(seed + 1) * 14;
          const fade = 0.5 + 0.5 * Math.sin((x / W) * Math.PI);
          const r0 = 16 + rand(seed + 2) * 14;
          const r1 = 10 + rand(seed + 3) * 8;
          const sr = 148 + Math.floor(rand(seed + 4) * 24);
          const sg = 156 + Math.floor(rand(seed + 5) * 20);
          const sb = 138 + Math.floor(rand(seed + 6) * 16);
          const alpha = (0.1 + rand(seed + 7) * 0.18) * fade;
          c.save();
          c.translate(jx, jy);
          c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${alpha})`;
          c.beginPath();
          c.ellipse(0, 0, r0, r1, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
    });
  }

  function drawBrightScratches(c, W, H, lt, t) {
    const layers = [
      { baseY: H * 0.50, amp: 78, seed: 11 },
      { baseY: H * 0.60, amp: 58, seed: 23 },
      { baseY: H * 0.72, amp: 38, seed: 37 }
    ];
    layers.forEach((L, li) => {
      const scratchSteps = 32;
      for (let pass = 0; pass < 3; pass++) {
        c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.26 - pass * 0.05})`;
        c.lineWidth = 3.4 - pass * 0.8;
        c.lineCap = 'round';
        c.beginPath();
        for (let s = 0; s <= scratchSteps; s++) {
          const x01 = s / scratchSteps;
          const x = x01 * W;
          const noise = _mountainNoise(x, li, L.seed) * L.amp;
          const wander = Math.sin(x01 * Math.PI * 3 + li + pass) * 5;
          const jitterX = (rand(s * 27.7 + li * 500 + pass * 100 + 1000) - 0.5) * 3;
          const jitterY = (rand(s * 27.7 + li * 500 + pass * 100 + 1001) - 0.5) * 3;
          const px = x + wander + jitterX;
          const py = L.baseY + noise + wander * 0.3 + jitterY;
          if (s === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();
      }

      const glowCount = 90;
      for (let g = 0; g < glowCount; g++) {
        const seed = 1100 + li * 2000 + g * 7.1;
        const x01 = rand(seed);
        const x = x01 * W;
        const noise = _mountainNoise(x, li, L.seed) * L.amp;
        const py0 = L.baseY + noise;
        const distFromLine = (rand(seed + 1) - 0.5) * 16;
        const fade = Math.sin(x01 * Math.PI);
        const dx = x + (rand(seed + 2) - 0.5) * 4;
        const dy = py0 + distFromLine + (rand(seed + 3) - 0.5) * 3;
        const distNorm = Math.abs(distFromLine) / 16;
        const alpha = (0.1 + rand(seed + 4) * 0.22) * (1 - distNorm) * fade;
        if (alpha > 0) {
          c.fillStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${alpha})`;
          c.beginPath();
          c.arc(dx, dy, 0.5 + rand(seed + 5) * 1.9, 0, Math.PI * 2);
          c.fill();
        }
      }

      const pushedCount = 70;
      for (let side = -1; side <= 1; side += 2) {
        for (let pu = 0; pu < pushedCount; pu++) {
          const seed = 1200 + li * 3000 + side * 1000 + pu * 9.3;
          const x01 = rand(seed);
          const x = x01 * W;
          const noise = _mountainNoise(x, li, L.seed) * L.amp;
          const py0 = L.baseY + noise;
          const pushDist = 7 + rand(seed + 1) * 16;
          const dx = x + (rand(seed + 2) - 0.5) * 5;
          const dy = py0 + side * pushDist;
          const fade = Math.sin(x01 * Math.PI) * (1 - (pushDist - 7) / 16 * 0.55);
          const alpha = (0.13 + rand(seed + 3) * 0.25) * fade;
          const pr = 150 + Math.floor(rand(seed + 4) * 26);
          const pg = 158 + Math.floor(rand(seed + 5) * 20);
          const pb = 140 + Math.floor(rand(seed + 6) * 16);
          c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
          c.beginPath();
          c.arc(dx, dy, 0.7 + rand(seed + 7) * 2.2, 0, Math.PI * 2);
          c.fill();
        }
      }
    });

    const moonCx = W * 0.76;
    const moonCy = H * 0.24;
    const moonR = 54;
    const breath = 0.97 + Math.sin(t * 1.3) * 0.03;
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.3 - pass * 0.06})`;
      c.lineWidth = 3 - pass * 0.6;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 48;
      for (let s = 0; s <= steps; s++) {
        const ang = -Math.PI * 0.25 + (s / steps) * Math.PI * 0.9;
        const jr = moonR * breath * 0.72 + Math.sin(ang * 5 + pass) * 4 + (rand(s * 4.1 + pass * 80 + 1400) - 0.5) * 2.5;
        const x = moonCx + Math.cos(ang) * jr;
        const y = moonCy + Math.sin(ang) * jr;
        if (s === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  }

  function drawFlowBirds(c, W, H, lt, t) {
    const flowPaths = 12;
    for (let fi = 0; fi < flowPaths; fi++) {
      const seed = 2000 + fi * 47;
      const startY = H * (0.96 - rand(seed) * 0.08);
      const endY = H * (0.36 + rand(seed + 1) * 0.20);
      const baseX = W * (0.08 + (fi / flowPaths) * 0.84) + (rand(seed + 2) - 0.5) * W * 0.15;
      const path = [];
      const steps = 28;
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;
        const x = baseX + Math.sin(k * Math.PI * 2.5 + fi * 0.9) * 38 * Math.sin(k * Math.PI);
        const y = startY + (endY - startY) * k;
        path.push({ x, y });
      }
      const progress = ((t * 0.18 + fi * 0.083) % 1.0);
      const perStep = 50;
      for (let i = 0; i < perStep; i++) {
        const fSeed = 2100 + fi * 100 + i * 6.7;
        const tBase = 0.02 + rand(fSeed) * 0.96;
        const localT = Math.max(0, Math.min(1, progress * 1.2 - tBase * (1 - progress * 0.45)));
        if (localT <= 0 || localT >= 1) continue;
        const idx = Math.min(path.length - 2, Math.floor(localT * (path.length - 1)));
        const frac = (localT * (path.length - 1)) - idx;
        const p0 = path[idx];
        const p1 = path[Math.min(path.length - 1, idx + 1)];
        const px = p0.x + (p1.x - p0.x) * frac;
        const py = p0.y + (p1.y - p0.y) * frac;
        const perpX = -(p1.y - p0.y) / Math.max(1, Math.hypot(p1.x - p0.x, p1.y - p0.y));
        const perpY = (p1.x - p0.x) / Math.max(1, Math.hypot(p1.x - p0.x, p1.y - p0.y));
        const off = (rand(fSeed + 1) - 0.5) * 14;
        const wander = Math.sin(localT * 9 + fSeed) * 6;
        const x = px + perpX * off + wander * perpX;
        const y = py + perpY * off + wander * perpY;
        const fade = Math.sin(localT * Math.PI);
        const alpha = (0.09 + rand(fSeed + 2) * 0.22) * fade;
        const size = 0.4 + rand(fSeed + 3) * 2;
        if (alpha > 0) {
          const fr = 156 + Math.floor(rand(fSeed + 4) * 38);
          const fg = 164 + Math.floor(rand(fSeed + 5) * 30);
          const fb = 146 + Math.floor(rand(fSeed + 6) * 22);
          c.fillStyle = `rgba(${Math.floor(fr * lt)},${Math.floor(fg * lt)},${Math.floor(fb * lt)},${alpha})`;
          c.beginPath();
          c.arc(x, y, size, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    const birds = 3;
    for (let bi = 0; bi < birds; bi++) {
      const seed = 2300 + bi * 73;
      const startX = W * (1.15);
      const endX = W * (-0.15);
      const baseY = H * (0.18 + bi * 0.055);
      const progress = ((t * 0.055 + bi * 0.34) % 1.0);
      const bx = startX + (endX - startX) * progress;
      const by = baseY + Math.sin(progress * Math.PI * 2 + bi) * 22;
      const wingPhase = Math.sin(t * 5.5 + bi * 1.7);
      const wingSpan = 18 + wingPhase * 8;
      const silhouetteAlpha = 0.58;
      c.save();
      c.translate(bx, by);
      c.fillStyle = `rgba(${Math.floor(90 * lt)},${Math.floor(78 * lt)},${Math.floor(62 * lt)},${silhouetteAlpha})`;
      c.beginPath();
      c.moveTo(-wingSpan * 0.5, 0);
      c.quadraticCurveTo(-wingSpan * 0.25, -6 - wingPhase * 4, 0, 0);
      c.quadraticCurveTo(wingSpan * 0.25, -6 - wingPhase * 4, wingSpan * 0.5, 0);
      c.quadraticCurveTo(wingSpan * 0.28, 2, 0, 3);
      c.quadraticCurveTo(-wingSpan * 0.28, 2, -wingSpan * 0.5, 0);
      c.closePath();
      c.fill();
      c.restore();
      const birdDust = 6;
      for (let d = 0; d < birdDust; d++) {
        const dSeed = 2400 + bi * 100 + d * 5.3;
        const dx = bx + (rand(dSeed) - 0.5) * wingSpan * 1.2;
        const dy = by + 6 + rand(dSeed + 1) * 10;
        const alpha = (0.08 + rand(dSeed + 2) * 0.16) * Math.sin(progress * Math.PI);
        if (alpha > 0) {
          const sr = 146 + Math.floor(rand(dSeed + 3) * 32);
          const sg = 154 + Math.floor(rand(dSeed + 4) * 24);
          const sb = 136 + Math.floor(rand(dSeed + 5) * 18);
          c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${alpha})`;
          c.beginPath();
          c.arc(dx, dy, 0.4 + rand(dSeed + 6) * 1.4, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    const breath = 0.98 + Math.sin(t * 1.1) * 0.02;
    c.save();
    c.globalAlpha = 0.02 * breath;
    c.fillStyle = `rgba(${Math.floor(12 * breath)},${Math.floor(105 * breath)},${Math.floor(148 * breath)},1)`;
    c.fillRect(0, 0, W, H);
    c.restore();
    const qFlash = 0.5 + 0.5 * Math.sin(t * 0.44);
    if (qFlash > 0.965) {
      const flashK = (qFlash - 0.965) / 0.035;
      c.save();
      c.globalAlpha = 0.07 * flashK;
      c.fillStyle = 'rgba(160, 200, 230, 1)';
      c.fillRect(0, 0, W, H);
      c.restore();
    }
  }

  window.SCENES = window.SCENES || {};
  window.SCENES['s02_flow_mountain'] = {
    meta: {
      name: '冷沙山水·月',
      style: 'realistic_cool',
      palette_name: '写实冷光台-5色',
      duration: 12.0,
      layers: 6
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawMountainsThick(c, W, H, lt, t);
      drawMoon(c, W, H, lt, t);
      drawMidSandTransition(c, W, H, lt, t);
      drawBrightScratches(c, W, H, lt, t);
      drawFlowBirds(c, W, H, lt, t);
    }
  };
})();
