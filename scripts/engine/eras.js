(() => {
  window.ERAS = [
    {
      id: 'era_01_opening',
      eighths: 32,
      scene: 's01_classic',
      transition: {
        type: 't_light_table',
        dur: 2.4,
        delay: 0
      },
      counterLabel: '开场 · 灯光亮起'
    },
    {
      id: 'era_02_flower',
      eighths: 24,
      scene: 's02_mountain',
      transition: {
        type: 't_pour_in',
        dur: 1.8,
        delay: 0,
        cx: null,
        cy: null
      },
      counterLabel: '花瓣 · 倾泻而入'
    },
    {
      id: 'era_03_river',
      eighths: 32,
      scene: 's03_river',
      transition: {
        type: 't_finger_draw',
        dur: 2.0,
        delay: 0,
        cx: 160,
        cy: 520,
        angle: -0.55
      },
      counterLabel: '河流 · 指尖划开'
    },
    {
      id: 'era_04_sunset',
      eighths: 24,
      scene: 's04_sunset',
      transition: {
        type: 't_wipe_palm',
        dur: 1.6,
        delay: 0,
        direction: 'left_to_right'
      },
      counterLabel: '落日 · 掌心横扫'
    },
    {
      id: 'era_05_ending',
      eighths: 40,
      scene: 's05_ending',
      transition: {
        type: 't_scatter_wind',
        dur: 2.2,
        delay: 0
      },
      counterLabel: '消散 · 风吹沙散'
    }
  ];
})();
