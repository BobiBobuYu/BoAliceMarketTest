# 6 个新 MCP Server 字段一致性审计

实连 `tools/list`，2026-09-04 复测。Streamable HTTP + `Authorization: Bearer <apiKey>`，先 `initialize`（`2025-03-26`）再 `tools/list`。

| Server | 工具数 | | Server | 工具数 |
|---|---|---|---|---|
| company_data | 54 | | stock_research | 15 |
| fund_research | 24 | | finance_data | 13 |
| options_data | 17 | | futures_data | 9 |

共 **132 个工具、444 个参数**。endpoint 形如 `https://mcp.wind.com.cn/vserver_<name>/mcp/`。

**逐工具实调进度**：[finance_data 13/13](finance-data-audit.md) · [stock_research 15/15](stock-research-audit.md) · [fund_research 23/23](fund-research-audit.md) · [edb_data 3/3](edb-data-audit.md) · [company_data 区间 27/27](company-data-date-fields.md)。未逐个调过：options_data(17)、futures_data(9)。

## 结论速览

| 维度 | 判定 | 说明 |
|---|---|---|
| 证券代码字段名 | 基本统一 | `windCode`(40) / `windCodes`(13)；6 处例外 |
| 证券代码类型 | ❌ | `windCodes` 13 处 `array`，1 处逗号分隔 `string` |
| 证券代码语义 | ❌ | 同名 `windCode` 在各 server 分指股票/基金/期货**品种**/期权标的/板块 |
| 时间区间字段名 | ✅ **已统一** | `startDate`/`endDate` 39/40 处；仅剩 `beginDate` 1 处 |
| 单日期字段名 | ❌ | 7 种：`date` `tradeDate` `asOfDate` `reportDate` `reportPeriod` `time` `valuationDate` |
| 日期格式 | 基本统一 | 主流 `YYYY-MM-DD`；4 处例外 |
| 行业分类枚举 | ❌ | 3 个字段名 + 4 套描述表；实测后端只有一套实现，**冲突在描述不在数据**（见 `fund-research-audit.md` §⑤） |
| 布尔开关命名 | ❌ | 3 套范式；`history` 与 `includeHistory` 同义不同名 |
| 枚举载体类型 | ❌ | 数字编码枚举一半 `string` 一半 `integer` |
| 中英文枚举策略 | ❌ | futures_data 内 4 工具 3 种互斥要求 |
| 参数 `title` 覆盖 | ❌ | 4 个 server 100%，company_data 仅 17% |
| 参数大小写 | ✅ | 444 个参数全 camelCase |
| 与旧 7 个 server | 代际断层 | 旧用 snake_case（`windcode`/`begin_date`/`top_k`） |

> **2026-09-04 已修复**：company_data 27 个工具 `timeFrom`/`timeTo` → `startDate`/`endDate`（[验证详情](company-data-date-fields.md)）；options_data 4 工具改名并移除 `subCode`，`title` 补齐到 100%；`required`+`default` 冲突从 6 处降到 4 处。

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
| **小数口径漏写** | `options_calc_binary` / `_vanilla` / `_autocall_snowball` 的 `dividendYield` 未写「小数形式」，同 server 另 5 处写了 |
| **工具命名前缀** | 4 个 server 单前缀 ✅；futures_data 混入 `commodity_get_supply_demand`；finance_data 用 `general_*`+`quote_*` 双前缀 |

## 五、与旧 7 个 server 的代际断层

旧 server（`stock_data` `fund_data` `index_data` `bond_data` `financial_docs` `economic_data` `analytics_data`）用 snake_case：`windcode` / `begin_date`·`end_date` / `begin`·`end` / `top_k`。

同时挂载 13 个 server **必须做参数名映射层**——旧后端会静默吞掉未知字段，返回默认口径数据而不报错。

## 六、收敛建议

| P | 动作 |
|---|---|
| **P0** | 修 `fund_get_top_equity_holdings.industryType` 的枚举描述（与实际实现对齐，实测后端与 `fund_get_equity_holdings` 一致） |
| **P0** | 修拼写：`nontional` → `notionalPrincipal`；`indexs` → `indexes` |
| **P1** | `quote_get_realtime_indicators.windCodes` 改 `array<string>`（或两者都收） |
| **P1** | 解开 `required`+`default` 矛盾（4 处），二选一 |
| **P1** | 剩余 3 处区间收敛（见 `non-standard-time-range-params.md`） |
| **P2** | `benchCode`/`indexWindCode` → `benchmarkWindCode`；`expiryDate` → `expirationDate` |
| **P2** | `fund_get_financials.reportPeriod` → `reportDate`；`stock_get_company_finance_analysis.reportPeriod` → `fiscalPeriod` |
| **P2** | `time` → `tradeDate`；数字编码枚举统一为 `string`；futures_data 枚举统一中英双收 |
| **P2** | 布尔统一 `include*` 前缀并必带 `default`：`history` → `includeHistory`，`newsPenetrateEnable` → `includePenetration` |
| **P3** | company_data 补 105 个 `title`；3 处 `dividendYield` 补「小数形式」；`topK`/`maxCount` → `limit`；`year` → `lookbackYears` |
