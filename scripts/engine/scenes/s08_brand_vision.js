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

    const shimmerCount = 38;
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

    const doFlash = (t % 10) / 10;
    if (doFlash > 0.89 && doFlash < 0.93) {
      const flashK = 0.5 + 0.5 * Math.sin(((doFlash - 0.89) / 0.04) * Math.PI);
      c.save();
      c.globalAlpha = 0.06 * flashK;
      c.fillStyle = 'rgba(170, 210, 240, 1)';
      c.fillRect(0, 0, W, H);
      c.restore();
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

    const grainCount = 1350;
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
    const cy = H * 0.40;
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
  }

  function drawBrandName(c, W, H, lt, t) {
    const growPhase = Math.min(1, Math.max(0, (t % 10) / 10));
    const alphaMul = 0.2 + growPhase * 0.8;

    const baseY = H * 0.72;
    const nameCx = W / 2;
    const boxW = 58;
    const boxH = 78;
    const gap = 14;
    const count = 6;
    const totalW = count * boxW + (count - 1) * gap;
    const startX = nameCx - totalW / 2;

    for (let bi = 0; bi < count; bi++) {
      const bx = startX + bi * (boxW + gap);
      const by = baseY - boxH;
      const bSeed = 100000 + bi * 200;

      const jPts = 4;
      c.beginPath();
      const pts = [
        { x: bx, y: by },
        { x: bx + boxW, y: by },
        { x: bx + boxW, y: by + boxH },
        { x: bx, y: by + boxH }
      ];
      for (let pi = 0; pi < pts.length; pi++) {
        const cc = pts[pi];
        const next = pts[(pi + 1) % pts.length];
        for (let i = 0; i <= jPts; i++) {
          const tt = i / jPts;
          const mx = cc.x + (next.x - cc.x) * tt + (rand(bSeed + pi * 50 + i * 4.3) - 0.5) * 5;
          const my = cc.y + (next.y - cc.y) * tt + (rand(bSeed + pi * 50 + i * 4.3 + 11) - 0.5) * 4;
          if (pi === 0 && i === 0) c.moveTo(mx, my);
          else c.lineTo(mx, my);
        }
      }
      c.closePath();
      c.fillStyle = `rgba(${Math.floor(124 * lt)},${Math.floor(132 * lt)},${Math.floor(114 * lt)},${0.50 * alphaMul})`;
      c.fill();

      for (let i = 0; i < 150; i++) {
        const seed = bSeed + i * 5.7;
        const t01 = rand(seed);
        const t02 = rand(seed + 1);
        const inset = 8;
        const px = bx + inset + t01 * (boxW - 2 * inset) + (rand(seed + 2) - 0.5) * 4;
        const py = by + inset + t02 * (boxH - 2 * inset) + (rand(seed + 3) - 0.5) * 4;
        const density = (0.2 + rand(seed + 4) * 0.42) * alphaMul;
        const dr = 120 + Math.floor(rand(seed + 5) * 28);
        const dg = 128 + Math.floor(rand(seed + 6) * 22);
        const db = 110 + Math.floor(rand(seed + 7) * 16);
        c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${density})`;
        c.beginPath();
        c.arc(px, py, 0.6 + rand(seed + 8) * 1.8, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawMidSand(c, W, H, lt, t) {
    const cx = W / 2;
    const cy = H * 0.40;
    const petalCount = 6;
    const petalLen = 135;
    const petalWidth = 58;
    const softW = 8;

    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2 - Math.PI / 2;
      const perpA = angle + Math.PI / 2;
      const baseSeed = p * 500 + 110000;
      const petalPoints = 22;
      for (let side = 0; side < 2; side++) {
        const sideSign = side === 0 ? 1 : -1;
        for (let i = 0; i <= petalPoints; i++) {
          const t = i / petalPoints;
          const taper = Math.sin(t * Math.PI);
          const widthVar = petalWidth * taper * 0.92;
          const midX = cx + Math.cos(angle) * petalLen * t;
          const midY = cy + Math.sin(angle) * petalLen * t;
          for (let j = 0; j < 3; j++) {
            const seed = baseSeed + side * 2000 + i * 11 + j * 3;
            const edgeOut = 0.9 + rand(seed) * (softW / (petalWidth / 2) + 0.15);
            const px = midX + Math.cos(perpA) * sideSign * (widthVar / 2) * edgeOut + (rand(seed + 1) - 0.5) * 4;
            const py = midY + Math.sin(perpA) * sideSign * (widthVar / 2) * edgeOut + (rand(seed + 2) - 0.5) * 4;
            const norm = Math.abs(edgeOut - 1) / (softW / (petalWidth / 2) + 0.15);
            const fade = Math.max(0, 1 - norm) * taper;
            const mr = 156 + Math.floor(rand(seed + 3) * 20);
            const mg = 164 + Math.floor(rand(seed + 4) * 14);
            const mb = 146 + Math.floor(rand(seed + 5) * 10);
            const alpha = (0.12 + rand(seed + 6) * 0.18) * fade;
            c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
            c.beginPath();
            c.arc(px, py, 0.5 + rand(seed + 7) * 1.4, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    }

    const growPhase = Math.min(1, Math.max(0, (t % 10) / 10));
    const alphaMul = 0.2 + growPhase * 0.8;

    const baseY = H * 0.72;
    const nameCx = W / 2;
    const boxW = 58;
    const boxH = 78;
    const gap = 14;
    const count = 6;
    const totalW = count * boxW + (count - 1) * gap;
    const startX = nameCx - totalW / 2;
    const nameSoft = 6;

    for (let bi = 0; bi < count; bi++) {
      const bx = startX + bi * (boxW + gap);
      const by = baseY - boxH;
      const bSeed = 120000 + bi * 150;
      const corners = [
        { x: bx, y: by },
        { x: bx + boxW, y: by },
        { x: bx + boxW, y: by + boxH },
        { x: bx, y: by + boxH }
      ];
      for (let ci = 0; ci < corners.length; ci++) {
        const pt = corners[ci];
        for (let i = 0; i < 18; i++) {
          const seed = bSeed + ci * 60 + i * 5.3;
          const ang = rand(seed) * Math.PI * 2;
          const dist = rand(seed + 1) * (nameSoft + 4);
          const px = pt.x + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 3;
          const py = pt.y + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 2.5;
          const fade = Math.max(0, 1 - dist / (nameSoft + 4));
          const mr = 154 + Math.floor(rand(seed + 4) * 22);
          const mg = 162 + Math.floor(rand(seed + 5) * 16);
          const mb = 146 + Math.floor(rand(seed + 6) * 12);
          const alpha = (0.1 + rand(seed + 7) * 0.16) * fade * alphaMul;
          c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
          c.beginPath();
          c.arc(px, py, 0.4 + rand(seed + 8) * 1.2, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  }

  function drawBrightScratches(c, W, H, lt, t) {
    const cx = W / 2;
    const cy = H * 0.40;
    const growPhase = Math.min(1, Math.max(0, (t % 10) / 10));
    const haloScale = 0.8 + growPhase * 0.25;
    const haloR1 = 210 * haloScale;
    const haloR2 = 250 * haloScale;

    [haloR1, haloR2].forEach((HR, hi) => {
      for (let pass = 0; pass < 2; pass++) {
        c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${(0.26 - pass * 0.05) * (0.8 + hi * 0.2)})`;
        c.lineWidth = 2.8 - pass * 0.5 - hi * 0.3;
        c.lineCap = 'round';
        c.beginPath();
        const steps = 56;
        for (let s = 0; s <= steps; s++) {
          const ang = (s / steps) * Math.PI * 2;
          const jr = HR + Math.sin(ang * 6 + pass + hi * 0.7) * 5 + (rand(s * 3.1 + pass * 80 + hi * 500) - 0.5) * 3;
          const x = cx + Math.cos(ang) * jr;
          const y = cy + Math.sin(ang) * jr;
          if (s === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
      const glowC = 80;
      for (let g = 0; g < glowC; g++) {
        const seed = 130000 + hi * 1000 + g * 6.1;
        const ang = rand(seed) * Math.PI * 2;
        const jr = HR + (rand(seed + 1) - 0.5) * 20;
        const x = cx + Math.cos(ang) * jr;
        const y = cy + Math.sin(ang) * jr;
        const distNorm = Math.abs(jr - HR) / 20;
        const fade = 1 - distNorm;
        const alpha = (0.08 + rand(seed + 2) * 0.16) * fade * (0.8 + hi * 0.2);
        if (alpha > 0) {
          c.fillStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(135 * lt)},${Math.floor(172 * lt)},${alpha})`;
          c.beginPath();
          c.arc(x, y, 0.4 + rand(seed + 3) * 1.4, 0, Math.PI * 2);
          c.fill();
        }
      }
    });

    const baseY = H * 0.72;
    const nameCx = W / 2;
    const boxW = 58;
    const boxH = 78;
    const gap = 14;
    const count = 6;
    const totalW = count * boxW + (count - 1) * gap;
    const startX = nameCx - totalW / 2;
    const lineY = baseY + 12;
    const alphaMul = 0.3 + Math.min(1, Math.max(0, (t % 10) / 10)) * 0.7;

    for (let bi = 0; bi < count; bi++) {
      const bx = startX + bi * (boxW + gap);
      const lineL = bx + 4;
      const lineR = bx + boxW - 4;
      const bSeed = 140000 + bi * 180;
      for (let pass = 0; pass < 2; pass++) {
        c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${(0.26 - pass * 0.05) * alphaMul})`;
        c.lineWidth = 2.6 - pass * 0.5;
        c.lineCap = 'round';
        c.beginPath();
        const steps = 14;
        for (let s = 0; s <= steps; s++) {
          const tt = s / steps;
          const mx = lineL + (lineR - lineL) * tt + Math.sin(tt * Math.PI * 3 + bi) * 2.5 + (rand(s * 4.1 + pass * 60 + bSeed) - 0.5) * 2;
          const my = lineY + Math.sin(tt * Math.PI * 2 + pass + bi) * 2.5 + (rand(s * 4.1 + pass * 60 + bSeed + 11) - 0.5) * 2;
          if (s === 0) c.moveTo(mx, my);
          else c.lineTo(mx, my);
        }
        c.stroke();
      }
    }
  }

  window.SCENES = window.SCENES || {};
  window.SCENES['s08_brand_vision'] = {
    meta: {
      name: 'S6 展望·Logo 品牌',
      style: 'realistic_cool',
      palette_name: '写实冷光台-5色',
      duration: 10.0
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawFlowerAndCenter(c, W, H, lt);
      drawBrandName(c, W, H, lt, t);
      drawMidSand(c, W, H, lt, t);
      drawBrightScratches(c, W, H, lt, t);
    }
  };
})();
