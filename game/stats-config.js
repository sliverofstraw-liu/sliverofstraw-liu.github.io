/* ============================================================================
 * 西迁行囊 · 统计配置（你只需要改这个文件）
 * ----------------------------------------------------------------------------
 * 【怎么开通】
 *   1. 打开 https://supabase.com ，用邮箱注册（免费，不用信用卡）
 *   2. 新建一个项目（Project），区域随便选，等它初始化好
 *   3. 左侧「SQL Editor」→ 粘贴下面这段 SQL → Run
 *      （在数据库里建一张计数表 + 打开行级安全策略）
 *
 *      create table if not exists stats_events (
 *        id          bigserial primary key,
 *        event       text        not null,
 *        count       int         not null default 1,
 *        device_id   text,
 *        created_at  timestamptz not null default now()
 *      );
 *      alter table stats_events enable row level security;
 *      -- 只允许「新增」，不允许改和删：前端拿到的密钥再泄露也改不了旧数据
 *      create policy "anon can insert" on stats_events
 *        for insert to anon with check (true);
 *      -- 允许读取（看板要用）
 *      create policy "anon can read" on stats_events
 *        for select to anon using (true);
 *      create index if not exists stats_events_created_idx
 *        on stats_events (created_at desc);
 *
 *   4. 左侧「Project Settings」→「API」，复制两个值填到下面：
 *        Project URL        → url
 *        anon public key    → anonKey
 *   5. 顺手把 adminPass 改成一个只有你知道的口令（看板入口用）
 *
 * 【安全说明】
 *   anonKey 是 Supabase 设计成「可以公开放在前端」的密钥，
 *   真正的保护在数据库的 RLS 策略上（上面 SQL 里那两条）：
 *   匿名用户只能新增和读取，改不了也删不掉已有数据。
 *   ⚠️ 绝对不要把 service_role key 填进来 —— 那个等于管理员密码。
 *
 * 【不想开了怎么办】
 *   把 url 和 anonKey 留空，统计功能会自动关闭，游戏照常玩。
 * ==========================================================================*/
window.XXY_STATS_CONFIG = {
  url: '',           // 例：'https://abcdefgh.supabase.co'
  anonKey: '',       // 例：'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  table: 'stats_events',

  adminPass: 'xqxy2026',   // ← 数据看板的口令，记得改成你自己的

  debug: true              // true 时在浏览器控制台打印每次上报，方便调试
};
