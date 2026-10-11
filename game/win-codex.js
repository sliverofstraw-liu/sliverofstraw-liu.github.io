/* ============================================================================
 * 通关页的图鉴模块
 * ----------------------------------------------------------------------------
 * 主游戏（game.js）里有同样的逻辑，但那是绑定在游戏状态上的。
 * 通关页是独立页面，所以这里用同一份数据（tile-story.js）重新渲染一遍。
 * 数据源只有一个，改文案仍然只需要改 tile-story.js。
 * ==========================================================================*/
(function () {
  'use strict';

  var TILES = [
    { id: 'suitcase', label: '行李箱', color: '#e8734a', img: null },
    { id: 'ticket', label: '火车票', color: '#4a90d9', img: null },
    { id: 'strawhat', label: '草帽', color: '#c9a227', img: null },
    { id: 'book', label: '讲义', color: '#5a8f5a', img: null },
    { id: 'device', label: '仪器', color: '#7a6bb5', img: null },
    { id: 'abacus', label: '算盘', color: '#b5563f', img: null },
    { id: 'badge', label: '校徽', color: '#3f6fb5', img: null },
    { id: 'photo', label: '老照片', color: '#8a8f98', img: null },
    { id: 'envelope', label: '家书', color: '#c96f8a', img: null },
    { id: 'lamp', label: '煤油灯', color: '#8a6b3f', img: null }
  ];

  var STORY = window.TILE_STORY || {};
  var STORE_KEY = 'xxy_knowledge_v1';

  function findCfg(id) {
    for (var i = 0; i < TILES.length; i++) if (TILES[i].id === id) return TILES[i];
    return null;
  }

  // 读本地解锁记录（和 game.js 用同一个 key）
  function loadKnown() {
    var got = {};
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return got;
      var arr = JSON.parse(raw);
      if (Object.prototype.toString.call(arr) === '[object Array]') {
        for (var i = 0; i < arr.length; i++) if (findCfg(arr[i])) got[arr[i]] = true;
      }
    } catch (e) { /* 存不了/坏了都当没解锁，不能因此报错 */ }
    return got;
  }

  function buildArt(cfg, locked) {
    var box = document.createElement('div');
    box.className = 'codex-art';
    if (locked) {
      box.style.background = '#b8b0a2';
      var q = document.createElement('span');
      q.className = 'art-label art-locked';
      q.textContent = '？';
      box.appendChild(q);
      return box;
    }
    if (cfg.img) {
      var img = document.createElement('img');
      img.src = cfg.img;
      img.alt = cfg.label;
      img.draggable = false;
      box.appendChild(img);
    } else {
      box.style.background = cfg.color;
      var s = document.createElement('span');
      s.className = 'art-label';
      s.textContent = cfg.label;
      box.appendChild(s);
    }
    return box;
  }

  var known = loadKnown();
  var els = {
    modal: document.getElementById('codexModal'),
    grid: document.getElementById('codexGrid'),
    sub: document.getElementById('codexSub'),
    close: document.getElementById('codexCloseBtn'),
    detail: document.getElementById('detailModal'),
    detailPic: document.getElementById('detailPic'),
    detailTitle: document.getElementById('detailTitle'),
    detailKnow: document.getElementById('detailKnowledge'),
    detailBody: document.getElementById('detailBody'),
    detailClose: document.getElementById('detailCloseBtn'),
    btn: document.getElementById('codexBtn2')
  };

  function countKnown() {
    var n = 0;
    for (var i = 0; i < TILES.length; i++) if (known[TILES[i].id]) n++;
    return n;
  }

  function renderGrid() {
    if (!els.grid) return;
    els.grid.innerHTML = '';
    var got = countKnown();
    if (els.sub) {
      els.sub.textContent = got === TILES.length
        ? '全部 ' + TILES.length + ' 件都解锁了 —— 西迁行囊完整收齐。'
        : '已解锁 ' + got + '/' + TILES.length + ' 件：消除 3 张相同物品即可解锁它的故事';
    }
    for (var i = 0; i < TILES.length; i++) {
      var cfg = TILES[i];
      var unlocked = !!known[cfg.id];
      var cell = document.createElement('div');
      cell.className = 'codex-cell' + (unlocked ? '' : ' locked');
      cell.appendChild(buildArt(cfg, !unlocked));
      var name = document.createElement('div');
      name.className = 'codex-name';
      name.textContent = unlocked ? cfg.label : '？';
      cell.appendChild(name);
      if (unlocked) {
        cell.addEventListener('click', function (id) {
          return function () { openDetail(id); };
        }(cfg.id));
      }
      els.grid.appendChild(cell);
    }
  }

  function openDetail(id) {
    if (!els.detail) return;
    var cfg = findCfg(id);
    var story = STORY[id] || {};
    if (!cfg || !known[id]) return;

    if (els.detailPic) {
      els.detailPic.innerHTML = '';
      var art = buildArt(cfg, false);
      art.className = 'detail-art';
      els.detailPic.appendChild(art);
    }
    if (els.detailTitle) els.detailTitle.textContent = cfg.label;
    if (els.detailKnow) els.detailKnow.textContent = story.knowledge || '';
    if (els.detailBody) {
      els.detailBody.textContent = (story.body || '') +
        (story.source ? '\n\n（' + story.source + '）' : '');
    }
    els.detail.classList.add('show');
  }

  function closeDetail() {
    if (els.detail) els.detail.classList.remove('show');
  }

  function openCodex() {
    renderGrid();
    if (els.modal) els.modal.classList.add('show');
  }

  function closeCodex() {
    if (els.modal) els.modal.classList.remove('show');
    closeDetail();
  }

  if (els.btn) els.btn.addEventListener('click', openCodex);
  if (els.close) els.close.addEventListener('click', closeCodex);
  if (els.detailClose) {
    els.detailClose.addEventListener('click', function () {
      closeDetail();
      if (els.modal) els.modal.classList.add('show');
    });
  }
  if (els.detail) {
    els.detail.addEventListener('click', function (e) {
      if (e.target === els.detail) {
        closeDetail();
        if (els.modal) els.modal.classList.add('show');
      }
    });
  }

  // 暴露给 win.js 用（通关页要显示「图鉴 3/10」）
  window.WinCodex = { count: countKnown, total: TILES.length };
})();
