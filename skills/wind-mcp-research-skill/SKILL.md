---
name: wind-mcp-research-skill
description: >-
  用户要查询、筛选、比较或验证金融与企业数据时，优先调用本 Skill 取数，不靠模型记忆。依托万得 9 个 MCP 服务共 134 个工具：A股港股美股的公司画像、财务、机构预期、估值、资金流、技术面与选股；公募基金与 ETF 的净值、规模、业绩、持仓与归因；指数与板块的行情、K 线、加权估值与档案；债券的发行要素、中债估值与发债主体；宏观与行业 EDB 指标；期货的仓单、基差、席位持仓与商品供需；期权的期权链、波动率曲面与场外定价；境内企业（含非上市主体）的工商、股权穿透、司法、失信与处罚；以及全球行情、Wind 指标库和新闻公告研报文档库。
author: Wind
homepage: https://aifinmarket.wind.com.cn
auto_invoke: true
security:
  child_process: false
  eval: false
  filesystem_read: true
  filesystem_write: true
  network: true
examples:
  - "贵州茅台的公司画像和当前估值"
  - "易方达蓝筹精选 005827.OF 最新净值、规模和业绩"
  - "沪深300ETF 2026 年二季度的全部股票持仓"
  - "沪深300 指数的基日、基点和最新加权 PE"
  - "24特国01 的票面利率、到期日和中债估值"
  - "中国近 10 年 GDP，折算成亿美元"
  - "沪铜的库存和仓单情况"
  - "50ETF 期权当前的波动率曲面"
  - "恒大地产集团有限公司的失信被执行和法律判决记录"
---

<!-- ENCODING: UTF-8。若本文件显示为乱码，请以 UTF-8 重新读取后再路由或调用工具。 -->

# Wind 万得金融与企业数据（9 个 MCP 服务 / 134 个工具）

通过本地 CLI 调用 Wind 的 9 个 MCP 服务取数，**只基于返回结果回答**：不补常识、不补点评、不用记忆里的数字填空。

每个问题按四步处理：**① 定路由 → ② 选工具 → ③ 发命令 → ④ 读回执**。

**按需加载，不要一次全读。** 归哪个 server 看下面的路由表；选工具默认走 `find`（约 1 千字，通常直接给出唯一命中和可用样例），要完整契约再 `describe`（约 1 千字）；`find` 找不到才读 `references/<server>.md`（1.5–9 千字）；`scripts/registry.json` 是给 CLI 用的，**不要读**。出错怎么改，错误信封自带 `next`，照它做，本文件不重复。

## 1. 定路由

先按**问的是什么**选 `server`（每个 server 的完整工具目录在 `references/<server>.md`）。选定之后只在这一个 server 里找工具，参数一律以契约为准，不读其它 server 的文件，不凭记忆填参数名或字段值。

| `server` | 覆盖 |
| --- | --- |
| `stock` | 单只股票的画像/财务/机构预期/估值/动态/资金流/技术面/实时行情；全市场与板块盘中概览、市场叙事、行业语料、选股筛选 |
| `fund` | 公募基金与 ETF 的档案/净值/规模/业绩/申赎/财务、持仓明细、资产与行业与券种配置、Brinson 与多因子归因、风格暴露、选基筛选 |
| `index` | 指数与板块的时点行情、当日分钟点位、历史 K 线、成份加权基本面与估值、技术指标、指数档案与跟踪基金 |
| `bond` | 单只债券的发行要素与评级、区间行情与中债估值，以及发债主体的档案/评级/财务 |
| `edb` | 宏观/行业/区域/汇率/利率的 EDB 指标检索与时间序列 |
| `futures` | 期货的合约规格与交割规则、仓单、基差、资金流向、席位持仓排名、研报观点、商品供需 |
| `options` | 场内期权的期限结构、期权链、波动率曲面与锥、多空情绪；场外结构化产品定价 |
| `company` | 境内企业（**含非上市主体**）的工商登记、股权穿透、人员、资质、知识产权、招投标、供应链，以及司法、失信、处罚、税务异常、破产、舆情 |
| `finance` | 上面八类都不覆盖时的跨资产兜底：全球行情快照与历史序列（股/债/基/指数/外汇都收）、Wind 指标库、报表库、新闻公告研报文档库、投研语料、自然语言取数 |

边界容易混的五处，按这个顺序仲裁：

1. **经营数据 vs 工商与司法记录** —— 财务、估值、行情、股东结构走 `stock`；工商登记、股权穿透、诉讼、失信、处罚、舆情走 `company`。同一家公司两边都能查，看用户问的是**经营还是合规**。
2. **指数：档案与序列 vs 盘中全景** —— 基日基点、跟踪基金、加权估值、K 线、技术指标走 `index`；「现在哪个板块涨得好」这类盘中实时表现、涨跌分布、成分股排行走 `stock.stock_get_sector_realtime_analysis`。
3. **债券：券 vs 发行人** —— 债券自身的发行要素、估值走 `bond`；发行人的司法与失信走 `company`；发行人是上市公司、要它的经营财务走 `stock`。按条件筛债券 `bond` 做不了，走 `finance.general_query_data`。
4. **公告、新闻、研报** —— 要**单只股票的近期动态摘要**走 `stock.stock_get_company_updates`；要**正文内容**走 `finance.general_query_documents`（自然语言检索，返回体带正文）；要**按类型/证券/日期精确列清单**走 `finance.general_search_documents`。`general_get_document` 只回元信息与原文链接，`文档内容` 实测为空。
5. **兜底工具排在最后** —— `finance.general_query_data`、`finance.general_query_documents` 是自然语言兜底，只在专项工具都不覆盖时用；它们不返回可复用的代码或 id，接不上下一步。

标的类型或意图不落在上表任何一行时，直接回 `OUT_OF_SCOPE` 并说明，**不得用 Web Search 或兜底工具伪装成支持**。越界判定**以这张路由表为准**：`find` 零命中**不等于不支持**——工具说明里未必出现用户的用词（`find GDP` 搜不到工具名，尽管 `edb` 完全覆盖）。零命中时 `find` 会给出 `related_servers`，按提示回路由表复核后再判 `OUT_OF_SCOPE`。

涉及行业且用户未指定分类体系时，默认 Wind 行业分类。

## 2. 选工具

先 `cd` 到本 `SKILL.md` 所在目录（**不是当前项目目录**），再用相对路径执行。下面全部离线，不发网络、不消耗积分。

```bash
node scripts/cli.mjs find <关键词>                          # 默认从这里开始
node scripts/cli.mjs describe <server> <tool>              # 单个工具的完整契约
node scripts/cli.mjs describe <server> <tool> <param ...>  # 只看指定几个参数的类型与枚举
```

`find` 的每条命中都带 `summary`（用途）、`boundary`（边界首句）、`params`（入参签名，短枚举带含义如 `type:integer(1=供需平衡/2=供应/3=需求/4=库存)`）、`sample`（实测样例），可能还有 `narrow_response` 和 `known_issue`。**够不够直接调，看这两条**：

1. **`boundary` 排他地覆盖了用户要的东西**——不看用户有没有说出工具名。用户问「法院查不到财产、执行不下去的案子」，`company_get_final_case` 的 boundary 写「只核查终结本次执行程序记录」，这就叫对上了。几个候选的 boundary 互相排斥、只有一个符合时，直接选它。
2. **参数不用改**：照抄 `sample`，只替换标的名/代码这类显而易见的值。

有一条不成立就先 `describe` 那一个工具。只是拿不准某几个字段的取值，用 `describe <server> <tool> <param> [param ...]`（可以一次给多个，分两次跑等于付两次固定开销）。`find` 零命中时读该 server 的 `references/<server>.md`，它有完整工具表和「本 server 最容易选错的」一节。

**不要凭工具名猜参数**：同名字段在不同 server 含义不同（`windCode` 在 `stock` 是股票、在 `futures` 是品种、在 `options` 是标的），类型也不同（`futures_get_position_ranking.type` 是 integer，`futures_get_warehouse_receipt.type` 是 string），大小写也不同（`index` / `bond` 用小写 `windcode`）。契约里标了 `backend_only` 的参数是线上 schema 已不声明、实测后端仍接受的，照常传。

排障（会发网络请求）：`doctor` 查 Key、连通性、注册表漂移；`refresh [server]` 拉最新 schema 写回注册表并重生成目录。不带参数跑 `node scripts/cli.mjs` 看完整用法。

## 3. 发命令

```bash
node scripts/cli.mjs call <server> <tool> '<params_json>'
node scripts/cli.mjs call stock stock_get_company_profile '{"windCode":"600519.SH"}'
```

参数取值一律回契约拿，不得从本例外推。

**先想清楚要不要整段历史、要不要整份返回体。** 返回体常常比文档贵得多，两个收窄手段：

- 入参层面：`find` 和 `describe` 的 `narrow_response` 会列出该工具能压小返回体的参数（`includeHistory` / `limit` / `topK` / `type` / `includeFields` / `indicators` 等）。`futures_get_supply_demand` 不传 `type` 返 7.6 千字，传 `type:4` 只剩 1.6 千字。用户只要一个最新值时**务必收窄**。
- 出参层面：`--section 字段名[,字段名]` 只取返回体里点名的顶层段。返回体大时 `cli_meta.sections` 会列出各段字数（如公司画像的「控制权与治理安排」6.7 千字），下次照它点名。

**两段式调用**：不少工具的入参必须来自上游返回值（文档编号、指标代码、报表 id、子叙事 ID、期权合约代码等），**不能自己编**；哪些是两段式、两端字段名怎么对应，写在各 server 目录顶部的「调用要点」里。

**参数传递**：POSIX shell 直接传内联 JSON；非 POSIX 环境（PowerShell / cmd / 经执行器包装）把 UTF-8 JSON 写进 `scripts/request-<唯一后缀>.json`，以 `@scripts/request-<唯一后缀>.json` 传入，用完删除，不复用共享文件。

**Key**：不得只检查配置文件就声称没有 API Key。必须先实跑一次；只有返回 `AUTH_ERROR` 才能判定缺失。

**批量与并发**：默认串行。多个标的逐项调用时先发第一个作探针，成功才继续；探针返回错误信封立即终止该批次，不得把同样的调用扩散到其它标的。不同 `server + tool` 或不同参数结构各自分组、各发一次探针。用户明确要求并发时上限 5，返回 `RATE_LIMIT_ERROR` 就停止新请求并恢复串行。

## 4. 读回执

stdout 只有两种形态。

**失败**：`{"ok":false,"code":"...","message":"...","next":"..."}`。`message` 说清了哪里不对，`next` 说清了下一步该做什么——**照 `next` 做**，不要自己发挥。`code` 为 `PARAM_*` 时本地已拦下、未发网络请求；为 `backend_error` 时 `message` 是后端原文，若同时带 `known_issue` 就不要重试。同一工具同一参数最多重试一次。

**成功**：`{"cli_meta":{...},"data":{...}}`，`data` 是后端返回的数据（后端给的不是 JSON 时改放在 `text`）。读之前先过四条：

- **核对返回的标的是不是你问的那一个**（返回体里的证券代码 / 公司名称 / 指标代码）。后端的标的识别不报错也可能认错，见第 5 节。
- **`cli_meta.backend_message` 有值就是半成功**：数据回来了，但后端在抱怨某个入参（如「无效的行情指标:xxx」）。你要的那个字段很可能没取到，改对字段名重取或如实说明，不要当作全量结果用。
- **结构完整但关键字段是空串或整列 null，按「该项无数据」如实报告**，不要换工具凑数，也不要拿相邻字段替代。
- **单位和量级以返回体的元数据为准**（EDB 看 `meta.unit` / `meta.magnitude`，行情类看 `data.unit`），没给就保留原值并说明单位未知，**不得自行换算**。EDB 例外：传了 `targetCurrency` 后 `meta.unit` 不跟着改，币种一律以 `meta.currency` 为准，照抄 `unit` 会给出一个不报错的错误答案。

## 5. 跨 server 的三个坑

单个 server 或单个工具的坑写在各自的「调用要点」和 `describe` 的 `known_issue` 里。下面三条哪个 server 都可能遇上：

- **业务错误伪装成正常返回**：九个 server 普遍把「服务暂时不可用」「未识别到有效的金融标的」以 `isError=false` 的纯文本返回。CLI 已做嗅探并转成 `backend_error`，但如果你看到成功信封里的 `data` / `text` 是一句短提示而不是数据，同样按失败处理。
- **标的识别是非确定性的**：非法或含糊的代码/名称，多数时候返回「未识别到有效的金融标的」，但实测也出现过**返回一只无关证券的真实数据、不报任何错**（`999999.XX` 曾命中中证800）。所以第 4 节那条「先核对标的」是硬要求。
- **说明文字未必可信**：schema 说明里的举例可能不在自己的 enum 里（`targetMagnitude` 写「如 元、亿元」，enum 只收「亿」「万亿」），反过来 `futures` 的 `sector`/`type` 说明里的中文键不在 enum 里但后端确实收——**以 `describe` 的 `enum` 和 `enum_aliases` 为准**。自然语言工具的口径还会跟着问句变（`index` 问「加权 PE」和问「PE」是两个数），口径以返回体的字段名为准。

## 6. 收口

标的未识别或 NER 失败时，询问用户准确全称或 Wind 标准代码，**不得自行补交易所后缀或把名称猜成代码**。

认证、额度、网络、后端不可用、路由错误：直接报告，不绕路、不用记忆里的数据代替。

成功返回数据时末尾附上来源声明，语言与用户提问语言一致：

> 数据来源于万得 Wind 金融数据服务。

> Data sourced from Wind Financial Data Service.

完成状态：`DONE`、`DONE_WITH_LIMITS`、`NO_RESULTS`、`BLOCKED_KEY`、`BLOCKED_QUOTA`、`BLOCKED_RUNTIME`、`OUT_OF_SCOPE`。
