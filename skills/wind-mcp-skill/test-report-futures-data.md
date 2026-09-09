# vserver_futures_data 逐工具测试报告

测试日期 **2026-09-07**　endpoint `https://mcp.wind.com.cn/vserver_futures_data/mcp/`　工具 **7 个**（09-05 时 9 个）

用例 **86 条**：正常调用 35（每工具 ×5）、边界 35、故意错误 16，另加链式协同 1 组与隐藏参数专项探测。

## 〇、工具集变动

| 变动 | 工具 |
|---|---|
| 下线 | `futures_get_warehouse_receipt_details`、`futures_get_related_securities`、`futures_get_research_opinion_stat` |
| 新增 | `futures_get_research_opinion` |

## 一、正常调用错误率

| 工具 | 通过 | 平均耗时 | 返回体积 |
|---|---|---|---|
| `futures_get_warehouse_receipt` | **5/5** | 4031 ms | 416 B |
| `futures_get_contract_spec` | **5/5** | 3537 ms | 1.4 KB |
| `futures_get_basis` | **5/5** | 2869 ms | 1.5 KB |
| `futures_get_fund_flow` | **5/5** | 2931 ms | 814 B |
| `futures_get_position_ranking` | **5/5** | 1405 ms | 598 B |
| `futures_get_research_opinion` | **5/5** | 2860 ms | 2.9 KB |
| `futures_get_supply_demand` | **5/5** | 3308 ms | 18 KB |
| **合计** | **35/35 = 100%** | 2992 ms | — |

零错误、零抖动。09-05 记录的「`futures_get_contract_spec` 偶发『未识别到有效的金融标的』」本轮 5/5 未复现。

---

## 二、❌ P0：三个工具的 `type` 参数从 schema 消失，描述承诺的能力调不出来

这是本 server 最严重的问题：**描述里写的能力，schema 里没有对应入参，后端却仍然支持**。

### `futures_get_position_ranking`（影响最大）

> 【功能】按品种和交易日查询交易所公开席位的**九类**排名，涵盖持仓、增减仓和成交量排名。
> 【适用场景】查看**多头或空头**席位；查看**净多或净空**排名；查看**增仓或减仓**排名；查看**成交量**席位排名。

schema 只有 `windCode` / `date` / `limit`——**没有任何选择排名类型的参数**。实测后端仍接受未声明的 `type`：

| 入参 | `queryContext.typeName` |
|---|---|
| 不传 `type` | **多头持仓排名**（默认 type=1） |
| `type: 2` | 空头持仓排名 |
| `type: 9` | **成交量排名** |

`type` 至少支持到 9，正好对应描述里的"九类"。**只按 schema 调用，九类里只能拿到多头持仓一类，而调用方无从知晓。**

### `futures_get_supply_demand`

> 【功能】按期货品种和**基本面类型**查询…　【适用场景】供需平衡表 / 供应或产量 / 需求或消费 / 库存或仓单

schema 无类型参数。后端接受 `type` 并**正式校验**：

| type | queryContext.type | 指标数（CU.SHF, 2026-08-01~09-03） |
|---|---|---|
| 不传 / 0 | 全部 | 全量（10.2 KB） |
| 1 | 供需平衡 | 13 |
| 2 | 供应分析 | 4 |
| 3 | 需求分析 | 4 |
| 4 | 库存分析 | 5 |
| 5 | ❌ `type 必须为 0、1、2、3、4` | — |

后端能报出「必须为 0、1、2、3、4」，说明这是被正式校验的参数，只是没写进 schema。不传时是"全部"，影响小于 position_ranking。

### `futures_get_warehouse_receipt`

> 【功能】按**业务类型**、期货品种代码及日期查询…

schema 只有 `windCodes` + `date`。后端接受 `type`，且**返回信封随之改变**：

| 入参 | 返回信封 | datatype |
|---|---|---|
| `{type:"receipt", windCodes:[…], date}` | 裸数组 `[{fields,rows}]`（356 B） | 仅仓单 |
| `{windCodes:["CU.SHF","AL.SHF"], date}` | `{"data":{"code":200,"message":"success","data":[…]},"error":null}` | 仓单 + 仓单明细 |
| `{}`（不传 windCodes） | 同上带信封（6.5 KB） | 交割量 |

---

## 三、逐工具明细

### 3.1 `futures_get_position_ranking`　`windCode*` / `date` / `limit(default 20)`

**参数校验是 7 个工具里最完善的**：

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `windCode` | 「缺少必填参数: windCode」 | ✅ |
| `limit=1` | 1 条 | ✅ |
| `limit=100` | 100 条（17 KB） | ✅ |
| `limit=101` | 「参数错误: limit值无效，允许范围为 1~100 的整数」 | ✅ 报错精准 |
| `limit=-5` | 同上 | ✅ |
| `limit=0` | **静默回退到 20** | ⚠️ 0 未被 1~100 校验拦住 |
| 中文名「沪铜」 | 「参数错误: windCode格式有误，品种代码需使用Wind标准代码，如 CU.SHF」 | ✅ **与描述一致且给出正确示例，全 server 最佳报错** |
| 日期格式 `20260903` | 「参数错误: date格式有误，应为真实存在的YYYY-MM-DD日期」 | ✅ |
| 未来日期 `2030-01-01` | 「参数错误: date不能晚于当前日期」 | ✅ |
| 不传 `date` | 自动取 `2026-09-04`（最近交易日） | ✅ |
| 月合约 `CU2612.SHF` | 正常，`queryContext.windCode` 回显 `CU2612.SHF` | ✅ 与描述「月合约自动转主力」一致 |
| 周日 `2026-09-06` | **返回 tradeDate=2026-09-06 的数据** | ⚠️ 非交易日未回退（对比 `fund_flow` 会回退） |

### 3.2 `futures_get_basis`　`windCodes[]` / `sector` / `startDate` / `endDate`

**约束表达最规范的一个**，四类约束全部有明确报错：

| 用例 | 结果 | 评价 |
|---|---|---|
| `windCodes`/`sector` 都不传 | 「参数 'windCodes/sector' 的值无效。至少提供一个…建议: windCodes 和 sector 不能同时为空」 | ✅ |
| `windCodes: []` 空数组 | 同上 | ✅ |
| 只传 `startDate` | 「参数 'startDate/endDate' 的值无效。startDate 与 endDate 必须同时提供」 | ✅ 与描述一致 |
| `startDate > endDate` | 「无效的日期范围：起始日期 '2026-09-03' 晚于结束日期 '2026-08-01'」 | ✅ |
| `sector` 中文键「有色金属」 | 正常（1084 B） | ✅ 与描述的 enum_map 一致 |
| `sector` 英文值 `Non-ferrous metals` | 返回**完全相同**的 1084 B | ✅ 两种写法等价，与描述一致 |
| `sector: "all"` | 4988 B 全市场 | ✅ |
| `sector` 非法值 | `Invalid value '不存在的板块' for field 'sector'` | ✅ |
| `windCodes` 传 string `"CU.SHF"` | 「未识别到有效的金融标的:**C**」 | ❌ 字符串被当数组遍历，只取了首字符，报错信息误导 |

### 3.3 `futures_get_contract_spec`　`windCode*`

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `windCode` | 「缺少必填参数: windCode」 | ✅ |
| 中文名「沪铜」 | 正常 1393 B | ✅ 与描述一致 |
| 不存在品种 `ZZ.SHF` | 「未识别到有效的金融标的:ZZ.SHF」 | ✅ |
| 月合约 `CU2612.SHF` | 正常 1683 B | ✅ |
| 传股票代码 `600519.SH` | 「未知的交易所后缀：SH」，`isError=false` | ⚠️ 拦住了但走的是 softError 通道 |

### 3.4 `futures_get_fund_flow`　`date*` / `windCode`

**非交易日处理是 7 个工具里最好的**——返回体自带 `requestTradeDate` / `resolvedTradeDate` 两个字段：

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `date` | 「缺少必填参数: date」 | ✅ |
| 周日 `2026-09-06` | `requestTradeDate=2026-09-06`、**`resolvedTradeDate=2026-09-04`** | ✅ 回退透明可见 |
| `windCode: "all"` | `fundFlowQueryMode: "market"`，5929 B | ✅ |
| 不传 `windCode` | 与 `all` **完全相同** | ✅ 描述未说明默认值，但行为合理 |
| 中文名「沪铜」 | 正常 | ✅ |

### 3.5 `futures_get_supply_demand`　`windCode*` / `startDate` / `endDate` / `includeHistory(default true)`

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `windCode` | 「缺少必填参数: windCode」 | ✅ |
| `includeHistory=false` | 7560 B，`queryContext.includeHistory=false` | ✅ |
| `includeHistory="false"`（字符串） | 被正确解析为 `false`，返回**完全相同** | ⚠️ 类型宽松但结果正确 |
| 中文名「螺纹钢」 | 自动转 `RB.SHF` 并回显 | ✅ |
| 月合约 `RB2610.SHF` | 正常，回显原合约码 | ✅ 与描述一致 |

### 3.6 `futures_get_research_opinion`（新增）　`windCode*` / `date`

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `windCode` | 「缺少必填参数: windCode」 | ✅ |
| 中文名「沪铜」 | 正常 2789 B | ✅ |
| 历史日期 `2026-08-01` | 返回 `date: 2026-07-31` 的观点（6 看多 1 看空） | ✅ 自动回退到有数据的日期 |
| 未来日期 `2030-01-01` | **「服务暂时不可用，请稍后重试」** | ❌ 应报"日期越界"，文案掩盖真因 |
| 月合约 `CU2710.SHF` | **「未识别到有效的金融标的:CU2710.SHF」** | ❌ 描述明写「合约代码（如 **CU2710.SHF**）可直传，后端自动转主力合约」——**描述举的例子本身跑不通** |

【返回】断言「核心摘要和方向属于研报聚合内容，不是工具自行分析」——实测 `opinions[]` 逐篇带 `company_name` / `direction` / `long_summary`，来源可追溯 ✅

### 3.7 `futures_get_warehouse_receipt`　`windCodes[]` / `date`

| 用例 | 结果 | 评价 |
|---|---|---|
| 不传任何参数 | 全市场交割量，6465 B | ✅ 与描述「支持全市场」一致 |
| 中文名 `["沪铜"]` | 正常 | ✅ |
| 周日 `2026-09-06` | 返回 `datatype: 仓单明细`，2473 B | ⚠️ datatype 组合随日期变，描述未说明 |
| 月合约 `["CU2701.SHF"]` | **正常返回 2863 B** | ❌ 描述说「不支持月合约代码（如 **CU2701.SHF**）」——描述过严，举的例子实际可用 |
| `windCodes` 传 string | 「未识别到有效的金融标的:C」 | ❌ 同 3.2，只取首字符 |

---

## 四、返回信封在 server 内部不统一

| 工具 | 顶层结构 |
|---|---|
| `futures_get_basis` | 裸对象 `{fields, rows, queryDataNote, Wind代码, 品种名称}` |
| `futures_get_contract_spec` | 裸数组 `[{fields, rows}]` |
| `futures_get_fund_flow` | 裸数组 `[{requestTradeDate, resolvedTradeDate, …}]` |
| `futures_get_position_ranking` | 裸数组 `[{queryContext, fields, rows}]` |
| `futures_get_supply_demand` | 裸数组 `[{queryContext, fundamentals}]` |
| `futures_get_research_opinion` | 裸对象 `{date, windCode, secName, summary, opinions}` |
| `futures_get_warehouse_receipt` | **`{data:{code:200, message:"success", data:[…]}, error:null}`** |

最后一个泄漏了 HTTP 式内部包装。

---

## 五、工具协同

| 链路 | 传递字段 | 结果 |
|---|---|---|
| `futures_get_contract_spec` → `futures_get_position_ranking` | `rows[standardContractCode]` → `windCode` | ✅ 传 `CU.SHF` → `queryContext` 正确回显 |

`contract_spec` 的输出是 `fields`/`rows` 结构，需要先按 `fields[].field` 定位列下标再取值，不能直接按名取——比其它 server 的 `{key: value}` 结构多一步。

---

## 六、汇总

| 维度 | 通过率 |
|---|---|
| 正常调用 | **35/35 = 100%** |
| 边界用例（行为合理） | 27/35 |
| 故意错误（被正确拦截） | 3/16 → 但多数"未拦截"是**合理的宽松**（中文名、月合约、字符串布尔），真正的问题见下表 |

### 问题清单

| P | 工具 | 问题 |
|---|---|---|
| **P0** | `position_ranking` / `supply_demand` / `warehouse_receipt` | `type` 参数从 schema 消失，描述承诺的「九类排名」「基本面类型」「业务类型」无入参可达；`position_ranking` 不传 type 时静默只给多头 |
| **P1** | `research_opinion` | 描述举例 `CU2710.SHF` 可直传，实测「未识别到有效的金融标的」 |
| **P1** | `warehouse_receipt` | 描述说不支持月合约 `CU2701.SHF`，实测可用（描述过严） |
| **P1** | `basis` / `warehouse_receipt` | `windCodes` 传 string 时被当数组遍历，报「未识别到有效的金融标的:C」（首字符），错误信息误导 |
| **P1** | `warehouse_receipt` | 返回信封 `{code:200, message:"success"}` 泄漏 HTTP 式内部包装；且信封随 `type` 变化 |
| P2 | `research_opinion` | 未来日期返回「服务暂时不可用」，掩盖真实原因 |
| P2 | `position_ranking` | `limit=0` 静默回退 20，未被 1~100 校验拦住 |
| P2 | `position_ranking` | 周日返回该日数据而不回退（`fund_flow` 会回退并透出 `resolvedTradeDate`） |
| P3 | 全部 7 个 | 顶层返回结构 4 种形态，建议收敛 |

### 结论

**7 个工具正常调用零错误，`position_ranking` 和 `basis` 的参数校验质量是四个 server 里最高的**——报错文案精准、给正确示例、约束（至少一个 / 必须成对 / 范围）全部落到 schema 之外的运行时校验里。

主要问题是 schema 与描述、schema 与后端的双重脱节：`type` 参数被删掉了，但描述和后端都还在用它。这让「九类排名」变成一句无法兑现的承诺。
