(() => {
  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function drawLightTable(c, W, H, lt, t) {
    const breath = 0.98 + Math.sin(t * 1.1) * 0.02;
    const r = Math.floor((0 + 20 * lt) * breath);
    const g = Math.floor((32 + 58 * lt) * breath);
    const b = Math.floor((64 + 81 * lt) * breath);
    c.fillStyle = `rgb(${r},${g},${b})`;
    c.fillRect(0, 0, W, H);

    const vig = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.08 * breath, W / 2, H / 2, Math.max(W, H) * 0.78 * breath);
    vig.addColorStop(0, `rgba(${Math.min(255, r + 20)},${Math.min(255, g + 32)},${Math.min(255, b + 42)},0)`);
    vig.addColorStop(1, `rgba(${Math.max(0, r - 10)},${Math.max(0, g - 30)},${Math.max(0, b - 55)},0.52)`);
    c.fillStyle = vig;
    c.fillRect(0, 0, W, H);

    const shimmerCount = 35;
    for (let i = 0; i < shimmerCount; i++) {
      const seed = i * 29.3 + t * 10;
      const x = rand(seed) * W;
      const y = rand(seed + 1) * H;
      const a = (0.05 + rand(seed + 2) * 0.12) * (0.5 + 0.5 * Math.sin(t * 2.2 + i));
      if (a > 0) {
        c.fillStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${a})`;
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
          const sr = 176 + Math.floor(r2 * 24);
          const sg = 184 + Math.floor(r3 * 20);
          const sb = 168 + Math.floor(r1 * 18);
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
      const gr = 146 + Math.floor(rand(seed + 4) * 42);
      const gg = 154 + Math.floor(rand(seed + 5) * 32);
      const gb = 138 + Math.floor(rand(seed + 6) * 26);
      c.fillStyle = `rgba(${Math.floor(gr * lt)},${Math.floor(gg * lt)},${Math.floor(gb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, size, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawFlowerAndCenter(c, W, H, lt) {
    const cx = W / 2;
    const cy = H / 2 - 10;
    const petalCount = 6;
    const petalLen = 135;
    const petalWidth = 58;

    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2 - Math.PI / 2;
      const tipX = cx + Math.cos(angle) * petalLen;
      const tipY = cy + Math.sin(angle) * petalLen;
      const perpA = angle + Math.PI / 2;
      const baseJitterSeed = p * 131.7;

      const petalPoints = 28;
      c.beginPath();
      for (let side = 0; side < 2; side++) {
        const sideSign = side === 0 ? 1 : -1;
        for (let i = 0; i <= petalPoints; i++) {
          const t = i / petalPoints;
          const taper = Math.sin(t * Math.PI);
          const widthVar = petalWidth * taper * (0.93 + rand(baseJitterSeed + side * 100 + i) * 0.14);
          const midX = cx + Math.cos(angle) * petalLen * t;
          const midY = cy + Math.sin(angle) * petalLen * t;
          const jitterA = rand(baseJitterSeed + side * 50 + i * 3) - 0.5;
          const jitterB = rand(baseJitterSeed + side * 50 + i * 3 + 7) - 0.5;
          const px = midX + Math.cos(perpA) * sideSign * (widthVar / 2) + jitterA * 6;
          const py = midY + Math.sin(perpA) * sideSign * (widthVar / 2) + jitterB * 6;
          if (side === 0 && i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
      }
      c.closePath();
      const pr = 150 + Math.floor(rand(baseJitterSeed + 900) * 18);
      const pg = 158 + Math.floor(rand(baseJitterSeed + 901) * 16);
      const pb = 138 + Math.floor(rand(baseJitterSeed + 902) * 14);
      c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},0.58)`;
      c.fill();

      for (let fill = 0; fill < 500; fill++) {
        const seedF = baseJitterSeed + fill * 7.3;
        const t = Math.sqrt(rand(seedF));
        const around = rand(seedF + 1);
        const taper = Math.sin(t * Math.PI);
        const widthVar = petalWidth * taper * 0.82;
        const midX = cx + Math.cos(angle) * petalLen * t;
        const midY = cy + Math.sin(angle) * petalLen * t;
        const offset = (around - 0.5) * widthVar;
        const px = midX + Math.cos(perpA) * offset + (rand(seedF + 2) - 0.5) * 10;
        const py = midY + Math.sin(perpA) * offset + (rand(seedF + 3) - 0.5) * 10;
        if (t >= 0 && t <= 1 && Math.abs(offset) <= widthVar / 2) {
          const density = 0.15 + rand(seedF + 4) * 0.35;
          const dr = 162 + Math.floor(rand(seedF + 5) * 22);
          const dg = 170 + Math.floor(rand(seedF + 6) * 18);
          const db = 150 + Math.floor(rand(seedF + 7) * 16);
          c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${density})`;
          c.beginPath();
          c.arc(px, py, 0.5 + rand(seedF + 8) * 1.8, 0, Math.PI * 2);
          c.fill();
        }
      }

      const edgeCount = 120;
      for (let e = 0; e < edgeCount; e++) {
        const seedE = baseJitterSeed + e * 11.3 + 5000;
        const t = e / edgeCount;
        const sidePick = rand(seedE) > 0.5 ? 1 : -1;
        const taper = Math.sin(t * Math.PI);
        const widthVar = petalWidth * taper * (0.93 + rand(seedE + 1) * 0.14);
        const midX = cx + Math.cos(angle) * petalLen * t;
        const midY = cy + Math.sin(angle) * petalLen * t;
        const edgeInset = 0.45 + rand(seedE + 2) * 0.55;
        const px = midX + Math.cos(perpA) * sidePick * (widthVar / 2) * edgeInset + (rand(seedE + 3) - 0.5) * 4;
        const py = midY + Math.sin(perpA) * sidePick * (widthVar / 2) * edgeInset + (rand(seedE + 4) - 0.5) * 4;
        const alpha = (0.12 + rand(seedE + 5) * 0.28) * (1 - edgeInset * 0.4);
        const er = 195 + Math.floor(rand(seedE + 6) * 25);
        const eg = 200 + Math.floor(rand(seedE + 7) * 20);
        const eb = 183 + Math.floor(rand(seedE + 8) * 18);
        c.fillStyle = `rgba(${Math.floor(er * lt)},${Math.floor(eg * lt)},${Math.floor(eb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.6 + rand(seedE + 9) * 2, 0, Math.PI * 2);
        c.fill();
      }
    }

    const centerR = 42;
    for (let layer = 0; layer < 5; layer++) {
      const layerR = centerR - layer * 6;
      const layerAlpha = 0.42 + layer * 0.1;
      const count = 200 - layer * 25;
      for (let i = 0; i < count; i++) {
        const seedC = layer * 1000 + i * 9.7;
        const ang = rand(seedC) * Math.PI * 2;
        const dist = Math.pow(rand(seedC + 1), 0.6) * layerR;
        const x = cx + Math.cos(ang) * dist + (rand(seedC + 2) - 0.5) * 5;
        const y = cy + Math.sin(ang) * dist + (rand(seedC + 3) - 0.5) * 5;
        const fade = 1 - dist / layerR * 0.6;
        const cr = 123 + Math.floor(rand(seedC + 4) * 25);
        const cg = 131 + Math.floor(rand(seedC + 5) * 18);
        const cb = 112 + Math.floor(rand(seedC + 6) * 14);
        const alpha = layerAlpha * fade * (0.35 + rand(seedC + 7) * 0.65);
        c.fillStyle = `rgba(${Math.floor(cr * lt)},${Math.floor(cg * lt)},${Math.floor(cb * lt)},${alpha})`;
        c.beginPath();
        c.arc(x, y, 0.8 + rand(seedC + 8) * 2.4, 0, Math.PI * 2);
        c.fill();
      }
    }

    const dabR = 20;
    for (let i = 0; i < 180; i++) {
      const seedD = i * 13.9 + 7777;
      const ang = rand(seedD) * Math.PI * 2;
      const dist = Math.pow(rand(seedD + 1), 0.8) * dabR;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      const fade = 1 - dist / dabR * 0.5;
      const dr = 108 + Math.floor(rand(seedD + 2) * 22);
      const dg = 114 + Math.floor(rand(seedD + 3) * 16);
      const db = 96 + Math.floor(rand(seedD + 4) * 12);
      const alpha = (0.45 + rand(seedD + 5) * 0.4) * fade;
      c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.7 + rand(seedD + 6) * 2.2, 0, Math.PI * 2);
      c.fill();
    }

    for (let i = 0; i < 70; i++) {
      const seedH = i * 17.5 + 8888;
      const ang = (i / 70) * Math.PI * 2;
      const jr = dabR + (rand(seedH) - 0.5) * 12;
      const x = cx + Math.cos(ang) * jr;
      const y = cy + Math.sin(ang) * jr;
      const hr = 185 + Math.floor(rand(seedH + 1) * 30);
      const hg = 188 + Math.floor(rand(seedH + 2) * 22);
      const hb = 174 + Math.floor(rand(seedH + 3) * 18);
      c.fillStyle = `rgba(${Math.floor(hr * lt)},${Math.floor(hg * lt)},${Math.floor(hb * lt)},${0.15 + rand(seedH + 4) * 0.25})`;
      c.beginPath();
      c.arc(x, y, 0.8 + rand(seedH + 5) * 2.5, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawPetalDetail(c, W, H, lt) {
    const cx = W / 2;
    const cy = H / 2 - 10;
    const petalCount = 6;
    const petalLen = 135;
    const petalWidth = 58;

    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2 - Math.PI / 2;
      const perpA = angle + Math.PI / 2;
      const baseSeed = p * 311.9;

      const veinCount = 3;
      for (let v = 0; v < veinCount; v++) {
        const veinOffset = (v - (veinCount - 1) / 2) * (petalWidth * 0.18);
        const veinSeed = baseSeed + v * 47;
        const steps = 18;
        c.strokeStyle = `rgba(${Math.floor(138 * lt)},${Math.floor(146 * lt)},${Math.floor(126 * lt)},0.45)`;
        c.lineWidth = 1.8;
        c.lineCap = 'round';
        c.beginPath();
        for (let s = 0; s <= steps; s++) {
          const t = 0.12 + (s / steps) * 0.78;
          const taper = Math.sin(t * Math.PI);
          const midX = cx + Math.cos(angle) * petalLen * t;
          const midY = cy + Math.sin(angle) * petalLen * t;
          const veinWander = Math.sin(t * Math.PI * 1.5 + v) * petalWidth * 0.08;
          const wobble = (rand(veinSeed + s) - 0.5) * 2.5;
          const px = midX + Math.cos(perpA) * (veinOffset + veinWander) + wobble;
          const py = midY + Math.sin(perpA) * (veinOffset + veinWander) + (rand(veinSeed + s + 13) - 0.5) * 2.5;
          if (s === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();

        for (let d = 0; d < 25; d++) {
          const seed = veinSeed + d * 5.3;
          const t = 0.15 + rand(seed) * 0.72;
          const distFromLine = (rand(seed + 1) - 0.5) * 7;
          const taper = Math.sin(t * Math.PI);
          const midX = cx + Math.cos(angle) * petalLen * t;
          const midY = cy + Math.sin(angle) * petalLen * t;
          const veinWander = Math.sin(t * Math.PI * 1.5 + v) * petalWidth * 0.08;
          const px = midX + Math.cos(perpA) * (veinOffset + veinWander + distFromLine);
          const py = midY + Math.sin(perpA) * (veinOffset + veinWander + distFromLine);
          const alpha = (0.12 + rand(seed + 2) * 0.22) * taper;
          const dr = 148 + Math.floor(rand(seed + 3) * 20);
          const dg = 156 + Math.floor(rand(seed + 4) * 16);
          const db = 134 + Math.floor(rand(seed + 5) * 12);
          c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
          c.beginPath();
          c.arc(px, py, 0.4 + rand(seed + 6) * 1.4, 0, Math.PI * 2);
          c.fill();
        }
      }

      const shadingCount = 120;
      for (let s = 0; s < shadingCount; s++) {
        const seed = baseSeed + s * 7.9 + 2000;
        const t = rand(seed);
        const offset = (rand(seed + 1) - 0.5);
        const outerBias = Math.pow(t, 0.7);
        const taper = Math.sin(t * Math.PI);
        const midX = cx + Math.cos(angle) * petalLen * (0.1 + outerBias * 0.85);
        const midY = cy + Math.sin(angle) * petalLen * (0.1 + outerBias * 0.85);
        const sideFactor = offset > 0 ? 1 : -1;
        const edgeDist = 0.7 + rand(seed + 2) * 0.3;
        const px = midX + Math.cos(perpA) * offset * (petalWidth * 0.45 * taper) * edgeDist;
        const py = midY + Math.sin(perpA) * offset * (petalWidth * 0.45 * taper) * edgeDist;
        const darkness = rand(seed + 3);
        const dr = 125 + Math.floor(darkness * 28);
        const dg = 133 + Math.floor(darkness * 22);
        const db = 110 + Math.floor(darkness * 16);
        const alpha = (0.08 + rand(seed + 4) * 0.18) * taper;
        c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.6 + rand(seed + 5) * 2, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawScratchLines(c, W, H, lt) {
    const cx = W / 2;
    const cy = H / 2 - 10;
    const petalCount = 6;
    const petalLen = 135;
    const petalWidth = 58;

    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2 - Math.PI / 2;
      const perpA = angle + Math.PI / 2;
      const baseSeed = p * 523.1 + 4000;

      const scratchSteps = 24;
      const scratchStart = 0.22;
      const scratchEnd = 0.82;
      c.lineCap = 'round';

      for (let pass = 0; pass < 3; pass++) {
        c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${0.28 - pass * 0.06})`;
        c.lineWidth = 3.5 - pass * 0.8;
        c.beginPath();
        for (let s = 0; s <= scratchSteps; s++) {
          const t = scratchStart + (s / scratchSteps) * (scratchEnd - scratchStart);
          const taper = Math.sin(t * Math.PI);
          const midX = cx + Math.cos(angle) * petalLen * t;
          const midY = cy + Math.sin(angle) * petalLen * t;
          const wander = Math.sin(t * Math.PI * 2 + p + pass) * petalWidth * 0.06;
          const jitterX = (rand(baseSeed + pass * 100 + s) - 0.5) * 3;
          const jitterY = (rand(baseSeed + pass * 100 + s + 29) - 0.5) * 3;
          const px = midX + Math.cos(perpA) * wander + jitterX;
          const py = midY + Math.sin(perpA) * wander + jitterY;
          if (s === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();
      }

      const glowCount = 80;
      for (let g = 0; g < glowCount; g++) {
        const seed = baseSeed + g * 6.7;
        const t = scratchStart + rand(seed) * (scratchEnd - scratchStart);
        const distFromLine = (rand(seed + 1) - 0.5) * 14;
        const taper = Math.sin(t * Math.PI);
        const midX = cx + Math.cos(angle) * petalLen * t;
        const midY = cy + Math.sin(angle) * petalLen * t;
        const wander = Math.sin(t * Math.PI * 2 + p) * petalWidth * 0.06;
        const px = midX + Math.cos(perpA) * (wander + distFromLine);
        const py = midY + Math.sin(perpA) * (wander + distFromLine);
        const distNorm = Math.abs(distFromLine) / 14;
        const fade = (1 - distNorm) * taper;
        const alpha = (0.1 + rand(seed + 2) * 0.2) * fade;
        if (alpha > 0) {
          const gr = 0;
          const gg = 135;
          const gb = 170;
          c.fillStyle = `rgba(${Math.floor(gr * lt)},${Math.floor(gg * lt)},${Math.floor(gb * lt)},${alpha})`;
          c.beginPath();
          c.arc(px, py, 0.5 + rand(seed + 3) * 1.8, 0, Math.PI * 2);
          c.fill();
        }
      }

      const pushedCount = 60;
      for (let side = -1; side <= 1; side += 2) {
        for (let pu = 0; pu < pushedCount; pu++) {
          const seed = baseSeed + pu * 8.3 + side * 1000;
          const t = scratchStart + rand(seed) * (scratchEnd - scratchStart);
          const taper = Math.sin(t * Math.PI);
          const midX = cx + Math.cos(angle) * petalLen * t;
          const midY = cy + Math.sin(angle) * petalLen * t;
          const wander = Math.sin(t * Math.PI * 2 + p) * petalWidth * 0.06;
          const pushDist = 6 + rand(seed + 1) * 14;
          const px = midX + Math.cos(perpA) * (wander + side * pushDist);
          const py = midY + Math.sin(perpA) * (wander + side * pushDist);
          const fade = taper * (1 - (pushDist - 6) / 14 * 0.6);
          const alpha = (0.12 + rand(seed + 2) * 0.22) * fade;
          const pr = 148 + Math.floor(rand(seed + 3) * 25);
          const pg = 156 + Math.floor(rand(seed + 4) * 18);
          const pb = 136 + Math.floor(rand(seed + 5) * 15);
          c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
          c.beginPath();
          c.arc(px, py, 0.7 + rand(seed + 6) * 2, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    const circleCX = cx;
    const circleCY = cy;
    const circleR = 30;
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(130 * lt)},${Math.floor(168 * lt)},${0.32 - pass * 0.07})`;
      c.lineWidth = 3 - pass * 0.7;
      c.beginPath();
      const steps = 48;
      for (let s = 0; s <= steps; s++) {
        const ang = (s / steps) * Math.PI * 2 + pass * 0.15;
        const jr = circleR + Math.sin(ang * 4 + pass) * 3.5 + (rand(s * 3.7 + pass * 100) - 0.5) * 2;
        const x = circleCX + Math.cos(ang) * jr;
        const y = circleCY + Math.sin(ang) * jr;
        if (s === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }

    const circleGlow = 100;
    for (let g = 0; g < circleGlow; g++) {
      const seed = g * 9.1 + 6666;
      const ang = rand(seed) * Math.PI * 2;
      const jr = circleR + (rand(seed + 1) - 0.5) * 20;
      const x = circleCX + Math.cos(ang) * jr;
      const y = circleCY + Math.sin(ang) * jr;
      const distNorm = Math.abs(jr - circleR) / 20;
      const fade = 1 - distNorm;
      const alpha = (0.08 + rand(seed + 2) * 0.18) * fade;
      if (alpha > 0) {
        c.fillStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(138 * lt)},${Math.floor(175 * lt)},${alpha})`;
        c.beginPath();
        c.arc(x, y, 0.4 + rand(seed + 3) * 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function pourCorner(c, W, H, lt) {
    const cx = W * 0.86;
    const cy = H * 0.88;
    const baseSeed = 90000;

    const streamCount = 5;
    for (let s = 0; s < streamCount; s++) {
      const seedS = baseSeed + s * 123.7;
      const startX = cx - 120 + s * 15 + (rand(seedS) - 0.5) * 8;
      const startY = cy - 100 + (rand(seedS + 1) - 0.5) * 10;
      const steps = 22;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const x = startX + (cx - startX) * t + Math.sin(t * 8 + s) * 4 + (rand(seedS + i) - 0.5) * 5;
        const y = startY + (cy - startY) * t + t * t * 30 + (rand(seedS + i + 17) - 0.5) * 4;
        const fade = Math.sin(t * Math.PI);
        const density = 0.15 + rand(seedS + i + 33) * 0.25;
        for (let j = 0; j < 3; j++) {
          const px = x + (rand(seedS + i * 5 + j) - 0.5) * 6;
          const py = y + (rand(seedS + i * 5 + j + 11) - 0.5) * 4;
          const size = 0.5 + rand(seedS + i * 5 + j + 23) * 1.8;
          const sr = 172 + Math.floor(rand(seedS + i + j * 2 + 47) * 24);
          const sg = 180 + Math.floor(rand(seedS + i + j * 2 + 48) * 20);
          const sb = 156 + Math.floor(rand(seedS + i + j * 2 + 49) * 18);
          c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${density * fade})`;
          c.beginPath();
          c.arc(px, py, size, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    const pileCount = 600;
    for (let i = 0; i < pileCount; i++) {
      const seed = baseSeed + i * 4.3;
      const ang = rand(seed) * Math.PI * 2;
      const dist = Math.pow(rand(seed + 1), 0.55) * 85;
      const x = cx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 6;
      const y = cy + Math.sin(ang) * dist * 0.55 + (rand(seed + 3) - 0.5) * 4;
      const fade = 1 - dist / 85 * 0.6;
      const yBias = Math.max(0, (y - (cy - 20)) / 80);
      const alpha = (0.18 + rand(seed + 4) * 0.32) * fade * (0.6 + yBias * 0.4);
      const pr = 152 + Math.floor(rand(seed + 5) * 28);
      const pg = 160 + Math.floor(rand(seed + 6) * 20);
      const pb = 138 + Math.floor(rand(seed + 7) * 16);
      c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.6 + rand(seed + 8) * 2.2, 0, Math.PI * 2);
      c.fill();
    }

    const spillCount = 80;
    for (let i = 0; i < spillCount; i++) {
      const seed = baseSeed + 5000 + i * 7.1;
      const dir = rand(seed);
      const t = rand(seed + 1);
      const startX = cx - 60;
      const startY = cy + 15;
      const endX = cx + 80 + t * 40;
      const endY = cy + 45 + t * 30;
      const x = startX + (endX - startX) * t + (rand(seed + 2) - 0.5) * 5;
      const y = startY + (endY - startY) * t + (rand(seed + 3) - 0.5) * 3;
      const alpha = (0.12 + rand(seed + 4) * 0.2) * (1 - t * 0.7);
      if (alpha > 0) {
        const sr = 182 + Math.floor(rand(seed + 5) * 22);
        const sg = 188 + Math.floor(rand(seed + 6) * 18);
        const sb = 170 + Math.floor(rand(seed + 7) * 15);
        c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${alpha})`;
        c.beginPath();
        c.arc(x, y, 0.5 + rand(seed + 8) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function scratchGrowing(c, W, H, lt, t) {
    const cx = W / 2;
    const cy = H / 2 - 10;
    const topAngle = -Math.PI / 2;
    const petalLen = 135;
    const growPhase = (Math.sin(t * 0.6) + 1) / 2;
    const extendFactor = 0.88 + growPhase * 0.45;

    const startTipX = cx + Math.cos(topAngle) * petalLen * 0.78;
    const startTipY = cy + Math.sin(topAngle) * petalLen * 0.78;
    const endX = cx + Math.cos(topAngle) * petalLen * extendFactor;
    const endY = cy + Math.sin(topAngle) * petalLen * extendFactor;
    const perpA = topAngle + Math.PI / 2;

    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(125 * lt)},${Math.floor(162 * lt)},${0.26 - pass * 0.05})`;
      c.lineWidth = 3 - pass * 0.7;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 18;
      for (let s = 0; s <= steps; s++) {
        const st = s / steps;
        const midX = startTipX + (endX - startTipX) * st;
        const midY = startTipY + (endY - startTipY) * st;
        const wander = Math.sin(st * Math.PI * 3 + pass * 2) * 5;
        const jitterX = (rand(st * 31.7 + pass * 50 + 111) - 0.5) * 2.5;
        const jitterY = (rand(st * 31.7 + pass * 50 + 112) - 0.5) * 2.5;
        const px = midX + Math.cos(perpA) * wander + jitterX;
        const py = midY + Math.sin(perpA) * wander + jitterY;
        if (s === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
    }

    const extendGlow = 50;
    for (let g = 0; g < extendGlow; g++) {
      const seed = g * 8.5 + 55555;
      const st = rand(seed);
      const distFromLine = (rand(seed + 1) - 0.5) * 12;
      const midX = startTipX + (endX - startTipX) * st;
      const midY = startTipY + (endY - startTipY) * st;
      const px = midX + Math.cos(perpA) * distFromLine;
      const py = midY + Math.sin(perpA) * distFromLine;
      const distNorm = Math.abs(distFromLine) / 12;
      const fade = (1 - distNorm) * Math.sin(st * Math.PI);
      const alpha = (0.09 + rand(seed + 2) * 0.18) * fade;
      if (alpha > 0) {
        c.fillStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(132 * lt)},${Math.floor(168 * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.4 + rand(seed + 3) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    }

    const tipX = endX;
    const tipY = endY;
    for (let side = -1; side <= 1; side += 2) {
      for (let pu = 0; pu < 35; pu++) {
        const seed = pu * 7.3 + side * 2000 + 77777;
        const st = 0.7 + rand(seed) * 0.3;
        const midX = startTipX + (endX - startTipX) * st;
        const midY = startTipY + (endY - startTipY) * st;
        const pushDist = 5 + rand(seed + 1) * 11;
        const px = midX + Math.cos(perpA) * side * pushDist;
        const py = midY + Math.sin(perpA) * side * pushDist;
        const fade = (1 - (pushDist - 5) / 11 * 0.5) * (0.5 + st * 0.5);
        const alpha = (0.1 + rand(seed + 2) * 0.2) * fade;
        const pr = 155 + Math.floor(rand(seed + 3) * 22);
        const pg = 162 + Math.floor(rand(seed + 4) * 16);
        const pb = 140 + Math.floor(rand(seed + 5) * 14);
        c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.5 + rand(seed + 6) * 1.8, 0, Math.PI * 2);
        c.fill();
      }
    }

    const tipPile = 80;
    for (let i = 0; i < tipPile; i++) {
      const seed = i * 5.9 + 99999;
      const ang = topAngle + Math.PI + (rand(seed) - 0.5) * Math.PI * 0.9;
      const dist = rand(seed + 1) * 22;
      const x = tipX + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 4;
      const y = tipY + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 4;
      const fade = 1 - dist / 22 * 0.5;
      const alpha = (0.12 + rand(seed + 4) * 0.25) * fade;
      const pr = 160 + Math.floor(rand(seed + 5) * 25);
      const pg = 168 + Math.floor(rand(seed + 6) * 18);
      const pb = 146 + Math.floor(rand(seed + 7) * 15);
      c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.5 + rand(seed + 8) * 2, 0, Math.PI * 2);
      c.fill();
    }
  }

  // 使用 palette('realistic_cool_standard')：冷蓝青光台+冷灰沙粒，真实样片同款
  // const C = (typeof SAND !== 'undefined' && SAND.palette) ? SAND.palette('realistic_cool_standard') : null;
  window.SCENES = window.SCENES || {};
  window.SCENES['s01_classic'] = {
    meta: {
      name: '真实写实冷调六瓣花',
      style: 'realistic_cool',
      palette_name: 'realistic_cool_standard',
      layers: 6
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;

      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawFlowerAndCenter(c, W, H, lt);
      drawPetalDetail(c, W, H, lt);
      drawScratchLines(c, W, H, lt);
      pourCorner(c, W, H, lt);
      scratchGrowing(c, W, H, lt, t);
    }
  };
})();
