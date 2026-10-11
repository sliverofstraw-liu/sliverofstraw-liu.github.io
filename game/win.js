/* ============================================================================
 * 通关页逻辑
 * ----------------------------------------------------------------------------
 * 做四件事：
 *   ① 铺满整屏的滚动名言（纯 CSS 动画驱动，这里只负责生成 DOM）
 *   ② 从后端读「已通关人数」，显示你是第几位
 *   ③ 显示本局成绩（图鉴 / 复活 / 难度档）
 *   ④ 按钮：再走一次 / 看图鉴
 *
 * 数据来源：
 *   · 本局成绩由 game.js 在通关时写进 sessionStorage（key: xxy_last_result）
 *   · 通关人数由后端 GET /stats-rank 实时查（去重后的设备数）
 * ==========================================================================*/
(function () {
  'use strict';

  var cfg = window.XXY_STATS_CONFIG || {};
  var API = (cfg.apiBase || '').replace(/\/+$/, '');
  var SECRET = cfg.secret || '';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- ① 滚动名言 ---------- */
  function buildQuotes() {
    var list = window.WIN_QUOTES || [];
    var track = $('quoteTrack');
    if (!track || !list.length) return;

    // 把名言拼成两份（首尾相接），这样滚动到第二份末尾时不会出现空白，
    // 配合 CSS 的 translateY(-50%) 就能无缝循环。
    var frag = document.createDocumentFragment();
    for (var copy = 0; copy < 2; copy++) {
      for (var i = 0; i < list.length; i++) {
        var q = list[i];
        var box = document.createElement('div');
        box.className = 'quote-item';

        var t = document.createElement('p');
        t.className = 'quote-text';
        t.textContent = q.text || '';
        box.appendChild(t);

        if (q.by) {
          var b = document.createElement('p');
          b.className = 'quote-by';
          b.textContent = '—— ' + q.by;
          box.appendChild(b);
        }
        frag.appendChild(box);
      }
    }
    track.appendChild(frag);

    // 滚一圈的时长按内容量算：越多滚越久，观感更稳
    var secs = Math.max(40, list.length * 7);
    track.style.animationDuration = secs + 's';
  }

  /* ---------- ② 通关人数 ---------- */
  function loadRank() {
    var numEl = $('rankNum');
    var subEl = $('rankSub');

    if (!API || !SECRET) {
      if (numEl) numEl.textContent = '—';
      if (subEl) subEl.textContent = '（统计未配置，看不到名次）';
      return;
    }

    fetch(API + '/stats-rank?secret=' + encodeURIComponent(SECRET))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (d) {
        var n = (d && typeof d.players === 'number') ? d.players : 0;
        if (numEl) numEl.textContent = String(n);
        if (subEl) {
          subEl.textContent = n <= 0
            ? '你是最早走完这条路的人之一'
            : '目前共有 ' + n + ' 位走完了这条路';
        }
      })
      .catch(function (err) {
        if (numEl) numEl.textContent = '—';
        if (subEl) subEl.textContent = '名次暂时读不到（网络或后端不可达）';
      });
  }

  /* ---------- ③ 本局成绩 ---------- */
  function loadResult() {
    var r = null;
    try {
      var raw = sessionStorage.getItem('xxy_last_result');
      if (raw) r = JSON.parse(raw);
    } catch (e) { /* 忽略 */ }

    // 图鉴进度：直接从本地读（即使没有本局成绩也能显示）
    var codexEl = $('stCodex');
    if (codexEl && window.WinCodex) {
      codexEl.textContent = window.WinCodex.count() + '/' + window.WinCodex.total;
    }

    if (r) {
      var rev = $('stRevive');
      if (rev) rev.textContent = (r.reviveUsed > 0) ? ('用了 ' + r.reviveUsed + ' 次') : '没用';

      var mode = $('stMode');
      if (mode) {
        mode.textContent = (r.mode === 'easy') ? '简单' : '难';
      }

      // 「没用复活」通关是很厉害的，单独夸一句
      var kicker = $('winKicker');
      if (kicker && r.reviveUsed === 0 && r.mode === 'hard') {
        kicker.textContent = '一次没卡住，你就到了';
      }
    }
  }

  /* ---------- ④ 按钮 ---------- */
  var again = $('againBtn');
  if (again) {
    again.addEventListener('click', function () {
      location.href = 'index.html';
    });
  }

  /* ---------- 启动 ---------- */
  buildQuotes();
  loadResult();
  loadRank();
})();
