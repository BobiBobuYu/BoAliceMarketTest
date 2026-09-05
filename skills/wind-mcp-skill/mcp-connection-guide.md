# Wind MCP 7 个 Server：连接与测试方法

给其他 Agent 用的即用型资料。配套两个文件（同目录）：

| 文件 | 用途 |
|---|---|
| [`mcp-servers.json`](mcp-servers.json) | 机器可读注册表：7 个 endpoint + 132 个工具的入参签名 + **132 个实测通过的样例入参** + 已知故障标注 |
| [`mcp-probe.mjs`](mcp-probe.mjs) | 可执行 CLI：连通性检查 / 列工具 / 取 schema / 调用 / 冒烟测试 / 与注册表比对 |

最后验证：2026-09-05，全量冒烟 **126/132 通过**。

## 七个 Server

| 简称 | 完整名 | endpoint | 工具 | 参数 |
|---|---|---|---|---|
| `finance` | `vserver_finance_data` | `https://mcp.wind.com.cn/vserver_finance_data/mcp/` | 13 | 32 |
| `stock` | `vserver_stock_research` | `https://mcp.wind.com.cn/vserver_stock_research/mcp/` | 15 | 18 |
| `fund` | `vserver_fund_research` | `https://mcp.wind.com.cn/vserver_fund_research/mcp/` | 21 | 76 |
| `edb` | `vserver_edb_data` | `https://mcp.wind.com.cn/vserver_edb_data/mcp/` | 3 | 12 |
| `futures` | `vserver_futures_data` | `https://mcp.wind.com.cn/vserver_futures_data/mcp/` | 9 | 26 |
| `options` | `vserver_options_data` | `https://mcp.wind.com.cn/vserver_options_data/mcp/` | 17 | 149 |
| `company` | `vserver_company_data` | `https://mcp.wind.com.cn/vserver_company_data/mcp/` | 54 | 127 |

合计 **132 工具 / 440 参数**。

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

## 五个必须知道的坑

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

字段名写错时不会失败，而是**返回默认范围的数据**。company_data 曾出现 schema 声明 `timeFrom`/`timeTo` 但后端只认 `startDate`/`endDate`，按 schema 调用会静默拿到近 5 年全量数据。**调用后建议核对返回内容里是否回显了你传的参数。**

### 5. `tools/list` 会变，不要缓存

本次审计期间实测到的变动（数小时内）：

| Server | 变动 |
|---|---|
| company_data | 日期字段 `timeFrom`↔`startDate` 改了 **4 轮**，其中一轮 schema 与后端错位 |
| edb_data | 工具前缀 `macro_*` → `economic_*`（3 个工具全改名） |
| finance_data | `quote_get_historical_dataseries` → `quote_get_historical_data_series`；`general_get_indicatordata` → `general_get_indicator_data` |
| fund_research | 掉了 3 个工具（`listed_technical_indicators`、`position_estimate`、`holders`）；`fund_screener` 的 `question` 改成 `query` |
| options_data | 4 个工具改名，移除 `subCode` |
| futures_data | 3 个工具改名，`commodity_*` 前缀并入 `futures_*` |

**每次会话开始前先 `tools/list`，或用 `mcp-probe.mjs diff <server>` 与注册表比对。**

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

`mcp-servers.json` 里每个工具都带 `verifiedSampleArgs`（132/132 覆盖），全部是本次审计中真实调用通过的。直接取用即可，例如：

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
| `general_search_documents` → `general_get_document` | 「文档编号」→ `documentId`（注意 `documentType` 上游用中文「新闻」、下游用英文 `news`） |
| `general_search_datasets` → `general_get_dataset` | `id` → `reportId`，`exampleCondition` → `condition` |
| `general_search_indicators` → `general_get_indicator_data` | 「指标代码」→ `indicatorCode` |
| `economic_search_indicator` → `economic_get_indicator_series` | `code` → `metricCodes` |
| `options_get_listed_terms` → `options_get_term_metrics` | `optionVarietyCode` + `expiryDate` |
| `options_get_term_metrics` → `options_get_contract_series` | `optionContractCode[]` → `optionContractCodes` |
| `stock_get_market_narratives` → `stock_get_narrative_details` | 「子叙事ID」→ `childId` |
| `company_search_entity` → 其余 52 个 | 「企业名称」或「统一社会信用代码」→ `companyKey` |

## 已知故障（2026-09-05）

| 工具 | 状态 |
|---|---|
| `options_calc_accumulator` | ❌ 持续不可用，13 次尝试 + 9 种参数变体全部返回「服务暂时不可用」 |
| `options_calc_single_shark_fin` | ❌ 持续不可用，12 次尝试全失败 |
| `quote_get_realtime_indicators` | ❌ 2026-09-05 不可用（09-04 曾正常） |
| `general_get_document` | ⚠️ 需动态 `documentId`，冒烟时用占位符会返回「文档详情数据为空」 |
| `fund_get_selection_timing_analysis` | ⚠️ 仅部分基金有评价数据。被动指数/货币/未覆盖样本返回「Wind 数据源当前不可用，请稍后重试」——**误导文案，重试无用**。可用样本：`000001.OF`、`005827.OF` |
| `stock_get_company_valuation`、`futures_get_contract_spec` | ⚠️ 偶发瞬时「内部错误」/「未识别到有效的金融标的」，重试即恢复。**注意后者的文案会让人误以为是代码写错** |

## 字段约定速查

各 server 的字段一致性问题详见同目录的分册审计报告（[总览](mcp-field-consistency-audit.md)、[finance](finance-data-audit.md)、[stock](stock-research-audit.md)、[fund](fund-research-audit.md)、[edb](edb-data-audit.md)、[futures](futures-data-audit.md)、[options](options-data-audit.md)、[company](company-data-audit.md)）。调用时最常踩的：

- **证券代码**：单值 `windCode`(string)，多值 `windCodes`(array)。例外：`finance.quote_get_realtime_indicators` 的 `windCodes` 是**逗号分隔 string**；`edb.economic_get_indicator_series` 用 `metricCodes`(逗号分隔 string)；company_data 全部用 `companyKey`(企业名/统一社会信用代码，**不是证券代码**)
- **时间区间**：统一 `startDate`/`endDate`，格式 `YYYY-MM-DD`。例外：`finance.general_query_documents` 是 `YYYY-MM-DD HH:MM:SS`；`options.options_get_volatility_surface`/`options_get_iv_term_structure` 用 `time`（`YYYY-MM-DD HH:mm`）；`finance.quote_get_historical_data_series` 的区间嵌在 `params` 对象里且需先设 `rangeflag:2`
- **自然语言问句**：统一 `question`。例外：`fund_screener` 用 `query`
- **报告期**：fund 用 `reportDate`(`YYYY-MM-DD`)，stock 用 `reportPeriod`(`FY2025`/`Q1FY2026`)——同名不同格式
