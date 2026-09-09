# 7 个 MCP Server 字段一致性 + 描述正确性审计

实连 `tools/list` + 逐工具实调。

- 2026-09-04：字段一致性审计（132 工具 / 444 参数）
- **2026-09-07：描述正确性专项复核**（7 个 server 全量重跑，比对 `description` 与真实返回）

## 2026-09-07 线上工具数（与 09-04 相比又变了）

| Server | 09-04 | 09-07 | 变动 |
|---|---|---|---|
| company_data | 54 | **54** | 5 个工具的区间字段回滚成 `timeFrom`/`timeTo`（后端仍只认 `startDate`） |
| fund_research | 24→21 | **21** | 稳定 |
| stock_research | 15 | **15** | 稳定 |
| finance_data | 13 | **13** | 稳定 |
| options_data | 17 | **11** | 下线 6 个（含 `calc_accumulator`/`calc_single_shark_fin`/`calc_hv_cone`） |
| futures_data | 9 | **7** | 下线 3 个，新增 `futures_get_research_opinion` |
| edb_data | 3 | **3** | `macro_*` → `economic_*`；`observation` → `numOfObservation`（仅 `get_*`） |

合计 **124 个工具**（09-04 为 132）。`mcp-servers.json` 注册表已滞后，需重新生成。

## 描述正确性复核结论速览

| Server | 工具 | P0 | P1 | 判定 |
|---|---|---|---|---|
| [options_data](options-data-audit.md) | 11 | **2** | 2 | ❌ 最差：19 处 `default` 全是死值且后端不应用，9/11 工具省略后失败 |
| [company_data](company-data-audit.md) | 54 | **3** | 5 | ❌ 引用不存在的工具名、enum 含非法值、3 个过滤参数无取值来源 |
| [finance_data](finance-data-audit.md) | 13 | **1** | 4 | ⚠️ `general_query_data` 返回结构描述完全错误；文档类字段集随类型变化未说明 |
| [fund_research](fund-research-audit.md) | 21 | **1** | 3 | ⚠️ `fund_screener` 过度承诺；`cycle` 默认值与实际相反 |
| [edb_data](edb-data-audit.md) | 3 | **1** | 2 | ⚠️ 同义参数两个名字；「默认近 2 年」与实测不符 |
| [futures_data](futures-data-audit.md) | 7 | **1** | 2 | ❌ 3 个工具的 `type` 从 schema 消失，描述承诺的「九类排名」无入参可达 |
| [stock_research](stock-research-audit.md) | 15 | 0 | 1 | ✅ 最准：15/15 返回字段与描述吻合，只有示例问句和空结果格式的小问题 |

### 逐工具深度测试报告（2026-09-07）

对 stock / futures / finance / edb 四个 server 做了逐工具的边界、入参、故意错误、描述核对、工具协同专项测试，共 **420 条用例**：

| 报告 | 工具 | 用例 | 正常调用错误率 | 平均耗时 |
|---|---|---|---|---|
| [stock_research](test-report-stock-research.md) | 15 | 160 | **0%**（75/75） | 2996 ms |
| [finance_data](test-report-finance-data.md) | 13 | 130 | **0%**（55/55） | 1720 ms |
| [futures_data](test-report-futures-data.md) | 7 | 86 | **0%**（35/35） | 2992 ms |
| [edb_data](test-report-edb-data.md) | 3 | 44 | **0%**（15/15） | 3001 ms |

**正常路径 180/180 全部通过**，问题全部出在边界、非法入参与描述断言上。

### 跨 server 的四个共性问题

**1. 假 `default`：schema 声明了默认值，后端根本不应用**

| Server | 例 |
|---|---|
| options_data | 19 处日期 default，9/11 工具省略后失败（含 `NullPointerException` 外泄） |
| fund_research | `fund_get_return_attribution.benchmarkWindCode` default 存在但省略即报「缺少必填参数」 |
| fund_research | `fund_get_style_analysis.cycle` default `monthly`，实际走 `quarterly` |

**2. 写死的绝对日期 / 字面量当默认值**

`options_data` 19 处（`2026-09-01`/`2026-06-01`/`2026-08-01`，其中 `calc_vanilla.expirationDate` 已过期）、`stock_get_company_finance_analysis.reportPeriod = "FY2025"`。这类值每过一天就更失真。

**3.「服务暂时不可用，请稍后重试」被当成万能错误文案**

实测该文案掩盖的真实原因至少有三类：缺必填参数（options 7 例）、数据量过大（`company_get_news_sentiment` 对万科/比亚迪不传区间必失败）、后端瞬时抖动（`fund_screener`、`options_get_variety_stats`）。调用方无法区分「重试有用」和「重试无用」。

**4. 未知参数静默忽略，不报错**

`edb.economic_get_indicator_series` 传旧名 `observation` → 静默返回默认区间；`company` 5 个工具传 schema 声明的 `timeFrom` → 静默返回近 5 年全量。

反方向的问题更严重：**futures_data 有 3 个工具的 `type` 参数已从 schema 消失，后端却仍在正式支持**，导致描述承诺的能力无入参可达：

| 工具 | 描述承诺 | schema 现状 | 后端实际 |
|---|---|---|---|
| `futures_get_position_ranking` | 「**九类**排名，多头/空头/净多净空/增减仓/成交量」 | 只有 `windCode`/`date`/`limit` | `type` 生效：1=多头持仓、2=空头持仓…；**不传默认只给多头** |
| `futures_get_supply_demand` | 「按**基本面类型**查询」供需平衡/供应/需求/库存 | 无类型参数 | `type` 生效且被正式校验（`type 必须为 0、1、2、3、4`） |
| `futures_get_warehouse_receipt` | 「按**业务类型**…查询交割或仓单」 | 只有 `windCodes`/`date` | `type` 生效，还会改变返回信封 |

### `inputSchema.title` 泄漏内部名（7 处）

| Server | 工具名 | schema.title |
|---|---|---|
| finance_data | `general_search_research_insight` | `MetaContentListArguments` |
| finance_data | `general_get_research_insight` | `FinanceGetReferenceArguments` |
| fund_research | `fund_get_similar_funds` | `fund_get_similar` |
| fund_research | `fund_get_style_analysis` | `fund_get_market_cap_style` |
| fund_research | `fund_get_return_attribution` | `fund_get_nav_attribution` |
| fund_research | `fund_get_top_equity_holdings` | `fund_get_heavy_equity_holdings` |
| fund_research | `fund_screener` | `fund_semantic_filter` |

### 描述模板覆盖 ✅

124/124 个工具全部具备 `【功能】/【适用场景】/【返回】/【边界】` 四段结构。但 company_data 有 48/54 的【适用场景】是同一句模板，对选工具没有区分度。

### 引用了不存在的工具名

只有 company_data 一处：5 个工具、8 处引用 `company_get_biz_num`，真名 `company_get_biz_enum`，后端报错文案里还有第三个名字 `risk_get_biz_enum`。其余 6 个 server 的跨工具引用全部有效。

---

# 附：2026-09-04 字段一致性审计

## 结论速览

| 维度 | 判定 | 说明 |
|---|---|---|
| 证券代码字段名 | 基本统一 | `windCode`(40) / `windCodes`(13)；6 处例外 |
| 证券代码类型 | ❌ | `windCodes` 13 处 `array`，1 处逗号分隔 `string` |
| 证券代码语义 | ❌ | 同名 `windCode` 在各 server 分指股票/基金/期货**品种**/期权标的/板块 |
| 时间区间字段名 | ✅ **已统一** | 7 个 server 全部 `startDate`/`endDate`；company_data 27 处经 4 轮反复后已与后端对齐 |
| 单日期字段名 | ❌ | 7 种：`date` `tradeDate` `asOfDate` `reportDate` `reportPeriod` `time` `valuationDate` |
| 日期格式 | 基本统一 | 主流 `YYYY-MM-DD`；4 处例外 |
| 行业分类枚举 | ❌ | 3 个字段名 + 4 套描述表；实测后端只有一套实现，**冲突在描述不在数据**（见 `fund-research-audit.md` §⑤） |
| 布尔开关命名 | ❌ | 3 套范式；`history` 与 `includeHistory` 同义不同名 |
| 枚举载体类型 | ❌ | 数字编码枚举一半 `string` 一半 `integer` |
| 中英文枚举策略 | ❌ | futures_data 内 4 工具 3 种互斥要求 |
| 参数 `title` 覆盖 | 接近统一 | 6 个 server 100%（company_data 已补齐 127/127）；仅剩 finance_data 78%、stock_research 83% |
| 参数大小写 | ✅ | 444 个参数全 camelCase |
| 与旧 7 个 server | 代际断层 | 旧用 snake_case（`windcode`/`begin_date`/`top_k`） |

> **2026-09-04 变更**：company_data 区间字段经 4 轮反复（`timeFrom`↔`startDate`），当前为 `startDate`/`endDate` 且与后端一致，27/27 实测生效；同轮 `title` 补齐 127/127、描述改结构化模板。finance_data 的 `beginDate` 与嵌套 `params.begin/end` 均已改为 `startDate`/`endDate`。futures_data 区间数组已拆分、前缀统一 `futures_*`。options_data 4 工具改名、移除 `subCode`、`title` 100%、`dividendYield` 小数口径补齐。

---

## 一、证券 / 主体标识

主流：`windCode`(string, 40 工具) / `windCodes`(array, 13 工具)。例外：

| Server | 工具 | 字段 | 问题 |
|---|---|---|---|
| finance_data | `quote_get_realtime_indicators` | `windCodes` **string** | 名字对、**类型错**：逗号分隔字符串，其余 13 处是数组 |
| options_data | `options_get_term_metrics` | `optionVarietyCode` | 未沿用 `windCode` |
| options_data | `options_get_contract_series` | `optionContractCodes` | 未沿用 `windCodes` |
| fund_research | `fund_get_brinson_attribution` | `benchCode` | 同 server 另 2 处用 `benchmarkWindCode` |
| fund_research | `fund_get_position_estimate` | `indexWindCode` | 基准指数的**第三个**叫法 |
| company_data | 全部 52 个 | `companyKey` | 企业名/统一社会信用代码，第二套标识体系；`company_search_entity` 又用 `searchKey` |

**语义漂移**：`windCode` 在 stock_research=股票/板块、fund_research=基金、futures_data=期货**品种**（还接受 `all`）、options_data=期权标的（期货仅主力合约）、finance_data=通用证券码。仅看字段名无法判断该传什么。

## 二、日期字段

**时间区间已基本统一**到 `startDate`/`endDate`。剩余问题见 [`non-standard-time-range-params.md`](non-standard-time-range-params.md)，核心 3 处：`general_search_documents` 的 `beginDate`、`quote_get_historical_dataseries` 嵌在 `params` 里的 `begin`/`end`、`futures_get_basis_data` 用 `date` 数组长度表区间。

**单日期 7 种命名**，同 server 内即冲突：

| 字段 | 处数 | 问题 |
|---|---|---|
| `reportDate` | 10 | fund_research 内一致 |
| `valuationDate` / `expirationDate` | 7 / 7 | options 定价工具内一致 |
| `date` | 6 | futures_data 5 + fund_research 1（语义不同：交易日 vs 月末统计日） |
| `asOfDate` / `tradeDate` | 4 / 4 | 各自一致 |
| `expiryDate` | 1 | `options_get_term_metrics`，同 server 7 处用 `expirationDate` |
| `reportPeriod` | 2 | fund_research 是 `YYYY-MM-DD`，stock_research 是 `FY2025` — **同名不同格式** |
| `time` | 2 | 名为 time 实为日期；`YYYY-MM-DD HH:mm` |
| `ratingPeriod` | 1 | 唯一月粒度 `YYYY-MM` |

**格式例外 4 处**：`general_query_documents` 的 `startDate`/`endDate` 是 `YYYY-MM-DD HH:MM:SS`（同名不同格式，最易踩坑）；`time` ×2 带时分；`reportPeriod`(stock) 是 `FY2025`；`ratingPeriod` 是 `YYYY-MM`。

## 三、行业分类枚举 —— 描述表互相矛盾

3 个字段名表达同一概念：`industryType`（fund_get_equity_holdings / fund_get_top_equity_holdings）、`classificationType`（fund_get_industry_allocation）、`industryStandard`（fund_get_brinson_attribution）。

两个 `industryType` 的枚举描述互相矛盾（如 `2` 一个写"中信一级"、一个写"申万二级"）。**2026-09-04 逐值实调修正**：后端只有一套实现，7/7 测试取值两工具返回完全相同——问题在 `fund_get_top_equity_holdings` 的描述写错了，不是数据错。Agent 按错误描述选码会拿到空值或非预期口径。明细见 [`fund-research-audit.md`](fund-research-audit.md) §⑤。

## 四、其他不统一

| 类别 | 现状 |
|---|---|
| **返回字段筛选**（5 种） | `includeFields`(array,9) / `indicators`(array,2) / `indicator`(string,2) / `indexes`(逗号 string,1) / `fields`(array,1) / **`indexs`**(拼写错,1) |
| **返回条数**（4 种） | `limit`(2) / `topK`(1) / `maxCount`(1) / `strikeLevels`·`termCount`·`strikeCount`；finance_data 内部就有 `topK` 和 `maxCount` |
| **布尔开关**（3 套） | `include*` 前缀（`includeMetadata` 10、`includeHistory` 1）/ 裸形容词（`history` 4、`onlyValid`、`annualized`）/ `*Enable` 后缀（`newsPenetrateEnable`，唯一无 `default` 的布尔）。`history` 与 `includeHistory` 同义不同名 |
| **枚举载体类型** | 数字编码：fund_research/finance_data/stock_research 用 `string`（`"1"`），futures_data/company_data 用 `integer`（`1`）。附带 `marketType` 值域 `1/2/7/0/br` 混入字母且跳号 |
| **中英文枚举** | 全在 futures_data：`warehouse_receipt.type`「中英等价」、`basis_data.sector`「中英等价」、`related_securities.type`「严禁中文」、`contract_spec.fields`「优先中文」——同 server 4 工具 3 种策略 |
| **同名不同义** | `type`(5 工具 5 种语义与类型) / `queryMode`(文档检索 vs 报告期区间) / `time` / `reportPeriod` / `industryType` |
| **拼写错误** | `options_calc_autocall_snowball` 的 **`nontional`**（同 server 另一工具叫 `notionalPrincipal`）；`fund_get_style_analysis` 的 **`indexs`** |
| **`required`+`default` 矛盾**（4 处） | `quote_get_realtime_indicators.indexes`、`fund_get_brinson_attribution.benchCode`(默认上证综指)、`options_calc_vanilla.assetClass`/`optionType` |
| **`title` 缺失** | company_data 105/127（17% 覆盖）；finance_data 7/32；stock_research 3/18。fund_research / futures_data / options_data 均 100% |
| ~~小数口径漏写~~ | ✅ 已修复：7 个 `options_calc_*` 的 `dividendYield` 均已补「小数形式」 |
| **工具命名前缀** | 5 个 server 单前缀 ✅（futures_data 的 `commodity_*` 已改为 `futures_*`）；finance_data 仍为 `general_*`+`quote_*` 双前缀 |

## 五、与旧 7 个 server 的代际断层

旧 server（`stock_data` `fund_data` `index_data` `bond_data` `financial_docs` `economic_data` `analytics_data`）用 snake_case：`windcode` / `begin_date`·`end_date` / `begin`·`end` / `top_k`。

同时挂载 13 个 server **必须做参数名映射层**——旧后端会静默吞掉未知字段，返回默认口径数据而不报错。

## 六、收敛建议

| P | 动作 |
|---|---|
| **P0** | 修 `fund_get_top_equity_holdings.industryType` 的枚举描述（与实际实现对齐，实测后端与 `fund_get_equity_holdings` 一致） |
| **P0** | 修拼写：`nontional` → `notionalPrincipal`（options_data）；`indexs` → `indexes`（fund_research）—— 两处 2026-09-04 复测均**仍未修** |
| **P1** | `quote_get_realtime_indicators.windCodes` 改 `array<string>`（或两者都收） |
| **P1** | 解开 `required`+`default` 矛盾（4 处），二选一 |
| **P1** | 剩余 3 处区间收敛（见 `non-standard-time-range-params.md`） |
| **P2** | `benchCode`/`indexWindCode` → `benchmarkWindCode`；`expiryDate` → `expirationDate` |
| **P2** | `fund_get_financials.reportPeriod` → `reportDate`；`stock_get_company_finance_analysis.reportPeriod` → `fiscalPeriod` |
| **P2** | `time` → `tradeDate`；数字编码枚举统一为 `string`；futures_data 枚举统一中英双收 |
| **P2** | 布尔统一 `include*` 前缀并必带 `default`：`history` → `includeHistory`，`newsPenetrateEnable` → `includePenetration` |
| **P3** | company_data 补 105 个 `title`；3 处 `dividendYield` 补「小数形式」；`topK`/`maxCount` → `limit`；`year` → `lookbackYears` |
