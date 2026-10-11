/* ============================================================================
 * 氛围与动效（只做观感，不参与任何游戏逻辑判断）
 * ----------------------------------------------------------------------------
 * 包含：
 *   ① 飘尘 / 光斑      —— 背景氛围
 *   ② 开局落位动画     —— 144 张牌从上层往下逐张落下
 *   ③ 消除粒子 + 闪白  —— 消三张时的反馈（三消游戏的灵魂）
 *   ④ 连消飘字         —— 「连消 ×3！」
 *   ⑤ 失败震屏 / 通关金色涟漪
 *   ⑥ 旅程进度条       —— 上海 → 西安，每消一组往前走一点
 *   ⑦ 音效开关按钮
 *
 * 【重要】这个文件里所有东西都是「锦上添花」：
 *   任何一个函数出错都不应该影响游戏能不能玩，所以调用处都做了存在性判断。
 * ==========================================================================*/
(function () {
  'use strict';

  var SND = window.XXYSound;

  /* ==========================================================================
   * ① 飘尘 / 光斑
   * ========================================================================*/
  function spawnDust() {
    var box = document.getElementById('atmos');
    if (!box) return;
    var n = 12;
    for (var i = 0; i < n; i++) {
      var d = document.createElement('div');
      d.className = 'dust';
      var size = 2 + Math.random() * 4.5;
      d.style.width = size.toFixed(1) + 'px';
      d.style.height = size.toFixed(1) + 'px';
      d.style.left = (Math.random() * 100).toFixed(1) + '%';
      d.style.top = (58 + Math.random() * 46).toFixed(1) + '%';   // 从下半部分往上飘
      d.style.animationDuration = (11 + Math.random() * 14).toFixed(1) + 's';
      d.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';  // 负延迟 → 一进来就已经在飘
      d.style.opacity = (0.18 + Math.random() * 0.3).toFixed(2);
      box.appendChild(d);
    }
  }

  /* ==========================================================================
   * ② 开局落位动画
   * ------------------------------------------------------------------------
   * 给每张牌设两个 CSS 变量：
   *   --drop-delay 出场顺序（按压牌顺序错开，总时长控制在 0.4 秒内）
   *   --drop-from  起始高度（层号越大 = 越靠上层 = 从越高的地方落下来）
   * 然后给 #stage 加 .dropping 触发动画。
   * ========================================================================*/
  function playDrop() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    var nodes = stage.children;
    if (!nodes.length) return;

    var step = Math.min(3.2, 400 / nodes.length);    // 144 张 → 每张 2.8ms，总计约 0.4s

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.classList || !el.classList.contains('tile')) continue;
      var level = Number(el.dataset.level || 1);
      el.style.setProperty('--drop-delay', (i * step).toFixed(1) + 'ms');
      el.style.setProperty('--drop-from', (-14 - level * 9) + 'px');
    }

    // 先摘掉再强行读一次布局，保证重开一局时动画能重新播（否则浏览器认为没变化）
    stage.classList.remove('dropping');
    void stage.offsetWidth;
    stage.classList.add('dropping');

    // 动画放完就把 class 摘掉，避免和后面的 transform（按压、消除）打架
    var total = nodes.length * step + 460;
    setTimeout(function () { stage.classList.remove('dropping'); }, total);
  }

  /* ==========================================================================
   * ③ 消除粒子
   * ------------------------------------------------------------------------
   * 在给定的屏幕坐标处炸开一小簇粒子。
   * 用 position: fixed + 独立 DOM，和牌堆布局完全解耦。
   * @param cx, cy  中心坐标（视口坐标）
   * @param color   主色（取物品本色）
   * ========================================================================*/
  function burstAt(cx, cy, color) {
    var n = 9;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('div');
      p.className = 'tile-particle';
      var size = 3 + Math.random() * 4;
      p.style.width = size.toFixed(1) + 'px';
      p.style.height = size.toFixed(1) + 'px';
      p.style.left = (cx - size / 2).toFixed(1) + 'px';
      p.style.top = (cy - size / 2).toFixed(1) + 'px';
      p.style.background = (Math.random() < 0.34) ? '#ffe9b0' : (color || '#e8d5a8');

      // 往四周飞：角度均匀分布 + 随机抖动，距离随机
      var ang = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      var dist = 26 + Math.random() * 34;
      p.style.setProperty('--px', (Math.cos(ang) * dist).toFixed(1) + 'px');
      p.style.setProperty('--py', (Math.sin(ang) * dist + 10).toFixed(1) + 'px');   // 稍微往下坠一点
      p.style.setProperty('--prot', (Math.random() * 360 - 180).toFixed(0) + 'deg');
      p.style.animationDuration = (0.48 + Math.random() * 0.26).toFixed(2) + 's';

      document.body.appendChild(p);
      (function (node) {
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 860);
      })(p);
    }
  }

  /* 消除时给牌本身加个「闪一下再缩掉」 */
  function blastNode(node) {
    if (!node || !node.classList) return;
    node.classList.add('clearing', 'blast');
  }

  /* ==========================================================================
   * ④ 连消飘字
   * ========================================================================*/
  function comboPop(text, cx, cy) {
    var el = document.createElement('div');
    el.className = 'combo-pop';
    el.textContent = text;
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    el.style.fontSize = '22px';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  }

  /* ==========================================================================
   * ⑤ 失败震屏 / 通关金色涟漪
   * ========================================================================*/
  function shake() {
    document.body.classList.add('shaking');
    setTimeout(function () { document.body.classList.remove('shaking'); }, 520);
  }
  function winFlash() {
    var el = document.createElement('div');
    el.className = 'win-flash';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  }

  /* ==========================================================================
   * ⑥ 旅程进度条：上海 → 西安
   * ------------------------------------------------------------------------
   * 进度 = 已经消掉的组数 / 总组数。
   * 小火车和进度线一起往右移；到 100% 时小火车"跳"一下表示抵达。
   * ========================================================================*/
  var journeyDone = false;
  function setJourney(clearedGroups, totalGroups) {
    var fill = document.getElementById('journeyFill');
    var train = document.getElementById('journeyTrain');
    var box = document.getElementById('journey');
    if (!fill || !train || !box) return;

    var total = Math.max(1, totalGroups || 1);
    var pct = Math.max(0, Math.min(100, (clearedGroups / total) * 100));

    /* 轨道两端各留 42px 给「上海 / 西安」两个站名（和 CSS 里的留白一致）。
     * 所以进度要映射到 [42px, 总宽-42px] 这段区间里，而不是 0~100%。 */
    var box = document.getElementById('journey');
    var boxW = box ? box.clientWidth : 0;
    var pad = 42;
    var usable = Math.max(40, boxW - pad * 2);
    var x = pad + usable * (pct / 100);

    if (boxW > 0) {
      fill.style.width = (x - pad).toFixed(1) + 'px';
      train.style.left = x.toFixed(1) + 'px';
    } else {
      // 还没量到宽度（比如首帧就调用）→ 退回百分比写法，至少方向是对的
      fill.style.width = pct.toFixed(2) + '%';
      train.style.left = pct.toFixed(2) + '%';
    }

    if (pct >= 100 && !journeyDone) {
      journeyDone = true;
      box.classList.add('arrived');
    }
  }
  function resetJourney() {
    journeyDone = false;
    var box = document.getElementById('journey');
    if (box) box.classList.remove('arrived');
    setJourney(0, 1);
  }

  /* ==========================================================================
   * ⑦ 音效开关按钮
   * ========================================================================*/
  function initSoundButton() {
    var btn = document.getElementById('soundBtn');
    if (!btn || !SND) return;
    function paint() {
      var on = SND.isEnabled();
      btn.textContent = on ? '\uD83D\uDD0A' : '\uD83D\uDD07';   // 🔊 / 🔇
      btn.classList.toggle('muted', !on);
      btn.title = on ? '音效：开（点击关闭）' : '音效：关（点击开启）';
    }
    paint();
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      SND.toggle();
      paint();
    });
  }

  /* ==========================================================================
   * ⑧ 第一次交互时解锁音频
   * ------------------------------------------------------------------------
   * 手机浏览器禁止网页自动出声，必须等用户点一下。
   * 所以这里挂一次性监听，任意一次点击/触摸就把 AudioContext 建起来。
   * ========================================================================*/
  function initAudioUnlock() {
    if (!SND) return;
    var fired = false;
    function once() {
      if (fired) return;
      fired = true;
      SND.unlock();
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('touchstart', once, true);
      document.removeEventListener('click', once, true);
    }
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('touchstart', once, true);
    document.addEventListener('click', once, true);
  }

  /* ==========================================================================
   * 对外接口
   * ========================================================================*/
  window.XXYFX = {
    init: function () {
      spawnDust();
      initSoundButton();
      initAudioUnlock();
      resetJourney();
    },
    playDrop: playDrop,
    burstAt: burstAt,
    blastNode: blastNode,
    comboPop: comboPop,
    shake: shake,
    winFlash: winFlash,
    setJourney: setJourney,
    resetJourney: resetJourney,
    sound: function () { return SND; }
  };
})();
