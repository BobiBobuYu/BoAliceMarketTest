# Wind MCP 7 个 Server：连接与测试方法

给其他 Agent 用的即用型资料。配套两个文件（同目录）：

| 文件 | 用途 |
|---|---|
| [`mcp-servers.json`](mcp-servers.json) | 机器可读注册表：7 个 endpoint + 132 个工具的入参签名 + **132 个实测通过的样例入参** + 已知故障标注 |
| [`mcp-probe.mjs`](mcp-probe.mjs) | 可执行 CLI：连通性检查 / 列工具 / 取 schema / 调用 / 冒烟测试 / 与注册表比对 |

最后验证：**2026-09-07**，7 个 server 全量重跑 + 描述正确性复核。线上 **124 个工具**（09-05 为 132，options 掉 6 个、futures 掉 3 增 1），全量冒烟 **121/124 通过**。

> ⚠️ `mcp-servers.json` 注册表停留在 09-05 的 132 工具口径，工具增删与部分参数改名尚未同步。用 `mcp-probe.mjs diff <server>` 核对，或直接以 `tools/list` 为准。

## 七个 Server

| 简称 | 完整名 | endpoint | 工具 | 参数 |
|---|---|---|---|---|
| `finance` | `vserver_finance_data` | `https://mcp.wind.com.cn/vserver_finance_data/mcp/` | 13 | 32 |
| `stock` | `vserver_stock_research` | `https://mcp.wind.com.cn/vserver_stock_research/mcp/` | 15 | 18 |
| `fund` | `vserver_fund_research` | `https://mcp.wind.com.cn/vserver_fund_research/mcp/` | 21 | 76 |
| `edb` | `vserver_edb_data` | `https://mcp.wind.com.cn/vserver_edb_data/mcp/` | 3 | 12 |
| `futures` | `vserver_futures_data` | `https://mcp.wind.com.cn/vserver_futures_data/mcp/` | **7** | — |
| `options` | `vserver_options_data` | `https://mcp.wind.com.cn/vserver_options_data/mcp/` | **11** | — |
| `company` | `vserver_company_data` | `https://mcp.wind.com.cn/vserver_company_data/mcp/` | 54 | 127 |

合计 **124 工具**（2026-09-07 实测）。

## 连接方式

MCP Streamable HTTP —— JSON-RPC 2.0 over POST，**无 WebSocket、无 session id**（服务端 stateless）。

```
POST https://mcp.wind.com.cn/<serverName>/mcp/
Authorization: Bearer <WIND_API_KEY>
Accept: application/json, text/event-stream
Content-Type: application/json
```

**每次请求前必须先 `initialize`**，再发 `tools/list` 或 `tools/call`：

```jsonc
// 1. 握手
{"jsonrpc":"2.0","id":1757000000000,"method":"initialize",
 "params":{"protocolVersion":"2025-03-26","capabilities":{},
           "clientInfo":{"name":"your-agent","version":"1.0.0"}}}

// 2. 列工具
{"jsonrpc":"2.0","id":1757000000001,"method":"tools/list","params":{}}

// 3. 调用
{"jsonrpc":"2.0","id":1757000000002,"method":"tools/call",
 "params":{"name":"stock_get_company_profile","arguments":{"windCode":"600519.SH"}}}
```

**API Key 查找顺序**：`~/.wind-aifinmarket/config` 的 `WIND_API_KEY` → `<skillDir>/config.json` 的 `wind_api_key` → 环境变量 `WIND_API_KEY`。

## 八个必须知道的坑

### 1. `jsonrpc.id` 必须是整数

传浮点数（如 `Date.now() + Math.random()`）服务端会返回**空响应体**，表现为解析失败。用 `Math.floor(...)`。

### 2. 响应可能是 SSE 也可能是纯 JSON

正常走 SSE（取最后一条 `data: ` 行做 `JSON.parse`），部分错误场景直接返回纯 JSON。两种都要兼容：

```js
function parseBody(text){
  const t = text.trim();
  if (t.startsWith('{')) { try { return JSON.parse(t); } catch {} }
  let last = null;
  for (const line of text.split(/\r?\n/)) if (line.startsWith('data: ')) last = line.slice(6);
  if (last) return JSON.parse(last);
  throw new Error('无法解析响应');
}
```

### 3. 业务错误几乎都是 `isError=false` 的纯文本

七个 server 普遍如此。「服务暂时不可用，请稍后重试」「未识别到有效的金融标的」「timeFrom不能大于timeTo」「没有搜索到指标」「文档详情数据为空」全部 `isError=false`。**不能只看协议层**，需要额外判断：

```js
const suspect = !r.isError && text.length < 200 &&
  /不可用|错误|失败|不正确|无效|未识别|不支持|非法|Invalid|请填写|须/.test(text);
```

### 4. 未知入参字段被静默忽略，不报错

字段名写错时不会失败，而是**返回默认范围的数据**。2026-09-07 实测仍在复现：

| Server | 现象 |
|---|---|
| company_data | 5 个工具 schema 声明 `timeFrom`/`timeTo`，后端只认 `startDate`/`endDate`。按 schema 调用静默拿到近 5 年全量（判据：参数生效时返回标题会回显 `（主体；2026-01-01~2026-03-31）`，被吞时没有括号） |
| edb_data | `economic_get_indicator_series` 的期数参数已从 `observation` 改名 `numOfObservation`；传旧名静默返回默认区间 |

**反方向更危险**：futures_data 有 3 个工具的 `type` 已从 schema 消失，后端却仍在正式支持——描述里承诺的能力按 schema 根本调不出来：

| 工具 | 不传 `type` 的后果 | 可用取值 |
|---|---|---|
| `futures_get_position_ranking` | **只返回多头持仓排名**（描述承诺九类） | 1=多头持仓、2=空头持仓… |
| `futures_get_supply_demand` | 返回"全部" | 0=全部、1=供需平衡、2=供应、3=需求、4=库存 |
| `futures_get_warehouse_receipt` | 返回带 `{code,message}` 信封的仓单+仓单明细 | `"receipt"`=裸数组仅仓单 |

**调用后必须核对返回内容里是否回显了你传的参数。**

### 5. `tools/list` 会变，不要缓存

本次审计期间实测到的变动（数小时内）：

| Server | 09-04/09-05 期间的变动 | 09-07 新增变动 |
|---|---|---|
| company_data | 日期字段 `timeFrom`↔`startDate` 改了 **4 轮**，其中一轮 schema 与后端错位 | **第 5 轮**：5 个工具回滚成 `timeFrom`，后端仍只认 `startDate` |
| edb_data | 工具前缀 `macro_*` → `economic_*`（3 个工具全改名） | `get_*` 的 `observation` → `numOfObservation`（`query_*` 未跟改） |
| finance_data | `quote_get_historical_dataseries` → `quote_get_historical_data_series`；`general_get_indicatordata` → `general_get_indicator_data` | 无 |
| fund_research | 掉了 3 个工具；`fund_screener` 的 `question` 改成 `query` | 7 个工具掉了 `includeMetadata`；`fund_get_size` 掉了 `includeFields`/`reportDate`；`fund_get_return_attribution` 掉了 `marketStyle`/`includeComponents`（均静默忽略） |
| options_data | 4 个工具改名，移除 `subCode` | **17 → 11**，下线 `calc_accumulator`/`calc_single_shark_fin`/`calc_hv_cone` 等 6 个 |
| futures_data | 3 个工具改名，`commodity_*` 前缀并入 `futures_*` | **9 → 7**，下线 `warehouse_receipt_details`/`related_securities`/`research_opinion_stat`，新增 `research_opinion` |

**每次会话开始前先 `tools/list`，或用 `mcp-probe.mjs diff <server>` 与注册表比对。**

### 6. schema 里的 `default` 可能是假的，省略即失败

`options_data` 全部 19 处日期类 `default` 后端都不应用，且 9/11 个工具省略这些「非必填」参数会直接失败：

```
options_get_variety_stats {"windCodes":["510050.SH"],"indicator":"hv"}   → 服务暂时不可用（3/3）
                          + startDate/endDate                            → 正常（2/2）
options_calc_vanilla      省 valuationDate/expirationDate                → 估值日期不能为空；到期日期不能为空
options_calc_binary       同上                                            → 参数处理失败：NullPointerException
```

`fund_get_return_attribution.benchmarkWindCode`（有 default 但省略即报「缺少必填参数」）、`fund_get_style_analysis.cycle`（default 声明 `monthly`，实际走 `quarterly`）同类。

**把带 `default` 的日期参数一律当必填传。**

### 7.「服务暂时不可用，请稍后重试」不代表重试有用

实测该文案至少掩盖三类原因：

| 真实原因 | 例 |
|---|---|
| 缺必填参数 | options 7 个工具省略日期参数 |
| 数据量过大 | `company_get_news_sentiment` 对万科/比亚迪不传区间必失败；传窄区间即正常 |
| 后端瞬时抖动 | `fund_screener`、`options_get_variety_stats`，原样重试即恢复 |

先检查参数完整性、再缩小查询范围，最后才考虑重试。

### 8. 写死的绝对日期 default 会过期

`options_data` 的 19 处 default 是 `2026-09-01` / `2026-06-01` / `2026-08-01` 这类字面量，`options_calc_vanilla.expirationDate` 的 `2026-09-01` 已早于当前日期。`stock_get_company_finance_analysis.reportPeriod` 的 `"FY2025"` 同理。**不要把 schema 里的日期 default 当成"最新"。**

## CLI 用法

```bash
node mcp-probe.mjs list-servers                      # 7 个 server 连通性 + 工具数
node mcp-probe.mjs list-tools stock                  # 列工具与入参签名
node mcp-probe.mjs schema fund fund_get_nav          # 单个工具完整 inputSchema
node mcp-probe.mjs call edb economic_search_indicator '{"question":"中国GDP"}'
node mcp-probe.mjs smoke                             # 全量冒烟（用注册表里的实测样例）
node mcp-probe.mjs smoke futures                     # 只测一个 server
node mcp-probe.mjs diff company                      # 线上 schema vs 注册表
```

也可作为模块引入：

```js
import { listTools, callTool } from './mcp-probe.mjs';
const r = await callTool('stock', 'stock_get_company_profile', { windCode: '600519.SH' });
// r = { isError, suspectError, len, text }
```

## 样例入参

`mcp-servers.json` 里每个工具都带 `verifiedSampleArgs`。2026-09-07 用这些样例重跑 6 个 server 共 69 个工具，**67 个通过**；但注册表仍是 09-05 口径，已知失效项：

| 失效样例 | 现状 |
|---|---|
| `futures_get_warehouse_receipt` 的 `type:"receipt"` | 参数已从 schema 移除（后端仍生效但改变返回信封） |
| `economic_get_indicator_series` 的 `observation` | 已改名 `numOfObservation`，旧名被静默忽略 |
| company 5 个工具的 `startDate` | schema 已回滚为 `timeFrom`，但**仍应传 `startDate`** |
| `stock_screener` 的示例问句 | 「连续5日上涨」实测无命中，改「连续3日」正常 |
| futures/options 的 9 个已下线工具 | 注册表里仍在 |

直接取用即可，例如：

```jsonc
"stock_get_company_finance_analysis": {"windCode":"600519.SH","reportPeriod":"FY2025"}
"fund_get_equity_holdings":           {"windCode":"510300.OF","reportDate":"2026-06-30"}
"futures_get_position_ranking":       {"type":1,"windCode":"CU.SHF","date":"2026-09-03","limit":5}
"options_calc_vanilla":               {"assetClass":"equity","spotPrice":3.0,"optionType":"call","strikePrice":3.0,
                                       "expirationDate":"2026-12-23","valuationDate":"2026-09-03",
                                       "volatility":0.20,"riskFreeRate":0.02,"dividendYield":0.01}
"company_get_judgments":              {"companyKey":"恒大地产集团有限公司"}
```

**链式依赖**（上游工具的返回值喂给下游）：

| 上游 → 下游 | 传递字段 |
|---|---|
| `general_search_documents` → `general_get_document` | 「文档编号」→ `documentId`。`documentType` 两端**都传英文** `news`/`na`/`rpp`（上游的字段描述写「可选值: 新闻、公告、研报」是错的，enum 才是准的）。documentId 有时效性，必须现取现用 |
| `general_search_datasets` → `general_get_dataset` | `id` → `reportId`，`exampleCondition` → `condition` |
| `general_search_indicators` → `general_get_indicator_data` | 「指标代码」→ `indicatorCode` |
| `economic_search_indicator` → `economic_get_indicator_series` | `code` → `metricCodes` |
| `options_get_listed_terms` → `options_get_term_metrics` | `optionVarietyCode` + `expiryDate` |
| `options_get_term_metrics` → `options_get_contract_series` | `optionContractCode[]` → `optionContractCodes` |
| `stock_get_market_narratives` → `stock_get_narrative_details` | 「子叙事ID」→ `childId` |
| `company_search_entity` → 其余 52 个 | 「企业名称」或「统一社会信用代码」→ `companyKey` |

## 已知故障（2026-09-07 复测）

| 工具 | 状态 |
|---|---|
| ~~`options_calc_accumulator`~~、~~`options_calc_single_shark_fin`~~ | 已从 `tools/list` 下线（此前的「持续不可用」很可能就是坑 6 的缺参数被坑 7 的文案掩盖） |
| `quote_get_realtime_indicators` | ✅ **09-07 下午已恢复**（5/5 通过）。09-05 至 09-07 上午持续「服务暂时不可用」 |
| `quote_get_historical_data_series` | ❌ **09-07 下午退化**：`period` 完全失效（日K/周K/1分钟/10分钟返回相同的 1 分钟数据），`indexes` 丢弃 OPEN/HIGH/LOW。上午同参数还能正常返回日K×5列。**静默返回错误数据，不报错** |
| `general_search_documents` | ❌ **09-07 下午退化**：`windCode` 对 `documentType=news` 完全失效（返回 10 万条无关新闻），`na`/`rpp` 正常。上午还能正确过滤（473 条）。**静默返回错误数据** |
| `company_get_news_sentiment` | ❌ 不传时间区间时，对高舆情量主体（万科、比亚迪）稳定失败；**传窄区间即正常** |
| `options_get_variety_stats` | ⚠️ 偶发返回「有单位、无数据」的半成品（无标的键、无异常标记），原样重试即正常 |
| `general_get_document` | ⚠️ 需动态 `documentId`；另：**新闻类 `文档内容` 恒为空串**，只能靠 `原文链接` 自取；公告类无 `来源`，研报类 `原文链接` 为空 |
| `fund_get_selection_timing_analysis` | ⚠️ 仅部分基金有评价数据。被动指数/货币/未覆盖样本返回「Wind 数据源当前不可用，请稍后重试」——**误导文案，重试无用**。可用样本：`000001.OF`、`005827.OF` |
| `stock_get_company_valuation`、`futures_get_contract_spec`、`company_list_bidding` | ⚠️ 偶发瞬时「内部错误」/「未识别到有效的金融标的」，重试即恢复（`company_list_bidding` 09-07 冒烟时报「内部错误」，随后 2/2 正常返回 72 条）。**注意中间那个的文案会让人误以为是代码写错** |

## 字段约定速查

各 server 的字段一致性与**描述正确性**问题详见同目录的分册审计报告（[总览](mcp-field-consistency-audit.md)、[finance](finance-data-audit.md)、[stock](stock-research-audit.md)、[fund](fund-research-audit.md)、[edb](edb-data-audit.md)、[futures](futures-data-audit.md)、[options](options-data-audit.md)、[company](company-data-audit.md)）。调用时最常踩的：

- **证券代码**：单值 `windCode`(string)，多值 `windCodes`(array)。例外：`finance.quote_get_realtime_indicators` 的 `windCodes` 是**逗号分隔 string**；`edb.economic_get_indicator_series` 用 `metricCodes`(逗号分隔 string)；company_data 全部用 `companyKey`(企业名/统一社会信用代码，**不是证券代码**)
- **时间区间**：统一 `startDate`/`endDate`，格式 `YYYY-MM-DD`。例外：`finance.general_query_documents` 是 `YYYY-MM-DD HH:MM:SS`；`options.options_get_volatility_surface`/`options_get_iv_term_structure` 用 `time`（`YYYY-MM-DD HH:mm`）；`finance.quote_get_historical_data_series` 的区间嵌在 `params` 对象里且需先设 `rangeflag:2`
- **自然语言问句**：统一 `question`。例外：`fund_screener` 用 `query`
- **报告期**：fund 用 `reportDate`(`YYYY-MM-DD`)，stock 用 `reportPeriod`(`FY2025`/`Q1FY2026`)——同名不同格式
- **期数**：`edb.economic_get_indicator_series` 用 `numOfObservation`，`edb.economic_query_indicator_series` 用 `observation`——**同 server 内两个名字**
- **枚举取值**：company 的 `causeOfAction`/`role`/`tagCode` 走 `company_get_biz_enum(listType=2, categoryName=...)` 取权威字典（**注意描述里写的 `company_get_biz_num` 不存在**）；`causeOfAction` 内联 enum 的 `侵犯财产` 是非法值，正确值 `侵犯财产罪`。`company_list_patent.patentType`（`实用新型`/`外观设计`/`授权发明`/`发明申请`）、`.lawStatus`（`有效`）、`company_list_trademark.trademarkStatus`（`已注册`/`商标申请`）无字典可查，且合法值与返回列的显示值不一致
