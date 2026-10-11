(() => {
  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function drawLightTable(c, W, H, lt, t) {
    const breath = 0.98 + Math.sin(t * 1.1) * 0.02;
    const r = Math.floor((150 + 20 * lt) * breath);
    const g = Math.floor((172 + 26 * lt) * breath);
    const b = Math.floor((178 + 22 * lt) * breath);
    c.fillStyle = `rgb(${r},${g},${b})`;
    c.fillRect(0, 0, W, H);

    const vig = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.08 * breath, W / 2, H / 2, Math.max(W, H) * 0.78 * breath);
    vig.addColorStop(0, `rgba(${Math.min(255, r + 20)},${Math.min(255, g + 32)},${Math.min(255, b + 42)},0)`);
    vig.addColorStop(1, `rgba(${Math.max(0, r - 10)},${Math.max(0, g - 30)},${Math.max(0, b - 55)},0.52)`);
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

    const qFlash = 0.5 + 0.5 * Math.sin(t * 0.7);
    if (qFlash > 0.97) {
      const flashK = (qFlash - 0.97) / 0.03;
      c.save();
      c.globalAlpha = 0.06 * flashK;
      c.fillStyle = 'rgba(160, 200, 230, 1)';
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
      const gr = 110 + Math.floor(rand(seed + 4) * 80);
      const gg = 118 + Math.floor(rand(seed + 5) * 70);
      const gb = 100 + Math.floor(rand(seed + 6) * 60);
      c.fillStyle = `rgba(${Math.floor(gr * lt)},${Math.floor(gg * lt)},${Math.floor(gb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, size, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawSeedThick(c, W, H, lt) {
    const cx = W / 2;
    const cy = H * 0.6;
    const seedR = 55;

    const pts = 8;
    c.beginPath();
    for (let i = 0; i <= pts; i++) {
      const ang = (i / pts) * Math.PI * 2;
      const jr = seedR + (rand(i * 13.7 + 100) - 0.5) * 14;
      const px = cx + Math.cos(ang) * jr;
      const py = cy + Math.sin(ang) * jr;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    const sr1 = 138, sg1 = 146, sb1 = 128;
    c.fillStyle = `rgba(${Math.floor(sr1 * lt)},${Math.floor(sg1 * lt)},${Math.floor(sb1 * lt)},0.52)`;
    c.fill();

    for (let i = 0; i < 300; i++) {
      const seed = i * 7.3 + 300;
      const ang = rand(seed) * Math.PI * 2;
      const dist = Math.pow(rand(seed + 1), 0.6) * (seedR * 0.88);
      const x = cx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 6;
      const y = cy + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 6;
      const fade = 1 - dist / seedR * 0.5;
      const dr = 128 + Math.floor(rand(seed + 4) * 28);
      const dg = 136 + Math.floor(rand(seed + 5) * 22);
      const db = 118 + Math.floor(rand(seed + 6) * 16);
      const alpha = (0.18 + rand(seed + 7) * 0.4) * fade;
      c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.6 + rand(seed + 8) * 2, 0, Math.PI * 2);
      c.fill();
    }
  }

  function scratchLine(c, x1, y1, x2, y2, lt, thickness, alpha) {
    const steps = 24;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(118 * lt)},${Math.floor(126 * lt)},${Math.floor(108 * lt)},${alpha - pass * 0.08})`;
      c.lineWidth = thickness - pass * 1.5;
      c.lineCap = 'round';
      c.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const mx = x1 + (x2 - x1) * t + (rand(s * 5.3 + pass * 100) - 0.5) * 3;
        const my = y1 + (y2 - y1) * t + (rand(s * 5.3 + pass * 100 + 11) - 0.5) * 3;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }
    const pushed = 40;
    for (let side = -1; side <= 1; side += 2) {
      for (let pu = 0; pu < pushed; pu++) {
        const seed = pu * 6.7 + side * 500;
        const t = rand(seed);
        const midX = x1 + (x2 - x1) * t;
        const midY = y1 + (y2 - y1) * t;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const pushD = 4 + rand(seed + 1) * 10;
        const px = midX + nx * side * pushD + (rand(seed + 2) - 0.5) * 4;
        const py = midY + ny * side * pushD + (rand(seed + 3) - 0.5) * 4;
        const fade = Math.sin(t * Math.PI) * (1 - (pushD - 4) / 10 * 0.5);
        const alpha2 = (0.1 + rand(seed + 4) * 0.22) * fade;
        const pr = 148 + Math.floor(rand(seed + 5) * 25);
        const pg = 156 + Math.floor(rand(seed + 6) * 18);
        const pb = 138 + Math.floor(rand(seed + 7) * 14);
        c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha2})`;
        c.beginPath();
        c.arc(px, py, 0.5 + rand(seed + 8) * 1.8, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawMidSand(c, W, H, lt) {
    const cx = W / 2;
    const cy = H * 0.6;
    const seedR = 55;
    const softW = 8;

    for (let i = 0; i < 80; i++) {
      const seed = i * 9.3 + 2000;
      const ang = rand(seed) * Math.PI * 2;
      const dist = seedR - 4 + rand(seed + 1) * (softW + 8);
      const x = cx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 5;
      const y = cy + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 5;
      const norm = Math.abs(dist - seedR) / (softW + 8);
      const fade = Math.max(0, 1 - norm);
      const mr = 155 + Math.floor(rand(seed + 4) * 24);
      const mg = 163 + Math.floor(rand(seed + 5) * 18);
      const mb = 146 + Math.floor(rand(seed + 6) * 14);
      const alpha = (0.12 + rand(seed + 7) * 0.22) * fade;
      c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.5 + rand(seed + 8) * 1.6, 0, Math.PI * 2);
      c.fill();
    }

    const soilY = cy + seedR + 20;
    scratchLine(c, W * 0.15, soilY, W * 0.85, soilY, lt, 4.5, 0.38);

    for (let i = 0; i < 120; i++) {
      const seed = i * 8.5 + 3000;
      const t01 = rand(seed);
      const x = W * 0.15 + (W * 0.7) * t01 + (rand(seed + 1) - 0.5) * 20;
      const y = soilY + 3 + rand(seed + 2) * 18;
      const fade = Math.sin(t01 * Math.PI);
      const sr = 144 + Math.floor(rand(seed + 3) * 26);
      const sg = 152 + Math.floor(rand(seed + 4) * 20);
      const sb = 134 + Math.floor(rand(seed + 5) * 14);
      const alpha = (0.1 + rand(seed + 6) * 0.24) * fade;
      c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.6 + rand(seed + 7) * 2, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawBrightScratches(c, W, H, lt) {
    const cx = W / 2;
    const cy = H * 0.6;
    const seedR = 55;
    const sproutStartX = cx;
    const sproutStartY = cy - seedR + 5;
    const sproutEndX = cx;
    const sproutEndY = sproutStartY - 80;

    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.3 - pass * 0.06})`;
      c.lineWidth = 3.4 - pass * 0.7;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 18;
      for (let s = 0; s <= steps; s++) {
        const st = s / steps;
        const mx = sproutStartX + (sproutEndX - sproutStartX) * st + Math.sin(st * Math.PI * 3 + pass) * 4 + (rand(s * 7.7 + pass * 100) - 0.5) * 2;
        const my = sproutStartY + (sproutEndY - sproutStartY) * st + (rand(s * 7.7 + pass * 100 + 13) - 0.5) * 2;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }

    const glowC = 60;
    for (let g = 0; g < glowC; g++) {
      const seed = g * 6.1 + 4000;
      const st = rand(seed);
      const dline = (rand(seed + 1) - 0.5) * 12;
      const mx = sproutStartX + (sproutEndX - sproutStartX) * st;
      const my = sproutStartY + (sproutEndY - sproutStartY) * st;
      const dx = sproutEndX - sproutStartX, dy = sproutEndY - sproutStartY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const px = mx + nx * dline;
      const py = my + ny * dline;
      const norm = Math.abs(dline) / 12;
      const fade = (1 - norm) * Math.sin(st * Math.PI);
      const alpha = (0.1 + rand(seed + 2) * 0.2) * fade;
      if (alpha > 0) {
        c.fillStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(132 * lt)},${Math.floor(170 * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.4 + rand(seed + 3) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    }

    const soilY = cy + seedR + 20;
    const sideLx1 = W * 0.2, sideLx2 = W * 0.45;
    const sideRx1 = W * 0.55, sideRx2 = W * 0.8;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.22 - pass * 0.04})`;
      c.lineWidth = 2.6 - pass * 0.5;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 12;
      for (let s = 0; s <= steps; s++) {
        const st = s / steps;
        const mx = sideLx1 + (sideLx2 - sideLx1) * st + (rand(s * 4.1 + pass * 80) - 0.5) * 2.5;
        const my = soilY + Math.sin(st * Math.PI * 2 + pass) * 3 + (rand(s * 4.1 + pass * 80 + 9) - 0.5) * 2;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
      c.beginPath();
      for (let s = 0; s <= steps; s++) {
        const st = s / steps;
        const mx = sideRx1 + (sideRx2 - sideRx1) * st + (rand(s * 4.1 + pass * 80 + 200) - 0.5) * 2.5;
        const my = soilY + Math.sin(st * Math.PI * 2 + 1.5 + pass) * 3 + (rand(s * 4.1 + pass * 80 + 209) - 0.5) * 2;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }
  }

  function scratchGrowing(c, W, H, lt, t) {
    const cx = W / 2;
    const cy = H * 0.6;
    const seedR = 55;
    const growPhase = 0.3 + Math.min(1, Math.max(0, (t % 10) / 10)) * 0.7;
    const startX = cx;
    const startY = cy - seedR + 2;
    const baseLen = 35;
    const endX = cx;
    const endY = startY - baseLen * growPhase;

    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.3 - pass * 0.06})`;
      c.lineWidth = 3.4 - pass * 0.7;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 16;
      for (let s = 0; s <= steps; s++) {
        const st = s / steps;
        const mx = startX + (endX - startX) * st + Math.sin(st * Math.PI * 3 + pass) * 3.5 + (rand(s * 6.7 + pass * 100 + 5000) - 0.5) * 2;
        const my = startY + (endY - startY) * st + (rand(s * 6.7 + pass * 100 + 5013) - 0.5) * 2;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }

    const tipX = endX, tipY = endY;
    const ang = -Math.PI / 2;
    const perpA = ang + Math.PI / 2;
    for (let side = -1; side <= 1; side += 2) {
      for (let pu = 0; pu < 25; pu++) {
        const seed = pu * 7.1 + side * 300 + 6000;
        const st = 0.6 + rand(seed) * 0.4;
        const midX = startX + (endX - startX) * st;
        const midY = startY + (endY - startY) * st;
        const pushD = 4 + rand(seed + 1) * 9;
        const px = midX + Math.cos(perpA) * side * pushD;
        const py = midY + Math.sin(perpA) * side * pushD;
        const fade = (1 - (pushD - 4) / 9 * 0.5) * (0.5 + st * 0.5);
        const alpha = (0.1 + rand(seed + 2) * 0.2) * fade;
        const pr = 155 + Math.floor(rand(seed + 3) * 20);
        const pg = 162 + Math.floor(rand(seed + 4) * 14);
        const pb = 142 + Math.floor(rand(seed + 5) * 12);
        c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.5 + rand(seed + 6) * 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }

    const tipPile = 60;
    for (let i = 0; i < tipPile; i++) {
      const seed = i * 5.7 + 7000;
      const ta = ang + Math.PI + (rand(seed) - 0.5) * Math.PI * 0.85;
      const dist = rand(seed + 1) * 18;
      const x = tipX + Math.cos(ta) * dist + (rand(seed + 2) - 0.5) * 4;
      const y = tipY + Math.sin(ta) * dist + (rand(seed + 3) - 0.5) * 4;
      const fade = 1 - dist / 18 * 0.5;
      const alpha = (0.12 + rand(seed + 4) * 0.24) * fade;
      const pr = 158 + Math.floor(rand(seed + 5) * 22);
      const pg = 166 + Math.floor(rand(seed + 6) * 16);
      const pb = 144 + Math.floor(rand(seed + 7) * 12);
      c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.5 + rand(seed + 8) * 1.8, 0, Math.PI * 2);
      c.fill();
    }
  }

  function pourCorner(c, W, H, lt, t) {
    const cx = W * 0.12;
    const cy = H * 0.1;
    const pileX = W * 0.88;
    const pileY = H * 0.88;
    const baseSeed = 80000;
    const phase = Math.min(1, (t % 10) / 4);

    const streamCount = 4;
    for (let s = 0; s < streamCount; s++) {
      const seedS = baseSeed + s * 111.3;
      const startX = cx + (rand(seedS) - 0.5) * 30;
      const startY = cy + (rand(seedS + 1) - 0.5) * 20;
      const steps = 22;
      const maxI = Math.floor(steps * phase);
      for (let i = 0; i < maxI; i++) {
        const tt = i / steps;
        const x = startX + (pileX - startX) * tt + Math.sin(tt * 7 + s) * 6 + (rand(seedS + i) - 0.5) * 5;
        const y = startY + (pileY - startY) * tt + tt * tt * 25 + (rand(seedS + i + 17) - 0.5) * 4;
        const fade = Math.sin(tt * Math.PI);
        const density = 0.12 + rand(seedS + i + 33) * 0.22;
        for (let j = 0; j < 2; j++) {
          const px = x + (rand(seedS + i * 5 + j) - 0.5) * 6;
          const py = y + (rand(seedS + i * 5 + j + 11) - 0.5) * 4;
          const size = 0.4 + rand(seedS + i * 5 + j + 23) * 1.6;
          const sr = 176 + Math.floor(rand(seedS + i + j * 2 + 47) * 22);
          const sg = 184 + Math.floor(rand(seedS + i + j * 2 + 48) * 18);
          const sb = 168 + Math.floor(rand(seedS + i + j * 2 + 49) * 16);
          c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${density * fade})`;
          c.beginPath();
          c.arc(px, py, size, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    const pileCount = Math.floor(400 * phase);
    for (let i = 0; i < pileCount; i++) {
      const seed = baseSeed + i * 4.3;
      const ang = rand(seed) * Math.PI * 2;
      const dist = Math.pow(rand(seed + 1), 0.55) * 75;
      const x = pileX + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 6;
      const y = pileY + Math.sin(ang) * dist * 0.55 + (rand(seed + 3) - 0.5) * 4;
      const fade = 1 - dist / 75 * 0.6;
      const yBias = Math.max(0, (y - (pileY - 20)) / 70);
      const alpha = (0.18 + rand(seed + 4) * 0.3) * fade * (0.6 + yBias * 0.4);
      const pr = 152 + Math.floor(rand(seed + 5) * 26);
      const pg = 160 + Math.floor(rand(seed + 6) * 18);
      const pb = 140 + Math.floor(rand(seed + 7) * 14);
      c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.6 + rand(seed + 8) * 2, 0, Math.PI * 2);
      c.fill();
    }
  }

  window.SCENES = window.SCENES || {};
  window.SCENES['s03_germination_seed'] = {
    meta: {
      name: 'S1 萌芽·一颗种子',
      style: 'realistic_cool',
      palette_name: '写实冷光台-5色',
      duration: 10.0
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawSeedThick(c, W, H, lt);
      drawMidSand(c, W, H, lt);
      drawBrightScratches(c, W, H, lt);
      scratchGrowing(c, W, H, lt, t);
      pourCorner(c, W, H, lt, t);
    }
  };
})();
