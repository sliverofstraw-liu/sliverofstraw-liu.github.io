/* ============================================================================
 * 西迁行囊 · 统计配置（你只需要改这个文件）
 * ----------------------------------------------------------------------------
 * 后端是 Cloudflare Pages Functions + D1（免费），部署说明见 stats-backend/README.md
 *
 * 【三步搞定】
 *   1. 按 stats-backend/README.md 把后端部署到 Cloudflare Pages，
 *      拿到形如 https://xxxx.pages.dev 的地址
 *   2. 在那里给 Pages 项目设置环境变量 STATS_SECRET（一个随机字符串）
 *   3. 把下面 apiBase 和 secret 填成对应的值，adminPass 改成你的看板口令
 *
 * 【不想用了怎么办】
 *   把 apiBase 和 secret 留空，统计功能会自动关闭，游戏照常玩。
 *
 * 【安全说明】
 *   secret 会出现在网页源码里（前端无法隐藏），所以它只能挡住随手乱试，
 *   不能算真正的鉴权。表里只有计数、没有敏感信息，团日场景够用。
 * ==========================================================================*/
window.XXY_STATS_CONFIG = {
  apiBase: 'https://xxy-stats.pages.dev',   // ← 已部署好
  secret: 'xqxy-8f3a91c7b2e5',              // ← 和 Cloudflare 上的 STATS_SECRET 一致

  adminPass: 'xqxy2026',   // ← 数据看板的口令，记得改成你自己的

  debug: false             // 上线后关掉；调试时改成 true，控制台会打印每次上报
};
