(() => {
  if (!window.SCENES) window.SCENES = {};
  if (!window.__PROGRESSIVE__) {
    window.__PROGRESSIVE__ = { schedule: null, current: null };
  }

  const BPM = 100;
  const SECONDS_PER_BEAT = 60 / BPM;
  const SECONDS_PER_EIGHTH = SECONDS_PER_BEAT / 2;
  const SECONDS_PER_QUARTER = SECONDS_PER_BEAT;
  const DEFAULT_LT = 0.93;
  const PUNCH_SCALE = 1.03;
  const PUNCH_DECAY = 8;

  function buildEraTimeline() {
    const eras = window.ERAS || [];
    let timeCursor = 0;
    const timeline = [];
    eras.forEach((era, idx) => {
      const durSeconds = era.eighths * SECONDS_PER_EIGHTH;
      const startT = timeCursor;
      const endT = startT + durSeconds;
      const transition = Object.assign({
        type: 't_pour_in',
        dur: 1.5,
        delay: 0,
        cx: null,
        cy: null,
        angle: null,
        direction: 'left_to_right'
      }, era.transition || {});
      timeline.push({
        idx,
        era,
        id: era.id,
        sceneKey: era.scene,
        startT,
        endT,
        durSeconds,
        transition,
        transStart: startT + (transition.delay || 0),
        transDur: transition.dur,
        counterLabel: era.counterLabel || null
      });
      timeCursor = endT;
    });
    return timeline;
  }

  let _timeline = null;
  let _totalDuration = 0;

  function getTimeline() {
    if (!_timeline) {
      _timeline = buildEraTimeline();
      if (_timeline.length > 0) {
        _totalDuration = _timeline[_timeline.length - 1].endT;
      }
    }
    return _timeline;
  }

  function findEraAt(t) {
    const tl = getTimeline();
    if (tl.length === 0) return null;
    if (t < 0) return tl[0];
    if (t >= _totalDuration) return tl[tl.length - 1];
    for (let i = 0; i < tl.length; i++) {
      if (t >= tl[i].startT && t < tl[i].endT) return tl[i];
    }
    return tl[tl.length - 1];
  }

  function computeBeatPunch(t) {
    const beat = t / SECONDS_PER_QUARTER;
    const frac = beat - Math.floor(beat);
    if (frac < 0.001 || frac > 0.999) return 1;
    const nearestBeat = Math.round(beat);
    const tDiff = Math.abs(t - nearestBeat * SECONDS_PER_QUARTER);
    if (tDiff < 0.18) {
      const decay = Math.exp(-tDiff * PUNCH_DECAY);
      return 1 + (PUNCH_SCALE - 1) * decay;
    }
    return 1;
  }

  function getEighthAndBeat(t) {
    const totalEighths = t / SECONDS_PER_EIGHTH;
    const eighthIdx = Math.floor(totalEighths);
    const eighthFrac = totalEighths - eighthIdx;
    const beatIdx = Math.floor(eighthIdx / 2);
    const beatEighth = eighthIdx % 2;
    const barIdx = Math.floor(beatIdx / 4);
    const beatInBar = beatIdx % 4;
    return {
      totalEighths,
      eighthIdx,
      eighthFrac,
      beatIdx,
      beatEighth,
      barIdx,
      beatInBar
    };
  }

  function _makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  let _offscreenPool = {};
  function getOffscreen(key, w, h) {
    if (!_offscreenPool[key] ||
        _offscreenPool[key].width !== w ||
        _offscreenPool[key].height !== h) {
      _offscreenPool[key] = _makeCanvas(w, h);
    }
    return _offscreenPool[key];
  }

  function drawSceneToCanvas(sceneKey, targetCanvas, t, lt) {
    if (!sceneKey || !window.SCENES[sceneKey]) {
      const ctx = targetCanvas.getContext('2d');
      ctx.fillStyle = '#1a1408';
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
      return;
    }
    const scene = window.SCENES[sceneKey];
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    try {
      scene.draw(ctx, lt, t);
    } catch (e) {
      console.error('Scene draw error:', sceneKey, e);
      ctx.fillStyle = '#1a1408';
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    }
  }

  function setProgressiveSchedule(arraySeq) {
    if (!window.TRANSITIONS || typeof window.TRANSITIONS.scheduleProgressive !== 'function') return null;
    const schedule = window.TRANSITIONS.scheduleProgressive(arraySeq, {});
    window.__PROGRESSIVE__.schedule = schedule;
    window.__PROGRESSIVE__.current = null;
    return schedule;
  }

  function renderFrame(t_seconds) {
    const canvas = window.__sandCanvas || (typeof document !== 'undefined' ? document.querySelector('canvas') : null);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    if (window.__PROGRESSIVE__ && window.__PROGRESSIVE__.schedule) {
      const schedule = window.__PROGRESSIVE__.schedule;
      schedule.renderAt(t_seconds, ctx);
      return;
    }

    const tl = getTimeline();
    if (tl.length === 0) {
      ctx.fillStyle = '#1a1408';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const t = Math.max(0, t_seconds);
    const era = findEraAt(t);
    const eraLocalT = t - era.startT;

    let prevEra = null;
    if (era.idx > 0) prevEra = tl[era.idx - 1];

    const inTransition = eraLocalT >= era.transStart &&
                          eraLocalT < era.transStart + era.transDur;
    let transProgress = 0;
    if (inTransition) {
      transProgress = (eraLocalT - era.transStart) / era.transDur;
      transProgress = Math.max(0, Math.min(1, transProgress));
    } else if (eraLocalT >= era.transStart + era.transDur) {
      transProgress = 1;
    }

    const punchScale = computeBeatPunch(t);

    ctx.save();
    if (punchScale !== 1) {
      const cx = W / 2;
      const cy = H / 2;
      ctx.translate(cx, cy);
      ctx.scale(punchScale, punchScale);
      ctx.translate(-cx, -cy);
    }

    const lt = DEFAULT_LT;

    if (inTransition && prevEra) {
      const oldCanvas = getOffscreen('old_' + era.idx, W, H);
      const newCanvas = getOffscreen('new_' + era.idx, W, H);
      drawSceneToCanvas(prevEra.sceneKey, oldCanvas, prevEra.startT + Math.max(0, prevEra.durSeconds - 0.01), lt);
      drawSceneToCanvas(era.sceneKey, newCanvas, t, lt);

      const transType = era.transition.type;
      const transFn = window.TRANSITIONS && window.TRANSITIONS[transType];
      if (transFn) {
        const opts = {};
        if (era.transition.cx != null) opts.cx = era.transition.cx;
        if (era.transition.cy != null) opts.cy = era.transition.cy;
        if (era.transition.angle != null) opts.angle = era.transition.angle;
        if (era.transition.direction) opts.direction = era.transition.direction;
        try {
          transFn(ctx, oldCanvas, newCanvas, transProgress, opts);
        } catch (e) {
          console.error('Transition error:', transType, e);
          ctx.drawImage(newCanvas, 0, 0);
        }
      } else {
        const alpha = transProgress;
        ctx.globalAlpha = 1 - alpha;
        ctx.drawImage(oldCanvas, 0, 0);
        ctx.globalAlpha = alpha;
        ctx.drawImage(newCanvas, 0, 0);
        ctx.globalAlpha = 1;
      }
    } else {
      const sceneCanvas = getOffscreen('cur_' + era.idx, W, H);
      drawSceneToCanvas(era.sceneKey, sceneCanvas, t, lt);
      ctx.drawImage(sceneCanvas, 0, 0);
    }

    ctx.restore();

    if (window.__showCounter !== false) {
      const info = getEighthAndBeat(t);
      const label = era.counterLabel;
      ctx.save();
      const padX = 20;
      const padY = 18;
      const fontSize = 15;
      ctx.font = `${fontSize}px "SF Mono", Monaco, Consolas, monospace`;
      ctx.textBaseline = 'top';

      const barStr = `${info.barIdx + 1}`;
      const beatStr = `${info.beatInBar + 1}`;
      const eighthStr = info.beatEighth === 0 ? '' : ' &';
      const counterText = `[${barStr}.${beatStr}${eighthStr}]`;
      const timeText = formatTime(t);
      const eraText = `${era.idx + 1}/${tl.length}`;

      const cw = ctx.measureText(counterText).width;
      const tw = ctx.measureText(timeText).width;
      const ew = ctx.measureText(eraText).width;
      const allW = cw + 18 + tw + 18 + ew + 20;
      const boxH = fontSize * 1.6 + 10;

      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, padX - 6, padY - 5, allW, boxH, 6);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 240, 200, 0.92)';
      ctx.fillText(counterText, padX, padY);
      ctx.fillStyle = 'rgba(210, 190, 150, 0.8)';
      ctx.fillText(timeText, padX + cw + 18, padY);
      ctx.fillStyle = 'rgba(180, 160, 130, 0.75)';
      ctx.fillText(eraText, padX + cw + 18 + tw + 18, padY);

      if (label) {
        const lblPadY = padY + boxH + 6;
        const lblW = ctx.measureText(label).width + 18;
        ctx.fillStyle = 'rgba(160, 120, 70, 0.55)';
        roundRect(ctx, padX - 6, lblPadY - 4, lblW, fontSize * 1.5 + 8, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(250, 235, 200, 0.95)';
        ctx.fillText(label, padX + 3, lblPadY);
      }

      if (inTransition) {
        const tPadX = W - padX - 180;
        const tText1 = `TRANS: ${era.transition.type.replace('t_', '')}`;
        const tText2 = `${(transProgress * 100).toFixed(0)}%`;
        const tw1 = ctx.measureText(tText1).width;
        const tw2 = ctx.measureText(tText2).width;
        const tBoxW = Math.max(tw1, tw2) + 20;
        ctx.fillStyle = 'rgba(90, 150, 90, 0.55)';
        roundRect(ctx, tPadX, padY - 5, tBoxW, boxH + fontSize * 1.3, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(230, 250, 220, 0.95)';
        ctx.fillText(tText1, tPadX + 10, padY);
        ctx.fillStyle = 'rgba(200, 240, 190, 0.9)';
        ctx.fillText(tText2, tPadX + 10, padY + fontSize * 1.35);
      }

      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t - Math.floor(t)) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  window.renderFrame = renderFrame;
  window.setProgressiveSchedule = setProgressiveSchedule;
  window.__sandEngine = {
    BPM,
    SECONDS_PER_EIGHTH,
    SECONDS_PER_QUARTER,
    getTimeline,
    findEraAt,
    computeBeatPunch,
    getEighthAndBeat,
    setProgressiveSchedule,
    get progressiveSchedule() {
      return (window.__PROGRESSIVE__ && window.__PROGRESSIVE__.schedule) ? window.__PROGRESSIVE__.schedule : null;
    },
    get totalDuration() {
      if (window.__PROGRESSIVE__ && window.__PROGRESSIVE__.schedule) {
        return window.__PROGRESSIVE__.schedule.totalDuration;
      }
      getTimeline();
      return _totalDuration;
    }
  };

  const isHeadless = typeof window !== 'undefined' && window.__sandHeadless === true;

  if (!isHeadless && typeof document !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
    let canvas = document.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 600;
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.borderRadius = '4px';
      canvas.style.boxShadow = '0 10px 40px rgba(0,0,0,0.4)';
      canvas.style.background = '#1a1408';
      const wrap = document.body ? document.body : document.documentElement;
      if (wrap) {
        const container = document.createElement('div');
        container.style.minHeight = '100vh';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.background = 'radial-gradient(ellipse at center, #2a1f12 0%, #0e0a05 70%)';
        container.style.padding = '24px';
        container.appendChild(canvas);
        const title = document.createElement('div');
        title.style.marginTop = '18px';
        title.style.fontFamily = '"SF Mono", Monaco, Consolas, monospace';
        title.style.fontSize = '13px';
        title.style.color = 'rgba(200, 175, 130, 0.7)';
        title.style.letterSpacing = '1px';
        title.textContent = 'SAND PAINTING ENGINE · 100 BPM';
        container.appendChild(title);
        wrap.appendChild(container);
      }
    }
    window.__sandCanvas = canvas;

    let startT = null;
    let lastFrameT = 0;
    function frame(ts) {
      if (startT == null) startT = ts;
      const elapsed = (ts - startT) / 1000;
      const tl = getTimeline();
      let loopT = elapsed;
      const progSched = (window.__PROGRESSIVE__ && window.__PROGRESSIVE__.schedule) ? window.__PROGRESSIVE__.schedule : null;
      const effDur = progSched ? progSched.totalDuration : _totalDuration;
      if (effDur > 0 && elapsed > effDur + 0.5) {
        startT = ts - (elapsed % effDur) * 1000;
        loopT = (ts - startT) / 1000;
      }
      renderFrame(loopT);
      lastFrameT = loopT;
      requestAnimationFrame(frame);
    }
    setTimeout(() => {
      requestAnimationFrame(frame);
    }, 50);
  }
})();
