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

    const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
    const doFlash = (t % 10) / 10;
    if ((doFlash > 0.31 && doFlash < 0.35) || (doFlash > 0.64 && doFlash < 0.68)) {
      const flashK = 0.5 + 0.5 * Math.sin(pulse * Math.PI * 10);
      c.save();
      c.globalAlpha = 0.05 * flashK;
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

  function drawPersonSilhouette(c, cx, baseY, height, widthRatio, lt, seedBase) {
    const w = height * widthRatio;
    const headR = height * 0.13;
    const headCy = baseY - height + headR;
    const shoulderY = headCy + headR * 1.8;
    const hipY = baseY - height * 0.28;

    const bodyPts = 14;
    c.beginPath();
    const outline = [];
    for (let side = 0; side < 2; side++) {
      const sideSign = side === 0 ? 1 : -1;
      for (let i = 0; i <= bodyPts; i++) {
        const tt = i / bodyPts;
        let px, py;
        if (tt < 0.12) {
          const ang = -Math.PI / 2 + tt / 0.12 * Math.PI * sideSign;
          px = cx + Math.cos(ang) * headR * 1.02 + (rand(seedBase + side * 100 + i * 3) - 0.5) * 6;
          py = headCy + Math.sin(ang) * headR * 1.02 + (rand(seedBase + side * 100 + i * 3 + 11) - 0.5) * 5;
        } else if (tt < 0.32) {
          const local = (tt - 0.12) / 0.20;
          const yy = shoulderY + (hipY - shoulderY) * local * 0.35;
          const shoulderW = w * 0.5;
          const taper = 1 - local * 0.1;
          const xx = cx + sideSign * shoulderW * taper + (rand(seedBase + side * 100 + i * 3 + 50) - 0.5) * 7;
          px = xx;
          py = yy + (rand(seedBase + side * 100 + i * 3 + 61) - 0.5) * 5;
        } else if (tt < 0.72) {
          const local = (tt - 0.32) / 0.40;
          const yy = shoulderY + (hipY - shoulderY) * (0.35 + local * 0.65);
          const hipW = w * 0.36;
          const taper = 1 - Math.abs(local - 0.5) * 0.15;
          const xx = cx + sideSign * hipW * taper + (rand(seedBase + side * 100 + i * 3 + 100) - 0.5) * 7;
          px = xx;
          py = yy + (rand(seedBase + side * 100 + i * 3 + 111) - 0.5) * 5;
        } else {
          const local = (tt - 0.72) / 0.28;
          const legInset = sideSign * w * 0.18;
          const yy = hipY + (baseY - hipY) * local;
          const legTaper = 1 - local * 0.45;
          const xx = cx + legInset + sideSign * w * 0.15 * legTaper + (rand(seedBase + side * 100 + i * 3 + 150) - 0.5) * 6;
          px = xx;
          py = yy + (rand(seedBase + side * 100 + i * 3 + 161) - 0.5) * 4;
        }
        outline.push({ x: px, y: py });
        if (side === 0 && i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
    }
    c.closePath();
    c.fillStyle = `rgba(${Math.floor(118 * lt)},${Math.floor(126 * lt)},${Math.floor(108 * lt)},0.52)`;
    c.fill();

    for (let i = 0; i < 900; i++) {
      const seed = seedBase + i * 6.7 + 500;
      const tBox = rand(seed);
      const ySel = baseY - height * tBox + (rand(seed + 1) - 0.5) * 8;
      let maxXAtY;
      const rel = 1 - (baseY - ySel) / height;
      if (rel < 0.15) maxXAtY = headR * 0.95;
      else if (rel < 0.45) maxXAtY = w * 0.5 * (1 - (rel - 0.15) / 0.30 * 0.1);
      else if (rel < 0.8) maxXAtY = w * 0.36;
      else maxXAtY = w * 0.18 * (1 - (rel - 0.8) / 0.2 * 0.45);
      const xOff = (rand(seed + 2) - 0.5) * 2 * maxXAtY * 0.85;
      const px = cx + xOff;
      const py = ySel;
      const inside = Math.abs(xOff) <= maxXAtY * 0.95;
      if (inside) {
        const alpha = 0.16 + rand(seed + 3) * 0.4;
        const dr = 124 + Math.floor(rand(seed + 4) * 30);
        const dg = 132 + Math.floor(rand(seed + 5) * 24);
        const db = 114 + Math.floor(rand(seed + 6) * 18);
        c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.6 + rand(seed + 7) * 2, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawThreePeople(c, W, H, lt) {
    const baseY = H * 0.9;
    const hL = H * 0.6;
    const hM = H * 0.54;
    const hR = H * 0.65;
    const wR = 0.30;

    const pLx = W * 0.26;
    const pMx = W * 0.48;
    const pRx = W * 0.72;

    drawPersonSilhouette(c, pLx, baseY, hL, wR, lt, 10000);
    drawPersonSilhouette(c, pMx, baseY, hM, wR, lt, 20000);
    drawPersonSilhouette(c, pRx, baseY, hR, wR, lt, 30000);

    const handShakeX = (pMx + pRx) / 2 + 8;
    const handShakeY = baseY - hM * 0.42;
    const hsR = 20;
    for (let layer = 0; layer < 3; layer++) {
      const layerR = hsR - layer * 4;
      const count = 70 - layer * 15;
      const layerAlpha = 0.35 + layer * 0.1;
      for (let i = 0; i < count; i++) {
        const seed = 40000 + layer * 1000 + i * 5.3;
        const ang = rand(seed) * Math.PI * 2;
        const dist = Math.pow(rand(seed + 1), 0.6) * layerR;
        const x = handShakeX + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 4;
        const y = handShakeY + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 4;
        const fade = 1 - dist / layerR * 0.5;
        const dr = 110 + Math.floor(rand(seed + 4) * 28);
        const dg = 118 + Math.floor(rand(seed + 5) * 22);
        const db = 100 + Math.floor(rand(seed + 6) * 16);
        const alpha = (layerAlpha + rand(seed + 7) * 0.3) * fade;
        c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
        c.beginPath();
        c.arc(x, y, 0.6 + rand(seed + 8) * 2, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function scratchLine(c, x1, y1, x2, y2, lt, thickness, alpha) {
    const steps = 24;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(118 * lt)},${Math.floor(126 * lt)},${Math.floor(108 * lt)},${alpha - pass * 0.08})`;
      c.lineWidth = thickness - pass * 1.2;
      c.lineCap = 'round';
      c.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const mx = x1 + (x2 - x1) * t + (rand(s * 5.3 + pass * 100) - 0.5) * 3;
        const my = y1 + (y2 - y1) * t + (rand(s * 5.3 + pass * 100 + 11) - 0.5) * 2.5;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }
  }

  function drawMidSand(c, W, H, lt) {
    const baseY = H * 0.9;
    const people = [
      { cx: W * 0.26, h: H * 0.6, wR: 0.30, sBase: 50000 },
      { cx: W * 0.48, h: H * 0.54, wR: 0.30, sBase: 55000 },
      { cx: W * 0.72, h: H * 0.65, wR: 0.30, sBase: 60000 }
    ];
    people.forEach(p => {
      const softW = 6;
      for (let i = 0; i < 55; i++) {
        const seed = p.sBase + i * 8.1;
        const tBox = rand(seed);
        const ySel = baseY - p.h * tBox + (rand(seed + 1) - 0.5) * 5;
        let maxXAtY;
        const rel = 1 - (baseY - ySel) / p.h;
        if (rel < 0.15) maxXAtY = p.h * p.wR * 0.13 + softW;
        else if (rel < 0.45) maxXAtY = p.h * p.wR * 0.5 + softW;
        else if (rel < 0.8) maxXAtY = p.h * p.wR * 0.36 + softW;
        else maxXAtY = p.h * p.wR * 0.18 + softW;
        const sidePick = rand(seed + 2) > 0.5 ? 1 : -1;
        const edgeDepth = 0.65 + rand(seed + 3) * 0.35;
        const xOff = sidePick * maxXAtY * edgeDepth;
        const px = p.cx + xOff + (rand(seed + 4) - 0.5) * 5;
        const py = ySel + (rand(seed + 5) - 0.5) * 4;
        const norm = (Math.abs(xOff) - (maxXAtY - softW - 4)) / (softW + 4);
        const fade = Math.max(0, 1 - Math.abs(norm));
        const mr = 154 + Math.floor(rand(seed + 6) * 22);
        const mg = 162 + Math.floor(rand(seed + 7) * 16);
        const mb = 144 + Math.floor(rand(seed + 8) * 12);
        const alpha = (0.12 + rand(seed + 9) * 0.2) * fade;
        c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.5 + rand(seed + 10) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    });

    scratchLine(c, W * 0.06, baseY + 3, W * 0.94, baseY + 3, lt, 4.5, 0.38);
    for (let i = 0; i < 120; i++) {
      const seed = i * 7.3 + 65000;
      const t01 = rand(seed);
      const x = W * 0.06 + W * 0.88 * t01 + (rand(seed + 1) - 0.5) * 18;
      const y = baseY + 6 + rand(seed + 2) * 16;
      const fade = Math.sin(t01 * Math.PI);
      const sr = 148 + Math.floor(rand(seed + 3) * 24);
      const sg = 156 + Math.floor(rand(seed + 4) * 18);
      const sb = 140 + Math.floor(rand(seed + 5) * 14);
      const alpha = (0.1 + rand(seed + 6) * 0.22) * fade;
      c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.55 + rand(seed + 7) * 1.8, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawBrightScratches(c, W, H, lt) {
    const baseY = H * 0.9;
    const hM = H * 0.54, hR = H * 0.65;
    const pMx = W * 0.48, pRx = W * 0.72;
    const hsX = (pMx + pRx) / 2 + 8;
    const hsY = baseY - hM * 0.42;

    const hsR = 26;
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${0.33 - pass * 0.07})`;
      c.lineWidth = 3.6 - pass * 0.7;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 36;
      for (let s = 0; s <= steps; s++) {
        const ang = (s / steps) * Math.PI * 2;
        const jr = hsR + Math.sin(ang * 5 + pass * 0.8) * 4.5 + (rand(s * 3.5 + pass * 80) - 0.5) * 3;
        const x = hsX + Math.cos(ang) * jr;
        const y = hsY + Math.sin(ang) * jr;
        if (s === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }

    const glowC = 90;
    for (let g = 0; g < glowC; g++) {
      const seed = g * 6.5 + 70000;
      const ang = rand(seed) * Math.PI * 2;
      const jr = hsR + (rand(seed + 1) - 0.5) * 22;
      const x = hsX + Math.cos(ang) * jr;
      const y = hsY + Math.sin(ang) * jr;
      const distNorm = Math.abs(jr - hsR) / 22;
      const fade = 1 - distNorm;
      const alpha = (0.09 + rand(seed + 2) * 0.18) * fade;
      if (alpha > 0) {
        c.fillStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(135 * lt)},${Math.floor(172 * lt)},${alpha})`;
        c.beginPath();
        c.arc(x, y, 0.45 + rand(seed + 3) * 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function dabShape(c, cx, cy, radius, count, lt, baseSeed) {
    for (let i = 0; i < count; i++) {
      const seed = baseSeed + i * 5.1;
      const ang = rand(seed) * Math.PI * 2;
      const dist = Math.pow(rand(seed + 1), 0.7) * radius;
      const x = cx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 5;
      const y = cy + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 5;
      const fade = 1 - dist / radius * 0.4;
      const dr = 168 + Math.floor(rand(seed + 4) * 28);
      const dg = 176 + Math.floor(rand(seed + 5) * 22);
      const db = 160 + Math.floor(rand(seed + 6) * 16);
      const alpha = (0.10 + rand(seed + 7) * 0.22) * fade;
      c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.4 + rand(seed + 8) * 1.5, 0, Math.PI * 2);
      c.fill();
    }
  }

  function flowAlong(c, startX, startY, endX, endY, count, lt, t, baseSeed) {
    const phase = Math.min(1, (t % 10) / 7);
    for (let i = 0; i < count; i++) {
      const seed = baseSeed + i * 4.5;
      const tBase = 0.02 + rand(seed) * 0.96;
      const localT = Math.max(0, Math.min(1, phase * 1.12 - tBase * (1 - phase * 0.45)));
      if (localT <= 0 || localT >= 1) continue;
      const midX = startX + (endX - startX) * localT + Math.sin(localT * Math.PI * 5 + i) * 7;
      const midY = startY + (endY - startY) * localT + Math.sin(localT * Math.PI * 4 + i * 0.6) * 5;
      const dx = endX - startX, dy = endY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const off = (rand(seed + 1) - 0.5) * 12;
      const px = midX + nx * off + (rand(seed + 2) - 0.5) * 4;
      const py = midY + ny * off + (rand(seed + 3) - 0.5) * 4;
      const fade = Math.sin(localT * Math.PI);
      const alpha = (0.08 + rand(seed + 4) * 0.20) * fade;
      const size = 0.35 + rand(seed + 5) * 1.6;
      if (alpha > 0) {
        const fr = 152 + Math.floor(rand(seed + 6) * 28);
        const fg = 160 + Math.floor(rand(seed + 7) * 22);
        const fb = 142 + Math.floor(rand(seed + 8) * 16);
        c.fillStyle = `rgba(${Math.floor(fr * lt)},${Math.floor(fg * lt)},${Math.floor(fb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, size, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawMotifs(c, W, H, lt, t) {
    const baseY = H * 0.9;
    const pLx = W * 0.26, hL = H * 0.6;
    const pMx = W * 0.48, hM = H * 0.54;
    const pRx = W * 0.72, hR = H * 0.65;

    const haloR = 34;
    dabShape(c, pLx, baseY - hL + hL * 0.10, haloR, 60, lt, 80000);
    dabShape(c, pMx, baseY - hM + hM * 0.10, haloR, 60, lt, 81000);
    dabShape(c, pRx, baseY - hR + hR * 0.10, haloR, 60, lt, 82000);

    const targetX = W / 2;
    const targetY = baseY + 10;
    for (let fi = 0; fi < 6; fi++) {
      const sx = W * 0.02 + (fi / 5) * W * 0.25;
      const sy = baseY - 20 + (rand(fi * 31) - 0.5) * 20;
      flowAlong(c, sx, sy, targetX - 15, targetY, 14, lt, t, 83000 + fi * 100);
    }
    for (let fi = 0; fi < 6; fi++) {
      const sx = W * 0.73 + (fi / 5) * W * 0.25;
      const sy = baseY - 20 + (rand(fi * 31 + 500) - 0.5) * 20;
      flowAlong(c, sx, sy, targetX + 15, targetY, 14, lt, t, 84000 + fi * 100);
    }
  }

  window.SCENES = window.SCENES || {};
  window.SCENES['s05_hiring_team'] = {
    meta: {
      name: 'S3 扩张·团队招人',
      style: 'realistic_cool',
      palette_name: '写实冷光台-5色',
      duration: 10.0
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawThreePeople(c, W, H, lt);
      drawMidSand(c, W, H, lt);
      drawBrightScratches(c, W, H, lt);
      drawMotifs(c, W, H, lt, t);
    }
  };
})();
