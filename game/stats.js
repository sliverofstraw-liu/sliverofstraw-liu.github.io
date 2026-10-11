/* ============================================================================
 * 西迁行囊 · 数据统计（前端埋点 + 免费后端上报）
 * ----------------------------------------------------------------------------
 * 这个文件只管三件事：
 *   1. 攒事件：游戏里发生「打开 / 通关 / 复活 / 解锁图鉴」时调 track()
 *   2. 批量上报：攒一小会儿合并成一次请求发出去（省流量、也不容易触发限流）
 *   3. 失败不打扰：没网 / 没配置 / 被拒绝，都只是控制台记一句，绝不影响玩
 *
 * 【后端怎么配】
 *   STATS_CONFIG 里的 url 和 anonKey 留空时，整个统计功能自动关闭（游戏照常玩）。
 *   去 supabase.com 免费注册一个项目，把两个值填进来就生效了。
 *   anonKey 是「公开密钥」，本来就设计成放在前端的，不算泄密；
 *   真正的保护在数据库的行级安全策略（RLS）上，见 README 里的 SQL。
 *   ⚠️ 千万别把 service_role key 填进来，那个是管理员密钥。
 *
 * 【换后端要改哪里】
 *   只需要重写 sendBatch() 一个函数 —— 它负责把一批计数发出去。
 *   换成别的服务（自己的服务器、Firebase、Cloudflare Worker）都只动它。
 * ==========================================================================*/
(function (global) {
  'use strict';

  var STATS_CONFIG = {
    url: '',
    anonKey: '',
    table: 'stats_events',
    flushDelayMs: 8000,
    maxBatch: 40,
    debug: true
  };

  // 配置统一放在 stats-config.js 里（看板和上报共用一份，避免两处不一致）
  if (global.XXY_STATS_CONFIG) {
    var c = global.XXY_STATS_CONFIG;
    if (typeof c.url === 'string') STATS_CONFIG.url = c.url.replace(/\/+$/, '');
    if (typeof c.anonKey === 'string') STATS_CONFIG.anonKey = c.anonKey;
    if (typeof c.table === 'string' && c.table) STATS_CONFIG.table = c.table;
    if (typeof c.debug === 'boolean') STATS_CONFIG.debug = c.debug;
  }

  // 允许上报的事件白名单 —— 防止代码被人乱改后往数据库里塞奇怪的东西
  var ALLOWED = {
    open: 1,        // 打开链接次数
    win: 1,         // 通关次数
    revive: 1,      // 复活次数
    codex: 1,       // 图鉴解锁次数
    lose: 1         // 失败次数（顺手记一下，看流失在哪一步）
  };

  var queue = {};        // { 事件名: 次数 }
  var timer = null;
  var sending = false;
  var started = false;
  var deviceId = '';

  function enabled() {
    return !!(STATS_CONFIG.url && STATS_CONFIG.anonKey);
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
   * 存不了就退化成空字符串，不影响上报。 */
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
    return fetch(STATS_CONFIG.url + '/rest/v1/' + STATS_CONFIG.table, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': STATS_CONFIG.anonKey,
        'Authorization': 'Bearer ' + STATS_CONFIG.anonKey,
        'Prefer': 'return=minimal'
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
      rows.push({
        event: k,
        count: queue[k],
        device_id: getDeviceId(),
        created_at: new Date().toISOString()
      });
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
    log(enabled() ? '统计已启用' : '统计未配置后端（STATS_CONFIG 里的 url/anonKey 是空的），只记控制台');
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
