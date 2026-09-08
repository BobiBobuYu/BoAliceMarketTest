# Wind Alice CLI 技能明细目录（33 个技能）

> 从 [`skills/Alice-CLI-技能与专家清单.md`](../skills/Alice-CLI-技能与专家清单.md) 整理而成：把原文分散在**总表**（slug / 别名 / 版本 / 耗时）和**描述明细**（中英文描述 / 示例问法 / 事件前缀）两处的字段合并成「每个技能一条完整记录」，并按数据域分组，便于查名字、查用途、查怎么调。

整理日期：2026-09-08　|　技能 **33** 个　|　专家 **4** 个（见文末附录）

**怎么调用**：技能包由 CLI 自动给 prompt 加前缀，`--skill` 传**中文名或英文名**均可，不是 slug 也不是别名。

```bash
node scripts/wind-alice.mjs --prompt "<用户原话>" --skill "<中文名 或 英文名>"
```

| 问句语言 | CLI 实际发出的 text |
|---|---|
| 含中文 | `使用「<中文名>」技能：<原话>` |
| 全英文 | `Using "<英文名>" skill:<原话>` |

---

## 快速索引

| # | 中文名 | 英文名 | 分类 | 别名 | 一句话 |
|---|--------|--------|------|------|--------|
| 1 | **A股短线策略报告** | A-Share Short-Term Strategy Report | 权益 · 个股研究 | `aassr` | 每日收盘后自动拉取 Wind 涨停股与指数行情，梳理热点概念群与资金轮动方向 |
| 2 | **AI商品策略师** | AI Commodity Strategist | 商品 · 期货 | `aacs` | 覆盖能源、黑色、有色、化工、农产品、贵金属全板块的机构级策略输出 |
| 3 | **资产配置-行业轮动策略** | Asset Allocation - Sector Rotation Strategy | 宏观 · 资产配置 | `asrs` | 分析未来 1-6 个月各行业相对强弱与权重倾斜，结合动量、资金面、估值与景气度因子输出超配/中性/低配清… |
| 4 | **资产配置-战略基准组合** | Asset Allocation - Strategic Baseline Portfolio | 宏观 · 资产配置 | `aasbp` | 结合风险偏好、投资期限、约束与长期市场数据，制定 3-5 年战略资产配置基准组合 |
| 5 | **债券利率走势研判** | Bond Rate Outlook | 固收 · 信用 | `abro` | 支持交易/策略/配置多视角切换，覆盖五大维度系统化研判 |
| 6 | **券商金股追踪** | Broker Top Picks Tracker | 权益 · 个股研究 | `abtpt` | 汇总各大券商月度金股推荐，统计推荐热度与行业分布，输出含金股排行、推荐理由摘要与近月变化趋势的结构化报告 |
| 7 | **商品智研助手** | Commodity Research Assistant | 商品 · 期货 | `acra` | 输入期货品种名称或 Wind Code，自动生成涵盖价格、基差、基本面、远期曲线、资金、仓单、宏观等多维… |
| 8 | **公司一页纸** | Company One-Page Investment Memo | 权益 · 个股研究 | `acom` | 为上市公司生成结构化一页纸投资报告，涵盖公司速览、投资逻辑、催化剂、财务估值、风险评估与操作建议 |
| 9 | **可比公司分析** | Comps Analysis | 权益 · 个股研究 | `acomps` | 构建机构级可比公司分析，覆盖经营指标、估值倍数对比及统计基准分析 |
| 10 | **信用分析** | Credit Analysis | 固收 · 信用 | `aca` | 对各类企业 / 机构主体做六大维度系统化信用研究，集成 Wind 风险评分提供更精准违约概率 |
| 11 | **深度研究** | Deep Research | 通用研究 · 文档产出 | `adr` | 对任意主题进行结构化、多阶段深度研究，先澄清问题、界定研究范围与维度并确认研究计划 |
| 12 | **事实核验** | Fact Check | 通用研究 · 文档产出 | `afc` | 粘贴含金融数据、公司声明或行业事件的文字，逐点验证并生成结构化核查报告 |
| 13 | **基金对比分析** | Fund Compare | 基金 | `afcmp` | 对多只基金做业绩、风险、持仓、管理四维度对比分析，支持客观中立与主观倾向性分析 |
| 14 | **基金涨跌解读** | Fund Performance Attribution Assistant | 基金 | `afpa` | 拆解基金或 ETF 一段时间内涨跌背后的持仓贡献、行业影响、事件驱动与宏观因素 |
| 15 | **基金筛选与投资建议** | Fund Screening & Investment Advisory | 基金 | `afsia` | 多维度基金筛选、对比分析与个性化投资建议，输出含筛选结果、对比分析、配置建议与投资者画像匹配的结构化报告 |
| 16 | **期货资金流向监测** | Futures Fund Flow Monitor | 商品 · 期货 | `affm` | 基于品种持仓额变化监测全市场、板块与单品种的资金流入流出异动 |
| 17 | **期货主力行为分析** | Futures Leading Institution Analysis | 商品 · 期货 | `aflia` | 分析期货公司代理席位的多空增减仓、净持仓、成交量排名、跨品种持仓与估算盈亏 |
| 18 | **期货研报观点** | Futures Research Opinion | 商品 · 期货 | `afro` | 聚合国内商品期货机构研报多空观点，计算 Wind 情绪评分 |
| 19 | **全球上市公司季报点评** | Global Share Quarterly Earnings Review | 权益 · 个股研究 | `agsqer` | 一键生成卖方研究风格财报点评，涵盖业绩回顾、盈利能力、投资逻辑、盈利预测与风险提示 |
| 20 | **通胀情景债券轮动策略** | Inflation Bond Strategy | 固收 · 信用 | `aibs` | 实时追踪 CPI/PPI 四种通胀拐点信号，自动判断当月是否持有债券或转持货币基金（可空仓模式） |
| 21 | **机构持仓透视** | Institutional Holdings Insight | 权益 · 个股研究 | `aihi` | 追踪顶级机构最新买卖，输出含新建仓/清仓名单、增减持排序、板块资金流向与历史调仓轨迹的一页纸持仓简报 |
| 22 | **期货盘中异动归因** | Intraday Futures Move Attribution | 商品 · 期货 | `aifma` | 核验行情、量仓、板块联动、内外盘传导与事件线索，回答某品种为何拉升/跳水/放量/突破 |
| 23 | **投资标的创意与筛选** | Investment Idea Generation | 权益 · 个股研究 | `aiig` | 从全市场主动发掘投资机会，支持量化因子筛选与主题驱动扫描 |
| 24 | **宏观数据解读** | Macro Data Interpretation | 宏观 · 资产配置 | `amdi` | 将 CPI/PPI/PMI/GDP/社融/外贸/失业率/利率等宏观指标解读为结构化研究周报 |
| 25 | **市场规模测算与战略建模** | Market Sizing & Strategic Modeling | 通用研究 · 文档产出 | `amssm` | Top-down / Bottom-up 双路径交叉验证 |
| 26 | **金融监管局处罚月报** | NFRA Monthly Enforcement Report | 监管 · 政策 | `nmre` | 基于国家金融监督管理总局（NFRA）及各地派出机构的公开处罚数据 |
| 27 | **期权定价计算器** | Option Pricing Calculator | 期权 · 衍生品 | `aopc` | 对香草、二元、障碍、亚式、触碰、鲨鱼鳍、累计及 Autocall/雪球/三层区间等期权做理论定价 |
| 28 | **期权波动率洞察** | Option Volatility Insights | 期权 · 衍生品 | `aovi` | 诊断期权 IV 估值、期限结构、Skew、PCR 与波动率曲面 |
| 29 | **期权交易策略** | Options Trading Strategies | 期权 · 衍生品 | `aots` | 融合波动率信号构建、异动打分、策略推荐与情景汇总，输出五段式期权交易方案 |
| 30 | **幻灯片** | PPT Generator | 通用研究 · 文档产出 | `apg` | 根据主题与结构化内容自动生成专业 PPT 报告，支持标题页、目录、章节页、图文排版与结论总结 |
| 31 | **证券业监管政策简报** | Securities Regulatory Policy Briefing | 监管 · 政策 | `srpb` | 基于 Wind 监管法规数据库，获取指定时间范围内的证券行业监管政策 |
| 32 | **上市公司调研问题清单** | Stock DD List | 权益 · 个股研究 | `asdl` | 一键生成买方视角结构化调研问题清单，含看多/看空逻辑摘要、3-5 个深度议题及管理层调研问题 |
| 33 | **按主题选股** | Thematic Stock Screening | 权益 · 个股研究 | `atss` | 系统拆解主题投资逻辑、验证数据兑现、筛选核心受益标的 |

---

## 技能明细

### 权益 · 个股研究（9 个）

#### 公司一页纸 / Company One-Page Investment Memo

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **公司一页纸** |
| 英文名（`--skill` 可用） | **Company One-Page Investment Memo** |
| 目录 / slug | `alice-company-one-page-investment-memo` |
| CLI 别名 | `acom` |
| 版本 | 1.0.8 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_COMPANY_ONE_PAGE_INVESTMENT_MEMO` |

**介绍**：Wind Alice 公司一页纸 CLI：为上市公司生成结构化一页纸投资报告，涵盖公司速览、投资逻辑、催化剂、财务估值、风险评估与操作建议，支持 A 股、港股、美股等全球市场。

**English**：Wind Alice Company One-Page Investment Memo CLI - generates structured one-page investment reports for listed companies across global markets (A-shares, HK, US, etc.), covering company overview, investment thesis, catalysts & tracking metrics, financial & valuation analysis, risk assessment, and actionable recommendations.

**示例问法**：请分析一下比亚迪的投资价值？腾讯有没有短线机会？

#### 上市公司调研问题清单 / Stock DD List

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **上市公司调研问题清单** |
| 英文名（`--skill` 可用） | **Stock DD List** |
| 目录 / slug | `alice-stock-dd-list` |
| CLI 别名 | `asdl` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_STOCK_DD_LIST` |

**介绍**：Wind Alice 上市公司调研问题清单 CLI：一键生成买方视角结构化调研问题清单，含看多/看空逻辑摘要、3-5 个深度议题及管理层调研问题，支持 A 股、港股及海外上市公司。

**English**：Wind Alice Stock DD List CLI - generate a buy-side due diligence question list for any listed company in one step. Retrieves financial data, broker research, industry news, and consensus estimates to produce a structured investment memo with bull/bear thesis, 3–5 deep-dive topics, and pointed questions for management meetings. Works for A-shares, Hong Kong, and international listings.

**示例问法**：帮我生成比亚迪的调研问题清单

#### 全球上市公司季报点评 / Global Share Quarterly Earnings Review

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **全球上市公司季报点评** |
| 英文名（`--skill` 可用） | **Global Share Quarterly Earnings Review** |
| 目录 / slug | `alice-global-share-quarterly-earnings-review` |
| CLI 别名 | `agsqer` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_GLOBAL_SHARE_QUARTERLY_EARNINGS_REVIEW` |

**介绍**：Wind Alice 全球上市公司季报点评 CLI：一键生成卖方研究风格财报点评，涵盖业绩回顾、盈利能力、投资逻辑、盈利预测与风险提示，支持 A 股、港股、美股及欧洲市场。

**English**：Wind Alice Global Share Quarterly Earnings Review CLI - generates sell-side style earnings reviews in one click. Enter a company name and reporting period to automatically extract financial data, analyze profitability, synthesize investment themes, reference consensus estimates, and flag key risks, delivering a structured one-page commentary. Covers A-shares, Hong Kong, US, and European markets with automatic adaptation to local disclosure rules. Also detects preliminary earnings announcements.

**示例问法**：帮我点评一下贵州茅台的最新季报

#### 可比公司分析 / Comps Analysis

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **可比公司分析** |
| 英文名（`--skill` 可用） | **Comps Analysis** |
| 目录 / slug | `alice-comps-analysis` |
| CLI 别名 | `acomps` |
| 版本 | 1.0.8 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_COMPS_ANALYSIS` |

**介绍**：Wind Alice 可比公司分析 CLI：构建机构级可比公司分析，覆盖经营指标、估值倍数对比及统计基准分析，输出 Excel 表格 + 文字分析报告。

**English**：Wind Alice Comps Analysis CLI - build institutional-grade Comparable Companies Analysis, delivered in Excel workbook and written analytical report, covering operating metrics, valuation multiple comparisons, and statistical benchmark analysis across peer companies.

**示例问法**：帮我做一份宁德时代的可比公司分析？比亚迪有没有短线机会？

#### 投资标的创意与筛选 / Investment Idea Generation

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **投资标的创意与筛选** |
| 英文名（`--skill` 可用） | **Investment Idea Generation** |
| 目录 / slug | `alice-investment-idea-generation` |
| CLI 别名 | `aiig` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_INVESTMENT_IDEA_GENERATION` |

**介绍**：Wind Alice 投资标的创意与筛选 CLI：从全市场主动发掘投资机会，支持量化因子筛选与主题驱动扫描，输出带有逻辑论据、催化剂和风险提示的结构化投资创意报告。

**English**：Wind Alice Investment Idea Generation CLI - proactively surfaces new investment candidates across global markets via quantitative factor screens and thematic sweeps, with configurable sector, market cap, geography, and style parameters; delivers concise idea reports with thesis, catalysts, and key risks.

**示例问法**：帮我找一些 A 股市场的价值股？

#### 按主题选股 / Thematic Stock Screening

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **按主题选股** |
| 英文名（`--skill` 可用） | **Thematic Stock Screening** |
| 目录 / slug | `alice-thematic-stock-screening` |
| CLI 别名 | `atss` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_THEMATIC_STOCK_SCREENING` |

**介绍**：Wind Alice 按主题选股 CLI：系统拆解主题投资逻辑、验证数据兑现、筛选核心受益标的，输出受益标的表、估值对比、交易建议与风险证伪点。

**English**：Wind Alice Thematic Stock Screening CLI - systematically deconstructs market narratives, validates logic maturity with key data, identifies genuine beneficiaries, and delivers valuation context with historical PE percentile and actionable trading perspective for sector investing and concept stock filtering.

**示例问法**：如何参与AI算力主题？有哪些真受益标的？

#### 券商金股追踪 / Broker Top Picks Tracker

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **券商金股追踪** |
| 英文名（`--skill` 可用） | **Broker Top Picks Tracker** |
| 目录 / slug | `alice-broker-top-picks-tracker` |
| CLI 别名 | `abtpt` |
| 版本 | 1.0.8 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_BROKER_TOP_PICKS_TRACKER` |

**介绍**：Wind Alice 券商金股追踪 CLI：汇总各大券商月度金股推荐，统计推荐热度与行业分布，输出含金股排行、推荐理由摘要与近月变化趋势的结构化报告。

**English**：Wind Alice Broker Top Picks Tracker CLI - aggregates monthly broker top-pick recommendations, ranks stocks by recommendation frequency and heat score, summarizes investment rationale, and delivers sector distribution breakdown and trend charts. Ideal for monthly strategy meetings, sector rotation analysis, and pre-research stock screening.

**示例问法**：2026年5月有哪些券商金股？医药生物有没有短线机会？

#### 机构持仓透视 / Institutional Holdings Insight

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **机构持仓透视** |
| 英文名（`--skill` 可用） | **Institutional Holdings Insight** |
| 目录 / slug | `alice-institutional-holdings-insight` |
| CLI 别名 | `aihi` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_INSTITUTIONAL_HOLDINGS_INSIGHT` |

**介绍**：Wind Alice 机构持仓透视 CLI：追踪顶级机构最新买卖，输出含新建仓/清仓名单、增减持排序、板块资金流向与历史调仓轨迹的一页纸持仓简报

**English**：Wind Alice Institutional Holdings Insight CLI - See what the world's top investors actually bought and sold. Enter a firm or fund name and get a one-page holdings brief: the full list of new and exited positions, the largest buys and sells ranked by estimated trade value, where capital moved between sectors, plus top holdings, quarter-over-quarter history, and charts. Carefully analyzes changes in share count, portfolio weight, and market value. Covers US 13F filings, China fund reports, and Hong Kong disclosures.

**示例问法**：桥水基金最新的 13F 持仓有什么变化？

#### A股短线策略报告 / A-Share Short-Term Strategy Report

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **A股短线策略报告** |
| 英文名（`--skill` 可用） | **A-Share Short-Term Strategy Report** |
| 目录 / slug | `alice-a-share-short-term-strategy-report` |
| CLI 别名 | `aassr` |
| 版本 | 1.0.8 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_A_SHARE_SHORT_TERM_STRATEGY_REPORT` |

**介绍**：Wind Alice A股短线策略报告 CLI：每日收盘后自动拉取 Wind 涨停股与指数行情，梳理热点概念群与资金轮动方向，输出含收盘综述、涨停板复盘、AI 主线研判的结构化报告。

**English**：Pulling daily Wind data on limit-up stocks, index closes, and sector moves, the AI maps hot concept clusters, identifies capital themes via broker research, and delivers a structured closing recap - covering index performance, turnover, sector breakdowns, and forward sector outlook for short-term traders.

**示例问法**：生成今日 A 股短线策略报告

---

### 基金（3 个）

#### 基金对比分析 / Fund Compare

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **基金对比分析** |
| 英文名（`--skill` 可用） | **Fund Compare** |
| 目录 / slug | `alice-fund-compare` |
| CLI 别名 | `afcmp` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_FUND_COMPARE` |

**介绍**：Wind Alice 基金对比分析 CLI：对多只基金做业绩、风险、持仓、管理四维度对比分析，支持客观中立与主观倾向性分析，输出含核心结论、优势、风险、投资建议的结构化报告。

**English**：Wind Alice Fund Compare CLI - comprehensive comparative analysis of multiple funds across performance, risk, portfolio structure, and management assessment, supporting both objective neutral and subjective preference modes, for fund selection, replacement evaluation, portfolio optimization, due diligence, and investment education.

**示例问法**：帮我对比一下华夏成长和易方达中小盘

#### 基金筛选与投资建议 / Fund Screening & Investment Advisory

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **基金筛选与投资建议** |
| 英文名（`--skill` 可用） | **Fund Screening & Investment Advisory** |
| 目录 / slug | `alice-fund-screening-investment-advisory` |
| CLI 别名 | `afsia` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_FUND_SCREENING_INVESTMENT_ADVISORY` |

**介绍**：Wind Alice 基金筛选与投资建议 CLI：多维度基金筛选、对比分析与个性化投资建议，输出含筛选结果、对比分析、配置建议与投资者画像匹配的结构化报告。

**English**：Wind Alice Fund Screening & Investment Advisory CLI - professional fund screening, comparative analysis, and personalized investment recommendations for investment advisors, with multi-dimensional filtering by risk preference, objectives, and horizon, plus allocation suggestions aligned with investor profiles.

**示例问法**：我是平衡型投资者，投资期限3年，帮我筛选几只合适的基金

#### 基金涨跌解读 / Fund Performance Attribution Assistant

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **基金涨跌解读** |
| 英文名（`--skill` 可用） | **Fund Performance Attribution Assistant** |
| 目录 / slug | `alice-fund-performance-attribution` |
| CLI 别名 | `afpa` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_FUND_PERFORMANCE_ATTRIBUTION` |

**介绍**：Wind Alice 基金涨跌解读 CLI：拆解基金或 ETF 一段时间内涨跌背后的持仓贡献、行业影响、事件驱动与宏观因素，并用图表呈现归因结果

**English**：Wind Alice Fund Performance Attribution Assistant CLI - Helps retail clients understand why a fund or ETF went up or down over a selected period by breaking down fund performance, major holdings contribution, sector impact, news events, fund flows, fundamentals, and macro factors, with visual attribution charts. It is for explanation and observation only, and does not provide trading advice or return guarantees.

**示例问法**：帮我分析一下易方达蓝筹精选最近一个月为什么跌了？

---

### 固收 · 信用（3 个）

#### 信用分析 / Credit Analysis

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **信用分析** |
| 英文名（`--skill` 可用） | **Credit Analysis** |
| 目录 / slug | `alice-credit-analysis` |
| CLI 别名 | `aca` |
| 版本 | 1.0.8 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_CREDIT_ANALYSIS` |

**介绍**：Wind Alice 信用分析 CLI：对各类企业 / 机构主体做六大维度系统化信用研究，集成 Wind 风险评分提供更精准违约概率，输出含核心结论、优势、风险、投资建议的结构化报告。

**English**：Wind Alice Credit Analysis CLI - systematic credit research across credit profile, industry risk, financial health, cash-flow quality, rating benchmarking, and default probability for any corporate / institutional entity (LGFV, SOE, private cos, listed cos, financial institutions, real-estate, bond issuers, etc.), integrated with Wind risk scoring for accurate PD estimation.

**示例问法**：帮我分析一下宁德时代的信用资质？万科有没有短线机会？

#### 债券利率走势研判 / Bond Rate Outlook

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **债券利率走势研判** |
| 英文名（`--skill` 可用） | **Bond Rate Outlook** |
| 目录 / slug | `alice-bond-rate-outlook` |
| CLI 别名 | `abro` |
| 版本 | 1.0.8 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_BOND_RATE_OUTLOOK` |

**介绍**：Wind Alice 债券利率走势研判 CLI：支持交易/策略/配置多视角切换，覆盖五大维度系统化研判，输出含利率走势判断、量化评分、交易配置建议的结构化报告。

**English**：Wind Alice Bond Rate Outlook CLI - systematic bond market interest rate trend analysis framework, supporting adaptive switching across trading (1-2 weeks), strategy (1-6 months), and allocation (6 months-2 years) perspectives, covering macro fundamentals, liquidity, supply-demand, yield curve structure, and technical sentiment, integrating quantitative scoring and stress testing.

**示例问法**：今天债市怎么看？国债期货有没有短线机会？

#### 通胀情景债券轮动策略 / Inflation Bond Strategy

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **通胀情景债券轮动策略** |
| 英文名（`--skill` 可用） | **Inflation Bond Strategy** |
| 目录 / slug | `alice-inflation-bond-strategy` |
| CLI 别名 | `aibs` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_INFLATION_BOND_STRATEGY` |

**介绍**：Wind Alice 通胀情景债券轮动策略 CLI：实时追踪 CPI/PPI 四种通胀拐点信号，自动判断当月是否持有债券或转持货币基金（可空仓模式），或在 5/7/10 年期国债指数间做久期轮动（不可空仓模式），支持风险预算约束下的配置优化与历史回测。

**English**：Wind Alice Inflation Bond Strategy CLI - continuously tracks four types of inflation turning-point signals based on CPI/PPI, automatically determines whether to hold bonds or switch to money market funds (long/flat mode), or to rotate duration among 5/7/10-year government bond indices (fully invested mode), supporting allocation optimization under risk-budget constraints and historical NAV backtesting.

**示例问法**：根据最新通胀数据，十年期国债债券怎么配置？

---

### 宏观 · 资产配置（3 个）

#### 宏观数据解读 / Macro Data Interpretation

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **宏观数据解读** |
| 英文名（`--skill` 可用） | **Macro Data Interpretation** |
| 目录 / slug | `alice-macro-data-interpretation` |
| CLI 别名 | `amdi` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_MACRO_DATA_INTERPRETATION` |

**介绍**：Wind Alice 宏观数据解读 CLI：将 CPI/PPI/PMI/GDP/社融/外贸/失业率/利率等宏观指标解读为结构化研究周报，输出结论摘要、核心数据、趋势结构分析与后续跟踪展望。

**English**：Wind Alice Macro Data Interpretation CLI - transforms macroeconomic data into structured, publication-ready research commentary covering key conclusions, core data points, trend and structural drivers, and forward-looking tracking items for CPI, PPI, PMI, GDP, credit aggregates, trade, unemployment, and interest rates.

**示例问法**：解读一下2025年1月CPI数据？通胀压力如何？

#### 资产配置-行业轮动策略 / Asset Allocation - Sector Rotation Strategy

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **资产配置-行业轮动策略** |
| 英文名（`--skill` 可用） | **Asset Allocation - Sector Rotation Strategy** |
| 目录 / slug | `alice-asset-allocation-sector-rotation-strategy` |
| CLI 别名 | `asrs` |
| 版本 | 1.0.5 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_ASSET_ALLOCATION_SECTOR_ROTATION_STRATEGY` |

**介绍**：Wind Alice 资产配置-行业轮动策略 CLI：分析未来 1-6 个月各行业相对强弱与权重倾斜，结合动量、资金面、估值与景气度因子输出超配/中性/低配清单、行业评分、约束检查与可选行业目标权重。

**English**：Use when analyzing 1-6 month equity sector rotation and sector-level tilts, combining momentum, flows, valuation, and fundamentals to produce overweight/neutral/underweight lists, sector scores, constraint checks, and optional sector targets while keeping total equity exposure unchanged.

**示例问法**：未来3个月哪些行业值得超配

#### 资产配置-战略基准组合 / Asset Allocation - Strategic Baseline Portfolio

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **资产配置-战略基准组合** |
| 英文名（`--skill` 可用） | **Asset Allocation - Strategic Baseline Portfolio** |
| 目录 / slug | `alice-asset-allocation-strategic-baseline-portfolio` |
| CLI 别名 | `aasbp` |
| 版本 | 1.0.5 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_ASSET_ALLOCATION_STRATEGIC_BASELINE_PORTFOLIO` |

**介绍**：Wind Alice 资产配置-战略基准组合 CLI：结合风险偏好、投资期限、约束与长期市场数据，制定 3-5 年战略资产配置基准组合，输出大类资产权重、区域目标、指数映射与预期风险收益。

**English**：Use when building a 3-5 year strategic asset allocation baseline from risk profile, horizon, constraints, and long-term market data, producing asset-class weights, regional targets, index mapping, and expected risk/return for downstream sector rotation, TAA, portfolio construction, and rebalancing.

**示例问法**：为养老金设计一个3-5年战略资产配置方案

---

### 商品 · 期货（6 个）

#### 商品智研助手 / Commodity Research Assistant

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **商品智研助手** |
| 英文名（`--skill` 可用） | **Commodity Research Assistant** |
| 目录 / slug | `alice-commodity-research-assistant` |
| CLI 别名 | `acra` |
| 版本 | 1.0.8 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_COMMODITY_RESEARCH_ASSISTANT` |

**介绍**：Wind Alice 商品智研助手 CLI：输入期货品种名称或 Wind Code，自动生成涵盖价格、基差、基本面、远期曲线、资金、仓单、宏观等多维度的商品智能日报或专项分析，输出含核心驱动逻辑与明确结论的结构化报告。

**English**：Wind Alice Commodity Research Assistant CLI - enter a commodity name or Wind Code to auto-generate smart research reports distilling core drivers across price, structure, capital flow, and fundamentals, with clear conclusions for institutional investors and professional traders.

**示例问法**：沪铜日报？铁矿石有没有短线机会？

#### AI商品策略师 / AI Commodity Strategist

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **AI商品策略师** |
| 英文名（`--skill` 可用） | **AI Commodity Strategist** |
| 目录 / slug | `alice-ai-commodity-strategist` |
| CLI 别名 | `aacs` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_AI_COMMODITY_STRATEGIST` |

**介绍**：Wind Alice AI商品策略师 CLI：覆盖能源、黑色、有色、化工、农产品、贵金属全板块的机构级策略输出，支持盘前/盘中/盘后三段运行

**English**：Wind Alice AI Commodity Strategist CLI - Institutional-Grade Strategy Assistant for Commodity Futures, delivering full-cycle strategy outputs for traders, research analysts, portfolio managers, and industrial clients - spanning energy, ferrous metals, non-ferrous metals, chemicals, agricultural products, and precious metals. Operates across three sessions: Pre-Market (before 08:55 / before 20:55), Intraday (continuous trading during day session / night session), and Post-Market (after 15:00 / after 02:30).

**示例问法**：今天的期货盘前策略

#### 期货研报观点 / Futures Research Opinion

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **期货研报观点** |
| 英文名（`--skill` 可用） | **Futures Research Opinion** |
| 目录 / slug | `alice-futures-research-opinion` |
| CLI 别名 | `afro` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_FUTURES_RESEARCH_OPINION` |

**介绍**：Wind Alice 期货研报观点 CLI：聚合国内商品期货机构研报多空观点，计算 Wind 情绪评分，输出含观点分布、研报摘要与情绪走势的结构化报告。

**English**：Wind Alice Futures Research Opinion CLI - aggregates research opinions on domestic commodity futures across major futures institutions, summarizes bullish, bearish, and neutral views by contract or commodity, and extracts the key investment logic behind each report. Enter a futures product and date to get a research-opinion report, institutional view distribution, Wind sentiment score, report summaries, and trend charts.

**示例问法**：铜最近机构怎么看？

#### 期货资金流向监测 / Futures Fund Flow Monitor

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **期货资金流向监测** |
| 英文名（`--skill` 可用） | **Futures Fund Flow Monitor** |
| 目录 / slug | `alice-futures-fund-flow-monitor` |
| CLI 别名 | `affm` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_FUTURES_FUND_FLOW_MONITOR` |

**介绍**：Wind Alice 期货资金流向监测 CLI：基于品种持仓额变化监测全市场、板块与单品种的资金流入流出异动，并结合历史统计评估 T+1/T+5 价格表现

**English**：Wind Alice Futures Fund Flow Monitor CLI - Monitors fund inflows and outflows across domestic commodity futures by tracking changes in open-interest value at the market, sector, or individual product level. It combines current fund-flow changes with historical sample statistics to evaluate T+1 and T+5 price behavior after similar capital movements. Enter a futures product, sector, or date to get fund inflow/outflow rankings, capital-change metrics, price performance, short- and medium-term bullish or bearish opportunity screens, and a fund-flow daily report. Ideal for commodity researchers tracking market capital rotation, drafting daily reports, and for traders conducting pre-market opportunity screening and post-trade review.

**示例问法**：今天商品期货资金整体是流入还是流出？

#### 期货主力行为分析 / Futures Leading Institution Analysis

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **期货主力行为分析** |
| 英文名（`--skill` 可用） | **Futures Leading Institution Analysis** |
| 目录 / slug | `alice-futures-leading-institution-analysis` |
| CLI 别名 | `aflia` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_FUTURES_LEADING_INSTITUTION_ANALYSIS` |

**介绍**：Wind Alice 期货主力行为分析 CLI：分析期货公司代理席位的多空增减仓、净持仓、成交量排名、跨品种持仓与估算盈亏

**English**：Wind Alice Futures Leading Institution Analysis CLI - Futures Leading Institution Analysis uses publicly disclosed futures member-position data to help you understand long and short positions, position changes, net position amounts, and cross-product exposure. It also tracks a member's historical positioning and estimated mark-to-market P&L for a selected contract. With ranking tables, trend charts, and watchlist highlights, it supports post-market review and market-structure monitoring. Results reflect aggregated client positions through member seats and do not represent proprietary views or investment advice.

**示例问法**：今天螺纹钢的主力净多席位有哪些？

#### 期货盘中异动归因 / Intraday Futures Move Attribution

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **期货盘中异动归因** |
| 英文名（`--skill` 可用） | **Intraday Futures Move Attribution** |
| 目录 / slug | `alice-intraday-futures-move-attribution` |
| CLI 别名 | `aifma` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_INTRADAY_FUTURES_MOVE_ATTRIBUTION` |

**介绍**：Wind Alice 期货盘中异动归因 CLI：核验行情、量仓、板块联动、内外盘传导与事件线索，回答某品种为何拉升/跳水/放量/突破，或扫描全市场异动

**English**：Wind Alice Intraday Futures Move Attribution CLI - Analyze intraday or daily unusual moves in commodity futures. Use it to explain why a futures product or contract rallied, sold off, broke out, moved on unusual volume, or to scan which commodity futures are unusual or worth monitoring today or on a specified date. The skill verifies price action, minute bars, daily cross-sections, volume/open interest, sector moves, related markets, and event signals, then produces a structured attribution or unusual-movers report.

**示例问法**：螺纹钢刚才为什么突然拉升？

---

### 期权 · 衍生品（3 个）

#### 期权波动率洞察 / Option Volatility Insights

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **期权波动率洞察** |
| 英文名（`--skill` 可用） | **Option Volatility Insights** |
| 目录 / slug | `alice-option-volatility-insights` |
| CLI 别名 | `aovi` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_OPTION_VOLATILITY_INSIGHTS` |

**介绍**：Wind Alice 期权波动率洞察 CLI：诊断期权 IV 估值、期限结构、Skew、PCR 与波动率曲面，识别市场异动并输出波动率报告

**English**：Wind Alice Option Volatility Insights CLI - Analyze options volatility and market conditions across IV valuation, term structure, skew, PCR, volatility surfaces, and market anomalies. Generate diagnostics, signals, market scans, and reports for volatility trading and options sentiment analysis.

**示例问法**：今天沪深 300 ETF 期权的波动率处于什么水平？

#### 期权交易策略 / Options Trading Strategies

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **期权交易策略** |
| 英文名（`--skill` 可用） | **Options Trading Strategies** |
| 目录 / slug | `alice-options-trading-strategies` |
| CLI 别名 | `aots` |
| 版本 | 1.0.5 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_OPTIONS_TRADING_STRATEGIES` |

**介绍**：Wind Alice 期权交易策略 CLI：融合波动率信号构建、异动打分、策略推荐与情景汇总，输出五段式期权交易方案，适用于个股期权交易、期权怎么做、给出推荐方案

**English**：Trading Skills for Single-Underlying Listed Options. By integrating volatility signal construction, unusual activity scoring, strategy recommendation, and scenario aggregation, it delivers a five-stage options trading solution. Applicable to equity options trading, guide on how to trade options, and actionable recommendation plans

**示例问法**：帮我分析茅台期权的波动率环境

#### 期权定价计算器 / Option Pricing Calculator

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **期权定价计算器** |
| 英文名（`--skill` 可用） | **Option Pricing Calculator** |
| 目录 / slug | `alice-option-pricing-calculator` |
| CLI 别名 | `aopc` |
| 版本 | 1.0.2 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_OPTION_PRICING_CALCULATOR` |

**介绍**：Wind Alice 期权定价计算器 CLI：对香草、二元、障碍、亚式、触碰、鲨鱼鳍、累计及 Autocall/雪球/三层区间等期权做理论定价，输出 NPV 与希腊字母

**English**：Wind Alice Option Pricing Calculator CLI - Option and structured-option theoretical pricing skill. Prices vanilla, binary, barrier, Asian, touch, shark-fin, accumulator, and Autocall/snowball/tri-tier range options; automatically fills in market parameters such as volatility and interest rates; outputs theoretical price (NPV) and Greeks; and supports re-pricing after parameter changes.

**示例问法**：帮我算一下沪深 300 ETF 平值看涨期权的理论价格

---

### 监管 · 政策（2 个）

#### 证券业监管政策简报 / Securities Regulatory Policy Briefing

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **证券业监管政策简报** |
| 英文名（`--skill` 可用） | **Securities Regulatory Policy Briefing** |
| 目录 / slug | `alice-securities-regulatory-policy-briefing` |
| CLI 别名 | `srpb` |
| 版本 | 1.0.5 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_SECURITIES_REGULATORY_POLICY_BRIEFING` |

**介绍**：Wind Alice 证券业监管政策简报 CLI：基于 Wind 监管法规数据库，获取指定时间范围内的证券行业监管政策，生成含政策详情、摘要、清单与机构分布统计的结构化简报，支持中英双语输出。

**English**：Retrieve securities industry regulatory policies within a specified time range and generate structured policy summaries and checklist tables. Built on the Wind regulatory database, it covers the CSRC, SSE, SZSE, BSE, securities/fund/futures industry associations, and the NEEQ, delivering a bilingual structured briefing with policy details, summaries, a checklist, and issuer-distribution statistics.

**示例问法**：查询近一周的证券监管政策

#### 金融监管局处罚月报 / NFRA Monthly Enforcement Report

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **金融监管局处罚月报** |
| 英文名（`--skill` 可用） | **NFRA Monthly Enforcement Report** |
| 目录 / slug | `alice-nfra-monthly-enforcement-report` |
| CLI 别名 | `nmre` |
| 版本 | 1.0.5 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_NFRA_MONTHLY_ENFORCEMENT_REPORT` |

**介绍**：Wind Alice 金融监管局处罚月报 CLI：基于国家金融监督管理总局（NFRA）及各地派出机构的公开处罚数据，按月汇总银行业、保险业、信托业等金融机构的行政处罚信息，生成含处罚概览、趋势分析与明细清单的三章结构化月报，支持中英双语输出。

**English**：Generate an NFRA monthly enforcement report for a specified month. Built on public enforcement data from the National Financial Regulatory Administration (NFRA) and its local offices, it aggregates administrative penalties across banking, insurance, trust, and non-bank financial institutions, delivering a bilingual three-chapter report covering an enforcement overview, trend analysis, and penalty details.

**示例问法**：帮我生成 2026 年 7 月的金融监管处罚月报

---

### 通用研究 · 文档产出（4 个）

#### 深度研究 / Deep Research

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **深度研究** |
| 英文名（`--skill` 可用） | **Deep Research** |
| 目录 / slug | `alice-deep-research` |
| CLI 别名 | `adr` |
| 版本 | 1.0.6 |
| 预计耗时 | 15-30 分钟 |
| 事件前缀 | `ALICE_DEEP_RESEARCH` |

**介绍**：Wind Alice 深度研究 CLI：对任意主题进行结构化、多阶段深度研究，先澄清问题、界定研究范围与维度并确认研究计划，再调度多个并行子代理调研，最终汇总生成全面、详细的专业研究报告。

**English**：Conducts structured, multi-stage deep research on any topic by clarifying the question, scoping the research dimensions, generating a confirmed research plan, dispatching parallel subagents for investigation, and producing a comprehensive final report. Use when the user asks for deep research, in-depth analysis, thorough investigation, comprehensive study, or any research task that requires broad coverage and detailed findings.

**示例问法**：深度研究固态电池技术的商业化进展

#### 事实核验 / Fact Check

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **事实核验** |
| 英文名（`--skill` 可用） | **Fact Check** |
| 目录 / slug | `alice-fact-check` |
| CLI 别名 | `afc` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_FACT_CHECK` |

**介绍**：Wind Alice 事实核验 CLI：粘贴含金融数据、公司声明或行业事件的文字，逐点验证并生成结构化核查报告，标明哪些准确、哪些有出入、哪些查不到。

**English**：Wind Alice Fact Check CLI - verify financial information from external sources by pasting a passage with data, corporate claims, or industry events; get a structured report with point-by-point fact-checking showing what's accurate, off, or unverifiable.

**示例问法**：帮我校验这段话里的数据是否准确：中国平安 2025 年净利润同比增长 47.8%

#### 市场规模测算与战略建模 / Market Sizing & Strategic Modeling

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **市场规模测算与战略建模** |
| 英文名（`--skill` 可用） | **Market Sizing & Strategic Modeling** |
| 目录 / slug | `alice-market-sizing-strategic-modeling` |
| CLI 别名 | `amssm` |
| 版本 | 1.0.10 |
| 预计耗时 | 2-15 分钟 |
| 事件前缀 | `ALICE_MARKET_SIZING_STRATEGIC_MODELING` |

**介绍**：Wind Alice 市场规模测算与战略建模 CLI：Top-down / Bottom-up 双路径交叉验证，结合多情景预测与敏感性分析，输出 Excel 市场规模模型与结构化研究报告。

**English**：Wind Alice Market Sizing & Strategic Modeling CLI - builds structured, defensible market sizing models via top-down and bottom-up triangulation, with historical backfill, forward growth forecasts, scenario analysis, and sensitivity testing for strategic planning, due diligence, and investment evaluation.

**示例问法**：测算中国AI大模型应用市场规模？未来5年CAGR如何？

#### 幻灯片 / PPT Generator

| 字段 | 值 |
|------|-----|
| 中文名（`--skill` 可用） | **幻灯片** |
| 英文名（`--skill` 可用） | **PPT Generator** |
| 目录 / slug | `alice-ppt-generator` |
| CLI 别名 | `apg` |
| 版本 | 1.0.5 |
| 预计耗时 | 15-30 分钟 |
| 事件前缀 | `ALICE_PPT_GENERATOR` |

**介绍**：Wind Alice 幻灯片（PPT 生成）CLI：根据主题与结构化内容自动生成专业 PPT 报告，支持标题页、目录、章节页、图文排版与结论总结，适用于投资与金融汇报、商业与管理汇报、产品与市场展示、培训与教育课件等场景。

**English**：Use this skill for gated PPTX delivery when the user needs a finance-grade or business-grade deck with multi-stage confirmation, structured quality gates, artifact-driven recovery, or controlled incremental revision. Use it for formal PPT generation and delivery workflows, not lightweight one-off PPT reading.

**示例问法**：帮我做一份新能源汽车行业的投资研究 PPT，12 页

---

## 附录 A：4 个专家（Experts）

专家包与技能包的区别：专家包是**多轮对话型入口**，用户原话**原样透传不加前缀**，靠请求体 `data.activeSubAgent` 指定服务端子 Agent。

| # | 中文名 | 英文名 | slug | 别名 | `activeSubAgent` |
|---|--------|--------|------|------|------------------|
| 1 | **WindAlice个股研究专家** | WindAlice Equity Research Expert | `alice-equity-research-expert` | `aere` | `equity-deep-research-agent` |
| 2 | **WindAlice万得金融专家** | WindAlice Financial Expert | `alice-financial-copilot` | `afcop` | （不传，自身即总入口） |
| 3 | **Wind Alice 会议专家** | Wind Alice Meeting Expert | `alice-meeting-expert` | `ame` | `meeting` |
| 4 | **WindAlice财富管理顾问** | WindAlice Wealth Management Advisor | `alice-wealth-advisor` | `awa` | `advisor` |

本仓已落地其中 3 个专家（第 2 项万得金融专家未落地）：[`wind-alice-equity-research-expert`](../skills/wind-alice-equity-research-expert)、[`wind-alice-wealth-advisor`](../skills/wind-alice-wealth-advisor)、[`wind-alice-meeting-expert`](../skills/wind-alice-meeting-expert)；技能包入口是 [`wind-alice`](../skills/wind-alice)。

## 附录 B：请求体 `data` 字段

| 字段 | 值 | 说明 |
|------|-----|------|
| `chatMode` | `"12"` | 固定 |
| `originalChatMode` | `"4"` | 固定 |
| `switchMode` | `"auto"` | 固定 |
| `timezone` | `"Asia/Shanghai"` | 固定 |
| `activeSubAgent` | 见附录 A | **仅专家包携带**，技能包不带 |
| `metadata.key` | `Wind.WindSearch.ChatService.A2A` | 固定 |
| `metadata.version` | `1.0.0` | 固定 |

例子：
Company One-Page Investment Memo（上市公司一页纸投资报告）
技能简介
为指定上市公司（A 股 / 港股 / 美股 / 全球市场）一键生成结构化的"一页纸投资报告"，从公司速览到投资逻辑、催化剂、财务估值、风险与操作建议，按卖方研究通行范式排布，便于在晨会、投决会、首次覆盖前快速形成观点。

核心能力
1. 公司速览与核心竞争力
主营业务、商业模式、客户群体、产业链位置
市场地位、市场份额、技术壁垒与差异化
管理层背景与核心团队
2. 投资逻辑提炼
综合最新研报观点，提炼 3-5 条投资逻辑
行业景气度、需求变化、竞争格局
评级与目标价的近期变化
3. 近期催化剂与跟踪指标
近 3 个月已落地的重大事件（订单、产品、股东动向等）
未来 1 年内值得关注的事件节点与跟踪指标
海外市场进展、政策与监管变化
4. 财务与估值分析
历史与一致预测的营收、归母净利润、毛利率、净利率
业务拆分（SOTP）数据
估值矩阵：PE / PB / PS / EV-EBITDA / PEG 与可比公司估值对标
估值数据缺失时按公开数据递推计算
5. 风险评估与操作建议
上行 / 下行风险，重点指向盈利预测关键假设
1-2 个最可能破坏投资逻辑的核心风险
综合结论与操作建议
适用问题示例
"帮我生成一份宁德时代的一页纸投资报告"
"分析 NVDA 的投资价值"
"贵州茅台的股票投资要点是什么？"
"对 2513.HK 做一份快速分析"
"Generate a one-pager for AAPL"
输出形式
完整一页纸投资报告（Markdown 结构化）
中文提问输出中文；英文提问输出英文
货币、单位、盈利指标根据上市地自动适配（A 股：人民币 / 归母净利润；美股：USD / Non-GAAP 等）
历史与预测年份采用动态相对口径（YYYY-1A / YYYYE / YYYY+1E 等）
版本
当前版本：v2.2.0