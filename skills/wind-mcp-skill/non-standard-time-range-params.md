# 非 `startDate`/`endDate` 的时间范围入参

实连 `tools/list`，2026-09-04。范围：company_data 以外的 5 个 server，共 78 个工具。
（company_data 27 个工具已全部改为 `startDate`/`endDate`，见 `company-data-date-fields.md`）

## 速览

| 形态 | 处数 | 处置 |
|---|---|---|
| ✅ `startDate` + `endDate` | 12 | 基准 |
| ❌ 其他词根的区间对 | 1 | 改 |
| ❌ 嵌套在 object 里的区间 | 1 | 改 |
| ❌ 数组长度表示区间 | 1 | 改 |
| ⭕ `<前缀>StartDate/EndDate` 业务区间 | 2 | 保留 |
| ⚠️ 两个语义日期隐式构成区间 | 8 | 保留 |
| ⚠️ 单参数回溯窗口 | 6 | 保留，统一命名 |
| ⚠️ 枚举 / 多值选区间 | 4 | 部分改名 |

**合规的 12 个**：finance_data `general_query_documents`；futures_data `commodity_get_supply_demand`；fund_research `get_similar_funds` `get_style_analysis` `get_return_attribution` `get_position_estimate`；options_data `get_contract_series` `get_variety_series` `get_variety_stats` `calc_iv_cone` `calc_hv_cone` `get_sentiment_data`。

---

## ❌ 要改的 3 处

### 1. `general_search_documents`（finance_data）—— `beginDate` + `endDate`

起点用 begin 词根、终点用 end，一对参数内部不成对。同 server 的 `general_query_documents` 用的是 `startDate`/`endDate`，两个都是文档检索工具。

> company_data 改完后，这是**唯一还在用 begin 词根的顶层区间起点**。

### 2. `quote_get_historical_dataseries`（finance_data）—— `params.begin` + `params.end`

日期区间不在顶层，藏在 `params` 对象第二层：

```jsonc
{"windCode":"600519.SH", "type":1,
 "params": {"rangeflag": 2, "begin": "2026-03-01", "end": "2026-03-25"}}
```

四个问题叠加：

- 第三套词根 `begin`/`end`
- 嵌在 object 第二层，扫顶层 schema 看不到任何日期参数，易误判"不支持时间范围"
- 前置开关：不设 `rangeflag=2` 传了也不生效
- 描述笔误：`begin` 写成 **`YYYYY-MM-DD`（5 个 Y）**，`end` 是 4 个 Y，两者都标注「8位数字」（实际 10 位）

另：`begin`/`end` 支持哨兵值 `LAST`，全 132 工具唯一。

### 3. `futures_get_basis_data`（futures_data）—— `date` 用数组长度区分语义

`["2026-07-08"]` = 单日快照，`["2026-01-01","2026-07-08"]` = 区间。全 132 工具唯一这么做的；同 server 另外 5 个工具的 `date` 都是 `string`。且有隐藏条件「区间仅单品种生效」。

---

## ⭕ 建议保留：`<前缀>StartDate/EndDate`

| 工具 | 参数 | 语义 |
|---|---|---|
| `options_calc_asian` | `averagingStartDate` / `averagingEndDate` | 平均观察期 |
| `options_calc_single_shark_fin` | `barrierStartDate` / `barrierEndDate` | 障碍观察期 |

词根已与 `startDate`/`endDate` 对齐，且与估值区间并存不能合并。建议作为"第二区间"的标准命名范式推广。

---

## ⚠️ 形态不同、不宜简单改名

### 两个语义日期隐式构成区间（8 个，options_data）

7 个 `options_calc_*`（`vanilla` `binary` `barrier` `asian` `accumulator` `single_shark_fin` `autocall_snowball`）用 `valuationDate` → `expirationDate` 表示剩余期限；`options_get_term_metrics` 用 `tradeDate` → `expiryDate`。

行业标准术语，改成 `startDate`/`endDate` 反而丢语义。**但 `expiryDate` 应统一为 `expirationDate`**（同 server 同概念两个名字）。

### 单参数回溯窗口（6 处）

| 工具 | 参数 | 默认 | 语义 | 建议 |
|---|---|---|---|---|
| `fund_get_selection_timing_analysis` | `year` | `"3"` | 1/2/3/5 = 近 N 年 | → `lookbackYears` |
| `options_get_variety_series` / `_stats` | `windows` | `"20"` | 计算窗口（交易日） | → `window`（复数但只收单值） |
| `options_get_variety_series` / `_stats` | `tenor` | `"1M"` | 期限标识 1W~10Y | 保留 |
| `options_get_sentiment_data` | `termCount` | `2` | 近 N 个月份 | 保留 |

另：`fund_get_listed_technical_indicators` 的 `tradeDate` 是单日期，但描述写「区间指标按此日期前推 1 个自然年/自然月计算」——隐含一个不可调的回溯区间。

### 枚举 / 多值选区间（4 处）

| 工具 | 参数 | 写法 | 问题 |
|---|---|---|---|
| `fund_get_brinson_attribution` | `queryMode` | `"1"`=当前报告期区间 / `"2"`=下一季度 | 用枚举选区间，全 132 工具唯一；与 finance_data 的 `queryMode`（文件/Chunk/混合）同名不同义 → `intervalMode` |
| `stock_get_company_finance_analysis` | `reportPeriod` | `Q1FY2025,H1FY2025,FY2025` | 财年期间非日期 → `fiscalPeriod` |
| `fund_get_financials` | `reportPeriod` | `YYYY-MM-DD` | 同 server 另 10 处用 `reportDate` → `reportDate` |
| `fund_get_performance` | `ratingPeriod` | `YYYY-MM` | 全 132 工具唯一的月粒度参数 |

---

## 另一个坑：名字合规但格式特殊

`general_query_documents`（finance_data）的 `startDate`/`endDate` 格式是 `YYYY-MM-DD HH:MM:SS`，是唯一不吃纯 `YYYY-MM-DD` 的。建议改为兼容纯日期（自动补 `00:00:00`/`23:59:59`）。

---

## 收敛优先级

| P | 动作 |
|---|---|
| P0 | `general_search_documents`：`beginDate` → `startDate` |
| P0 | `quote_get_historical_dataseries`：`params.begin/end` 提到顶层改 `startDate`/`endDate`，去掉 `rangeflag` 前置开关；修 `YYYYY` 与「8位数字」笔误 |
| P1 | `futures_get_basis_data`：`date` 数组拆成 `startDate`/`endDate` |
| P1 | `general_query_documents`：支持纯 `YYYY-MM-DD` |
| P2 | `expiryDate` → `expirationDate`；`fund_get_financials.reportPeriod` → `reportDate`；`stock_get_company_finance_analysis.reportPeriod` → `fiscalPeriod` |
| P3 | `year` → `lookbackYears`；`windows` → `window`；`queryMode` → `intervalMode` |

P0+P1 改完，5 个 server 的**通用查询区间**即全部统一到 `startDate`/`endDate`，只剩期权定价的业务语义区间和回溯窗口——这两类本就不该强改。
