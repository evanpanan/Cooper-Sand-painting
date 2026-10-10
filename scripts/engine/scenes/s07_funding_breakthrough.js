(() => {
  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function drawLightTable(c, W, H, lt, t) {
    const breath = 0.98 + Math.sin(t * 1.1) * 0.02;
    const extra = 0.03;
    const r = Math.floor((0 + 20 * (lt + extra)) * breath);
    const g = Math.floor((32 + 58 * (lt + extra)) * breath);
    const b = Math.floor((64 + 81 * (lt + extra)) * breath);
    c.fillStyle = `rgb(${r},${g},${b})`;
    c.fillRect(0, 0, W, H);

    const vig = c.createRadialGradient(W / 2, H * 0.30, Math.min(W, H) * 0.05 * breath, W / 2, H * 0.72, Math.max(W, H) * 0.84 * breath);
    vig.addColorStop(0, `rgba(${Math.min(255, r + 28)},${Math.min(255, g + 42)},${Math.min(255, b + 56)},0)`);
    vig.addColorStop(1, `rgba(${Math.max(0, r - 16)},${Math.max(0, g - 42)},${Math.max(0, b - 74)},0.66)`);
    c.fillStyle = vig;
    c.fillRect(0, 0, W, H);

    const shimmerCount = 38;
    for (let i = 0; i < shimmerCount; i++) {
      const seed = i * 29.3 + t * 10;
      const x = rand(seed) * W;
      const y = rand(seed + 1) * H * 0.75;
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

  function drawCheckAndArrow(c, W, H, lt, t) {
    const growPhase = Math.min(1, Math.max(0, (t % 10) / 10));
    const arrowScale = 0.5 + growPhase * 0.6;

    const checkCx = W / 2;
    const checkCy = H * 0.38;
    const checkW = 360;
    const checkH = 220;
    const checkL = checkCx - checkW / 2;
    const checkR = checkCx + checkW / 2;
    const checkT = checkCy - checkH / 2;
    const checkB = checkCy + checkH / 2;
    const rC = 18;

    const corners = [
      { cx: checkL + rC, cy: checkT + rC, a0: Math.PI, a1: -Math.PI / 2 },
      { cx: checkR - rC, cy: checkT + rC, a0: -Math.PI / 2, a1: 0 },
      { cx: checkR - rC, cy: checkB - rC, a0: 0, a1: Math.PI / 2 },
      { cx: checkL + rC, cy: checkB - rC, a0: Math.PI / 2, a1: Math.PI }
    ];
    const ptsPer = 4;
    c.beginPath();
    corners.forEach((cc, ci) => {
      const startAng = cc.a0;
      const endAng = cc.a1;
      for (let i = 0; i <= ptsPer; i++) {
        const ang = startAng + (i / ptsPer) * (endAng - startAng);
        const jr = rC + (rand(ci * 100 + i * 6.3 + 100) - 0.5) * 5;
        const px = cc.cx + Math.cos(ang) * jr;
        const py = cc.cy + Math.sin(ang) * jr;
        if (ci === 0 && i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
    });
    c.closePath();
    c.fillStyle = `rgba(${Math.floor(168 * lt)},${Math.floor(176 * lt)},${Math.floor(158 * lt)},0.38)`;
    c.fill();

    for (let i = 0; i < 800; i++) {
      const seed = i * 5.5 + 1000;
      const t01 = rand(seed);
      const t02 = rand(seed + 1);
      const insetX = rC + 8;
      const insetY = rC + 8;
      const px = checkL + insetX + t01 * (checkW - 2 * insetX) + (rand(seed + 2) - 0.5) * 6;
      const py = checkT + insetY + t02 * (checkH - 2 * insetY) + (rand(seed + 3) - 0.5) * 5;
      const density = 0.14 + rand(seed + 4) * 0.28;
      const dr = 164 + Math.floor(rand(seed + 5) * 24);
      const dg = 172 + Math.floor(rand(seed + 6) * 18);
      const db = 154 + Math.floor(rand(seed + 7) * 14);
      c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${density})`;
      c.beginPath();
      c.arc(px, py, 0.45 + rand(seed + 8) * 1.6, 0, Math.PI * 2);
      c.fill();
    }

    corners.forEach((cc, ci) => {
      const startAng = cc.a0;
      const endAng = cc.a1;
      for (let i = 0; i < 30; i++) {
        const seed = ci * 1000 + i * 5.1 + 2000;
        const ang = startAng + rand(seed) * (endAng - startAng);
        const inOut = rand(seed + 1);
        const jr = rC - 2 + inOut * 14;
        const px = cc.cx + Math.cos(ang) * jr + (rand(seed + 2) - 0.5) * 4;
        const py = cc.cy + Math.sin(ang) * jr + (rand(seed + 3) - 0.5) * 3;
        const fade = 1 - Math.abs(inOut - 0.5) * 1.5;
        const dr = 126 + Math.floor(rand(seed + 4) * 28);
        const dg = 134 + Math.floor(rand(seed + 5) * 22);
        const db = 116 + Math.floor(rand(seed + 6) * 16);
        const alpha = Math.max(0, (0.18 + rand(seed + 7) * 0.36) * fade);
        c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.55 + rand(seed + 8) * 1.8, 0, Math.PI * 2);
        c.fill();
      }
    });

    const arrowBaseY = checkB + 10;
    const arrowTopY = H * 0.82;
    const arrowCx = W / 2;
    const aH = (arrowTopY - arrowBaseY) * arrowScale;
    const aBotY = arrowBaseY;
    const aTopY = arrowBaseY + aH;
    const shaftW = 28;
    const headW = 80;
    const headH = 70;

    const shaftPts = [
      { x: arrowCx - shaftW / 2, y: aBotY },
      { x: arrowCx - shaftW / 2, y: aTopY - headH },
      { x: arrowCx - headW / 2, y: aTopY - headH },
      { x: arrowCx, y: aTopY },
      { x: arrowCx + headW / 2, y: aTopY - headH },
      { x: arrowCx + shaftW / 2, y: aTopY - headH },
      { x: arrowCx + shaftW / 2, y: aBotY }
    ];
    const jPts = 4;
    c.beginPath();
    for (let pi = 0; pi < shaftPts.length; pi++) {
      const cc = shaftPts[pi];
      const next = shaftPts[(pi + 1) % shaftPts.length];
      for (let i = 0; i <= jPts; i++) {
        const tt = i / jPts;
        const mx = cc.x + (next.x - cc.x) * tt + (rand(pi * 100 + i * 4.7 + 3000) - 0.5) * 5;
        const my = cc.y + (next.y - cc.y) * tt + (rand(pi * 100 + i * 4.7 + 3010) - 0.5) * 4;
        if (pi === 0 && i === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
    }
    c.closePath();
    c.fillStyle = `rgba(${Math.floor(124 * lt)},${Math.floor(132 * lt)},${Math.floor(114 * lt)},0.46)`;
    c.fill();

    for (let i = 0; i < 600; i++) {
      const seed = i * 6.3 + 4000;
      const tt = rand(seed);
      const yy = aBotY + tt * aH;
      let localW;
      const fromBot = (yy - aBotY) / Math.max(1, aH);
      if (fromBot < 1 - headH / Math.max(1, aH)) localW = shaftW * 0.42;
      else {
        const ht = (fromBot - (1 - headH / Math.max(1, aH))) / (headH / Math.max(1, aH));
        localW = shaftW * 0.42 + (headW * 0.5 - shaftW * 0.42) * Math.min(1, ht * 2);
        if (ht > 0.5) localW = headW * 0.5 * (1 - (ht - 0.5) / 0.5);
      }
      const xOff = (rand(seed + 1) - 0.5) * 2 * localW * 0.88;
      const px = arrowCx + xOff;
      const py = yy;
      if (Math.abs(xOff) <= localW * 0.92) {
        const dr = 120 + Math.floor(rand(seed + 2) * 30);
        const dg = 128 + Math.floor(rand(seed + 3) * 24);
        const db = 110 + Math.floor(rand(seed + 4) * 18);
        const alpha = 0.18 + rand(seed + 5) * 0.42;
        c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.6 + rand(seed + 6) * 2, 0, Math.PI * 2);
        c.fill();
      }
    }

    const dabR = 22;
    const dabY1 = aBotY + aH * 0.3;
    const dabY2 = aBotY + aH * 0.75;
    for (let side = -1; side <= 1; side += 2) {
      const dabCx = arrowCx + side * (shaftW * 0.5 + dabR * 0.4);
      for (let di = 0; di < 2; di++) {
        const cy = di === 0 ? dabY1 : dabY2;
        for (let i = 0; i < 50; i++) {
          const seed = (side + 2) * 10000 + di * 1000 + i * 5.7;
          const ang = rand(seed) * Math.PI * 2;
          const dist = Math.pow(rand(seed + 1), 0.6) * dabR;
          const px = dabCx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 4;
          const py = cy + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 3;
          const fade = 1 - dist / dabR * 0.5;
          const dr = 148 + Math.floor(rand(seed + 4) * 24);
          const dg = 156 + Math.floor(rand(seed + 5) * 18);
          const db = 140 + Math.floor(rand(seed + 6) * 14);
          const alpha = (0.15 + rand(seed + 7) * 0.3) * fade;
          c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
          c.beginPath();
          c.arc(px, py, 0.5 + rand(seed + 8) * 1.6, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    function drawMiniHandshake(hxCx, hyCy, sizeMul) {
      const hsR = 14 * sizeMul;
      for (let layer = 0; layer < 2; layer++) {
        const lr = hsR - layer * 3;
        const count = 45 - layer * 12;
        for (let i = 0; i < count; i++) {
          const seed = 50000 + Math.floor(hxCx) + layer * 500 + i * 4.9;
          const ang = rand(seed) * Math.PI * 2;
          const dist = Math.pow(rand(seed + 1), 0.6) * lr;
          const px = hxCx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 3;
          const py = hyCy + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 3;
          const fade = 1 - dist / lr * 0.5;
          const dr = 122 + Math.floor(rand(seed + 4) * 26);
          const dg = 130 + Math.floor(rand(seed + 5) * 20);
          const db = 112 + Math.floor(rand(seed + 6) * 14);
          const alpha = (0.22 + rand(seed + 7) * 0.38) * fade;
          c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
          c.beginPath();
          c.arc(px, py, 0.55 + rand(seed + 8) * 1.7, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    drawMiniHandshake(W * 0.15, H * 0.56, 1.0);
    drawMiniHandshake(W * 0.85, H * 0.56, 1.0);
  }

  function drawMidSand(c, W, H, lt) {
    const checkCx = W / 2;
    const checkCy = H * 0.38;
    const checkW = 360;
    const checkH = 220;
    const checkL = checkCx - checkW / 2;
    const checkR = checkCx + checkW / 2;
    const checkT = checkCy - checkH / 2;
    const checkB = checkCy + checkH / 2;
    const rC = 18;
    const softW = 4;

    const corners = [
      { cx: checkL + rC, cy: checkT + rC, a0: Math.PI, a1: -Math.PI / 2 },
      { cx: checkR - rC, cy: checkT + rC, a0: -Math.PI / 2, a1: 0 },
      { cx: checkR - rC, cy: checkB - rC, a0: 0, a1: Math.PI / 2 },
      { cx: checkL + rC, cy: checkB - rC, a0: Math.PI / 2, a1: Math.PI }
    ];
    corners.forEach((cc, ci) => {
      for (let i = 0; i < 25; i++) {
        const seed = ci * 500 + i * 7.3 + 60000;
        const ang = cc.a0 + rand(seed) * (cc.a1 - cc.a0);
        const jr = rC - 2 + rand(seed + 1) * (softW + 8);
        const px = cc.cx + Math.cos(ang) * jr + (rand(seed + 2) - 0.5) * 3;
        const py = cc.cy + Math.sin(ang) * jr + (rand(seed + 3) - 0.5) * 3;
        const norm = Math.abs(jr - rC) / (softW + 8);
        const fade = Math.max(0, 1 - norm);
        const mr = 156 + Math.floor(rand(seed + 4) * 20);
        const mg = 164 + Math.floor(rand(seed + 5) * 14);
        const mb = 148 + Math.floor(rand(seed + 6) * 10);
        const alpha = (0.12 + rand(seed + 7) * 0.18) * fade;
        c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.45 + rand(seed + 8) * 1.3, 0, Math.PI * 2);
        c.fill();
      }
    });

    const arrowCx = W / 2;
    const arrowBaseY = checkB + 10;
    const arrowTopY = H * 0.82;
    const aTopY = arrowBaseY + (arrowTopY - arrowBaseY) * 0.9;
    const cornersArr = [
      { x: arrowCx - 80 / 2, y: aTopY - 70 },
      { x: arrowCx, y: aTopY },
      { x: arrowCx + 80 / 2, y: aTopY - 70 }
    ];
    for (let ci = 0; ci < cornersArr.length; ci++) {
      const pt = cornersArr[ci];
      for (let i = 0; i < 20; i++) {
        const seed = 70000 + ci * 300 + i * 6.1;
        const ang = rand(seed) * Math.PI * 2;
        const dist = rand(seed + 1) * (4 + softW);
        const px = pt.x + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 3;
        const py = pt.y + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 2.5;
        const fade = Math.max(0, 1 - dist / (4 + softW));
        const mr = 154 + Math.floor(rand(seed + 4) * 22);
        const mg = 162 + Math.floor(rand(seed + 5) * 16);
        const mb = 146 + Math.floor(rand(seed + 6) * 12);
        const alpha = (0.1 + rand(seed + 7) * 0.16) * fade;
        c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.4 + rand(seed + 8) * 1.2, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawBrightScratches(c, W, H, lt) {
    const checkCx = W / 2;
    const checkCy = H * 0.38;
    const amountCx = checkCx - 60;
    const amountCy = checkCy - 25;

    const yuanSize = 22;
    c.save();
    c.translate(amountCx, amountCy);
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${0.30 - pass * 0.06})`;
      c.lineWidth = 3.2 - pass * 0.6;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 24;
      for (let s = 0; s <= steps; s++) {
        const ang = (s / steps) * Math.PI * 2;
        const jr = yuanSize + Math.sin(ang * 5 + pass) * 2.5 + (rand(s * 3.3 + pass * 60) - 0.5) * 2;
        const x = Math.cos(ang) * jr;
        const y = Math.sin(ang) * jr;
        if (s === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${0.26 - pass * 0.05})`;
      c.lineWidth = 2.8 - pass * 0.5;
      c.lineCap = 'round';
      c.beginPath();
      const half = yuanSize * 0.45;
      const steps2 = 10;
      for (let s = 0; s <= steps2; s++) {
        const t = s / steps2;
        const mx = -half + t * half * 2 + (rand(s * 4.1 + pass * 50 + 80000) - 0.5) * 2;
        const my = -yuanSize * 0.65 + (rand(s * 4.1 + pass * 50 + 80001) - 0.5) * 1.5;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.moveTo(-half * 0.55 + (rand(1) - 0.5) * 1.5, -yuanSize * 0.5);
      for (let s = 0; s <= steps2; s++) {
        const t = s / steps2;
        const mx = -half * 0.55 + (rand(s * 3.9 + pass * 50 + 80010) - 0.5) * 1.5;
        const my = -yuanSize * 0.5 + t * yuanSize * 1.05 + (rand(s * 3.9 + pass * 50 + 80011) - 0.5) * 1.5;
        c.lineTo(mx, my);
      }
      c.stroke();
    }
    c.restore();

    const arrowBaseY = H * 0.38 + 220 / 2 + 10;
    const arrowTopY = H * 0.82;
    const arrowCx = W / 2;
    const shaftX = arrowCx;
    const startY = arrowBaseY + 10;
    const endY = arrowTopY - 50;
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${0.28 - pass * 0.06})`;
      c.lineWidth = 3.0 - pass * 0.6;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      const steps = 18;
      for (let s = 0; s <= steps; s++) {
        const tt = s / steps;
        const mx = shaftX + Math.sin(tt * Math.PI * 3 + pass) * 3 + (rand(s * 4.3 + pass * 70 + 90000) - 0.5) * 2;
        const my = startY + (endY - startY) * tt + (rand(s * 4.3 + pass * 70 + 90001) - 0.5) * 2;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      const headSteps = 6;
      const arrowTipX = arrowCx;
      const arrowTipY = endY + 50;
      for (let s = 0; s <= headSteps; s++) {
        const tt = s / headSteps;
        const from = { x: shaftX, y: endY };
        const to = { x: arrowCx - 40, y: endY };
        const midX = from.x + (to.x - from.x) * tt;
        const midY = from.y + (to.y - from.y) * tt;
        c.lineTo(midX, midY);
      }
      c.moveTo(shaftX, endY);
      for (let s = 0; s <= headSteps; s++) {
        const tt = s / headSteps;
        const from = { x: shaftX, y: endY };
        const to = { x: arrowCx + 40, y: endY };
        const midX = from.x + (to.x - from.x) * tt;
        const midY = from.y + (to.y - from.y) * tt;
        c.lineTo(midX, midY);
      }
      c.moveTo(arrowCx - 40, endY);
      for (let s = 0; s <= headSteps * 2; s++) {
        const tt = s / (headSteps * 2);
        const mx = arrowCx - 40 + tt * 80;
        const my = endY + (1 - Math.abs(tt - 0.5) * 2) * -50;
        c.lineTo(mx, my);
      }
      c.stroke();
    }
  }

  function pourThin(c, W, H, lt, t) {
    const corners = [
      { cx: W / 2 - 180, cy: H * 0.38 - 110 },
      { cx: W / 2 + 180, cy: H * 0.38 - 110 },
      { cx: W / 2 - 180, cy: H * 0.38 + 110 },
      { cx: W / 2 + 180, cy: H * 0.38 + 110 }
    ];
    const phase = Math.min(1, (t % 10) / 5);
    corners.forEach((cc, ci) => {
      const streamCount = 2;
      for (let s = 0; s < streamCount; s++) {
        const seed = 100000 + ci * 100 + s * 53.1;
        const sx = cc.cx + (rand(seed) - 0.5) * 10;
        const sy = cc.cy + (rand(seed + 1) - 0.5) * 8;
        const endX = sx + (rand(seed + 2) - 0.5) * 20;
        const endY = sy + 60 + rand(seed + 3) * 30;
        const steps = 14;
        const maxI = Math.floor(steps * phase);
        for (let i = 0; i < maxI; i++) {
          const tt = i / steps;
          const mx = sx + (endX - sx) * tt + Math.sin(tt * 6 + s) * 3 + (rand(seed + i + 10) - 0.5) * 3;
          const my = sy + (endY - sy) * tt + tt * tt * 10 + (rand(seed + i + 20) - 0.5) * 3;
          const fade = Math.sin(tt * Math.PI);
          for (let j = 0; j < 2; j++) {
            const px = mx + (rand(seed + i * 3 + j + 30) - 0.5) * 4;
            const py = my + (rand(seed + i * 3 + j + 40) - 0.5) * 3;
            const size = 0.35 + rand(seed + i * 3 + j + 50) * 1.3;
            const sr = 176 + Math.floor(rand(seed + i + j + 60) * 20);
            const sg = 184 + Math.floor(rand(seed + i + j + 61) * 16);
            const sb = 168 + Math.floor(rand(seed + i + j + 62) * 14);
            const alpha = (0.1 + rand(seed + i + j + 70) * 0.2) * fade;
            c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${alpha})`;
            c.beginPath();
            c.arc(px, py, size, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    });
  }

  window.SCENES = window.SCENES || {};
  window.SCENES['s07_funding_breakthrough'] = {
    meta: {
      name: 'S5 突破·融资支票',
      style: 'realistic_cool',
      palette_name: '写实冷光台-5色',
      duration: 10.0
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawCheckAndArrow(c, W, H, lt, t);
      drawMidSand(c, W, H, lt);
      drawBrightScratches(c, W, H, lt);
      pourThin(c, W, H, lt, t);
    }
  };
})();
