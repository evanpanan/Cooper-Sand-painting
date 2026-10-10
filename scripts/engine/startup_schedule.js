window.STARTUP_DEMO = function() {
  return [
    { scene: 's03_germination_seed', duration: 8 },
    { morph: { to: 's04_first_order',            mode: 'wipe_palm_half',          duration: 14, intensity: 0.95 }},
    { scene: 's04_first_order',       duration: 4 },
    { morph: { to: 's05_hiring_team',          mode: 'wipe_palm_half',          duration: 14 }},
    { scene: 's05_hiring_team',       duration: 4 },
    { morph: { to: 's06_crisis_storm',         mode: 'flow_gather_scatter',     duration: 14, intensity: 0.9 }},
    { scene: 's06_crisis_storm',      duration: 4 },
    { morph: { to: 's07_funding_breakthrough', mode: 'scratch_reveal_slow',     duration: 14, intensity: 0.95 }},
    { scene: 's07_funding_breakthrough', duration: 4 },
    { morph: { to: 's08_brand_vision',        mode: 'pour_rewrite',             duration: 14 }},
    { scene: 's08_brand_vision',      duration: 10 },
  ];
};

// 8 + 14*5 + 4*4 + 10 = 8 + 70 + 16 + 10 = 104s (100~110s 创业题材最佳时长)
window.STARTUP_DEMO_TOTAL = 104;
