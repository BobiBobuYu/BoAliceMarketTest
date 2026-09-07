# vserver_company_data 时间入参：27 个工具全量清单

实连 `tools/list` + 逐个实调，2026-09-04 第 3 轮复测。54 个工具中 **27 个带时间区间，27 个无日期参数**。

## ⚠️ 2026-09-07 复测：已回退，本文以下内容是 09-04 的快照

`tools/list` 实测：**22 个工具声明 `startDate`/`endDate`，5 个回滚为 `timeFrom`/`timeTo`**，而后端仍只认 `startDate`/`endDate`——第 3 轮的 schema/后端错位重现。

| 回滚的工具 | 传 `timeFrom` | 传 `startDate` |
|---|---|---|
| `company_get_judgments` | 2278 条（参数被吞） | **6 条** |
| `company_get_court_announcements` | 1577 条 | **62 条** |
| `company_get_court_sessions` | 15248 条 | **61 条** |
| `company_get_filing_info` | 7938 条 | **262 条** |
| `company_get_news_sentiment` | 3399 条 | **94 条** |

同区间 `2026-01-01 ~ 2026-03-31` / 恒大地产集团有限公司。**这 5 个工具一律传 `startDate`/`endDate`。**详见 [`company-data-audit.md`](company-data-audit.md)。

---

### 以下为 2026-09-04 第 3 轮复测快照

`tools/list` 实测：**27 个工具声明 `startDate`/`endDate`，0 个声明 `timeFrom`/`timeTo`**。

### 本日三轮变更记录

| 轮次 | schema 声明 | 后端实际接受 | 是否一致 |
|---|---|---|---|
| 第 1 轮 | `timeFrom` / `timeTo` | `timeFrom` / `timeTo` | ✅ |
| 第 2 轮 | `startDate` / `endDate` | `startDate` / `endDate` | ✅ |
| 第 3 轮（回滚） | `timeFrom` / `timeTo` | `startDate` / `endDate` | ❌ **错位** |
| **当前** | **`startDate` / `endDate`** | **`startDate` / `endDate`** | ✅ **已修复** |

第 3 轮的错位（按 schema 传 `timeFrom` 被静默忽略、返回近 5 年全量）已闭环。

## 27 个工具全量清单 + 实测证据

公共规格（27 个一致）：`startDate` / `endDate`，`string`，**均为可选**，`YYYY-MM-DD`，默认近 5 年 → 今天，均有 `title`（「查询起始时间」/「查询结束时间」）。

样本 **恒大地产集团有限公司**，区间 `2025-01-01 ~ 2025-12-31`，数字为「记录总数」：

| # | 工具 | 业务含义 | 额外过滤参数 | 不传日期 | 传区间 | 区间生效 |
|---|---|---|---|---|---|---|
| 1 | `company_get_abnormal_operation` | 经营异常名录 | — | 1 | 0 | ✅ |
| 2 | `company_get_bankruptcy_reorg` | 破产重整 | — | 1 | 0 | ✅ |
| 3 | `company_get_court_announcements` | 法院公告 | `causeOfAction` `role` | 1577 | 205 | ✅ |
| 4 | `company_get_court_sessions` | 开庭公告 | `causeOfAction` `role` | 15249 | 686 | ✅ |
| 5 | `company_get_default_info` | 综合违约 | — | 56 | 13 | ✅ |
| 6 | `company_get_disciplinary_list` | 惩戒名单 | — | 0 | 0 | ✅ |
| 7 | `company_get_discredit` | 失信被执行人 | — | 436 | 110 | ✅ |
| 8 | `company_get_environment_penalty` | 环保处罚 | — | 0 | 0 | ✅ |
| 9 | `company_get_equity_pledged` | 股权出质 | — | 13 | 0 | ✅ |
| 10 | `company_get_executed_persons` | 被执行案件 | — | 410 | 48 | ✅ |
| 11 | `company_get_filing_info` | 诉讼立案 | `causeOfAction` `role` | 7941 | 3425 | ✅ |
| 12 | `company_get_final_case` | 终本案件 | — | 2363 | 717 | ✅ |
| 13 | `company_get_financial_leasing` | 融资租赁登记 | — | 0 | 0 | ✅ |
| 14 | `company_get_high_consumers` | 限制高消费 | — | 3316 | 966 | ✅ |
| 15 | `company_get_illegal_dishonesty` | 严重违法失信 | — | 0 | 0 | ✅ |
| 16 | `company_get_illegal_tax` | 税收违法 | — | 0 | 0 | ✅ |
| 17 | `company_get_judgments` | 裁判文书 | `causeOfAction` `role` | 2277 | 198 | ✅ |
| 18 | `company_get_judicial_sales` | 司法拍卖 | — | 615 | 3 | ✅ |
| 19 | `company_get_land_acquisition` | 国有土地受让 | — | 0 | 0 | ✅ |
| 20 | `company_get_legal_notice` | 送达公告 | — | 20 | 18 | ✅ |
| 21 | `company_get_news_sentiment` | 新闻舆情 | `tagCode` `emotionId` `newsPenetrateEnable` | 100 | 100 | ✅ |
| 22 | `company_get_owing_tax` | 欠税公告 | — | 9 | 4 | ✅ |
| 23 | `company_get_penalty_info` | 行政处罚 | — | 52 | 0 | ✅ |
| 24 | `company_get_share_lockup` | 股权司法冻结 | — | 454 | 108 | ✅ |
| 25 | `company_get_simple_cancellation` | 简易注销 | — | 0 | 0 | ✅ |
| 26 | `company_get_tax_abnormal` | 税务非正常户 | — | 0 | 0 | ✅ |
| 27 | `company_get_valuation_inquiry` | 司法资产询价 | — | 4 | 1 | ✅ |

**27/27 全部生效。** 判定依据除记录总数外，还有返回标题回显：

```
不传日期     len= 14923   # 企业裁判文书信息的查询结果
传区间       len= 14982   # 企业裁判文书信息的查询结果（恒大地产集团有限公司；2025-01-01~2025-12-31）
```

> 记录数为 0 的 8 个工具（`disciplinary_list` `environment_penalty` `financial_leasing` `illegal_dishonesty` `illegal_tax` `land_acquisition` `simple_cancellation` `tax_abnormal`）本身无数据，靠标题回显与响应体长度差异确认区间已被接收。
> `news_sentiment` 两列均为 100，因该工具「记录总数」上限为 100。

## 校验行为（第 3 轮失效后已恢复）

| 场景 | 返回 |
|---|---|
| `startDate=2019-01-01`（超 5 年） | `timeFrom不能早于5年前的今天：2021-09-04` |
| 起止颠倒 | `timeFrom不能大于timeTo` |
| `startDate=2025/01/01`（格式错） | `timeFrom格式不正确，应为yyyy-MM-dd格式` |

### ⚠️ 遗留：报错文案仍用旧字段名

26/27 个工具的报错都指向 **`timeFrom`/`timeTo`** —— 这两个字段在当前 schema 里已不存在。用户传的是 `startDate`，报错却让他去改 `timeFrom`，无从下手。

`company_get_news_sentiment` 自成一套（`时间范围错误：查询日期不能超过5年`），全 server 报错文案 2 种变体。

另：报错里的格式写作 `yyyy-MM-dd`，与参数 description 里的 `YYYY-MM-DD` 大小写不一致。

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
{"companyKey": "恒大地产集团有限公司"}                                              // 默认近 5 年
{"companyKey": "恒大地产集团有限公司", "startDate": "2025-01-01", "endDate": "2025-12-31"}
```

`companyKey` 传企业名称全称或统一社会信用代码，不是证券代码。

## 剩余建议

| P | 动作 |
|---|---|
| P1 | 报错文案里的 `timeFrom`/`timeTo` 改为 `startDate`/`endDate`（26 个工具），`yyyy-MM-dd` 改为 `YYYY-MM-DD` |
| P2 | `company_get_news_sentiment` 的报错文案与其余 26 个对齐 |
| P2 | 未知日期字段应报错而非静默忽略（当前传已废弃的 `timeFrom` 不报错，返回近 5 年全量） |
| P3 | `company_list_equity_change` 的 1 年隐藏窗口写进描述，或开放为参数 |

完整 server 核对见 [`company-data-audit.md`](company-data-audit.md)。
