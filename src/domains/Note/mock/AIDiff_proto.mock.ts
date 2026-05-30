/**
 * AIDiff proto 示例数据：数据库发展论文修订稿
 *
 * content: 原始内容（旧版）
 * AI-content: AI 修改后的内容（新版）
 *
 * 覆盖范围：
 * - 当前 AI-Diff 渲染链路支持的块：paragraph / heading / quote / bulletListItem /
 *   numberedListItem / checkListItem / toggleListItem / math / divider
 * - 行内特殊内容：inlineMath edit/create/delete、link create/delete/edit、文本/公式/链接混排、
 *   结构无法可靠对齐时的可见文本级降级
 * - 边界情况：无修改、纯新增、纯删除、空内容、空白与标点变化、高变动率重写、
 *   中英混排、URL/邮箱/版本号、NBSP/窄连字符、嵌套 children、带 children 的整块新增/删除
 *
 * 注：codeBlock 当前在 AI-Diff 映射层明确排除；table / media 块当前不承担 AI-Diff
 * 文本渲染职责，因此不放入本 proto mock，避免示例数据误导渲染验证。
 */

export const MOCK_AI_PROTO_BLOCKS = [
  // ────────────────────────────────────────────────────────────
  // 场景 1：Heading 1 标题改写
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_h1_title_edit',
    type: 'heading',
    props: {
      level: 1,
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text: '数据库系统发展的历史回顾', styles: {} }],
    'AI-content': [{ type: 'text', text: '数据库系统演进：从层次模型到云原生架构', styles: {} }],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 2：无修改段落，应保持普通文本，不生成 diff
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_no_change',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: '数据库系统的发展始终围绕数据独立性、一致性、可扩展性与查询效率展开。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: '数据库系统的发展始终围绕数据独立性、一致性、可扩展性与查询效率展开。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 3：少量词替换
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_word_replace',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: '早期层次数据库通过指针结构组织记录，虽然访问路径清晰，但模式变更十分困难。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: '早期层次数据库通过指针结构组织记录，虽然访问路径明确，但模式演化成本很高。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 4：多处分散修改
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_multi_change',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: '关系模型提出之后，研究者开始把数据看成很多二维表，并依靠人工编写的遍历逻辑完成复杂查询，因此系统维护成本仍然很高。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: '关系模型提出之后，研究者将数据抽象为二维关系，并依靠声明式 SQL 与优化器完成复杂查询，显著降低了系统维护成本。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 5：纯新增段落
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_pure_create',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [],
    'AI-content': [
      {
        type: 'text',
        text: '本文进一步指出，现代数据库的竞争焦点已经从单机事务处理扩展到云端弹性、混合负载与智能优化。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 6：纯删除段落
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_pure_delete',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: '由于关系数据库已经解决了所有数据管理问题，后续 NoSQL 与 NewSQL 的出现并没有实质意义。',
        styles: {},
      },
    ],
    'AI-content': [],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 7：空白与标点变化
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_format_change',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: '事务处理  依赖 ACID, 查询处理  依赖优化器, 存储管理  依赖缓冲池。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: '事务处理依赖 ACID，查询处理依赖优化器，存储管理依赖缓冲池。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 8：高变动率重写
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_high_rewrite',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: '在互联网应用快速增长之前，数据库主要运行在封闭机房中，系统规模较小，负载稳定，因此传统集中式架构可以长期满足应用需求。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: '进入 Web 与移动互联网时代后，数据规模、访问并发和故障域都急剧扩大，数据库架构逐步转向分布式复制、分片、弹性伸缩与自动化运维。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 9：中英混排、版本号、邮箱与文件名
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_mixed_meta',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: '实验脚本位于 benchmark_final_v2(1).sql；问题可联系 db.team@lab.example，PostgreSQL 9.6 的配置仍作为 baseline。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: '实验脚本位于 benchmark_final_v3.sql；问题可联系 db-research@lab.example，PostgreSQL 16 的配置作为新的 baseline。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 10：NBSP、窄连字符、单位与符号
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_nbsp_symbols',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      {
        type: 'text',
        text: 'TPC\u00A0C 与 HTAP‑Bench 在 10~20GB 数据集上表现接近; 吞吐量>=8000 tx/s。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: 'TPC-C 与 HTAP-Bench 在 10–20 GB 数据集上表现接近；吞吐量 ≥ 8000 tx/s。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 11：带样式文本的改写
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_styles',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: '核心判断：', styles: { bold: true } },
      { type: 'text', text: '优化器只需要基于规则即可做出稳定计划。', styles: {} },
    ],
    'AI-content': [
      { type: 'text', text: '核心判断：', styles: { bold: true } },
      { type: 'text', text: '现代优化器通常结合规则、代价模型与运行时反馈生成计划。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 12：inlineMath edit
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_inline_math_edit',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: 'B+ 树查询复杂度通常写作 ', styles: {} },
      { type: 'inlineMath', props: { expression: 'O(log_n N)', autoOpenEdit: false } },
      { type: 'text', text: '，其中 n 表示扇出。', styles: {} },
    ],
    'AI-content': [
      { type: 'text', text: 'B+ 树查询复杂度通常写作 ', styles: {} },
      { type: 'inlineMath', props: { expression: 'O(\\log_f N)', autoOpenEdit: false } },
      { type: 'text', text: '，其中 f 表示节点扇出。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 13：inlineMath create
  // 旧版用两个空格占位，便于 proto 转换层按 text skeleton 对齐
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_inline_math_create',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [{ type: 'text', text: '缓存命中率可用来估计缓冲池是否足够。', styles: {} }],
    'AI-content': [
      { type: 'text', text: '缓存命中率 ', styles: {} },
      {
        type: 'inlineMath',
        props: { expression: 'H = \\frac{hit}{hit + miss}', autoOpenEdit: false },
      },
      { type: 'text', text: ' 可用来估计缓冲池是否足够。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 14：inlineMath delete
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_inline_math_delete',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: '旧稿使用经验公式 ', styles: {} },
      { type: 'inlineMath', props: { expression: 'Q = c \\cdot n^2', autoOpenEdit: false } },
      { type: 'text', text: ' 估计查询开销，但该式缺少统计依据。', styles: {} },
    ],
    'AI-content': [
      { type: 'text', text: '旧稿使用经验公式  估计查询开销，但该式缺少统计依据。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 15：link create
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_link_create',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [{ type: 'text', text: '相关背景可参见  的系统综述。', styles: {} }],
    'AI-content': [
      { type: 'text', text: '相关背景可参见 ', styles: {} },
      {
        type: 'link',
        href: 'https://www.vldb.org/pvldb/vol13/p3411-pavlo.pdf',
        content: [{ type: 'text', text: 'What Goes Around Comes Around', styles: {} }],
      },
      { type: 'text', text: ' 的系统综述。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 16：link delete
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_link_delete',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: '早期版本引用了 ', styles: {} },
      {
        type: 'link',
        href: 'https://example.com/outdated-db-survey',
        content: [{ type: 'text', text: '过时综述', styles: {} }],
      },
      { type: 'text', text: '，但该资料未覆盖云数据库。', styles: {} },
    ],
    'AI-content': [{ type: 'text', text: '早期版本引用了 ，但该资料未覆盖云数据库。', styles: {} }],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 17：link edit（当前策略为删除旧 link + 新增新 link）
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_link_edit',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: 'NewSQL 的定义可参考 ', styles: {} },
      {
        type: 'link',
        href: 'https://example.com/newsql-draft',
        content: [{ type: 'text', text: '草稿说明', styles: {} }],
      },
      { type: 'text', text: '。', styles: {} },
    ],
    'AI-content': [
      { type: 'text', text: 'NewSQL 的定义可参考 ', styles: {} },
      {
        type: 'link',
        href: 'https://dl.acm.org/doi/10.1145/2168836.2168854',
        content: [{ type: 'text', text: 'Calvin 论文', styles: {} }],
      },
      { type: 'text', text: '。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 18：文本、公式、链接混排（结构可按 index 对齐）
  // 期望：普通文本保留，inlineMath 走 edit，link edit 拆成 delete + create
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_mixed_inline_aligned',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: '在优化器评估中，代价函数 ', styles: {} },
      { type: 'inlineMath', props: { expression: 'C = IO + CPU', autoOpenEdit: false } },
      { type: 'text', text: ' 可与 ', styles: {} },
      {
        type: 'link',
        href: 'https://example.com/volcano-model',
        content: [{ type: 'text', text: 'Volcano 模型', styles: {} }],
      },
      { type: 'text', text: ' 共同说明搜索空间。', styles: {} },
    ],
    'AI-content': [
      { type: 'text', text: '在优化器评估中，代价函数 ', styles: {} },
      {
        type: 'inlineMath',
        props: { expression: 'C(q) = C_{io}(q) + C_{cpu}(q)', autoOpenEdit: false },
      },
      { type: 'text', text: ' 可与 ', styles: {} },
      {
        type: 'link',
        href: 'https://dl.acm.org/doi/10.1145/38713.38742',
        content: [{ type: 'text', text: 'Volcano/Cascades 优化框架', styles: {} }],
      },
      { type: 'text', text: ' 共同说明搜索空间。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 19：混排结构无法可靠对齐，降级为可见文本级 AI-Edit
  // 期望：公式和链接被 flatten 成可见文本，整体显示为一条文本 diff
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_mixed_inline_fallback',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: '原稿把 LSM 树写成 ', styles: {} },
      { type: 'inlineMath', props: { expression: 'O(log N)', autoOpenEdit: false } },
      { type: 'text', text: '，并引用 ', styles: {} },
      {
        type: 'link',
        href: 'https://example.com/old-lsm-note',
        content: [{ type: 'text', text: '旧版博客', styles: {} }],
      },
      { type: 'text', text: ' 作为依据。', styles: {} },
    ],
    'AI-content': [
      { type: 'text', text: '修订稿将 LSM 树描述为 ', styles: {} },
      {
        type: 'link',
        href: 'https://www.cs.umb.edu/~poneil/lsmtree.pdf',
        content: [{ type: 'text', text: 'LSM-tree 论文', styles: {} }],
      },
      { type: 'text', text: '，', styles: {} },
      { type: 'text', text: '并补充写放大公式 ', styles: {} },
      {
        type: 'inlineMath',
        props: {
          expression: 'WA = \\frac{bytes_{written}}{bytes_{user}}',
          autoOpenEdit: false,
        },
      },
      { type: 'text', text: '。', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 20：分隔线，无内容 diff
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_divider_methods',
    type: 'divider',
    props: {},
    content: [],
    'AI-content': [],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 21：Heading 2 纯新增
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_h2_cloud_native_create',
    type: 'heading',
    props: {
      level: 2,
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [],
    'AI-content': [{ type: 'text', text: '4. 云原生数据库的架构转向', styles: {} }],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 22：Heading 3 纯删除
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_h3_delete_duplicate',
    type: 'heading',
    props: {
      level: 3,
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text: '[草稿] 重复的存储引擎小节', styles: {} }],
    'AI-content': [],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 23：quote edit
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_quote_edit',
    type: 'quote',
    props: { textColor: 'default', backgroundColor: 'default' },
    content: [
      {
        type: 'text',
        text: 'Stonebraker 曾指出："one size fits all" 的数据库路线长期有效。',
        styles: {},
      },
    ],
    'AI-content': [
      {
        type: 'text',
        text: 'Stonebraker 曾指出：“one size fits all” 并不适用于所有数据管理场景。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 24：quote create
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_quote_create',
    type: 'quote',
    props: { textColor: 'default', backgroundColor: 'default' },
    content: [],
    'AI-content': [
      {
        type: 'text',
        text: '补充观点：数据库演进不是线性替代，而是在事务、分析、搜索与流处理之间持续分化与再融合。',
        styles: {},
      },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 25：quote delete
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_quote_delete',
    type: 'quote',
    props: { textColor: 'default', backgroundColor: 'default' },
    content: [{ type: 'text', text: '删除观点：NoSQL 完全取代了关系数据库。', styles: {} }],
    'AI-content': [],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 26：bulletListItem 带嵌套子项
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_bullet_arch_parent',
    type: 'bulletListItem',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [{ type: 'text', text: '数据库架构演进可分为三条主线', styles: {} }],
    'AI-content': [{ type: 'text', text: '数据库架构演进可归纳为三条主线', styles: {} }],
    children: [
      {
        id: 'db_bullet_arch_child_1',
        type: 'bulletListItem',
        props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
        content: [{ type: 'text', text: '从层次模型到关系模型，重点是结构抽象。', styles: {} }],
        'AI-content': [
          { type: 'text', text: '从层次/网状模型到关系模型，重点是数据独立性。', styles: {} },
        ],
        children: [],
      },
      {
        id: 'db_bullet_arch_child_2',
        type: 'bulletListItem',
        props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
        content: [{ type: 'text', text: '从单机系统到分布式系统，重点是扩容。', styles: {} }],
        'AI-content': [
          { type: 'text', text: '从单机系统到分布式系统，重点是弹性扩展。', styles: {} },
        ],
        children: [],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 27：numberedListItem 带 start
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_numbered_step_4',
    type: 'numberedListItem',
    props: {
      start: 4,
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [
      { type: 'text', text: 'Step IV: evaluate OLTP throughput on 64 clients', styles: {} },
    ],
    'AI-content': [{ type: 'text', text: '步骤四：在 64 个客户端上评估 OLTP 吞吐量', styles: {} }],
    children: [],
  },
  {
    id: 'db_numbered_step_5',
    type: 'numberedListItem',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [
      { type: 'text', text: 'Step V: compare query latency with DuckDB baseline', styles: {} },
    ],
    'AI-content': [{ type: 'text', text: '步骤五：与 DuckDB 基线比较查询延迟', styles: {} }],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 28：checkListItem 未完成项改写
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_check_open',
    type: 'checkListItem',
    props: {
      checked: false,
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text: '补充 2018-2024 年 HTAP 系统相关工作', styles: {} }],
    'AI-content': [{ type: 'text', text: '补充 2018–2024 年 HTAP 与湖仓系统相关工作', styles: {} }],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 29：checkListItem 已完成项改写
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_check_done',
    type: 'checkListItem',
    props: {
      checked: true,
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text: '已 proofread abstract and introduction', styles: {} }],
    'AI-content': [{ type: 'text', text: '已完成摘要与引言的英文校对', styles: {} }],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 30：toggleListItem 父项 edit，子项 create/delete/edit
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_toggle_related_work',
    type: 'toggleListItem',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [{ type: 'text', text: '附录：数据库发展时间线（draft）', styles: {} }],
    'AI-content': [{ type: 'text', text: '附录：数据库发展时间线（修订版）', styles: {} }],
    children: [
      {
        id: 'db_toggle_child_create',
        type: 'paragraph',
        props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
        content: [],
        'AI-content': [
          { type: 'text', text: '1970 年 Codd 提出关系模型，奠定声明式查询基础。', styles: {} },
        ],
        children: [],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 31：整块新增 toggle，带子块
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_toggle_pure_create_with_children',
    type: 'toggleListItem',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [],
    'AI-content': [{ type: 'text', text: '新增讨论：AI for DB 与 DB for AI', styles: {} }],
    children: [
      {
        id: 'db_toggle_create_child',
        type: 'paragraph',
        props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
        content: [],
        'AI-content': [
          {
            type: 'text',
            text: 'AI for DB 侧重学习型优化器、索引推荐与自调参；DB for AI 侧重向量检索、特征管理与训练数据治理。',
            styles: {},
          },
        ],
        children: [],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 32：整块删除 toggle，带子块
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_toggle_pure_delete_with_children',
    type: 'toggleListItem',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [{ type: 'text', text: '删除讨论：桌面数据库将重新成为主流', styles: {} }],
    'AI-content': [],
    children: [
      {
        id: 'db_toggle_delete_child',
        type: 'paragraph',
        props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
        content: [
          {
            type: 'text',
            text: '该判断缺少云服务成本、团队协作与全球部署方面的证据。',
            styles: {},
          },
        ],
        'AI-content': [],
        children: [],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 33：math block edit
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_math_edit',
    type: 'math',
    props: { expression: '' },
    content: [{ type: 'text', text: 'Cost = IO + CPU + Network', styles: {} }],
    'AI-content': [
      { type: 'text', text: 'Cost(q) = C_{io}(q) + C_{cpu}(q) + C_{net}(q)', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 34：math block create
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_math_create',
    type: 'math',
    props: { expression: '' },
    content: [],
    'AI-content': [
      { type: 'text', text: 'Throughput = \\frac{committed\\ transactions}{second}', styles: {} },
    ],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 35：math block delete
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_math_delete',
    type: 'math',
    props: { expression: '' },
    content: [{ type: 'text', text: 'Latency = O(n^3)', styles: {} }],
    'AI-content': [],
    children: [],
  },

  // ────────────────────────────────────────────────────────────
  // 场景 36：空 paragraph，双空内容边界
  // ────────────────────────────────────────────────────────────
  {
    id: 'db_p_empty_both',
    type: 'paragraph',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content: [],
    'AI-content': [],
    children: [],
  },
] as const;
