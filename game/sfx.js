/* ============================================================================
 * 音效引擎（主游戏和通关页共用）
 * ----------------------------------------------------------------------------
 * 【为什么不用音频文件】
 *   ① 不增加任何下载体积（整个游戏依然是纯文本 + 一张班徽）
 *   ② 不受 file:// 的跨域限制，双击 html 也能出声
 *   ③ 想调音色只改代码里的数值，不用重新找素材
 *
 * 【浏览器限制】
 *   手机浏览器不允许网页"自动"出声，必须在用户第一次点击/触摸之后
 *   才能创建或恢复 AudioContext。所以这里：
 *     · 不在加载时创建，而是在第一次交互时 unlock()
 *     · 之后全程复用同一个 AudioContext（每次新建会很快耗尽资源）
 *
 * 【开关】
 *   默认开启；状态存在 localStorage 的 xxy_sound（'1' / '0'）。
 *   右上角小喇叭按钮可以随时切换。
 * ==========================================================================*/
(function () {
  'use strict';

  var STORE_KEY = 'xxy_sound';
  var ctx = null;
  var master = null;
  var enabled = true;

  // 读上次的选择（默认开启）
  try {
    var saved = localStorage.getItem(STORE_KEY);
    if (saved === '0') enabled = false;
  } catch (e) { /* 隐私模式下读不到，就用默认值 */ }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;                       // 老浏览器不支持就静默降级
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.28;                 // 总音量：偏轻，不吵
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  /* 通用发声：一个振荡器 + 一条音量包络（做出"敲击/清脆"的听感）
   * @param freq  频率（Hz）
   * @param dur   持续秒数
   * @param type  波形：'sine' 圆润 / 'triangle' 清亮 / 'square' 硬 / 'sawtooth' 糙
   * @param vol   音量倍数
   * @param slide 结束时的频率（做滑音用，可省）
   */
  function tone(freq, dur, type, vol, slide) {
    if (!enabled || !ctx) return;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    // 快起慢落的包络：起音 8ms，然后指数衰减 —— 像敲了一下
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((vol || 1) * 0.9, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* 噪声脉冲：给"消掉"那一下加点"沙"的质感 */
  function noise(dur, vol, freq) {
    if (!enabled || !ctx) return;
    var t0 = ctx.currentTime;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq || 1400;
    bp.Q.value = 0.9;
    var g = ctx.createGain();
    g.gain.value = (vol || 0.5);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t0);
  }

  var API = {
    /* 第一次交互时调用：创建/恢复 AudioContext */
    unlock: function () {
      var c = ensureCtx();
      if (!c) return;
      if (c.state === 'suspended' && c.resume) c.resume();
    },
    isEnabled: function () { return enabled; },
    /* 切换开关，返回切换后的状态 */
    toggle: function () {
      enabled = !enabled;
      try { localStorage.setItem(STORE_KEY, enabled ? '1' : '0'); } catch (e) {}
      if (enabled) {
        API.unlock();
        API.click();                 // 开的时候响一下，让人知道生效了
      }
      return enabled;
    },
    /* 点一张牌：短促的"嗒"，带一点点下滑音，像木片相碰 */
    click: function () { tone(760, 0.055, 'triangle', 0.45, 520); },
    /* 牌进入卡槽：比点击低一档的"咚"，两声区分开 */
    slot: function () { tone(420, 0.09, 'sine', 0.55, 330); },
    /* 消掉三张：清亮的"叮"，音高随连消次数升高（越连越爽） */
    clear: function (comboIndex) {
      var step = Math.min(comboIndex || 0, 6);
      var base = 880 * Math.pow(1.1225, step);      // 每级升约 2 个半音
      tone(base, 0.16, 'triangle', 0.6, base * 1.5);
      tone(base * 1.5, 0.13, 'sine', 0.32);         // 加一个高八度泛音，更"亮"
      noise(0.13, 0.30, 2200);                      // 一点沙沙的碎裂感
    },
    /* 失败：一记低沉的钝响，往下滑 */
    lose: function () {
      tone(180, 0.42, 'sawtooth', 0.34, 78);
      tone(120, 0.5, 'sine', 0.28, 60);
    },
    /* 复活：上行的两音，给人"翻盘"的感觉 */
    revive: function () {
      tone(520, 0.12, 'triangle', 0.5);
      setTimeout(function () { tone(780, 0.18, 'triangle', 0.55); }, 110);
    },
    /* 通关：四音上行 + 一记汽笛感的长音 */
    win: function () {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.24, 'triangle', 0.6); }, i * 115);
      });
      setTimeout(function () {
        tone(320, 0.85, 'sawtooth', 0.20, 560);     // 汽笛：往上拉长
        tone(640, 0.85, 'sine', 0.13, 1120);
        noise(0.5, 0.12, 700);
      }, 470);
    }
  };

  window.XXYSound = API;
})();
