(() => {
  if (!window.SCENES) window.SCENES = {};

  window.SCENES['s02_mountain'] = {
    meta: { name: '远山', style: 'classic_warm' },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      this._base(c, W, H, lt);
      this._mountains(c, W, H, lt, t);
      this._moon(c, W, H, lt, t);
      this._scratches(c, W, H, lt);
    },
    _base(c, W, H, lt) {
      c.fillStyle = `rgba(${Math.floor(172 * lt)},${Math.floor(135 * lt)},${Math.floor(78 * lt)}, 0.55)`;
      for (let i = 0; i < 1600; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const s = 0.6 + Math.random() * 1.8;
        c.fillRect(x, y, s, s);
      }
    },
    _mountains(c, W, H, lt, t) {
      const layers = [
        { baseY: H * 0.52, amp: 70, freq: 0.004, alpha: 0.45, dark: 0.65 },
        { baseY: H * 0.62, amp: 50, freq: 0.006, alpha: 0.55, dark: 0.5 },
        { baseY: H * 0.72, amp: 35, freq: 0.009, alpha: 0.7, dark: 0.35 }
      ];
      layers.forEach((L, li) => {
        c.beginPath();
        c.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) {
          const seed = x * L.freq + li * 100;
          const noise = Math.sin(seed) * L.amp + Math.sin(seed * 2.3 + 17) * L.amp * 0.4 + Math.sin(seed * 0.7 + 43) * L.amp * 0.6;
          const jitter = (Math.sin(x * 0.11 + li) * 3);
          c.lineTo(x, L.baseY + noise + jitter);
        }
        c.lineTo(W, H);
        c.closePath();
        const r = Math.floor(130 * lt * L.dark);
        const g = Math.floor(95 * lt * L.dark);
        const b = Math.floor(50 * lt * L.dark);
        c.fillStyle = `rgba(${r},${g},${b},${L.alpha})`;
        c.fill();

        const jagginess = 22;
        for (let i = 0; i < jagginess; i++) {
          const x = (i / jagginess) * W + (Math.random() - 0.5) * 8;
          const seed = x * L.freq + li * 100;
          const noise = Math.sin(seed) * L.amp + Math.sin(seed * 2.3 + 17) * L.amp * 0.4;
          const y = L.baseY + noise + (Math.random() - 0.5) * 10;
          const sr = Math.floor(190 * lt);
          const sg = Math.floor(150 * lt);
          const sb = Math.floor(90 * lt);
          c.fillStyle = `rgba(${sr},${sg},${sb},${L.alpha * 0.25})`;
          c.beginPath();
          c.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
          c.fill();
        }
      });
    },
    _moon(c, W, H, lt, t) {
      const cx = W * 0.78;
      const cy = H * 0.26;
      const r = 52;
      const breath = 0.97 + Math.sin(t * 1.3) * 0.03;
      for (let i = 0; i < 90; i++) {
        const ang = (i / 90) * Math.PI * 2;
        const jr = r * breath + (Math.random() - 0.5) * 7;
        const jx = cx + Math.cos(ang) * jr;
        const jy = cy + Math.sin(ang) * jr;
        c.fillStyle = `rgba(${Math.floor(235 * lt)},${Math.floor(215 * lt)},${Math.floor(170 * lt)},${0.1 + Math.random() * 0.18})`;
        c.beginPath();
        c.arc(jx, jy, 0.8 + Math.random() * 2.2, 0, Math.PI * 2);
        c.fill();
      }
      for (let i = 0; i < 300; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * r * 0.82 * breath;
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang) * dist;
        c.fillStyle = `rgba(${Math.floor(240 * lt)},${Math.floor(225 * lt)},${Math.floor(185 * lt)},${0.15 + Math.random() * 0.35})`;
        c.beginPath();
        c.arc(x, y, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    },
    _scratches(c, W, H, lt) {
      const lines = [
        [W * 0.1, H * 0.55, W * 0.25, H * 0.58],
        [W * 0.7, H * 0.4, W * 0.88, H * 0.43],
        [W * 0.35, H * 0.82, W * 0.55, H * 0.85]
      ];
      lines.forEach(L => {
        const [x1, y1, x2, y2] = L;
        c.strokeStyle = `rgba(${Math.floor(245 * lt)},${Math.floor(225 * lt)},${Math.floor(185 * lt)},0.45)`;
        c.lineWidth = 2.5;
        c.lineCap = 'round';
        c.beginPath();
        const steps = 14;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 2.5;
          const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 2.5;
          if (s === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      });
    }
  };

  window.SCENES['s03_river'] = {
    meta: { name: '流水', style: 'classic_warm' },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      this._base(c, W, H, lt);
      this._banks(c, W, H, lt);
      this._water(c, W, H, lt, t);
      this._boat(c, W, H, lt, t);
    },
    _base(c, W, H, lt) {
      c.fillStyle = `rgba(${Math.floor(170 * lt)},${Math.floor(132 * lt)},${Math.floor(76 * lt)}, 0.5)`;
      for (let i = 0; i < 1500; i++) {
        c.fillRect(Math.random() * W, Math.random() * H, 0.5 + Math.random() * 1.6, 0.5 + Math.random() * 1.6);
      }
    },
    _banks(c, W, H, lt) {
      c.beginPath();
      c.moveTo(0, H);
      const topY = H * 0.35;
      for (let x = 0; x <= W; x += 5) {
        const ny = topY + Math.sin(x * 0.01 + 8) * 18 + Math.sin(x * 0.004) * 28 + (Math.random() - 0.5) * 4;
        c.lineTo(x, ny);
      }
      c.lineTo(W, H);
      c.closePath();
      c.fillStyle = `rgba(${Math.floor(140 * lt)},${Math.floor(102 * lt)},${Math.floor(55 * lt)},0.55)`;
      c.fill();

      c.beginPath();
      c.moveTo(0, 0);
      const botY = H * 0.68;
      for (let x = 0; x <= W; x += 5) {
        const ny = botY + Math.sin(x * 0.012 + 3) * 16 + Math.sin(x * 0.005 + 40) * 22 + (Math.random() - 0.5) * 4;
        c.lineTo(x, ny);
      }
      c.lineTo(W, 0);
      c.closePath();
      c.fillStyle = `rgba(${Math.floor(132 * lt)},${Math.floor(96 * lt)},${Math.floor(50 * lt)},0.55)`;
      c.fill();
    },
    _water(c, W, H, lt, t) {
      const midY1 = H * 0.38;
      const midY2 = H * 0.66;
      for (let i = 0; i < 70; i++) {
        const y = midY1 + (midY2 - midY1) * (i / 70);
        const shimmer = 0.02 + 0.04 * (0.5 - Math.abs(i / 70 - 0.5));
        const waveOffset = Math.sin(t * 2.2 + i * 0.35) * 14;
        c.strokeStyle = `rgba(${Math.floor(230 * lt)},${Math.floor(205 * lt)},${Math.floor(155 * lt)},${shimmer})`;
        c.lineWidth = 1;
        c.beginPath();
        for (let x = 0; x <= W; x += 10) {
          const jitter = Math.sin(x * 0.035 + t * 3.5 + i) * 2.5;
          const px = x;
          const py = y + jitter + waveOffset * 0.2;
          if (x === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();
      }

      for (let i = 0; i < 180; i++) {
        const x = Math.random() * W;
        const y = midY1 + 10 + Math.random() * (midY2 - midY1 - 20);
        const shimmer = 0.18 + Math.random() * 0.25;
        const alpha = shimmer * (0.3 + 0.5 * Math.sin(t * 4 + i));
        if (alpha > 0) {
          c.fillStyle = `rgba(${Math.floor(250 * lt)},${Math.floor(235 * lt)},${Math.floor(195 * lt)},${Math.max(0, alpha)})`;
          c.beginPath();
          c.arc(x, y, 0.4 + Math.random() * 1.4, 0, Math.PI * 2);
          c.fill();
        }
      }
    },
    _boat(c, W, H, lt, t) {
      const bx = W * 0.3 + Math.sin(t * 0.7) * 12;
      const by = H * 0.52 + Math.sin(t * 1.5) * 3;
      c.fillStyle = `rgba(${Math.floor(90 * lt)},${Math.floor(62 * lt)},${Math.floor(32 * lt)},0.55)`;
      c.beginPath();
      c.moveTo(bx - 42, by);
      c.quadraticCurveTo(bx - 36, by + 18, bx - 28, by + 14);
      c.lineTo(bx + 28, by + 14);
      c.quadraticCurveTo(bx + 36, by + 18, bx + 42, by);
      c.closePath();
      c.fill();
      for (let i = 0; i < 25; i++) {
        c.fillStyle = `rgba(${Math.floor(185 * lt)},${Math.floor(145 * lt)},${Math.floor(88 * lt)},0.3)`;
        c.beginPath();
        c.arc(bx - 35 + i * 3, by + 5 + (Math.random() - 0.5) * 6, 0.6 + Math.random() * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    }
  };

  window.SCENES['s04_sunset'] = {
    meta: { name: '落日', style: 'classic_warm' },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      this._base(c, W, H, lt);
      this._sun(c, W, H, lt, t);
      this._horizon(c, W, H, lt);
      this._clouds(c, W, H, lt, t);
      this._reflection(c, W, H, lt, t);
    },
    _base(c, W, H, lt) {
      const grad = c.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgba(${Math.floor(85 * lt)},${Math.floor(42 * lt)},${Math.floor(28 * lt)},0.45)`);
      grad.addColorStop(0.5, `rgba(${Math.floor(155 * lt)},${Math.floor(95 * lt)},${Math.floor(52 * lt)},0.4)`);
      grad.addColorStop(1, `rgba(${Math.floor(110 * lt)},${Math.floor(65 * lt)},${Math.floor(38 * lt)},0.5)`);
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);
    },
    _sun(c, W, H, lt, t) {
      const cx = W * 0.5;
      const cy = H * 0.44 + Math.sin(t * 0.25) * 4;
      const r = 85;
      for (let i = 0; i < 180; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * r;
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang) * dist;
        const fade = 1 - dist / r;
        const sr = 250;
        const sg = 170 + fade * 50;
        const sb = 70 + fade * 40;
        c.fillStyle = `rgba(${Math.floor(sr * lt)},${Math.floor(sg * lt)},${Math.floor(sb * lt)},${(0.15 + Math.random() * 0.35) * fade})`;
        c.beginPath();
        c.arc(x, y, 0.7 + Math.random() * 2, 0, Math.PI * 2);
        c.fill();
      }
      for (let i = 0; i < 120; i++) {
        const ang = (i / 120) * Math.PI * 2;
        const jr = r + (Math.random() - 0.5) * 12;
        const x = cx + Math.cos(ang) * jr;
        const y = cy + Math.sin(ang) * jr;
        c.fillStyle = `rgba(${Math.floor(255 * lt)},${Math.floor(200 * lt)},${Math.floor(110 * lt)},${0.08 + Math.random() * 0.18})`;
        c.beginPath();
        c.arc(x, y, 1 + Math.random() * 2.5, 0, Math.PI * 2);
        c.fill();
      }
    },
    _horizon(c, W, H, lt) {
      const hy = H * 0.56;
      c.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const jitter = Math.sin(x * 0.018) * 3 + (Math.random() - 0.5) * 2;
        if (x === 0) c.moveTo(x, hy + jitter);
        else c.lineTo(x, hy + jitter);
      }
      c.lineTo(W, H);
      c.lineTo(0, H);
      c.closePath();
      c.fillStyle = `rgba(${Math.floor(60 * lt)},${Math.floor(35 * lt)},${Math.floor(22 * lt)},0.7)`;
      c.fill();

      for (let i = 0; i < 30; i++) {
        const x = (i / 30) * W + (Math.random() - 0.5) * 18;
        const hy2 = hy + Math.sin(x * 0.02) * 2;
        const h = 15 + Math.random() * 50;
        c.fillStyle = `rgba(${Math.floor(45 * lt)},${Math.floor(26 * lt)},${Math.floor(16 * lt)},0.6)`;
        c.fillRect(x - 1, hy2 - h, 2 + Math.random() * 2, h);
      }
    },
    _clouds(c, W, H, lt, t) {
      const clouds = [
        { cx: W * 0.2, cy: H * 0.22, w: 180, h: 45, alpha: 0.35 },
        { cx: W * 0.72, cy: H * 0.16, w: 150, h: 38, alpha: 0.3 },
        { cx: W * 0.85, cy: H * 0.3, w: 120, h: 32, alpha: 0.28 }
      ];
      clouds.forEach((cl, ci) => {
        const drift = Math.sin(t * 0.25 + ci) * 18;
        for (let i = 0; i < 80; i++) {
          const ang = Math.random() * Math.PI * 2;
          const dx = (Math.random() - 0.5) * cl.w;
          const dy = (Math.random() - 0.5) * cl.h;
          const x = cl.cx + dx + drift;
          const y = cl.cy + dy;
          const distNorm = Math.sqrt((dx / (cl.w / 2)) ** 2 + (dy / (cl.h / 2)) ** 2);
          const fade = Math.max(0, 1 - distNorm);
          const cr = 220;
          const cg = 135;
          const cb = 75;
          c.fillStyle = `rgba(${Math.floor(cr * lt)},${Math.floor(cg * lt)},${Math.floor(cb * lt)},${cl.alpha * fade * (0.4 + Math.random() * 0.6)})`;
          c.beginPath();
          c.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
          c.fill();
        }
      });
    },
    _reflection(c, W, H, lt, t) {
      const hy = H * 0.56;
      for (let i = 0; i < 90; i++) {
        const y = hy + 10 + i * 2.5;
        const fade = 1 - (y - hy) / (H - hy) * 0.8;
        const wobble = Math.sin(t * 2.8 + i * 0.35) * 10;
        c.strokeStyle = `rgba(${Math.floor(245 * lt)},${Math.floor(160 * lt)},${Math.floor(75 * lt)},${0.06 * fade})`;
        c.lineWidth = 2;
        c.beginPath();
        for (let x = W * 0.35; x <= W * 0.65; x += 6) {
          const jitter = Math.sin(x * 0.08 + t * 4 + i) * 3;
          if (x === W * 0.35) c.moveTo(x + wobble, y + jitter);
          else c.lineTo(x + wobble, y + jitter);
        }
        c.stroke();
      }
    }
  };

  window.SCENES['s05_ending'] = {
    meta: { name: '终章', style: 'classic_warm' },
    draw(c, lt, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      this._base(c, W, H, lt);
      this._center(c, W, H, lt, t);
      this._rings(c, W, H, lt, t);
      this._sparkles(c, W, H, lt, t);
    },
    _base(c, W, H, lt) {
      c.fillStyle = `rgba(${Math.floor(168 * lt)},${Math.floor(130 * lt)},${Math.floor(74 * lt)}, 0.48)`;
      for (let i = 0; i < 1400; i++) {
        c.fillRect(Math.random() * W, Math.random() * H, 0.5 + Math.random() * 1.6, 0.5 + Math.random() * 1.6);
      }
    },
    _center(c, W, H, lt, t) {
      const cx = W / 2;
      const cy = H / 2;
      const breath = 1 + Math.sin(t * 0.9) * 0.04;
      for (let layer = 0; layer < 4; layer++) {
        const lr = (45 + layer * 18) * breath;
        const la = 0.5 - layer * 0.1;
        for (let i = 0; i < 100 + layer * 20; i++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * lr;
          const x = cx + Math.cos(ang) * dist;
          const y = cy + Math.sin(ang) * dist;
          const fade = 1 - dist / lr;
          const cr = 245 - layer * 15;
          const cg = 210 - layer * 18;
          const cb = 150 - layer * 15;
          c.fillStyle = `rgba(${Math.floor(cr * lt)},${Math.floor(cg * lt)},${Math.floor(cb * lt)},${la * fade * (0.35 + Math.random() * 0.65)})`;
          c.beginPath();
          c.arc(x, y, 0.5 + Math.random() * 1.8, 0, Math.PI * 2);
          c.fill();
        }
      }
    },
    _rings(c, W, H, lt, t) {
      const cx = W / 2;
      const cy = H / 2;
      const rings = [
        { r: 100, alpha: 0.25, phase: 0 },
        { r: 150, alpha: 0.2, phase: 1.2 },
        { r: 200, alpha: 0.15, phase: 2.5 }
      ];
      rings.forEach((ring, ri) => {
        const rot = t * 0.15 + ring.phase;
        const wobble = Math.sin(t * 0.7 + ri) * 4;
        for (let i = 0; i < 80; i++) {
          const ang = (i / 80) * Math.PI * 2 + rot;
          const jr = ring.r + wobble + (Math.random() - 0.5) * 8;
          const x = cx + Math.cos(ang) * jr;
          const y = cy + Math.sin(ang) * jr;
          c.fillStyle = `rgba(${Math.floor(235 * lt)},${Math.floor(195 * lt)},${Math.floor(135 * lt)},${ring.alpha * (0.4 + Math.random() * 0.6)})`;
          c.beginPath();
          c.arc(x, y, 0.6 + Math.random() * 1.8, 0, Math.PI * 2);
          c.fill();
        }
      });
    },
    _sparkles(c, W, H, lt, t) {
      for (let i = 0; i < 60; i++) {
        const seed = i * 41.3;
        const baseAng = (i / 60) * Math.PI * 2;
        const dist = 80 + Math.sin(t * 0.5 + i) * 60 + (i % 8) * 18;
        const ang = baseAng + t * 0.1 + Math.sin(t + i) * 0.15;
        const cx = W / 2;
        const cy = H / 2;
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang) * dist;
        const flicker = 0.3 + 0.7 * Math.abs(Math.sin(t * 3 + i * 0.7));
        c.fillStyle = `rgba(${Math.floor(255 * lt)},${Math.floor(240 * lt)},${Math.floor(200 * lt)},${0.2 * flicker})`;
        c.beginPath();
        c.arc(x, y, 0.5 + flicker * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    }
  };
})();
