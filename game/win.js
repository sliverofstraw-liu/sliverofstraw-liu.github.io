/* ============================================================================
 * 通关页逻辑（精简版）
 * ----------------------------------------------------------------------------
 * 这一页只做三件事：
 *   ① 铺满整屏的滚动名言（纯 CSS 动画驱动，这里只负责生成 DOM）
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

  /* ---------- ① 滚动名言 ---------- */
  function buildQuotes() {
    var list = window.WIN_QUOTES || [];
    var track = $('quoteTrack');
    if (!track || !list.length) return;

    // 名言池复制两份、首尾相接：轨道高度 = 2 × 一份内容。
    // CSS 动画从 0 平移到 -50%（正好一份的高度），
    // 此时画面和第二份起点完全重合 → 无缝循环，不会出现空白。
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

    // 滚一圈的时长按内容量算：名言越多滚越久，观感更稳
    var secs = Math.max(40, list.length * 7);
    track.style.animationDuration = secs + 's';
  }

  /* ---------- ② 通关人数 ---------- */
  function loadRank() {
    var numEl = $('rankNum');
    if (!numEl) return;

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
  buildQuotes();
  loadRank();
})();
