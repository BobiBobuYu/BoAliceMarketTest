# Wind.Weaver.Alice.CLI 技能与专家清单

> 本文档由 `src/skills/*/skill.config.json`、`src/skills/*/SKILL.md` frontmatter、`src/experts/*/skills/*/skill.config.json`、`src/experts/*/agents/*.md` frontmatter 及 `src/scripts/request.js` 自动整理而成。

统计：**技能 33 个**、**专家 4 个**。

- 技能包（`packageType: skill`）：单一垂直任务，CLI 会自动给 prompt 加 `使用「<技能中文名>」技能：` 前缀。
- 专家包（`packageType: expert`）：多轮对话型入口，用户原话**原样透传**（`promptPrefix: false`），并在请求体中带 `activeSubAgent` 指定服务端子 Agent。

---

## 一、技能清单（Skills）

| # | 英文名称 | 中文名称 | 目录 / slug | 别名 | 版本 | 预计耗时 |
|---|---------|---------|------------|------|------|---------|
| 1 | A-Share Short-Term Strategy Report | A股短线策略报告 | `alice-a-share-short-term-strategy-report` | `aassr` | 1.0.8 | 2-15 分钟 |
| 2 | AI Commodity Strategist | AI商品策略师 | `alice-ai-commodity-strategist` | `aacs` | 1.0.2 | 2-15 分钟 |
| 3 | Asset Allocation - Sector Rotation Strategy | 资产配置-行业轮动策略 | `alice-asset-allocation-sector-rotation-strategy` | `asrs` | 1.0.5 | 2-15 分钟 |
| 4 | Asset Allocation - Strategic Baseline Portfolio | 资产配置-战略基准组合 | `alice-asset-allocation-strategic-baseline-portfolio` | `aasbp` | 1.0.5 | 2-15 分钟 |
| 5 | Bond Rate Outlook | 债券利率走势研判 | `alice-bond-rate-outlook` | `abro` | 1.0.8 | 2-15 分钟 |
| 6 | Broker Top Picks Tracker | 券商金股追踪 | `alice-broker-top-picks-tracker` | `abtpt` | 1.0.8 | 2-15 分钟 |
| 7 | Commodity Research Assistant | 商品智研助手 | `alice-commodity-research-assistant` | `acra` | 1.0.8 | 2-15 分钟 |
| 8 | Company One-Page Investment Memo | 公司一页纸 | `alice-company-one-page-investment-memo` | `acom` | 1.0.8 | 2-15 分钟 |
| 9 | Comps Analysis | 可比公司分析 | `alice-comps-analysis` | `acomps` | 1.0.8 | 2-15 分钟 |
| 10 | Credit Analysis | 信用分析 | `alice-credit-analysis` | `aca` | 1.0.8 | 2-15 分钟 |
| 11 | Deep Research | 深度研究 | `alice-deep-research` | `adr` | 1.0.6 | 15-30 分钟 |
| 12 | Fact Check | 事实核验 | `alice-fact-check` | `afc` | 1.0.10 | 2-15 分钟 |
| 13 | Fund Compare | 基金对比分析 | `alice-fund-compare` | `afcmp` | 1.0.10 | 2-15 分钟 |
| 14 | Fund Performance Attribution Assistant | 基金涨跌解读 | `alice-fund-performance-attribution` | `afpa` | 1.0.2 | 2-15 分钟 |
| 15 | Fund Screening & Investment Advisory | 基金筛选与投资建议 | `alice-fund-screening-investment-advisory` | `afsia` | 1.0.10 | 2-15 分钟 |
| 16 | Futures Fund Flow Monitor | 期货资金流向监测 | `alice-futures-fund-flow-monitor` | `affm` | 1.0.2 | 2-15 分钟 |
| 17 | Futures Leading Institution Analysis | 期货主力行为分析 | `alice-futures-leading-institution-analysis` | `aflia` | 1.0.2 | 2-15 分钟 |
| 18 | Futures Research Opinion | 期货研报观点 | `alice-futures-research-opinion` | `afro` | 1.0.10 | 2-15 分钟 |
| 19 | Global Share Quarterly Earnings Review | 全球上市公司季报点评 | `alice-global-share-quarterly-earnings-review` | `agsqer` | 1.0.10 | 2-15 分钟 |
| 20 | Inflation Bond Strategy | 通胀情景债券轮动策略 | `alice-inflation-bond-strategy` | `aibs` | 1.0.10 | 2-15 分钟 |
| 21 | Institutional Holdings Insight | 机构持仓透视 | `alice-institutional-holdings-insight` | `aihi` | 1.0.2 | 2-15 分钟 |
| 22 | Intraday Futures Move Attribution | 期货盘中异动归因 | `alice-intraday-futures-move-attribution` | `aifma` | 1.0.2 | 2-15 分钟 |
| 23 | Investment Idea Generation | 投资标的创意与筛选 | `alice-investment-idea-generation` | `aiig` | 1.0.10 | 2-15 分钟 |
| 24 | Macro Data Interpretation | 宏观数据解读 | `alice-macro-data-interpretation` | `amdi` | 1.0.10 | 2-15 分钟 |
| 25 | Market Sizing & Strategic Modeling | 市场规模测算与战略建模 | `alice-market-sizing-strategic-modeling` | `amssm` | 1.0.10 | 2-15 分钟 |
| 26 | NFRA Monthly Enforcement Report | 金融监管局处罚月报 | `alice-nfra-monthly-enforcement-report` | `nmre` | 1.0.5 | 2-15 分钟 |
| 27 | Option Pricing Calculator | 期权定价计算器 | `alice-option-pricing-calculator` | `aopc` | 1.0.2 | 2-15 分钟 |
| 28 | Option Volatility Insights | 期权波动率洞察 | `alice-option-volatility-insights` | `aovi` | 1.0.2 | 2-15 分钟 |
| 29 | Options Trading Strategies | 期权交易策略 | `alice-options-trading-strategies` | `aots` | 1.0.5 | 2-15 分钟 |
| 30 | PPT Generator | 幻灯片 | `alice-ppt-generator` | `apg` | 1.0.5 | 15-30 分钟 |
| 31 | Securities Regulatory Policy Briefing | 证券业监管政策简报 | `alice-securities-regulatory-policy-briefing` | `srpb` | 1.0.5 | 2-15 分钟 |
| 32 | Stock DD List | 上市公司调研问题清单 | `alice-stock-dd-list` | `asdl` | 1.0.10 | 2-15 分钟 |
| 33 | Thematic Stock Screening | 按主题选股 | `alice-thematic-stock-screening` | `atss` | 1.0.10 | 2-15 分钟 |

### 技能描述明细

#### 1. A-Share Short-Term Strategy Report / A股短线策略报告

- **slug**：`alice-a-share-short-term-strategy-report`　**别名**：`aassr`　**版本**：1.0.8　**事件前缀**：`ALICE_A_SHARE_SHORT_TERM_STRATEGY_REPORT`
- **中文描述**：Wind Alice A股短线策略报告 CLI：每日收盘后自动拉取 Wind 涨停股与指数行情，梳理热点概念群与资金轮动方向，输出含收盘综述、涨停板复盘、AI 主线研判的结构化报告。
- **英文描述**：Pulling daily Wind data on limit-up stocks, index closes, and sector moves, the AI maps hot concept clusters, identifies capital themes via broker research, and delivers a structured closing recap - covering index performance, turnover, sector breakdowns, and forward sector outlook for short-term traders.
- **示例问法**：生成今日 A 股短线策略报告

#### 2. AI Commodity Strategist / AI商品策略师

- **slug**：`alice-ai-commodity-strategist`　**别名**：`aacs`　**版本**：1.0.2　**事件前缀**：`ALICE_AI_COMMODITY_STRATEGIST`
- **中文描述**：Wind Alice AI商品策略师 CLI：覆盖能源、黑色、有色、化工、农产品、贵金属全板块的机构级策略输出，支持盘前/盘中/盘后三段运行
- **英文描述**：Wind Alice AI Commodity Strategist CLI - Institutional-Grade Strategy Assistant for Commodity Futures, delivering full-cycle strategy outputs for traders, research analysts, portfolio managers, and industrial clients - spanning energy, ferrous metals, non-ferrous metals, chemicals, agricultural products, and precious metals. Operates across three sessions: Pre-Market (before 08:55 / before 20:55), Intraday (continuous trading during day session / night session), and Post-Market (after 15:00 / after 02:30).
- **示例问法**：今天的期货盘前策略

#### 3. Asset Allocation - Sector Rotation Strategy / 资产配置-行业轮动策略

- **slug**：`alice-asset-allocation-sector-rotation-strategy`　**别名**：`asrs`　**版本**：1.0.5　**事件前缀**：`ALICE_ASSET_ALLOCATION_SECTOR_ROTATION_STRATEGY`
- **中文描述**：Wind Alice 资产配置-行业轮动策略 CLI：分析未来 1-6 个月各行业相对强弱与权重倾斜，结合动量、资金面、估值与景气度因子输出超配/中性/低配清单、行业评分、约束检查与可选行业目标权重。
- **英文描述**：Use when analyzing 1-6 month equity sector rotation and sector-level tilts, combining momentum, flows, valuation, and fundamentals to produce overweight/neutral/underweight lists, sector scores, constraint checks, and optional sector targets while keeping total equity exposure unchanged.
- **示例问法**：未来3个月哪些行业值得超配

#### 4. Asset Allocation - Strategic Baseline Portfolio / 资产配置-战略基准组合

- **slug**：`alice-asset-allocation-strategic-baseline-portfolio`　**别名**：`aasbp`　**版本**：1.0.5　**事件前缀**：`ALICE_ASSET_ALLOCATION_STRATEGIC_BASELINE_PORTFOLIO`
- **中文描述**：Wind Alice 资产配置-战略基准组合 CLI：结合风险偏好、投资期限、约束与长期市场数据，制定 3-5 年战略资产配置基准组合，输出大类资产权重、区域目标、指数映射与预期风险收益。
- **英文描述**：Use when building a 3-5 year strategic asset allocation baseline from risk profile, horizon, constraints, and long-term market data, producing asset-class weights, regional targets, index mapping, and expected risk/return for downstream sector rotation, TAA, portfolio construction, and rebalancing.
- **示例问法**：为养老金设计一个3-5年战略资产配置方案

#### 5. Bond Rate Outlook / 债券利率走势研判

- **slug**：`alice-bond-rate-outlook`　**别名**：`abro`　**版本**：1.0.8　**事件前缀**：`ALICE_BOND_RATE_OUTLOOK`
- **中文描述**：Wind Alice 债券利率走势研判 CLI：支持交易/策略/配置多视角切换，覆盖五大维度系统化研判，输出含利率走势判断、量化评分、交易配置建议的结构化报告。
- **英文描述**：Wind Alice Bond Rate Outlook CLI - systematic bond market interest rate trend analysis framework, supporting adaptive switching across trading (1-2 weeks), strategy (1-6 months), and allocation (6 months-2 years) perspectives, covering macro fundamentals, liquidity, supply-demand, yield curve structure, and technical sentiment, integrating quantitative scoring and stress testing.
- **示例问法**：今天债市怎么看？国债期货有没有短线机会？

#### 6. Broker Top Picks Tracker / 券商金股追踪

- **slug**：`alice-broker-top-picks-tracker`　**别名**：`abtpt`　**版本**：1.0.8　**事件前缀**：`ALICE_BROKER_TOP_PICKS_TRACKER`
- **中文描述**：Wind Alice 券商金股追踪 CLI：汇总各大券商月度金股推荐，统计推荐热度与行业分布，输出含金股排行、推荐理由摘要与近月变化趋势的结构化报告。
- **英文描述**：Wind Alice Broker Top Picks Tracker CLI - aggregates monthly broker top-pick recommendations, ranks stocks by recommendation frequency and heat score, summarizes investment rationale, and delivers sector distribution breakdown and trend charts. Ideal for monthly strategy meetings, sector rotation analysis, and pre-research stock screening.
- **示例问法**：2026年5月有哪些券商金股？医药生物有没有短线机会？

#### 7. Commodity Research Assistant / 商品智研助手

- **slug**：`alice-commodity-research-assistant`　**别名**：`acra`　**版本**：1.0.8　**事件前缀**：`ALICE_COMMODITY_RESEARCH_ASSISTANT`
- **中文描述**：Wind Alice 商品智研助手 CLI：输入期货品种名称或 Wind Code，自动生成涵盖价格、基差、基本面、远期曲线、资金、仓单、宏观等多维度的商品智能日报或专项分析，输出含核心驱动逻辑与明确结论的结构化报告。
- **英文描述**：Wind Alice Commodity Research Assistant CLI - enter a commodity name or Wind Code to auto-generate smart research reports distilling core drivers across price, structure, capital flow, and fundamentals, with clear conclusions for institutional investors and professional traders.
- **示例问法**：沪铜日报？铁矿石有没有短线机会？

#### 8. Company One-Page Investment Memo / 公司一页纸

- **slug**：`alice-company-one-page-investment-memo`　**别名**：`acom`　**版本**：1.0.8　**事件前缀**：`ALICE_COMPANY_ONE_PAGE_INVESTMENT_MEMO`
- **中文描述**：Wind Alice 公司一页纸 CLI：为上市公司生成结构化一页纸投资报告，涵盖公司速览、投资逻辑、催化剂、财务估值、风险评估与操作建议，支持 A 股、港股、美股等全球市场。
- **英文描述**：Wind Alice Company One-Page Investment Memo CLI - generates structured one-page investment reports for listed companies across global markets (A-shares, HK, US, etc.), covering company overview, investment thesis, catalysts & tracking metrics, financial & valuation analysis, risk assessment, and actionable recommendations.
- **示例问法**：请分析一下比亚迪的投资价值？腾讯有没有短线机会？

#### 9. Comps Analysis / 可比公司分析

- **slug**：`alice-comps-analysis`　**别名**：`acomps`　**版本**：1.0.8　**事件前缀**：`ALICE_COMPS_ANALYSIS`
- **中文描述**：Wind Alice 可比公司分析 CLI：构建机构级可比公司分析，覆盖经营指标、估值倍数对比及统计基准分析，输出 Excel 表格 + 文字分析报告。
- **英文描述**：Wind Alice Comps Analysis CLI - build institutional-grade Comparable Companies Analysis, delivered in Excel workbook and written analytical report, covering operating metrics, valuation multiple comparisons, and statistical benchmark analysis across peer companies.
- **示例问法**：帮我做一份宁德时代的可比公司分析？比亚迪有没有短线机会？

#### 10. Credit Analysis / 信用分析

- **slug**：`alice-credit-analysis`　**别名**：`aca`　**版本**：1.0.8　**事件前缀**：`ALICE_CREDIT_ANALYSIS`
- **中文描述**：Wind Alice 信用分析 CLI：对各类企业 / 机构主体做六大维度系统化信用研究，集成 Wind 风险评分提供更精准违约概率，输出含核心结论、优势、风险、投资建议的结构化报告。
- **英文描述**：Wind Alice Credit Analysis CLI - systematic credit research across credit profile, industry risk, financial health, cash-flow quality, rating benchmarking, and default probability for any corporate / institutional entity (LGFV, SOE, private cos, listed cos, financial institutions, real-estate, bond issuers, etc.), integrated with Wind risk scoring for accurate PD estimation.
- **示例问法**：帮我分析一下宁德时代的信用资质？万科有没有短线机会？

#### 11. Deep Research / 深度研究

- **slug**：`alice-deep-research`　**别名**：`adr`　**版本**：1.0.6　**事件前缀**：`ALICE_DEEP_RESEARCH`
- **中文描述**：Wind Alice 深度研究 CLI：对任意主题进行结构化、多阶段深度研究，先澄清问题、界定研究范围与维度并确认研究计划，再调度多个并行子代理调研，最终汇总生成全面、详细的专业研究报告。
- **英文描述**：Conducts structured, multi-stage deep research on any topic by clarifying the question, scoping the research dimensions, generating a confirmed research plan, dispatching parallel subagents for investigation, and producing a comprehensive final report. Use when the user asks for deep research, in-depth analysis, thorough investigation, comprehensive study, or any research task that requires broad coverage and detailed findings.
- **示例问法**：深度研究固态电池技术的商业化进展

#### 12. Fact Check / 事实核验

- **slug**：`alice-fact-check`　**别名**：`afc`　**版本**：1.0.10　**事件前缀**：`ALICE_FACT_CHECK`
- **中文描述**：Wind Alice 事实核验 CLI：粘贴含金融数据、公司声明或行业事件的文字，逐点验证并生成结构化核查报告，标明哪些准确、哪些有出入、哪些查不到。
- **英文描述**：Wind Alice Fact Check CLI - verify financial information from external sources by pasting a passage with data, corporate claims, or industry events; get a structured report with point-by-point fact-checking showing what's accurate, off, or unverifiable.
- **示例问法**：帮我校验这段话里的数据是否准确：中国平安 2025 年净利润同比增长 47.8%

#### 13. Fund Compare / 基金对比分析

- **slug**：`alice-fund-compare`　**别名**：`afcmp`　**版本**：1.0.10　**事件前缀**：`ALICE_FUND_COMPARE`
- **中文描述**：Wind Alice 基金对比分析 CLI：对多只基金做业绩、风险、持仓、管理四维度对比分析，支持客观中立与主观倾向性分析，输出含核心结论、优势、风险、投资建议的结构化报告。
- **英文描述**：Wind Alice Fund Compare CLI - comprehensive comparative analysis of multiple funds across performance, risk, portfolio structure, and management assessment, supporting both objective neutral and subjective preference modes, for fund selection, replacement evaluation, portfolio optimization, due diligence, and investment education.
- **示例问法**：帮我对比一下华夏成长和易方达中小盘

#### 14. Fund Performance Attribution Assistant / 基金涨跌解读

- **slug**：`alice-fund-performance-attribution`　**别名**：`afpa`　**版本**：1.0.2　**事件前缀**：`ALICE_FUND_PERFORMANCE_ATTRIBUTION`
- **中文描述**：Wind Alice 基金涨跌解读 CLI：拆解基金或 ETF 一段时间内涨跌背后的持仓贡献、行业影响、事件驱动与宏观因素，并用图表呈现归因结果
- **英文描述**：Wind Alice Fund Performance Attribution Assistant CLI - Helps retail clients understand why a fund or ETF went up or down over a selected period by breaking down fund performance, major holdings contribution, sector impact, news events, fund flows, fundamentals, and macro factors, with visual attribution charts. It is for explanation and observation only, and does not provide trading advice or return guarantees.
- **示例问法**：帮我分析一下易方达蓝筹精选最近一个月为什么跌了？

#### 15. Fund Screening & Investment Advisory / 基金筛选与投资建议

- **slug**：`alice-fund-screening-investment-advisory`　**别名**：`afsia`　**版本**：1.0.10　**事件前缀**：`ALICE_FUND_SCREENING_INVESTMENT_ADVISORY`
- **中文描述**：Wind Alice 基金筛选与投资建议 CLI：多维度基金筛选、对比分析与个性化投资建议，输出含筛选结果、对比分析、配置建议与投资者画像匹配的结构化报告。
- **英文描述**：Wind Alice Fund Screening & Investment Advisory CLI - professional fund screening, comparative analysis, and personalized investment recommendations for investment advisors, with multi-dimensional filtering by risk preference, objectives, and horizon, plus allocation suggestions aligned with investor profiles.
- **示例问法**：我是平衡型投资者，投资期限3年，帮我筛选几只合适的基金

#### 16. Futures Fund Flow Monitor / 期货资金流向监测

- **slug**：`alice-futures-fund-flow-monitor`　**别名**：`affm`　**版本**：1.0.2　**事件前缀**：`ALICE_FUTURES_FUND_FLOW_MONITOR`
- **中文描述**：Wind Alice 期货资金流向监测 CLI：基于品种持仓额变化监测全市场、板块与单品种的资金流入流出异动，并结合历史统计评估 T+1/T+5 价格表现
- **英文描述**：Wind Alice Futures Fund Flow Monitor CLI - Monitors fund inflows and outflows across domestic commodity futures by tracking changes in open-interest value at the market, sector, or individual product level. It combines current fund-flow changes with historical sample statistics to evaluate T+1 and T+5 price behavior after similar capital movements. Enter a futures product, sector, or date to get fund inflow/outflow rankings, capital-change metrics, price performance, short- and medium-term bullish or bearish opportunity screens, and a fund-flow daily report. Ideal for commodity researchers tracking market capital rotation, drafting daily reports, and for traders conducting pre-market opportunity screening and post-trade review.
- **示例问法**：今天商品期货资金整体是流入还是流出？

#### 17. Futures Leading Institution Analysis / 期货主力行为分析

- **slug**：`alice-futures-leading-institution-analysis`　**别名**：`aflia`　**版本**：1.0.2　**事件前缀**：`ALICE_FUTURES_LEADING_INSTITUTION_ANALYSIS`
- **中文描述**：Wind Alice 期货主力行为分析 CLI：分析期货公司代理席位的多空增减仓、净持仓、成交量排名、跨品种持仓与估算盈亏
- **英文描述**：Wind Alice Futures Leading Institution Analysis CLI - Futures Leading Institution Analysis uses publicly disclosed futures member-position data to help you understand long and short positions, position changes, net position amounts, and cross-product exposure. It also tracks a member's historical positioning and estimated mark-to-market P&L for a selected contract. With ranking tables, trend charts, and watchlist highlights, it supports post-market review and market-structure monitoring. Results reflect aggregated client positions through member seats and do not represent proprietary views or investment advice.
- **示例问法**：今天螺纹钢的主力净多席位有哪些？

#### 18. Futures Research Opinion / 期货研报观点

- **slug**：`alice-futures-research-opinion`　**别名**：`afro`　**版本**：1.0.10　**事件前缀**：`ALICE_FUTURES_RESEARCH_OPINION`
- **中文描述**：Wind Alice 期货研报观点 CLI：聚合国内商品期货机构研报多空观点，计算 Wind 情绪评分，输出含观点分布、研报摘要与情绪走势的结构化报告。
- **英文描述**：Wind Alice Futures Research Opinion CLI - aggregates research opinions on domestic commodity futures across major futures institutions, summarizes bullish, bearish, and neutral views by contract or commodity, and extracts the key investment logic behind each report. Enter a futures product and date to get a research-opinion report, institutional view distribution, Wind sentiment score, report summaries, and trend charts.
- **示例问法**：铜最近机构怎么看？

#### 19. Global Share Quarterly Earnings Review / 全球上市公司季报点评

- **slug**：`alice-global-share-quarterly-earnings-review`　**别名**：`agsqer`　**版本**：1.0.10　**事件前缀**：`ALICE_GLOBAL_SHARE_QUARTERLY_EARNINGS_REVIEW`
- **中文描述**：Wind Alice 全球上市公司季报点评 CLI：一键生成卖方研究风格财报点评，涵盖业绩回顾、盈利能力、投资逻辑、盈利预测与风险提示，支持 A 股、港股、美股及欧洲市场。
- **英文描述**：Wind Alice Global Share Quarterly Earnings Review CLI - generates sell-side style earnings reviews in one click. Enter a company name and reporting period to automatically extract financial data, analyze profitability, synthesize investment themes, reference consensus estimates, and flag key risks, delivering a structured one-page commentary. Covers A-shares, Hong Kong, US, and European markets with automatic adaptation to local disclosure rules. Also detects preliminary earnings announcements.
- **示例问法**：帮我点评一下贵州茅台的最新季报

#### 20. Inflation Bond Strategy / 通胀情景债券轮动策略

- **slug**：`alice-inflation-bond-strategy`　**别名**：`aibs`　**版本**：1.0.10　**事件前缀**：`ALICE_INFLATION_BOND_STRATEGY`
- **中文描述**：Wind Alice 通胀情景债券轮动策略 CLI：实时追踪 CPI/PPI 四种通胀拐点信号，自动判断当月是否持有债券或转持货币基金（可空仓模式），或在 5/7/10 年期国债指数间做久期轮动（不可空仓模式），支持风险预算约束下的配置优化与历史回测。
- **英文描述**：Wind Alice Inflation Bond Strategy CLI - continuously tracks four types of inflation turning-point signals based on CPI/PPI, automatically determines whether to hold bonds or switch to money market funds (long/flat mode), or to rotate duration among 5/7/10-year government bond indices (fully invested mode), supporting allocation optimization under risk-budget constraints and historical NAV backtesting.
- **示例问法**：根据最新通胀数据，十年期国债债券怎么配置？

#### 21. Institutional Holdings Insight / 机构持仓透视

- **slug**：`alice-institutional-holdings-insight`　**别名**：`aihi`　**版本**：1.0.2　**事件前缀**：`ALICE_INSTITUTIONAL_HOLDINGS_INSIGHT`
- **中文描述**：Wind Alice 机构持仓透视 CLI：追踪顶级机构最新买卖，输出含新建仓/清仓名单、增减持排序、板块资金流向与历史调仓轨迹的一页纸持仓简报
- **英文描述**：Wind Alice Institutional Holdings Insight CLI - See what the world's top investors actually bought and sold. Enter a firm or fund name and get a one-page holdings brief: the full list of new and exited positions, the largest buys and sells ranked by estimated trade value, where capital moved between sectors, plus top holdings, quarter-over-quarter history, and charts. Carefully analyzes changes in share count, portfolio weight, and market value. Covers US 13F filings, China fund reports, and Hong Kong disclosures.
- **示例问法**：桥水基金最新的 13F 持仓有什么变化？

#### 22. Intraday Futures Move Attribution / 期货盘中异动归因

- **slug**：`alice-intraday-futures-move-attribution`　**别名**：`aifma`　**版本**：1.0.2　**事件前缀**：`ALICE_INTRADAY_FUTURES_MOVE_ATTRIBUTION`
- **中文描述**：Wind Alice 期货盘中异动归因 CLI：核验行情、量仓、板块联动、内外盘传导与事件线索，回答某品种为何拉升/跳水/放量/突破，或扫描全市场异动
- **英文描述**：Wind Alice Intraday Futures Move Attribution CLI - Analyze intraday or daily unusual moves in commodity futures. Use it to explain why a futures product or contract rallied, sold off, broke out, moved on unusual volume, or to scan which commodity futures are unusual or worth monitoring today or on a specified date. The skill verifies price action, minute bars, daily cross-sections, volume/open interest, sector moves, related markets, and event signals, then produces a structured attribution or unusual-movers report.
- **示例问法**：螺纹钢刚才为什么突然拉升？

#### 23. Investment Idea Generation / 投资标的创意与筛选

- **slug**：`alice-investment-idea-generation`　**别名**：`aiig`　**版本**：1.0.10　**事件前缀**：`ALICE_INVESTMENT_IDEA_GENERATION`
- **中文描述**：Wind Alice 投资标的创意与筛选 CLI：从全市场主动发掘投资机会，支持量化因子筛选与主题驱动扫描，输出带有逻辑论据、催化剂和风险提示的结构化投资创意报告。
- **英文描述**：Wind Alice Investment Idea Generation CLI - proactively surfaces new investment candidates across global markets via quantitative factor screens and thematic sweeps, with configurable sector, market cap, geography, and style parameters; delivers concise idea reports with thesis, catalysts, and key risks.
- **示例问法**：帮我找一些 A 股市场的价值股？

#### 24. Macro Data Interpretation / 宏观数据解读

- **slug**：`alice-macro-data-interpretation`　**别名**：`amdi`　**版本**：1.0.10　**事件前缀**：`ALICE_MACRO_DATA_INTERPRETATION`
- **中文描述**：Wind Alice 宏观数据解读 CLI：将 CPI/PPI/PMI/GDP/社融/外贸/失业率/利率等宏观指标解读为结构化研究周报，输出结论摘要、核心数据、趋势结构分析与后续跟踪展望。
- **英文描述**：Wind Alice Macro Data Interpretation CLI - transforms macroeconomic data into structured, publication-ready research commentary covering key conclusions, core data points, trend and structural drivers, and forward-looking tracking items for CPI, PPI, PMI, GDP, credit aggregates, trade, unemployment, and interest rates.
- **示例问法**：解读一下2025年1月CPI数据？通胀压力如何？

#### 25. Market Sizing & Strategic Modeling / 市场规模测算与战略建模

- **slug**：`alice-market-sizing-strategic-modeling`　**别名**：`amssm`　**版本**：1.0.10　**事件前缀**：`ALICE_MARKET_SIZING_STRATEGIC_MODELING`
- **中文描述**：Wind Alice 市场规模测算与战略建模 CLI：Top-down / Bottom-up 双路径交叉验证，结合多情景预测与敏感性分析，输出 Excel 市场规模模型与结构化研究报告。
- **英文描述**：Wind Alice Market Sizing & Strategic Modeling CLI - builds structured, defensible market sizing models via top-down and bottom-up triangulation, with historical backfill, forward growth forecasts, scenario analysis, and sensitivity testing for strategic planning, due diligence, and investment evaluation.
- **示例问法**：测算中国AI大模型应用市场规模？未来5年CAGR如何？

#### 26. NFRA Monthly Enforcement Report / 金融监管局处罚月报

- **slug**：`alice-nfra-monthly-enforcement-report`　**别名**：`nmre`　**版本**：1.0.5　**事件前缀**：`ALICE_NFRA_MONTHLY_ENFORCEMENT_REPORT`
- **中文描述**：Wind Alice 金融监管局处罚月报 CLI：基于国家金融监督管理总局（NFRA）及各地派出机构的公开处罚数据，按月汇总银行业、保险业、信托业等金融机构的行政处罚信息，生成含处罚概览、趋势分析与明细清单的三章结构化月报，支持中英双语输出。
- **英文描述**：Generate an NFRA monthly enforcement report for a specified month. Built on public enforcement data from the National Financial Regulatory Administration (NFRA) and its local offices, it aggregates administrative penalties across banking, insurance, trust, and non-bank financial institutions, delivering a bilingual three-chapter report covering an enforcement overview, trend analysis, and penalty details.
- **示例问法**：帮我生成 2026 年 7 月的金融监管处罚月报

#### 27. Option Pricing Calculator / 期权定价计算器

- **slug**：`alice-option-pricing-calculator`　**别名**：`aopc`　**版本**：1.0.2　**事件前缀**：`ALICE_OPTION_PRICING_CALCULATOR`
- **中文描述**：Wind Alice 期权定价计算器 CLI：对香草、二元、障碍、亚式、触碰、鲨鱼鳍、累计及 Autocall/雪球/三层区间等期权做理论定价，输出 NPV 与希腊字母
- **英文描述**：Wind Alice Option Pricing Calculator CLI - Option and structured-option theoretical pricing skill. Prices vanilla, binary, barrier, Asian, touch, shark-fin, accumulator, and Autocall/snowball/tri-tier range options; automatically fills in market parameters such as volatility and interest rates; outputs theoretical price (NPV) and Greeks; and supports re-pricing after parameter changes.
- **示例问法**：帮我算一下沪深 300 ETF 平值看涨期权的理论价格

#### 28. Option Volatility Insights / 期权波动率洞察

- **slug**：`alice-option-volatility-insights`　**别名**：`aovi`　**版本**：1.0.2　**事件前缀**：`ALICE_OPTION_VOLATILITY_INSIGHTS`
- **中文描述**：Wind Alice 期权波动率洞察 CLI：诊断期权 IV 估值、期限结构、Skew、PCR 与波动率曲面，识别市场异动并输出波动率报告
- **英文描述**：Wind Alice Option Volatility Insights CLI - Analyze options volatility and market conditions across IV valuation, term structure, skew, PCR, volatility surfaces, and market anomalies. Generate diagnostics, signals, market scans, and reports for volatility trading and options sentiment analysis.
- **示例问法**：今天沪深 300 ETF 期权的波动率处于什么水平？

#### 29. Options Trading Strategies / 期权交易策略

- **slug**：`alice-options-trading-strategies`　**别名**：`aots`　**版本**：1.0.5　**事件前缀**：`ALICE_OPTIONS_TRADING_STRATEGIES`
- **中文描述**：Wind Alice 期权交易策略 CLI：融合波动率信号构建、异动打分、策略推荐与情景汇总，输出五段式期权交易方案，适用于个股期权交易、期权怎么做、给出推荐方案
- **英文描述**：Trading Skills for Single-Underlying Listed Options. By integrating volatility signal construction, unusual activity scoring, strategy recommendation, and scenario aggregation, it delivers a five-stage options trading solution. Applicable to equity options trading, guide on how to trade options, and actionable recommendation plans
- **示例问法**：帮我分析茅台期权的波动率环境

#### 30. PPT Generator / 幻灯片

- **slug**：`alice-ppt-generator`　**别名**：`apg`　**版本**：1.0.5　**事件前缀**：`ALICE_PPT_GENERATOR`
- **中文描述**：Wind Alice 幻灯片（PPT 生成）CLI：根据主题与结构化内容自动生成专业 PPT 报告，支持标题页、目录、章节页、图文排版与结论总结，适用于投资与金融汇报、商业与管理汇报、产品与市场展示、培训与教育课件等场景。
- **英文描述**：Use this skill for gated PPTX delivery when the user needs a finance-grade or business-grade deck with multi-stage confirmation, structured quality gates, artifact-driven recovery, or controlled incremental revision. Use it for formal PPT generation and delivery workflows, not lightweight one-off PPT reading.
- **示例问法**：帮我做一份新能源汽车行业的投资研究 PPT，12 页

#### 31. Securities Regulatory Policy Briefing / 证券业监管政策简报

- **slug**：`alice-securities-regulatory-policy-briefing`　**别名**：`srpb`　**版本**：1.0.5　**事件前缀**：`ALICE_SECURITIES_REGULATORY_POLICY_BRIEFING`
- **中文描述**：Wind Alice 证券业监管政策简报 CLI：基于 Wind 监管法规数据库，获取指定时间范围内的证券行业监管政策，生成含政策详情、摘要、清单与机构分布统计的结构化简报，支持中英双语输出。
- **英文描述**：Retrieve securities industry regulatory policies within a specified time range and generate structured policy summaries and checklist tables. Built on the Wind regulatory database, it covers the CSRC, SSE, SZSE, BSE, securities/fund/futures industry associations, and the NEEQ, delivering a bilingual structured briefing with policy details, summaries, a checklist, and issuer-distribution statistics.
- **示例问法**：查询近一周的证券监管政策

#### 32. Stock DD List / 上市公司调研问题清单

- **slug**：`alice-stock-dd-list`　**别名**：`asdl`　**版本**：1.0.10　**事件前缀**：`ALICE_STOCK_DD_LIST`
- **中文描述**：Wind Alice 上市公司调研问题清单 CLI：一键生成买方视角结构化调研问题清单，含看多/看空逻辑摘要、3-5 个深度议题及管理层调研问题，支持 A 股、港股及海外上市公司。
- **英文描述**：Wind Alice Stock DD List CLI - generate a buy-side due diligence question list for any listed company in one step. Retrieves financial data, broker research, industry news, and consensus estimates to produce a structured investment memo with bull/bear thesis, 3–5 deep-dive topics, and pointed questions for management meetings. Works for A-shares, Hong Kong, and international listings.
- **示例问法**：帮我生成比亚迪的调研问题清单

#### 33. Thematic Stock Screening / 按主题选股

- **slug**：`alice-thematic-stock-screening`　**别名**：`atss`　**版本**：1.0.10　**事件前缀**：`ALICE_THEMATIC_STOCK_SCREENING`
- **中文描述**：Wind Alice 按主题选股 CLI：系统拆解主题投资逻辑、验证数据兑现、筛选核心受益标的，输出受益标的表、估值对比、交易建议与风险证伪点。
- **英文描述**：Wind Alice Thematic Stock Screening CLI - systematically deconstructs market narratives, validates logic maturity with key data, identifies genuine beneficiaries, and delivers valuation context with historical PE percentile and actionable trading perspective for sector investing and concept stock filtering.
- **示例问法**：如何参与AI算力主题？有哪些真受益标的？

---

## 二、专家清单（Experts）

| # | 专家中文名 | 专家英文名 | 目录 / slug | 别名 | activeSubAgent | 原话透传 |
|---|-----------|-----------|------------|------|----------------|---------|
| 1 | WindAlice个股研究专家 | WindAlice Equity Research Expert | `alice-equity-research-expert` | `aere` | `equity-deep-research-agent` | 是 |
| 2 | WindAlice万得金融专家 | WindAlice Financial Expert | `alice-financial-copilot` | `afcop` | （不传，自身即总入口） | 是 |
| 3 | Wind Alice 会议专家 | Wind Alice Meeting Expert | `alice-meeting-expert` | `ame` | `meeting` | 是 |
| 4 | WindAlice财富管理顾问 | WindAlice Wealth Management Advisor | `alice-wealth-advisor` | `awa` | `advisor` | 是 |

### 专家调用传参明细

#### 1. WindAlice个股研究专家（WindAlice Equity Research Expert）

- **配置中文名（skillNameZh）**：个股研究专家
- **slug / 包名**：`alice-equity-research-expert`　**CLI 别名**：`aere`　**事件前缀**：`ALICE_EQUITY_RESEARCH_EXPERT`　**maxTurns**：100
- **定位**：alice-equity-research-expert — 调用万得 Alice「个股研究专家」，围绕公司基本面、财报事件、估值位置与可证伪投资逻辑做个股深研，用户原话直接透传给服务端
- **预计耗时**：2-5 分钟　**生成图表 HTML**：否

**命令行传参**

```bash
node scripts/cli.mjs --prompt "做一份英伟达（NVDA.O）的中报前瞻" --no-wait
```

**A2A 接口传参（`message/stream` 请求体关键字段）**

```jsonc
{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "messageId": "<uuid>",
      "role": "user",
      "kind": "message",
      "parts": [
        { "kind": "text", "text": "<用户原话，专家包不加技能名前缀>" },
        {
          "kind": "data",
          "data": {
            "chatMode": "12",
            "originalChatMode": "4",
            "switchMode": "auto",
            "timezone": "Asia/Shanghai",
            "activeSubAgent": "equity-deep-research-agent"
          },
          "metadata": { "key": "Wind.WindSearch.ChatService.A2A", "version": "1.0.0" }
        }
      ],
      "contextId": "<uuid 或复用上轮 contextId>",
      "taskId": "<uuid>"
    }
  },
  "id": "<uuid>"
}
```

#### 2. WindAlice万得金融专家（WindAlice Financial Expert）

- **配置中文名（skillNameZh）**：WindAlice万得金融专家
- **slug / 包名**：`alice-financial-copilot`　**CLI 别名**：`afcop`　**事件前缀**：`ALICE_FINANCIAL_COPILOT`　**maxTurns**：100
- **定位**：alice-financial-copilot — 调用万得 Alice Agent「WindAlice万得金融专家」，覆盖信用/资产配置/个股基金/宏观期货/量化/文档生成六大领域，用户原话直接透传给服务端
- **预计耗时**：2-5 分钟　**生成图表 HTML**：是

**命令行传参**

```bash
node scripts/cli.mjs --prompt "帮我做一份宁德时代的信用分析报告" --no-wait
```

**A2A 接口传参（`message/stream` 请求体关键字段）**

```jsonc
{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "messageId": "<uuid>",
      "role": "user",
      "kind": "message",
      "parts": [
        { "kind": "text", "text": "<用户原话，专家包不加技能名前缀>" },
        {
          "kind": "data",
          "data": {
            "chatMode": "12",
            "originalChatMode": "4",
            "switchMode": "auto",
            "timezone": "Asia/Shanghai"
            // 本专家不传 activeSubAgent（历史特例：它自身即总入口）
          },
          "metadata": { "key": "Wind.WindSearch.ChatService.A2A", "version": "1.0.0" }
        }
      ],
      "contextId": "<uuid 或复用上轮 contextId>",
      "taskId": "<uuid>"
    }
  },
  "id": "<uuid>"
}
```

#### 3. Wind Alice 会议专家（Wind Alice Meeting Expert）

- **配置中文名（skillNameZh）**：会议专家
- **slug / 包名**：`alice-meeting-expert`　**CLI 别名**：`ame`　**事件前缀**：`ALICE_MEETING_EXPERT`　**maxTurns**：100
- **定位**：alice-meeting-expert — 调用万得 Alice「会议专家」，覆盖会前准备、AI 参会记录与会后复盘的端到端会议助手，用户原话直接透传给服务端
- **预计耗时**：2-5 分钟　**生成图表 HTML**：否

**命令行传参**

```bash
node scripts/cli.mjs --prompt "未来一周有哪些上市公司业绩会召开？" --no-wait
```

**A2A 接口传参（`message/stream` 请求体关键字段）**

```jsonc
{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "messageId": "<uuid>",
      "role": "user",
      "kind": "message",
      "parts": [
        { "kind": "text", "text": "<用户原话，专家包不加技能名前缀>" },
        {
          "kind": "data",
          "data": {
            "chatMode": "12",
            "originalChatMode": "4",
            "switchMode": "auto",
            "timezone": "Asia/Shanghai",
            "activeSubAgent": "meeting"
          },
          "metadata": { "key": "Wind.WindSearch.ChatService.A2A", "version": "1.0.0" }
        }
      ],
      "contextId": "<uuid 或复用上轮 contextId>",
      "taskId": "<uuid>"
    }
  },
  "id": "<uuid>"
}
```

#### 4. WindAlice财富管理顾问（WindAlice Wealth Management Advisor）

- **配置中文名（skillNameZh）**：财富管理顾问
- **slug / 包名**：`alice-wealth-advisor`　**CLI 别名**：`awa`　**事件前缀**：`ALICE_WEALTH_ADVISOR`　**maxTurns**：100
- **定位**：alice-wealth-advisor — 调用万得 Alice「财富管理顾问」，覆盖客户洞察、产品研究、持仓诊断、资产配置与客户经营的财富管理助手，用户原话直接透传给服务端
- **预计耗时**：2-5 分钟　**生成图表 HTML**：否

**命令行传参**

```bash
node scripts/cli.mjs --prompt "帮我创建一个客户，客户信息和持仓如下：" --no-wait
```

**A2A 接口传参（`message/stream` 请求体关键字段）**

```jsonc
{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "messageId": "<uuid>",
      "role": "user",
      "kind": "message",
      "parts": [
        { "kind": "text", "text": "<用户原话，专家包不加技能名前缀>" },
        {
          "kind": "data",
          "data": {
            "chatMode": "12",
            "originalChatMode": "4",
            "switchMode": "auto",
            "timezone": "Asia/Shanghai",
            "activeSubAgent": "advisor"
          },
          "metadata": { "key": "Wind.WindSearch.ChatService.A2A", "version": "1.0.0" }
        }
      ],
      "contextId": "<uuid 或复用上轮 contextId>",
      "taskId": "<uuid>"
    }
  },
  "id": "<uuid>"
}
```

---
## 三、通用调用契约（技能与专家共用）

### 3.1 服务端接口

| 项 | 值 |
|----|----|
| 默认地址 | `https://alice.wind.com.cn/Weaver/ChatAgent`（可用环境变量 `WIND_ALICE_API_URL` 覆盖） |
| 协议 | A2A over SSE（JSON-RPC 2.0） |
| 主方法 | `message/stream`（提交并流式接收） |
| 续订方法 | `tasks/resubscribe`（参数 `{ id: taskId, contextId }`） |
| 同步查询 | `tasks/get`（参数 `{ id: taskId, contextId }`，返回单次 JSON，供 `--no-wait` 探针使用） |
| 请求头 | `Content-Type: application/json`、`Accept: application/json, text/event-stream`、`alice-channel: Tencent.Workbuddy`、`Authorization: Bearer <API Key>` |
| API Key | 存于 `~/.wind-alice/config.env`，通过 `apikey-set` 子命令写入 |

### 3.2 请求体 `data` part 字段

| 字段 | 值 | 说明 |
|------|-----|------|
| `chatMode` | `"12"` | 固定 |
| `originalChatMode` | `"4"` | 固定 |
| `switchMode` | `"auto"` | 固定 |
| `timezone` | `"Asia/Shanghai"` | 固定 |
| `activeSubAgent` | 见专家清单 | **仅专家包携带**；技能包不带。构建器 `build-deploy.mjs` 会校验「技能不许有 / 新专家必须有」 |
| `metadata.key` | `Wind.WindSearch.ChatService.A2A` | 固定 |
| `metadata.version` | `1.0.0` | 固定 |

### 3.3 text part 的拼装规则

- **技能包**（`features.promptPrefix` 缺省/为 `true`）：`使用「<技能中文名>」技能：<用户问题>`，前缀由 CLI 内部注入，Agent **不要**自己加。
- **专家包**（`features.promptPrefix: false`）：用户原话**原样透传**，不拼任何前缀。

### 3.4 CLI 命令行参数

| 参数 | 说明 |
|------|------|
| `--prompt` / `-p <text>` | 用户问题（主参数，必填） |
| `--download-dir` / `-d <dir>` | 兼容保留；附件实际统一下载到当前工作区 `process.cwd()` |
| `--no-wait` | 提交后 CLI 内部自旋轮询直到任务完成（推荐；沙箱/长任务场景必用） |
| `--once` | 与 `--no-wait` 配合，单次探针后即返回（脚本场景） |
| `--watch` / `-w` | 显式轮询，与 `--no-wait` 默认行为等价（兼容旧命令） |
| `--watch-interval <sec>` | 轮询间隔秒数 |
| `--watch-timeout <sec>` | 单轮轮询超时秒数 |
| `--watch-absolute-max <sec>` | 轮询绝对上限秒数 |
| `--detach` | 后台运行，立即返回；stdout 落到按 promptHash 命名的日志文件 |
| `--new` / `--force-new` | 同一 prompt 强制重新分析（不复用已有任务，会重新计费） |
| `--new-session` | 强制新建会话（切换到完全无关新话题时使用），优先级高于 `--continue-session` / `--context-id` |
| `--continue-session` | 显式延续上次 `contextId`（30 分钟空闲窗口内） |
| `--context-id <id>` | 显式复用指定 `contextId`（从上一轮 DONE 行取），优先级最高，跨工作区精确续接 |
| `--session-scope <id>` | 会话隔离标识，避免不同宿主共用 `current-session.json` 串号；也可用环境变量 `WIND_ALICE_SESSION_SCOPE` |
| `--no-strict` | 关闭「必须收到 DONE 才能 exit 0」的兜底校验（调试用） |
| `--help` / `-h` | 帮助 |

**子命令**：`apikey-set <KEY>`、`apikey-get`、`apikey-clear`、`status`、`check-conflict`。

### 3.5 环境变量

| 变量 | 说明 |
|------|------|
| `WIND_ALICE_API_URL` | 覆盖默认服务端地址 |
| `WIND_ALICE_SESSION_SCOPE` | 会话隔离标识（等价于 `--session-scope`） |
| `WIND_PROJECT_FILES_PREFIX` | 附件链接前缀 |

### 3.6 结果交付约定

1. 主调用带 `--no-wait` 并阻塞到 CLI 进程退出；**未见 `<TAG_PREFIX>_DONE` 行不得结束回合**。
2. 从 stdout 提取 `agentResult.value`，由宿主 Agent **逐字打字复述为正文**（`type=text` 才不会被 WorkBuddy 折叠）。
3. 若 DONE 行含 `reportFullFile=`，先用单独一条消息调 `present_files` 展示附件，再用**另一条不含任何工具调用**的纯文本消息输出 `agentResult.value` 全文。
4. 被环境中断（退出码 `4` / `6`、无 DONE）时，用**完全相同的命令**在同一回合内重发，重发会接回原任务且不重复计费；改动 prompt 一个字即视为新任务、重新计费。

---

## 四、目录约定

```
src/
├── skills/<slug>/                    # 技能包（33 个）
│   ├── SKILL.md                      # frontmatter: name/description/description_zh/description_en/version/tags
│   ├── AGENT.md                      # 宿主 Agent 执行契约（部分技能）
│   ├── skill.config.json             # slug/alias/skillNameZh/tagPrefix/features/help/runtime
│   ├── scripts/                      # CLI 入口与依赖模块
│   └── __tests__/
└── experts/<slug>/                   # 专家包（4 个）
    ├── agents/<slug>.md              # Agent 定义（displayName.zh / displayName.en / profession / maxTurns / skills）
    ├── avatars/expert.jpg
    ├── skills/<slug>/                # 专家自带的同名技能
    │   ├── SKILL.md
    │   ├── skill.config.json         # 多出 expert / activeSubAgent 两个字段
    │   └── scripts/
    └── README.md
```

打包产物位于 `deploy/Tencent.Workbuddy-<日期>/`，每个技能/专家为一个独立可解压目录。
