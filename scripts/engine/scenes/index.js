(() => {
  if (!window.SCENES) window.SCENES = {};

  function _emptyPlaceholder(name, styleName) {
    return {
      meta: { name: name || '占位场景', style: styleName || 'placeholder' },
      draw(c, lt, t) {
        const W = c.canvas.width;
        const H = c.canvas.height;
        c.fillStyle = '#1a1408';
        c.fillRect(0, 0, W, H);
      }
    };
  }

  if (!window.SCENES['s01_classic']) {
    window.SCENES['s01_classic'] = _emptyPlaceholder('s01_classic', 'realistic_cool');
  }

  if (!window.SCENES['s02_flow_mountain']) {
    window.SCENES['s02_flow_mountain'] = _emptyPlaceholder('s02_flow_mountain', 'realistic_cool');
  }

  if (!window.SCENES['s03_river']) {
    window.SCENES['s03_river'] = _emptyPlaceholder('s03_river', 'placeholder');
  }

  if (!window.SCENES['s04_sunset']) {
    window.SCENES['s04_sunset'] = _emptyPlaceholder('s04_sunset', 'placeholder');
  }

  if (!window.SCENES['s05_ending']) {
    window.SCENES['s05_ending'] = _emptyPlaceholder('s05_ending', 'placeholder');
  }

  if (!window.SCENES['s06_extra']) {
    window.SCENES['s06_extra'] = _emptyPlaceholder('s06_extra', 'placeholder');
  }

  window.SCENES.__INDEX = {
    registered: Object.keys(window.SCENES).filter(k => !k.startsWith('__')),
    hasDraw: function(key) {
      if (!window.SCENES[key]) return false;
      return typeof window.SCENES[key].draw === 'function';
    }
  };
})();
