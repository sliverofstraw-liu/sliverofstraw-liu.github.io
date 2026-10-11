/* ============================================================================
 * 西迁行囊 · 统计埋点（前端）
 * ----------------------------------------------------------------------------
 * 这个文件只管三件事：
 *   1. 攒事件：游戏里发生「打开 / 通关 / 复活 / 解锁图鉴」时调 track()
 *   2. 批量上报：攒几秒合并成一次请求发出去（省流量、也不容易触发限流）
 *   3. 失败不打扰：没网 / 没配置 / 被拒绝，都只在控制台记一句，绝不影响玩
 *
 * 【后端】Cloudflare Pages Functions + D1，部署说明见 stats-backend/DEPLOY.md
 *   上报：POST {apiBase}/stats-api
 *   读取：GET  {apiBase}/stats-api?secret=xxx（看板用）
 *
 * 【没配置会怎样】
 *   stats-config.js 里 apiBase 或 secret 留空 → 整个统计自动关闭，
 *   游戏照常玩，只在控制台打印记录。
 *
 * 【换后端要改哪里】
 *   只需要重写 sendBatch() —— 它负责把一批计数发出去。
 * ==========================================================================*/
(function (global) {
  'use strict';

  var STATS_CONFIG = {
    apiBase: '',
    secret: '',
    flushDelayMs: 8000,
    maxBatch: 40,
    debug: true
  };

  // 配置统一放在 stats-config.js 里（看板和上报共用一份，避免两处不一致）
  if (global.XXY_STATS_CONFIG) {
    var c = global.XXY_STATS_CONFIG;
    if (typeof c.apiBase === 'string') STATS_CONFIG.apiBase = c.apiBase.replace(/\/+$/, '');
    if (typeof c.secret === 'string') STATS_CONFIG.secret = c.secret;
    if (typeof c.debug === 'boolean') STATS_CONFIG.debug = c.debug;
  }

  // 允许上报的事件白名单 —— 和后端 functions/stats.js 里的保持一致
  var ALLOWED = {
    open: 1,        // 打开链接次数
    win: 1,         // 通关次数
    revive: 1,      // 复活次数
    codex: 1,       // 图鉴解锁次数
    lose: 1         // 失败次数（顺手记，看流失在哪一步）
  };

  var queue = {};        // { 事件名: 次数 }
  var timer = null;
  var sending = false;
  var started = false;
  var deviceId = '';

  function enabled() {
    return !!(STATS_CONFIG.apiBase && STATS_CONFIG.secret);
  }

  function log() {
    if (STATS_CONFIG.debug && global.console) {
      var a = Array.prototype.slice.call(arguments);
      a.unshift('[统计]');
      console.log.apply(console, a);
    }
  }

  /* 每台设备一个随机 id（存在 localStorage）。
   * 用途：后台能区分「多少人玩」和「一个人玩了多少次」。
   * 存不了就退化成固定值，不影响上报。 */
  function getDeviceId() {
    if (deviceId) return deviceId;
    try {
      var k = 'xxy_device_id';
      var v = localStorage.getItem(k);
      if (!v) {
        v = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(k, v);
      }
      deviceId = v;
    } catch (e) {
      deviceId = 'anon';
    }
    return deviceId;
  }

  /* ---------- 上报一批 ---------- */
  function sendBatch(payload) {
    // 用 fetch 而不是 SDK：少一个依赖、也不需要打包工具
    return fetch(STATS_CONFIG.apiBase + '/stats-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Shared-Secret': STATS_CONFIG.secret
      },
      body: JSON.stringify(payload),
      keepalive: true        // 页面正在关闭时也能把数据发出去
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      log('上报成功', payload);
      return true;
    });
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!enabled()) { queue = {}; return; }

    var rows = [];
    for (var k in queue) {
      if (!queue[k]) continue;
      rows.push({ event: k, count: queue[k], device_id: getDeviceId() });
    }
    if (!rows.length) return;

    queue = {};                      // 先清空，失败也不重试堆积（避免越积越多）
    if (sending) { log('上一次还没发完，这批丢弃'); return; }
    sending = true;
    sendBatch(rows).catch(function (err) {
      log('上报失败（不影响游戏）', String(err));
    }).then(function () {
      sending = false;
    });
  }

  function schedule() {
    if (timer) return;
    timer = setTimeout(flush, STATS_CONFIG.flushDelayMs);
  }

  /* ---------- 对外唯一入口 ---------- */
  function track(event, times) {
    if (!ALLOWED[event]) { log('未在白名单里，忽略：' + event); return; }
    var n = times || 1;
    queue[event] = (queue[event] || 0) + n;
    log('记录 ' + event + ' ×' + n, queue);
    if (!enabled()) return;          // 没配后端就只留在内存里，控制台能看到
    var total = 0;
    for (var k in queue) total += queue[k];
    if (total >= STATS_CONFIG.maxBatch) flush();
    else schedule();
  }

  function init() {
    if (started) return;
    started = true;
    log(enabled() ? '统计已启用' : '统计未配置后端（stats-config.js 里 apiBase/secret 是空的），只记控制台');
    // 页面被关掉 / 切到后台时，尽量把剩下的发出去
    global.addEventListener('pagehide', flush);
    global.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  global.XXYStats = {
    init: init,
    track: track,
    flush: flush,
    isEnabled: enabled,
    config: STATS_CONFIG
  };
})(typeof window !== 'undefined' ? window : this);
