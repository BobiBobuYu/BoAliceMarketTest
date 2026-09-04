# vserver_fund_research 字段核对 + 全工具调用验证

实连 + 逐个调用，2026-09-04。**23 个工具全部调用成功**，88 个参数。

> **工具数 24 → 23**：`fund_get_listed_technical_indicators` 已下线。

## 一、调用验证 23/23 ✅

样本：`510300.OF`（指数）、`000001.OF`（混合）、`510300.SH`（ETF）、`005220.OF`（FOF），报告期 `2026-06-30`。

| 工具 | 返回 |
|---|---|
| `fund_get_similar_funds` | 19 条相似基金 |
| `fund_get_brinson_attribution` | 11 个行业归因项 |
| `fund_get_style_analysis` | 3 周期，主导风格大盘成长 56.75% |
| `fund_get_return_attribution` | FF5 因子，R²=0.9384 |
| `fund_get_position_estimate` | 66 条仓位估算（需主动型基金） |
| `fund_get_selection_timing_analysis` | 综合得分 77.30，同类排名 1639/2120 |
| `fund_get_asset_allocation` | 6 个资产类别 |
| `fund_get_industry_allocation` | 11 个 Wind 一级行业 |
| `fund_get_bond_type_allocation` | 0 个券种（指数基金无债，正常） |
| `fund_get_equity_holdings` | 339 条全部持股 |
| `fund_get_top_equity_holdings` | 10 条重仓股 |
| `fund_get_bond_holdings` | 33 条重仓债（需含债基金） |
| `fund_get_top_fund_holdings` | 10 条重仓持基 |
| `fund_get_etf_pcf` | 300 条申赎成分 |
| `fund_get_basic_info` | 2 对象 × 14 项全成功 |
| `fund_get_nav` | 2 × 12 项全成功 |
| `fund_get_purchase_redemption_status` | 2 × 6 项全成功 |
| `fund_get_performance` | 2 × 116 项，95 成功 21 未返回 |
| `fund_get_listed_historical_price` | 1 × 8 项全成功 |
| `fund_get_size` | 2 × 14 项全成功 |
| `fund_get_holders` | 2 × 12 项，8 成功 4 未返回 |
| `fund_get_financials` | 2 × 40 项，10 成功 2 不适用 28 未返回 |
| `fund_screener` | 匹配 232 只，返回前 100 |

`fund_get_selection_timing_analysis` 对部分基金返回「Wind 数据源当前不可用，请稍后重试」。**复测后修正判断：不是瞬时故障，而是基金覆盖问题，且报错文案误导**——

| 基金 | 类型 | 结果 |
|---|---|---|
| `000001.OF` 华夏成长 | 主动混合 | ✅ 综合得分 77.30 |
| `005827.OF` 易方达蓝筹精选 | 主动混合 | ✅ 综合得分 78.80 |
| `510300.OF` 沪深300ETF | 被动指数 | ❌ 「Wind 数据源当前不可用」（3 次重试均失败） |
| `110011.OF` 易方达优质精选 | 主动混合 | ❌ 同上 |
| `000198.OF` 天弘余额宝 | 货币 | ❌ 同上 |

被动指数与货币基金本就没有"选股择时能力"评价，`110011.OF` 则是评价样本未覆盖。这三类应返回「该基金不适用 / 无评价数据」，而不是提示"数据源不可用，**请稍后重试**"——按提示重试永远不会成功。

## 二、已统一 ✅

| 项 | 现状 |
|---|---|
| `title` 覆盖 | **88/88 = 100%**（7 个 server 里唯一满分之一） |
| `windCodes` 类型 | 8 处全部 `array<string>`，无逗号分隔 string |
| 时间区间 | `startDate`/`endDate` 4 对，格式 `YYYY-MM-DD` |
| 通用开关 | `includeMetadata`(9) / `includeFields`(8) 命名与默认值完全一致 |
| 工具前缀 | `fund_*` 单前缀 23/23 |
| 大小写 | 全 camelCase |

## 三、问题项

### ① 基准 / 参照指数代码 —— 同 server 内 4 个名字 ❌

| 字段 | 工具 | 语义 |
|---|---|---|
| `benchmarkWindCode` | `fund_get_return_attribution`(必填) / `fund_get_performance`(默认 000300.SH) | 基准代码 |
| `benchCode` | `fund_get_brinson_attribution`（必填 + 默认 000001.SH） | 比较基准代码 |
| `indexWindCode` | `fund_get_position_estimate`（默认 000300.SH） | 对照指数代码 |
| `marketIndex` | `fund_get_return_attribution`（默认 881001.WI） | MKT 因子用市场指数 |

四个字段都是"某个用作参照的指数 Wind 代码"，命名各不相同。建议统一为 `benchmarkWindCode`（`marketIndex` 语义确实不同，可保留但改为 `marketIndexWindCode`）。

### ② `fund_screener` 从 `question` 改成了 `query` ❌ 倒退

上一次快照该参数还是 `question`，现已改为 `query`。全局其他自然语言入参**全部叫 `question`**：

`stock_screener` / `general_query_documents` / `general_query_data` / `macro_search_indicator` / `macro_query_indicator_series`

`fund_screener` 成为唯一例外。建议改回 `question`。

### ③ 单值 / 多值代码按工具族分裂

| 字段 | 工具数 | 分布 |
|---|---|---|
| `windCode`(string) | 14 | 分析类（归因/风格/持仓/配置） |
| `windCodes`(array) | 8 | 档案与行情类（基础信息/净值/规模/持有人/业绩/申赎/行情/财务） |

同一 server 内两套入参形态，上层无法用统一结构构造请求。

### ④ 日期字段 7 种命名

| 字段 | 处数 | 备注 |
|---|---|---|
| `reportDate` | 10 | 报告期，`YYYY-MM-DD` |
| `asOfDate` | 4 | 查询截止日 |
| `startDate` / `endDate` | 4 对 | ✅ 合规 |
| `reportPeriod` | 1 | `fund_get_financials`，**实测同样收 `YYYY-MM-DD`**，与另外 10 处的 `reportDate` 纯属命名不一致 |
| `date` | 1 | `fund_get_selection_timing_analysis`，须为真实月末 |
| `tradeDate` | 1 | `fund_get_listed_historical_price` |
| `ratingPeriod` | 1 | `fund_get_performance`，`YYYY-MM` 月粒度 |

### ⑤ 行业分类 —— 3 个字段名 + 描述表互相矛盾

| 工具 | 字段 |
|---|---|
| `fund_get_equity_holdings` / `fund_get_top_equity_holdings` | `industryType` |
| `fund_get_industry_allocation` | `classificationType` |
| `fund_get_brinson_attribution` | `industryStandard` |

**实测修正（重要）**：此前审计文档判定两个 `industryType` "同值不同义、静默返回错口径数据"。逐值实调后**该判断不成立**——

以 300308.SZ（中际旭创）在 `510300.OF` 2026-06-30 持仓中的行业名为准：

| `industryType` | equity_holdings 描述 | top_equity_holdings 描述 | 实际返回 | 两工具是否一致 |
|---|---|---|---|---|
| `0` | （未列） | 证监会 | 通信 | ✅ 相同 |
| `2` | 中信一级 | 申万二级 | 通信 | ✅ 相同 |
| `4` | AMAC | 中信一级 | （空） | ✅ 相同 |
| `5` | GICS一级 | 中信二级 | （空） | ✅ 相同 |
| `8` | Wind二级 | 万得二级 | 硬件设备 | ✅ 相同 |
| `10` | 申万2021一级 | 国证一级 | 通信 | ✅ 相同 |
| `11` | 申万2021二级 | 国证二级 | 通信设备 | ✅ 相同 |

**后端只有一套实现，7/7 取值两个工具返回完全相同。真正的问题是 `fund_get_top_equity_holdings` 的枚举描述写错了**：`2` 实际是中信一级（返回"通信"），描述却写"申万二级"（申万二级应为"通信设备"）；`11` 实际是申万2021二级，描述写"国证二级"。

危害仍在但性质不同——不是数据错，是 Agent 按错误描述选码会选到空值或非预期口径（如想要中信一级按描述传 `4`，实际返回空）。

### ⑥ `indexs` 拼写错误

`fund_get_style_analysis` 的风格指数列表参数叫 `indexs`，应为 `indexes`。

### ⑦ `year` 名不副实

`fund_get_selection_timing_analysis.year` 取值 `1`/`2`/`3`/`5` 表示"近 N 年"，是回溯窗口不是年份。建议 `lookbackYears`。

### ⑧ `cycle` 同名不同枚举

| 工具 | 可选值 |
|---|---|
| `fund_get_style_analysis` | `monthly` / `quarterly`（明确不支持 weekly/daily/yearly） |
| `fund_get_return_attribution` | `daily`(默认) / `weekly` / `monthly` / `quarterly` / `yearly` |

### ⑨ `benchCode` required + default 矛盾

`fund_get_brinson_attribution.benchCode` 标 `required` 却带默认值 `000001.SH`（上证综指）。用户未指定基准时归因口径可能不符预期。

### ⑩ 返回格式两套

- **分析类**（14 个 `windCode` 工具）：`已查询…，返回 N 条` + markdown 表格
- **档案行情类**（8 个 `windCodes` 工具）：`## 查询结果` / `### 汇总` / `共处理 N 个对象、M 个查询项` + `### 数据结果` 表格

两套摘要结构不同，上层需分别解析。

### ⑪ 业务错误 `isError=false`，且文案误导

「Wind 数据源当前不可用，请稍后重试。」「未返回有效仓位估算数据。」均为纯文本 + `isError=false`。前者实为"该基金无此项评价数据"却提示重试（见 §一），会让调用方陷入无效重试。

## 四、建议

| P | 动作 |
|---|---|
| P0 | 修 `fund_get_top_equity_holdings.industryType` 的枚举描述（与实际实现对齐，参照 `fund_get_equity_holdings`） |
| P0 | 修拼写 `indexs` → `indexes` |
| P1 | `fund_screener.query` 改回 `question`，与全局对齐 |
| P1 | 基准代码统一为 `benchmarkWindCode`（`benchCode` / `indexWindCode` 归并） |
| P1 | 解开 `benchCode` 的 required + default 矛盾 |
| P2 | `fund_get_financials.reportPeriod` → `reportDate` |
| P2 | 行业分类字段名统一（`industryType` / `classificationType` / `industryStandard` 三选一） |
| **P1** | `fund_get_selection_timing_analysis` 对无评价数据的基金改返回「不适用 / 无数据」，不要提示"数据源不可用请重试" |
| P2 | 业务错误改 `isError=true` 或结构化错误码 |
| P3 | `year` → `lookbackYears`；`cycle` 枚举差异写进描述；两套返回摘要结构统一 |
