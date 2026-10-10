/*
### 渐进式长转场系统 ProgressiveMorph（样片77%时间都在做这个）：四模式 wipe_palm_half / flow_gather_scatter / scratch_reveal_slow / pour_rewrite，单段 8~25 秒平均 18s
*/
(() => {
  function lightTableFlash(p) {
    const flashStart = 0.0;
    const flashDur = 0.08;
    const flashMid = flashDur * 0.5;
    if (p < flashDur) {
      const fp = p / flashDur;
      if (fp < flashMid / flashDur) {
        return 1.0 - 0.08 * (fp / (flashMid / flashDur));
      } else {
        return 0.92 + 0.08 * ((fp - flashMid / flashDur) / (1 - flashMid / flashDur));
      }
    }
    return 1.0;
  }

  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function t_pour_in(c, oldCanvas, newCanvas, p, options = {}) {
    const W = c.canvas.width;
    const H = c.canvas.height;
    const flash = lightTableFlash(p);

    c.save();
    c.globalAlpha = flash;
    c.drawImage(oldCanvas, 0, 0);
    c.restore();

    const sandLineY = H * Math.min(1, p * 1.15);

    c.save();
    c.beginPath();
    c.rect(0, sandLineY, W, H - sandLineY);
    c.clip();
    c.drawImage(newCanvas, 0, 0);
    c.restore();

    const particleCount = 180;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 137.5;
      const x = rand(seed) * W;
      const startTime = rand(seed + 17) * 0.4;
      const localP = Math.max(0, Math.min(1, (p - startTime) / (1 - startTime)));
      const fallSpeed = 0.6 + rand(seed + 31) * 0.8;
      const gravity = 0.5 + rand(seed + 47) * 0.5;
      const t = localP;
      const y0 = -20;
      const vy = H * fallSpeed;
      const ay = H * gravity;
      const y = y0 + vy * t + ay * t * t;
      const vx = (rand(seed + 61) - 0.5) * W * 0.15;
      const x2 = x + vx * t;
      const size = 1 + rand(seed + 73) * 3;
      const alpha = Math.max(0, 1 - t * 0.8) * (0.4 + rand(seed + 89) * 0.4);
      if (y < sandLineY + 10 && y > -10) {
        c.fillStyle = `rgba(180, 140, 80, ${alpha})`;
        c.beginPath();
        c.arc(x2, y, size, 0, Math.PI * 2);
        c.fill();
      }
    }

    if (sandLineY < H && sandLineY > 0) {
      const grad = c.createLinearGradient(0, sandLineY - 20, 0, sandLineY + 20);
      grad.addColorStop(0, 'rgba(200, 160, 100, 0)');
      grad.addColorStop(0.4, 'rgba(200, 160, 100, 0.6)');
      grad.addColorStop(0.6, 'rgba(200, 160, 100, 0.6)');
      grad.addColorStop(1, 'rgba(200, 160, 100, 0)');
      c.fillStyle = grad;
      c.fillRect(0, sandLineY - 20, W, 40);

      for (let i = 0; i < 60; i++) {
        const seed = i * 97.3 + 500;
        const jitterX = (rand(seed) - 0.5) * W;
        const jitterY = (rand(seed + 11) - 0.5) * 14;
        const size = 0.5 + rand(seed + 23) * 2.5;
        const alpha = 0.2 + rand(seed + 37) * 0.5;
        c.fillStyle = `rgba(190, 150, 90, ${alpha})`;
        c.beginPath();
        c.arc(W / 2 + jitterX, sandLineY + jitterY, size, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function t_finger_draw(c, oldCanvas, newCanvas, p, options = {}) {
    const W = c.canvas.width;
    const H = c.canvas.height;
    const flash = lightTableFlash(p);
    const cx = options.cx != null ? options.cx : W * 0.2;
    const cy = options.cy != null ? options.cy : H * 0.8;
    const angle = options.angle != null ? options.angle : -Math.PI * 0.28;

    c.save();
    c.globalAlpha = flash;
    c.drawImage(oldCanvas, 0, 0);
    c.restore();

    const startX = cx;
    const startY = cy;
    const length = Math.max(W, H) * 1.5;
    const endX = cx + Math.cos(angle) * length;
    const endY = cy + Math.sin(angle) * length;

    const currentX = startX + (endX - startX) * Math.min(1, p * 1.1);
    const currentY = startY + (endY - startY) * Math.min(1, p * 1.1);

    c.save();
    c.globalCompositeOperation = 'source-over';
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const oc = off.getContext('2d');
    oc.drawImage(newCanvas, 0, 0);

    const reveal = c.canvas.transitionMask || (c.canvas.transitionMask = document.createElement('canvas'));
    reveal.width = W;
    reveal.height = H;
    const rc = reveal.getContext('2d');
    if (p < 0.02) rc.clearRect(0, 0, W, H);

    const scratchWidth = 50;
    rc.strokeStyle = '#fff';
    rc.lineWidth = scratchWidth;
    rc.lineCap = 'round';
    rc.beginPath();
    const segStartX = startX + (endX - startX) * Math.max(0, Math.min(1, (p - 0.02) * 1.15 - 0.01));
    const segStartY = startY + (endY - startY) * Math.max(0, Math.min(1, (p - 0.02) * 1.15 - 0.01));
    const segEndX = currentX;
    const segEndY = currentY;
    rc.moveTo(segStartX, segStartY);
    rc.lineTo(segEndX, segEndY);
    rc.stroke();

    for (let r = 0; r < 18; r++) {
      const seed = r * 53.7 + p * 1000;
      const t = rand(seed);
      const px = startX + (currentX - startX) * t;
      const py = startY + (currentY - startY) * t;
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      const spread = (rand(seed + 13) - 0.5) * scratchWidth * 0.9;
      const dx = px + perpX * spread;
      const dy = py + perpY * spread;
      const rSize = 1 + rand(seed + 29) * 4;
      rc.fillStyle = '#fff';
      rc.globalAlpha = 0.3 + rand(seed + 41) * 0.5;
      rc.beginPath();
      rc.arc(dx, dy, rSize, 0, Math.PI * 2);
      rc.fill();
    }
    rc.globalAlpha = 1;

    c.globalCompositeOperation = 'source-over';
    c.save();
    c.drawImage(reveal, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.drawImage(off, 0, 0);
    c.restore();

    const duneCount = Math.floor(p * 120);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < duneCount; i++) {
        const seed = i * 71.1 + side * 999;
        const t = 0.02 + rand(seed) * Math.min(1, p * 0.98);
        const px = startX + (currentX - startX) * t;
        const py = startY + (currentY - startY) * t;
        const dist = scratchWidth * 0.5 + rand(seed + 7) * scratchWidth * 1.2;
        const dx = px + perpX * side * dist;
        const dy = py + perpY * side * dist;
        const rWidth = 3 + rand(seed + 19) * 8;
        const rHeight = 1 + rand(seed + 31) * 3;
        const alpha = 0.15 + rand(seed + 43) * 0.35;
        c.save();
        c.translate(dx, dy);
        c.rotate(angle);
        c.fillStyle = `rgba(170, 130, 75, ${alpha})`;
        c.beginPath();
        c.ellipse(0, 0, rWidth, rHeight, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
  }

  function t_wipe_palm(c, oldCanvas, newCanvas, p, options = {}) {
    const W = c.canvas.width;
    const H = c.canvas.height;
    const flash = lightTableFlash(p);
    const direction = options.direction || 'left_to_right';

    c.save();
    c.globalAlpha = flash;
    c.drawImage(oldCanvas, 0, 0);
    c.restore();

    let palmX, dirSign;
    if (direction === 'left_to_right') {
      dirSign = 1;
      palmX = -W * 0.2 + p * W * 1.4;
    } else if (direction === 'right_to_left') {
      dirSign = -1;
      palmX = W * 1.2 - p * W * 1.4;
    } else {
      dirSign = 1;
      palmX = -W * 0.2 + p * W * 1.4;
    }

    const palmWidth = W * 0.32;
    const palmHeight = H * 0.88;
    const palmTop = H * 0.06;

    const revealX = direction === 'right_to_left' ? palmX + palmWidth : palmX;

    c.save();
    c.beginPath();
    if (direction === 'left_to_right') {
      c.rect(0, 0, Math.max(0, revealX - palmWidth * 0.25), H);
    } else {
      c.rect(revealX + palmWidth * 0.25, 0, Math.max(0, W - revealX - palmWidth * 0.25), H);
    }
    c.clip();
    c.drawImage(newCanvas, 0, 0);
    c.restore();

    const palmCx = palmX + palmWidth / 2;
    const palmCy = palmTop + palmHeight / 2;
    const duneAheadCount = 50;
    for (let i = 0; i < duneAheadCount; i++) {
      const seed = i * 67.3 + 1000;
      const ahead = rand(seed) * palmWidth * 0.6;
      const dy = palmTop + rand(seed + 11) * palmHeight;
      const duneX = direction === 'left_to_right'
        ? palmX + palmWidth - ahead * 0.3
        : palmX + ahead * 0.3;
      const distFromEdge = Math.abs(duneX - (direction === 'left_to_right' ? palmX + palmWidth : palmX));
      const duneW = 4 + rand(seed + 23) * 12;
      const duneH = 1.5 + rand(seed + 37) * 5;
      const alpha = (0.1 + rand(seed + 51) * 0.3) * (1 - distFromEdge / (palmWidth * 0.8));
      if (alpha > 0) {
        c.fillStyle = `rgba(175, 135, 80, ${alpha})`;
        c.save();
        c.translate(duneX + dirSign * ahead, dy);
        c.beginPath();
        c.ellipse(0, 0, duneW, duneH, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    const trailCount = 40;
    for (let i = 0; i < trailCount; i++) {
      const seed = i * 43.7 + 2000;
      const behind = rand(seed) * palmWidth * 0.7;
      const dy = palmTop + rand(seed + 13) * palmHeight;
      const trailX = direction === 'left_to_right'
        ? palmX + behind
        : palmX + palmWidth - behind;
      const size = 0.5 + rand(seed + 29) * 2;
      const alpha = (0.05 + rand(seed + 41) * 0.2) * (1 - behind / (palmWidth * 0.9));
      if (alpha > 0 && trailX >= 0 && trailX <= W) {
        c.fillStyle = `rgba(185, 145, 85, ${alpha})`;
        c.beginPath();
        c.arc(trailX, dy, size, 0, Math.PI * 2);
        c.fill();
      }
    }

    const edgeGrad = c.createLinearGradient(
      direction === 'left_to_right' ? palmX + palmWidth * 0.7 : palmX, 0,
      direction === 'left_to_right' ? palmX + palmWidth : palmX + palmWidth * 0.3, 0
    );
    edgeGrad.addColorStop(0, 'rgba(160, 120, 65, 0)');
    edgeGrad.addColorStop(1, 'rgba(160, 120, 65, 0.5)');
    c.fillStyle = edgeGrad;
    const edgeX = direction === 'left_to_right' ? palmX + palmWidth * 0.7 : palmX;
    c.fillRect(edgeX, palmTop, palmWidth * 0.3, palmHeight);
  }

  function t_sand_flow(c, oldCanvas, newCanvas, p, options = {}) {
    const W = c.canvas.width;
    const H = c.canvas.height;
    const flash = lightTableFlash(p);

    c.fillStyle = '#1a1408';
    c.fillRect(0, 0, W, H);

    const dissolveP = Math.min(1, p * 1.3);
    const reformP = Math.max(0, Math.min(1, (p - 0.25) * 1.5));

    const oldOff = document.createElement('canvas');
    oldOff.width = W;
    oldOff.height = H;
    oldOff.getContext('2d').drawImage(oldCanvas, 0, 0);

    const newOff = document.createElement('canvas');
    newOff.width = W;
    newOff.height = H;
    newOff.getContext('2d').drawImage(newCanvas, 0, 0);

    const gridSize = 6;
    const cols = Math.ceil(W / gridSize);
    const rows = Math.ceil(H / gridSize);

    const oldData = oldOff.getContext('2d').getImageData(0, 0, W, H).data;
    const newData = newOff.getContext('2d').getImageData(0, 0, W, H).data;

    for (let row = 0; row < rows; row += 2) {
      for (let col = 0; col < cols; col += 2) {
        const seed = (row * cols + col) * 7.77;
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;
        const px = Math.floor(x);
        const py = Math.floor(y);
        const idx = (py * W + px) * 4;
        if (idx < oldData.length) {
          const oldR = oldData[idx];
          const oldG = oldData[idx + 1];
          const oldB = oldData[idx + 2];
          const oldA = oldData[idx + 3] / 255;
          const oldLum = (oldR + oldG + oldB) / 3;

          const delay1 = rand(seed + 1) * 0.35 + (x / W) * 0.2;
          const localDissolve = Math.max(0, Math.min(1, (dissolveP - delay1) / (0.85 - delay1)));

          if (localDissolve < 1 && oldA > 0.1 && oldLum > 20) {
            const flowX = (1 - localDissolve) * 0 + localDissolve * (W + 60);
            const flowY = y + Math.sin((localDissolve * 8 + seed)) * 15 * localDissolve;
            const px2 = x + (flowX - x) * localDissolve;
            const alpha = oldA * (1 - localDissolve) * (0.5 + rand(seed + 3) * 0.5);
            const size = gridSize * 0.6 * (0.7 + rand(seed + 5) * 0.6);
            c.fillStyle = `rgba(${oldR},${oldG},${oldB},${alpha})`;
            c.beginPath();
            c.arc(px2, flowY, size * 0.5, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    }

    for (let row = 0; row < rows; row += 2) {
      for (let col = 0; col < cols; col += 2) {
        const seed = (row * cols + col) * 11.11 + 5000;
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;
        const px = Math.floor(x);
        const py = Math.floor(y);
        const idx = (py * W + px) * 4;
        if (idx < newData.length) {
          const newR = newData[idx];
          const newG = newData[idx + 1];
          const newB = newData[idx + 2];
          const newA = newData[idx + 3] / 255;
          const newLum = (newR + newG + newB) / 3;

          const delay2 = (1 - x / W) * 0.2 + rand(seed + 2) * 0.3;
          const localReform = Math.max(0, Math.min(1, (reformP - delay2) / (0.85 - delay2)));

          if (localReform > 0 && newA > 0.1 && newLum > 20) {
            const fromX = -60 - (cols - col) * 4;
            const fromY = y + Math.sin(localReform * 7 + seed * 0.1) * 12 * (1 - localReform);
            const px2 = fromX + (x - fromX) * localReform;
            const py2 = fromY + (y - fromY) * localReform;
            const alpha = newA * (0.2 + localReform * 0.8) * (0.4 + rand(seed + 4) * 0.6);
            const size = gridSize * 0.55 * (0.6 + rand(seed + 6) * 0.7);
            c.fillStyle = `rgba(${newR},${newG},${newB},${alpha})`;
            c.beginPath();
            c.arc(px2, py2, size * 0.5, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    }

    const streamCount = 28;
    for (let s = 0; s < streamCount; s++) {
      const seed = s * 83.7 + 9000;
      const sy = H * 0.05 + rand(seed) * H * 0.9;
      const baseSpeed = 0.4 + rand(seed + 1) * 0.6;
      const midX = W * (0.2 + 0.6 * p);
      const count = 8 + Math.floor(rand(seed + 2) * 8);
      for (let i = 0; i < count; i++) {
        const lag = i * 0.015;
        const lp = Math.max(0, Math.min(1, p - lag * 0.3));
        const px = midX - W * 0.3 + lp * W * baseSpeed * 1.2 - i * 6;
        const py = sy + Math.sin(lp * 10 + s + i * 0.5) * 10;
        const a = (0.08 + rand(seed + 3 + i) * 0.18) * (1 - Math.abs(lp - 0.5) * 1.2);
        if (a > 0 && px > -10 && px < W + 10) {
          c.fillStyle = `rgba(${160 + Math.floor(rand(seed + 5 + i) * 40)},${120 + Math.floor(rand(seed + 7 + i) * 30)},${60 + Math.floor(rand(seed + 9 + i) * 25)},${a})`;
          c.beginPath();
          c.arc(px, py, 1 + rand(seed + 11 + i) * 2, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    c.save();
    c.globalAlpha = flash;
    c.restore();
  }

  function t_scatter_wind(c, oldCanvas, newCanvas, p, options = {}) {
    const W = c.canvas.width;
    const H = c.canvas.height;
    const flash = lightTableFlash(p);

    c.fillStyle = '#1a1408';
    c.fillRect(0, 0, W, H);

    const erodeP = Math.min(1, p * 1.25);
    const appearP = Math.max(0, Math.min(1, (p - 0.18) * 1.45));

    const oldOff = document.createElement('canvas');
    oldOff.width = W;
    oldOff.height = H;
    oldOff.getContext('2d').drawImage(oldCanvas, 0, 0);
    const oldData = oldOff.getContext('2d').getImageData(0, 0, W, H).data;

    const newOff = document.createElement('canvas');
    newOff.width = W;
    newOff.height = H;
    newOff.getContext('2d').drawImage(newCanvas, 0, 0);
    const newData = newOff.getContext('2d').getImageData(0, 0, W, H).data;

    const gridSize = 5;
    const cols = Math.ceil(W / gridSize);
    const rows = Math.ceil(H / gridSize);

    for (let row = 0; row < rows; row += 2) {
      for (let col = 0; col < cols; col += 2) {
        const seed = (row * cols + col) * 5.31;
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;
        const px = Math.floor(x);
        const py = Math.floor(y);
        const idx = (py * W + px) * 4;
        if (idx < oldData.length) {
          const r = oldData[idx];
          const g = oldData[idx + 1];
          const b = oldData[idx + 2];
          const a = oldData[idx + 3] / 255;
          const lum = (r + g + b) / 3;
          if (a > 0.1 && lum > 20) {
            const cornerScore = Math.min(x / W, 1 - x / W, y / H, 1 - y / H);
            const delay = 0.12 + cornerScore * 0.38 + rand(seed) * 0.2;
            const localErode = Math.max(0, Math.min(1, (erodeP - delay) / (0.82 - delay)));
            if (localErode < 1) {
              const windX = 1 + rand(seed + 1) * 0.6;
              const windY = -(0.6 + rand(seed + 2) * 0.5);
              const dx = localErode * localErode * (W * 1.2 * windX);
              const dy = localErode * localErode * (H * 0.9 * windY);
              const wobbleX = Math.sin(localErode * 12 + seed) * 25 * localErode;
              const wobbleY = Math.cos(localErode * 9 + seed * 0.7) * 18 * localErode;
              const finalX = x + dx + wobbleX;
              const finalY = y + dy + wobbleY;
              const alpha = a * (1 - localErode) * (0.45 + rand(seed + 3) * 0.55);
              const size = gridSize * 0.5 * (0.6 + rand(seed + 5) * 0.8) * (1 - localErode * 0.5);
              c.fillStyle = `rgba(${r},${g},${b},${alpha})`;
              c.beginPath();
              c.arc(finalX, finalY, size, 0, Math.PI * 2);
              c.fill();
            }
          }
        }
      }
    }

    for (let row = 0; row < rows; row += 2) {
      for (let col = 0; col < cols; col += 2) {
        const seed = (row * cols + col) * 8.19 + 4000;
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;
        const px = Math.floor(x);
        const py = Math.floor(y);
        const idx = (py * W + px) * 4;
        if (idx < newData.length) {
          const r = newData[idx];
          const g = newData[idx + 1];
          const b = newData[idx + 2];
          const a = newData[idx + 3] / 255;
          const lum = (r + g + b) / 3;
          if (a > 0.1 && lum > 20) {
            const edgeDistTL = Math.min(x, y);
            const edgeDistTR = Math.min(W - x, y);
            const edgeDistBL = Math.min(x, H - y);
            const edgeDistBR = Math.min(W - x, H - y);
            const edgeScore = Math.min(edgeDistTL, edgeDistTR, edgeDistBL, edgeDistBR);
            const nearestEdge = [
              { d: edgeDistTL, sx: 0, sy: 0 },
              { d: edgeDistTR, sx: W, sy: 0 },
              { d: edgeDistBL, sx: 0, sy: H },
              { d: edgeDistBR, sx: W, sy: H }
            ].reduce((a, b) => a.d < b.d ? a : b);

            const delay = 0.08 + (edgeScore / Math.max(W, H)) * 0.5 + rand(seed) * 0.18;
            const localAppear = Math.max(0, Math.min(1, (appearP - delay) / (0.92 - delay)));
            if (localAppear > 0) {
              const fromX = nearestEdge.sx;
              const fromY = nearestEdge.sy;
              const dx = fromX + (x - fromX) * localAppear;
              const dy = fromY + (y - fromY) * localAppear;
              const alpha = a * localAppear * localAppear * (0.35 + rand(seed + 2) * 0.65);
              const size = gridSize * 0.45 * (0.55 + rand(seed + 4) * 0.9) * (0.4 + localAppear * 0.6);
              c.fillStyle = `rgba(${r},${g},${b},${alpha})`;
              c.beginPath();
              c.arc(dx, dy, size, 0, Math.PI * 2);
              c.fill();
            }
          }
        }
      }
    }

    const windCount = 22;
    for (let w = 0; w < windCount; w++) {
      const seed = w * 91.1 + 8000;
      const startY = rand(seed) * H;
      for (let i = 0; i < 14; i++) {
        const lag = i * 0.018;
        const lp = Math.max(0, Math.min(1, p - lag));
        const px = -20 + lp * (W + 60) * (0.8 + rand(seed + 1) * 0.4);
        const py = startY - lp * H * 0.6 + Math.sin(lp * 14 + w * 0.5 + i) * 22;
        const a = (0.06 + rand(seed + 2 + i) * 0.14) * (1 - Math.abs(lp - 0.45) * 1.5);
        if (a > 0 && px > -10 && px < W + 10 && py > -10 && py < H + 10) {
          c.fillStyle = `rgba(${155 + Math.floor(rand(seed + 3 + i) * 50)},${115 + Math.floor(rand(seed + 5 + i) * 35)},${55 + Math.floor(rand(seed + 7 + i) * 30)},${a})`;
          c.beginPath();
          c.arc(px, py, 0.8 + rand(seed + 9 + i) * 2, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  }

  function t_light_table(c, oldCanvas, newCanvas, p, options = {}) {
    const W = c.canvas.width;
    const H = c.canvas.height;
    const flash = lightTableFlash(p);

    const baseBrightness = p;
    const glow = baseBrightness * flash;

    const ltR = Math.floor(28 + glow * 22);
    const ltG = Math.floor(22 + glow * 18);
    const ltB = Math.floor(12 + glow * 10);
    c.fillStyle = `rgb(${ltR},${ltG},${ltB})`;
    c.fillRect(0, 0, W, H);

    if (p > 0.02) {
      const vignette = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
      vignette.addColorStop(0, `rgba(${ltR + 8},${ltG + 6},${ltB + 4},0)`);
      vignette.addColorStop(1, `rgba(${Math.max(0, ltR - 16)},${Math.max(0, ltG - 14)},${Math.max(0, ltB - 8)},0.55)`);
      c.fillStyle = vignette;
      c.fillRect(0, 0, W, H);
    }

    const bedP = Math.max(0, Math.min(1, (p - 0.06) / 0.22));
    if (bedP > 0) {
      const gridSize = 4;
      const cols = Math.ceil(W / gridSize);
      const rows = Math.ceil(H / gridSize);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const seed = (row * cols + col) * 3.17;
          const r1 = rand(seed);
          const r2 = rand(seed + 1);
          const r3 = rand(seed + 2);
          if (r1 < 0.85 * bedP) {
            const x = col * gridSize + r2 * gridSize;
            const y = row * gridSize + r3 * gridSize;
            const density = bedP * (0.3 + r1 * 0.35);
            const sandR = 175 + Math.floor(r2 * 25);
            const sandG = 138 + Math.floor(r3 * 20);
            const sandB = 80 + Math.floor(r1 * 18);
            c.fillStyle = `rgba(${sandR},${sandG},${sandB},${density})`;
            c.fillRect(x, y, gridSize * 0.55, gridSize * 0.55);
          }
        }
      }

      const grainCount = Math.floor(bedP * 1400);
      for (let i = 0; i < grainCount; i++) {
        const seed = i * 17.3 + 300;
        const x = rand(seed) * W;
        const y = rand(seed + 1) * H;
        const size = 0.3 + rand(seed + 2) * 1.2;
        const alpha = (0.08 + rand(seed + 3) * 0.22) * bedP;
        const gR = 165 + Math.floor(rand(seed + 4) * 40);
        const gG = 128 + Math.floor(rand(seed + 5) * 30);
        const gB = 70 + Math.floor(rand(seed + 6) * 25);
        c.fillStyle = `rgba(${gR},${gG},${gB},${alpha})`;
        c.beginPath();
        c.arc(x, y, size, 0, Math.PI * 2);
        c.fill();
      }
    }

    const shapeP = Math.max(0, Math.min(1, (p - 0.35) / 0.65));
    if (shapeP > 0) {
      c.save();
      c.globalAlpha = shapeP;
      c.drawImage(newCanvas, 0, 0);
      c.restore();
    }

    if (p > 0.12 && p < 0.42) {
      const shimmerCount = 60;
      const shimmerP = (p - 0.12) / 0.3;
      for (let i = 0; i < shimmerCount; i++) {
        const seed = i * 47.9 + 700;
        const x = rand(seed) * W;
        const y = rand(seed + 1) * H;
        const size = 0.5 + rand(seed + 2) * 2;
        const a = (0.1 + rand(seed + 3) * 0.25) * (1 - Math.abs(shimmerP - 0.5) * 2);
        if (a > 0) {
          c.fillStyle = `rgba(255, 240, 200, ${a})`;
          c.beginPath();
          c.arc(x, y, size, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  }

  window.TRANSITIONS = {
    t_pour_in,
    t_finger_draw,
    t_wipe_palm,
    t_sand_flow,
    t_scatter_wind,
    t_light_table
  };

  function _randProg(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function _makeProgCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function _microFlash(c, W, H, intensity) {
    const flashAlpha = 0.08 * intensity;
    c.save();
    c.fillStyle = `rgba(180, 210, 230, ${flashAlpha})`;
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  function _scratchLineImpl(workCtx, x1, y1, x2, y2, opts) {
    const W = workCtx.canvas.width;
    const H = workCtx.canvas.height;
    const width = opts.width || 18;
    const intensity = opts.intensity || 1.0;
    const seed = opts.seed || 1;
    const W_SAND = 140 + Math.floor(_randProg(seed) * 50);
    const G_SAND = 105 + Math.floor(_randProg(seed + 1) * 40);
    const B_SAND = 65 + Math.floor(_randProg(seed + 2) * 30);
    const steps = Math.max(8, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 4));
    workCtx.lineCap = 'round';
    workCtx.strokeStyle = `rgba(0, 128, 165, ${0.32 * intensity})`;
    workCtx.lineWidth = width * 0.4;
    workCtx.beginPath();
    workCtx.moveTo(x1, y1);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const wander = (_randProg(seed + s) - 0.5) * width * 0.15;
      const perpX = -(y2 - y1) / Math.max(1, Math.hypot(x2 - x1, y2 - y1));
      const perpY = (x2 - x1) / Math.max(1, Math.hypot(x2 - x1, y2 - y1));
      const px = x1 + (x2 - x1) * t + perpX * wander;
      const py = y1 + (y2 - y1) * t + perpY * wander;
      workCtx.lineTo(px, py);
    }
    workCtx.stroke();
    const duneCount = Math.floor(steps * 0.6 * intensity);
    for (let side = -1; side <= 1; side += 2) {
      for (let d = 0; d < duneCount; d++) {
        const dSeed = seed + side * 100 + d * 7.3;
        const t = 0.1 + _randProg(dSeed) * 0.85;
        const perpX = -(y2 - y1) / Math.max(1, Math.hypot(x2 - x1, y2 - y1));
        const perpY = (x2 - x1) / Math.max(1, Math.hypot(x2 - x1, y2 - y1));
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        const pushDist = width * 0.55 + _randProg(dSeed + 1) * width * 1.4;
        const dx = px + perpX * side * pushDist + (_randProg(dSeed + 2) - 0.5) * 5;
        const dy = py + perpY * side * pushDist + (_randProg(dSeed + 3) - 0.5) * 4;
        const fade = (1 - (pushDist - width * 0.55) / (width * 1.4) * 0.55) * Math.sin(t * Math.PI);
        const alpha = (0.14 + _randProg(dSeed + 4) * 0.28) * fade * intensity;
        const rW = 3 + _randProg(dSeed + 5) * 10;
        const rH = 1 + _randProg(dSeed + 6) * 4;
        workCtx.save();
        workCtx.translate(dx, dy);
        workCtx.rotate(Math.atan2(y2 - y1, x2 - x1));
        workCtx.fillStyle = `rgba(${W_SAND},${G_SAND},${B_SAND},${alpha})`;
        workCtx.beginPath();
        workCtx.ellipse(0, 0, rW, rH, 0, 0, Math.PI * 2);
        workCtx.fill();
        workCtx.restore();
      }
    }
    const innerDots = Math.floor(steps * 0.4 * intensity);
    for (let i = 0; i < innerDots; i++) {
      const iSeed = seed + i * 11.7 + 3000;
      const t = 0.05 + _randProg(iSeed) * 0.9;
      const perpX = -(y2 - y1) / Math.max(1, Math.hypot(x2 - x1, y2 - y1));
      const perpY = (x2 - x1) / Math.max(1, Math.hypot(x2 - x1, y2 - y1));
      const px = x1 + (x2 - x1) * t + perpX * (_randProg(iSeed + 1) - 0.5) * width * 0.45;
      const py = y1 + (y2 - y1) * t + perpY * (_randProg(iSeed + 2) - 0.5) * width * 0.45;
      workCtx.fillStyle = `rgba(${W_SAND + 15},${G_SAND + 12},${B_SAND + 8},${(0.08 + _randProg(iSeed + 3) * 0.18) * intensity})`;
      workCtx.beginPath();
      workCtx.arc(px, py, 0.5 + _randProg(iSeed + 4) * 2, 0, Math.PI * 2);
      workCtx.fill();
    }
  }

  function _pourImpl(workCtx, cx, cy, radius, opts) {
    const pileCount = Math.floor(400 * (opts.density || 1.0) * (opts.intensity || 1.0));
    const seed = opts.seed || 1;
    const W_SAND = 155 + Math.floor(_randProg(seed) * 35);
    const G_SAND = 120 + Math.floor(_randProg(seed + 1) * 30);
    const B_SAND = 70 + Math.floor(_randProg(seed + 2) * 25);
    for (let i = 0; i < pileCount; i++) {
      const pSeed = seed + i * 4.7;
      const ang = _randProg(pSeed) * Math.PI * 2;
      const dist = Math.pow(_randProg(pSeed + 1), 0.55) * radius;
      const x = cx + Math.cos(ang) * dist + (_randProg(pSeed + 2) - 0.5) * (radius * 0.12);
      const y = cy + Math.sin(ang) * dist * (opts.vertBias || 0.55) + (_randProg(pSeed + 3) - 0.5) * (radius * 0.08);
      const fade = 1 - dist / radius * 0.6;
      const yBias = Math.max(0, (y - (cy - radius * 0.2)) / (radius * 0.9));
      const alpha = (0.18 + _randProg(pSeed + 4) * 0.36) * fade * (0.55 + yBias * 0.45);
      const size = 0.5 + _randProg(pSeed + 5) * 2.6;
      workCtx.fillStyle = `rgba(${W_SAND},${G_SAND},${B_SAND},${alpha})`;
      workCtx.beginPath();
      workCtx.arc(x, y, size, 0, Math.PI * 2);
      workCtx.fill();
    }
  }

  function _wipeTrailImpl(workCtx, x1, y1, x2, y2, opts) {
    const W = workCtx.canvas.width;
    const H = workCtx.canvas.height;
    const palmWidth = opts.width || W * 0.3;
    const palmHeight = opts.height || H * 0.85;
    const seed = opts.seed || 1;
    const W_SAND = 165 + Math.floor(_randProg(seed) * 30);
    const G_SAND = 128 + Math.floor(_randProg(seed + 1) * 25);
    const B_SAND = 75 + Math.floor(_randProg(seed + 2) * 20);
    const steps = 24;
    const dirX = x2 - x1;
    const dirY = y2 - y1;
    const len = Math.hypot(dirX, dirY);
    const perpX = -dirY / Math.max(1, len);
    const perpY = dirX / Math.max(1, len);
    const trailCount = Math.floor(55 * (opts.intensity || 1.0));
    for (let i = 0; i < trailCount; i++) {
      const tSeed = seed + i * 4.9;
      const behind = _randProg(tSeed) * palmWidth * 0.75;
      const tP = 0.1 + _randProg(tSeed + 1) * 0.85;
      const baseX = x1 + dirX * tP;
      const baseY = y1 + dirY * tP;
      const off = (_randProg(tSeed + 2) - 0.5);
      const trailX = baseX - (dirX / Math.max(1, len)) * behind + perpX * off * palmWidth * 0.4;
      const trailY = baseY - (dirY / Math.max(1, len)) * behind + perpY * off * palmWidth * 0.4;
      const size = 0.4 + _randProg(tSeed + 3) * 2.2;
      const alpha = (0.06 + _randProg(tSeed + 4) * 0.22) * (1 - behind / (palmWidth * 0.95));
      if (alpha > 0 && trailX >= -20 && trailX <= W + 20) {
        workCtx.fillStyle = `rgba(${W_SAND},${G_SAND},${B_SAND},${alpha})`;
        workCtx.beginPath();
        workCtx.arc(trailX, trailY, size, 0, Math.PI * 2);
        workCtx.fill();
      }
    }
    const edgeCount = Math.floor(35 * (opts.intensity || 1.0));
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < edgeCount; i++) {
        const eSeed = seed + side * 200 + i * 6.1;
        const ahead = _randProg(eSeed) * palmWidth * 0.6;
        const tP = 0.05 + _randProg(eSeed + 1) * 0.9;
        const baseX = x1 + dirX * tP;
        const baseY = y1 + dirY * tP;
        const dy = baseY + (_randProg(eSeed + 2) - 0.5) * palmHeight;
        const edgeX = baseX + (dirX / Math.max(1, len)) * (palmWidth * 0.5) - (dirX / Math.max(1, len)) * ahead * 0.3 + perpX * side * ahead * 0.4;
        const distFromEdge = Math.abs(ahead) / (palmWidth * 0.8);
        const dW = 3 + _randProg(eSeed + 3) * 12;
        const dH = 1 + _randProg(eSeed + 4) * 5;
        const alpha = (0.1 + _randProg(eSeed + 5) * 0.3) * (1 - distFromEdge) * (opts.intensity || 1.0);
        if (alpha > 0) {
          workCtx.save();
          workCtx.translate(edgeX, dy);
          workCtx.rotate(Math.atan2(dirY, dirX));
          workCtx.fillStyle = `rgba(${W_SAND - 10},${G_SAND - 8},${B_SAND - 5},${alpha})`;
          workCtx.beginPath();
          workCtx.ellipse(0, 0, dW, dH, 0, 0, Math.PI * 2);
          workCtx.fill();
          workCtx.restore();
        }
      }
    }
  }

  function _dabShapeImpl(workCtx, cx, cy, rx, ry, opts) {
    const count = Math.floor(180 * (opts.density || 1.0) * (opts.intensity || 1.0));
    const seed = opts.seed || 1;
    const W_SAND = 150 + Math.floor(_randProg(seed) * 40);
    const G_SAND = 115 + Math.floor(_randProg(seed + 1) * 30);
    const B_SAND = 68 + Math.floor(_randProg(seed + 2) * 25);
    for (let i = 0; i < count; i++) {
      const dSeed = seed + i * 5.3;
      const ang = _randProg(dSeed) * Math.PI * 2;
      const rad = Math.pow(_randProg(dSeed + 1), 0.65);
      const x = cx + Math.cos(ang) * rx * rad + (_randProg(dSeed + 2) - 0.5) * (rx * 0.08);
      const y = cy + Math.sin(ang) * ry * rad + (_randProg(dSeed + 3) - 0.5) * (ry * 0.08);
      const fade = 1 - rad * 0.7;
      const alpha = (0.14 + _randProg(dSeed + 4) * 0.3) * fade * (opts.alphaScale || 1.0);
      const size = 0.5 + _randProg(dSeed + 5) * 2.4;
      workCtx.fillStyle = `rgba(${W_SAND},${G_SAND},${B_SAND},${alpha})`;
      workCtx.beginPath();
      workCtx.arc(x, y, size, 0, Math.PI * 2);
      workCtx.fill();
    }
  }

  function _flowAlongImpl(workCtx, paths, progress, opts) {
    const intensity = opts.intensity || 1.0;
    const seed = opts.seed || 1;
    const W_SAND = 158 + Math.floor(_randProg(seed) * 38);
    const G_SAND = 122 + Math.floor(_randProg(seed + 1) * 30);
    const B_SAND = 72 + Math.floor(_randProg(seed + 2) * 22);
    paths.forEach((path, pi) => {
      const perPath = Math.floor(55 * intensity);
      for (let i = 0; i < perPath; i++) {
        const fSeed = seed + pi * 500 + i * 7.9;
        const tBase = 0.02 + _randProg(fSeed) * 0.96;
        const t = Math.max(0, Math.min(1, progress * 1.15 - tBase * (1 - progress * 0.4)));
        if (t <= 0 || t >= 1) continue;
        const idx = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
        const frac = (t * (path.length - 1)) - idx;
        const p0 = path[idx];
        const p1 = path[Math.min(path.length - 1, idx + 1)];
        const px = p0.x + (p1.x - p0.x) * frac;
        const py = p0.y + (p1.y - p0.y) * frac;
        const perpX = -(p1.y - p0.y) / Math.max(1, Math.hypot(p1.x - p0.x, p1.y - p0.y));
        const perpY = (p1.x - p0.x) / Math.max(1, Math.hypot(p1.x - p0.x, p1.y - p0.y));
        const off = (_randProg(fSeed + 1) - 0.5) * (opts.spread || 18);
        const wander = Math.sin(t * 8 + fSeed) * (opts.wander || 6);
        const x = px + perpX * off + wander * perpX;
        const y = py + perpY * off + wander * perpY;
        const fade = Math.sin(t * Math.PI);
        const alpha = (0.09 + _randProg(fSeed + 2) * 0.22) * fade * intensity * (opts.alphaScale || 1.0);
        const size = 0.4 + _randProg(fSeed + 3) * 2;
        if (alpha > 0) {
          workCtx.fillStyle = `rgba(${W_SAND},${G_SAND},${B_SAND},${alpha})`;
          workCtx.beginPath();
          workCtx.arc(x, y, size, 0, Math.PI * 2);
          workCtx.fill();
        }
      }
    });
  }

  function _extractBContour(canvasB, W, H) {
    const ctxB = canvasB.getContext('2d');
    const imgData = ctxB.getImageData(0, 0, W, H);
    const data = imgData.data;
    const edgePoints = [];
    const sampleStep = 12;
    for (let y = sampleStep; y < H - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < W - sampleStep; x += sampleStep) {
        const idx = (y * W + x) * 4;
        const a = data[idx + 3] / 255;
        const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (a > 0.2 && lum > 35) {
          let neighborDiff = 0;
          for (let dy = -sampleStep; dy <= sampleStep; dy += sampleStep) {
            for (let dx = -sampleStep; dx <= sampleStep; dx += sampleStep) {
              if (dx === 0 && dy === 0) continue;
              const nIdx = ((y + dy) * W + (x + dx)) * 4;
              const nLum = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
              neighborDiff += Math.abs(lum - nLum);
            }
          }
          if (neighborDiff > 280) {
            edgePoints.push({ x, y, lum });
          }
        }
      }
    }
    edgePoints.sort((a, b) => a.x - b.x || a.y - b.y);
    const paths = [];
    const used = new Set();
    for (let i = 0; i < edgePoints.length; i++) {
      if (used.has(i)) continue;
      const path = [];
      let cur = edgePoints[i];
      used.add(i);
      path.push({ x: cur.x, y: cur.y });
      for (let step = 0; step < 120; step++) {
        let nearestIdx = -1;
        let nearestDist = 40;
        for (let j = 0; j < edgePoints.length; j++) {
          if (used.has(j)) continue;
          const d = Math.hypot(edgePoints[j].x - cur.x, edgePoints[j].y - cur.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = j;
          }
        }
        if (nearestIdx < 0) break;
        used.add(nearestIdx);
        cur = edgePoints[nearestIdx];
        path.push({ x: cur.x, y: cur.y });
      }
      if (path.length >= 4) paths.push(path);
    }
    return paths;
  }

  class ProgressiveMorph {
    constructor(opts) {
      this.fromScene = opts.fromScene;
      this.toScene = opts.toScene;
      this.duration = opts.duration || 18.0;
      this.mode = opts.mode || 'wipe_palm_half';
      this.palette = opts.palette || null;
      this.intensity = opts.intensity || 1.0;
      this.fps = opts.fps || 30;
      this._canvasA = null;
      this._canvasB = null;
      this._workCanvas = null;
      this._W = 0;
      this._H = 0;
      this._totalSand = 0;
      this._initialized = false;
      this._morphSteps = this._buildSteps();
    }

    _buildSteps() {
      const mode = this.mode;
      if (mode === 'wipe_palm_half') {
        return [
          { name: 'wipe_bottom_half', startP: 0.00, endP: 0.22, weight: 0.22 },
          { name: 'draw_B_outline', startP: 0.18, endP: 0.45, weight: 0.27 },
          { name: 'outline_dunes', startP: 0.38, endP: 0.60, weight: 0.22 },
          { name: 'thick_sand_fill', startP: 0.52, endP: 0.76, weight: 0.24 },
          { name: 'thin_detail_sand', startP: 0.68, endP: 0.88, weight: 0.20 },
          { name: 'breathe_and_shimmer', startP: 0.84, endP: 1.00, weight: 0.16 }
        ];
      } else if (mode === 'flow_gather_scatter') {
        return [
          { name: 'scatter_flow_out', startP: 0.00, endP: 0.38, weight: 0.38 },
          { name: 'cold_flash', startP: 0.32, endP: 0.46, weight: 0.14 },
          { name: 'gather_from_edges', startP: 0.42, endP: 0.78, weight: 0.36 },
          { name: 'contour_dab_fill', startP: 0.70, endP: 0.92, weight: 0.22 },
          { name: 'breathe_shimmer', startP: 0.88, endP: 1.00, weight: 0.12 }
        ];
      } else if (mode === 'scratch_reveal_slow') {
        return [
          { name: 'scratch_left_to_right', startP: 0.00, endP: 0.52, weight: 0.52 },
          { name: 'skeleton_dunes', startP: 0.30, endP: 0.72, weight: 0.42 },
          { name: 'dense_fill_around_lines', startP: 0.58, endP: 0.88, weight: 0.30 },
          { name: 'breathe_shimmer', startP: 0.84, endP: 1.00, weight: 0.16 }
        ];
      } else if (mode === 'pour_rewrite') {
        return [
          { name: 'pour_cover_topdown', startP: 0.00, endP: 0.28, weight: 0.28 },
          { name: 'palm_wipe_1', startP: 0.22, endP: 0.42, weight: 0.20 },
          { name: 'palm_wipe_2', startP: 0.38, endP: 0.58, weight: 0.20 },
          { name: 'palm_wipe_half3', startP: 0.52, endP: 0.66, weight: 0.14 },
          { name: 'finger_draw_B', startP: 0.60, endP: 0.90, weight: 0.30 },
          { name: 'breathe_shimmer', startP: 0.86, endP: 1.00, weight: 0.14 }
        ];
      }
      return [
        { name: 'default', startP: 0, endP: 1, weight: 1 }
      ];
    }

    _ensureInit(W, H) {
      if (this._initialized && this._W === W && this._H === H) return;
      this._W = W;
      this._H = H;
      this._canvasA = _makeProgCanvas(W, H);
      this._canvasB = _makeProgCanvas(W, H);
      this._workCanvas = _makeProgCanvas(W, H);
      const ctxA = this._canvasA.getContext('2d');
      const ctxB = this._canvasB.getContext('2d');
      const DEFAULT_LT = 0.93;
      if (this.fromScene && typeof this.fromScene === 'object' && typeof this.fromScene.draw === 'function') {
        try { this.fromScene.draw(ctxA, DEFAULT_LT, 0); } catch (e) {}
      } else if (window.SCENES && window.SCENES[this.fromScene]) {
        try { window.SCENES[this.fromScene].draw(ctxA, DEFAULT_LT, 0); } catch (e) {}
      }
      if (this.toScene && typeof this.toScene === 'object' && typeof this.toScene.draw === 'function') {
        try { this.toScene.draw(ctxB, DEFAULT_LT, this.duration * 0.5); } catch (e) {}
      } else if (window.SCENES && window.SCENES[this.toScene]) {
        try { window.SCENES[this.toScene].draw(ctxB, DEFAULT_LT, this.duration * 0.5); } catch (e) {}
      }
      this._totalSand = Math.floor(4800 * this.intensity);
      this._initialized = true;
    }

    _stepProgress(globalP, step) {
      if (globalP <= step.startP) return 0;
      if (globalP >= step.endP) return 1;
      return (globalP - step.startP) / (step.endP - step.startP);
    }

    _isStepActive(globalP, step) {
      return globalP >= step.startP && globalP <= step.endP;
    }

    motionEnergy(t) {
      const p = Math.max(0, Math.min(1, t / this.duration));
      const midStart = 0.15;
      const midEnd = 0.90;
      if (p < midStart) {
        const k = p / midStart;
        return 0.08 + k * 0.22;
      } else if (p > midEnd) {
        const k = (p - midEnd) / (1 - midEnd);
        return 0.9 - k * 0.8;
      } else {
        const k = (p - midStart) / (midEnd - midStart);
        const bell = Math.sin(k * Math.PI);
        return 0.3 + bell * 0.6;
      }
    }

    debugStats() {
      return {
        totalSand: this._totalSand,
        mode: this.mode,
        duration: this.duration,
        intensity: this.intensity,
        stepCount: this._morphSteps.length,
        W: this._W,
        H: this._H
      };
    }

    renderFrame(ctx, t) {
      const W = ctx.canvas.width;
      const H = ctx.canvas.height;
      this._ensureInit(W, H);
      const rawT = Math.max(0, Math.min(this.duration, t));
      const globalP = rawT / this.duration;
      const holdAP = 0.15;
      const morphEndP = 0.90;
      const workCtx = this._workCanvas.getContext('2d');
      workCtx.clearRect(0, 0, W, H);
      if (globalP <= holdAP) {
        const holdK = globalP / holdAP;
        workCtx.drawImage(this._canvasA, 0, 0);
        if (holdK > 0.6) {
          const fadeK = (holdK - 0.6) / 0.4;
          workCtx.save();
          workCtx.globalAlpha = fadeK * 0.25 * this.intensity;
          workCtx.fillStyle = `rgba(180, 140, 80, 1)`;
          workCtx.fillRect(0, H * 0.45, W, H * 0.55);
          workCtx.restore();
        }
      } else if (globalP >= morphEndP) {
        const endK = (globalP - morphEndP) / (1 - morphEndP);
        workCtx.drawImage(this._canvasB, 0, 0);
        const breath = 0.98 + Math.sin(rawT * 1.4) * 0.02;
        workCtx.save();
        workCtx.globalAlpha = 0.04 * endK * this.intensity * (1 + Math.sin(rawT * 3) * 0.5);
        workCtx.fillStyle = `rgba(${Math.floor(15 * breath)},${Math.floor(110 * breath)},${Math.floor(150 * breath)},1)`;
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
        const shimmerC = Math.floor(35 * endK);
        for (let i = 0; i < shimmerC; i++) {
          const seed = i * 27.1 + rawT * 10;
          const x = _randProg(seed) * W;
          const y = _randProg(seed + 1) * H;
          const a = (0.04 + _randProg(seed + 2) * 0.1) * endK * (0.5 + 0.5 * Math.sin(rawT * 2.5 + i));
          if (a > 0) {
            workCtx.fillStyle = `rgba(0, 128, 165, ${a})`;
            workCtx.beginPath();
            workCtx.arc(x, y, 0.3 + _randProg(seed + 3) * 1.2, 0, Math.PI * 2);
            workCtx.fill();
          }
        }
      } else {
        const morphP = (globalP - holdAP) / (morphEndP - holdAP);
        this._renderMorphMiddle(workCtx, W, H, morphP, globalP, rawT);
      }
      const flashTimes = [0.33, 0.66, 0.90];
      for (let fi = 0; fi < flashTimes.length; fi++) {
        const ft = flashTimes[fi];
        const dt = Math.abs(globalP - ft);
        if (dt < 0.015) {
          const flashK = 1 - dt / 0.015;
          _microFlash(workCtx, W, H, flashK * this.intensity);
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(this._workCanvas, 0, 0);
    }

    _renderMorphMiddle(workCtx, W, H, morphP, globalP, rawT) {
      const mode = this.mode;
      const baseA = Math.max(0, 1 - morphP * 1.15);
      const baseB = Math.max(0, (morphP - 0.2) / 0.8);
      if (mode === 'wipe_palm_half') {
        this._modeWipePalmHalf(workCtx, W, H, morphP, globalP, rawT, baseA, baseB);
      } else if (mode === 'flow_gather_scatter') {
        this._modeFlowGather(workCtx, W, H, morphP, globalP, rawT, baseA, baseB);
      } else if (mode === 'scratch_reveal_slow') {
        this._modeScratchReveal(workCtx, W, H, morphP, globalP, rawT, baseA, baseB);
      } else if (mode === 'pour_rewrite') {
        this._modePourRewrite(workCtx, W, H, morphP, globalP, rawT, baseA, baseB);
      } else {
        workCtx.save();
        workCtx.globalAlpha = baseA;
        workCtx.drawImage(this._canvasA, 0, 0);
        workCtx.restore();
        workCtx.save();
        workCtx.globalAlpha = baseB;
        workCtx.drawImage(this._canvasB, 0, 0);
        workCtx.restore();
      }
    }

    _modeWipePalmHalf(workCtx, W, H, morphP, globalP, rawT, baseA, baseB) {
      const steps = this._morphSteps;
      const s1 = this._stepProgress(globalP, steps[0]);
      const s2 = this._stepProgress(globalP, steps[1]);
      const s3 = this._stepProgress(globalP, steps[2]);
      const s4 = this._stepProgress(globalP, steps[3]);
      const s5 = this._stepProgress(globalP, steps[4]);
      const s6 = this._stepProgress(globalP, steps[5]);
      workCtx.save();
      workCtx.globalAlpha = Math.max(0, baseA * 1.05 - s1 * 0.55);
      workCtx.drawImage(this._canvasA, 0, 0);
      workCtx.restore();
      const wipeYTop = H * 0.48;
      const wipeProgress = s1;
      const wipeCurY = wipeYTop + wipeProgress * (H * 0.55);
      workCtx.save();
      workCtx.beginPath();
      workCtx.rect(0, 0, W, wipeCurY);
      workCtx.clip();
      workCtx.globalAlpha = Math.max(0.2, baseA * 0.85);
      workCtx.drawImage(this._canvasA, 0, 0);
      workCtx.restore();
      if (this._isStepActive(globalP, steps[0])) {
        const wipeX1 = W * 0.02;
        const wipeX2 = W * 0.98;
        _wipeTrailImpl(workCtx, wipeX1, wipeCurY - 5, wipeX2, wipeCurY + 5, {
          width: W * 0.28, height: H * 0.5, seed: 101, intensity: this.intensity * (0.5 + wipeProgress * 0.5)
        });
      }
      if (s2 > 0 || s3 > 0 || s4 > 0) {
        const revealP = Math.min(1, s2 * 0.6 + s3 * 0.3 + s4 * 0.4);
        workCtx.save();
        workCtx.beginPath();
        const bottomClipY = wipeCurY + 5;
        workCtx.rect(0, 0, W, H);
        workCtx.rect(0, bottomClipY, W, H - bottomClipY);
        workCtx.clip('evenodd');
        workCtx.globalAlpha = Math.min(1, revealP);
        workCtx.drawImage(this._canvasB, 0, 0);
        workCtx.restore();
        workCtx.save();
        workCtx.beginPath();
        workCtx.rect(0, bottomClipY, W, H - bottomClipY);
        workCtx.clip();
        workCtx.globalAlpha = Math.max(0, (revealP - 0.35) * 1.1);
        workCtx.drawImage(this._canvasB, 0, 0);
        workCtx.restore();
      }
      if (s2 > 0) {
        const outlineProgress = s2;
        const contourPaths = _extractBContour(this._canvasB, W, H);
        contourPaths.forEach((path, pi) => {
          if (path.length < 2) return;
          const visibleCount = Math.max(2, Math.floor(path.length * outlineProgress));
          for (let i = 0; i < visibleCount - 1; i++) {
            const p0 = path[i];
            const p1 = path[i + 1];
            if (p0.y < H * 0.5 && Math.random() > 0.5) continue;
            _scratchLineImpl(workCtx, p0.x, p0.y, p1.x, p1.y, {
              width: 16, intensity: this.intensity * outlineProgress * (0.6 + (i / visibleCount) * 0.4),
              seed: 200 + pi * 37 + i
            });
          }
        });
      }
      if (s3 > 0) {
        const duneProgress = s3;
        const contourPaths2 = _extractBContour(this._canvasB, W, H);
        contourPaths2.forEach((path, pi) => {
          const dabCount = Math.floor(path.length * 0.45 * duneProgress);
          for (let d = 0; d < dabCount; d++) {
            const idx = Math.floor((d / dabCount) * (path.length - 1));
            const pt = path[idx];
            _dabShapeImpl(workCtx, pt.x, pt.y, 28, 18, {
              density: 0.8, intensity: this.intensity * duneProgress,
              seed: 400 + pi * 53 + d * 3.1, alphaScale: 0.9
            });
          }
        });
      }
      if (s4 > 0) {
        const fillProgress = s4;
        const ctxB = this._canvasB.getContext('2d');
        const imgData = ctxB.getImageData(0, 0, W, H).data;
        const fillSample = 32;
        const fillCount = Math.floor(160 * fillProgress);
        for (let i = 0; i < fillCount; i++) {
          const seed = 500 + i * 13.7;
          const fx = Math.floor(_randProg(seed) * (W / fillSample)) * fillSample + fillSample / 2;
          const fy = Math.floor(_randProg(seed + 1) * (H / fillSample)) * fillSample + fillSample / 2;
          if (fy < H * 0.42 && _randProg(seed + 2) > 0.35) continue;
          const idx = (Math.floor(fy) * W + Math.floor(fx)) * 4;
          const lum = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
          const a = imgData[idx + 3] / 255;
          if (a > 0.2 && lum > 30) {
            _pourImpl(workCtx, fx, fy, 38 + _randProg(seed + 3) * 22, {
              density: 0.55 + fillProgress * 0.45,
              intensity: this.intensity * fillProgress * (0.5 + lum / 255),
              seed: seed + 11, vertBias: 0.65
            });
          }
        }
      }
      if (s5 > 0) {
        const detailProgress = s5;
        const contourPaths3 = _extractBContour(this._canvasB, W, H);
        contourPaths3.forEach((path, pi) => {
          const thinCount = Math.floor(path.length * 0.6 * detailProgress);
          for (let d = 0; d < thinCount; d++) {
            const idx = Math.floor((d / thinCount) * (path.length - 1));
            const pt = path[idx];
            _dabShapeImpl(workCtx, pt.x + (_randProg(d + 1) - 0.5) * 10, pt.y + (_randProg(d + 2) - 0.5) * 8, 16, 10, {
              density: 0.6, intensity: this.intensity * detailProgress * 0.8,
              seed: 700 + pi * 47 + d * 5.9, alphaScale: 0.7
            });
          }
        });
      }
      if (s6 > 0) {
        const breathProgress = s6;
        const breath = 0.98 + Math.sin(rawT * 1.6) * 0.02;
        workCtx.save();
        workCtx.globalAlpha = 0.05 * breathProgress * this.intensity;
        workCtx.fillStyle = `rgba(${Math.floor(12 * breath)},${Math.floor(100 * breath)},${Math.floor(140 * breath)},1)`;
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
        const shimmerC = Math.floor(40 * breathProgress);
        for (let i = 0; i < shimmerC; i++) {
          const seed = 900 + i * 29.3 + rawT * 12;
          const x = _randProg(seed) * W;
          const y = _randProg(seed + 1) * H;
          const a = (0.04 + _randProg(seed + 2) * 0.12) * breathProgress * (0.5 + 0.5 * Math.sin(rawT * 2.8 + i));
          if (a > 0) {
            workCtx.fillStyle = `rgba(0, 128, 165, ${a})`;
            workCtx.beginPath();
            workCtx.arc(x, y, 0.3 + _randProg(seed + 3) * 1.4, 0, Math.PI * 2);
            workCtx.fill();
          }
        }
      }
    }

    _modeFlowGather(workCtx, W, H, morphP, globalP, rawT, baseA, baseB) {
      const steps = this._morphSteps;
      const s1 = this._stepProgress(globalP, steps[0]);
      const s2 = this._stepProgress(globalP, steps[1]);
      const s3 = this._stepProgress(globalP, steps[2]);
      const s4 = this._stepProgress(globalP, steps[3]);
      const s5 = this._stepProgress(globalP, steps[4]);
      workCtx.save();
      workCtx.globalAlpha = Math.max(0, baseA * (1.1 - s1 * 0.8));
      workCtx.drawImage(this._canvasA, 0, 0);
      workCtx.restore();
      if (s1 > 0) {
        const scatterProgress = s1;
        const paths = [];
        for (let pi = 0; pi < 14; pi++) {
          const path = [];
          const seed = 1100 + pi * 31;
          const startX = W * (0.1 + _randProg(seed) * 0.8);
          const startY = H * (0.1 + _randProg(seed + 1) * 0.8);
          const centerX = W / 2;
          const centerY = H / 2;
          const dirX = startX - centerX;
          const dirY = startY - centerY;
          const dirLen = Math.hypot(dirX, dirY);
          const normX = dirX / Math.max(1, dirLen);
          const normY = dirY / Math.max(1, dirLen);
          for (let st = 0; st <= 40; st++) {
            const t = st / 40;
            const radiusOut = Math.max(W, H) * 0.8;
            const wobble = Math.sin(t * 9 + pi) * 22 * t;
            const wobbleX = -normY * wobble;
            const wobbleY = normX * wobble;
            const px = startX + normX * radiusOut * t + wobbleX;
            const py = startY + normY * radiusOut * t + wobbleY;
            path.push({ x: px, y: py });
          }
          paths.push(path);
        }
        _flowAlongImpl(workCtx, paths, scatterProgress, {
          intensity: this.intensity * (0.5 + scatterProgress * 0.5),
          seed: 1200, spread: 22, wander: 12, alphaScale: 0.85
        });
      }
      if (s2 > 0) {
        const flashProgress = s2;
        const flashK = Math.sin(flashProgress * Math.PI);
        workCtx.save();
        workCtx.globalAlpha = 0.12 * flashK * this.intensity;
        workCtx.fillStyle = 'rgba(60, 140, 200, 1)';
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
        const flashC = Math.floor(60 * flashK);
        for (let i = 0; i < flashC; i++) {
          const seed = 1300 + i * 17.5;
          const x = _randProg(seed) * W;
          const y = _randProg(seed + 1) * H;
          const a = (0.08 + _randProg(seed + 2) * 0.2) * flashK;
          if (a > 0) {
            workCtx.fillStyle = `rgba(100, 180, 240, ${a})`;
            workCtx.beginPath();
            workCtx.arc(x, y, 0.5 + _randProg(seed + 3) * 2.2, 0, Math.PI * 2);
            workCtx.fill();
          }
        }
      }
      if (s3 > 0 || s4 > 0) {
        const gatherP = Math.min(1, s3 * 0.7 + s4 * 0.4);
        workCtx.save();
        workCtx.globalAlpha = Math.max(0, (gatherP - 0.2) * 1.1);
        workCtx.drawImage(this._canvasB, 0, 0);
        workCtx.restore();
      }
      if (s3 > 0) {
        const gatherProgress = s3;
        const contourPaths = _extractBContour(this._canvasB, W, H);
        const gatherPaths = [];
        contourPaths.forEach((path, pi) => {
          if (path.length < 3) return;
          const newPath = [];
          for (let st = 0; st < path.length; st++) {
            const pt = path[st];
            const seed = 1400 + pi * 41 + st;
            const edges = [
              { x: pt.x, y: -20 }, { x: pt.x, y: H + 20 },
              { x: -20, y: pt.y }, { x: W + 20, y: pt.y }
            ];
            const nearest = edges[Math.floor(_randProg(seed) * edges.length)];
            const t = st / path.length;
            const k = gatherProgress;
            const px = nearest.x + (pt.x - nearest.x) * k;
            const py = nearest.y + (pt.y - nearest.y) * k;
            newPath.push({ x: px, y: py });
          }
          gatherPaths.push(newPath);
        });
        for (let pi = 0; pi < 18; pi++) {
          const seed = 1500 + pi * 23;
          const edge = Math.floor(_randProg(seed) * 4);
          const path = [];
          const frac = _randProg(seed + 1);
          let sx, sy;
          if (edge === 0) { sx = frac * W; sy = -20; }
          else if (edge === 1) { sx = frac * W; sy = H + 20; }
          else if (edge === 2) { sx = -20; sy = frac * H; }
          else { sx = W + 20; sy = frac * H; }
          const tx = W * (0.2 + _randProg(seed + 2) * 0.6);
          const ty = H * (0.2 + _randProg(seed + 3) * 0.6);
          for (let st = 0; st <= 30; st++) {
            const t = st / 30;
            const wobble = Math.sin(t * 7 + pi) * 18 * (1 - t);
            const px = sx + (tx - sx) * t + (_randProg(seed + 4 + st) - 0.5) * wobble;
            const py = sy + (ty - sy) * t + (_randProg(seed + 14 + st) - 0.5) * wobble;
            path.push({ x: px, y: py });
          }
          gatherPaths.push(path);
        }
        _flowAlongImpl(workCtx, gatherPaths, 1.0, {
          intensity: this.intensity * gatherProgress,
          seed: 1600, spread: 16, wander: 8, alphaScale: 0.9
        });
      }
      if (s4 > 0) {
        const dabProgress = s4;
        const contourPaths2 = _extractBContour(this._canvasB, W, H);
        contourPaths2.forEach((path, pi) => {
          const dabCount = Math.floor(path.length * 0.55 * dabProgress);
          for (let d = 0; d < dabCount; d++) {
            const idx = Math.floor((d / dabCount) * (path.length - 1));
            const pt = path[idx];
            _dabShapeImpl(workCtx, pt.x, pt.y, 32, 20, {
              density: 0.9, intensity: this.intensity * dabProgress,
              seed: 1700 + pi * 59 + d * 4.3, alphaScale: 0.85
            });
          }
        });
      }
      if (s5 > 0) {
        const breathProgress = s5;
        const breath = 0.98 + Math.sin(rawT * 1.5) * 0.02;
        workCtx.save();
        workCtx.globalAlpha = 0.04 * breathProgress * this.intensity;
        workCtx.fillStyle = `rgba(${Math.floor(12 * breath)},${Math.floor(105 * breath)},${Math.floor(148 * breath)},1)`;
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
        const shimmerC = Math.floor(45 * breathProgress);
        for (let i = 0; i < shimmerC; i++) {
          const seed = 1800 + i * 31.7 + rawT * 10;
          const x = _randProg(seed) * W;
          const y = _randProg(seed + 1) * H;
          const a = (0.04 + _randProg(seed + 2) * 0.13) * breathProgress * (0.5 + 0.5 * Math.sin(rawT * 2.6 + i));
          if (a > 0) {
            workCtx.fillStyle = `rgba(0, 128, 165, ${a})`;
            workCtx.beginPath();
            workCtx.arc(x, y, 0.3 + _randProg(seed + 3) * 1.4, 0, Math.PI * 2);
            workCtx.fill();
          }
        }
      }
    }

    _modeScratchReveal(workCtx, W, H, morphP, globalP, rawT, baseA, baseB) {
      const steps = this._morphSteps;
      const s1 = this._stepProgress(globalP, steps[0]);
      const s2 = this._stepProgress(globalP, steps[1]);
      const s3 = this._stepProgress(globalP, steps[2]);
      const s4 = this._stepProgress(globalP, steps[3]);
      workCtx.save();
      workCtx.globalAlpha = Math.max(0, baseA * (1.1 - s1 * 0.75));
      workCtx.drawImage(this._canvasA, 0, 0);
      workCtx.restore();
      const contourPaths = _extractBContour(this._canvasB, W, H);
      const revealP = Math.min(1, s1 * 0.55 + s2 * 0.35 + s3 * 0.3);
      if (revealP > 0.15) {
        workCtx.save();
        workCtx.globalAlpha = Math.min(1, (revealP - 0.15) * 1.2);
        workCtx.drawImage(this._canvasB, 0, 0);
        workCtx.restore();
      }
      if (s1 > 0) {
        const scratchProgress = s1;
        const centerOut = false;
        contourPaths.forEach((path, pi) => {
          if (path.length < 2) return;
          const visibleCount = Math.max(2, Math.floor(path.length * scratchProgress));
          for (let i = 0; i < visibleCount - 1; i++) {
            const p0 = path[i];
            const p1 = path[i + 1];
            const lineProgress = (i / visibleCount);
            const k = 0.5 + lineProgress * 0.5;
            _scratchLineImpl(workCtx, p0.x, p0.y, p1.x, p1.y, {
              width: 20, intensity: this.intensity * scratchProgress * k,
              seed: 2100 + pi * 41 + i * 7
            });
          }
        });
      }
      if (s2 > 0) {
        const duneProgress = s2;
        contourPaths.forEach((path, pi) => {
          const dabCount = Math.floor(path.length * 0.5 * duneProgress);
          for (let d = 0; d < dabCount; d++) {
            const idx = Math.floor((d / dabCount) * (path.length - 1));
            const pt = path[idx];
            _dabShapeImpl(workCtx, pt.x, pt.y, 26, 16, {
              density: 0.75, intensity: this.intensity * duneProgress,
              seed: 2300 + pi * 47 + d * 3.7, alphaScale: 0.9
            });
          }
        });
      }
      if (s3 > 0) {
        const fillProgress = s3;
        const ctxB = this._canvasB.getContext('2d');
        const imgData = ctxB.getImageData(0, 0, W, H).data;
        const fillSample = 28;
        const fillCount = Math.floor(200 * fillProgress);
        for (let i = 0; i < fillCount; i++) {
          const seed = 2500 + i * 11.9;
          const fx = Math.floor(_randProg(seed) * (W / fillSample)) * fillSample + fillSample / 2;
          const fy = Math.floor(_randProg(seed + 1) * (H / fillSample)) * fillSample + fillSample / 2;
          const idx = (Math.floor(fy) * W + Math.floor(fx)) * 4;
          const lum = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
          const a = imgData[idx + 3] / 255;
          if (a > 0.25 && lum > 30) {
            _pourImpl(workCtx, fx, fy, 34 + _randProg(seed + 2) * 26, {
              density: 0.6 + fillProgress * 0.4,
              intensity: this.intensity * fillProgress * (0.5 + lum / 255),
              seed: seed + 17, vertBias: 0.6
            });
          }
        }
      }
      if (s4 > 0) {
        const breathProgress = s4;
        const breath = 0.98 + Math.sin(rawT * 1.7) * 0.02;
        workCtx.save();
        workCtx.globalAlpha = 0.05 * breathProgress * this.intensity;
        workCtx.fillStyle = `rgba(${Math.floor(10 * breath)},${Math.floor(95 * breath)},${Math.floor(138 * breath)},1)`;
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
        const shimmerC = Math.floor(50 * breathProgress);
        for (let i = 0; i < shimmerC; i++) {
          const seed = 2700 + i * 25.1 + rawT * 11;
          const x = _randProg(seed) * W;
          const y = _randProg(seed + 1) * H;
          const a = (0.04 + _randProg(seed + 2) * 0.14) * breathProgress * (0.5 + 0.5 * Math.sin(rawT * 2.9 + i));
          if (a > 0) {
            workCtx.fillStyle = `rgba(0, 128, 165, ${a})`;
            workCtx.beginPath();
            workCtx.arc(x, y, 0.3 + _randProg(seed + 3) * 1.5, 0, Math.PI * 2);
            workCtx.fill();
          }
        }
      }
    }

    _modePourRewrite(workCtx, W, H, morphP, globalP, rawT, baseA, baseB) {
      const steps = this._morphSteps;
      const s1 = this._stepProgress(globalP, steps[0]);
      const s2 = this._stepProgress(globalP, steps[1]);
      const s3 = this._stepProgress(globalP, steps[2]);
      const s4 = this._stepProgress(globalP, steps[3]);
      const s5 = this._stepProgress(globalP, steps[4]);
      const s6 = this._stepProgress(globalP, steps[5]);
      workCtx.save();
      workCtx.globalAlpha = Math.max(0, baseA * (1.1 - s1 * 0.85));
      workCtx.drawImage(this._canvasA, 0, 0);
      workCtx.restore();
      if (s1 > 0) {
        const pourProgress = s1;
        const sandLineY = H * Math.min(1, pourProgress * 1.1);
        workCtx.save();
        workCtx.beginPath();
        workCtx.rect(0, sandLineY, W, H - sandLineY);
        workCtx.clip();
        workCtx.globalAlpha = 0.92 * pourProgress;
        workCtx.fillStyle = '#3a2d1a';
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
        const streamCount = 7;
        for (let ss = 0; ss < streamCount; ss++) {
          const sSeed = 3100 + ss * 73;
          const startX = W * (0.08 + ss / streamCount * 0.84) + (_randProg(sSeed) - 0.5) * 30;
          const steps2 = 28;
          for (let i = 0; i < steps2; i++) {
            const t = i / steps2;
            if (t > pourProgress) continue;
            const x = startX + Math.sin(t * 9 + ss) * 7 + (_randProg(sSeed + i) - 0.5) * 6;
            const y = t * H * 1.1 + t * t * H * 0.15 + (_randProg(sSeed + i + 11) - 0.5) * 5;
            const fade = Math.sin(t * Math.PI);
            for (let j = 0; j < 3; j++) {
              const px = x + (_randProg(sSeed + i * 5 + j) - 0.5) * 8;
              const py = y + (_randProg(sSeed + i * 5 + j + 9) - 0.5) * 5;
              const size = 0.5 + _randProg(sSeed + i * 5 + j + 17) * 2.2;
              const alpha = (0.15 + _randProg(sSeed + i * 5 + j + 25) * 0.28) * fade;
              workCtx.fillStyle = `rgba(165, 128, 75, ${alpha})`;
              workCtx.beginPath();
              workCtx.arc(px, py, size, 0, Math.PI * 2);
              workCtx.fill();
            }
          }
        }
        const pileCount = Math.floor(700 * pourProgress);
        for (let i = 0; i < pileCount; i++) {
          const seed = 3200 + i * 4.9;
          const ang = _randProg(seed) * Math.PI * 2;
          const dist = Math.pow(_randProg(seed + 1), 0.55) * Math.min(W, H) * 0.65;
          const x = W / 2 + Math.cos(ang) * dist + (_randProg(seed + 2) - 0.5) * 15;
          const targetY = H * 0.45 + sandLineY * 0.5;
          const y = Math.min(targetY, H * 0.7) + Math.sin(ang * 1.5) * 35 + (_randProg(seed + 3) - 0.5) * 12;
          if (y < sandLineY - 10) continue;
          const fade = 1 - dist / (Math.min(W, H) * 0.65) * 0.5;
          const alpha = (0.18 + _randProg(seed + 4) * 0.36) * fade * (0.5 + pourProgress * 0.5);
          const size = 0.6 + _randProg(seed + 5) * 2.8;
          workCtx.fillStyle = `rgba(158, 122, 70, ${alpha})`;
          workCtx.beginPath();
          workCtx.arc(x, y, size, 0, Math.PI * 2);
          workCtx.fill();
        }
      }
      const coverAlpha = s1 > 0.75 ? (s1 - 0.75) / 0.25 : 0;
      if (s2 > 0 || s3 > 0 || s4 > 0) {
        workCtx.save();
        workCtx.globalAlpha = Math.min(1, coverAlpha * 0.95);
        workCtx.fillStyle = '#352817';
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
      }
      if (s2 > 0) {
        const wp = s2;
        const palmX1 = -W * 0.1;
        const palmX2 = W * 1.1;
        const palmY = H * (0.35 + wp * 0.2);
        _wipeTrailImpl(workCtx, palmX1, palmY - 10, palmX2, palmY + 10, {
          width: W * 0.3, height: H * 0.55, seed: 3301, intensity: this.intensity * (0.6 + wp * 0.4)
        });
      }
      if (s3 > 0) {
        const wp = s3;
        const palmX1 = W * 1.1;
        const palmX2 = -W * 0.1;
        const palmY = H * (0.55 - wp * 0.2);
        _wipeTrailImpl(workCtx, palmX1, palmY - 8, palmX2, palmY + 8, {
          width: W * 0.26, height: H * 0.5, seed: 3302, intensity: this.intensity * (0.6 + wp * 0.4)
        });
      }
      if (s4 > 0) {
        const wp = s4;
        const palmX1 = W * 0.02;
        const palmX2 = W * 0.98;
        const palmY = H * 0.72;
        _wipeTrailImpl(workCtx, palmX1, palmY - 6, palmX2, palmY + 6, {
          width: W * 0.2, height: H * 0.28, seed: 3303, intensity: this.intensity * (0.5 + wp * 0.5)
        });
      }
      if (s5 > 0 || s6 > 0) {
        const drawP = Math.min(1, s5 * 0.8 + s6 * 0.3);
        workCtx.save();
        workCtx.globalAlpha = Math.min(1, drawP);
        workCtx.drawImage(this._canvasB, 0, 0);
        workCtx.restore();
      }
      if (s5 > 0) {
        const drawProgress = s5;
        const contourPaths = _extractBContour(this._canvasB, W, H);
        contourPaths.forEach((path, pi) => {
          if (path.length < 2) return;
          const visibleCount = Math.max(2, Math.floor(path.length * drawProgress));
          for (let i = 0; i < visibleCount - 1; i++) {
            const p0 = path[i];
            const p1 = path[i + 1];
            _scratchLineImpl(workCtx, p0.x, p0.y, p1.x, p1.y, {
              width: 17, intensity: this.intensity * drawProgress * (0.55 + (i / visibleCount) * 0.45),
              seed: 3400 + pi * 43 + i * 5
            });
          }
        });
        const ctxB = this._canvasB.getContext('2d');
        const imgData = ctxB.getImageData(0, 0, W, H).data;
        const fillSample = 34;
        const fillCount = Math.floor(140 * drawProgress);
        for (let i = 0; i < fillCount; i++) {
          const seed = 3500 + i * 15.1;
          const fx = Math.floor(_randProg(seed) * (W / fillSample)) * fillSample + fillSample / 2;
          const fy = Math.floor(_randProg(seed + 1) * (H / fillSample)) * fillSample + fillSample / 2;
          const idx = (Math.floor(fy) * W + Math.floor(fx)) * 4;
          const lum = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
          const a = imgData[idx + 3] / 255;
          if (a > 0.2 && lum > 30) {
            _pourImpl(workCtx, fx, fy, 32 + _randProg(seed + 2) * 22, {
              density: 0.5 + drawProgress * 0.5,
              intensity: this.intensity * drawProgress * (0.5 + lum / 255),
              seed: seed + 23, vertBias: 0.62
            });
          }
        }
      }
      if (s6 > 0) {
        const breathProgress = s6;
        const breath = 0.98 + Math.sin(rawT * 1.5) * 0.02;
        workCtx.save();
        workCtx.globalAlpha = 0.045 * breathProgress * this.intensity;
        workCtx.fillStyle = `rgba(${Math.floor(11 * breath)},${Math.floor(102 * breath)},${Math.floor(144 * breath)},1)`;
        workCtx.fillRect(0, 0, W, H);
        workCtx.restore();
        const shimmerC = Math.floor(42 * breathProgress);
        for (let i = 0; i < shimmerC; i++) {
          const seed = 3600 + i * 27.9 + rawT * 13;
          const x = _randProg(seed) * W;
          const y = _randProg(seed + 1) * H;
          const a = (0.04 + _randProg(seed + 2) * 0.12) * breathProgress * (0.5 + 0.5 * Math.sin(rawT * 2.7 + i));
          if (a > 0) {
            workCtx.fillStyle = `rgba(0, 128, 165, ${a})`;
            workCtx.beginPath();
            workCtx.arc(x, y, 0.3 + _randProg(seed + 3) * 1.3, 0, Math.PI * 2);
            workCtx.fill();
          }
        }
      }
    }
  }

  function scheduleProgressive(sequences, opts) {
    opts = opts || {};
    const DEFAULT_LT = opts.defaultLt || 0.93;
    const segments = [];
    let cursor = 0;
    const _morphInstances = new Map();
    sequences.forEach((seq, idx) => {
      if (seq.scene) {
        const dur = seq.duration || 5.0;
        segments.push({
          type: 'scene',
          idx,
          sceneKey: seq.scene,
          startT: cursor,
          endT: cursor + dur,
          duration: dur
        });
        cursor += dur;
      } else if (seq.morph) {
        const m = seq.morph;
        const dur = m.duration || 18.0;
        const prevSeg = segments.length > 0 ? segments[segments.length - 1] : null;
        const fromScene = m.from || (prevSeg && prevSeg.type === 'scene' ? prevSeg.sceneKey : null);
        const morphInst = new ProgressiveMorph({
          fromScene,
          toScene: m.to,
          duration: dur,
          mode: m.mode || 'wipe_palm_half',
          palette: m.palette || null,
          intensity: m.intensity != null ? m.intensity : 1.0,
          fps: opts.fps || 30
        });
        _morphInstances.set(idx, morphInst);
        segments.push({
          type: 'morph',
          idx,
          morphRef: idx,
          fromScene,
          toScene: m.to,
          startT: cursor,
          endT: cursor + dur,
          duration: dur
        });
        cursor += dur;
      }
    });
    const totalDuration = cursor;
    function findSegmentAt(t) {
      if (segments.length === 0) return null;
      if (t <= 0) return segments[0];
      if (t >= totalDuration) return segments[segments.length - 1];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (t >= seg.startT && t < seg.endT) return seg;
      }
      return segments[segments.length - 1];
    }
    function drawSceneToCtx(ctx, sceneKey, localT) {
      if (!sceneKey || !window.SCENES || !window.SCENES[sceneKey]) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        ctx.fillStyle = '#1a1408';
        ctx.fillRect(0, 0, W, H);
        return;
      }
      const scene = window.SCENES[sceneKey];
      try {
        if (typeof scene.draw === 'function') {
          scene.draw(ctx, DEFAULT_LT, localT);
        } else {
          const W = ctx.canvas.width;
          const H = ctx.canvas.height;
          ctx.fillStyle = '#1a1408';
          ctx.fillRect(0, 0, W, H);
        }
      } catch (e) {
        console.error('Progressive schedule scene draw error:', sceneKey, e);
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        ctx.fillStyle = '#1a1408';
        ctx.fillRect(0, 0, W, H);
      }
    }
    return {
      segments,
      totalDuration,
      findSegmentAt,
      renderAt(t, targetCtx) {
        const ctx = targetCtx || (typeof window !== 'undefined' && window.__sandCanvas ? window.__sandCanvas.getContext('2d') : null);
        if (!ctx) return;
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        const tClamped = Math.max(0, Math.min(totalDuration, t));
        const seg = findSegmentAt(tClamped);
        if (!seg) {
          ctx.fillStyle = '#1a1408';
          ctx.fillRect(0, 0, W, H);
          return;
        }
        const localT = tClamped - seg.startT;
        if (seg.type === 'scene') {
          drawSceneToCtx(ctx, seg.sceneKey, localT);
        } else if (seg.type === 'morph') {
          const morph = _morphInstances.get(seg.morphRef);
          if (morph) {
            morph.renderFrame(ctx, localT);
          } else {
            drawSceneToCtx(ctx, seg.toScene, localT);
          }
        }
      },
      getMorphInstance(segmentIdx) {
        return _morphInstances.get(segmentIdx);
      },
      motionEnergyAt(t) {
        const tClamped = Math.max(0, Math.min(totalDuration, t));
        const seg = findSegmentAt(tClamped);
        if (!seg) return 0;
        if (seg.type === 'morph') {
          const morph = _morphInstances.get(seg.morphRef);
          if (morph) {
            return morph.motionEnergy(tClamped - seg.startT);
          }
          return 0.5;
        }
        return 0.1;
      }
    };
  }

  function getWipePalmHalfDefault() {
    return {
      duration: 18.0,
      mode: 'wipe_palm_half',
      intensity: 1.0
    };
  }

  window.TRANSITIONS.ProgressiveMorph = ProgressiveMorph;
  window.TRANSITIONS.scheduleProgressive = scheduleProgressive;
  window.TRANSITIONS.getWipePalmHalfDefault = getWipePalmHalfDefault;
})();
