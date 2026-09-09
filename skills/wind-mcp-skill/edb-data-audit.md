# vserver_edb_data 字段核对 + 全工具调用验证

实连 + 逐个调用，2026-09-04。`https://mcp.wind.com.cn/vserver_edb_data/mcp/`，**3 个工具全部调用成功**，12 个参数。

> 与旧 `vserver_economic_data`（2 工具：`search_economic_indicator` / `query_economic_indicator_data`）**并存**。新 server 多一个 `macro_get_indicator_series`（按代码直取）和口径转换能力。

## 一、调用验证 3/3 ✅

| 工具 | 入参 | 返回 |
|---|---|---|
| `macro_search_indicator` | `question:"中国GDP相关指标"` | 4.7KB，得 `M5567876` 等，含单位/来源/频率/数量级 |
| `macro_get_indicator_series` | `metricCodes:"M5567876"` + `observation:4` | 近 4 期：354106.2 / 387911.3 / 334192.9 / 361511.1 |
| 〃 | `metricCodes:"M5567876,M0001395"` + `startDate`/`endDate` | 多代码 + 区间，10 期 |
| `macro_query_indicator_series` | `question` + `observation:4` | 与按代码取数结果一致 |
| 〃 | `question` + `targetMagnitude`/`targetCurrency`/`targetFrequency` | 口径转换生效（枚举值需注意，见 ③） |

## 二、已统一 ✅

| 项 | 现状 |
|---|---|
| 时间区间 | `startDate` / `endDate`，格式 `YYYY-MM-DD`，与新标准一致 |
| 自然语言问句 | `question`（2 工具），与其他 server 一致 |
| 观测期数 | `observation`（2 工具），命名一致 |
| 工具前缀 | `macro_*` 单前缀 |
| 大小写 | 全 camelCase |

## 三、不统一 / 问题项

### ① `title` 覆盖率 0/12 ❌

12 个参数**无一有 `title`**，是 7 个 server 里最差的（company_data 17%，fund_research / futures_data / options_data 均 100%）。

### ② `metricCodes` 是逗号分隔 string，不是 array

与 `finance_data:quote_get_realtime_indicators.windCodes` 同样的问题——复数命名但类型是 `string`。全局第三套标识体系（`windCode` / `companyKey` / `metricCodes`）。

### ③ `targetMagnitude` 描述举例 3/5 无效 ⚠️

描述写「目标数量级**或展示单位**，如 元、亿元、万亿元、十亿、百万吨」，实测：

| 值 | 结果 |
|---|---|
| `万` `百万` `亿` `十亿` `千亿` `万亿` | ✅ |
| `元` `亿元` `万亿元` `百万吨` | ❌ `targetMagnitude枚举值不正确` |

**只收纯数量级词，不收任何带单位的值**。描述举的 5 个例子里只有「十亿」有效，字段名和描述里的「或展示单位」是错的。

### ④ `observation` 与 `startDate`/`endDate` 优先级与描述相反 ⚠️

描述写「与 startDate 和 endDate 一起使用，**相对 observation 优先**」。实测：

| 入参 | 返回日期 |
|---|---|
| 仅 `observation:2` | `20260331, 20260630` |
| 仅区间 `2024-01-01~2026-09-04` | 10 期（`20240331`…`20260630`） |
| **两者同传** | `20260331, 20260630` ← **observation 赢** |

且"互斥"未强制——同传不报错，静默丢弃区间。

### ⑤ `targetFrequency` 接受未文档化的英文值

描述只写「日、周、月、季、年」。实测 `年` `季` `月` ✅，**`yearly` 也 ✅**（未文档化），`Y` ❌。

### ⑥ 业务错误用纯文本返回且 `isError=false` ❌

| 场景 | 返回 |
|---|---|
| 错误指标代码 | `请填写正确的逗号分割的指标代码` |
| 检索无结果 | `没有搜索到指标，火星土壤含水量指标` |
| 枚举值非法 | `targetMagnitude枚举值不正确` |
| 币种非法 | `targetCurrency不是合法的ISO 4217币种代码` |

全部 `isError=false`，协议层无法判断成败，调用方只能做文本匹配。

### ⑦ 入参与出参日期格式不一致

入参 `YYYY-MM-DD`，返回的 `date[]` 和 `updateDate` 都是 **`YYYYMMDD`**（如 `20260720`）。

### ⑧ 数据截断只靠文本提示

区间较大时返回 `summary: "由于本次提取范围较大，已返回部分数据。请按指标或时间范围拆分…"`，没有结构化的 `hasMore` / 游标字段。

### ⑨ `observation` schema 是 `integer`，传字符串 `"2"` 后端也接受

宽容但不严谨，schema 与实际校验不一致。

## 四、建议

| P | 动作 |
|---|---|
| P0 | 修 `targetMagnitude` 描述：删掉「或展示单位」，例子改为实际有效值（万/百万/亿/十亿/千亿/万亿）；或后端兼容带单位写法 |
| P0 | 修 `observation` 与 `startDate`/`endDate` 的优先级描述（实测 observation 优先），或改后端使描述成立；同传时应报错而非静默丢弃 |
| P1 | 业务错误改用 `isError=true` 或结构化错误码，不要纯文本 |
| P1 | 补全 12 个参数的 `title` |
| P2 | `metricCodes` 改 `array<string>`（或两者都收） |
| P2 | 返回日期格式统一为 `YYYY-MM-DD`，与入参一致 |
| P2 | `targetFrequency` 补文档化英文值，或只收中文 |
| P3 | 截断改为结构化字段（`hasMore` / `nextCursor`） |

---

> 逐工具的边界 / 入参 / 故意错误 / 工具协同专项测试见 [`test-report-edb-data.md`](test-report-edb-data.md)。

## 描述正确性复核（2026-09-07）

3 个工具全部实调，比对 `description` 与真实返回。**工具已从 `macro_*` 改名为 `economic_*`**（09-04 记录的名称全部失效）。

### ① 同义参数两个名字：`numOfObservation` vs `observation`

| 工具 | 期数参数名 |
|---|---|
| `economic_get_indicator_series` | **`numOfObservation`** |
| `economic_query_indicator_series` | **`observation`** |

09-04 时两者都叫 `observation`；本轮 `get_*` 改名为 `numOfObservation`，`query_*` 未改。传旧名 `observation` 给 `get_*` 会被**静默忽略**并返回默认区间：

```
{"metricCodes":"M5567876","observation":4}        → 10 期（参数被吞）
{"metricCodes":"M5567876","numOfObservation":4}   → 4 期 ✅
```

### ② 「未指定范围时获取近 2 年数据」与实测不符

`economic_get_indicator_series`【适用场景】声称默认近 2 年。实测（不传任何区间参数）：

| 指标 | 频率 | 实际返回 | 覆盖区间 |
|---|---|---|---|
| `M5567876` 中国:GDP:现价:当季值 | 季 | 10 期 | 2024-03-31 → 2026-06-30（约 2.5 年） |
| `M0000612` 中国:CPI:当月同比 | 月 | **9 期** | 2025-11-30 → 2026-07-31（**不到 1 年**，复现 2/2） |

默认行为更接近「近 10 期」而非「近 2 年」。另外多代码同查时窗口会对齐到最低频指标——`M0000612,M5567876` 同查，月频指标从 9 期变成 **29 期**（2024-03-31 起）——描述只在 `numOfObservation` 条目下提到对齐，未说明默认区间也会对齐。

### ③ 描述与实际一致的部分 ✅

- `economic_search_indicator`【返回】「只返回元信息不返回数值」——实测返回 `{code,name,unit,source,magnitude,currency,updateDate,freq}`，确实无时间序列 ✅
- `economic_query_indicator_series` 的 `targetMagnitude`/`targetCurrency`/`targetFrequency` 三个枚举齐全、语义准确 ✅
- 三个工具的【边界】互相指引的工具名全部存在且正确 ✅
- 无匹配时返回纯文本「没有搜索到指标，<问句>」，与描述吻合（但 `isError=false`）

### 建议

| P | 动作 |
|---|---|
| **P0** | 统一期数参数名（`numOfObservation` / `observation` 二选一），或让 `get_*` 同时接受两者 |
| **P1** | 未知参数应报错而非静默忽略——当前传错名会拿到默认区间且毫无提示 |
| **P1** | 修正「默认近 2 年」的描述：实测月频仅 9 期。要么改文案为「近 10 期」，要么让后端真的按 2 年取 |
| P2 | 说明多代码同查时默认区间也会对齐到最低频指标 |
