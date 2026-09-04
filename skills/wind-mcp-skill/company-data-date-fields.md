# vserver_company_data 时间入参：27 个工具全量清单

实连 `tools/list` + 逐个实调，2026-09-04 复测。54 个工具中 **27 个带时间区间，27 个无日期参数**。

## 🔴 当前状态：schema 已回滚为 `timeFrom`/`timeTo`，但后端只认 `startDate`/`endDate`

| 版本 | schema 声明 | 后端实际接受 | 是否一致 |
|---|---|---|---|
| **当前（回滚后）** | `timeFrom` / `timeTo` | `startDate` / `endDate` | ❌ **错位** |
| 上一轮 | `startDate` / `endDate` | `startDate` / `endDate` | ✅ |
| 更早 | `timeFrom` / `timeTo` | `timeFrom` / `timeTo` | ✅ |

实测 `tools/list`：**27 个工具声明 `timeFrom`/`timeTo`，0 个声明 `startDate`/`endDate`**。

### 判定依据：返回标题是否回显区间

```
不传日期     len=104   # 企业税收违法信息的查询结果
timeFrom    len=104   # 企业税收违法信息的查询结果                       ← 与不传逐字相同
startDate   len=138   # 企业税收违法信息的查询结果（恒大地产集团有限公司；2025-01-01~2025-12-31）
```

传 `startDate`/`endDate` 时后端**回显区间**，传 `timeFrom`/`timeTo` 时**完全不回显**——证明后端从未收到 schema 声明的那对字段。

**危害**：按 schema 正确调用 → 静默拿到近 5 年全量数据，无任何报错。且回滚后「超 5 年」「起止颠倒」「格式错误」三类校验也一并失效（这些校验只挂在 `startDate` 上）。

## 27 个工具全量清单 + 实测证据

公共规格（27 个一致）：`timeFrom` / `timeTo`，`string`，**均为可选**，`YYYY-MM-DD`，默认近 5 年 → 今天，均有 `title`（「查询起始时间」/「查询结束时间」）。

下表「记录总数」取样本 **恒大地产集团有限公司**，区间统一 `2025-01-01 ~ 2025-12-31`：

| # | 工具 | 业务含义 | 额外过滤参数 | 不传日期 | `timeFrom` | `startDate` |
|---|---|---|---|---|---|---|
| 1 | `company_get_abnormal_operation` | 经营异常名录 | — | 1 | 1 | 0 |
| 2 | `company_get_bankruptcy_reorg` | 破产重整 | — | 1 | 1 | 0 |
| 3 | `company_get_court_announcements` | 法院公告 | `causeOfAction` `role` | 1577 | 1577 | 205 |
| 4 | `company_get_court_sessions` | 开庭公告 | `causeOfAction` `role` | 15249 | 15249 | 686 |
| 5 | `company_get_default_info` | 综合违约 | — | 56 | 56 | 13 |
| 6 | `company_get_disciplinary_list` | 惩戒名单 | — | 0 | 0 | 0 |
| 7 | `company_get_discredit` | 失信被执行人 | — | 436 | 436 | 110 |
| 8 | `company_get_environment_penalty` | 环保处罚 | — | 0 | 0 | 0 |
| 9 | `company_get_equity_pledged` | 股权出质 | — | 13 | 13 | 0 |
| 10 | `company_get_executed_persons` | 被执行案件 | — | 410 | 410 | 48 |
| 11 | `company_get_filing_info` | 诉讼立案 | `causeOfAction` `role` | 7941 | 7941 | 3425 |
| 12 | `company_get_final_case` | 终本案件 | — | 2363 | 2363 | 717 |
| 13 | `company_get_financial_leasing` | 融资租赁登记 | — | 0 | 0 | 0 |
| 14 | `company_get_high_consumers` | 限制高消费 | — | 3316 | 3316 | 966 |
| 15 | `company_get_illegal_dishonesty` | 严重违法失信 | — | 0 | 0 | 0 |
| 16 | `company_get_illegal_tax` | 税收违法 | — | 0 | 0 | 0 |
| 17 | `company_get_judgments` | 裁判文书 | `causeOfAction` `role` | 2277 | 2277 | 198 |
| 18 | `company_get_judicial_sales` | 司法拍卖 | — | 615 | 615 | 3 |
| 19 | `company_get_land_acquisition` | 国有土地受让 | — | 0 | 0 | 0 |
| 20 | `company_get_legal_notice` | 送达公告 | — | 20 | 20 | 18 |
| 21 | `company_get_news_sentiment` | 新闻舆情 | `tagCode` `emotionId` `newsPenetrateEnable` | 100 | 100 | 100 |
| 22 | `company_get_owing_tax` | 欠税公告 | — | 9 | 9 | 4 |
| 23 | `company_get_penalty_info` | 行政处罚 | — | 52 | 52 | 0 |
| 24 | `company_get_share_lockup` | 股权司法冻结 | — | 454 | 454 | 108 |
| 25 | `company_get_simple_cancellation` | 简易注销 | — | 0 | 0 | 0 |
| 26 | `company_get_tax_abnormal` | 税务非正常户 | — | 0 | 0 | 0 |
| 27 | `company_get_valuation_inquiry` | 司法资产询价 | — | 4 | 4 | 1 |

**结论：27/27 全部命中** —— `timeFrom` 列与「不传日期」列**逐字节相同**（含 8 个记录数为 0 的工具，其响应体长度也完全一致）；`startDate` 列在 27/27 全部产生差异。

> 记录数为 0 的 8 个工具（`disciplinary_list`、`environment_penalty`、`financial_leasing`、`illegal_dishonesty`、`illegal_tax`、`land_acquisition`、`simple_cancellation`、`tax_abnormal`）本身无数据，但响应体长度差异同样证明 `startDate` 被接收（标题回显区间）、`timeFrom` 未被接收。
>
> `news_sentiment` 三列均为 100，是因为该工具「记录总数」上限为 100；其响应体长度差异与其余 26 个一致。

## 按业务主题分组

| 主题 | 工具 |
|---|---|
| 司法诉讼（6） | `court_announcements` `court_sessions` `filing_info` `judgments` `legal_notice` `judicial_sales` |
| 执行失信（5） | `executed_persons` `discredit` `final_case` `high_consumers` `disciplinary_list` |
| 税务（3） | `illegal_tax` `owing_tax` `tax_abnormal` |
| 行政处罚（3） | `penalty_info` `environment_penalty` `illegal_dishonesty` |
| 信用违约（2） | `default_info` `abnormal_operation` |
| 股权资产（4） | `equity_pledged` `share_lockup` `land_acquisition` `valuation_inquiry` |
| 存续状态（3） | `bankruptcy_reorg` `simple_cancellation` `financial_leasing` |
| 舆情（1） | `news_sentiment` |

（均为 `company_get_` 前缀）

**带额外过滤的 5 个**：`court_announcements` / `court_sessions` / `filing_info` / `judgments` 支持 `causeOfAction` + `role`；`news_sentiment` 支持 `tagCode` + `emotionId` + `newsPenetrateEnable`。

## 无日期参数的 27 个工具

| 分族 | 工具 |
|---|---|
| `company_list_*`（21） | `beneficial_owner` `actual_controller` `key_personnel` `customer_info` `tech_roster` `controlled_entity` `shareholder` `trade_credit` `tax_qual` `ubo_related` `equity_change` `contact` `trademark` `standard` `change_record` `bidding` `annual_report` `tax_credit_rating` `patent` `investment` `supplier` |
| `company_get_*`（4） | `registration_info` `enterprise_score` `liquidation` `biz_enum` |
| 其他（2） | `company_search_entity` `company_traverse_equity` |

其中 4 个用 `history`(boolean, 默认 `false`) 代替时间筛选：`list_key_personnel` `list_shareholder` `list_patent` `list_investment`。这是本 server 第二套时间语义，与区间互不通用。

`company_list_equity_change` 无日期参数，但返回文本为「未发现**近一年**内的任何记录」——后端隐含 1 年窗口且未在描述中说明。

## 调用示例

```jsonc
// 默认（近 5 年 → 今天）
{"companyKey": "恒大地产集团有限公司"}

// ⚠️ 按 schema 写法 —— 当前会被静默忽略，返回近 5 年全量
{"companyKey": "恒大地产集团有限公司", "timeFrom": "2025-01-01", "timeTo": "2025-12-31"}

// ⚠️ schema 未声明但后端实际生效的写法
{"companyKey": "恒大地产集团有限公司", "startDate": "2025-01-01", "endDate": "2025-12-31"}
```

`companyKey` 传企业名称全称或统一社会信用代码，不是证券代码。

## 修复建议

| P | 动作 |
|---|---|
| **P0** | 消除 schema 与后端错位：后端改收 `timeFrom`/`timeTo`，或 schema 改回 `startDate`/`endDate`（后者同时与其余 6 个 server 对齐） |
| **P0** | 未知日期字段必须报错，不得静默忽略 |
| **P0** | 恢复三类校验（超 5 年 / 起止颠倒 / 格式错误），当前传 `timeFrom` 一律不触发 |
| P1 | 报错文案与最终选定的字段名保持一致（上一轮曾出现传 `startDate` 却报 `timeFrom不能大于timeTo`） |

完整 server 核对见 [`company-data-audit.md`](company-data-audit.md)。
