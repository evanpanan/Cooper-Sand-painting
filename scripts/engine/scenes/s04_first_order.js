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

  function drawDeskPhoneThick(c, W, H, lt) {
    const deskY = H * 0.66;
    const deskH = H * 0.18;
    const deskL = W * 0.12, deskR = W * 0.88;

    const dPts = 6;
    c.beginPath();
    const corners = [
      { x: deskL, y: deskY },
      { x: deskR, y: deskY },
      { x: deskR - 8, y: deskY + deskH },
      { x: deskL + 8, y: deskY + deskH }
    ];
    for (let ci = 0; ci < corners.length; ci++) {
      const cc = corners[ci];
      for (let i = 0; i <= dPts; i++) {
        const next = corners[(ci + 1) % corners.length];
        const t = i / dPts;
        const mx = cc.x + (next.x - cc.x) * t + (rand(ci * 100 + i * 7.3 + 100) - 0.5) * 8;
        const my = cc.y + (next.y - cc.y) * t + (rand(ci * 100 + i * 7.3 + 111) - 0.5) * 6;
        if (ci === 0 && i === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
    }
    c.closePath();
    c.fillStyle = `rgba(${Math.floor(134 * lt)},${Math.floor(142 * lt)},${Math.floor(124 * lt)},0.48)`;
    c.fill();

    for (let i = 0; i < 800; i++) {
      const seed = i * 6.1 + 200;
      const x = deskL + 6 + rand(seed) * (deskR - deskL - 12);
      const y = deskY + 4 + rand(seed + 1) * (deskH - 8);
      const density = 0.16 + rand(seed + 2) * 0.34;
      const dr = 130 + Math.floor(rand(seed + 3) * 30);
      const dg = 138 + Math.floor(rand(seed + 4) * 24);
      const db = 120 + Math.floor(rand(seed + 5) * 18);
      c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${density})`;
      c.beginPath();
      c.arc(x, y, 0.5 + rand(seed + 6) * 1.8, 0, Math.PI * 2);
      c.fill();
    }

    const phoneW = 200;
    const phoneH = 320;
    const phoneCx = W / 2;
    const phoneTop = deskY - phoneH + 30;
    const phoneBot = deskY + 28;
    const phoneL = phoneCx - phoneW / 2;
    const phoneR = phoneCx + phoneW / 2;
    const rCorner = 22;

    c.beginPath();
    c.moveTo(phoneL + rCorner, phoneTop);
    const topPts = 6;
    for (let i = 0; i <= topPts; i++) {
      const t = i / topPts;
      const x = phoneL + rCorner + t * (phoneW - 2 * rCorner) + (rand(i * 5.9 + 200) - 0.5) * 5;
      const y = phoneTop + (rand(i * 5.9 + 211) - 0.5) * 4;
      c.lineTo(x, y);
    }
    c.lineTo(phoneR - rCorner, phoneTop);
    for (let a = -Math.PI / 2; a <= 0; a += Math.PI / 12) {
      c.lineTo(phoneR - rCorner + Math.cos(a) * rCorner + (rand(a * 30) - 0.5) * 3,
               phoneTop + rCorner + Math.sin(a) * rCorner + (rand(a * 30 + 7) - 0.5) * 3);
    }
    for (let i = 0; i <= topPts; i++) {
      const t = i / topPts;
      const x = phoneR + (rand(i * 5.9 + 300) - 0.5) * 4;
      const y = phoneTop + rCorner + t * (phoneH - 2 * rCorner) + (rand(i * 5.9 + 311) - 0.5) * 5;
      c.lineTo(x, y);
    }
    c.lineTo(phoneR, phoneBot - rCorner);
    for (let a = 0; a <= Math.PI / 2; a += Math.PI / 12) {
      c.lineTo(phoneR - rCorner + Math.cos(a) * rCorner + (rand(a * 30 + 20) - 0.5) * 3,
               phoneBot - rCorner + Math.sin(a) * rCorner + (rand(a * 30 + 27) - 0.5) * 3);
    }
    for (let i = 0; i <= topPts; i++) {
      const t = i / topPts;
      const x = phoneR - rCorner - t * (phoneW - 2 * rCorner) + (rand(i * 5.9 + 400) - 0.5) * 5;
      const y = phoneBot + (rand(i * 5.9 + 411) - 0.5) * 4;
      c.lineTo(x, y);
    }
    c.lineTo(phoneL + rCorner, phoneBot);
    for (let a = Math.PI / 2; a <= Math.PI; a += Math.PI / 12) {
      c.lineTo(phoneL + rCorner + Math.cos(a) * rCorner + (rand(a * 30 + 40) - 0.5) * 3,
               phoneBot - rCorner + Math.sin(a) * rCorner + (rand(a * 30 + 47) - 0.5) * 3);
    }
    for (let i = 0; i <= topPts; i++) {
      const t = i / topPts;
      const x = phoneL + (rand(i * 5.9 + 500) - 0.5) * 4;
      const y = phoneBot - rCorner - t * (phoneH - 2 * rCorner) + (rand(i * 5.9 + 511) - 0.5) * 5;
      c.lineTo(x, y);
    }
    c.lineTo(phoneL, phoneTop + rCorner);
    for (let a = Math.PI; a <= Math.PI * 1.5; a += Math.PI / 12) {
      c.lineTo(phoneL + rCorner + Math.cos(a) * rCorner + (rand(a * 30 + 60) - 0.5) * 3,
               phoneTop + rCorner + Math.sin(a) * rCorner + (rand(a * 30 + 67) - 0.5) * 3);
    }
    c.closePath();
    c.fillStyle = `rgba(${Math.floor(118 * lt)},${Math.floor(126 * lt)},${Math.floor(108 * lt)},0.5)`;
    c.fill();

    for (let i = 0; i < 600; i++) {
      const seed = i * 5.7 + 1000;
      const t01 = rand(seed);
      const t02 = rand(seed + 1);
      const px = phoneL + 20 + t01 * (phoneW - 40) + (rand(seed + 2) - 0.5) * 6;
      const py = phoneTop + 40 + t02 * (phoneH - 80) + (rand(seed + 3) - 0.5) * 6;
      const density = 0.12 + rand(seed + 4) * 0.26;
      const pr = 158 + Math.floor(rand(seed + 5) * 26);
      const pg = 166 + Math.floor(rand(seed + 6) * 20);
      const pb = 150 + Math.floor(rand(seed + 7) * 16);
      c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${density})`;
      c.beginPath();
      c.arc(px, py, 0.4 + rand(seed + 8) * 1.5, 0, Math.PI * 2);
      c.fill();
    }

    for (let i = 0; i < 200; i++) {
      const seed = i * 6.9 + 2000;
      const t01 = rand(seed);
      const t02 = rand(seed + 1);
      const px = phoneL + 24 + t01 * (phoneW - 48) + (rand(seed + 2) - 0.5) * 5;
      const py = phoneTop + 45 + t02 * (phoneH - 90) + (rand(seed + 3) - 0.5) * 5;
      const density = 0.2 + rand(seed + 4) * 0.42;
      const pr = 116 + Math.floor(rand(seed + 5) * 28);
      const pg = 124 + Math.floor(rand(seed + 6) * 22);
      const pb = 106 + Math.floor(rand(seed + 7) * 16);
      c.fillStyle = `rgba(${Math.floor(pr * lt)},${Math.floor(pg * lt)},${Math.floor(pb * lt)},${density})`;
      c.beginPath();
      c.arc(px, py, 0.6 + rand(seed + 8) * 2, 0, Math.PI * 2);
      c.fill();
    }

    const chkCx = phoneCx;
    const chkCy = phoneTop + phoneH * 0.48;
    const chkSize = 60;
    const p1 = { x: chkCx - chkSize * 0.6, y: chkCy - 4 };
    const p2 = { x: chkCx - chkSize * 0.1, y: chkCy + chkSize * 0.4 };
    const p3 = { x: chkCx + chkSize * 0.7, y: chkCy - chkSize * 0.45 };
    const steps = 14;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(108 * lt)},${Math.floor(116 * lt)},${Math.floor(98 * lt)},${0.42 - pass * 0.08})`;
      c.lineWidth = 5.5 - pass * 1;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        let mx, my;
        if (t < 0.5) {
          const tt = t / 0.5;
          mx = p1.x + (p2.x - p1.x) * tt + (rand(s * 4.7 + pass * 90 + 3000) - 0.5) * 3;
          my = p1.y + (p2.y - p1.y) * tt + (rand(s * 4.7 + pass * 90 + 3010) - 0.5) * 3;
        } else {
          const tt = (t - 0.5) / 0.5;
          mx = p2.x + (p3.x - p2.x) * tt + (rand(s * 4.7 + pass * 90 + 3020) - 0.5) * 3;
          my = p2.y + (p3.y - p2.y) * tt + (rand(s * 4.7 + pass * 90 + 3030) - 0.5) * 3;
        }
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }
  }

  function scratchLine(c, x1, y1, x2, y2, lt, thickness, alpha) {
    const steps = 20;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(120 * lt)},${Math.floor(128 * lt)},${Math.floor(110 * lt)},${alpha - pass * 0.08})`;
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
    const phoneW = 200, phoneH = 320;
    const phoneCx = W / 2;
    const phoneTop = H * 0.66 - phoneH + 30;
    const phoneBot = H * 0.66 + 28;
    const phoneL = phoneCx - phoneW / 2;
    const phoneR = phoneCx + phoneW / 2;
    const rC = 22;
    const softW = 10;

    const corners = [
      { cx: phoneL + rC, cy: phoneTop + rC, a0: Math.PI, a1: -Math.PI / 2 },
      { cx: phoneR - rC, cy: phoneTop + rC, a0: -Math.PI / 2, a1: 0 },
      { cx: phoneR - rC, cy: phoneBot - rC, a0: 0, a1: Math.PI / 2 },
      { cx: phoneL + rC, cy: phoneBot - rC, a0: Math.PI / 2, a1: Math.PI }
    ];
    corners.forEach((cc, ci) => {
      for (let i = 0; i < 35; i++) {
        const seed = ci * 1000 + i * 8.5 + 4000;
        const ang = cc.a0 + rand(seed) * (cc.a1 - cc.a0);
        const dist = rC - 2 + rand(seed + 1) * (softW + 6);
        const x = cc.cx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 4;
        const y = cc.cy + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 4;
        const norm = Math.abs(dist - rC) / (softW + 6);
        const fade = Math.max(0, 1 - norm);
        const mr = 154 + Math.floor(rand(seed + 4) * 22);
        const mg = 162 + Math.floor(rand(seed + 5) * 16);
        const mb = 144 + Math.floor(rand(seed + 6) * 12);
        const alpha = (0.12 + rand(seed + 7) * 0.2) * fade;
        c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
        c.beginPath();
        c.arc(x, y, 0.5 + rand(seed + 8) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    });

    const deskY = H * 0.66;
    const deskH = H * 0.18;
    const legX1 = W * 0.22, legX2 = W * 0.78;
    const legTop = deskY + deskH - 4;
    const legBot = H * 0.97;
    scratchLine(c, legX1, legTop, legX1 - 8, legBot, lt, 5, 0.36);
    scratchLine(c, legX2, legTop, legX2 + 8, legBot, lt, 5, 0.36);

    for (let lg = 0; lg < 2; lg++) {
      const lx = lg === 0 ? legX1 : legX2;
      const sign = lg === 0 ? -1 : 1;
      for (let i = 0; i < 60; i++) {
        const seed = lg * 500 + i * 7.1 + 5000;
        const t01 = rand(seed);
        const x = lx + sign * rand(seed + 1) * 10 + (rand(seed + 2) - 0.5) * 6;
        const y = legTop + t01 * (legBot - legTop) + (rand(seed + 3) - 0.5) * 4;
        const fade = Math.sin(t01 * Math.PI);
        const lr = 146 + Math.floor(rand(seed + 4) * 24);
        const lg2 = 154 + Math.floor(rand(seed + 5) * 18);
        const lb = 136 + Math.floor(rand(seed + 6) * 14);
        const alpha = (0.1 + rand(seed + 7) * 0.22) * fade;
        c.fillStyle = `rgba(${Math.floor(lr * lt)},${Math.floor(lg2 * lt)},${Math.floor(lb * lt)},${alpha})`;
        c.beginPath();
        c.arc(x, y, 0.5 + rand(seed + 8) * 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawBrightScratches(c, W, H, lt) {
    const phoneW = 200, phoneH = 320;
    const phoneCx = W / 2;
    const phoneTop = H * 0.66 - phoneH + 30;
    const phoneBot = H * 0.66 + 28;
    const phoneL = phoneCx - phoneW / 2;
    const phoneR = phoneCx + phoneW / 2;

    const borderInset = 18;
    const bL = phoneL + borderInset;
    const bR = phoneR - borderInset;
    const bT = phoneTop + 38;
    const bB = phoneBot - 60;
    const edges = [
      [bL, bT, bR, bT], [bR, bT, bR, bB], [bR, bB, bL, bB], [bL, bB, bL, bT]
    ];
    edges.forEach((e, ei) => {
      for (let pass = 0; pass < 2; pass++) {
        c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.22 - pass * 0.04})`;
        c.lineWidth = 2.4 - pass * 0.5;
        c.lineCap = 'round';
        c.beginPath();
        const steps = 16;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const mx = e[0] + (e[2] - e[0]) * t + (rand(s * 4.1 + pass * 70 + ei * 200) - 0.5) * 2.5;
          const my = e[1] + (e[3] - e[1]) * t + (rand(s * 4.1 + pass * 70 + ei * 200 + 7) - 0.5) * 2.5;
          if (s === 0) c.moveTo(mx, my);
          else c.lineTo(mx, my);
        }
        c.stroke();
      }
    });

    const chkCx = phoneCx;
    const chkCy = phoneTop + phoneH * 0.48;
    const chkSize = 60;
    const p1 = { x: chkCx - chkSize * 0.6, y: chkCy - 4 };
    const p2 = { x: chkCx - chkSize * 0.1, y: chkCy + chkSize * 0.4 };
    const p3 = { x: chkCx + chkSize * 0.7, y: chkCy - chkSize * 0.45 };
    const steps = 14;
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.32 - pass * 0.06})`;
      c.lineWidth = 4.2 - pass * 0.8;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        let mx, my;
        if (t < 0.5) {
          const tt = t / 0.5;
          mx = p1.x + (p2.x - p1.x) * tt + Math.sin(tt * Math.PI * 2 + pass) * 2.5 + (rand(s * 5.5 + pass * 90 + 6000) - 0.5) * 2;
          my = p1.y + (p2.y - p1.y) * tt + (rand(s * 5.5 + pass * 90 + 6010) - 0.5) * 2;
        } else {
          const tt = (t - 0.5) / 0.5;
          mx = p2.x + (p3.x - p2.x) * tt + Math.sin(tt * Math.PI * 2 + 1 + pass) * 2.5 + (rand(s * 5.5 + pass * 90 + 6020) - 0.5) * 2;
          my = p2.y + (p3.y - p2.y) * tt + (rand(s * 5.5 + pass * 90 + 6030) - 0.5) * 2;
        }
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }
  }

  function scratchGrowing(c, W, H, lt, t) {
    const phoneW = 200, phoneH = 320;
    const phoneCx = W / 2;
    const phoneTop = H * 0.66 - phoneH + 30;
    const chkCx = phoneCx;
    const chkCy = phoneTop + phoneH * 0.48;
    const chkSize = 60;
    const p1 = { x: chkCx - chkSize * 0.6, y: chkCy - 4 };
    const p2 = { x: chkCx - chkSize * 0.1, y: chkCy + chkSize * 0.4 };
    const p3 = { x: chkCx + chkSize * 0.7, y: chkCy - chkSize * 0.45 };
    const growPhase = Math.min(1, Math.max(0, (t % 10) / 8));

    const totalLen = 1;
    let end1 = 0.5, end2 = 1;
    if (growPhase < 0.5) {
      end1 = growPhase / 0.5;
      end2 = 0;
    } else {
      end1 = 1;
      end2 = (growPhase - 0.5) / 0.5;
    }

    const steps = 18;
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = `rgba(${Math.floor(210 * lt)},${Math.floor(225 * lt)},${Math.floor(230 * lt)},${0.32 - pass * 0.06})`;
      c.lineWidth = 4.2 - pass * 0.8;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      for (let s = 0; s <= Math.floor(steps * 0.5 * end1); s++) {
        const tt = s / (steps * 0.5);
        const mx = p1.x + (p2.x - p1.x) * tt + Math.sin(tt * Math.PI * 2 + pass) * 2.5 + (rand(s * 5.5 + pass * 80 + 7000) - 0.5) * 2;
        const my = p1.y + (p2.y - p1.y) * tt + (rand(s * 5.5 + pass * 80 + 7010) - 0.5) * 2;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      if (end2 > 0) {
        const startS = Math.floor(steps * 0.5);
        for (let s = startS; s <= startS + Math.floor(steps * 0.5 * end2); s++) {
          const tt = (s - startS) / (steps * 0.5);
          const mx = p2.x + (p3.x - p2.x) * tt + Math.sin(tt * Math.PI * 2 + 1 + pass) * 2.5 + (rand(s * 5.5 + pass * 80 + 7020) - 0.5) * 2;
          const my = p2.y + (p3.y - p2.y) * tt + (rand(s * 5.5 + pass * 80 + 7030) - 0.5) * 2;
          c.lineTo(mx, my);
        }
      }
      c.stroke();
    }
  }

  function dabShape(c, cx, cy, radius, count, lt, baseSeed) {
    for (let i = 0; i < count; i++) {
      const seed = baseSeed + i * 5.9;
      const ang = rand(seed) * Math.PI * 2;
      const dist = Math.pow(rand(seed + 1), 0.6) * radius;
      const x = cx + Math.cos(ang) * dist + (rand(seed + 2) - 0.5) * 5;
      const y = cy + Math.sin(ang) * dist + (rand(seed + 3) - 0.5) * 5;
      const fade = 1 - dist / radius * 0.5;
      const dr = 148 + Math.floor(rand(seed + 4) * 28);
      const dg = 156 + Math.floor(rand(seed + 5) * 22);
      const db = 140 + Math.floor(rand(seed + 6) * 16);
      const alpha = (0.18 + rand(seed + 7) * 0.38) * fade;
      c.fillStyle = `rgba(${Math.floor(dr * lt)},${Math.floor(dg * lt)},${Math.floor(db * lt)},${alpha})`;
      c.beginPath();
      c.arc(x, y, 0.5 + rand(seed + 8) * 1.8, 0, Math.PI * 2);
      c.fill();
    }
  }

  function flowAlong(c, startX, startY, endX, endY, count, lt, t, baseSeed) {
    const phase = Math.min(1, (t % 10) / 6);
    for (let i = 0; i < count; i++) {
      const seed = baseSeed + i * 4.7;
      const tBase = 0.02 + rand(seed) * 0.96;
      const localT = Math.max(0, Math.min(1, phase * 1.15 - tBase * (1 - phase * 0.45)));
      if (localT <= 0 || localT >= 1) continue;
      const midX = startX + (endX - startX) * localT + Math.sin(localT * Math.PI * 5 + i) * 8;
      const midY = startY + (endY - startY) * localT + Math.sin(localT * Math.PI * 4 + i * 0.7) * 5;
      const dx = endX - startX, dy = endY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const off = (rand(seed + 1) - 0.5) * 14;
      const px = midX + nx * off + (rand(seed + 2) - 0.5) * 4;
      const py = midY + ny * off + (rand(seed + 3) - 0.5) * 4;
      const fade = Math.sin(localT * Math.PI);
      const alpha = (0.09 + rand(seed + 4) * 0.22) * fade;
      const size = 0.4 + rand(seed + 5) * 1.8;
      if (alpha > 0) {
        const fr = 154 + Math.floor(rand(seed + 6) * 30);
        const fg = 162 + Math.floor(rand(seed + 7) * 24);
        const fb = 144 + Math.floor(rand(seed + 8) * 18);
        c.fillStyle = `rgba(${Math.floor(fr * lt)},${Math.floor(fg * lt)},${Math.floor(fb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, size, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawMotifs(c, W, H, lt, t) {
    const yuanCx = W * 0.1;
    const yuanCy = H * 0.12;
    dabShape(c, yuanCx, yuanCy, 28, 120, lt, 8000);

    const yuanSize = 26;
    c.save();
    c.translate(yuanCx, yuanCy);
    c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(118 * lt)},${Math.floor(126 * lt)},${Math.floor(108 * lt)},${0.5 - pass * 0.1})`;
      c.lineWidth = 5 - pass * 0.8;
      c.beginPath();
      const steps = 20;
      for (let s = 0; s <= steps; s++) {
        const ang = (s / steps) * Math.PI * 2;
        const jr = yuanSize + (rand(s * 3.7 + pass * 50) - 0.5) * 3;
        const x = Math.cos(ang) * jr;
        const y = Math.sin(ang) * jr;
        if (s === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(122 * lt)},${Math.floor(130 * lt)},${Math.floor(112 * lt)},${0.48 - pass * 0.1})`;
      c.lineWidth = 4.5 - pass * 0.8;
      c.beginPath();
      const half = yuanSize * 0.45;
      c.moveTo(-half, -yuanSize * 0.65 + (rand(1) - 0.5) * 2);
      c.lineTo(half, -yuanSize * 0.65 + (rand(2) - 0.5) * 2);
      c.moveTo(-half * 0.55, -yuanSize * 0.5);
      c.lineTo(-half * 0.55, yuanSize * 0.55);
      c.stroke();
    }
    c.restore();

    const deskY = H * 0.84;
    const centerX = W / 2;
    flowAlong(c, W * 0.08, deskY, centerX - 30, deskY + 10, 70, lt, t, 9000);
    flowAlong(c, W * 0.92, deskY + 5, centerX + 30, deskY + 15, 70, lt, t, 9500);
  }

  window.SCENES = window.SCENES || {};
  window.SCENES['s04_first_order'] = {
    meta: {
      name: 'S2 起步·首单成交',
      style: 'realistic_cool',
      palette_name: '写实冷光台-5色',
      duration: 10.0
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawDeskPhoneThick(c, W, H, lt);
      drawMidSand(c, W, H, lt);
      drawBrightScratches(c, W, H, lt);
      scratchGrowing(c, W, H, lt, t);
      drawMotifs(c, W, H, lt, t);
    }
  };
})();
