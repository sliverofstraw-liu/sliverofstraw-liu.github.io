/* ============================================================================
 * 通关页逻辑
 * ----------------------------------------------------------------------------
 * 这一页做三件事：
 *   ① 让名言像弹幕一样飞过（从左往右，只飞一次，大小不一）
 *   ② 从后端读「已通关人数」，显示你是第几位
 *   ③ 「再走一次」按钮
 *
 * 刻意不放的东西（保持简洁）：本局成绩、图鉴入口、页脚文案、标题。
 * 通关人数由后端 GET /stats-rank 实时查，口径是【去重后的通关设备数】。
 * ==========================================================================*/
(function () {
  'use strict';

  var cfg = window.XXY_STATS_CONFIG || {};
  var API = (cfg.apiBase || '').replace(/\/+$/, '');
  var SECRET = cfg.secret || '';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- ① 弹幕式名言 ----------
   * 和滚动列表的区别：这里每条名言是【独立一条弹幕】，
   * 各自有随机的垂直位置、字号、速度、出发时间，
   * 从左往右飞过一次就停在屏幕外（不循环）——
   * 所以整屏会陆陆续续飞过一批，像弹幕一样热闹，而不是一条竖列慢慢滚。
   * ------------------------------------------------------------------------ */
  function buildDanmu() {
    var stage = $('quoteStage');
    var list = window.WIN_QUOTES || [];
    if (!stage || !list.length) return;

    // 字号档位：不统一，三条一循环，制造疏密节奏
    var sizes = [15, 23, 18, 28, 16, 21, 26, 17, 20];
    // 速度档位（秒）：快的先飞完，慢的后到，层次感更强
    var speeds = [9, 13, 7.5, 15, 11, 17, 10, 14, 8.5];

    var frag = document.createDocumentFragment();
    var n = list.length;

    for (var i = 0; i < n; i++) {
      var q = list[i];

      var el = document.createElement('div');
      el.className = 'danmu';

      // 垂直位置：把整屏高度均匀分给 n 条，再加一点随机抖动，避免排成整齐的队
      var lane = (i + 0.5) / n;
      var topPct = lane * 88 + (Math.random() * 4 - 2);   // 4%~92% 之间
      topPct = Math.max(3, Math.min(93, topPct));

      // 出发时间：前后错开，让弹幕一波波飞，而不是齐射
      var delay = i * (18 / n) + Math.random() * 0.8;

      el.style.top = topPct.toFixed(2) + '%';
      el.style.fontSize = sizes[i % sizes.length] + 'px';
      el.style.animationDuration = speeds[i % speeds.length] + 's';
      el.style.animationDelay = delay.toFixed(2) + 's';

      var t = document.createElement('span');
      t.className = 'danmu-text';
      t.textContent = q.text || '';
      el.appendChild(t);

      if (q.by) {
        var b = document.createElement('span');
        b.className = 'danmu-by';
        b.textContent = '—— ' + q.by;
        el.appendChild(b);
      }

      frag.appendChild(el);
    }
    stage.appendChild(frag);
  }

  /* ---------- ② 通关人数 ---------- */
  function loadRank() {
    var numEl = $('rankNum');
    if (!numEl) return;

    /* 测试通道可能带了一个固定名次（?test=win&rank=7），
     * 那就直接用它，不去查后端 —— 方便演示 / 调试。 */
    var forced = null;
    try {
      forced = sessionStorage.getItem('xxy_test_rank');
      if (forced !== null) sessionStorage.removeItem('xxy_test_rank');   // 只用一次
    } catch (e) { /* 忽略 */ }
    if (forced !== null && forced !== '') {
      numEl.textContent = forced;
      return;
    }

    // 没配后端就保持占位符，不打扰用户
    if (!API || !SECRET) {
      numEl.textContent = '—';
      return;
    }

    fetch(API + '/stats-rank?secret=' + encodeURIComponent(SECRET))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (d) {
        var n = (d && typeof d.players === 'number') ? d.players : 0;
        numEl.textContent = String(n);
      })
      .catch(function () {
        // 网络或后端不可达：保留占位符，不弹任何错误信息
        numEl.textContent = '—';
      });
  }

  /* ---------- ③ 按钮 ---------- */
  var again = $('againBtn');
  if (again) {
    again.addEventListener('click', function () {
      location.href = 'index.html';
    });
  }

  /* ---------- 启动 ---------- */
  buildDanmu();
  loadRank();
  cheongsamWinSound();

  /* 通关页的「胜利音」。
   * 主游戏在跳转前已经放过一段上行音阶 + 汽笛了，这里再放一次会不会重复？
   * 不会 —— 主游戏那段是为了"跳转前留个记忆点"，而这一页是玩家真正看到
   * 名次的时刻，配一段更完整的胜利音更合适。
   * 注意：手机浏览器禁止自动出声，所以如果 AudioContext 还没解锁，
   * 会在玩家第一次点屏幕时补放（下面的 unlock 监听）。 */
  function cheongsamWinSound() {
    var s = window.XXYSound;
    if (!s) return;
    if (!s.isEnabled()) return;         // 玩家关掉了音效就一声不响
    try {
      s.unlock();
      s.win();
    } catch (e) { /* 忽略 */ }
  }
})();
