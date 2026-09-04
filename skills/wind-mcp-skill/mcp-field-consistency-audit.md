# 6 个新 MCP Server 通用字段一致性审计

**探测日期**：2026-09-04
**连接方式**：Streamable HTTP（`POST https://mcp.wind.com.cn/<server>/mcp/`），`Authorization: Bearer <apiKey>`，`Accept: application/json, text/event-stream`，先 `initialize`（protocolVersion `2025-03-26`）再 `tools/list`
**探测结果**：6 个 server 全部连通，共 **132 个工具**，126 个不同参数名

| Server | endpoint | 工具数 |
|---|---|---|
| vserver_company_data | `https://mcp.wind.com.cn/vserver_company_data/mcp/` | 54 |
| vserver_fund_research | `https://mcp.wind.com.cn/vserver_fund_research/mcp/` | 24 |
| vserver_options_data | `https://mcp.wind.com.cn/vserver_options_data/mcp/` | 17 |
| vserver_stock_research | `https://mcp.wind.com.cn/vserver_stock_research/mcp/` | 15 |
| vserver_finance_data | `https://mcp.wind.com.cn/vserver_finance_data/mcp/` | 13 |
| vserver_futures_data | `https://mcp.wind.com.cn/vserver_futures_data/mcp/` | 9 |

---

## 一、结论速览

| 维度 | 是否统一 | 说明 |
|---|---|---|
| 证券代码字段名 | **基本统一** | 单值 `windCode`（40 个工具）、多值 `windCodes`（14 个工具）已是事实标准；7 处例外见 §2.2 |
| 证券代码字段类型 | **不统一** | `windCodes` 13 处是 `array`，1 处是逗号分隔 `string` |
| 证券代码语义 | **不统一** | 同名 `windCode` 在不同 server 分别指股票 / 基金 / 期货**品种** / 期权标的 / 板块指数，且 futures 允许传 `all` |
| 时间区间字段名 | **不统一（最严重）** | 三套并存：`startDate`/`endDate`（12 工具）、`timeFrom`/`timeTo`（27 工具，整个 company_data）、`beginDate`/`endDate`（1 工具，自身混搭） |
| 单日期字段名 | **不统一** | 7 种：`date` / `tradeDate` / `asOfDate` / `reportDate` / `reportPeriod` / `time` / `valuationDate` |
| 日期取值格式 | **基本统一** | 主流 `YYYY-MM-DD`；4 处例外（含带时分秒、`FY2025`、`YYYY-MM`）见 §3.3 |
| 枚举参数口径 | **不统一（高风险）** | 行业分类标准 3 个字段名 + 4 套互相冲突的编码，同名 `industryType` 的 `"2"` 在两个工具里含义不同 |
| 布尔开关命名 | **不统一** | 3 套范式：`include*` 前缀 / 裸形容词 / `*Enable` 后缀；`history` 与 `includeHistory` 同义不同名 |
| 枚举载体类型 | **不统一** | 同为数字编码枚举，fund_research / finance_data 用 `string`，futures_data / company_data 用 `integer` |
| 中英文枚举策略 | **不统一** | futures_data 内部 4 个工具 3 种互斥要求（中英等价 / 严禁中文 / 优先中文） |
| `required` 与 `default` | **矛盾** | 6 处字段既 required 又有默认值，其中 `options_iv_cone_calculator.windCode` 会导致静默用错标的 |
| 参数 `title` 覆盖率 | **不统一** | fund_research / futures_data 100%，company_data 仅 17% |
| 参数命名大小写 | ✅ **统一** | 全部 132 工具、444 个参数 100% camelCase，无 snake_case 混入 |
| 与旧 7 个 server 的关系 | **代际断层** | 旧 server 用 snake_case（`windcode` / `begin_date` / `end_date` / `begin` / `end`），新 6 个用 camelCase |

---

## 二、证券 / 主体标识字段

### 2.1 主流约定（符合规范，共 53 个工具）

- **`windCode`** — `string`，单个代码或名称。40 个工具使用，覆盖全部 6 个 server。
- **`windCodes`** — `array<string>`，多个代码。13 个工具使用。

### 2.2 不统一的工具（逐个列出）

| # | Server | 工具 | 实际字段 | 问题 |
|---|---|---|---|---|
| 1 | finance_data | `quote_get_realtime_indicators` | `windCodes` **`string`** | 名字对了但**类型错**：这里是逗号分隔字符串（`"600519.SH,000858.SZ"`），其余 13 个 `windCodes` 都是数组。调用方无法用同一套代码构造入参 |
| 2 | options_data | `options_get_term_metrics` | `optionVarietyCode` | 期权品种代码（`510050OP.SH`），未沿用 `windCode` |
| 3 | options_data | `options_get_contract_series` | `optionContractCodes` (array) | 期权合约代码列表，未沿用 `windCodes` |
| 4 | options_data | `options_hv_cone_calculator` | `subCode` | 子代码，"默认与 windCode 相同"，命名无 Wind/Code 前缀语义 |
| 5 | fund_research | `fund_get_brinson_attribution` | `benchCode` | 同一 server 内的 `fund_get_return_attribution` / `fund_get_performance` 用 **`benchmarkWindCode`** 表达同一概念（比较基准代码） |
| 6 | fund_research | `fund_get_position_estimate` | `indexWindCode` | 对照指数代码——这是"基准指数"的**第三个**叫法（`benchCode` / `benchmarkWindCode` / `indexWindCode`） |
| 7 | company_data | 全部 52 个查询工具 | `companyKey` | 整个 server 用企业名称全称 / 统一社会信用代码作主键，不是证券代码。语义上说得通，但对上层是**第二套标识体系**，且 `company_search_entity` 又单独用 `searchKey` |

### 2.3 `windCode` 的语义漂移

同名字段在不同 server 表示不同东西，仅靠字段名无法判断该传什么：

| Server | `windCode` 实际含义 | 示例 |
|---|---|---|
| stock_research | 股票代码 / 名称，或板块·指数代码 | `600519.SH`、`886063.WI`、`半导体` |
| fund_research | 基金代码 / 名称 | `510300.OF`、`华夏成长` |
| futures_data | 期货**品种**代码（非合约），`futures_get_fund_flow` 还接受 `all` | `CU.SHF`、`沪铜`、`all` |
| options_data | 期权**标的**资产代码；期货只接受主力合约 | `510050.SH`、`000300.SH` |
| finance_data | 通用 Wind 证券代码（股 / 债 / 基 / 期通吃） | `600519.SH`、`0700.HK` |

---

## 三、日期 / 时间字段

### 3.1 时间区间：三套命名并存

| 命名 | 工具数 | 分布 | 判定 |
|---|---|---|---|
| `startDate` / `endDate` | 12 / 13 | finance_data、fund_research、futures_data、options_data | **推荐基准**（跨 4 个 server） |
| `timeFrom` / `timeTo` | 27 / 27 | 全部集中在 company_data | **不统一**，见下表 |
| `beginDate` / `endDate` | 1 | finance_data | **不统一且自相矛盾**：起始用 `begin`，结束用 `end`，同 server 另一工具又用 `startDate` |
| `date` (array，1~2 个元素表区间) | 1 | futures_data | **不统一**：用数组长度区分单日 / 区间 |

**`timeFrom` / `timeTo` 涉及的 27 个工具**（vserver_company_data，全部为可选参数、默认近 5 年）：

`company_get_abnormal_operation`、`company_get_bankruptcy_reorg`、`company_get_court_announcements`、`company_get_court_sessions`、`company_get_default_info`、`company_get_disciplinary_list`、`company_get_discredit`、`company_get_environment_penalty`、`company_get_equity_pledged`、`company_get_executed_persons`、`company_get_filing_info`、`company_get_final_case`、`company_get_financial_leasing`、`company_get_high_consumers`、`company_get_illegal_dishonesty`、`company_get_illegal_tax`、`company_get_judgments`、`company_get_judicial_sales`、`company_get_land_acquisition`、`company_get_legal_notice`、`company_get_news_sentiment`、`company_get_owing_tax`、`company_get_penalty_info`、`company_get_share_lockup`、`company_get_simple_cancellation`、`company_get_tax_abnormal`、`company_get_valuation_inquiry`

**其余区间命名不统一的工具**：

| Server | 工具 | 字段 | 问题 |
|---|---|---|---|
| finance_data | `general_search_documents` | `beginDate` + `endDate` | 起止词根不成对（begin vs end），且与同 server 的 `general_query_documents` 的 `startDate`/`endDate` 冲突 |
| futures_data | `futures_get_basis_data` | `date` (array) | 单日传 `["2026-07-08"]`，区间传 `["2026-01-01","2026-07-08"]`；同 server 其他 4 个工具的 `date` 是 string |

> 业务专用区间 `averagingStartDate`/`averagingEndDate`（`options_calc_asian`）、`barrierStartDate`/`barrierEndDate`（`options_calc_single_shark_fin`）遵循 `<语义前缀>StartDate/EndDate` 模式，**视为合规**。

### 3.2 单一日期：7 种命名

| 字段 | 工具数 | 语义 | 判定 |
|---|---|---|---|
| `reportDate` | 10 | 报告期（季末 / 半年末 / 年末） | fund_research 内部一致 |
| `valuationDate` | 7 | 估值日 | options 定价工具内部一致 |
| `expirationDate` | 7 | 到期日 | options 定价工具内部一致 |
| `tradeDate` | 4 | 交易日 | fund_research 2 + options_data 2，跨 server 一致 |
| `asOfDate` | 4 | 查询截止日 | fund_research 内部一致 |
| `date` | 6 | 查询日 / 统计日 | futures_data 5 + fund_research 1 |
| `time` | 2 | 计算参考时间 / 查询日期 | **命名有歧义**，见下 |

**单日期命名不统一的工具**：

| # | Server | 工具 | 字段 | 问题 |
|---|---|---|---|---|
| 1 | options_data | `options_get_term_metrics` | `expiryDate` | 同 server 的 7 个 `options_calc_*` 用 **`expirationDate`** 表达同一概念（到期日） |
| 2 | options_data | `options_volatility_surface` | `time` | 叫 `time` 但传的是 `YYYY-MM-DD HH:mm` |
| 3 | options_data | `options_implied_volatility_term_structure` | `time` | 同名 `time`，但语义是"查询日期"、格式 `YYYY-MM-DD`（与上一条同名不同格式） |
| 4 | fund_research | `fund_get_financials` | `reportPeriod` | 传的是 `YYYY-MM-DD` 报告期，与同 server 其余 10 处的 **`reportDate`** 同义不同名 |
| 5 | stock_research | `stock_get_company_finance_analysis` | `reportPeriod` | 同名但格式完全不同：`FY2025` / `Q1FY2025` / `H1FY2025`。与 fund_research 的 `reportPeriod` 冲突 |
| 6 | fund_research | `fund_get_selection_timing_analysis` | `year` | 名为 `year` 实为**回溯窗口**（`1`/`2`/`3`/`5` = 近 N 年），不是年份 |
| 7 | fund_research | `fund_get_performance` | `ratingPeriod` | 评级月份，格式 `YYYY-MM`，是唯一的月粒度日期字段 |
| 8 | fund_research | `fund_get_selection_timing_analysis` | `date` | 语义是"统计日期，必须为真实月末"，与 futures_data 的 `date`（交易日）语义不同 |

### 3.3 日期取值格式

主流为 `YYYY-MM-DD`（约 95% 的日期参数，描述中均明示格式）。例外：

| Server | 工具 | 字段 | 格式 |
|---|---|---|---|
| finance_data | `general_query_documents` | `startDate` / `endDate` | `YYYY-MM-DD HH:MM:SS` ← **同名字段、不同格式**，最易踩坑 |
| options_data | `options_volatility_surface` | `time` | `YYYY-MM-DD HH:mm` |
| stock_research | `stock_get_company_finance_analysis` | `reportPeriod` | `FY2025` / `Q1FY2025` / `9MFY2025` |
| fund_research | `fund_get_performance` | `ratingPeriod` | `YYYY-MM` |

---

## 四、其他通用字段的一致性问题

### 4.1 行业分类标准 —— 3 个字段名 + 4 套编码（**高风险**）

| Server | 工具 | 字段名 | 编码 |
|---|---|---|---|
| fund_research | `fund_get_brinson_attribution` | `industryStandard` | 0=证监会 / 1=申万一级 / **2=万得一级** / 3=中信一级 / 5=申万一级2021 |
| fund_research | `fund_get_industry_allocation` | `classificationType` | 3=中信一级 / 4=中信二级 / 5=万得一级 / 6=万得二级 / 10=申万一级2021 / 11=申万二级2021 |
| fund_research | `fund_get_equity_holdings` | `industryType` | **2=中信一级** / 3=中信二级 / 4=AMAC / 5=GICS一级 / 6=GICS二级 / 7=Wind一级 / 8=Wind二级 / 10=申万2021一级 / 11=申万2021二级 |
| fund_research | `fund_get_top_equity_holdings` | `industryType` | **2=申万二级** / 3=申万三级 / 4=中信一级 / 5=中信二级 / 7=万得一级 / 9=万得三级 / 10=国证一级 / 11=国证二级 |

> **同一个 server、同一个字段名 `industryType`，取值 `"2"` 在 `fund_get_equity_holdings` 是「中信一级」、在 `fund_get_top_equity_holdings` 是「申万二级」。** 取值 `"5"`、`"10"`、`"11"` 同样冲突。这类错误不会报错，只会静默返回错口径的数据。

### 4.2 返回字段筛选 —— 5 种命名

| 字段 | 类型 | 工具数 | 分布 |
|---|---|---|---|
| `includeFields` | array | 9 | fund_research（内部一致） |
| `indicators` | array | 2 | options_data（`options_get_term_metrics`、`options_get_contract_series`） |
| `indicator` | string | 2 | options_data（`options_get_variety_series`、`options_get_variety_stats`）——与上面的 `indicators` 单复数同源不同义 |
| `indexes` | string（逗号分隔） | 1 | finance_data `quote_get_realtime_indicators` |
| `fields` | array | 1 | futures_data `futures_get_contract_spec` |
| `indexs` | array | 1 | fund_research `fund_get_style_analysis`（**拼写错误**，应为 `indexes`；且此处含义是"风格指数代码列表"，与 finance_data 的 `indexes`=指标名 完全不同） |

### 4.3 返回条数 —— 4 种命名

`limit`（futures_data、stock_research）、`topK`（finance_data）、`maxCount`（finance_data）、`strikeLevels` / `termCount` / `strikeCount`（options_data）。同一个 finance_data 内部就有 `topK` 和 `maxCount` 两种。

### 4.4 同名不同义

| 字段 | 冲突情况 |
|---|---|
| `type` | 5 个工具，5 种完全不同的语义与类型：`integer 0/1`（行情模式）、`string delivery/receipt`（数据类型）、`array upstream/…`（产业链环节）、`integer 1-9`（排名类型）、`integer 1-4`（基本面类型） |
| `queryMode` | `general_query_documents`：1=文件/2=Chunk/3=混合；`fund_get_brinson_attribution`：1=当前报告期区间/2=下一季度区间 |
| `time` | 见 §3.2 |
| `reportPeriod` | 见 §3.2 |
| `industryType` | 见 §4.1 |

### 4.5 拼写错误（建议直接修）

| Server | 工具 | 字段 | 应为 |
|---|---|---|---|
| options_data | `options_calc_autocall_snowball` | **`nontional`** | `notional`；且同 server 的 `options_calc_single_shark_fin` 用的是 `notionalPrincipal`——同一概念两个名字，其中一个还拼错了 |
| fund_research | `fund_get_style_analysis` | **`indexs`** | `indexes` |

### 4.6 布尔开关 —— 3 套命名范式

| 范式 | 字段 | 工具数 | 分布 |
|---|---|---|---|
| `include<X>` 前缀 | `includeMetadata` | 10 | fund_research（内部完全一致） |
| | `includeHistory` | 1 | futures_data `commodity_get_supply_demand` |
| | `includeComponents` | 1 | fund_research `fund_get_return_attribution`（注意：这个是 `array` 不是 `boolean`，名字却像开关） |
| 裸形容词 / 名词 | `history` | 4 | company_data（`company_list_key_personnel` / `company_list_shareholder` / `company_list_patent` / `company_list_investment`） |
| | `onlyValid` | 1 | fund_research `fund_get_similar_funds` |
| | `annualized` | 1 | fund_research `fund_get_performance` |
| `<X>Enable` 后缀 | `newsPenetrateEnable` | 1 | company_data `company_get_news_sentiment` |

**问题**：

1. `history`（company_data，4 个工具）与 `includeHistory`（futures_data）是**同一语义的两个名字**——"是否返回历史数据"。
2. `newsPenetrateEnable` 是全部 132 个工具里**唯一**用 `Enable` 后缀的布尔参数，且是**唯一没有 `default` 的布尔参数**（其余 17 个布尔都显式声明了默认值），调用方无法判断不传时的行为。
3. `includeComponents` 名字符合 `include*` 开关范式，实际类型是 `array`（组件名列表），会误导 Agent 传 `true`。

**建议**：统一为 `include<X>` 前缀 + 必带 `default`；`history` → `includeHistory`；`newsPenetrateEnable` → `includePenetration` 并补默认值；`includeComponents` → `components`。

### 4.7 枚举载体类型 —— 同为数字编码，一半用 string 一半用 integer

| 载体 | 工具 · 字段 |
|---|---|
| **`string`**（传 `"1"` / `"2"`） | fund_research：`heldFundType` / `industryStandard` / `queryMode` / `industryType`×2 / `classificationType` / `marketStyle` / `riskRate` / `year`；finance_data：`docType` / `queryMode`；stock_research：`marketType` |
| **`integer`**（传 `1` / `2`） | futures_data：`type`（`futures_get_position_ranking` 1-9、`commodity_get_supply_demand` 1-4）、`futures_get_historical` 的 `type` 0/1；company_data：`listType` 1/2 |

同一类"数字编码枚举"跨 server 载体类型不同，上层封装无法用一套 `String(v)` 或 `Number(v)` 处理，必须按工具查表。**建议统一为 `string`**（避免 `0` 被当成 falsy 丢掉）。

**附带问题**：`stock_get_market_realtime_analysis.marketType` 的值域是 `1` / `2` / `7` / `0` / **`br`** —— 数字编码里混入字母码，且跳号（缺 3-6），来源不明。

### 4.8 中英文枚举策略 —— 同一个 server 内 3 种互斥要求

全部集中在 vserver_futures_data：

| 工具 | 字段 | 策略 |
|---|---|---|
| `futures_get_warehouse_receipt` | `type` | 中英等价：`delivery` 或 `交割` 都接受 |
| `futures_get_basis_data` | `sector` | 中英等价：`Precious metals` 或 `贵金属` 都接受 |
| `futures_get_related_securities` | `type` | **严禁中文**：描述里写「最高优先级铁律…严禁传中文（如 `["上游"]`），否则后端报错」 |
| `futures_get_contract_spec` | `fields` | **优先中文**：描述里写「最高优先级铁律：用户中文提问 → 中文映射键入参」 |

同一 server 里 `type` 这一个字段名，在 `futures_get_warehouse_receipt` 接受中文、在 `futures_get_related_securities` 传中文直接报错。Agent 无法归纳规则，只能逐工具记忆。**建议**：后端统一做中英双向映射，所有枚举都接受中英文。

### 4.9 必填却带默认值 —— schema 与描述自相矛盾（6 处）

| Server | 工具 | 字段 | 默认值 | 风险 |
|---|---|---|---|---|
| options_data | `options_iv_cone_calculator` | `windCode` | `"000300.SH"` | **最高风险**：字段是 `required`，描述写「**必填项**。若用户未提供，反问用户获取标的资产代码。禁止编造代码」，但 schema 给了默认值。Agent 可能直接用沪深300 静默出结果，用户以为查的是自己的标的 |
| options_data | `options_get_sentiment_data` | `termCount` | `2` | required + default 并存 |
| options_data | `options_get_sentiment_data` | `strikeCount` | `5` | 同上 |
| fund_research | `fund_get_brinson_attribution` | `benchCode` | `"000001.SH"` | 基准默认上证综指，用户未指定时结果口径可能不符预期 |
| finance_data | `quote_get_realtime_indicators` | `indexes` | 8 个默认指标 | required + default，语义上应为可选 |
| finance_data | `general_get_research_insight` | `templateId` | `"T305"` | 同上 |

**建议**：`required` 与 `default` 二选一。真必填就删 `default`，有合理默认就从 `required` 里移除。

### 4.10 参数元数据（`title`）覆盖率参差

| Server | 无 `title` 的参数 | 覆盖率 |
|---|---|---|
| fund_research | 0 / 92 | ✅ 100% |
| futures_data | 0 / 25 | ✅ 100% |
| options_data | 10 / 150 | 93% |
| finance_data | 7 / 32 | 78% |
| stock_research | 3 / 18 | 83% |
| **company_data** | **105 / 127** | ❌ **17%** |

company_data 有 83% 的参数只有 `description` 没有 `title`（包括全部 52 处 `companyKey`、大部分 `timeFrom`/`timeTo`）。同 server 内也不一致——`company_get_bankruptcy_reorg` 的 `timeFrom` 有 title，`company_get_abnormal_operation` 的没有。对依赖 `title` 做参数摘要的客户端会退化。

### 4.11 小数 / 百分比口径描述缺失

7 个 `options_calc_*` 工具共 23 个费率类参数（`volatility` / `riskFreeRate` / `dividendYield` / `coupon` / `knockoutYield` / `floorYield` / `participationRate`）要求传小数（0.25 而非 25）。但下列 3 处**漏写**了「小数形式」和格式转换说明：

| 工具 | 字段 |
|---|---|
| `options_calc_binary` | `dividendYield`（只写"输入年化股息率"） |
| `options_calc_vanilla` | `dividendYield` |
| `options_calc_autocall_snowball` | `dividendYield` |

同一 server 同名字段，5 个工具明确写了转换规则、3 个没写。Agent 遇到"股息率 2%"时行为不可预测（可能传 2 也可能传 0.02）。

### 4.12 工具命名前缀

| Server | 前缀 | 数量 |
|---|---|---|
| company_data | `company_*` | 54 ✅ |
| fund_research | `fund_*` | 24 ✅ |
| options_data | `options_*` | 17 ✅ |
| stock_research | `stock_*` | 15 ✅ |
| futures_data | `futures_*` | 8 |
| | **`commodity_*`** | 1 ← `commodity_get_supply_demand` |
| finance_data | `general_*` | 10 |
| | `quote_*` | 3 |

两处偏离：futures_data 里混入一个 `commodity_` 前缀；finance_data 用了 `general_` / `quote_` 双前缀（`quote_*` 是行情、`general_*` 是通用取数，划分本身合理，但与其他 server 的"单前缀"约定不同）。

### 4.13 已经统一的字段（正面清单）

| 字段 | 工具数 | 说明 |
|---|---|---|
| `question` | 4 | 自然语言问句：`stock_screener`、`fund_screener`、`general_query_documents`、`general_query_data`。命名与语义完全一致 |
| `keyword` | 7 | 检索关键字，语义一致（唯一例外是 `company_search_entity` 用 `searchKey`） |
| `includeMetadata` | 10 | fund_research 内部完全一致，默认 `false` |
| 参数命名大小写 | 132 | 全部 444 个参数均为 camelCase，无一处 snake_case / PascalCase 混入 |
| 工具命名前缀 | 110/132 | 4 个 server 做到"单一主题前缀"（`company_*` / `fund_*` / `options_*` / `stock_*`） |
| 期权定价公共参数 | 7 | `assetClass` / `spotPrice` / `strikePrice` / `volatility` / `riskFreeRate` / `dividendYield` / `dayCount` / `pricingMethod` 在 7 个 `options_calc_*` 工具中命名、类型、取值口径完全一致 |

---

## 五、与既有 7 个 server 的代际差异

当前 skill 已接入的 7 个 server（`vserver_stock_data` / `fund_data` / `index_data` / `bond_data` / `financial_docs` / `economic_data` / `analytics_data`）使用 **snake_case**：

| 旧 7 个 server | 新 6 个 server |
|---|---|
| `windcode` | `windCode` |
| `begin_date` / `end_date` | `startDate` / `endDate` |
| `begin` / `end`（行情快照） | — |
| `indexes`（逗号分隔） | `includeFields`（array） / `indexes`（string） |
| `top_k` | `topK` |

如果要在同一个 CLI 里同时挂载 13 个 server，**必须做参数名映射层**，否则 Agent 会把 `windCode` 传给旧 server（后端会静默吞掉未知字段，返回默认口径数据而不报错）。

---

## 六、建议的收敛方向（按优先级）

1. **P0 · 修数据正确性风险**：统一 `fund_get_equity_holdings` 与 `fund_get_top_equity_holdings` 的 `industryType` 编码表（当前同值不同义，会静默返回错口径数据）。
2. **P0 · 修拼写**：`nontional` → `notionalPrincipal`；`indexs` → `indexes`。
3. **P1 · 统一时间区间**：全部收敛到 `startDate` / `endDate`。改动量：company_data 27 个工具（`timeFrom`/`timeTo`）+ finance_data 1 个（`beginDate`）+ futures_data 1 个（`date` array）。建议后端同时保留旧名做别名，过渡期双写。
4. **P1 · 统一 `windCodes` 类型**：`quote_get_realtime_indicators` 的 `windCodes` 由逗号分隔 string 改为 `array<string>`（或至少两者都接受）。
5. **P2 · 统一基准代码命名**：`benchCode` / `indexWindCode` → `benchmarkWindCode`。
6. **P2 · 统一到期日命名**：`expiryDate` → `expirationDate`。
7. **P2 · 统一报告期命名**：`fund_get_financials` 的 `reportPeriod` → `reportDate`；`stock_get_company_finance_analysis` 的 `FY2025` 格式字段改名为 `fiscalPeriod` 以避免与日期型 `reportPeriod` 混淆。
8. **P2 · 统一时间点命名**：`options_volatility_surface` / `options_implied_volatility_term_structure` 的 `time` → `tradeDate`（并统一为 `YYYY-MM-DD`，需要盘中精度的单独加 `time` 参数）。
9. **P1 · 解开 `required` + `default` 矛盾**：优先处理 `options_iv_cone_calculator.windCode`（当前会静默用 `000300.SH` 出结果，用户以为查的是自己的标的）。真必填就删 `default`，有默认就移出 `required`。
10. **P2 · 统一枚举载体类型**：数字编码枚举全部收敛为 `string`（避免 `0` 被 falsy 判断吃掉）；`marketType` 的 `br` 值改为纯数字或全部改为字母码。
11. **P2 · 统一中英文枚举策略**：futures_data 4 个工具的 3 套策略收敛为"中英双向都接受"，去掉描述里互相矛盾的"最高优先级铁律"。
12. **P2 · 统一布尔开关**：`history` → `includeHistory`；`newsPenetrateEnable` → `includePenetration` 并补 `default`；`includeComponents`（实为 array）改名 `components`。
13. **P3 · 补全参数元数据**：company_data 105 个参数补 `title`；`options_calc_binary` / `options_calc_vanilla` / `options_calc_autocall_snowball` 的 `dividendYield` 补"小数形式"说明。
14. **P3 · 统一条数命名**：`topK` / `maxCount` / `limit` → `limit`。
15. **P3 · 语义澄清**：`fund_get_selection_timing_analysis` 的 `year` → `lookbackYears`；`windCode` 在各 server 的描述里明确写清接受的代码类型（品种 / 合约 / 标的）。

---

## 附录：全量工具 × 标识 / 日期参数对照表

> `*` 表示必填；`(str)` / `(array)` 为参数类型。


### vserver_company_data

| 工具 | 标识参数 | 日期参数 |
|---|---|---|
| company_get_abnormal_operation | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_bankruptcy_reorg | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_biz_enum | — | — |
| company_get_court_announcements | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_court_sessions | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_default_info | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_disciplinary_list | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_discredit | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_enterprise_score | `companyKey`(str)* | — |
| company_get_environment_penalty | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_equity_pledged | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_executed_persons | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_filing_info | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_final_case | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_financial_leasing | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_high_consumers | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_illegal_dishonesty | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_illegal_tax | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_judgments | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_judicial_sales | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_land_acquisition | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_legal_notice | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_liquidation | `companyKey`(str)* | — |
| company_get_news_sentiment | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_owing_tax | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_penalty_info | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_registration_info | `companyKey`(str)* | — |
| company_get_share_lockup | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_simple_cancellation | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_tax_abnormal | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_get_valuation_inquiry | `companyKey`(str)* | `timeFrom`<br>`timeTo` |
| company_list_actual_controller | `companyKey`(str)* | — |
| company_list_annual_report | `companyKey`(str)* | — |
| company_list_beneficial_owner | `companyKey`(str)* | — |
| company_list_bidding | `companyKey`(str)* | — |
| company_list_change_record | `companyKey`(str)* | — |
| company_list_contact | `companyKey`(str)* | — |
| company_list_controlled_entity | `companyKey`(str)* | — |
| company_list_customer_info | `companyKey`(str)* | — |
| company_list_equity_change | `companyKey`(str)* | — |
| company_list_investment | `companyKey`(str)* | — |
| company_list_key_personnel | `companyKey`(str)* | — |
| company_list_patent | `companyKey`(str)* | — |
| company_list_shareholder | `companyKey`(str)* | — |
| company_list_standard | `companyKey`(str)* | — |
| company_list_supplier | `companyKey`(str)* | — |
| company_list_tax_credit_rating | `companyKey`(str)* | — |
| company_list_tax_qual | `companyKey`(str)* | — |
| company_list_tech_roster | `companyKey`(str)* | — |
| company_list_trade_credit | `companyKey`(str)* | — |
| company_list_trademark | `companyKey`(str)* | — |
| company_list_ubo_related | `companyKey`(str)* | — |
| company_search_entity | `searchKey`(str)* | — |
| company_traverse_equity | `companyKey`(str)* | — |

### vserver_finance_data

| 工具 | 标识参数 | 日期参数 |
|---|---|---|
| general_get_dataset | — | — |
| general_get_document | — | — |
| general_get_indicatordata | `windCode`(str)* | — |
| general_get_research_insight | — | — |
| general_query_data | — | — |
| general_query_documents | — | `startDate`<br>`endDate` |
| general_search_datasets | — | — |
| general_search_documents | `windCode`(str) | `beginDate`<br>`endDate` |
| general_search_indicators | `windCode`(str) | — |
| general_search_research_insight | — | — |
| quote_get_historical_dataseries | `windCode`(str)* | — |
| quote_get_realtime_indicators | `windCodes`(str)* | — |
| quote_search_realtime_indicators | — | — |

### vserver_fund_research

| 工具 | 标识参数 | 日期参数 |
|---|---|---|
| fund_get_asset_allocation | `windCode`(str)* | `reportDate`* |
| fund_get_basic_info | `windCodes`(array)* | — |
| fund_get_bond_holdings | `windCode`(str)* | `reportDate`* |
| fund_get_bond_type_allocation | `windCode`(str)* | `reportDate`* |
| fund_get_brinson_attribution | `windCode`(str)*<br>`benchCode`(str)* | `reportDate` |
| fund_get_equity_holdings | `windCode`(str)* | `reportDate`* |
| fund_get_etf_pcf | `windCode`(str)* | `asOfDate`* |
| fund_get_financials | `windCodes`(array)* | `reportPeriod` |
| fund_get_holders | `windCodes`(array)* | `reportDate` |
| fund_get_industry_allocation | `windCode`(str)* | `reportDate`* |
| fund_get_listed_historical_price | `windCodes`(array)* | `tradeDate` |
| fund_get_listed_technical_indicators | `windCodes`(array)* | `tradeDate` |
| fund_get_nav | `windCodes`(array)* | `asOfDate` |
| fund_get_performance | `windCodes`(array)*<br>`benchmarkWindCode`(str) | `asOfDate`<br>`ratingPeriod` |
| fund_get_position_estimate | `windCode`(str)*<br>`indexWindCode`(str) | `startDate`<br>`endDate` |
| fund_get_purchase_redemption_status | `windCodes`(array)* | — |
| fund_get_return_attribution | `windCode`(str)*<br>`benchmarkWindCode`(str)* | `startDate`*<br>`endDate`* |
| fund_get_selection_timing_analysis | `windCode`(str)* | `year`<br>`date` |
| fund_get_similar_funds | `windCode`(str)* | `endDate`<br>`startDate` |
| fund_get_size | `windCodes`(array)* | `asOfDate`<br>`reportDate` |
| fund_get_style_analysis | `windCode`(str)* | `startDate`<br>`endDate` |
| fund_get_top_equity_holdings | `windCode`(str)* | `reportDate`* |
| fund_get_top_fund_holdings | `windCode`(str)* | `reportDate`* |
| fund_screener | — | — |

### vserver_futures_data

| 工具 | 标识参数 | 日期参数 |
|---|---|---|
| commodity_get_supply_demand | `windCode`(str)* | `startDate`<br>`endDate` |
| futures_get_basis_data | `windCodes`(array) | `date` |
| futures_get_contract_spec | `windCode`(str)* | — |
| futures_get_fund_flow | `windCode`(str) | `date`* |
| futures_get_position_ranking | `windCode`(str)* | `date` |
| futures_get_related_securities | `windCode`(str)* | — |
| futures_get_research_opinion_statistics | `windCode`(str)* | `date` |
| futures_get_warehouse_receipt | `windCodes`(array) | `date` |
| futures_get_warehouse_receipt_details | `windCode`(str)* | `date` |

### vserver_options_data

| 工具 | 标识参数 | 日期参数 |
|---|---|---|
| options_calc_accumulator | — | `expirationDate`*<br>`valuationDate`* |
| options_calc_asian | — | `expirationDate`*<br>`valuationDate`*<br>`averagingStartDate`*<br>`averagingEndDate`* |
| options_calc_autocall_snowball | — | `expirationDate`*<br>`valuationDate`* |
| options_calc_barrier | — | `expirationDate`*<br>`valuationDate`* |
| options_calc_binary | — | `expirationDate`*<br>`valuationDate`* |
| options_calc_single_shark_fin | — | `expirationDate`*<br>`valuationDate`*<br>`barrierStartDate`*<br>`barrierEndDate`* |
| options_calc_vanilla | — | `expirationDate`*<br>`valuationDate`* |
| options_get_contract_series | `optionContractCodes`(array)* | `startDate`*<br>`endDate`* |
| options_get_listed_terms | `windCode`(str)* | `tradeDate`* |
| options_get_sentiment_data | `windCode`(str)* | `startDate`*<br>`endDate`* |
| options_get_term_metrics | `optionVarietyCode`(str)* | `tradeDate`*<br>`expiryDate`* |
| options_get_variety_series | `windCodes`(array)* | `startDate`*<br>`endDate`* |
| options_get_variety_stats | `windCodes`(array)* | `startDate`*<br>`endDate`* |
| options_hv_cone_calculator | `windCode`(str)*<br>`subCode`(str) | `startDate`*<br>`endDate`* |
| options_implied_volatility_term_structure | `windCode`(str)* | `time`* |
| options_iv_cone_calculator | `windCode`(str)* | `startDate`*<br>`endDate`* |
| options_volatility_surface | `windCode`(str)* | `time` |

### vserver_stock_research

| 工具 | 标识参数 | 日期参数 |
|---|---|---|
| stock_get_asset_market_performance | — | — |
| stock_get_company_earnings_estimate | `windCode`(str)* | — |
| stock_get_company_finance_analysis | `windCode`(str)* | `reportPeriod` |
| stock_get_company_profile | `windCode`(str)* | — |
| stock_get_company_updates | `windCode`(str)* | — |
| stock_get_company_valuation | `windCode`(str)* | — |
| stock_get_industry_research | — | — |
| stock_get_market_narratives | — | — |
| stock_get_market_realtime_analysis | — | — |
| stock_get_money_flow_analysis | `windCode`(str)* | — |
| stock_get_narrative_details | — | — |
| stock_get_realtime_analysis | `windCode`(str)* | — |
| stock_get_sector_realtime_analysis | `windCode`(str)* | — |
| stock_get_technical_analysis | `windCode`(str)* | — |
| stock_screener | — | — |
