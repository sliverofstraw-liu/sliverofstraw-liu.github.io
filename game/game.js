/* ============================================================================
 * 西迁主题 · 羊了个羊式三消小游戏（第一版：框架版）
 * ----------------------------------------------------------------------------
 * 技术栈：纯 HTML + CSS + 原生 JS，无第三方库 / 无构建工具 / 无 CDN。
 * 渲染：全部用 DOM 元素 + CSS 定位（不用 Canvas），
 *       每一张牌都是一个真实可见的 DOM 节点，后期同学换成图片非常方便。
 * 打开方式：直接双击 index.html（file:// 协议）或放到静态托管上，都能玩。
 * ==========================================================================*/

(function () {
  'use strict';

  /* ==========================================================================
   * 一、牌面配置（同学换图片只需要改这里的 img）
   * --------------------------------------------------------------------------
   * 每张牌 = 一件「西迁行囊」里的物品。三个字段各有分工：
   *   img       图片路径。现在是 null，用色块 + 名字占位；
   *             同学把图放进 assets/ 之后，改成 'assets/xxx.png' 即可，
   *             **其他代码一行都不用动**。
   *   label     牌面上显示的名字（也是图鉴里的标题）。
   *   color     没有图片时的占位底色。
   *
   * 另外两段内容（知识点的短句 + 详细故事）在 tile-story.js 里，
   * 分开写是为了让「换素材」和「改文案」互不干扰。
   * ========================================================================*/
  const TILES = [
    { id: 'suitcase', label: '行李箱', color: '#e8734a', ink: '#ea8847', img: 'assets/suitcase.png' },
    { id: 'ticket',   label: '火车票', color: '#4a90d9', ink: '#4a9cf1', img: 'assets/ticket.png' },
    { id: 'strawhat', label: '草帽',   color: '#c9a227', ink: '#d7a838', img: 'assets/strawhat.png' },
    { id: 'book',     label: '讲义',   color: '#5a8f5a', ink: '#74a577', img: 'assets/book.png' },
    { id: 'device',   label: '仪器',   color: '#7a6bb5', ink: '#8679c8', img: 'assets/device.png' },
    { id: 'abacus',   label: '算盘',   color: '#b5563f', ink: '#b45745', img: 'assets/abacus.png' },
    { id: 'badge',    label: '校徽',   color: '#3f6fb5', ink: '#376dc2', img: 'assets/badge.png' },
    { id: 'photo',    label: '老照片', color: '#8a8f98', ink: '#d4d4d6', img: 'assets/photo.png' },
    { id: 'envelope', label: '家书',   color: '#c96f8a', ink: '#e691b0', img: 'assets/envelope.png' },
    { id: 'lamp',     label: '煤油灯', color: '#8a6b3f', ink: '#997959', img: 'assets/lamp.png' },
    /* 下面两件是后来加的：凑够 12 种，好让 144 张牌能分成整组。
     * 颜色特意各占一个新色系（青 / 浅木），避免和上面 10 种撞色 ——
     * 牌缩到 45 像素时，全靠颜色分辨。
     * 扁担最初用的是 #a34a2a（赭红），但和「算盘」#b5563f 的感知距离只有 7.5，
     * 实际看就是同一个颜色，所以改成浅木色 #dba97e：
     *   与算盘的距离 34.5、与最近的煤油灯 26.3、与牌背 22.6，都拉得开。 */
    { id: 'pen',      label: '钢笔',   color: '#2f7d8a', ink: '#3493a4', img: 'assets/pen.png' },
    { id: 'pole',     label: '扁担',   color: '#dba97e', ink: '#da9965', img: 'assets/pole.png' }
  ];

  /* ==========================================================================
   * 一点五、西迁知识点文案（改文字只动这里，不用碰逻辑）
   * --------------------------------------------------------------------------
   * knowledge：消掉这组牌时弹出来的一句话（要短、一眼看完）。
   * body     ：图鉴里点开图片后看到的更详细介绍。
   * 出处     ：底部小字，标一下来源，避免以讹传讹。
   * ========================================================================*/
  /* 西迁知识点文案在 tile-story.js 里（主游戏和通关页共用一份）。
   * 这里只是取个引用，改文字请去改那个文件。 */
  const TILE_STORY = (typeof window !== 'undefined' && window.TILE_STORY) ? window.TILE_STORY : {};

  /* ==========================================================================
   * 一点六、答题复活题库
   * --------------------------------------------------------------------------
   * 底栏满了不是直接判死，而是给一道西迁知识题：
   *   答对 → 复活，移出底栏若干件物品，继续打
   *   答错 → 这局结束（但可以立刻再来一局）
   * 每题结构：
   *   q        题干
   *   options  选项（2~4 个）
   *   answer   正确选项的下标（从 0 开始）
   *   explain  答完之后的解析（不管对错都显示）
   * 想加题，往这个数组里塞就行，其他代码不用动。
   * ========================================================================*/
  const QUIZ_BANK = [
    {
      q: '党中央、国务院决定交通大学由上海迁往西安，是在哪一年？',
      options: ['1949 年', '1955 年', '1966 年', '1978 年'],
      answer: 1,
      explain: '1955 年 4 月，党中央、国务院作出交通大学迁往西安的决定；' +
               '同年 5 月 25 日，时任校长彭康向全校师生宣布迁校决定。'
    }
    // 例题先放一道，后续继续往这里加题即可。
    // 例如：
    // { q: '……？', options: ['A', 'B'], answer: 0, explain: '……' }
  ];

  /* ==========================================================================
   * 二、关卡配置（本版只做 1 关，但结构上能加第 2 关，不要写死）
   * --------------------------------------------------------------------------
   * tilePool：本关使用的牌面池，是 TILES 的子集（这里直接用全部 8 种）。
   * total   ：总张数，必须是 3 的倍数，否则永远消不完、出不来胜利画面。
   * layers  ：层数。      slots：下方格子数（羊了个羊是 7 格）。
   * shrink  ：逐层向中心收缩的格数。
   * encode  ：发牌方式，这是本版的难度总开关 ——
   *           'solvable-revive' = 保证可解 + 必定要复活一次（推荐）：
   *                        牌局保证有解，但**任何打法都至少要爆一次底栏**，
   *                        必须在复活时移出底栏物品才能继续，复活后一定走得完。
   *           'solvable' = 保证可解，但不强制复活。
   *           'random'   = 纯随机洗牌（第一版的做法）：不保证有解，可能开局就必死。
   * opening ：开局放出来的可点张数【上限】。开局能点多少张直接决定爽感，
   *           所以这里给的是上限（越大越爽），摆牌时会尽量靠近它。
   * offset  ：层间错位。1 = 每层错开 1 格（牌堆高、开局可点多、爽）；
   *           2 = 每层错开 2 格（挡得狠、开局可点少、压抑）。这个数字很影响手感。
   * revive  ：复活配置。{ times: 允许复活次数, remove: 复活时从底栏移出几张 }
   * 每种图案的张数 = total / tilePool.length，要求它是 3 的倍数。
   *   12 种 × 12 张 = 144 张 → 每种 12 张，12 是 3 的倍数 ✔
   * ========================================================================*/
  const LEVELS = [
    {
      name: '第一关 · 西迁行囊',
      tilePool: TILES,             // 12 种
      total: 144,                  // 144 张 = 12 种 × 12 张
      layers: 4,                   // 4 层
      slots: 7,                    // 7 个格子（牌变多了，底栏也放宽 1 格）
      /* 逐层向中心收几格。这直接决定每层有多少地方摆牌 ——
       * 144 张比原来的 120 张多，收 2 格就摆不下了（实测只能摆进 112~128 张），
       * 必须放宽到 1 格，才能精确摆满 144 张。 */
      shrink: 1,
      encode: 'ramp',              // 前半段保证好解、后半段上难度（见 dealRamp）
      opening: 18,                 // 开局可点的上限。实测 12 会直接堵死（只够填满底栏、凑不出三张），18 是安全下限
                                   // 144 张 + shrink 1 时实测均值约 14，仍在安全范围
      offset: 1,                   // 层间错开 1 格 → 牌堆高、开局能点的多
      revive: { times: 1, remove: 3 }, // 能复活 1 次，复活时从底栏移出 3 件物品
      // 前几成算「前半段」：这一段会严格保证每一步都轻松（占用低），
      // 后面的段落才逐步加码 —— 玩家前半段点得爽，后半段开始烧脑。
      easyRatio: 0.3,              // 只有前 30% 是「轻松段」，后面全要算
      /* 动态难度：两个档，看【上一局有没有复活过】。
       * 下标 = 上一局的复活次数（一局只能复活一次，所以只有 0 和 1），
       * 值 = 本局档位（0 难档 / 1 简单档）。
       *   上一局没复活 → 0 → 难档：纯随机贴图，不保证有解
       *   上一局复活过 → 1 → 简单档：前 30% 的牌同款扎堆（先痛快消一段），
       *                        整局按设计路线铺、保证可解
       * 想调手感只改这个数组就行，逻辑不用动。 */
      difficulty: { byRevives: [0, 1] },
      // 后半段最多允许底栏占几格（越小越松、越大越紧）。上限是 slots - 1。
      hardOccupancy: 6,
      // 伪装三张：后半段顺带造几个「两张在明面、第三张深埋」的坑
      decoys: 0,                   // 关掉：对难度几乎无影响，却会拖慢开局
      decoyMaxDanger: 14,
      tip: '前半段随便点都顺，后半段要算着点；卡住了能复活一次。'
    }
    // 以后要加第二关，照抄一份改数字即可，例如：
    // { name: '第二关 · 西迁路上', tilePool: TILES.slice(0, 8), total: 144,
    //   layers: 5, slots: 7, shrink: 2, encode: 'ramp',
    //   opening: 40, offset: 1, revive: { times: 1, remove: 3 }, tip: '……' }
  ];

  /* ==========================================================================
   * 三、棋盘参数（「整齐」的关键）
   * --------------------------------------------------------------------------
   * 把游戏区域划分成 24×24 的虚拟网格（像棋盘），每张牌占 3×3 个格子。
   * 牌的位置只用【整数格坐标】，所以所有重叠的边界都落在格线上，
   * 玩家一眼就能看出谁压着谁。
   * 绝对禁止随机像素坐标撒点 —— 那会让牌糊成一团、看不清压叠关系。
   * ========================================================================*/
  const BOARD_CELLS = 24;                     // 棋盘 24×24 格
  const TILE_CELLS = 3;                       // 每张牌占 3×3 格
  const GRID_MAX = BOARD_CELLS - TILE_CELLS;  // 牌左上角坐标的最大值 = 21

  /* ==========================================================================
   * 四、工具函数
   * ========================================================================*/

  // Fisher-Yates 洗牌（原地打乱数组）
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function randInt(min, max) { // 含两端
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /* ==========================================================================
   * 五、发牌
   * --------------------------------------------------------------------------
   * 两种模式，由关卡的 encode 决定：
   *
   * ① 'random' 纯随机洗牌（第一版做法）
   *    每种图案等量填进数组 → Fisher-Yates 打乱 → 按生成顺序贴上去。
   *    和「羊了个羊」原版、多数复刻版一致，但【不保证有解】，可能开局就必死。
   *
   * ② 'solvable' 保证可解（推荐）
   *    先设计一条「通关路线」，再按这条路线倒推着贴图案，所以每一局都一定能赢。
   *    具体做法见 dealSolvable()。
   * ========================================================================*/

  // 纯随机洗牌发牌（不保证有解）
  function buildTileKinds(level) {
    const kinds = level.tilePool;
    const perKind = Math.floor(level.total / kinds.length); // 每种图案的份数
    const list = [];
    for (let i = 0; i < kinds.length; i++) {
      for (let n = 0; n < perKind; n++) list.push(kinds[i].id);
    }
    return shuffleArray(list);
  }

  /**
   * 按着一条点击顺序真实走一遍，算出卡槽最多同时占几个格子。
   *
   * 为什么不用公式推：卡槽占用要看「已经露出、但还没凑齐三张」的图案有几个，
   * 但三张一凑齐就立刻消掉，边界情况容易算错。
   * 这里干脆和游戏里一样，一张一张往卡槽里放、凑齐三张就消掉，
   * 数出来的就是玩家真正会遇到的最大占用，也正好当作「保证可解」的凭据。
   *
   * @param {number[]} typeAt typeAt[点击序号] = 图案编号
   * @param {number} kindCount 图案种类数（只用来校验，不参与计算）
   */
  function slotProfile(typeAt, kindCount) {
    const occ = [];   // 每一步的卡槽占用
    const slot = [];  // 模拟的卡槽
    let peak = 0, peakAt = -1;
    for (let p = 0; p < typeAt.length; p++) {
      slot.push(typeAt[p]);
      // 和游戏里一样：凑齐 3 张同样的就消掉，后面的往前补位
      let killed = true;
      while (killed) {
        killed = false;
        const count = {};
        for (let i = 0; i < slot.length; i++) count[slot[i]] = (count[slot[i]] || 0) + 1;
        for (const k in count) {
          if (count[k] >= 3) {
            let need = 3;
            for (let i = slot.length - 1; i >= 0 && need > 0; i--) {
              if (String(slot[i]) === k) { slot.splice(i, 1); need--; }
            }
            killed = true;
            break;
          }
        }
      }
      occ.push(slot.length);
      if (slot.length > peak) { peak = slot.length; peakAt = p; }
    }
    return { occ: occ, peak: peak, peakAt: peakAt };
  }

  /**
   * 保证可解的发牌器。
   *
   * 输入是牌堆的「摆放顺序」（从最上面一层往下摆的，所以它反过来就是一条
   * 天然合法的点击顺序：每一张被点时，压着它的牌都已经被点走了）。
   *
   * 我们要做的就是给这条顺序里的每个位置分配图案编号，让：
   *   ① 每种图案正好出现 3 次（这样三张一凑就能消掉）；
   *   ② 按这条顺序点击时，卡槽占用从不超过格子数 —— 也就是真的能走通。
   *
   * 分配办法：先按「目标峰值」算出该在第几步开一个新图案，
   * 新图案往后占 3 个位置，再把图案编号随机分配给这些位置。
   * 这样每条路线都会在指定的步数上开到指定的卡槽压力，
   * 难度是【设计出来的】，而不是靠运气。
   *
   * @param {number} n 总张数（必须是 3 的倍数）
   * @param {number} kindCount 图案种类数
   * @param {number} slotCap 卡槽格子数
   * @param {number} targetPeak 想要的卡槽峰值（留出余量玩家才有得选）
   */
  function dealSolvable(n, kindCount, slotCap, targetPeak) {
    const groups = n / 3; // 一共多少组三张（72 张 → 24 组）
    if (groups % kindCount !== 0) return null;

    /* 铺法：贪心地「尽量多开几个图案、让它们同时占着卡槽」，
     * 把卡槽占用推高到目标峰值 —— 这样难度才是设计出来的，而不是碰运气。
     * 每一步都保证占用不超过目标值，所以这条路线一定走得通。 */
    const typeAt = new Array(n).fill(-1);
    const groupsIdx = [];   // groupsIdx[k] = 第 k 个图案已经用掉的位置
    for (let k = 0; k < groups; k++) groupsIdx.push([]);
    let openCount = 0;      // 当前有几个图案「已经露过面但还没凑齐」
    const target = Math.max(3, Math.min(targetPeak, slotCap));

    for (let i = 0; i < n; i++) {
      let best = -1;

      // ① 能把「已经有 2 张」的图案收尾就立刻收尾 → 它随即消掉，占用降下来
      for (let k = 0; k < groups; k++) {
        if (groupsIdx[k].length === 2) { best = k; break; }
      }
      // ② 否则，只要占用还没到目标，就再开一个新图案 → 占用升上去（这是难度的来源）
      if (best < 0 && openCount < target) {
        for (let k = 0; k < groups; k++) {
          if (groupsIdx[k].length === 0) { best = k; break; }
        }
      }
      // ③ 占用已经到顶了，只能往「已经有 1 张」的图案里补一张（占用不变，稍后再补满）
      if (best < 0) {
        for (let k = 0; k < groups; k++) {
          if (groupsIdx[k].length === 1) { best = k; break; }
        }
      }
      // ④ 还是不行就随便找个没收尾的
      if (best < 0) {
        for (let k = 0; k < groups; k++) {
          if (groupsIdx[k].length > 0 && groupsIdx[k].length < 3) { best = k; break; }
        }
      }
      if (best < 0) return null; // 拼不出来了，交给上层重试
      groupsIdx[best].push(i);
      typeAt[i] = best;
      // 重新算一下当前有几个图案还没凑齐
      openCount = 0;
      for (let k = 0; k < groups; k++) {
        if (groupsIdx[k].length > 0 && groupsIdx[k].length < 3) openCount++;
      }
    }

    // 校验：每组正好 3 张
    for (let k = 0; k < groups; k++) if (groupsIdx[k].length !== 3) return null;
    const counts = new Array(groups).fill(0);
    for (let i = 0; i < n; i++) {
      if (typeAt[i] < 0 || typeAt[i] >= groups) return null;
      counts[typeAt[i]]++;
    }
    for (let k = 0; k < groups; k++) if (counts[k] !== 3) return null;

    // 校验：这条路线上的卡槽占用从不超过格子数（这是「保证可解」的凭据）
    const prof = slotProfile(typeAt, groups);
    if (prof.peak > slotCap) return null;

    // 把「组编号」随机映射到真正的图案上。
    // groups（24 组）是图案种类数（8 种）的整数倍，
    // 所以「轮流发 + 整体打乱」之后每种图案的组数完全相等。
    const kindOfGroup = [];
    for (let k = 0; k < groups; k++) kindOfGroup.push(k % kindCount);
    shuffleArray(kindOfGroup);

    // 输出：一条通关路线 + 每组对应的图案
    return {
      typeAt: typeAt,           // typeAt[点击序号] = 组编号
      groupKind: kindOfGroup,   // groupKind[组编号] = 图案 id
      peak: prof.peak           // 这条路线上的卡槽峰值
    };
  }


  /**
   * 「前半段轻松、后半段上难度」的发牌器（本版主用）。
   *
   * 思路：
   *   把整条通关路线切成两段 ——
   *   前半段：每一步都只允许底栏占很少的格子（占用低），随便点都顺，
   *          保证「前半段一定好解」；
   *   后半段：逐步把允许的占用抬高到上限附近，逼玩家算着点，
   *          同时在这里多开几个图案（让同款分散），难度自然上来。
   *
   * 关键：整条路线从第一步到最后一步，占用永远不超过格子数，
   *      所以【整局一定可解】；而前半段额外满足「占用 ≤ 低阈值」，
   *      所以【前半段特别好解】。两件事同时成立，不互相打架。
   *
   * @param {number} n 总张数（3 的倍数）
   * @param {number} kindCount 图案种类数
   * @param {number} slotCap 底栏格子数
   * @param {number} easyRatio 前半段占整局的比例（0~1）
   * @param {number} hardOccupancy 后半段最多允许占几格
   */
  function dealRamp(n, kindCount, slotCap, easyRatio, hardOccupancy, requireSolve) {
    const groups = n / 3;                          // 144 张 → 48 组
    const perKind = groups / kindCount;            // 每种图案分到几组
    if (perKind !== Math.floor(perKind)) return null;

    const easyGroups = Math.round(groups * easyRatio);
    const hardGroups = groups - easyGroups;

    /* ---------- 位置：144 张正好占满 144 个位置，必须算准 ----------
     * 前半段：组间距 2、三张跨度 3 → 第 j 组占 (2j, 2j+1, 2j+3)
     *         这样相邻两组错开，占用不高但比「三张挨着」有意思。
     * 后半段：接着往后排，组间距 3、三张跨度 3 → 三张紧挨，
     *         但同款之间被拉得很开（靠下面的图案分配实现）。 */
    const typeAt = new Array(n).fill(-1);
    const place = function (base, pattern, idx) {
      const ps = [base, base + 1, base + pattern];
      for (let m = 0; m < 3; m++) {
        const p = ps[m];
        if (p < 0 || p >= n || typeAt[p] !== -1) return false;
      }
      for (let m = 0; m < 3; m++) typeAt[ps[m]] = idx;
      return true;
    };

    /* 三张必须连续（组间距 3、跨度 2）：这是唯一不撞车、又能占满 120 个位置的摆法。
     * 任何一组把三张拉开，需要的间距就会超过 3，位置立刻不够 —— 这是算出来的结论。 */
    for (let j = 0; j < groups; j++) {
      if (!place(j * 3, 2, j)) return null;
    }
    for (let i = 0; i < n; i++) if (typeAt[i] < 0) return null;

    /* ---------- 图案分配：全局统一配额，一半「扎堆」一半「打散」 ---------- */
    const easyQuota = new Array(kindCount).fill(0);
    const hardQuota = new Array(kindCount).fill(0);
    for (let k = 0; k < kindCount; k++) {
      easyQuota[k] = Math.min(perKind, Math.floor(perKind * easyRatio) + (k % 2));
      // 修正总数
    }
    // 把配额调成「前半段合计 = easyGroups」
    let sum = 0;
    for (let k = 0; k < kindCount; k++) sum += easyQuota[k];
    let guard = 0;
    while (sum > easyGroups && guard++ < 1000) {
      for (let k = 0; k < kindCount && sum > easyGroups; k++) {
        if (easyQuota[k] > 0) { easyQuota[k]--; sum--; }
      }
    }
    while (sum < easyGroups && guard++ < 2000) {
      for (let k = 0; k < kindCount && sum < easyGroups; k++) {
        if (easyQuota[k] < perKind) { easyQuota[k]++; sum++; }
      }
    }
    if (sum !== easyGroups) return null;
    for (let k = 0; k < kindCount; k++) hardQuota[k] = perKind - easyQuota[k];

    const kindOfGroup = new Array(groups).fill(-1);
    const usedEasy = new Array(kindCount).fill(0);
    const usedHard = new Array(kindCount).fill(0);

    // 前半段：同一个图案连着给（同款扎堆 → 玩家点两下就凑齐）
    for (let i = 0; i < easyGroups; ) {
      let pick = -1;
      for (let k = 0; k < kindCount; k++) if (usedEasy[k] < easyQuota[k]) { pick = k; break; }
      if (pick < 0) return null;
      const run = Math.min(easyQuota[pick] - usedEasy[pick], easyGroups - i);
      for (let m = 0; m < run; m++) { kindOfGroup[i + m] = pick; usedEasy[pick]++; }
      i += run;
    }
    // 后半段：轮着来，挨着的两组绝不同款（同款打散 → 得算着点）
    let prev = kindOfGroup[easyGroups - 1];
    for (let i = easyGroups; i < groups; i++) {
      let pick = -1;
      for (let off = 1; off <= kindCount; off++) {
        const k = (prev + off) % kindCount;
        if (usedHard[k] < hardQuota[k]) { pick = k; break; }
      }
      if (pick < 0) return null;
      kindOfGroup[i] = pick;
      usedHard[pick]++;
      prev = pick;
    }
    for (let k = 0; k < kindCount; k++) {
      if (usedEasy[k] + usedHard[k] !== perKind) return null;
    }

    // 真实走一遍，确认一定清空、占用不超标
    let peak = 0;
    {
      const slot = [];
      for (let i = 0; i < n; i++) {
        slot.push(typeAt[i]);
        let killed = true;
        while (killed) {
          killed = false;
          const c = {};
          for (let j = 0; j < slot.length; j++) c[slot[j]] = (c[slot[j]] || 0) + 1;
          for (const kk in c) {
            if (c[kk] >= 3) {
              let need = 3;
              for (let j = slot.length - 1; j >= 0 && need; j--) {
                if (String(slot[j]) === kk) { slot.splice(j, 1); need--; }
              }
              killed = true; break;
            }
          }
        }
        if (slot.length > peak) peak = slot.length;
        if (slot.length > slotCap) return null;
      }
      if (slot.length !== 0) return null;
    }

    /* ---------- 「不保证有解」模式：把后半段的图案打散 ----------
     * 上面的分配刻意做了两件事：前半段同款扎堆（好凑）、后半段同款轮着给（更难）。
     * 当 requireSolve = false 时，我们要的是「很可能走不通」的牌局，
     * 但【不能改变每种图案的张数】（否则永远消不完、出不来胜利画面）。
     * 做法：只把后半段的图案做一次「同集合内的对调」——
     * 集合没变，所以每种图案的组数一个不少；但扎堆被打散，手感直接变硬。
     * 前半段保持原样，这样开局不会一上来就是死局，玩家还能先玩一会儿。 */
    if (!requireSolve && hardGroups >= 2) {
      const seg = [];
      for (let i = easyGroups; i < groups; i++) seg.push(i);
      const vals = seg.map(function (i) { return kindOfGroup[i]; });
      shuffleArray(vals);
      for (let m = 0; m < seg.length; m++) kindOfGroup[seg[m]] = vals[m];
    }

    return {
      typeAt: typeAt,
      groupKind: kindOfGroup,
      peak: peak,
      easyPeak: 0,
      easyEnd: easyGroups * 3,
      groups: groups
    };
  }
  /* ==========================================================================
   * 六、几何与遮挡计算（核心，必须全平台可用）
   * --------------------------------------------------------------------------
   * 【绝对禁止】用 IntersectionObserver（尤其 trackVisibility 参数）。
   * 那是 Chromium 私有特性，iPhone 的 Safari 会静默忽略，
   * 结果就是所有牌都被判定成「能点」，游戏直接失去玩法。
   *
   * 正确做法：每张牌记两个字段 —— 层号 level（越大越靠上）、自身矩形范围。
   *   ※ 矩形重叠 且 B.level > A.level  →  B 压住 A。
   *   ※ 同层两张牌若矩形重叠，按「生成顺序」决定谁压谁：
   *     生成顺序在后的那张在 DOM 里更靠后、显示在上层，所以它压住前面那张。
   *   ※ 判断依据是「矩形重叠」，不是「完全盖住」。只要被别的牌压到一点点就点不了
   *     —— 这和羊了个羊一致（半遮挡的牌也不能点）。
   * 生成牌堆时就把「压住我的牌」名单算好存进 tile.blockedBy，
   * 点击时只看 blockedBy 是否为空 → 空则可点。O(1)，不消耗性能。
   * ========================================================================*/

  /**
   * 「必须复活一次」的发牌器。
   *
   * 目标：让这一局无论谁打、怎么打，都至少会把卡槽塞满一次 → 触发复活；
   *       而且复活之后，剩下的牌【一定】还能清空（完美打法只复活这一次）。
   *
   * 做法分两段：
   *   ① 前 (格子数 + 1) 个位置，各放一个【不同图案】的第一张。
   *      三张才算一组，所以这时候一张都消不掉，卡槽必然被塞爆 —— 强制复活。
   *      这一步和玩家怎么点无关：他要塞满卡槽，手里就只能是这 7 个图案。
   *   ② 其余位置用「有 2 张就收尾、否则补 1 张、都没有才开新图案」的节奏铺，
   *      并且不许把卡槽顶到上限 —— 于是复活清出位置后，剩下的牌一定能走完。
   *
   * 构造过程本身也模拟了一遍卡槽（和游戏里完全一样的规则），
   * 所以「复活次数」「峰值」都是真实数据，不是估的。
   *
   * @param {number} n 总张数（3 的倍数）
   * @param {number} kindCount 图案种类数
   * @param {number} slotCap 卡槽格子数
   * @param {number} reviveRemove 复活时从底栏移出几张
   */
  function dealForcedRevive(n, kindCount, slotCap, reviveRemove) {
    const groups = n / 3;
    if (groups % kindCount !== 0) return null;

    /* 前缀 = 开局就摊在玩家眼前的那几张（由 generateBoard 放到最上层）。
     * 排布：slotCap 个【不同图案】各 1 张，再加 1 张重复图案。
     *   前 slotCap 张进底栏，各占一格；
     *   第 slotCap+1 张（重复的那张）进底栏时凑不成三张 → 底栏塞满 → 强制复活。
     * 玩家一开始能点的牌有限，躲不开这一步。 */
    const prefixLen = slotCap + 1;
    if (prefixLen >= groups || prefixLen >= n) return null;

    const typeAt = new Array(n).fill(-1);
    for (let i = 0; i < slotCap; i++) typeAt[i] = i;
    typeAt[slotCap] = 0;                          // 重复的那张（爆格靠它）

    /* 尾部顺序很关键 —— 要跟着「复活会移出底栏最后几张」来排：
     *   复活移出的是底栏最后 reviveRemove 张 = 前缀里最后那几个图案（这里是
     *   图案 slotCap-1、slotCap-2 … 以及重复的图案 0）。
     *   这些图案在前缀里的那张被移走了，所以它们【剩下两张】必须紧跟着补完，
     *   而且不能再被移出 —— 所以放在最前面、成组补齐。 */
    let pos = prefixLen;
    const casualties = [];                        // 会被复活移出牌的图案
    for (let r = 1; r <= reviveRemove; r++) {
      const g = (slotCap - r + groups) % groups;  // slotCap-1, slotCap-2, ...
      if (casualties.indexOf(g) < 0) casualties.push(g);
    }
    if (casualties.indexOf(0) < 0 && reviveRemove > 0) casualties.push(0);

    // ① 先把「前缀里的图案」剩下的牌补完（每组补到 3 张），两两相邻
    for (let i = 0; i < slotCap; i++) {
      const g = i;
      let inPrefix = 0;
      for (let p = 0; p < prefixLen; p++) if (typeAt[p] === g) inPrefix++;
      for (let m = inPrefix; m < 3; m++) {
        while (pos < n && typeAt[pos] !== -1) pos++;
        if (pos >= n) return null;
        typeAt[pos++] = g;
      }
    }

    // ② 其余图案：每组 3 张连续（点完就消，占用极低）
    for (let g = prefixLen; g < groups; g++) {
      for (let m = 0; m < 3; m++) {
        while (pos < n && typeAt[pos] !== -1) pos++;
        if (pos >= n) return null;
        typeAt[pos++] = g;
      }
    }

    // ---- 校验 + 真实模拟 ----
    const cnt = {};
    for (let i = 0; i < n; i++) {
      if (typeAt[i] < 0) return null;
      cnt[typeAt[i]] = (cnt[typeAt[i]] || 0) + 1;
    }
    for (const g in cnt) if (cnt[g] !== 3) return null;

    const final = simulateDeal(typeAt, slotCap, reviveRemove);
    if (!final || final.revives !== 1 || !final.cleared) return null;
    if (final.spoiled && final.spoiled.length) return null;

    const kindOfGroup = [];
    for (let g = 0; g < groups; g++) kindOfGroup.push(g % kindCount);
    shuffleArray(kindOfGroup);

    return {
      typeAt: typeAt,
      groupKind: kindOfGroup,
      peak: final.peak,
      revives: final.revives,
      firstReviveAt: final.firstReviveAt,
      prefixLen: prefixLen            // generateBoard 靠它把这几张放到最上层
    };
  }

  /**
   * 把一条「点击顺序」当成真实牌局走一遍（和游戏里完全一样的规则）。
   * 返回峰值 / 复活次数 / 复活点，以及被复活「弄残」的图案名单：
   * 一个图案如果在复活点之前已经被点过牌，之后还有牌留在棋盘上，它就永远凑不齐。
   */
  function simulateDeal(typeAt, slotCap, reviveRemove) {
    const n = typeAt.length;
    const slot = [];
    let revives = 0, peak = 0, peakAt = -1, firstReviveAt = -1;

    const total = {};                       // 每个图案一共几张
    for (let i = 0; i < n; i++) {
      if (typeAt[i] >= 0) total[typeAt[i]] = (total[typeAt[i]] || 0) + 1;
    }
    const played = {};                      // 每个图案已经点过几张
    const spoiled = [];

    for (let i = 0; i < n; i++) {
      slot.push(typeAt[i]);
      played[typeAt[i]] = (played[typeAt[i]] || 0) + 1;
      if (slot.length > peak) { peak = slot.length; peakAt = i; }
      let killed = true;
      while (killed) {
        killed = false;
        const c = {};
        for (let j = 0; j < slot.length; j++) c[slot[j]] = (c[slot[j]] || 0) + 1;
        for (const k in c) {
          if (c[k] >= 3) {
            let need = 3;
            for (let j = slot.length - 1; j >= 0 && need; j--) {
              if (String(slot[j]) === k) { slot.splice(j, 1); need--; }
            }
            killed = true;
            break;
          }
        }
      }
      if (slot.length > slotCap) {
        revives++;
        if (firstReviveAt < 0) firstReviveAt = i;
        for (let j = 0; j < reviveRemove && slot.length; j++) {
          const dead = slot.pop();
          // 这个图案：已经点过的张数 > 底栏里剩下的张数 → 有几张被移出、永远没了
          const stillHere = [];
          for (let m = 0; m < slot.length; m++) if (slot[m] === dead) stillHere.push(m);
          const remainOnBoard = (total[dead] || 0) - (played[dead] || 0);
          if (remainOnBoard > 0 && (played[dead] || 0) > stillHere.length) {
            // 有牌在复活点之前点掉了、棋盘上却还有它的牌 → 残了
            if (spoiled.indexOf(dead) < 0) spoiled.push(dead);
          }
        }
      }
    }
    return {
      peak: peak, peakAt: peakAt, revives: revives,
      firstReviveAt: firstReviveAt, cleared: slot.length === 0,
      spoiled: spoiled
    };
  }

  /* ==========================================================================
   * 六、几何与遮挡计算（接着上面讲）
   * ========================================================================*/

  // 两张牌的矩形是否相交（用整数格坐标）
  function rectsOverlap(a, b) {
    return a.x < b.x + TILE_CELLS && b.x < a.x + TILE_CELLS &&
           a.y < b.y + TILE_CELLS && b.y < a.y + TILE_CELLS;
  }

  // 新牌相对「同一层」已有牌露在外面的面积（用于生成时判断挤不挤）
  function visibleAreaFor(nx, ny, placed) {
    const cand = { x: nx, y: ny };
    let hidden = 0;
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      if (!rectsOverlap(cand, p)) continue;
      const ox = Math.min(nx + TILE_CELLS, p.x + TILE_CELLS) - Math.max(nx, p.x);
      const oy = Math.min(ny + TILE_CELLS, p.y + TILE_CELLS) - Math.max(ny, p.y);
      hidden += ox * oy;
    }
    const visible = TILE_CELLS * TILE_CELLS - Math.min(hidden, TILE_CELLS * TILE_CELLS);
    return { visible: visible, fullyHidden: visible <= 0 };
  }

  /**
   * 数一张牌「露在外面的格数」。
   * 只看层号 >= 它的牌（比它低的压不着它），把被盖住的格子去重后数一遍。
   * @param {{x:number,y:number,level:number}} t 待检查的牌
   * @param {Array} board 已经放好的牌
   */
  function visibleCellsOf(t, board) {
    const hidden = {};
    let hiddenCount = 0;
    for (let j = 0; j < board.length; j++) {
      const o = board[j];
      if (o === t || o.level < t.level) continue; // 比我低的压不着我
      if (!rectsOverlap(t, o)) continue;
      const ox0 = Math.max(t.x, o.x), ox1 = Math.min(t.x + TILE_CELLS, o.x + TILE_CELLS);
      const oy0 = Math.max(t.y, o.y), oy1 = Math.min(t.y + TILE_CELLS, o.y + TILE_CELLS);
      for (let gx = ox0; gx < ox1; gx++) {
        for (let gy = oy0; gy < oy1; gy++) {
          const k = gx + ',' + gy;
          if (!hidden[k]) { hidden[k] = true; hiddenCount++; }
        }
      }
    }
    return TILE_CELLS * TILE_CELLS - hiddenCount;
  }

  /**
   * 检查「把一张牌放在 (x,y,level)」这件事会不会让谁彻底看不见。
   *
   * 三个方向都要查：
   *   ① 这张牌自己会不会被（已经放好的、层号 >= 它的）牌盖住太多；
   *   ② 这张牌会不会把下面几层已经放好的牌盖住太多（把它压成看不见）；
   *   ③ 这张牌会不会把同一层已经放好的牌盖住太多
   *      （同层的牌互相都能压，谁后放谁在上面，所以要特别照顾先放的那张）。
   * 只要有任何一张牌露得太少，这个位置就不能选。
   *
   * @param {number} x,y,level 准备放的位置
   * @param {Array} board 已经放好的牌
   * @param {number} selfMin 这张牌自己至少要露几格
   * @param {number} otherMin 已经有牌至少要保留几格（别被压得看不见）
   */
  function checkPlacement(x, y, level, board, selfMin, otherMin) {
    const cand = { x: x, y: y, level: level, id: -1 };
    const rest = [];
    for (let i = 0; i < board.length; i++) {
      if (rectsOverlap(cand, board[i])) rest.push(board[i]); // 只有和它重叠的牌会受影响
    }

    // ① 自己露几格：只看重叠的那些牌就够了（不重叠的一个格子也盖不着）
    const selfVis = visibleCellsOf(cand, rest);
    if (selfVis < selfMin) return { selfVisible: selfVis, ok: false };

    // ② 已经有牌要保留几格。
    //    注意：必须把「这张新牌 + 已经放好的所有牌」一起算，
    //    因为一张牌可能是被好几张牌【加起来】才盖住的，
    //    只跟新牌单独比会漏判，最后就会出现一张谁都看不见的牌。
    const withCand = board.concat([cand]);
    for (let i = 0; i < rest.length; i++) {
      const b = rest[i];
      if (visibleCellsOf(b, withCand) < otherMin) return { selfVisible: selfVis, ok: false };
    }

    return { selfVisible: selfVis, ok: true };
  }

  // 生成牌堆时就把「压住我的牌」名单算好（点击时只查这个名单）
  function computeBlocked(board) {
    for (let i = 0; i < board.length; i++) board[i].blockedBy.length = 0;

    // board 已经排成「从下到上」的顺序（见 generateBoard），所以：
    //   下标更大的牌 = 显示在更上面 = 压住它
    for (let i = 0; i < board.length; i++) {
      const upper = board[i];
      for (let j = 0; j < i; j++) {
        const lower = board[j];
        if (!rectsOverlap(upper, lower)) continue; // 矩形不重叠 → 压不着
        if (upper.level < lower.level) continue;   // 层号更小 → 不压
        // 走到这里：重叠 且（层号更大 或 同层但编号更靠后）→ upper 压住 lower
        // 存的是【牌的 id】，不是数组下标 —— 消费方必须按 id 查（见 updateBoard）
        lower.blockedBy.push(upper.id);
      }
    }
  }

  /* ==========================================================================
   * 六点五、伪装三张（诱饵）
   * --------------------------------------------------------------------------
   * 这是「逼玩家在底栏里做取舍」的核心手段。
   *
   * 做法：挑几个图案，把它们的【两张】放到「摆放顺序的末尾」——
   *   摆放是从最上层往下摆的，所以顺序越靠后 = 层号越高 = 玩家越先能点到；
   *   把第三张放到「摆放顺序的开头」= 层号最低 = 埋在最底下，很晚才挖得出来。
   * 于是玩家一开局就看到两张火车票亮着，手一快收进底栏，第三张却远在天边。
   * 底栏只有 6 格，收两个诱饵就废掉三分之一。
   *
   * 注意：这只改「图案贴在哪张牌上」，每个图案依然是 3 张、棋盘也没变，
   * 所以发牌器算好的那条通关路线依然成立（收满三张就消）。
   * 变难的只是玩家【忍住不点】。
   * ========================================================================*/

  // 给每个摆放位次算一个「亮眼程度」：层号越高、玩家越早能点到 → 越亮眼。
  // 注意：board 的数组顺序是「从下到上」（id 越大越靠上），
  // 而「点击顺序」是它的倒序 —— 所以位次越靠【后】，玩家越早看到。
  function scoreVisibility(board) {
    const n = board.length;
    let maxLevel = 1;
    for (let i = 0; i < n; i++) if (board[i].level > maxLevel) maxLevel = board[i].level;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = board[i];
      const blockers = t.blockedBy ? t.blockedBy.length : 0;
      // 亮眼程度 = 离「一开始就能点」有多近：
      //   没牌压着（blockers=0）→ 1；压它的牌越多 → 越小
      const freeScore = 1 / (1 + blockers * 0.5);
      const levelScore = t.level / maxLevel;      // 层号越高，露出来的机会越大
      const orderScore = i / Math.max(1, n - 1);  // 摆放越靠后 = 越靠上
      out.push({
        idx: i,
        score: 0.5 * freeScore + 0.3 * levelScore + 0.2 * orderScore
      });
    }
    return out;
  }

  /**
   * 给牌堆贴「伪装三张」：把若干图案做成「两张摆在明面上、第三张深埋」。
   *
   * 做法：把某个图案的 3 张牌【重新指派】到 3 个位置 ——
   *   两张放到亮眼程度最高的空位（玩家一开局就看得见），
   *   第三张放到「第二章亮眼位之后第 danger 个」的位置（隔一段才挖得到）。
   * 被顶掉的那三个位置上的图案，拿走诱饵原来的三个位置，
   * 所以每种图案的张数依然是 3 张、棋盘也没变。
   *
   * @param {Array} board 牌堆（已排好序、已贴好图案）
   * @param {number} decoyCount 想造几个诱饵图案
   * @param {number} maxDanger 探测成本上限（明面那张与深埋那张之间隔几手）
   * @returns {number} 实际造出来的诱饵个数
   */
  function applyDecoys(board, decoyCount, maxDanger, slotCap) {
    if (!decoyCount || decoyCount <= 0) return 0;
    const cap = (typeof slotCap === 'number' && slotCap > 0) ? slotCap : 6;
    const n = board.length;

    /* 关键：board 的数组顺序是「从下到上」，而玩家从【最上面】开始点，
     * 所以「设计路线第 s 手」对应的数组下标是 n-1-s。
     * 下面全部在「第几手」这个坐标系里算，避免方向搞反。 */
    const posAt = function (step) { return n - 1 - step; };
    const kindAt = function (step) { return board[posAt(step)].kind; };

    const kinds = [];
    for (let i = 0; i < TILES.length; i++) kinds.push(TILES[i].id);

    const profileOf = function (getKind) {
      const slot = [];
      const v = new Array(n).fill(0);
      for (let s = 0; s < n; s++) {
        slot.push(getKind(s));
        let killed = true;
        while (killed) {
          killed = false;
          const c = {};
          for (let j = 0; j < slot.length; j++) c[slot[j]] = (c[slot[j]] || 0) + 1;
          for (const kk in c) {
            if (c[kk] >= 3) {
              let need = 3;
              for (let j = slot.length - 1; j >= 0 && need; j--) {
                if (String(slot[j]) === kk) { slot.splice(j, 1); need--; }
              }
              killed = true; break;
            }
          }
        }
        v[s] = slot.length;
      }
      return v;
    };
    const isSafe = function () {
      const v = profileOf(kindAt);
      for (let s = 0; s < n; s++) if (v[s] > cap) return false;
      return true;
    };
    const swap = function (a, b) { const tmp = board[a].kind; board[a].kind = board[b].kind; board[b].kind = tmp; };

    // 亮眼程度换算到「手」坐标
    const vis = scoreVisibility(board);
    const byStep = [];
    for (let s = 0; s < n; s++) byStep.push({ step: s, score: vis[posAt(s)].score });
    byStep.sort(function (a, b) { return b.score - a.score; });

    const bound = {};
    const made = [];

    for (let k = 0; k < kinds.length && made.length < decoyCount; k++) {
      const tKind = kinds[k];
      const freeSteps = [];                    // 这个图案「没被绑住」的那些手
      for (let s = 0; s < n; s++) {
        if (kindAt(s) !== tKind) continue;
        if (bound[posAt(s)]) continue;
        freeSteps.push(s);
      }
      if (freeSteps.length < 3) continue;

      // 候选明面手：玩家最早看到的那些手
      const cand = [];
      for (let i = 0; i < byStep.length && cand.length < 24; i++) {
        const s = byStep[i].step;
        if (bound[posAt(s)]) continue;
        if (freeSteps.indexOf(s) >= 0) continue;   // 不能用它自己已有的位置来当「诱饵位」
        cand.push(s);
      }
      if (cand.length < 2) continue;

      /* 伪装三张的真髓：把同款的【两张】摆到明面上，另【两张】挪到很后面去。
       * 14 张原始副本里：
       *   1 张 → 明面甲（玩家一眼看到）
       *   1 张 → 明面乙（再一眼，两张同款摆在那儿）
       *   2 张 → 挪到很后面（继续勾着玩家）
       *   剩 5 张 → 原地不动（保证这张牌还是解得开的）
       * 只要每次搬完，照设计路线走一遍底栏都不超标，就采纳。 */
      let chosen = null;
      for (let a = 0; a < cand.length && !chosen; a++) {
        for (let b = a + 1; b < cand.length && !chosen; b++) {
          const s1 = cand[a], s2 = cand[b];
          if (Math.abs(s1 - s2) > maxDanger) continue;
          // 挑两张「离得最远、又没被绑」的原位置挪到后面
          const pool = freeSteps.filter(function (s) { return s > s2 + maxDanger; });
          if (pool.length < 2) continue;
          for (let c = 0; c < pool.length && !chosen; c++) {
            for (let d = c + 1; d < pool.length && !chosen; d++) {
              const f1 = posAt(pool[c]), f2 = posAt(pool[d]);
              if (bound[f1] || bound[f2]) continue;
              swap(posAt(s1), f1);
              swap(posAt(s2), f2);
              if (isSafe()) {
                chosen = { p1: posAt(s1), p2: posAt(s2), s1: s1, s2: s2 };
              } else {
                swap(posAt(s1), f1); swap(posAt(s2), f2);
              }
            }
          }
        }
      }
      if (!chosen) continue;

      bound[chosen.p1] = true; bound[chosen.p2] = true;
      made.push({
        kind: tKind,
        high: [chosen.p1, chosen.p2],
        low: -1,
        danger: Math.abs(chosen.s1 - chosen.s2)
      });
    }

    board.decoys = made;
    return made.length;
  }

  /* ==========================================================================
   * 七、生成牌堆
   * --------------------------------------------------------------------------
   * 逐层生成，每往上生成一层，可用坐标范围就往中心收缩 shrink 格，
   * 于是自然堆成「上小下大」的塔形，难度随层数递增。
   *
   * 生成策略：先给每层建一个「合法整数格坐标」的候选池（每层各算各的，
   * 因为不同层放在同一个格坐标是正常叠放），然后【从最上面一层开始往下摆】。
   * 为什么从上往下：摆下面几层时，所有会压住它的牌（更上面几层）都已经摆好了，
   * 直接检查「这张放下去还剩几格露着」就行，绝不会出现被上面整张盖住、玩家看不见的牌。
   *
   * 挑位置时优先「身边空隙多、离棋盘中心近」的坐标，牌堆既整齐又有塔形。
   * ========================================================================*/

  // 某层的可用坐标范围（整数格坐标）。收得太狠放不下牌时返回 null。
  function layerRange(layerIdx, shrink) {
    const inset = layerIdx * shrink;
    const lo = inset;
    const hi = GRID_MAX - inset;
    if (lo > hi) return null;
    return { lo: lo, hi: hi };
  }

  /**
   * 给一层挑「候选位置」。
   * 先用步长 3 铺整齐的格阵（相邻两牌留缝、不重叠），
   * 再退回步长 2 把新牌插进缝里（错半个身位，看起来像斜码上去的一摞），
   * 最后退回步长 1 补缝 —— 保证收缩得很小的上层也能凑够候选，塔形不塌。
   * 每一层内部都保证：任何一张牌都不会被本层别的牌整张盖住。
   *
   * 注意：这里【只看本层】，不同层放在同一个格坐标是完全合法的叠放，
   *       所以候选位置每层各自独立算一遍，互不影响。
   *
   * @param {number} lo 坐标下界（含）
   * @param {number} hi 坐标上界（含）
   * @param {number} offset 本层整体错开几格。
   *        这个值直接决定「开局有几张牌能点」：
   *        各层完全对齐（offset 取整）时上层的牌正好压在下层同一位置，挡得最多；
   *        错开半个身位（0.75 格）时，上层每张牌能压住下层好几张牌，
   *        挡得多、又不会把任何一张牌完全藏住 —— 这是实测下来手感最好的一档。
   */
  function pickPositions(lo, hi, offset) {
    const placed = [];
    if (hi - lo + 1 < TILE_CELLS) return placed;
    const limit = TILE_CELLS * TILE_CELLS * 0.5; // 本层内至少露出半张

    const steps = [3, 2, 1];
    for (let s = 0; s < steps.length; s++) {
      const step = steps[s];
      // 以 lo + offset 为原点，在 [lo, hi] 里按 step 铺格阵
      // （offset 可能带小数，所以用 Math.round 落回整数格线）
      const offInt = Math.round(offset);
      const startX = lo + (((offInt % step) + step) % step);
      const startY = lo + (((offInt % step) + step) % step);
      for (let x = startX; x <= hi; x += step) {
        for (let y = startY; y <= hi; y += step) {
          const info = visibleAreaFor(x, y, placed);
          if (info.visible < limit) continue; // 被本层别的牌盖得太多 → 这个位置不要
          placed.push({ x: x, y: y });
        }
      }
    }
    return placed;
  }

  /**
   * 生成牌堆。
   *
   * 思路：先把每层所有合法的整数格坐标收集成候选池（每层各算各的，
   *       因为不同层放在同一个格坐标是正常叠放），
   *       再全局按「缺牌最多的那层优先」来挑，保证每层都是精确的 18 张。
   *
   * 挑位置的打分（只影响好不好看，不影响玩法）：
   *   ① 现在露在外面的格数（越露越多分越高，保证牌看得见）
   *   ② 本层内周围空隙多不多（不跟本层别的牌挤在一起）
   *   ③ 离棋盘中心的距离（越近越好，塔形更稳）
   * ========================================================================*/

  /* ---------- 按份额把一个层的额度切成金字塔形 ----------
   * 越往上（层号越大）分到的张数越少：下面铺得密、上面叠得厚，
   * 上层牌自然压住下层牌，开局露出来的可点张数就少了。
   * tilt 越大越「上重下轻」，开局越紧。 */
  function pyramidQuota(total, layers, caps, tilt) {
    const ideal = [];
    for (let L = 1; L <= layers; L++) ideal.push(Math.pow(1 - tilt, L - 1));

    const quota = [];
    let budget = total;
    for (let L = 1; L <= layers; L++) {
      let left = 0;
      for (let j = L - 1; j < layers; j++) left += ideal[j];
      const share = (ideal[L - 1] / left) * budget;
      const want = Math.min(Math.round(share), caps[L - 1], budget);
      quota.push(Math.max(0, want));
      budget -= quota[L - 1];
    }
    // 还有额度的层把剩下的吸收掉
    for (let pass = 0; pass < 3; pass++) {
      for (let L = 1; L <= layers && budget > 0; L++) {
        const room = caps[L - 1] - quota[L - 1];
        if (room <= 0) continue;
        const add = Math.min(room, budget);
        quota[L - 1] += add;
        budget -= add;
      }
    }
    return quota;
  }

  /* ---------- 按给定的每层张数，把牌摆到 24×24 的整数格棋盘上 ----------
   * 从【最上面一层往下摆】：摆到第 L 层时，所有会压住它的牌都已经摆好，
   * 直接检查「这张放下去还剩几格露着」就行，永远不会出现谁也看不见的牌。
   * 返回数组的顺序 = 摆放顺序，它的逆序就是一条天然合法的点击顺序。 */
  function buildLayout(level, pools, quota) {
    const layers = level.layers;
    const total = level.total;
    const shrink = typeof level.shrink === 'number' ? level.shrink : 2;
    const board = [];

    for (let L = layers; L >= 1; L--) {
      const pool = pools[L - 1] || [];
      let want = quota[L - 1];
      let placedThisLayer = 0;
      let minVis = 6; // 「至少露几格」的标准，位置不够用时会逐级放宽

      while (placedThisLayer < want) {
        let chosen = null, chosenScore = -Infinity;
        for (let i = 0; i < pool.length; i++) {
          const c = pool[i];
          if (c.taken) continue;

          // 上面几层已经摆好了，这张放下去自己还剩几格露着？
          // 同时也别把已经摆好的牌（同层或下面几层）压得看不见。
          const chk = checkPlacement(c.x, c.y, L, board, minVis, 3);
          if (!chk.ok) continue;

          const score = (c.stars + 1) * 300
                      + Math.min(chk.selfVisible, TILE_CELLS * TILE_CELLS) * 20
                      - Math.floor(c.dist)
                      + Math.random() * 25; // 一点点随机，让每局长得都不一样
          if (score > chosenScore) { chosenScore = score; chosen = c; }
        }

        if (chosen) {
          chosen.taken = true;
          board.push({ x: chosen.x, y: chosen.y, level: L });
          placedThisLayer++;
          continue;
        }

        if (minVis > 4) { minVis -= 2; continue; } // 放宽标准再试（最低 4 格，保证还认得出图案）
        break; // 这一层真没位置了，少摆几张，总张数由下面兜底补齐
      }
    }

    // 兜底补满，保证总张数精确（少一张就会有两种图案凑不成 3 张）
    let guard = 0;
    while (board.length < total && guard++ < 20000) {
      let put = false;
      for (let L = layers; L >= 1 && !put; L--) {
        const range = layerRange(L - 1, shrink) || { lo: 0, hi: GRID_MAX };
        for (let attempt = 0; attempt < 400 && !put; attempt++) {
          const nx = randInt(range.lo, range.hi);
          const ny = randInt(range.lo, range.hi);
          let dup = false;
          for (let k = 0; k < board.length; k++) {
            if (board[k].level === L && board[k].x === nx && board[k].y === ny) { dup = true; break; }
          }
          if (dup) continue;
          if (!checkPlacement(nx, ny, L, board, 1, 1).ok) continue;
          board.push({ x: nx, y: ny, level: L });
          put = true;
        }
      }
      if (!put) break; // 实在放不下了（层数 / 张数配置太极端）
    }

    // 排成真正的「从下到上」顺序，并算好「压住我的牌」名单
    const perLevelCount = {};
    for (let i = 0; i < board.length; i++) {
      const t = board[i];
      perLevelCount[t.level] = (perLevelCount[t.level] || 0) + 1;
      t.z = perLevelCount[t.level];
    }
    board.sort(function (a, b) {
      if (a.level !== b.level) return a.level - b.level;
      return a.z - b.z;
    });
    for (let i = 0; i < board.length; i++) {
      const t = board[i];
      t.id = i;              // id = 下标，computeBlocked 直接比下标就知道谁压谁
      t.z = i;
      t.kind = null;
      t.blockedBy = [];
      t.inSlot = false;
    }
    computeBlocked(board);
    return board;
  }

  // 数一下开局有几张牌「能点」（没有任何牌压着它）
  function countOpening(board) {
    let n = 0;
    for (let i = 0; i < board.length; i++) if (board[i].blockedBy.length === 0) n++;
    return n;
  }

  /**
   * 生成牌堆。
   *
   * 分两大块：
   *   ① 摆牌（buildLayout）：按金字塔份额把牌摆到 24×24 的整数格棋盘上；
   *   ② 贴图案（dealSolvable / buildTileKinds）：决定这一局能不能解、难不难。
   *
   * 「开局能点几张」由关卡的 opening 控制：反复调整金字塔的倾斜度重新摆牌，
   * 挑一个最接近目标的方案。倾斜度越大 → 上层压得越厚 → 起手越紧。
   */
  /* ==========================================================================
   * 动态难度：两个档，按「上一局有没有复活过」切换
   * --------------------------------------------------------------------------
   * 规则（一句话）：
   *   上一局复活过  → 本局用【简单档】
   *   上一局没复活  → 本局用【难档】
   *
   * 恰好对上这两条体验路径：
   *   A难（复活）→ B简单（没复活）→ C难    ← 顺利过了就回到难档
   *   A难（复活）→ B简单（又复活）→ C简单  ← 还卡着就继续放水
   *
   * 为什么能这么简：一局只能复活一次（revive.times = 1），
   * 所以「本局复活次数」只有 0 和 1 两种值，不需要更复杂的阶梯。
   *
   * 两个档分别怎么发牌：
   *   难档  → 纯随机贴图，不保证有解（实测「设计路线可通率」为 0%）
   *   简单档 → 前半段同款扎堆（前 30% 的牌点两下就能凑齐，让玩家先痛快消一段），
   *           后半段打散；整局按设计路线铺，保证走得通
   *
   * 【实测结论，别走回头路】
   *   最初想做「按概率决定这局保不保证有解」，实测是错的：
   *   dealRamp 无论传什么参数都必然返回一条走得通的路线，所以
   *   「把同款打散」根本不等于「不保证有解」；而拿掉设计好的路线
   *   才是真的难（会算的玩家通关率 23% → 14%）。
   *   所以「难」= 纯随机贴图，「简单」= 有铺垫 + 保证可解，是两个独立的旋钮。
   * ========================================================================*/
  const GEN_HARD = 0;       // 难档：纯随机贴图，不保证有解
  const GEN_EASY = 1;       // 简单档：前段有铺垫 + 保证可解

  function genModeForUsedRevives(usedRevives, level) {
    const table = (level && level.difficulty && level.difficulty.byRevives) || null;
    if (table && table.length) {
      const idx = Math.min(usedRevives, table.length - 1);
      const v = table[idx];
      if (typeof v === 'number') {
        // 数组里的值就是档位号：0 = 难档，1 = 简单档
        return (v >= 1) ? GEN_EASY : GEN_HARD;
      }
    }
    // 默认规则：复活过就简单，没复活就难
    return (usedRevives >= 1) ? GEN_EASY : GEN_HARD;
  }

  /* --------------------------------------------------------------------------
   * 生成一局牌。外面这层负责【校验 + 重试】：
   * --------------------------------------------------------------------------
   * 为什么需要重试：摆牌时如果某层位置不够，兜底补满会静默失败
   * （buildLayout 里那句 if (!put) break），牌堆就会少几张 ——
   * 少一张都会有两种图案凑不成 3 张，那局就永远消不完。
   * 这个坑以前没暴露，是因为「保证可解」那条路最后总会把长度补齐；
   * 换成「纯随机贴图」之后它就露出来了（实测 150 局里有 2 局只有 118 张）。
   * 与其去猜各种参数组合，不如生成完直接【验】一遍，不合格就重来。
   * ------------------------------------------------------------------------ */
  function generateBoard(level) {
    let board = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      board = buildBoardOnce(level);
      if (boardExact(board, level)) return board;
    }
    // 极端情况下重试也没凑够（比如层数/张数配置本身太苛刻），
    // 至少别崩：把结果原样返回，游戏照常能开（只是这局可能消不完）。
    console.warn('[发牌] 6 次都没生成出精确张数的牌堆，本局可能无法消完', board && board.length, '/', level.total);
    return board;
  }

  // 牌堆是否「精确合格」：张数对得上，且每种图案的张数都是 3 的倍数
  function boardExact(board, level) {
    if (!board || board.length !== level.total) return false;
    const cnt = {};
    for (let i = 0; i < board.length; i++) {
      cnt[board[i].kind] = (cnt[board[i].kind] || 0) + 1;
    }
    const ids = Object.keys(cnt);
    if (ids.length !== level.tilePool.length) return false;
    for (let i = 0; i < ids.length; i++) {
      if (cnt[ids[i]] % 3 !== 0) return false;
    }
    return true;
  }

  function buildBoardOnce(level) {
    const total = level.total;
    const layers = level.layers;
    const shrink = typeof level.shrink === 'number' ? level.shrink : 2;

    /* 这一局的难度档：看【上一局有没有复活过】。
     * 注意别读成本局的 reviveUsed —— 那个值会在开局时清零，
     * 而本局还没开始玩，复活次数必然是 0，读它就会永远走难档。
     * 防御式读取是为了 node 里做算法自检时不报错（那时 game 还没建起来）。 */
    const lastRevived = (typeof game !== 'undefined' && game && game.lastRoundRevived) ? 1 : 0;
    const mode = genModeForUsedRevives(lastRevived, level);

    /* ---------- 第一步：每层各自建候选池（全是整数格坐标） ---------- */
    const pools = [];
    for (let L = 1; L <= layers; L++) {
      const range = layerRange(L - 1, shrink);
      if (!range) { pools.push([]); continue; }

      // 每层的错位量：第 1 层不动，上面几层按 level.offset 递增错开。
      // offset 越大 → 上层压得越狠 → 开局能点的越少（难度↑、爽感↓）。
      // 默认 1 格：牌堆高、开局可点多，手感最像原版。
      const step = (typeof level.offset === 'number') ? level.offset : 1;
      const offset = (L - 1) * step;
      const cands = pickPositions(range.lo, range.hi, offset);
      const pool = [];
      for (let i = 0; i < cands.length; i++) {
        const c = cands[i];

        // 星星数 = 这个位置周围「半个身位」以外还有多少地方是空的。
        // 空位越多，说明这张牌不跟本层别的牌挤在一起，画面上越清楚。
        let free = 0;
        for (let dx = -3; dx <= 3; dx += 3) {
          for (let dy = -3; dy <= 3; dy += 3) {
            if (dx === 0 && dy === 0) continue;
            const nx = c.x + dx, ny = c.y + dy;
            if (nx < range.lo || nx > range.hi || ny < range.lo || ny > range.hi) { free++; continue; }
            let taken = false;
            for (let k = 0; k < cands.length; k++) {
              if (cands[k].x === nx && cands[k].y === ny) { taken = true; break; }
            }
            if (!taken) free++;
          }
        }

        const dxc = (c.x + TILE_CELLS / 2) - BOARD_CELLS / 2;
        const dyc = (c.y + TILE_CELLS / 2) - BOARD_CELLS / 2;
        pool.push({
          x: c.x,
          y: c.y,
          stars: (free >= 7 ? 2 : (free >= 5 ? 1 : 0)),
          dist: Math.sqrt(dxc * dxc + dyc * dyc),
          taken: false
        });
      }
      shuffleArray(pool); // 同分随机，保证每局长得都不一样
      pools.push(pool);
    }

    /* ---------- 第二步：挑一个「开局可点张数」合适的摆法 ----------
     * opening 是【上限】：开局能点多少张直接决定爽感，所以宁可多一点。
     * 越斜（tilt 越大）上层叠得越厚、开局能点的越少；这里从最斜的开始试，
     * 一路放宽到接近平均，取第一个不超过上限的摆法 —— 这样牌堆尽量「塔」，
     * 开局又不会太抠。 */
    const caps = [];
    for (let L = 1; L <= layers; L++) caps.push((pools[L - 1] || []).length);

    const maxOpening = (typeof level.opening === 'number' && level.opening > 0) ? level.opening : Infinity;
    const tiltList = [0.75, 0.6, 0.5, 0.45, 0.4, 0.3, 0.2, 0.1, 0.05];
    let best = null;

    for (let attempt = 0; attempt < tiltList.length; attempt++) {
      const quota = pyramidQuota(total, layers, caps, tiltList[attempt]);
      const layout = buildLayout(level, pools, quota);
      const opening = countOpening(layout);

      // 不超过上限就是合格；第一个合格的（最斜的）就是我们要的
      if (opening <= maxOpening) { best = { board: layout, opening: opening, quota: quota, tilt: tiltList[attempt] }; break; }
      // 万一所有倾斜度都超上限，就留一个「可点最少」的兜底
      if (!best || opening < best.opening) best = { board: layout, opening: opening, quota: quota, tilt: tiltList[attempt] };

      // 候选位置被用过，下一轮要重置
      for (let L = 1; L <= layers; L++) {
        const pool = pools[L - 1] || [];
        for (let i = 0; i < pool.length; i++) pool[i].taken = false;
      }
    }

    const board = best.board;
    board.opening = best.opening;
    board.quota = best.quota.slice();
    board.tilt = best.tilt;

    /* ---------- 第三步：贴图案（三种发牌方式） ----------
     * 贴的顺序很关键：上面是「从最上层往下摆」的，所以
     *   board 的摆放顺序反过来，就是一条天然合法的点击顺序
     *   （每张被点时，压着它的牌都已经点走了）。
     *
     * 'solvable-revive'：保证可解，而且必定要复活一次（推荐，难度和爽感兼顾）。
     * 'solvable'       ：保证可解，不强制复活。
     * 'random'         ：Fisher-Yates 洗牌后随机贴（第一版做法，不保证有解）。 */
    const encode = level.encode || 'random';
    const kindCount = level.tilePool.length;
    const reviveCfg = level.revive || { times: 0, remove: 3 };
    let dealPeak = 0, dealRevives = 0;

    // 把一条「点击顺序」贴到 board 上（摆放顺序是它的逆序）
    const applyDeal = function (deal) {
      for (let k = 0; k < board.length; k++) {
        const solveIndex = board.length - 1 - k;   // 第 k 张被摆的牌 = 第几手点它
        const group = deal.typeAt[solveIndex];
        board[k].kind = level.tilePool[deal.groupKind[group]].id;
      }
    };

    if (encode === 'solvable-revive' && reviveCfg.times > 0 && level.forceRevive !== false) {
      // 保证可解 + 必定复活一次
      let deal = null;
      for (let attempt = 0; attempt < 20 && !deal; attempt++) {
        deal = dealForcedRevive(total, kindCount, level.slots || 6, reviveCfg.remove || 3);
      }
      if (deal) {
        dealPeak = deal.peak;
        dealRevives = deal.revives;
        applyDeal(deal);
      } else {
        // 算不出来就退回不强制复活的版本，至少这一局能玩
        const fallback = dealSolvable(total, kindCount, level.slots || 6, Math.max(3, (level.slots || 6) - 2));
        if (fallback) { dealPeak = fallback.peak; applyDeal(fallback); }
        else {
          const allKinds = buildTileKinds(level);
          for (let i = 0; i < board.length; i++) board[i].kind = allKinds[i % allKinds.length];
        }
      }
    } else if (encode === 'ramp') {
      /* 按难度档铺牌。两档的区别：
       *   GEN_HARD → 纯随机贴图：牌堆照样按规则叠好，但图案完全打乱，
       *              不保证有解（实测设计路线可通率 0%）
       *   GEN_EASY → 前半段同款扎堆 + 整局按设计路线铺：好解、开局痛快 */
      const easyRatio = (typeof level.easyRatio === 'number') ? level.easyRatio : 0.5;
      const hardOcc = (typeof level.hardOccupancy === 'number') ? level.hardOccupancy : ((level.slots || 7) - 1);

      /* 难档：纯随机贴图。
       * 为什么不走 dealRamp：它必然返回一条合法通关路线，
       * 于是「设计路线可通率」就是 100%，那就等于保证可解了，
       * 跟「难」不是一回事 —— 想要真难就必须放弃设计路线。 */
      if (mode === GEN_HARD) {
        /* 纯随机：只把图案随机贴到已经摆好的牌堆上。
         * 张数不变（每种还是 perKind 组），所以永远消得完，
         * 只是「能不能凑齐」全看运气 —— 这就是「不保证有解」。 */
        const allKinds = buildTileKinds(level);
        shuffleArray(allKinds);
        for (let i = 0; i < board.length; i++) board[i].kind = allKinds[i % allKinds.length];
        board.solveGuaranteed = false;
        // 档位名分开写，方便在控制台看出「这次用的是哪一档」
        board.mode = 'hard';   // 难档：纯随机，不保证有解
        board.difficultyForLastRevive = lastRevived;
      } else {
        /* 简单档：走 ramp —— 前 easyRatio 比例的牌同款扎堆（先痛快消一段），
         * 后面打散；并且整局按设计路线铺，保证走得通。 */
        const requireSolve = true;
        let deal = null;
        for (let attempt = 0; attempt < 8 && !deal; attempt++) {
          deal = dealRamp(total, kindCount, level.slots || 7, easyRatio,
                          hardOcc - (attempt > 4 ? 1 : 0), requireSolve);
        }
        if (deal) {
          dealPeak = deal.peak;
          applyDeal(deal);
          board.easyPeak = deal.easyPeak;
          board.easyEnd = deal.easyEnd;
          board.solveGuaranteed = requireSolve;
          board.mode = 'easy';   // 简单档：有铺垫 + 保证可解
        } else {
          const allKinds = buildTileKinds(level);
          shuffleArray(allKinds);
          for (let i = 0; i < board.length; i++) board[i].kind = allKinds[i % allKinds.length];
          board.solveGuaranteed = false;
          board.mode = 'hard';   // 连 ramp 都算不出来，退回纯随机
        }
        board.difficultyForLastRevive = lastRevived;
      }
    } else if (encode === 'solvable') {
      /* 目标卡槽峰值。
       * 注意：第 3 张牌是「先落进格子、再消掉」的，所以真实峰值会比目标数多 1。
       * slots - 2 正好让峰值 = 格子数 - 1，留一格余量。 */
      const targetPeak = Math.max(3, (level.slots || 6) - 2);   // 上限 - 1，留一格余量
      let deal = null;
      for (let attempt = 0; attempt < 6 && !deal; attempt++) {
        deal = dealSolvable(total, kindCount, level.slots || 6, targetPeak - (attempt > 3 ? 1 : 0));
      }
      if (deal) {
        dealPeak = deal.peak;
        applyDeal(deal);
      } else {
        // 极端参数下算不出可解路线，退回随机（至少不会崩）
        const allKinds = buildTileKinds(level);
        for (let i = 0; i < board.length; i++) board[i].kind = allKinds[i % allKinds.length];
      }
    } else {
      const allKinds = buildTileKinds(level);
      for (let i = 0; i < board.length; i++) board[i].kind = allKinds[i % allKinds.length];
    }

    /* ---------- 第四步：贴「伪装三张」诱饵 ----------
     * 这一步只改「哪个图案贴在哪张牌上」，不搬动任何一张牌、也不改张数，
     * 所以发牌器算好的通关路线依然成立；变难的只是玩家的自制力。
     * 注意：排完序以后 id 变了，得重算一遍「谁压着谁」，
     * 否则下面判断「哪张开局就能点」用的是过期名单。 */
    computeBlocked(board);
    const decoyWant = (typeof level.decoys === 'number') ? level.decoys : 0;
    const decoyMax = (typeof level.decoyMaxDanger === 'number') ? level.decoyMaxDanger : 12;
    board.decoyWant = decoyWant;
    board.decoyMade = applyDecoys(board, decoyWant, decoyMax, level.slots || 6);

    // 记下发牌信息，方便控制台统计与自检
    board.dealPeak = dealPeak;
    board.dealRevives = dealRevives;
    board.encode = encode;

    return board;
  }

  /* ==========================================================================
   * 八、游戏状态
   * ========================================================================*/
  const game = {
    levelIndex: 0,
    level: null,
    board: [],        // 牌堆（还在桌上的牌）
    slots: [],        // 下方卡槽，按点击顺序从左往右排
    over: false,      // 本局是否已结束（已弹出结束/复活弹窗）
    reviveLeft: 0,    // 还剩几次复活机会
    /* 本局复活过几次。一局只能复活一次，所以只有 0 / 1 两种值。
     * 开局时清零，复活时 +1。 */
    reviveUsed: 0,
    /* 上一局有没有复活过 —— 这个才是【决定本局难度】的开关：
     * 上一局没复活 → 本局难档；上一局复活过 → 本局简单档。
     * 它只在 startRound 里被赋值，所以一局内不会变。 */
    lastRoundRevived: false,
    /* 图鉴解锁记录：{ 物品id: true }
     * 这一份是【持久化】的 —— 开局时从 localStorage 读回来，
     * 解锁新物品时立刻写回去。所以关掉浏览器再打开，已解锁的还在，
     * 也不会再重复弹知识点提示。 */
    knowledge: {},
    /* 本局已经弹过提示的物品（只活在这一局里）。
     * 为什么要和上面分开：上面那份是「用户知道这件事」，
     * 这份是「这一局已经讲过」—— 重开一局后提示条要能重新提示
     * 新解锁的东西，但已经知道的东西永远不再重复打扰。 */
    tipShown: {},
    escapeShown: false, // 微信/QQ 引导层是否已经弹过（同一次会话只弹一次）
    dom: new Map()    // 牌 id -> DOM 节点
  };

  /* DOM 引用。用 typeof 保护是为了能在 node 里 require 做算法自检。 */
  const hasDom = (typeof document !== 'undefined');
  const stageEl       = hasDom ? document.getElementById('stage') : null;
  /* 牌的容器。桌面（#stage）有内边距用来露出木纹，
   * 所以牌不能直接塞进 stage —— 否则定位原点会偏。
   * #board 和棋盘区严格等大，牌的坐标体系不变。 */
  const boardEl       = hasDom ? document.getElementById('board') : null;
  const slotsEl       = hasDom ? document.getElementById('slots') : null;
  const levelNameEl   = hasDom ? document.getElementById('levelName') : null;
  const remainEl      = hasDom ? document.getElementById('remainCount') : null;
  const reviveEl      = hasDom ? document.getElementById('reviveCount') : null;
  const modalEl       = hasDom ? document.getElementById('modal') : null;
  const modalTitleEl  = hasDom ? document.getElementById('modalTitle') : null;
  const modalHintEl   = hasDom ? document.getElementById('modalHint') : null;
  const modalButtonEl = hasDom ? document.getElementById('modalButton') : null;

  /* 主题相关的 DOM */
  const tipbarEl        = hasDom ? document.getElementById('tipbar') : null;
  const tipTextEl       = hasDom ? document.getElementById('tipText') : null;
  const codexBtnEl      = hasDom ? document.getElementById('codexBtn') : null;
  const codexCountEl    = hasDom ? document.getElementById('codexCount') : null;
  const codexModalEl    = hasDom ? document.getElementById('codexModal') : null;
  const codexGridEl     = hasDom ? document.getElementById('codexGrid') : null;
  const codexSubEl      = hasDom ? document.getElementById('codexSub') : null;
  const codexCloseBtnEl = hasDom ? document.getElementById('codexCloseBtn') : null;
  const detailModalEl   = hasDom ? document.getElementById('detailModal') : null;
  const detailPicEl     = hasDom ? document.getElementById('detailPic') : null;
  const detailTitleEl   = hasDom ? document.getElementById('detailTitle') : null;
  const detailKnowEl    = hasDom ? document.getElementById('detailKnowledge') : null;
  const detailBodyEl    = hasDom ? document.getElementById('detailBody') : null;
  const detailCloseEl   = hasDom ? document.getElementById('detailCloseBtn') : null;
  const quizBoxEl       = hasDom ? document.getElementById('quizBox') : null;
  const quizQuestionEl  = hasDom ? document.getElementById('quizQuestion') : null;
  const quizOptionsEl   = hasDom ? document.getElementById('quizOptions') : null;
  const quizResultEl    = hasDom ? document.getElementById('quizResult') : null;

  /* 微信 / QQ 引导遮罩 */
  const escapeOverlayEl  = hasDom ? document.getElementById('escapeOverlay') : null;
  const escapeTitleEl    = hasDom ? document.getElementById('escapeTitle') : null;
  const escapeLeadEl     = hasDom ? document.getElementById('escapeLead') : null;
  const escapeHowtoEl    = hasDom ? document.getElementById('escapeHowto') : null;
  const escapeUrlEl      = hasDom ? document.getElementById('escapeUrl') : null;
  const escapeHintEl     = hasDom ? document.getElementById('escapeHint') : null;
  const escapeCopyBtnEl  = hasDom ? document.getElementById('escapeCopyBtn') : null;
  const escapeSkipBtnEl  = hasDom ? document.getElementById('escapeSkipBtn') : null;

  /* ==========================================================================
   * 八点五、在微信 / QQ 内置浏览器里打开时的引导
   * --------------------------------------------------------------------------
   * 先说清楚现实情况，免得做无用功：
   *   微信和 QQ 的内置浏览器是【故意】不让网页自动跳到外部浏览器的 ——
   *   iOS 上 weixin:// 这类 scheme 根本调不动；Android 上微信还会屏蔽
   *   非白名单域名的 scheme 调用。网上那些「点击链接自动跳浏览器」的方案，
   *   今天可能半能用、明天微信一更新就废，不能依赖。
   * 所以这里的做法是：
   *   ① 识别出确实在微信 / QQ 里 → 弹一个全屏引导层；
   *   ② 告诉用户「点右上角 ··· → 在浏览器中打开」这个唯一可靠的办法；
   *   ③ 在 QQ 安卓上顺手再试一次 mttbrowser:// 唤起（失败自动退化成文字引导）；
   *   ④ 用户点过「就在这儿玩」就不再打扰（存 sessionStorage）。
   *
   * 注意：游戏本身在微信里也能正常玩（布局差异已经修掉了），
   * 这一层只是让想要「全屏、不被工具栏挤」的人知道怎么切过去。
   * ========================================================================*/

  // 识别当前所在的内置浏览器
  function detectInAppBrowser() {
    if (!hasDom) return null;
    const ua = navigator.userAgent || '';
    if (/MicroMessenger/i.test(ua)) return 'wechat';
    if (/\bQQ\/|QQBrowser|TencentTraveler/i.test(ua)) return 'qq';
    return null;
  }

  function escapeAlreadyHandled() {
    try {
      return sessionStorage.getItem('xxy_escape') === '1';
    } catch (e) {
      return false;   // 隐私模式下 sessionStorage 可能不可用，那就每次都问
    }
  }

  function markEscapeHandled() {
    try { sessionStorage.setItem('xxy_escape', '1'); } catch (e) { /* 忽略 */ }
  }

  /* 复制链接到剪贴板。
   * 微信 / QQ 的内置浏览器对剪贴板有额外限制，所以分三级降级：
   *   ① navigator.clipboard.writeText（需要 HTTPS + 用户手势，可能被拒）
   *   ② 老办法 execCommand('copy') + 临时 textarea（兼容性最好）
   *   ③ 都失败 → 把链接显示出来，让用户长按选择复制
   * 返回 'ok' / 'manual'，调用方据此给不同的提示。 */
  function copyTextToClipboard(text) {
    const selectUrlText = function () {
      if (!escapeUrlEl) return;
      try {
        const range = document.createRange();
        range.selectNodeContents(escapeUrlEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) { /* 忽略 */ }
    };

    /* 复制这件事在「内置浏览器」里没有百分之百可靠的办法，所以：
     *   ① 同步的老办法 execCommand('copy') —— 立刻有结果，成功就提示成功；
     *   ② 同时【并行】发起现代接口 navigator.clipboard.writeText ——
     *      它要是成功了就覆盖成成功提示（HTTPS 页面上它一般都能成）；
     *   ③ 800ms 内两边都没成 → 明确告诉用户复制失败，并把链接【选中】，
     *      用户长按就能手动复制。
     * 要点：绝不能让用户点了按钮却毫无反应 —— 每种结局都有提示。 */
    let shown = false;
    const showOk = function () {
      if (shown) return;
      shown = true;
      setEscapeHint('已复制，去浏览器地址栏粘贴就能打开', 'ok');
    };
    const showManual = function () {
      if (shown) return;
      shown = true;
      selectUrlText();
      setEscapeHint('复制没成功，请长按上面那行链接手动复制', 'warn');
    };

    // ① 同步老办法
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);   // iOS 必须显式设范围
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) { showOk(); return; }
    } catch (e) { /* 继续走下面的路 */ }

    // ② 并行试现代接口
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(text).then(showOk, function () { /* 交给超时兜底 */ });
      } catch (e) { /* 忽略 */ }
    }

    // ③ 兜底：给足时间，然后明确告知
    setTimeout(showManual, 800);
  }

  function setEscapeHint(text, kind) {
    if (!escapeHintEl) return;
    escapeHintEl.textContent = text;
    escapeHintEl.className = 'escape-hint' + (kind ? ' ' + kind : '');
  }

  // 弹出引导层（只有确认识别到微信/QQ、且本次会话没处理过才弹）
  function maybeShowEscapeGuide() {
    const where = detectInAppBrowser();
    if (!where) return false;
    if (escapeAlreadyHandled()) return false;
    if (!escapeOverlayEl) return false;
    if (game.escapeShown) return false;
    game.escapeShown = true;

    const isQQ = (where === 'qq');
    const here = location.href;

    if (escapeTitleEl) escapeTitleEl.textContent = '建议用浏览器打开';
    if (escapeLeadEl) {
      escapeLeadEl.textContent = (isQQ ? '这里是 QQ 自带的浏览器' : '这里是微信自带的浏览器') +
        '，页面会被它的工具栏挤矮一点。换个浏览器打开会更舒服（全屏、不挤）。';
    }
    /* 不再教「点右上角 ···」—— 各家版本菜单位置不一样，
     * QQ 有些版本右上角根本没有三点，教了反而误导。
     * 改成「复制链接 → 打开浏览器 → 粘贴」，这条路不依赖任何菜单。 */
    if (escapeHowtoEl) {
      escapeHowtoEl.textContent = '复制下面的链接，打开你手机上的浏览器，粘贴到地址栏就能看：';
    }
    if (escapeUrlEl) escapeUrlEl.textContent = here;
    setEscapeHint('', '');
    if (escapeCopyBtnEl) escapeCopyBtnEl.textContent = '复制链接';

    escapeOverlayEl.classList.add('show');
    return true;
  }

  function closeEscapeGuide() {
    if (escapeOverlayEl) escapeOverlayEl.classList.remove('show');
  }

  /* ==========================================================================
   * 九、西迁知识点提示条
   * --------------------------------------------------------------------------
   * 消掉一组牌时，在底部弹一条短提示，3 秒后自动收起来 —— 不打断操作，
   * 也不弹窗（弹窗会挡住牌堆，连消几组的时候特别烦）。
   * ========================================================================*/
  let tipTimer = null;
  function showTip(text) {
    if (!hasDom) return;
    console.log('[西迁知识点]', text);
    if (!tipbarEl || !tipTextEl) return;
    tipTextEl.textContent = text;
    tipbarEl.classList.add('show');
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(function () {
      tipbarEl.classList.remove('show');
    }, 3200);
  }

  /* 统计埋点：统一从这里调，统计脚本没加载 / 出错都不会影响游戏 */
  function track(event, times) {
    try {
      if (typeof window !== 'undefined' && window.XXYStats) window.XXYStats.track(event, times);
    } catch (e) { /* 统计绝不影响玩 */ }
  }

  /* 提示条只留给「西迁知识点」。
   * 像开局、复活这类状态信息走这里 —— 只记 console，不占提示条，
   * 否则玩家分不清哪条是历史知识、哪条是游戏状态。 */
  function logStatus(text) {
    console.log('[状态]', text);
  }

  /* ==========================================================================
   * 九点五、图鉴（收集所有西迁行囊）
   * --------------------------------------------------------------------------
   * 规则：某种物品第一次被消掉时，解锁它的知识点并弹一条提示；
   *      之后同样的知识点【不再重复弹】。
   * 图鉴里每件物品一格：有图片就显示图片，没有就显示占位色块；
   * 未解锁的是暗的 + 一个问号，点进去也不给看内容。
   * 点开已解锁的物品 → 显示图片 + 知识点 + 详细故事 + 出处。
   * ========================================================================*/

  /* --------------------------------------------------------------------------
   * 图鉴解锁记录的持久化
   * --------------------------------------------------------------------------
   * 用 localStorage 存，只存「已解锁的物品 id」数组。
   * 三处必须做防御：
   *   ① 读：隐私模式 / 微信某些 WebView 里 localStorage 可能直接抛异常；
   *      存进去的内容也可能被用户或旧版本弄坏 —— 解析失败就当没存过。
   *   ② 写：配额满或被禁用会抛异常，不能让它把游戏流程带崩。
   *   ③ 校验：只认 TILES 里真实存在的 id，别把脏数据带进来。
   * ------------------------------------------------------------------------ */
  const STORE_KEY = 'xxy_knowledge_v1';

  function loadKnowledge() {
    const got = {};
    let raw = null;
    try {
      raw = localStorage.getItem(STORE_KEY);
    } catch (e) {
      return got;      // 存储不可用（隐私模式等）→ 当成新玩家，游戏照常能玩
    }
    if (!raw) return got;
    try {
      const arr = JSON.parse(raw);
      if (Object.prototype.toString.call(arr) === '[object Array]') {
        for (let i = 0; i < arr.length; i++) {
          // 只认确实存在的物品 id，脏数据一律丢掉
          if (findTileConfig(arr[i])) got[arr[i]] = true;
        }
      }
    } catch (e) {
      return got;      // 数据坏了 → 当作没存过，不让它把游戏弄崩
    }
    return got;
  }

  function saveKnowledge() {
    const ids = [];
    for (let i = 0; i < TILES.length; i++) {
      if (game.knowledge[TILES[i].id]) ids.push(TILES[i].id);
    }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(ids));
    } catch (e) {
      // 存不进去也不影响本局游玩，只是下次打开要重新解锁
      logStatus('图鉴进度没能存下来（存储不可用）');
    }
  }

  // 一张物品的「图片」（有真图用真图，没有就用底色 + 名字占位）
  function buildTileArt(cfg, opts) {
    const o = opts || {};
    const box = document.createElement('div');
    box.className = o.cls || 'art';
    // 未解锁：灰底 + 大问号，绝不能漏出物品名字（漏了就剧透了）
    if (o.locked) {
      box.style.background = '#b8b0a2';
      const q = document.createElement('span');
      q.className = 'art-label art-locked';
      q.textContent = '？';
      box.appendChild(q);
      return box;
    }
    if (cfg.img) {
      const img = document.createElement('img');
      img.src = cfg.img;
      img.alt = cfg.label;
      img.draggable = false;
      box.appendChild(img);
    } else {
      box.style.background = cfg.color;
      const span = document.createElement('span');
      span.className = 'art-label';
      span.textContent = cfg.label;
      box.appendChild(span);
    }
    return box;
  }

  /* 取一张牌的颜色 —— 消牌时的粒子要用它上色。
   * 统一走 findTileConfig(item.kind)，和画牌面用的是同一个来源。 */
  function colorOfTile(id) {
    const it = findBoardItem(id);
    const cfg = it ? findTileConfig(it.kind) : null;
    return (cfg && cfg.color) ? cfg.color : '#e8d5a8';
  }

  /* 卡槽满了但还能凑成三张 → 说明这一手没消掉，是"落进卡槽"。
   * 这时候给一声低一点的"咚"，和"消掉"的清脆声区分开。
   * （消掉的话 resolveMatches 会立刻把三张移除，就不会满足这个条件） */
  function slotSoundIfNoClear() {
    try {
      if (game.slots.length >= game.level.slots && hasAnyTriple(game.slots)) {
        if (window.XXYFX) {
          const s = window.XXYFX.sound();
          if (s) s.slot();
        }
      }
    } catch (e) { /* 忽略 */ }
  }

  function unlockedCount() {
    let n = 0;
    for (let i = 0; i < TILES.length; i++) if (game.knowledge[TILES[i].id]) n++;
    return n;
  }

  function updateCodexBadge() {
    if (codexCountEl) codexCountEl.textContent = unlockedCount() + '/' + TILES.length;
  }

  function openCodex() {
    if (!hasDom || !codexModalEl) return;
    renderCodex();
    codexModalEl.classList.add('show');
  }

  function closeCodex() {
    if (codexModalEl) codexModalEl.classList.remove('show');
  }

  function renderCodex() {
    if (!codexGridEl) return;
    codexGridEl.innerHTML = '';
    const got = unlockedCount();
    if (codexSubEl) {
      codexSubEl.textContent = got === TILES.length
        ? '全部 ' + TILES.length + ' 件都解锁了 —— 西迁行囊完整收齐。'
        : '已解锁 ' + got + '/' + TILES.length + ' 件：消除 3 张相同物品即可解锁它的故事';
    }
    for (let i = 0; i < TILES.length; i++) {
      const cfg = TILES[i];
      const got2 = !!game.knowledge[cfg.id];
      const cell = document.createElement('div');
      cell.className = 'codex-cell' + (got2 ? '' : ' locked');
      cell.dataset.kind = cfg.id;

      cell.appendChild(buildTileArt(cfg, { cls: 'codex-art', locked: !got2 }));

      const name = document.createElement('div');
      name.className = 'codex-name';
      name.textContent = got2 ? cfg.label : '？';
      cell.appendChild(name);

      if (got2) {
        cell.addEventListener('click', function () { openDetail(cfg.id); });
      }
      codexGridEl.appendChild(cell);
    }
  }

  // 打开某件物品的详情
  function openDetail(kindId) {
    if (!hasDom || !detailModalEl) return;
    const cfg = findTileConfig(kindId);
    const story = TILE_STORY[kindId] || {};
    if (!cfg || !game.knowledge[kindId]) return;

    if (detailPicEl) {
      detailPicEl.innerHTML = '';
      detailPicEl.appendChild(buildTileArt(cfg, { cls: 'detail-art' }));
    }
    if (detailTitleEl) detailTitleEl.textContent = cfg.label;
    if (detailKnowEl) detailKnowEl.textContent = story.knowledge || '';
    if (detailBodyEl) {
      detailBodyEl.textContent = (story.body || '') +
        (story.source ? '\n\n（' + story.source + '）' : '');
    }
    detailModalEl.classList.add('show');
  }

  function closeDetail() {
    if (detailModalEl) detailModalEl.classList.remove('show');
  }

  /**
   * 某一组牌被消掉时调用。
   * 同一种物品只讲一次：第一次消掉它时弹提示 + 解锁图鉴；
   * 之后不管消多少次都不再弹。
   */
  function onKindCleared(kindId) {
    if (!kindId) return;

    const alreadyKnown = !!game.knowledge[kindId];   // 用户以前就解锁过（跨会话）
    const alreadyTipped = !!game.tipShown[kindId];   // 这一局已经弹过提示

    if (!alreadyKnown) {
      // 第一次解锁：立刻写进本地记录，这样即使马上关掉页面也不会丢
      game.knowledge[kindId] = true;
      saveKnowledge();
      updateCodexBadge();
      track('codex');    // 统计：图鉴解锁次数（只记第一次，重复解锁不记）
    }

    // 提示条只在「这一局首次消掉它」时弹。
    // 已经解锁过的（比如上次玩就收齐了）不再重复打扰，图鉴里照样是亮的。
    if (alreadyTipped) return;
    game.tipShown[kindId] = true;
    const story = TILE_STORY[kindId] || {};
    const cfg = findTileConfig(kindId);
    showTip((cfg ? cfg.label : kindId) + '：' + (story.knowledge || ''));
  }

  /* ==========================================================================
   * 九点六、答题复活
   * --------------------------------------------------------------------------
   * 底栏塞满时不直接判死，而是给一道西迁知识题：
   *   答对 → 复活（移出底栏最后几张），继续打
   *   答错 → 这局结束，但立刻能再来一局
   * 题库在 QUIZ_BANK 里，想加题往那儿加就行。
   * ========================================================================*/
  let quizState = null;   // { item, answered }

  function pickQuiz() {
    if (!QUIZ_BANK.length) return null;
    // 先随机抽一道；同一个题库用过就继续随机（题多了也不会总是同一条）
    return QUIZ_BANK[Math.floor(Math.random() * QUIZ_BANK.length)];
  }

  function renderQuiz(item) {
    if (!hasDom) return;
    if (quizBoxEl) quizBoxEl.hidden = false;
    if (quizResultEl) quizResultEl.textContent = '';
    if (quizQuestionEl) quizQuestionEl.textContent = item.q;
    if (!quizOptionsEl) return;
    quizOptionsEl.innerHTML = '';
    for (let i = 0; i < item.options.length; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = item.options[i];
      btn.dataset.index = String(i);
      btn.addEventListener('click', onQuizAnswer);
      quizOptionsEl.appendChild(btn);
    }
  }

  function clearQuiz() {
    if (hasDom && quizOptionsEl) quizOptionsEl.innerHTML = '';
    if (quizBoxEl) quizBoxEl.hidden = true;
    if (quizResultEl) quizResultEl.textContent = '';
    quizState = null;
  }

  function onQuizAnswer(ev) {
    if (!quizState || quizState.answered) return;
    const btn = ev.currentTarget;
    const picked = Number(btn.dataset.index);
    const item = quizState.item;
    quizState.answered = true;

    // 把所有选项锁住，并标出对错
    if (quizOptionsEl) {
      const all = quizOptionsEl.querySelectorAll('.quiz-option');
      for (let i = 0; i < all.length; i++) {
        const b = all[i];
        const idx = Number(b.dataset.index);
        b.classList.add('locked');
        if (idx === item.answer) b.classList.add('right');
        else if (idx === picked) b.classList.add('wrong');
      }
    }

    const right = (picked === item.answer);
    if (quizResultEl) {
      quizResultEl.textContent = (right ? '答对了！' : '答错了。') + (item.explain || '');
      quizResultEl.classList.add('show');
    }

    // 把主按钮变成下一步：答对了才是「复活继续」，答错了是「再来一局」
    if (modalButtonEl) {
      if (right) {
        modalButtonEl.textContent = '复活，继续';
        modalButtonEl.dataset.action = 'revive';
      } else {
        modalButtonEl.textContent = '再来一局';
        modalButtonEl.dataset.action = 'restart';
      }
      modalButtonEl.disabled = false;
    }
  }

  /* ==========================================================================
   * 十、渲染层（DOM + CSS 定位）
   * ========================================================================*/

  /* --------------------------------------------------------------------------
   * 量出「真实能用的视口高度」，写进 CSS 变量 --vh。
   * 为什么非要自己量：手机自带浏览器和 QQ/微信内置 WebView 对「视口高度」的
   * 上报值能差几十像素。页面布局里凡是靠高度撑开的地方（比如 body 的最小高度），
   * 都会因为这个差值把「重新开始」按钮推到不同位置 —— 一个贴着小字、一个掉到底部。
   *
   * 做法：
   *   ① 优先用 visualViewport.height（真正可见的那块）；
   *   ② 每次尺寸变化后重新采样一小段时间，取其中的【最大值】：
   *      浏览器工具栏收起后的高度才是真正可用的高度，
   *      工具栏还占地方时量到的偏小值会被自动忽略。
   *   注意每次采样都要清零，不能沿用上一次的读数 ——
   *   横竖屏切换时高度会变小，沿用旧值会算出虚高的布局。
   * ------------------------------------------------------------------------ */
  let vhPeak = 0;         // 本轮采样里的最大值（拿去做布局的就是它）
  let vhSampling = false;

  function rawViewportHeight() {
    if (!hasDom) return 0;
    let h = 0;
    if (window.visualViewport && window.visualViewport.height) {
      h = window.visualViewport.height;
    }
    if (!h) h = window.innerHeight || document.documentElement.clientHeight || 0;
    return h;
  }

  function takeHeightSample() {
    const h = rawViewportHeight();
    if (h > vhPeak) vhPeak = h;
    if (vhPeak > 0) document.documentElement.style.setProperty('--vh', vhPeak + 'px');
    return vhPeak;
  }

  // 重新采样：先把上一轮读数清零，再在接下来几百毫秒里挑最大的那个
  function sampleViewportHeight() {
    if (!hasDom) return;
    vhPeak = 0;
    takeHeightSample();
    if (vhSampling) return;
    vhSampling = true;
    const started = Date.now();
    const step = function () {
      takeHeightSample();
      if (Date.now() - started < 500) {
        if (window.requestAnimationFrame) requestAnimationFrame(step);
        else setTimeout(step, 60);
      } else {
        vhSampling = false;
        applySize();          // 采样结束，用最终的高度重新排一次
      }
    };
    if (window.requestAnimationFrame) requestAnimationFrame(step);
    else setTimeout(step, 60);
  }

  // 根据视口大小算出一格多少像素，写进 CSS 变量，保证不出现横向滚动条
  function applySize() {
    if (!hasDom) return;
    const slotCount = game.level ? game.level.slots : 7;

    /* 牌堆外圈「桌沿」的宽度（CSS 里叫 --stage-pad）。
     * 桌面要有内边距才能露出木纹，但这份宽度必须在算棋盘尺寸时就扣掉，
     * 否则 #stage 会比可用宽度宽出一圈，手机上出现横向滚动条。 */
    const stagePad = 14;
    const availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 16 - stagePad * 2;

    /* 高度要留够：顶部那行 + 牌堆 + 卡槽 + 旅程条 + 主题小字。
     * 底部按钮已经去掉了，所以不再扣它的高度 ——
     * 省下来的空间还给棋盘，牌就大一点。 */
    const topEl = document.getElementById('topBar');
    const barEl = document.getElementById('slotsBar');
    const subEl = document.getElementById('subtitle');
    const hTop = topEl ? topEl.offsetHeight : 36;
    const hBar = barEl ? barEl.offsetHeight : 92;
    const hSub = subEl ? subEl.offsetHeight : 24;
    const vh = vhPeak || window.innerHeight || 800;
    const availH = Math.max(220, vh - hTop - hBar - hSub - 10);

    /* 一格多少像素：宽和高都要放得下。
     * 关键点：正常情况下【宽度】是那个更紧的限制（棋盘和屏幕一样宽），
     * 于是牌堆尺寸只取决于屏幕宽度 —— 而各个浏览器报的宽度是一样的，
     * 从根子上避免了「换个浏览器牌堆就变大变小」。
     * 只有当屏幕特别矮时，高度才会成为限制，那时才按高度缩。 */
    const cellByWidth = (availW - 2) / BOARD_CELLS;
    const cellByHeight = availH / BOARD_CELLS;
    const cell = Math.max(10, Math.floor(Math.min(cellByWidth, cellByHeight)));
    const boardPx = cell * BOARD_CELLS;

    const root = document.documentElement;
    root.style.setProperty('--cell', cell + 'px');
    root.style.setProperty('--board', boardPx + 'px');
    /* 桌沿宽度交给 CSS 用（桌面 padding），和上面扣掉的值保持一致 */
    root.style.setProperty('--stage-pad', stagePad + 'px');
    root.style.setProperty('--slot', cell + 'px');
    root.style.setProperty('--slots', String(slotCount));

    // 卡槽里一张牌的大小 = 3 个格子；再保证 7 格能塞进屏幕宽度
    const gapPx = 4, padPx = 14;
    const maxSlotTileByWidth = Math.floor((availW - gapPx * (slotCount - 1) - padPx) / slotCount);
    const slotTile = Math.max(24, Math.min(cell * TILE_CELLS, maxSlotTileByWidth));
    root.style.setProperty('--slot-tile', slotTile + 'px');

    // 牌上的文字大小跟着格子走。
    // 一张牌宽 3 格，想让「行李箱」这种三个字的名字排成一行，
    // 字号大约要 ≤ 牌宽的 1/3.4；这里再兜一个下限，太小就看不清了。
    const boardFont = Math.max(10, Math.round(cell * TILE_CELLS * 0.29));
    const slotFont = Math.max(10, Math.round(slotTile * 0.29));
    root.style.setProperty('--font-board', boardFont + 'px');
    root.style.setProperty('--font-slot', slotFont + 'px');
  }

  // 用整数格坐标给一个节点定位（「只用整数格坐标」的落地方式）
  function placeNode(node, item, inSlot) {
    const el = node;
    if (inSlot) {
      // 在卡槽里：靠 flex 排，不需要绝对定位
      el.style.position = 'relative';
      el.style.left = '';
      el.style.top = '';
      el.style.width = 'var(--slot-tile)';
      el.style.height = 'var(--slot-tile)';
      el.classList.add('in-slot');
      el.classList.remove('on-board');
    } else {
      el.style.position = 'absolute';
      el.style.left = 'calc(var(--cell) * ' + item.x + ')';
      el.style.top = 'calc(var(--cell) * ' + item.y + ')';
      el.style.width = 'calc(var(--cell) * ' + TILE_CELLS + ')';
      el.style.height = 'calc(var(--cell) * ' + TILE_CELLS + ')';
      el.classList.add('on-board');
      el.classList.remove('in-slot');
    }
    // 层号越大 z-index 越大 → 显示在越上面，和玩法里的「谁压谁」完全一致
    el.style.zIndex = String(10 + item.level * 100 + (item.z || 0));
  }

  /* 构建版本号 —— 用来判断浏览器加载的是不是最新代码。
   * 手机上缓存很顽固，出现「行为和预期不一致」时先看这个号。
   * 打开 ?debug=1 会把它显示在页面顶部。 */
  const BUILD = '2026-10-11-18';

  function findTileConfig(kindId) {
    for (let i = 0; i < TILES.length; i++) {
      if (TILES[i].id === kindId) return TILES[i];
    }
    return null;
  }

  // 造一张牌的 DOM 节点（占位素材的关键设计就在这里）
  function createTileNode(item) {
    const cfg = findTileConfig(item.kind);

    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.kind = item.kind;
    el.dataset.id = String(item.id);

    if (cfg && cfg.img) {
      /* 有插画素材：牌面直接用图铺满。
       * 加 has-img 类让 CSS 去掉内边距、把底色换成纸白 ——
       * 插画自带外形轮廓，再缩一圈会显小。 */
      el.classList.add('has-img');
      /* 把物品本色写成一个 CSS 变量 —— 牌的描边用它上色（见 .tile.has-img）。
       * 有了这一圈颜色，牌缩到 45px 时靠「颜色 + 轮廓」双通道辨认，
       * 尤其是几张插画外形接近的（讲义/老照片/家书 都是方块形状）。 */
      const inkSrc = cfg.ink || cfg.color;
      if (inkSrc) el.style.setProperty('--tile-ink', inkOf(inkSrc, 200));
      const img = document.createElement('img');
      img.className = 'tile-img';
      img.src = cfg.img;
      img.alt = cfg.label || item.kind;
      img.draggable = false;
      el.appendChild(img);
    } else {
      // 没有图片就画「color 底色的方块 + 居中的 label 文字」
      el.style.background = cfg ? cfg.color : '#888';
      const span = document.createElement('span');
      span.className = 'tile-label';
      span.textContent = cfg ? cfg.label : '?';
      el.appendChild(span);
    }

    return el;
  }

  // 整局开始时把所有牌节点一次建好（避免每次点击都重建 DOM）
  function buildTileNodes() {
    if (!hasDom) return;
    /* 兜底：万一 #board 不存在（比如浏览器还吃着旧 HTML 的缓存），
     * 就退回直接往 #stage 里塞，至少游戏能玩，不会白屏。 */
    const host = boardEl || stageEl;
    if (!host) return;
    for (let i = 0; i < game.board.length; i++) {
      const item = game.board[i];
      const el = createTileNode(item);
      el.addEventListener('click', onTileClick);
      game.dom.set(item.id, el);
      host.appendChild(el);
      placeNode(el, item, false);
    }

    /* 开局落位动画：牌按顺序从上层往下逐张落下。
     * 纯观感，所以整段包了 try —— 动效出问题绝不能影响能不能玩。 */
    try {
      if (window.XXYFX) window.XXYFX.playDrop();
    } catch (e) { /* 忽略 */ }
  }

  /* 把插画主色调到「适合做描边」的深度。
   * 为什么需要：有的插画主色接近白（比如老照片是 #d4d4d6），
   * 直接拿来描边，在纸白底上根本看不见。
   * 做法是按亮度判断，太亮的等比压暗，同时保持色相不变 ——
   * 这样"老照片"还是那个灰，只是深到能看清。
   * @param {string} hex   原始颜色
   * @param {number} minLum 最低亮度（0~255），低于它就原样返回
   */
  function inkOf(hex, minLum) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return hex;
    const v = parseInt(m[1], 16);
    let r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const floor = minLum || 150;
    if (lum <= floor) return hex;            // 已经够深，不动
    const k = floor / lum;                    // 等比压暗，色相不变
    r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
    return '#' + [r, g, b].map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  /* 把物品本色算成「淡色块」用的颜色。
   * 做法：把本色和页面底色按比例混合 —— 混得越多越淡。
   * 这样「快能点」那档既有辨识度（淡蓝=火车票、淡绿=讲义），
   * 又不会像满饱和色块那样抢眼。
   * @param {string} hex 物品本色，形如 '#e8734a'
   * @param {number} ratio 本色占多少（0~1），越小越淡
   */
  function blockTint(hex, ratio) {
    const base = [243, 236, 226];        // 页面底色（奶油色），和棋盘底一致
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return 'rgba(214, 204, 188, 1)';   // 颜色读不出来就给个中性灰
    const v = parseInt(m[1], 16);
    const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    const out = c.map(function (x, i) {
      const mixed = Math.round(x * ratio + base[i] * (1 - ratio));
      return Math.max(0, Math.min(255, mixed));
    });
    return 'rgb(' + out[0] + ',' + out[1] + ',' + out[2] + ')';
  }

  /* --------------------------------------------------------------------------
   * 刷新牌面表现：分三档，按「离能点的牌有多近」来分
   * --------------------------------------------------------------------------
   *   ① 能点   → 正常显示（原色原图案）
   *   ② 半透明 → 点不了，但压着它的牌【全都是能点的】
   *   ③ 牌背   → 其余情况。关键：只要压着它的牌里有【一张】不是能点的，
   *              它就归牌背 —— 哪怕同时还被能点的牌压着也算。
   *
   * 为什么按这个分：玩家真正关心的是「这张什么时候能轮到」。
   * 上面全是能点的牌 → 再点几下就轮到它了，所以给半透明（提醒「快了」）；
   * 上面还压着别的点不了的牌 → 隔着好几步，露出来也没用，
   * 干脆藏成牌背，画面干净（120 张的厚牌堆里，底层本来也翻不出来）。
   *
   * 实现：两遍标记，不需要递归 ——
   *   A. 先标出所有「能点」的牌；
   *   B. 再扫一遍，把「被能点的牌压着」的标成浅层；
   *   C. 分档：能点→①、浅层→②、其余→③。
   *   （一张牌的档位只取决于它的【直接压制者】能不能点，两种都判断得到，
   *     所以不存在「算不出来」的情况。）
   *
   * 注意：「能不能点」始终只看 blockedBy 是否为空，和这里怎么画无关。
   * ------------------------------------------------------------------------*/
  function updateBoard() {
    if (!hasDom) return;

    const n = game.board.length;

    /* ------------------------------------------------------------------------
     * ⚠️ 这里必须【按 id 查】，不能按数组下标查！
     * ------------------------------------------------------------------------
     * computeBlocked 往 blockedBy 里存的是【牌的 id】（lower.blockedBy.push(upper.id)）。
     * 而开局时 id 恰好等于数组下标（0,1,2…119），所以以前那版
     *   canClickArr[by[b]]
     * 看起来是对的 —— 但一旦点掉几张牌、board 数组变短，
     * 下标就和 id 脱钩了（实测点了 5 张后 115 张里有 109 张 id≠下标），
     * 再按下标去查就会读到别的牌、甚至越界，
     * 结果就是「堆叠没变，但一批牌的显示档位突然变了」。
     *
     * 所以下面统一用 id 做键：
     *   freeById    id → 这张牌现在能不能点
     *   inSlotById  id → 这张牌是不是已经进卡槽了
     * ---------------------------------------------------------------------- */
    const freeById = Object.create(null);
    const inSlotById = Object.create(null);

    // A. 标出能点的牌
    //    注意：刚点过、正在往卡槽里放的牌还留在 board 里（inSlot=1），
    //    它马上就要离开牌堆，所以【不能再算作遮挡】——
    //    否则它压着的那几张会白白晚一帧才亮起来。
    for (let i = 0; i < n; i++) {
      const item = game.board[i];
      const inSlot = (item.inSlot === 1 || item.inSlot === true);
      inSlotById[item.id] = inSlot;
      freeById[item.id] = (!inSlot && item.blockedBy.length === 0);
    }

    // B. 判断每张牌是「浅层（快能点）」还是「牌背」
    //    规则：压制者里【全都是能点的】才算浅层；
    //    只要有一张压制者不能点（或者在卡槽里），它就是牌背。
    const shallowById = Object.create(null);
    for (let i = 0; i < n; i++) {
      const item = game.board[i];
      const by = item.blockedBy;
      let allFree = (by.length > 0);
      for (let b = 0; b < by.length; b++) {
        const bid = by[b];
        if (!freeById[bid] || inSlotById[bid]) { allFree = false; break; }
      }
      shallowById[item.id] = allFree;
    }

    // C. 刷到 DOM 上
    for (let i = 0; i < n; i++) {
      const item = game.board[i];
      const el = game.dom.get(item.id);
      if (!el) continue;

      const canClick = freeById[item.id];
      const translucent = !canClick && shallowById[item.id];   // ② 快能点了
      const deep = !canClick && !shallowById[item.id];         // ③ 埋在下面

      el.classList.toggle('blocked', translucent);
      el.classList.toggle('deep-blocked', deep);
      el.setAttribute('aria-disabled', canClick ? 'false' : 'true');

      /* ⚠️ 牌面颜色是写在【内联样式】上的（见 createTileNode 里的
       * el.style.background = cfg.color），所以这里绝对不能写
       *   el.style.background = ''
       * 去「清空」—— 那会把底色一并抹掉，整副牌变白（这个坑踩过一次）。
       *
       * 取色一律通过 findTileConfig(item.kind) —— 和 createTileNode 用
       * 的是同一个来源。不要读 item.color：牌堆里存的 item 不一定带
       * color 字段，读它就会拿到 undefined，整副牌变灰。 */
      const itemCfg = findTileConfig(item.kind);
      const baseColor = (itemCfg && itemCfg.color) ? itemCfg.color : '#888';

      /* 有插画素材的牌【不写色底】—— 交给 CSS 管：
       *   能点   → 纸白底（.tile.has-img）
       *   快能点 → 纸白底 + 图案变暗（.tile.has-img.blocked）
       * 如果这里还写色底，就会变成「色块 + 插画」两层叠着，画面发闷。 */
      if (itemCfg && itemCfg.img) {
        el.style.background = '';
      } else if (canClick) {
        el.style.background = baseColor;
      } else if (translucent) {
        el.style.background = blockTint(baseColor, 0.55);
      }
      /* 牌背那一档不写内联：CSS 里 .tile.deep-blocked 带 !important，
       * 无论内联是什么都会被盖成素色牌背。 */

      el.title = canClick
        ? '可以点'
        : (translucent
          ? '被能点的牌压着，点掉上面那张就能轮到它'
          : '上面还压着好几层，暂时看不到图案');

      /* 调试模式（?debug=tier）：在牌面左上角标出档位，方便肉眼核对张数。
       * 绿=能点 黄=半透明 红=牌背。不开调试时这段完全不执行。 */
      if (game.debugTier) {
        const tag = canClick ? '0' : (translucent ? '1' : '2');
        const color = canClick ? '#1f9d3a' : (translucent ? '#e8a600' : '#d0342c');
        el.dataset.tier = tag;
        el.style.setProperty('--tier-color', color);
        el.classList.add('tier-marked');
      }
    }

    /* 调试模式：把三档数量同时打到控制台和页面右上角的小面板上。
     * 手机上不方便看控制台，所以页面上也显示一份 —— 直接读数字，不用数。 */
    if (game.debugTier) {
      let a = 0, b2 = 0, c = 0;
      for (let i = 0; i < n; i++) {
        const id = game.board[i].id;
        if (freeById[id]) a++;
        else if (shallowById[id]) b2++;
        else c++;
      }
      const line = '能点 ' + a + ' ／ 半透明 ' + b2 + ' ／ 牌背 ' + c + ' ／ 共 ' + n;
      console.log('[档位核对] ' + line);

      let box = document.getElementById('tierPanel');
      if (!box) {
        box = document.createElement('div');
        box.id = 'tierPanel';
        document.body.appendChild(box);
      }
      box.textContent = line;
    }
  }

  function updateSlots() {
    if (!hasDom) return;

    // 按顺序把卡槽里的牌摆好（后面的牌往前补位就靠这里重排）
    const frag = document.createDocumentFragment();
    for (let i = 0; i < game.slots.length; i++) {
      const item = game.slots[i];
      const el = game.dom.get(item.id);
      if (!el) continue;
      // 正在播「消失动画」的牌已经不属于卡槽了，绝不能再摆回去
      // （否则它会被重新插入，删除定时器就删不到它，卡槽里会越积越多幽灵牌）
      if (el.classList.contains('clearing')) continue;
      el.classList.remove('blocked');        // 进了卡槽就不存在被压的问题
      el.classList.remove('deep-blocked');   // 牌背也要还原，露出真图案
      placeNode(el, item, true);
      frag.appendChild(el);
    }
    slotsEl.appendChild(frag);

    // 空位补上虚线小方块，玩家一眼知道还剩几格
    const old = slotsEl.querySelectorAll('.slot-placeholder');
    for (let i = 0; i < old.length; i++) {
      if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    }
    const totalSlots = game.level ? game.level.slots : 7;
    for (let i = game.slots.length; i < totalSlots; i++) {
      const ph = document.createElement('div');
      ph.className = 'slot-placeholder';
      slotsEl.appendChild(ph);
    }
  }

  function updateHud() {
    if (!hasDom) return;
    // 关卡名不在页面上显示了（布局简化），只在控制台留个记录
    logStatus('本关：' + game.level.name);
    if (remainEl) remainEl.textContent = String(game.board.length);
    updateReviveHud();
  }

  // 顶部的「复活」次数：还有机会就显示数字，用完了显示「已用完」
  function updateReviveHud() {
    if (!hasDom || !reviveEl) return;
    const cfg = game.level.revive || { times: 0 };
    if (cfg.times <= 0) { reviveEl.textContent = '—'; return; }
    reviveEl.textContent = game.reviveLeft > 0 ? String(game.reviveLeft) : '已用完';
  }

  function refreshAll() {
    updateBoard();
    updateSlots();
    updateHud();
  }

  /* ==========================================================================
   * 十一、点击一张牌 —— 能不能点，理由写在判断处
   * ========================================================================*/
  function onTileClick(ev) {
    const el = ev.currentTarget;
    const id = Number(el.dataset.id);
    const item = findBoardItem(id);

    // ---- 「这张牌能不能点」的判断，逐条列出理由 ----
    if (game.over) return;                          // ① 本局已结束，谁都不能再点
    if (!item) return;                              // ② 这张牌已经不在桌上了（已经进过卡槽）
    if (el.classList.contains('blocked')) return;    // ③ 身上压着别的牌 → 点不了（CSS 也禁止了点击）
    if (item.blockedBy.length > 0) return;           // ④ 同上，以数据为准，双保险
    // ⑤ 能走到这里，说明没有任何牌压住它 → 可以点

    /* 点得动才有声音：放在这里而不是 useTile 里 ——
     * 被压住时上面早就 return 了，不会响，手感才对。 */
    try {
      if (window.XXYFX) {
        const s = window.XXYFX.sound();
        if (s) s.click();
      }
    } catch (e) { /* 忽略 */ }

    useTile(item);
  }

  function findBoardItem(id) {
    for (let i = 0; i < game.board.length; i++) {
      if (game.board[i].id === id) return game.board[i];
    }
    return null;
  }

  // 把一张能点的牌移到下方 7 格里，然后结算
  function useTile(item) {
    // 1) 从牌堆里摘掉
    game.board = game.board.filter(function (t) { return t.id !== item.id; });

    // 2) 按点击顺序放进卡槽末尾（所以自然是从左往右排）
    item.inSlot = true;
    game.slots.push(item);

    // 3) 它移走之后，原来被它压住的牌可能就露出来了 → 重算遮挡
    computeBlocked(game.board);

    // 4) 刷新表现（哪张能点、卡槽摆放、剩余张数）
    refreshAll();

    // 5) 结算：凑齐 3 张一样的就消掉
    resolveMatches();
    slotSoundIfNoClear();     // 这一手没消掉 → 给一声"落进卡槽"的低音
    updateSlots();
    updateHud();

    // 6) 判断输赢
    checkEnd();
  }

  /* ==========================================================================
   * 十二、三消结算
   * --------------------------------------------------------------------------
   * 卡槽里凑齐 3 张一样的牌 → 自动消掉，后面的牌往前补位。
   * 用 while 循环：一次点击有可能同时凑成好几组，都要消掉。
   * ========================================================================*/
  function resolveMatches() {
    let removedAny = true;
    while (removedAny) {
      removedAny = false;

      // 统计每个图案在卡槽里出现了几张
      const byKind = {};
      for (let i = 0; i < game.slots.length; i++) {
        const k = game.slots[i].kind;
        if (!byKind[k]) byKind[k] = [];
        byKind[k].push(game.slots[i]);
      }

      const kinds = Object.keys(byKind);
      for (let i = 0; i < kinds.length; i++) {
        const group = byKind[kinds[i]];
        if (group.length < 3) continue;

        // 取这一组里的 3 张（按在卡槽里的先后顺序）
        const killIds = {};
        for (let n = 0; n < 3; n++) killIds[group[n].id] = true;

        // 从卡槽里删掉，剩下的牌自动往前补位
        game.slots = game.slots.filter(function (t) { return !killIds[t.id]; });

        /* ---- 消除反馈（纯观感）----
         * 必须在删 DOM【之前】取坐标，删完就拿不到了。
         * 连消计数 game.comboCount：一次点击里连续消掉多组时累加，
         * 音效音高随之升高（越连越爽）。
         * 曾经还有「连消 ×N！」的飘字，后来去掉了 —— 画面够干净了，
         * 而且飘字会挡住牌面。音效已经足够传达"连上了"。 */
        try {
          if (window.XXYFX) {
            game.comboCount = (game.comboCount || 0) + 1;
            for (const idStr in killIds) {
              const nd = game.dom.get(Number(idStr));
              if (!nd) continue;
              const r = nd.getBoundingClientRect();
              window.XXYFX.blastNode(nd);
              window.XXYFX.burstAt(
                r.left + r.width / 2,
                r.top + r.height / 2,
                colorOfTile(Number(idStr))
              );
            }
            const s = window.XXYFX.sound();
            if (s) s.clear(game.comboCount - 1);
            // 消掉的组数 → 小火车往前走一点
            game.groupsCleared = (game.groupsCleared || 0) + 1;
            window.XXYFX.setJourney(game.groupsCleared, game.level.total / 3);
          }
        } catch (e) { /* 忽略 */ }

        // 删掉对应的 DOM（带一点淡出）
        for (const idStr in killIds) {
          const id = Number(idStr);
          const node = game.dom.get(id);
          if (node) {
            node.classList.add('clearing');
            setTimeout(function () {
              if (node.parentNode) node.parentNode.removeChild(node);
            }, 160);
            game.dom.delete(id);
          }
        }

        // 这一组牌被消掉了 → 如果是第一次消掉这种物品，就讲一段西迁知识点
        // （onKindCleared 内部会判断「讲过就不再讲」，所以同一条只会触发一次）
        onKindCleared(kinds[i]);
        removedAny = true;
        break; // 重新统计一遍，再找下一组
      }
    }
  }

  function labelOf(kindId) {
    const cfg = findTileConfig(kindId);
    return cfg ? cfg.label : kindId;
  }

  /* ==========================================================================
   * 十三、输 / 赢 / 复活
   * --------------------------------------------------------------------------
   * 底栏满了、又凑不出三张时：
   *   - 还有复活机会 → 弹「救援」窗，点一下就复活（移出底栏物品），继续打
   *   - 没机会了     → 才是真的输
   * 赢：牌堆清空 → 弹窗提示通关。
   * ========================================================================*/
  function checkEnd() {
    if (game.over) return;

    // 赢：牌堆清空
    if (game.board.length === 0) {
      endGame(true, '通关啦！', '行李都收拾好了，可以出发去西迁了。');
      return;
    }

    // 底栏满了，且没有任何 3 张相同（有相同的早就在 resolveMatches 里消掉了）
    if (game.slots.length >= game.level.slots) {
      if (hasAnyTriple(game.slots)) return;
      const cfg = game.level.revive || { times: 0, remove: 3 };
      if (game.reviveLeft > 0 && cfg.times > 0) {
        // 还能复活：弹救援窗，让玩家自己点
        showReviveDialog(cfg.remove);
      } else {
        endGame(false, '底栏满了', '没有能凑成 3 张的牌了，再来一局吧。');
      }
    }
  }

  // 卡槽里是否存在「3 张相同」（正常情况下消完就不存在，这里作为兜底判断）
  function hasAnyTriple(slots) {
    const count = {};
    for (let i = 0; i < slots.length; i++) {
      const k = slots[i].kind;
      count[k] = (count[k] || 0) + 1;
      if (count[k] >= 3) return true;
    }
    return false;
  }

  /* --------------------------------------------------------------------------
   * 复活：把底栏里【最后进去的几张】物品移出去，腾出位置继续。
   * 为什么移最后几张：那几张是玩家刚刚放进去、最"烫手"的，
   * 移掉它们等于给他一次"我刚才那几步不算"的机会，最符合直觉。
   * ------------------------------------------------------------------------*/
  function revive(removeCount) {
    if (game.reviveLeft <= 0) return;

    // 1) 从卡槽末尾（最后放进去的）拿走几张
    const removed = game.slots.splice(Math.max(0, game.slots.length - removeCount), removeCount);

    // 2) 这些牌彻底作废：从 DOM 和映射里删掉
    for (let i = 0; i < removed.length; i++) {
      const node = game.dom.get(removed[i].id);
      if (node) {
        node.classList.add('clearing');
        const n = node;
        setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 160);
        game.dom.delete(removed[i].id);
      }
    }

    // 3) 扣掉一次机会，关掉弹窗，继续打
    game.reviveLeft--;
    game.reviveUsed++;   // 记一笔：下次开局用复活次数算难度
    track('revive');     // 统计：复活次数
    game.over = false;
    closeModal();
    refreshAll();
    updateReviveHud();

    logStatus('复活！移出了 ' + removed.length + ' 件行李（' +
      removed.map(function (t) { return labelOf(t.kind); }).join('、') + '）');
  }

  function showReviveDialog(removeCount) {
    game.over = true; // 先冻住棋盘，避免玩家趁弹窗时继续点
    if (!hasDom) return;
    const item = pickQuiz();

    if (modalTitleEl) modalTitleEl.textContent = '底栏塞满了';
    if (modalButtonEl) { modalButtonEl.disabled = false; }

    // 没题库就退回原来的「直接复活」，保证不会因为没题而卡死
    if (!item) {
      if (modalHintEl) modalHintEl.textContent =
        '还能救一次 —— 移出底栏最后 ' + removeCount + ' 件物品，继续收拾行囊。';
      if (modalButtonEl) {
        modalButtonEl.textContent = '复活，继续';
        modalButtonEl.dataset.action = 'revive';
      }
      if (quizBoxEl) quizBoxEl.hidden = true;
      if (modalEl) modalEl.classList.add('show');
      return;
    }

    // 答题复活：答对才给复活机会
    if (modalHintEl) {
      modalHintEl.textContent = '答对下面这道西迁知识题，就帮你移出底栏最后 ' +
        removeCount + ' 件物品，继续收拾行囊。';
    }
    quizState = { item: item, answered: false };
    renderQuiz(item);
    // 还没作答之前，主按钮先禁用（防止玩家不看题直接点）
    if (modalButtonEl) {
      modalButtonEl.textContent = '请先选择答案';
      modalButtonEl.dataset.action = 'none';
      modalButtonEl.disabled = true;
    }
    if (modalEl) modalEl.classList.add('show');
  }

  function endGame(win, title, hint) {
    game.over = true;
    // 统计：通关次数 / 失败次数
    track(win ? 'win' : 'lose');
    if (!hasDom) return;

    if (win) {
      /* 通关：不再弹小窗，直接跳到专门的「通关页」。
       * 名次由后端实时查（去重后的通关设备数），所以这里不用传。
       * 把本局的表现先存进 sessionStorage，通关页读它来显示成绩。 */
      try {
        sessionStorage.setItem('xxy_last_result', JSON.stringify({
          mode: game.board ? game.board.mode : 'hard',
          reviveUsed: game.reviveUsed || 0,
          codex: unlockedCount(),
          total: TILES.length
        }));
      } catch (e) { /* 存不了就退化成普通弹窗，不影响通关 */ }

      // 先把统计发出去再跳转，免得页面卸载时数据还没走
      try {
        if (window.XXYStats) window.XXYStats.flush();
      } catch (e) { /* 忽略 */ }

      /* 通关反馈：金色涟漪 + 上行音阶 + 汽笛，并把小火车推到「西安」。
       * 跳转前留 1.4 秒让这套反馈播完 —— 否则玩家什么都听不到、
       * 也看不到小火车抵达，通关那一下的爽感就白丢了。 */
      let delay = 0;
      try {
        if (window.XXYFX) {
          delay = 1400;
          window.XXYFX.winFlash();
          window.XXYFX.setJourney(1, 1);
          const sw = window.XXYFX.sound();
          if (sw) sw.win();
        }
      } catch (e) { delay = 0; }

      /* 这里用 location.replace 而不是 href：
       * 不改写浏览历史，玩家按返回能直接回到上一页。 */
      setTimeout(function () { location.href = 'win.html'; }, delay);
      return;
    }

    /* 失败：屏幕抖一下 + 一记低沉音，给"没接住"的手感 */
    try {
      if (window.XXYFX) {
        window.XXYFX.shake();
        const sl = window.XXYFX.sound();
        if (sl) sl.lose();
      }
    } catch (e) { /* 忽略 */ }

    // 失败：仍然用原来的弹窗
    // 结束/失败都要把答题区收起来，免得下次弹窗还挂着上一题的残留
    clearQuiz();
    if (modalTitleEl) modalTitleEl.textContent = title;
    if (modalHintEl) modalHintEl.textContent = hint;
    if (modalButtonEl) {
      modalButtonEl.disabled = false;
      modalButtonEl.textContent = '再来一局';
      modalButtonEl.dataset.action = 'restart';
    }
    if (modalEl) modalEl.classList.add('show');
  }

  // 弹窗里那个按钮：可能是「复活继续」，也可能是「再来一局」
  function onModalButtonClick() {
    const action = (modalButtonEl && modalButtonEl.dataset) ? modalButtonEl.dataset.action : 'restart';
    if (action === 'revive') {
      const cfg = game.level.revive || { remove: 3 };
      revive(cfg.remove || 3);
    } else if (action === 'none') {
      return;   // 答题复活：还没选答案，这个按钮暂时不作数
    } else {
      startRound();
    }
  }

  function closeModal() {
    if (hasDom && modalEl) modalEl.classList.remove('show');
  }

  /* ==========================================================================
   * 十四、开局 / 重开
   * ========================================================================*/
  function startRound(levelIndex) {
    game.levelIndex = (typeof levelIndex === 'number') ? levelIndex : game.levelIndex;
    game.level = LEVELS[game.levelIndex];

    /* 0) 先把「上一局的复活情况」结算掉，再生成牌堆。
     * 顺序【极其重要】，这里踩过坑：
     *   generateBoard 要读 lastRoundRevived 来决定本局难度，
     *   而它就在下面几行执行 —— 所以这两行必须放在它【前面】。
     *   之前放在「清理界面」那一步（在生成牌堆之后），
     *   导致读到的永远是上一轮的值，难度整整慢一拍：
     *   A 难(复活) → B 还是难（本该简单）→ C 才简单（本该难）。 */
    game.lastRoundRevived = (game.reviveUsed > 0);
    game.reviveUsed = 0;          // 本局计数清零，这一局重新开始数

    // 1) 生成牌堆（洗牌后随机贴图案）
    game.board = generateBoard(game.level);

    // 2) 生成时就把「压住我的牌」名单算好
    computeBlocked(game.board);

    // 3) 打印牌堆统计，确认每种都是 3 的倍数、总数对得上
    logBoardStats(game.board, game.level);

    // 4) 清理界面
    game.slots = [];
    game.over = false;
    game.comboCount = 0;
    game.groupsCleared = 0;

    /* 旅程条回到「上海」起点（把"收行李"变成"走完西迁路"） */
    try {
      if (window.XXYFX) window.XXYFX.resetJourney();
    } catch (e) { /* 忽略 */ }
    /* 图鉴解锁记录是【跨局保留】的：从本地读回来（第一次进来时读一次就够），
     * 只有「本局弹过哪些提示」要清空 —— 这样重开一局时，
     * 新解锁的物品还能弹提示，而早就知道的不会再来打扰。 */
    if (!game.knowledgeLoaded) {
      game.knowledge = loadKnowledge();
      game.knowledgeLoaded = true;
    }
    game.tipShown = {};
    updateCodexBadge();
    // 复活次数按关卡配置重置
    const reviveCfg = game.level.revive || { times: 0 };
    game.reviveLeft = reviveCfg.times || 0;
    game.dom.clear();
    if (hasDom) {
      /* 只清牌，不能清 #stage —— 桌面是画在它和它的伪元素上的。
         清 stage 会把桌面一起清掉。 */
      if (boardEl) boardEl.innerHTML = '';
      slotsEl.innerHTML = '';
    }
    closeModal();

    // 5) 建节点、定尺寸、摆好
    buildTileNodes();
    applySize();
    refreshAll();

    logStatus('开始新的一局：' + game.level.name + '（' + game.level.tip + '）');
  }

  /* ==========================================================================
   * 十五、控制台统计（验收要求）
   * --------------------------------------------------------------------------
   * 打印每种图案各几张，并校验：每种都是 3 的倍数、总数对得上。
   * ========================================================================*/
  function logBoardStats(board, level) {
    const count = {};
    for (let i = 0; i < TILES.length; i++) count[TILES[i].id] = 0;
    for (let i = 0; i < board.length; i++) {
      count[board[i].kind] = (count[board[i].kind] || 0) + 1;
    }

    let allMultipleOfThree = true;
    let sum = 0;
    const rows = [];
    for (let i = 0; i < TILES.length; i++) {
      const t = TILES[i];
      const n = count[t.id] || 0;
      sum += n;
      if (n % 3 !== 0) allMultipleOfThree = false;
      rows.push({ 图案: t.label, id: t.id, 张数: n, '是3的倍数': (n % 3 === 0 ? '是' : '否') });
    }

    console.log('=== 牌堆统计：' + level.name + ' ===');
    if (console.table) console.table(rows);
    else console.log(rows);
    console.log('总张数 =', sum,
      '| 配置总张数 =', level.total,
      '| 对得上 =', (sum === level.total ? '是' : '否'),
      '| 每种都是 3 的倍数 =', (allMultipleOfThree ? '是' : '否'));

    // 顺手统计每层多少张、开局有多少张能点（调试用）
    const perLevel = {};
    for (let i = 0; i < board.length; i++) perLevel[board[i].level] = (perLevel[board[i].level] || 0) + 1;
    let clickable = 0;
    for (let i = 0; i < board.length; i++) if (board[i].blockedBy.length === 0) clickable++;
    console.log('每层张数 =', perLevel,
      '| 开局可点张数 =', clickable,
      '| 被压住张数 =', board.length - clickable);

    // 难度信息：发牌方式、开局可点张数、卡槽格子数、设计路线上的卡槽峰值
    console.log('难度设置 =', {
      发牌方式: (board.encode === 'solvable' ? '保证可解（每条路线都走得通）' : '纯随机（不保证有解）'),
      卡槽格子数: level.slots,
      本局设计路线的卡槽峰值: board.dealPeak,
      开局可点张数: board.opening,
      每层张数: board.quota
    });
  }

  if (hasDom) { window.__game = game; }   // 调试用：控制台可以看 game.board / game.slots

  // 算法自检用：模拟「上一局复活过几次」，用来验证两个难度档的真实难度
  function setUsedRevivesForTest(n) { game.lastRoundRevived = (n > 0); }

  /* ==========================================================================
   * 十六、启动（只在浏览器里跑；node 里 require 时不会执行，方便做算法自检）
   * ========================================================================*/
  /* --------------------------------------------------------------------------
   * 测试通道：直接跳到通关页，方便看效果 / 给别人演示
   * --------------------------------------------------------------------------
   * 用法（在网址后面加参数）：
   *   ?test=win          → 立刻跳到通关页，名次按真实数据查
   *   ?test=win&rank=7   → 跳到通关页，并把名次固定显示成 7（不查后端）
   *
   * 为什么做成参数而不是按钮：正式页面上不希望出现「测试」入口，
   * 参数方式随手能加、也不会被普通玩家误触。
   * ------------------------------------------------------------------------ */
  function checkTestRoute() {
    let params;
    try {
      params = new URLSearchParams(location.search);
    } catch (e) {
      return false;          // 老浏览器不支持就跳过，不影响正常玩
    }
    /* 调试模式：?debug=tier
     * 在每张牌上标出它被判成哪一档，用来核对「半透明的张数」对不对。
     * 标记方式：左上角一个色点 + 一个数字
     *   绿 0 = 能点   黄 1 = 半透明   红 2 = 牌背
     * 打开后控制台也会打印三档的准确数量。 */
    if (params.get('debug') === 'tier' || params.get('debug') === '1') {
      game.debugTier = (params.get('debug') === 'tier');
      /* 把构建号显示在页面顶部 —— 一眼就能确认「我加载的是哪一版」。
       * 手机上缓存顽固，排查问题时这个号能直接排除掉旧缓存的可能。 */
      const stamp = document.createElement('div');
      stamp.id = 'buildStamp';
      stamp.textContent = '构建 ' + BUILD;
      document.body.appendChild(stamp);
      console.log('[西迁行囊] 构建版本 = ' + BUILD);
      return false;               // 不跳转，照常进游戏
    }

    if (params.get('test') !== 'win') return false;

    // 传了 rank 就把它当成本局名次，通关页会直接用，不去查后端
    const fakeRank = params.get('rank');
    try {
      sessionStorage.setItem('xxy_last_result', JSON.stringify({
        mode: params.get('mode') || 'hard',
        reviveUsed: Number(params.get('revive') || 0),
        test: true
      }));
      if (fakeRank !== null) sessionStorage.setItem('xxy_test_rank', String(fakeRank));
      else sessionStorage.removeItem('xxy_test_rank');
    } catch (e) { /* 存不了也照跳，通关页会退化成查后端 */ }

    location.replace('win.html');
    return true;
  }

  function init() {
    // 测试通道要最先判断：命中就直接离开这个页面
    if (checkTestRoute()) return;

    // 统计：打开链接次数（每次进页面记一次）
    if (hasDom && window.XXYStats) {
      window.XXYStats.init();
      track('open');
    }

    /* 氛围与动效初始化（飘尘、音效开关按钮、音频解锁监听、旅程条归位）。
     * fx.js 在 game.js 之后加载，所以这里运行时 window.XXYFX 一定已经就绪。
     * 整段包 try：动效是锦上添花，出问题也绝不能让游戏进不去。 */
    try {
      if (window.XXYFX) window.XXYFX.init();
    } catch (e) { /* 忽略 */ }

    // 先量一次真实视口高度（并连量几帧取最大值），再据此算格子大小
    sampleViewportHeight();
    applySize();
    startRound(0);

    // 窗口大小变化（含手机横竖屏切换）→ 重新算格子大小
    window.addEventListener('resize', function () {
      sampleViewportHeight();
      applySize();
      // 位置都是格坐标算出来的，尺寸一变只重新摆一下就行
      for (let i = 0; i < game.board.length; i++) {
        const el = game.dom.get(game.board[i].id);
        if (el) placeNode(el, game.board[i], false);
      }
      updateSlots();
    });
    // 有些浏览器（尤其内置 WebView）改变可视区时只触发 visualViewport 的 resize
    if (window.visualViewport && window.visualViewport.addEventListener) {
      window.visualViewport.addEventListener('resize', function () {
        sampleViewportHeight();
        applySize();
      });
    }
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 200);
    });

    // 按钮：重新开始 / 弹窗里的按钮（可能是复活，也可能是再来一局）
    /* 「重新开始」按钮已移除。
     * 重开的入口：输掉 / 通关的弹窗里的「再来一局」；
     * 中途想重开就刷新页面（局内进度靠 sessionStorage，本来也不跨局保存）。 */
    if (modalButtonEl) modalButtonEl.addEventListener('click', onModalButtonClick);

    // 图鉴：入口按钮 / 关掉 / 详情页关掉
    if (codexBtnEl) codexBtnEl.addEventListener('click', openCodex);
    if (codexCloseBtnEl) {
      codexCloseBtnEl.addEventListener('click', function () {
        closeCodex();
        closeDetail();
      });
    }
    if (detailCloseEl) {
      detailCloseEl.addEventListener('click', function () {
        closeDetail();
        // 从详情返回图鉴
        if (codexModalEl) codexModalEl.classList.add('show');
      });
    }
    if (detailModalEl) {
      // 点遮罩也能关掉详情
      detailModalEl.addEventListener('click', function (ev) {
        if (ev.target === detailModalEl) {
          closeDetail();
          if (codexModalEl) codexModalEl.classList.add('show');
        }
      });
    }
    updateCodexBadge();

    // 微信 / QQ 内置浏览器 → 弹一次全屏引导（教用户切到系统浏览器）
    if (escapeCopyBtnEl) {
      escapeCopyBtnEl.addEventListener('click', function () {
        copyTextToClipboard(location.href);
      });
    }
    if (escapeSkipBtnEl) {
      escapeSkipBtnEl.addEventListener('click', function () {
        markEscapeHandled();
        closeEscapeGuide();
      });
    }
    // 等布局稳定后再弹，避免和首屏渲染抢时间
    setTimeout(maybeShowEscapeGuide, 500);
  }

  if (hasDom && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else if (hasDom) {
    init();
  }

  /* ==========================================================================
   * 十七、给 node 的自检出口（浏览器里用不到，也不影响游戏）
   * --------------------------------------------------------------------------
   * 用来在命令行里跑几百局，确认「每种图案都是 3 的倍数、总数对得上」，
   * 以及生成器不会死循环。
   * ========================================================================*/
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      TILES: TILES,
      LEVELS: LEVELS,
      BOARD_CELLS: BOARD_CELLS,
      TILE_CELLS: TILE_CELLS,
      generateBoard: generateBoard,
      computeBlocked: computeBlocked,
      buildTileKinds: buildTileKinds,
      dealSolvable: dealSolvable,
      dealRamp: dealRamp,
      setUsedRevivesForTest: setUsedRevivesForTest,
      genModeForUsedRevives: genModeForUsedRevives,
      boardExact: boardExact,
      applyDecoys: applyDecoys,
      scoreVisibility: scoreVisibility,
      dealForcedRevive: dealForcedRevive,
      slotProfile: slotProfile,
      countOpening: countOpening,
      logBoardStats: logBoardStats,
      rectsOverlap: rectsOverlap,
      visibleCellsOf: visibleCellsOf,
      pickPositions: pickPositions,
      layerRange: layerRange
    };
  }
})();
