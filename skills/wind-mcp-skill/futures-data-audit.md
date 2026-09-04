# vserver_futures_data 字段核对 + 全工具调用验证

实连 + 逐个调用，2026-09-04。**9 个工具全部调用成功**，26 个参数。

## 一、已修复 ✅（对比上一轮快照）

| 项 | 原状 | 现状 |
|---|---|---|
| 区间表达 | `futures_get_basis_data.date` 用**数组长度**区分单日/区间 | `futures_get_basis` 改用 **`startDate` + `endDate`** |
| 工具前缀 | 混入 `commodity_get_supply_demand` | `futures_get_supply_demand`，**9/9 全为 `futures_*`** |
| 工具名 | `futures_get_research_opinion_statistics` | `futures_get_research_opinion_stat` |
| `title` | — | **26/26 = 100%** |

`non-standard-time-range-params.md` 里标 P1 的「数组长度表示区间」已闭环。

## 二、调用验证 9/9 ✅

样本 `CU.SHF`（沪铜），日期 `2026-09-03`。

| 工具 | 入参 | 返回 |
|---|---|---|
| `futures_get_warehouse_receipt_details` | `windCode` + `date` | 2.3KB 仓单明细 |
| `futures_get_warehouse_receipt` | `type:"receipt"` + `windCodes[]` + `date` | 416B |
| `futures_get_related_securities` | `windCode` + `type:["upstream"]` | 517B 上游 A 股 |
| `futures_get_contract_spec` | `windCode` | 1.4KB 合约规格 |
| `futures_get_basis` | `windCodes[]` + `startDate`/`endDate` | 1.5KB 基差序列 |
| `futures_get_fund_flow` | `date` + `windCode` | 856B |
| `futures_get_position_ranking` | `type:1` + `windCode` + `date` + `limit:5` | 598B 多头持仓排名 |
| `futures_get_research_opinion_stat` | `windCode` + `date` | 7.7KB 研报观点聚合 |
| `futures_get_supply_demand` | `windCode` + `type:4` + `startDate`/`endDate` | 18.2KB 库存序列 |

## 三、问题项

### ① `related_securities.type` 的「严禁中文」是错的 ⚠️

描述用最强措辞写着：

> 【最高优先级铁律】type 必须传入英文枚举值，**严禁传中文**（如 `["上游"]`/`["中游"]`/`["下游"]`），**否则后端报错**。

实测中英文**完全等价，返回逐字相同**：

| 入参 | 长度 | 与英文结果 |
|---|---|---|
| `["upstream"]` / `["上游"]` | 517 / 517 | 全等 |
| `["midstream"]` / `["中游"]` | 880 / 880 | 全等 |
| `["downstream"]` / `["下游"]` | 2856 / 2856 | 全等 |

Agent 按描述会拒绝把用户的「上游」直接传入、额外做一次映射，属于无谓约束；更糟的是这条"铁律"给了错误的心智模型。

### ② 同 server 内中英文枚举 3 种策略

| 工具 | 字段 | 描述声明 | 实测 |
|---|---|---|---|
| `futures_get_warehouse_receipt` | `type` | 中英等价 | ✅ 符合 |
| `futures_get_basis` | `sector` | 中英等价 | ✅ 符合 |
| `futures_get_related_securities` | `type` | **严禁中文** | ❌ 中文可用（见 ①） |
| `futures_get_contract_spec` | `fields` | 双轨制：中文键/英文值/混合都收 | ✅ 符合（歧义词如「保证金」会被拒，描述已警示） |

四个工具三种说法，其中一种与实现不符。

### ③ `type` —— 一个名字 4 种语义 + 3 种类型

| 工具 | 类型 | 语义 |
|---|---|---|
| `futures_get_warehouse_receipt` | `string`* | `delivery` / `receipt`（交割/仓单） |
| `futures_get_related_securities` | `array` | `upstream` / `midstream` / `downstream`（产业链环节） |
| `futures_get_position_ranking` | `integer`* | 1-9（排名类型） |
| `futures_get_supply_demand` | `integer`* | 1-4（基本面类型） |

### ④ `windCode` 取值域按工具不一致

7 个工具用 `windCode`，但接受的形态各不相同：

| 工具 | 中文品种名 | 月合约代码 |
|---|---|---|
| `futures_get_position_ranking` | ❌ 明确不支持（实测报「windCode格式有误，品种代码需使用Wind标准代码」） | ✅ 自动转主力 |
| `futures_get_warehouse_receipt_details` | ✅ | 描述称**不支持**，实测 `CU2612.SHF` **可用**（描述过严） |
| `futures_get_research_opinion_stat` | ✅ | ✅ 自动转主力（返回里 windCode 变回 `CU.SHF`） |
| `futures_get_supply_demand` | ✅ | ✅ 支持 |
| `futures_get_contract_spec` / `futures_get_fund_flow` / `futures_get_related_securities` | ✅ | 未声明 |

`futures_get_fund_flow.windCode` 还额外接受 `all`（全市场），是全 132 工具里唯一把"全集"塞进代码字段的。

### ⑤ 单值 / 多值代码分裂

`windCode`（string，7 工具） vs `windCodes`（array，2 工具：`futures_get_warehouse_receipt`、`futures_get_basis`）。

### ⑥ 同 server 两套时间入参

| 形态 | 字段 | 工具 |
|---|---|---|
| 单日期 | `date` | `warehouse_receipt_details`、`warehouse_receipt`、`fund_flow`(必填)、`position_ranking`、`research_opinion_stat` |
| 区间 | `startDate` + `endDate` | `basis`、`supply_demand` |

`basis` 的描述写「与 endDate 必须成对提供：都不传取最新交易日快照」——成对约束未落在 schema。

### ⑦ 二选一约束未落 schema

`futures_get_basis` 描述写「windCodes 与 sector 至少提供一个」，但 schema 里两者都不是 `required`，也无 `anyOf`。与 `stock_research:stock_get_narrative_details` 同样的问题。

### ⑧ 间歇性瞬时错误，且错误文案误导 ⚠️

测试期间观察到 2 次瞬时失败，重试即恢复（同参数连测 3 轮全部正常）：

| 入参 | 瞬时返回 | 重测 |
|---|---|---|
| `type:["midstream"]` | `isError=true`「未识别到有效的金融标的」 | 880B 正常 ×3 |
| `type:["downstream"]` | 「内部错误」（4 字节） | 2856B 正常 ×3 |

「未识别到有效的金融标的」会让调用方以为是**代码写错**，从而去改 `windCode`，而实际是服务抖动。错误文案需区分"入参非法"与"后端不可用"。

## 四、已统一 ✅

| 项 | 现状 |
|---|---|
| `title` 覆盖 | 26/26 = 100% |
| 工具前缀 | `futures_*` 9/9 |
| 日期格式 | 全部 `YYYY-MM-DD` |
| 区间命名 | `startDate`/`endDate`（已从数组形态改造完成） |
| 大小写 | 全 camelCase |

## 五、建议

| P | 动作 |
|---|---|
| P0 | 删掉 `related_securities.type` 描述里的「严禁传中文…否则后端报错」，改为与实现一致的"中英等价" |
| P1 | 区分瞬时故障与入参错误的文案：后端不可用不应返回「未识别到有效的金融标的」 |
| P1 | `warehouse_receipt_details` 描述改为"支持月合约"（与实测一致），或后端确实拒绝 |
| P2 | `futures_get_position_ranking.windCode` 支持中文品种名，与其余 6 个工具对齐 |
| P2 | `type` 按语义拆名：`dataType` / `chainSegment` / `rankType` / `fundamentalType` |
| P2 | `basis` 的「成对提供」和「windCodes 与 sector 至少一个」写进 schema |
| P3 | `windCode` / `windCodes` 统一（或全部支持数组）；`fund_flow` 的 `all` 改用独立参数 |
