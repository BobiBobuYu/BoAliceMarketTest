# vserver_options_data 字段核对 + 全工具调用验证

实连 + 逐个调用，2026-09-04。17 个工具，149 个参数。**15/17 调用成功，2 个工具服务端不可用**。

## 一、调用验证 15/17

标的 `510050.SH`（上证50ETF期权），交易日 `2026-09-03`。

### 行情 / 分析类 9/9 ✅

| 工具 | 入参 | 返回 |
|---|---|---|
| `options_get_listed_terms` | `windCode` + `tradeDate` | 4 个期限，得 `510050OP.SH` / `2026-09-23` |
| `options_get_term_metrics` | `optionVarietyCode` + `tradeDate` + `expiryDate` + `underlyingPrice` | 10 个合约，得 `10010972.SH` |
| `options_get_contract_series` | `optionContractCodes[]` + `indicators[]` + 区间 | 623B 时序 |
| `options_get_variety_series` | `indicator:"pcr_volume"` + 区间 | 911B |
| `options_get_variety_stats` | `indicator:"hv"` + `windows:"20"` | 480B 分位统计 |
| `options_get_volatility_surface` | `windCode` + `time:"2026-09-03 14:30"` | 4.7KB 曲面 |
| `options_calc_iv_cone` | `windCode` + 区间 | 1.2KB 隐波锥 |
| `options_calc_hv_cone` | `windCode` + 区间 | 2.1KB 历波锥 |
| `options_get_iv_term_structure` | `windCode` + `moneyness:100.0` + `time` | 577B |
| `options_get_sentiment_data` | `windCode` + 区间 + `termCount` + `strikeCount` | 14.9KB |

### 定价计算类 5/7

同一组基准参数（`equity` / spot 3.0 / strike 3.0 / vol 0.20 / rf 0.02 / q 0.01 / 估值 2026-09-03 / 到期 2026-12-23）：

| 工具 | 结果 |
|---|---|
| `options_calc_vanilla` | ✅ npv 0.1366，delta 0.5315 |
| `options_calc_binary` | ✅ npv 48.6 |
| `options_calc_barrier` | ✅ npv 0.0199（up-and-out, mc） |
| `options_calc_asian` | ✅ npv 0.0765 |
| `options_calc_autocall_snowball` | ✅ npv 995323.98 |
| `options_calc_accumulator` | ❌ **服务暂时不可用** |
| `options_calc_single_shark_fin` | ❌ **服务暂时不可用** |

### ⚠️ 两个定价工具服务端不可用（非参数问题）

`options_calc_accumulator` 与 `options_calc_single_shark_fin` 共尝试 **13 次**，全部返回 `服务暂时不可用，请稍后重试`（其中一次为 `内部错误`）：

- 4 轮原参数重试（间隔 8s）
- 9 种参数变体：短期限（1 个月）、`payoffType:"fixed"`、`decumulator`、`observationFrequency:5`、`trackingFrequency:5`、`barrierDirection:"down"`、标的量级从 3.0 换到 100

参数全部合法且与成功的 5 个定价工具同源，**结论为这两个工具当前服务端不可用**，非入参问题。

**2026-09-04 收尾复测**：又各重试 3 次，仍全部返回「服务暂时不可用，请稍后重试」。累计 `options_calc_accumulator` 13 次、`options_calc_single_shark_fin` 12 次，无一成功。同批复测的其他历史失败项（futures_data 的 `midstream`/`downstream`、company_data 的两个 timeout）均已恢复正常，说明这两个工具是持续性故障而非环境问题。

## 二、已修复 ✅（对比上一轮快照）

| 项 | 原状 | 现状 |
|---|---|---|
| 工具名 | `options_volatility_surface` / `options_iv_cone_calculator` / `options_hv_cone_calculator` / `options_implied_volatility_term_structure` | `options_get_volatility_surface` / `options_calc_iv_cone` / `options_calc_hv_cone` / `options_get_iv_term_structure` |
| 冗余字段 | `options_calc_hv_cone.subCode`（"默认与 windCode 相同"） | 已移除 |
| `dividendYield` 小数口径 | 3 处漏写「小数形式」 | **7/7 全部补齐** |
| `title` | 10/150 缺失 | **149/149 = 100%** |
| `required`+`default` | `iv_cone.windCode` 带默认 `000300.SH`、`sentiment_data` 的 `termCount`/`strikeCount` | 已清理（新增 vanilla 2 处，见下） |

## 三、已统一 ✅

| 项 | 现状 |
|---|---|
| 定价公共参数 | `assetClass` / `spotPrice` / `expirationDate` / `valuationDate` / `volatility` / `riskFreeRate` / `dividendYield` / `dayCount` 各 7 处，命名、类型、口径完全一致 |
| `enum` 约束 | `assetClass` / `optionType` / `dayCount` / `pricingMethod` / `barrierDirection` / `barrierType` / `tenor` / `moneyness` / `deltaLevel` 均在 schema 声明 enum，是 7 个 server 里 enum 覆盖最完整的 |
| 区间命名 | `startDate` / `endDate` 6 处全合规 |
| 业务专用区间 | `averagingStartDate`/`averagingEndDate`、`barrierStartDate`/`barrierEndDate` —— `<语义前缀>StartDate/EndDate` 范式 |
| `title` | 149/149 = 100% |
| 大小写 | 全 camelCase |

## 四、问题项

### ① `nontional` 拼写错误仍未修 ❌

| 工具 | 字段 |
|---|---|
| `options_calc_single_shark_fin` | `notionalPrincipal` |
| `options_calc_autocall_snowball` | **`nontional`** |

同一 server、同一概念（名义本金）两个名字，其中一个还拼错了。

### ② 标识字段 4 套

| 字段 | 类型 | 工具数 |
|---|---|---|
| `windCode` | string | 6 |
| `windCodes` | array | 2（`variety_series` / `variety_stats`） |
| `optionVarietyCode` | string | 1（`term_metrics`） |
| `optionContractCodes` | array | 1（`contract_series`） |

标的 / 品种 / 合约三个层级各自命名，且单复数与类型不成体系。

### ③ 到期日两个名字

`expirationDate`（7 个定价工具） vs `expiryDate`（`options_get_term_metrics`）。同 server 同概念。

### ④ 时间入参 4 套并存

| 形态 | 字段 | 格式 |
|---|---|---|
| 区间 | `startDate` / `endDate` | `YYYY-MM-DD` |
| 交易日 | `tradeDate`（2 处） | `YYYY-MM-DD` |
| 时点 | **`time`**（2 处：`volatility_surface` / `iv_term_structure`） | `YYYY-MM-DD HH:mm` |
| 业务日 | `valuationDate` / `expirationDate` / `expiryDate` / `averaging*` / `barrier*` | `YYYY-MM-DD` |

`time` 名字过泛（实为"查询时点"），且是本 server 唯一带时分的格式。

### ⑤ `options_calc_vanilla` 新增 `required`+`default` 矛盾

`assetClass`（默认 `equity`）与 `optionType`（默认 `call`）标 `required` 却带默认值。其余 6 个定价工具的同名参数是纯 required 无默认——同族工具内部不一致，且默认 `call` 会让未指明方向的请求静默按看涨计算。

### ⑥ `indicators` / `indicator` 单复数同源不同义

| 字段 | 类型 | 工具 | 语义 |
|---|---|---|---|
| `indicators` | array | `term_metrics` / `contract_series` | 要返回的指标列表 |
| `indicator` | string | `variety_series` / `variety_stats` | 单选的指标**类型**（决定返回结构） |

### ⑦ `windows` 复数但只收单值

`variety_series` / `variety_stats` 的 `windows` 默认 `"20"`，实为单个计算窗口，应为 `window`。

### ⑧ 业务错误 `isError=false`

「服务暂时不可用，请稍后重试」「内部错误」均为纯文本 + `isError=false`，与其他 server 同样的问题——调用方无法在协议层判定失败。

## 五、建议

| P | 动作 |
|---|---|
| **P0** | 恢复 `options_calc_accumulator` / `options_calc_single_shark_fin` 服务 |
| **P0** | 修拼写 `nontional` → `notionalPrincipal`，与 `single_shark_fin` 对齐 |
| P1 | 业务错误改 `isError=true` 或结构化错误码 |
| P1 | 解开 `options_calc_vanilla` 的 `assetClass`/`optionType` required+default 矛盾（尤其 `optionType` 默认 `call` 有静默算错方向的风险） |
| P2 | `expiryDate` → `expirationDate` |
| P2 | `time` → `queryTime` 或 `tradeTime`，并在描述里强调带时分 |
| P3 | `windows` → `window`；`indicator` → `indicatorType` 以区别于 `indicators` |
| P3 | 标识字段收敛：`optionVarietyCode` / `optionContractCodes` 考虑并入 `windCode` / `windCodes` 体系 |

---

## 描述正确性复核（2026-09-07）

线上工具从 17 个减至 **11 个**（`options_calc_accumulator`、`options_calc_single_shark_fin`、`options_calc_hv_cone` 等已下线）。11 个全部实调。

### ① P0：19 处 schema `default` 是死值，且后端根本不应用

11 个工具的日期类参数全部标注了 `default`，值是**写死的绝对日期**：

| 工具.参数 | 声明的 default |
|---|---|
| `options_get_listed_terms.tradeDate` | `2026-09-01` |
| `options_get_term_metrics.tradeDate` / `.expiryDate` | `2026-06-01` / `2026-09-01` |
| `options_get_contract_series.startDate` / `.endDate` | `2026-06-01` / `2026-09-01` |
| `options_get_variety_series.startDate` / `.endDate` | `2026-06-01` / `2026-09-01` |
| `options_get_variety_stats.startDate` / `.endDate` | `2026-06-01` / `2026-09-01` |
| `options_calc_iv_cone.startDate` / `.endDate` | `2026-06-01` / `2026-09-01` |
| `options_get_sentiment_data.startDate` / `.endDate` | `2026-06-01` / `2026-09-01` |
| `options_calc_vanilla.expirationDate` / `.valuationDate` | `2026-09-01` / `2026-08-01` |
| `options_calc_binary.expirationDate` / `.valuationDate` | `2026-09-01` / `2026-08-01` |
| `options_get_volatility_surface.time` | `2026-09-01 10:00` |
| `options_get_iv_term_structure.time` | `2026-09-01 10:00` |

全部 `required=false`。但**省略它们时 9/11 个工具直接失败**：

| 工具 | 省略 default 参数后的实际结果 |
|---|---|
| `options_get_listed_terms` | ❌ 服务暂时不可用，请稍后重试 |
| `options_get_term_metrics` | ❌ 同上 |
| `options_get_contract_series` | ❌ 同上 |
| `options_get_variety_series` | ❌ 同上 |
| `options_get_variety_stats` | ❌ 同上（复现 3/3；补上日期后 2/2 正常） |
| `options_calc_iv_cone` | ❌ 同上 |
| `options_get_sentiment_data` | ❌ 同上 |
| `options_calc_vanilla` | ❌ `估值日期不能为空；到期日期不能为空` |
| `options_calc_binary` | ❌ **`参数处理失败：NullPointerException`**（Java 异常外泄） |
| `options_get_volatility_surface` | ✅ 正常（实际取当前时间，非声明的 `2026-09-01 10:00`） |
| `options_get_iv_term_structure` | ✅ 正常（同上，实测回显 `2026-09-07 11:07`） |

即便是能跑通的两个，实际取值也不是声明的 default。**结论：这 19 个 `default` 全部无效，应视作必填。**

另外 `options_calc_vanilla.expirationDate` 的 default `2026-09-01` 已早于当前日期（2026-09-07）——即使 default 生效，也会得到一份已到期的期权。

### ② 「服务暂时不可用」掩盖真实原因

上表中 7 个失败返回的是「服务暂时不可用，请稍后重试」，实际原因是**缺参数**。这个文案会诱导调用方无效重试（09-04 记录的 `options_calc_accumulator`「13 次尝试全失败」很可能是同一类问题被同一文案掩盖）。

### ③ `options_get_variety_stats` 偶发返回「有单位、无数据」的半成品

同一组合法参数，首次调用返回：

```json
{"indicator":"hv","windows":"20","startDate":"2026-01-01","endDate":"2026-09-03",
 "meta_info":{"unit":{"currentValue":"%","mean":"%",...}}}
```

——没有 `510050.SH` 这个标的键，没有任何统计值，也没有 `isError` 或异常标记。原样重试即返回完整结果（`currentValue/mean/max/min/median/percentile/quantiles` 齐全，2/2）。描述称「无有效样本时返回合法空结果或结构化异常」，但这里样本有效，属于静默失败。

### ④ 描述与实际一致的部分 ✅

`listed_terms` / `term_metrics` / `contract_series` / `variety_series` / `volatility_surface` / `iv_term_structure` / `calc_iv_cone` / `sentiment_data` / `calc_vanilla` / `calc_binary` 的【返回】字段清单与实际回包逐项吻合；`indicator`、`tenor`、`moneyness`、`deltaLevel` 四个枚举完整且准确；条件必填的表述（「当 indicator 为 vol_moneyness 时必填」）与后端行为一致。

### 建议

| P | 动作 |
|---|---|
| **P0** | 19 处 `default` 要么让后端真的应用，要么删掉 default 并把字段移入 `required` |
| **P0** | 绝对日期 default 改为相对表达（如「省略时取最近交易日」），否则每过一天就更失真 |
| **P1** | 缺参数应返回「缺少必填参数: X」，不要一律用「服务暂时不可用」 |
| **P1** | `options_calc_binary` 的 `NullPointerException` 不应透出给调用方 |
| P2 | `options_get_variety_stats` 的静默半成品返回需定位；空结果应带明确标记 |
