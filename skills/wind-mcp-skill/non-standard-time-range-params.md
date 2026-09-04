# 非 `startDate`/`endDate` 的时间范围入参清单（company_data 以外的 5 个 server）

**探测日期**：2026-09-04（`tools/list` 实连，非缓存）
**范围**：`vserver_finance_data` / `vserver_futures_data` / `vserver_stock_research` / `vserver_fund_research` / `vserver_options_data`，共 **78 个工具**
**排除**：`vserver_company_data` —— 该 server 已完成 `timeFrom`/`timeTo` → `startDate`/`endDate` 改造，27 个工具全部合规（详见 `company-data-date-fields.md`）

## 一、速览

| 时间范围表达方式 | 工具数 | 判定 |
|---|---|---|
| ✅ `startDate` + `endDate` | 12 | 合规基准 |
| ❌ 其他词根的显式区间对 | 3 | §三 |
| ❌ 嵌套在 object 里的区间 | 1 | §五 |
| ❌ 数组表达区间 | 1 | §六 |
| ⚠️ 两个语义日期隐式构成区间 | 8 | §七 |
| ⚠️ 单参数表达回溯窗口 | 6 | §八 |
| ⚠️ 枚举 / 多值选区间 | 4 | §九 |

> ❌ = 与 `startDate`/`endDate` 直接冲突，应改名；⚠️ = 业务上确有区间语义但形态不同，需要单独定规矩而非简单改名。

### 合规基准：已用 `startDate` + `endDate` 的 12 个工具

| Server | 工具 |
|---|---|
| finance_data | `general_query_documents`（⚠️ 但格式是 `YYYY-MM-DD HH:MM:SS`，见 §四） |
| futures_data | `commodity_get_supply_demand` |
| fund_research | `fund_get_similar_funds`、`fund_get_style_analysis`、`fund_get_return_attribution`、`fund_get_position_estimate` |
| options_data | `options_get_contract_series`、`options_get_variety_series`、`options_get_variety_stats`、`options_calc_iv_cone`、`options_calc_hv_cone`、`options_get_sentiment_data` |

---

## 二、显式区间对清单（5 处，其中 3 处需改）

一句话汇总，细节见后续章节：

| # | Server | 工具 | 当前写法 | 应改为 |
|---|---|---|---|---|
| 1 | finance_data | `general_search_documents` | `beginDate` + `endDate` | `startDate` + `endDate` |
| 2 | finance_data | `quote_get_historical_dataseries` | `params.begin` + `params.end`（嵌套） | 提到顶层 `startDate` + `endDate` |
| 3 | futures_data | `futures_get_basis_data` | `date`（array，2 元素表区间） | 拆成 `startDate` + `endDate` |
| 4 | options_data | `options_calc_asian` | `averagingStartDate` + `averagingEndDate` | 保留（业务专用区间，词根已对齐） |
| 5 | options_data | `options_calc_single_shark_fin` | `barrierStartDate` + `barrierEndDate` | 保留（同上） |

> 4、5 两项其实**已经符合** `<语义前缀>StartDate/EndDate` 模式，与 `startDate`/`endDate` 词根一致，建议保留不动；列出只是为了清单完整。真正要改的是 1、2、3。

---

## 三、❌ 其他词根的显式区间对（3 处）

### 3.1 `general_search_documents` —— `beginDate` + `endDate`（finance_data）

| 参数 | 类型 | 必填 | 格式 | 描述 |
|---|---|---|---|---|
| `beginDate` | `string` | 否 | `YYYY-MM-DD` | 「开始日期,可选。用于筛选发布日期大于等于该日期的文档。与 endDate 可单独或同时使用」 |
| `endDate` | `string` | 否 | `YYYY-MM-DD` | 「结束日期,可选。用于筛选发布日期小于等于该日期的文档。与 beginDate 可单独或同时使用」 |

**问题**：起点用 `begin` 词根、终点用 `end` 词根，一对参数内部就不成对。而且**同一个 server 的 `general_query_documents` 用的是 `startDate`/`endDate`** —— 两个都是文档检索工具，参数名却不一样。

> company_data 完成改造后，`beginDate` 是全部 132 个工具里**唯一**还在用 `begin` 词根的顶层区间起点。改动成本最低、收益最直接。

### 3.2 `options_calc_asian` —— `averagingStartDate` + `averagingEndDate`（options_data）

| 参数 | 必填 | 语义 |
|---|---|---|
| `averagingStartDate` | ✅ | 平均观察期的开始日期 |
| `averagingEndDate` | ✅ | 平均观察期的结束日期 |

这是**业务专用区间**（亚式期权的平均观察期），与工具的估值区间（`valuationDate`→`expirationDate`）并存，不能合并。词根已经是 `StartDate`/`EndDate`，**建议保留不动**。

### 3.3 `options_calc_single_shark_fin` —— `barrierStartDate` + `barrierEndDate`（options_data）

| 参数 | 必填 | 语义 |
|---|---|---|
| `barrierStartDate` | ✅ | 障碍观察期开始日期，未提供时按估值日期 |
| `barrierEndDate` | ✅ | 障碍观察期结束日期，未提供时按到期日期 |

同 3.2，业务专用区间，词根已对齐，**建议保留**。

> 3.2 / 3.3 的 `<语义前缀>StartDate` + `<语义前缀>EndDate` 是目前最干净的"第二区间"命名范式，建议作为标准推广——凡是一个工具需要两个以上区间时都照此办理。

---

## 四、⚠️ 名字合规但格式特殊：`general_query_documents`（finance_data）

| 参数 | 格式 |
|---|---|
| `startDate` | `YYYY-MM-DD HH:MM:SS` |
| `endDate` | `YYYY-MM-DD HH:MM:SS` |

参数名合规，但**取值格式带时分秒**，是全部 132 个工具里唯一一处 `startDate`/`endDate` 不接受纯 `YYYY-MM-DD` 的。调用方按其他工具的习惯传 `2025-01-01` 时行为不明确。**建议**：改为接受 `YYYY-MM-DD`（自动补 `00:00:00` / `23:59:59`），或在描述里写清纯日期是否可用。

---

## 五、❌ 嵌套在 object 里的区间（1 处，最隐蔽）

### `quote_get_historical_dataseries`（finance_data）

日期区间**不在顶层**，而是藏在 `params` 这个自由格式 object 的第二层：

```jsonc
{
  "windCode": "600519.SH",
  "type": 1,
  "params": {
    "rangeflag": 2,        // ← 必须先设成 2，begin/end 才生效
    "begin": "2026-03-01",
    "end":   "2026-03-25"
  }
}
```

| 嵌套参数 | 类型 | 描述要点 |
|---|---|---|
| `params.begin` | `string` | 「开始日期，格式 **YYYYY-MM-DD**（8位数字），如 2026-03-25；如需"截至最新"可传 `LAST`。**仅 rangeflag=2 时生效**」 |
| `params.end` | `string` | 「结束日期，格式 YYYY-MM-DD（8位数字），如 2026-03-25；如需"截至最新"可传 `LAST`。仅 rangeflag=2 时生效」 |
| `params.rangeflag` | `integer` | 取数范围方式：`0`=取最近 count 条（默认）/ `1`=按行号范围 / `2`=按日期区间 |

**四个问题叠在一起**：

1. **第三套词根**：`begin`/`end`（顶层是 `startDate`/`endDate`，还有一处 `beginDate`）。
2. **隐藏在 object 第二层**：Agent 扫顶层 schema 看不到任何日期参数，容易误判「这个工具不支持时间范围」。
3. **有前置开关**：不设 `rangeflag=2`，传了 `begin`/`end` 也不生效，且大概率静默忽略不报错。
4. **描述有笔误**：`begin` 写的是 **`YYYYY-MM-DD`（5 个 Y）**，`end` 写的是 `YYYY-MM-DD`；两者都标注「8位数字」，但 `YYYY-MM-DD` 是 10 个字符。三处描述互相矛盾。

另外 `begin`/`end` 支持哨兵值 `LAST`（表示"截至最新"），这是全部 132 个工具里唯一支持日期哨兵值的地方，其他工具都靠"不传即默认"。

**建议**：把 `begin`/`end` 提升为顶层 `startDate`/`endDate`，`rangeflag` 改为「传了日期即自动生效」；修正 `YYYYY` 笔误和「8位数字」的说法。

---

## 六、❌ 用数组表达区间（1 处）

### `futures_get_basis_data`（futures_data）

| 参数 | 类型 | 描述 |
|---|---|---|
| `date` | `array<string>` | 「查询日期，格式 YYYY-MM-DD（数组）：单日快照传 `["2026-07-08"]`，**区间传 `["2026-01-01","2026-07-08"]`（最多 2 个，区间仅单品种生效）**」 |

**问题**：

1. **用数组长度区分语义** —— 1 个元素 = 单日快照，2 个元素 = 时间区间。这是全 132 个工具里唯一一处这么做的。
2. **同 server 的其他 5 个工具，`date` 都是 `string`**（`futures_get_warehouse_receipt_details`、`futures_get_warehouse_receipt`、`futures_get_fund_flow`、`futures_get_position_ranking`、`futures_get_research_opinion_statistics`）。同名参数在同一 server 内类型不一致。
3. **有隐藏前置条件** —— 「区间仅单品种生效」：传了 2 个日期但 `windCodes` 是多品种时，区间会被忽略，且不确定是否报错。

**建议**：拆成 `date`（单日快照）+ `startDate`/`endDate`（区间），或统一改成只用 `startDate`/`endDate`（单日时两者传相同值，与其他工具的做法一致）。

---

## 七、⚠️ 两个语义日期隐式构成区间（8 个工具，options_data）

这些工具没有"查询区间"参数，但**两个业务日期一起定义了一段存续期**，本质是时间范围：

| 工具 | 区间起点 | 区间终点 | 语义 |
|---|---|---|---|
| `options_calc_vanilla` | `valuationDate` | `expirationDate` | 估值日 → 到期日（剩余期限 T） |
| `options_calc_binary` | `valuationDate` | `expirationDate` | 同上 |
| `options_calc_barrier` | `valuationDate` | `expirationDate` | 同上 |
| `options_calc_asian` | `valuationDate` | `expirationDate` | 同上，另有 `averagingStartDate`/`averagingEndDate` 定义平均观察期 |
| `options_calc_accumulator` | `valuationDate` | `expirationDate` | 同上 |
| `options_calc_single_shark_fin` | `valuationDate` | `expirationDate` | 同上，另有 `barrierStartDate`/`barrierEndDate` 定义障碍观察期 |
| `options_calc_autocall_snowball` | `valuationDate` | `expirationDate` | 同上 |
| `options_get_term_metrics` | `tradeDate` | `expiryDate` | 交易日 → 到期日 |

**这类不建议改名** —— `valuationDate` / `expirationDate` 是期权定价的行业标准术语，改成 `startDate`/`endDate` 反而丢失语义。但有两个具体问题要修：

1. **`options_get_term_metrics` 用 `expiryDate`，而 7 个 `options_calc_*` 用 `expirationDate`** —— 同一 server、同一概念（到期日）两个名字。建议统一为 `expirationDate`。
2. 嵌套区间 `averagingStartDate`/`averagingEndDate`、`barrierStartDate`/`barrierEndDate` 词根已与 `startDate`/`endDate` 对齐，**保留即可**，可作为"业务专用区间"的命名范式推广。

---

## 八、⚠️ 单参数表达回溯窗口（6 处）

一个参数就表示一段时间，没有起止点：

| Server | 工具 | 参数 | 类型 | 默认 | 语义 |
|---|---|---|---|---|---|
| fund_research | `fund_get_selection_timing_analysis` | `year` | `string` | `"3"` | 诊断周期 `1`=近1年 / `2`=近2年 / `3`=近3年 / `5`=近5年。**名为 year 实为回溯年数**，建议改 `lookbackYears` |
| options_data | `options_get_variety_series` | `windows` | `string` | `"20"` | 计算窗口（20 个交易日），仅 `indicator=hv` 时必填 |
| options_data | `options_get_variety_stats` | `windows` | `string` | `"20"` | 同上。**复数形式 `windows` 但只接受单个值**，建议改 `window` |
| options_data | `options_get_variety_series` | `tenor` | `string` | `"1M"` | 期限标识 `1W`/`1M`/`2M`/`3M`/`6M`/`9M`/`1Y`/`18M`/`2Y`/`3Y`/`4Y`/`5Y`/`7Y`/`10Y` |
| options_data | `options_get_variety_stats` | `tenor` | `string` | `"1M"` | 同上 |
| options_data | `options_get_sentiment_data` | `termCount` | `integer` | `2` | 提取近期多少个月份（期限），`0`=所有月份 |

**另有一处描述里的隐式窗口**：`fund_research:fund_get_listed_technical_indicators` 的 `tradeDate` 是单日期，但描述写「区间指标按此日期**前推 1 个自然年 / 自然月**计算」—— 单日期参数隐含了一个不可调的回溯区间，调用方无法改变窗口长度。

**建议**：这类保留（业务上确实是窗口而非区间），但统一命名：回溯年数用 `lookbackYears`，计算窗口用 `window`（单数），期限标识保持 `tenor`。

---

## 九、⚠️ 枚举 / 多值选区间（4 处）

不传日期，而是用枚举值或多值列表间接选定时间范围：

| Server | 工具 | 参数 | 写法 | 问题 |
|---|---|---|---|---|
| fund_research | `fund_get_brinson_attribution` | `queryMode` | `"1"`=当前报告期区间 / `"2"`=下一季度区间（默认） | **用枚举选区间**，全 132 工具唯一一处；且 `queryMode` 这个名字在 `finance_data:general_query_documents` 里是「文件/Chunk/混合」，同名不同义 |
| stock_research | `stock_get_company_finance_analysis` | `reportPeriod` | `"Q1FY2025,H1FY2025,9MFY2025,FY2025"` | **逗号分隔多报告期**，格式是 `{报告期}{年份}` 不是日期；与 fund_research 的日期型 `reportPeriod` 同名不同格式 |
| fund_research | `fund_get_financials` | `reportPeriod` | `YYYY-MM-DD`（季末/半年末/年末） | 同名但格式完全不同（日期 vs `FY2025`）；且同 server 其余 10 处用 `reportDate` 表达同一概念 |
| fund_research | `fund_get_performance` | `ratingPeriod` | `YYYY-MM` | 全 132 工具唯一的月粒度时间参数 |

**建议**：

- `stock_get_company_finance_analysis.reportPeriod` → `fiscalPeriod`（明确是财年期间不是日期），与日期型 `reportPeriod` 区分开；
- `fund_get_financials.reportPeriod` → `reportDate`，与同 server 另外 10 处对齐；
- `fund_get_brinson_attribution.queryMode` → `intervalMode`，避免与文档检索的 `queryMode` 同名。

---

## 十、收敛建议（按优先级）

| 优先级 | 动作 | 影响工具 |
|---|---|---|
| **P0** | `general_search_documents`：`beginDate` → `startDate` | 1 |
| **P0** | `quote_get_historical_dataseries`：`params.begin`/`params.end` 提到顶层改 `startDate`/`endDate`，去掉 `rangeflag` 前置开关 | 1 |
| **P0** | 修 `params.begin` 描述笔误：`YYYYY-MM-DD` → `YYYY-MM-DD`，「8位数字」→「10位字符」 | 1 |
| **P1** | `futures_get_basis_data`：`date` 数组拆成 `startDate`/`endDate` | 1 |
| **P1** | `general_query_documents`：`startDate`/`endDate` 支持纯 `YYYY-MM-DD`，或在描述里写清 | 1 |
| **P2** | `options_get_term_metrics`：`expiryDate` → `expirationDate` | 1 |
| **P2** | `fund_get_financials`：`reportPeriod` → `reportDate` | 1 |
| **P2** | `stock_get_company_finance_analysis`：`reportPeriod` → `fiscalPeriod` | 1 |
| **P3** | `fund_get_selection_timing_analysis`：`year` → `lookbackYears` | 1 |
| **P3** | `options_get_variety_series` / `options_get_variety_stats`：`windows` → `window` | 2 |
| **P3** | `fund_get_brinson_attribution`：`queryMode` → `intervalMode` | 1 |

改完 P0 + P1 之后，5 个 server 里所有**通用查询区间**都会统一到 `startDate`/`endDate`，只剩期权定价的 `valuationDate`/`expirationDate` 这类业务语义区间和回溯窗口参数——这两类本来就不该强行改名。
