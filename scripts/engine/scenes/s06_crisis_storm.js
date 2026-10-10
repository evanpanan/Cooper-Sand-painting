(() => {
  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function drawLightTable(c, W, H, lt, t) {
    const breath = 0.98 + Math.sin(t * 1.1) * 0.02;
    const extra = 0.02;
    const r = Math.floor((0 + 20 * (lt + extra)) * breath);
    const g = Math.floor((32 + 58 * (lt + extra)) * breath);
    const b = Math.floor((64 + 81 * (lt + extra)) * breath);
    c.fillStyle = `rgb(${r},${g},${b})`;
    c.fillRect(0, 0, W, H);

    const vig = c.createRadialGradient(W / 2, H * 0.35, Math.min(W, H) * 0.06 * breath, W / 2, H * 0.7, Math.max(W, H) * 0.82 * breath);
    vig.addColorStop(0, `rgba(${Math.min(255, r + 24)},${Math.min(255, g + 36)},${Math.min(255, b + 48)},0)`);
    vig.addColorStop(1, `rgba(${Math.max(0, r - 14)},${Math.max(0, g - 38)},${Math.max(0, b - 68)},0.62)`);
    c.fillStyle = vig;
    c.fillRect(0, 0, W, H);

    const shimmerCount = 35;
    for (let i = 0; i < shimmerCount; i++) {
      const seed = i * 29.3 + t * 10;
      const x = rand(seed) * W;
      const y = rand(seed + 1) * H * 0.7;
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

  function drawCloudsAndPerson(c, W, H, lt, t) {
    const growPhase = Math.min(1, Math.max(0, (t % 10) / 10));
    const darkMul = 0.88 - growPhase * 0.18;

    const cloudBlocks = [
      { cx: W * 0.18, cy: H * 0.25, rx: 160, ry: 65, seed: 1000 },
      { cx: W * 0.38, cy: H * 0.18, rx: 200, ry: 80, seed: 2000 },
      { cx: W * 0.62, cy: H * 0.22, rx: 180, ry: 72, seed: 3000 },
      { cx: W * 0.82, cy: H * 0.28, rx: 150, ry: 62, seed: 4000 },
      { cx: W * 0.50, cy: H * 0.36, rx: 220, ry: 70, seed: 5000 },
      { cx: W * 0.25, cy: H * 0.40, rx: 140, ry: 56, seed: 6000 }
    ];

    cloudBlocks.forEach((cb, ci) => {
      const pts = 10;
      c.beginPath();
      for (let i = 0; i <= pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const jrX = cb.rx + (rand(cb.seed + i * 7.3) - 0.5) * 32;
        const jrY = cb.ry + (rand(cb.seed + i * 7.3 + 11) - 0.5) * 22;
        const px = cb.cx + Math.cos(ang) * jrX + (rand(cb.seed + i * 5.1 + 33) - 0.5) * 6;
        const py = cb.cy + Math.sin(ang) * jrY + (rand(cb.seed + i * 5.1 + 44) - 0.5) * 5;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      const baseR = 94, baseG = 102, baseB = 92;
      const cr = Math.floor(baseR * darkMul * lt);
      const cg = Math.floor(baseG * darkMul * lt);
      const cb2 = Math.floor(baseB * darkMul * lt);
      c.fillStyle = `rgba(${cr},${cg},${cb2},0.42)`;
      c.fill();

      const fillCount = 1200;
      for (let i = 0; i < fillCount; i++) {
        const seed = cb.seed * 10 + i * 6.1;
        const ang = rand(seed) * Math.PI * 2;
        const a = rand(seed + 1);
        const dist = Math.pow(a, 0.55);
        const px = cb.cx + Math.cos(ang) * cb.rx * dist * 0.92 + (rand(seed + 2) - 0.5) * 10;
        const py = cb.cy + Math.sin(ang) * cb.ry * dist * 0.92 + (rand(seed + 3) - 0.5) * 8;
        const fade = 1 - dist * 0.5;
        const depthDark = 0.78 - dist * 0.18 - growPhase * 0.15;
        const dr = Math.floor((104 + Math.floor(rand(seed + 4) * 24)) * depthDark * lt);
        const dg = Math.floor((112 + Math.floor(rand(seed + 5) * 20)) * depthDark * lt);
        const db = Math.floor((100 + Math.floor(rand(seed + 6) * 16)) * depthDark * lt);
        const alpha = (0.14 + rand(seed + 7) * 0.34) * fade;
        c.fillStyle = `rgba(${dr},${dg},${db},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.6 + rand(seed + 8) * 2.2, 0, Math.PI * 2);
        c.fill();
      }
    });

    const pcx = W * 0.5;
    const pcy = H * 0.80;
    const ph = H * 0.18;
    const pw = ph * 0.55;
    const headR = ph * 0.22;
    const curlAmt = 1 + growPhase * 0.12;

    const bodyPts = 12;
    c.beginPath();
    const outline = [];
    for (let side = 0; side < 2; side++) {
      const ss = side === 0 ? 1 : -1;
      for (let i = 0; i <= bodyPts; i++) {
        const tt = i / bodyPts;
        let px, py;
        if (tt < 0.22) {
          const ang = -Math.PI / 2 + tt / 0.22 * Math.PI * ss;
          px = pcx + Math.cos(ang) * headR + (rand(70000 + side * 100 + i * 3) - 0.5) * 5;
          py = pcy - ph * 0.7 + Math.sin(ang) * headR + (rand(70000 + side * 100 + i * 3 + 11) - 0.5) * 4;
        } else if (tt < 0.65) {
          const local = (tt - 0.22) / 0.43;
          const yy = pcy - ph * 0.7 + headR + local * ph * 0.55 * curlAmt;
          const taper = 1 - local * 0.25;
          const bw = pw * 0.5 * taper * curlAmt;
          const hunch = Math.sin(local * Math.PI) * pw * 0.08;
          px = pcx + ss * bw + hunch * ss + (rand(70000 + side * 100 + i * 3 + 50) - 0.5) * 5;
          py = yy + (rand(70000 + side * 100 + i * 3 + 61) - 0.5) * 4;
        } else {
          const local = (tt - 0.65) / 0.35;
          const yy = pcy - ph * 0.15 + local * ph * 0.15;
          const legW = pw * 0.22 * (1 - local * 0.35);
          const legIn = ss * pw * 0.2;
          px = pcx + legIn + ss * legW + (rand(70000 + side * 100 + i * 3 + 100) - 0.5) * 4;
          py = yy + (rand(70000 + side * 100 + i * 3 + 111) - 0.5) * 3;
        }
        outline.push({ x: px, y: py });
        if (side === 0 && i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
    }
    c.closePath();
    c.fillStyle = `rgba(${Math.floor(96 * darkMul * lt)},${Math.floor(104 * darkMul * lt)},${Math.floor(88 * darkMul * lt)},0.5)`;
    c.fill();

    for (let i = 0; i < 300; i++) {
      const seed = 75000 + i * 5.9;
      const tBox = rand(seed);
      const ySel = pcy - ph * (0.68 + tBox * 0.32) + (rand(seed + 1) - 0.5) * 5;
      let maxX;
      const rel = tBox;
      if (rel < 0.18) maxX = headR * 0.9;
      else if (rel < 0.58) maxX = pw * 0.48 * (1 - (rel - 0.18) / 0.4 * 0.22) * curlAmt;
      else maxX = pw * 0.24 * (1 - (rel - 0.58) / 0.42 * 0.35);
      const xOff = (rand(seed + 2) - 0.5) * 2 * maxX * 0.9;
      const px = pcx + xOff;
      const py = ySel;
      if (Math.abs(xOff) <= maxX * 0.95) {
        const pDepth = 0.8 - growPhase * 0.2;
        const dr = Math.floor((92 + Math.floor(rand(seed + 3) * 26)) * pDepth * lt);
        const dg = Math.floor((100 + Math.floor(rand(seed + 4) * 22)) * pDepth * lt);
        const db = Math.floor((86 + Math.floor(rand(seed + 5) * 16)) * pDepth * lt);
        const alpha = 0.18 + rand(seed + 6) * 0.42;
        c.fillStyle = `rgba(${dr},${dg},${db},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.55 + rand(seed + 7) * 1.9, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawMidSand(c, W, H, lt, t) {
    const growPhase = Math.min(1, Math.max(0, (t % 10) / 10));
    const cloudBlocks = [
      { cx: W * 0.18, cy: H * 0.25, rx: 160, ry: 65, seed: 1000 },
      { cx: W * 0.38, cy: H * 0.18, rx: 200, ry: 80, seed: 2000 },
      { cx: W * 0.62, cy: H * 0.22, rx: 180, ry: 72, seed: 3000 },
      { cx: W * 0.82, cy: H * 0.28, rx: 150, ry: 62, seed: 4000 },
      { cx: W * 0.50, cy: H * 0.36, rx: 220, ry: 70, seed: 5000 },
      { cx: W * 0.25, cy: H * 0.40, rx: 140, ry: 56, seed: 6000 }
    ];
    const softW = 10;
    cloudBlocks.forEach(cb => {
      for (let i = 0; i < 70; i++) {
        const seed = cb.seed * 5 + i * 7.7 + 100000;
        const ang = rand(seed) * Math.PI * 2;
        const dist = 0.82 + rand(seed + 1) * 0.30;
        const jrX = cb.rx * dist + rand(seed + 2) * (softW + 6);
        const jrY = cb.ry * dist + rand(seed + 3) * (softW + 6);
        const px = cb.cx + Math.cos(ang) * jrX + (rand(seed + 4) - 0.5) * 5;
        const py = cb.cy + Math.sin(ang) * jrY + (rand(seed + 5) - 0.5) * 4;
        const fade = 0.5 + 0.5 * Math.sin(ang * 3);
        const mr = 134 + Math.floor(rand(seed + 6) * 22);
        const mg = 142 + Math.floor(rand(seed + 7) * 16);
        const mb = 126 + Math.floor(rand(seed + 8) * 12);
        const alpha = (0.1 + rand(seed + 9) * 0.18) * fade;
        c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
        c.beginPath();
        c.arc(px, py, 0.5 + rand(seed + 10) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    });

    const pcx = W * 0.5;
    const pcy = H * 0.80;
    const ph = H * 0.18;
    for (let i = 0; i < 40; i++) {
      const seed = 110000 + i * 7.1;
      const ang = rand(seed) * Math.PI * 2;
      const jr = ph * 0.4 + rand(seed + 1) * (6 + 4);
      const px = pcx + Math.cos(ang) * jr + (rand(seed + 2) - 0.5) * 4;
      const py = pcy - ph * 0.55 + Math.sin(ang) * jr * 0.7 + (rand(seed + 3) - 0.5) * 3;
      const fade = 0.4 + 0.6 * Math.max(0, 1 - Math.abs(jr - ph * 0.4) / 10);
      const mr = 128 + Math.floor(rand(seed + 4) * 24);
      const mg = 136 + Math.floor(rand(seed + 5) * 18);
      const mb = 120 + Math.floor(rand(seed + 6) * 14);
      const alpha = (0.12 + rand(seed + 7) * 0.2) * fade;
      c.fillStyle = `rgba(${Math.floor(mr * lt)},${Math.floor(mg * lt)},${Math.floor(mb * lt)},${alpha})`;
      c.beginPath();
      c.arc(px, py, 0.5 + rand(seed + 8) * 1.4, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawBrightScratches(c, W, H, lt, t) {
    const growPhase = Math.min(1, Math.max(0, (t % 10) / 10));
    const numRain = Math.floor(3 + growPhase * 12);

    const rainAng = -Math.PI * 0.35;
    const rainDx = Math.cos(rainAng);
    const rainDy = Math.sin(rainAng);

    for (let ri = 0; ri < numRain; ri++) {
      const seed = 200000 + ri * 41.3;
      const sx = W * (0.05 + (ri / Math.max(1, numRain - 1)) * 0.9) + (rand(seed) - 0.5) * W * 0.05;
      const sy = H * 0.06 + rand(seed + 1) * H * 0.45;
      const rainLen = 140 + rand(seed + 2) * 120;
      const ex = sx + rainDx * rainLen;
      const ey = sy + rainDy * rainLen;
      for (let pass = 0; pass < 2; pass++) {
        c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${0.24 - pass * 0.05})`;
        c.lineWidth = 2.6 - pass * 0.5;
        c.lineCap = 'round';
        c.beginPath();
        const steps = 14;
        for (let s = 0; s <= steps; s++) {
          const tt = s / steps;
          const mx = sx + (ex - sx) * tt + Math.sin(tt * Math.PI * 3 + ri) * 3.5 + (rand(s * 4.3 + pass * 60 + ri * 100) - 0.5) * 2;
          const my = sy + (ey - sy) * tt + (rand(s * 4.3 + pass * 60 + ri * 100 + 7) - 0.5) * 2;
          if (s === 0) c.moveTo(mx, my);
          else c.lineTo(mx, my);
        }
        c.stroke();
      }
    }

    const bottomY = H * 0.55;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = `rgba(${Math.floor(0 * lt)},${Math.floor(128 * lt)},${Math.floor(165 * lt)},${0.20 - pass * 0.04})`;
      c.lineWidth = 2.2 - pass * 0.4;
      c.lineCap = 'round';
      c.beginPath();
      const steps = 28;
      for (let s = 0; s <= steps; s++) {
        const tt = s / steps;
        const mx = W * 0.04 + (W * 0.92) * tt + Math.sin(tt * Math.PI * 6) * 5 + (rand(s * 3.9 + pass * 70) - 0.5) * 3;
        const my = bottomY + Math.sin(tt * Math.PI * 4 + pass) * 7 + (rand(s * 3.9 + pass * 70 + 11) - 0.5) * 3;
        if (s === 0) c.moveTo(mx, my);
        else c.lineTo(mx, my);
      }
      c.stroke();
    }
  }

  window.SCENES = window.SCENES || {};
  window.SCENES['s06_crisis_storm'] = {
    meta: {
      name: 'S4 危机·暴风雨',
      style: 'realistic_cool',
      palette_name: '写实冷光台-5色',
      duration: 10.0
    },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawCloudsAndPerson(c, W, H, lt, t);
      drawMidSand(c, W, H, lt, t);
      drawBrightScratches(c, W, H, lt, t);
    }
  };
})();
