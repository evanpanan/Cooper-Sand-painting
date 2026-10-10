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

  if (!window.SCENES['s03_germination_seed']) {
    window.SCENES['s03_germination_seed'] = window.SCENES.s03_germination_seed || _emptyPlaceholder('s03_germination_seed', 'realistic_cool');
  }

  if (!window.SCENES['s04_first_order']) {
    window.SCENES['s04_first_order'] = window.SCENES.s04_first_order || _emptyPlaceholder('s04_first_order', 'realistic_cool');
  }

  if (!window.SCENES['s05_hiring_team']) {
    window.SCENES['s05_hiring_team'] = window.SCENES.s05_hiring_team || _emptyPlaceholder('s05_hiring_team', 'realistic_cool');
  }

  if (!window.SCENES['s06_crisis_storm']) {
    window.SCENES['s06_crisis_storm'] = window.SCENES.s06_crisis_storm || _emptyPlaceholder('s06_crisis_storm', 'realistic_cool');
  }

  if (!window.SCENES['s07_funding_breakthrough']) {
    window.SCENES['s07_funding_breakthrough'] = window.SCENES.s07_funding_breakthrough || _emptyPlaceholder('s07_funding_breakthrough', 'realistic_cool');
  }

  if (!window.SCENES['s08_brand_vision']) {
    window.SCENES['s08_brand_vision'] = window.SCENES.s08_brand_vision || _emptyPlaceholder('s08_brand_vision', 'realistic_cool');
  }

  window.SCENES.__INDEX = {
    registered: Object.keys(window.SCENES).filter(k => !k.startsWith('__')),
    hasDraw: function(key) {
      if (!window.SCENES[key]) return false;
      return typeof window.SCENES[key].draw === 'function';
    }
  };
})();
