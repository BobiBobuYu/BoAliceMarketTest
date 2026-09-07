# vserver_edb_data 逐工具测试报告

测试日期 **2026-09-07**　endpoint `https://mcp.wind.com.cn/vserver_edb_data/mcp/`　工具 **3 个** / 参数 12 个

用例 **44 条**：正常调用 15（每工具 ×5）、边界 13、故意错误 16，另加链式协同 1 组与专项复验 12 次。

## 一、正常调用错误率

每个工具用注册表里的实测样例连打 5 次：

| 工具 | 通过 | 平均耗时 | 返回体积 |
|---|---|---|---|
| `economic_search_indicator` | **5/5** | 5328 ms | 4.7 KB |
| `economic_get_indicator_series` | **5/5** | 1873 ms | 420 B |
| `economic_query_indicator_series` | **5/5** | 1804 ms | 288 B |
| **合计** | **15/15 = 100%** | 3001 ms | — |

正常路径零错误，无抖动，返回体积逐次一致。`economic_search_indicator` 是三者中最慢的（5.3 s），因为要做全库语义检索。

---

## 二、`economic_search_indicator`

**签名**：`question*: string`

### 描述核对

| 描述断言 | 实测 | 结论 |
|---|---|---|
| 【返回】「返回…元信息及候选指标，**不返回具体数值或时间序列**」 | 返回 `{code,name,unit,source,magnitude,currency,updateDate,freq}`，确实无 `date`/`value` | ✅ |
| 【边界】「代码未知时优先调本工具，再调 `economic_get_indicator_series`」 | 该工具存在且链路可用 | ✅ |
| 入参描述「自然语言搜索问句，如 中国近三年 GDP 相关指标」 | 中英文问句均可 | ✅ |

### 入参与边界

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `question` | `isError` +「缺少必填参数: question」 | ✅ |
| `question=""` | 「问句参数不能为空」 | ✅ |
| `question=12345`（数字） | 「没有搜索到指标，12345」 | ⚠️ 类型宽松，未报类型错误 |
| 非金融问句「今天晚饭吃什么」 | 「没有搜索到指标，今天晚饭吃什么」 | ✅ 边界清晰 |
| 英文问句 `China GDP quarterly` | 正常返回 M5567876 等 | ✅ 描述未提但支持 |
| 500 字超长问句 | 正常返回 3.2 KB（PMI/CPI 等） | ✅ 不崩 |

**问题**：无匹配时返回纯文本且 `isError=false`，调用方必须做文本判定（全 server 通病）。

---

## 三、`economic_get_indicator_series`

**签名**：`metricCodes*: string(逗号分隔)`、`startDate`、`endDate`、`numOfObservation: integer`

### ❌ P0：`startDate` / `endDate` 完全不生效

这是本 server 最严重的问题。该工具被描述定位为「**EDB 的标准取数工具**」，而它的取数区间参数是坏的：

```
metricCodes=M5567876（中国:GDP:现价:当季值，季频）
```

| 传入区间 | 实际返回 |
|---|---|
| `2026-01-01 ~ 2026-06-30`（应 2 期） | 10 期，`20240331 → 20260630` |
| `2023-01-01 ~ 2023-12-31`（应 4 期） | 10 期，`20240331 → 20260630` |
| `2020-01-01 ~ 2021-12-31`（应 8 期） | 10 期，`20240331 → 20260630` |
| `2010-01-01 ~ 2015-12-31`（应 24 期） | 10 期，`20240331 → 20260630` |
| `2015-01-01 ~ 2026-06-30`（应 46 期） | 10 期，`20240331 → 20260630` |
| 只传 `startDate` / 只传 `endDate` | 10 期，同上 |

换月频指标 `M0000612`（中国:CPI:当月同比）复验，传 `2025-01-01 ~ 2025-12-31` → 返回 9 期 `20251130 → 20260731`，同样是默认窗口。

**区间参数只在一处起作用**：当区间完全落在数据范围之外（`2030` 未来 / `1900`）时，返回 `summary:「指标在这个时间范围没有数据」`。也就是说 **区间被用于一次存在性判断，取数本身完全走默认窗口**。

对比：兄弟工具 `economic_query_indicator_series` 传同样区间 `2026-01-01 ~ 2026-06-30` 正确返回 2 期。**区间查询只能走 query 版**。

### ❌ P1：默认窗口不是描述说的「近 2 年」

【适用场景】写「未指定范围时获取近 2 年数据」。实测（不传任何区间参数）：

| 指标 | 频率 | 实际返回 | 覆盖 |
|---|---|---|---|
| `M5567876` GDP | 季 | 10 期 | 2024-03-31 → 2026-06-30（约 2.5 年） |
| `M0000612` CPI | 月 | **9 期** | 2025-11-30 → 2026-07-31（**不到 1 年**，复现 2/2） |

默认行为更接近「近 10 期」。多代码同查时窗口会对齐到最低频指标——`M0000612,M5567876` 同查，月频从 9 期变 **29 期**（2024-03-31 起），描述只在 `numOfObservation` 条目下提了对齐，没说默认区间也会对齐。

### ❌ P1：互斥优先级与描述相反

`startDate` 描述：「与 `endDate` 一起使用，**相对 `numOfObservation` 优先**」

实测同传 `startDate=2025-01-01, endDate=2026-06-30, numOfObservation=2` → 返回 **2 期**，即 **`numOfObservation` 优先**。且描述说二者「互斥，不应同时填写」，实际同传不报错。

### ❌ P1：同义参数在同 server 内两个名字

| 工具 | 期数参数 |
|---|---|
| `economic_get_indicator_series` | **`numOfObservation`** |
| `economic_query_indicator_series` | **`observation`** |

传错名被静默忽略：`{"metricCodes":"M5567876","observation":4}` → 返回默认 10 期，无任何提示。

### 入参与边界

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `metricCodes` | 「缺少必填参数: metricCodes」 | ✅ |
| 代码不存在 `M9999999` | **「服务异常」**（4 字节） | ❌ 文案完全不指向"代码不存在" |
| 代码小写 `m5567876` | **「服务异常」** | ❌ 大小写敏感，且文案同样误导 |
| `metricCodes` 传数组 | 「请求参数格式错误」 | ✅ |
| `numOfObservation` 传字符串 `"4"` | 正常返回 4 期 | ⚠️ 类型宽松 |
| `numOfObservation=1` | 1 期 | ✅ |
| `numOfObservation=0` | 全量 + `summary:「提取范围较大，已返回部分数据」` | ❌ 非法值未校验 |
| `numOfObservation=-1` | 与 0 **完全相同**的 1623 字节 | ❌ 未校验 |
| `numOfObservation=10000` | 与 0 / -1 **完全相同**的 1623 字节 | ❌ 未校验 |
| `numOfObservation=24`（月频） | 返回 **23** 期 | ⚠️ 差一 |
| `startDate > endDate` | 正常返回默认 10 期 | ❌ 无校验（因区间本就不生效） |
| 日期格式 `20260101` | 正常返回默认 10 期 | ❌ 无格式校验 |
| 10 个代码同查 | 正常返回 2.1 KB | ✅ |

---

## 四、`economic_query_indicator_series`

**签名**：`question*`、`startDate`、`endDate`、`observation`、`targetMagnitude`(24 值枚举)、`targetCurrency`、`targetFrequency`(8 值枚举)

### 描述核对

| 描述断言 | 实测 | 结论 |
|---|---|---|
| 「可对数量级、频率和币种进行转换与对齐」 | 三个 target 同传 → `magnitude` 变「万亿」，转换生效 | ✅ |
| 「探索发现用本工具，正式取数走 search → get」 | 但 get 版区间坏了，实际**区间取数只能用本工具** | ⚠️ 边界描述与现实相反 |
| `startDate`/`endDate` 生效 | 传 `2026-01-01 ~ 2026-06-30` → 正确返回 2 期 | ✅ |

### 入参与边界

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `question` | 「缺少必填参数: question」 | ✅ |
| `targetMagnitude="兆"`（非枚举） | 「targetMagnitude枚举值不正确」 | ✅ |
| `targetFrequency="每小时"`（非枚举） | 「targetFrequency枚举值不正确」 | ✅ |
| `targetCurrency="XXX"` | 「targetCurrency不是合法的ISO 4217币种代码」 | ✅ |
| 三个 target 同传 | 正常，转换全部生效 | ✅ |
| `observation` + `startDate/endDate` 同传 | 正常返回（`observation` 优先） | ⚠️ 描述说互斥但不报错 |
| 传错名 `numOfObservation` | 「**observation或者[beginDate、endDate]必须填一个**」 | ❌ 错误文案里的 `beginDate` 不存在，本工具是 `startDate` |

**枚举校验是全 4 个 server 里最严的**——三个 target 参数全部有明确的枚举/格式报错。

---

## 五、工具协同

| 链路 | 传递字段 | 结果 |
|---|---|---|
| `economic_search_indicator` → `economic_get_indicator_series` | `metrics[].code` → `metricCodes` | ✅ 传 `M0000612` → 回显 `M0000612` |

字段名可直接搬运，无需转换。**但注意**：search 返回的是 `code`（单个），get 要的是 `metricCodes`（逗号分隔串）；多个候选需自行 `join(',')`，描述已说明。

---

## 六、汇总

| 维度 | 通过率 |
|---|---|
| 正常调用 | **15/15 = 100%** |
| 边界用例（行为合理） | 11/13 |
| 故意错误（被正确拦截） | 6/16 |

### 问题清单

| P | 工具 | 问题 |
|---|---|---|
| **P0** | `economic_get_indicator_series` | `startDate`/`endDate` 完全不生效，任何区间都返回默认窗口。这是标称的"标准取数工具" |
| **P1** | `economic_get_indicator_series` | 默认窗口是「近 10 期」不是描述的「近 2 年」（月频只给 9 期） |
| **P1** | `economic_get_indicator_series` | 互斥优先级与描述相反：实际 `numOfObservation` 优先 |
| **P1** | 两个工具 | 同义参数两个名字（`numOfObservation` / `observation`），传错静默忽略 |
| **P1** | `economic_get_indicator_series` | 代码不存在 / 大小写错误一律返回「服务异常」，无法定位原因 |
| P2 | `economic_get_indicator_series` | `numOfObservation` 的 0 / 负数 / 超大值均不校验，行为一致（全量） |
| P2 | `economic_query_indicator_series` | 错误文案引用不存在的参数名 `beginDate` |
| P3 | `economic_get_indicator_series` | `numOfObservation=24` 返回 23 期，差一 |

### 结论

**三个工具的正常调用零错误、枚举校验规范、链式协同顺畅**，问题集中在 `economic_get_indicator_series` 一个工具上：它的区间参数是死的，默认窗口与描述不符，错误文案无法定位问题。在修复前，**任何需要指定时间区间的 EDB 取数都应改用 `economic_query_indicator_series`**，或用 `numOfObservation` 倒推期数。
