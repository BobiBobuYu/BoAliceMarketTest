# vserver_company_data 字段核对 + 全工具调用验证

实连 + 逐个调用，2026-09-04。**54 个工具全部调用成功**，127 个参数。样本：恒大地产集团有限公司。

## ✅ 日期字段错位已修复（2026-09-04 第 4 轮复测）

本日该 server 的区间字段名反复变更 4 次，其中第 3 轮出现 schema 与后端错位，现已闭环：

| 轮次 | schema 声明 | 后端实际接受 | 一致 |
|---|---|---|---|
| 1 | `timeFrom` / `timeTo` | `timeFrom` / `timeTo` | ✅ |
| 2 | `startDate` / `endDate` | `startDate` / `endDate` | ✅ |
| 3（回滚） | `timeFrom` / `timeTo` | `startDate` / `endDate` | ❌ 错位 |
| **当前** | **`startDate` / `endDate`** | **`startDate` / `endDate`** | ✅ |

第 3 轮错位期间，按 schema 传 `timeFrom` 会被静默忽略、返回近 5 年全量数据，且「超 5 年 / 起止颠倒 / 格式错误」三类校验一并失效。当前已全部恢复：27/27 工具区间生效，三类校验正常。逐工具证据见 [`company-data-date-fields.md`](company-data-date-fields.md)。

**遗留**：26/27 个工具的报错文案仍指向已不存在的 `timeFrom`/`timeTo`（如传 `startDate=2019-01-01` 报 `timeFrom不能早于5年前的今天`）；`company_get_news_sentiment` 自成一套文案；报错里的 `yyyy-MM-dd` 与描述里的 `YYYY-MM-DD` 大小写不一致。

## 一、调用验证 54/54 ✅

| 分族 | 工具数 | 结果 |
|---|---|---|
| `company_get_*`（风险 / 司法 / 舆情 / 工商 / 枚举） | 31 | 全通 |
| `company_list_*`（股东 / 投资 / 商标 / 专利 / 年报等） | 21 | 全通 |
| `company_search_entity` / `company_traverse_equity` | 2 | 全通 |

数据量样例：`share_lockup` 74KB / `list_annual_report` 45KB / `penalty_info` 39KB / `judicial_sales` 29KB；空结果（0 条）也返回结构完整的「已全量扫描…未发现记录」，非报错。

## 二、已改进 ✅

| 项 | 上一轮 | 本轮 |
|---|---|---|
| `title` 覆盖 | 105/127 缺失（17%） | **127/127 = 100%** |
| 工具描述 | 长短不一的自由文本 | **54/54 全部改为 `【功能】/【适用场景】/【返回】/【边界】` 结构化模板**（与 stock_research 一致） |
| 描述过度承诺 | 4 个工具声称「近五年/近一年」却无区间参数 | 描述重写后不再提窗口，口径矛盾消失 |

## 三、问题项

### ① 描述模板机械拼接，产生大量语病

54 个描述全部套用同一模板，但填充项未做语言润色：

| 类型 | 数量 | 例 |
|---|---|---|
| 动词重复 | 24 | `查询企业的法院公告查询公开记录`、`查询企业的终本案件查询公开记录` |
| "企业"重复 | 19 | `查询企业的企业股东信息…`、`查询企业的企业工商信息…` |
| 内部分类路径外泄 | 2 | `company_get_liquidation`：`经营风险｜破产清算公开记录`；`company_get_simple_cancellation`：`经营风险｜简易注销` |

`company_list_bidding` 同时命中两类：`查询企业的企业招投标记录查询公开记录`。

### ② `timeTo` 描述存在 2 种变体

26 个工具的 `timeTo` 描述以「默认取当前日期（今天）」结尾，`company_get_bankruptcy_reorg` 多一个句号：「…（今天）。**。**」。

### ③ 隐藏时间窗口未文档化

`company_list_equity_change` 无任何日期参数，返回文本却是「未发现**近一年**内的任何记录」——后端仍在应用 1 年窗口，但描述重写后已不再说明。调用方既无法调整也无从知晓。

### ④ 截断靠文本提示，无结构化分页

| 工具 | 提示 |
|---|---|
| `company_list_controlled_entity` | 「本次查询返回 1982 条控股企业数据，当前仅展示前 200 条数据」 |
| `company_list_trademark` | 「本次查询返回 1487 条商标数据，当前仅展示前 100 条数据」 |
| `company_get_court_sessions` | 记录总数 15249，实际返回 10.5KB |

无 `hasMore` / 游标字段，且无任何入参可翻页或调整条数。

### ⑤ 第二套时间语义：`history` 布尔

4 个工具用 `history`(boolean, 默认 `false`) 表示"查当前 / 查历史"：`company_list_key_personnel`、`company_list_shareholder`、`company_list_patent`、`company_list_investment`。与 27 个工具的精确区间互不通用，也与 futures_data 的 `includeHistory` 同义不同名。

### ⑥ 标识体系独立

`companyKey`（52 个工具，企业名称全称或统一社会信用代码）与全局 `windCode` 体系无交集；`company_search_entity` 又单独用 `searchKey`。

### ⑦ 返回格式两套

- `company_get_*` 风险类：`# 企业XX的查询结果` + `- **记录总数**` + `- **摘要信息**` + markdown 表
- `company_list_*` 档案类：`**企业名称**：…` + `## 摘要` + `## <分节>` + 表

## 四、已统一 ✅

`companyKey` 52 处描述一致；`timeFrom`/`timeTo` 27 处规格一致（可选、`YYYY-MM-DD`、默认近 5 年→今天）；`title` 127/127；工具前缀 `company_*` 54/54；全 camelCase。

## 五、建议

| P | 动作 |
|---|---|
| ~~P0~~ | ✅ 已修复：schema 与后端日期字段已对齐，三类校验已恢复 |
| **P1** | 报错文案改用与 schema 一致的字段名：26 个工具仍报 `timeFrom`；`yyyy-MM-dd` → `YYYY-MM-DD` |
| P2 | 未知日期字段应报错而非静默忽略 |
| P1 | 描述模板做语言润色：去掉「XX查询公开记录」的动词重复、「企业的企业」、内部分类分隔符 `｜` |
| P2 | `company_list_equity_change` 的 1 年隐藏窗口写进描述，或开放为参数 |
| P2 | 截断改结构化字段（`total` / `returned` / `hasMore`），并提供分页入参 |
| P3 | `history` → `includeHistory`，与 futures_data 对齐；修 `bankruptcy_reorg` 的重复句号 |
