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
})();
