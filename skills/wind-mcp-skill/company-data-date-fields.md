# vserver_company_data 日期字段

实连 `tools/list`，2026-09-04。54 个工具，**27 个带时间区间，27 个无日期参数**。

## 时间区间（27 个工具）

**⚠️ 2026-09-04 复测：字段名已回滚为 `timeFrom` / `timeTo`，且后端只认 `startDate`/`endDate`——schema 声明的字段被静默忽略。详见 [`company-data-audit.md`](company-data-audit.md) 文首 P0。**

schema 现状：`timeFrom` + `timeTo`，27 个工具一致：`string`、可选、`YYYY-MM-DD`、默认近 5 年→今天。

| 版本 | schema 字段 | 后端实际接受 |
|---|---|---|
| 本轮（回滚后） | `timeFrom` / `timeTo` | **`startDate` / `endDate`** ← 错位 |
| 上一轮 | `startDate` / `endDate` | `startDate` / `endDate` ✅ |

| 主题 | 工具 |
|---|---|
| 司法诉讼 | `court_announcements` `court_sessions` `filing_info` `judgments` `legal_notice` `judicial_sales` |
| 执行失信 | `executed_persons` `discredit` `final_case` `high_consumers` `disciplinary_list` |
| 税务 | `illegal_tax` `owing_tax` `tax_abnormal` |
| 行政处罚 | `penalty_info` `environment_penalty` `illegal_dishonesty` |
| 信用违约 | `default_info` `abnormal_operation` |
| 股权资产 | `equity_pledged` `share_lockup` `land_acquisition` `valuation_inquiry` |
| 存续状态 | `bankruptcy_reorg` `simple_cancellation` `financial_leasing` |
| 舆情 | `news_sentiment` |

（均为 `company_get_` 前缀）

**额外过滤**：4 个司法类（`court_announcements` `court_sessions` `filing_info` `judgments`）支持 `causeOfAction` + `role`；`news_sentiment` 支持 `tagCode` + `emotionId` + `newsPenetrateEnable`。

## 实测验证（上一轮 `startDate`/`endDate` 版本）✅

> 下表为上一轮 schema 与后端一致时的验证结果。回滚后后端行为未变（仍认 `startDate`/`endDate`），但 schema 已不再声明这两个字段。

| 验证项 | 结果 |
|---|---|
| 传 vs 不传（27 工具） | 26 个结果显著不同（1 个 timeout，重试正常） |
| 边界包含性 | `2025-01-01~2025-03-31` → 28 条，最早/最晚正是两端 |
| 越界检查（3 组抽样） | 逐行核对发布日期，**0 条越界** |
| 单点 / 未来区间 | 正确返回 0 条 |
| 单边传参 | 只传一端有效，另一端走默认 |
| 5 年硬约束 | 超出**明确报错**，非静默截断 |

## 遗留问题

| 问题 | 涉及 |
|---|---|
| **schema 与后端字段错位**（P0，见 `company-data-audit.md`） | 全部 27 个 |
| **`title` 已补齐 127/127** ✅（上一轮 105 个缺失） | — |
| 报错文案用 `timeFrom`/`timeTo`：`timeFrom不能早于5年前的今天：2021-09-04` / `timeFrom不能大于timeTo` / `timeFrom格式不正确，应为yyyy-MM-dd格式` | 全部 27 个 |
| **旧字段被静默吞掉**：传 `timeFrom`/`timeTo` 不报错，返回默认近 5 年数据，老调用方无感知拿到错范围 | 全部 27 个 |
| `news_sentiment` 报错文案与其余 26 个不一致，且格式错误时报 `timeTo` 而非 `timeFrom` | 1 个 |
| 格式提示 `yyyy-MM-dd` 与 description 的 `YYYY-MM-DD` 大小写不一致 | 全部 27 个 |
| ~~`title` 缺失~~ ✅ 已补齐 127/127 | — |
| ~~描述承诺时间窗口但无区间参数~~ ✅ 描述已重写，不再提窗口（但 `list_equity_change` 后端仍隐含 1 年窗口且未文档化） | 1 个 |

## 无日期参数（27 个工具）

`company_list_*` 全族（21）+ `company_search_entity` + `company_traverse_equity` + `company_get_registration_info` / `get_enterprise_score` / `get_liquidation` / `get_biz_enum`。

其中 4 个用 `history` (boolean, 默认 `false`) 代替时间筛选：`list_key_personnel` `list_shareholder` `list_patent` `list_investment`。这是本 server 第二套时间语义，与 `startDate`/`endDate` 互不通用。

## 调用

```jsonc
{"companyKey": "贵州茅台股份有限公司"}                                    // 默认近5年
// ⚠️ 当前后端只认 startDate/endDate（schema 却声明 timeFrom/timeTo）
{"companyKey": "91440101231245152Y", "startDate": "2024-01-01", "endDate": "2026-09-04"}
```

`companyKey` 传企业名称全称或统一社会信用代码，不是证券代码。
