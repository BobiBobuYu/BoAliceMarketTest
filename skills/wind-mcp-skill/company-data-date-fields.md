# vserver_company_data 日期字段清单

**数据来源**：实连 `https://mcp.wind.com.cn/vserver_company_data/mcp/` 拉取 `tools/list`（2026-09-04）
**工具总数**：54 —— **27 个带日期区间，27 个完全没有日期参数**

## 一、速览

| 类别 | 工具数 | 日期参数 | 说明 |
|---|---|---|---|
| **带时间区间** | **27** | `timeFrom` + `timeTo` | 全部为 `company_get_*` 风险/司法/舆情类工具 |
| 带单一日期 | 0 | — | 本 server 没有任何单日期参数（无 `date` / `tradeDate` / `reportDate`） |
| 无日期参数 | 27 | — | `company_list_*` 全族（21）+ `company_search_entity` + `company_traverse_equity` + 4 个 `company_get_*` |

**统一性判定**：本 server 内部**高度统一**——27 个带日期的工具全部使用 `timeFrom` / `timeTo`，无一例外，且两个参数的 description 文本 **27 份完全一致**（逐字节相同）。问题只在于：

1. 与其他 5 个 server 的 `startDate` / `endDate` 约定**不一致**（跨 server 问题，详见 `mcp-field-consistency-audit.md` §3.1）；
2. `title` 字段只有 6/27 个工具补了，其余 21 个缺失；
3. 4 个工具描述里承诺了时间窗口，却没给区间参数（见 §四）。

---

## 二、带时间区间的 27 个工具

**公共规格**（27 个工具完全一致）：

| 参数 | 类型 | 必填 | 格式 | 默认值 |
|---|---|---|---|---|
| `timeFrom` | `string` | ❌ 可选 | `YYYY-MM-DD`（如 `2026-01-18`） | 5 年前 |
| `timeTo` | `string` | ❌ 可选 | `YYYY-MM-DD`（如 `2026-05-18`） | 当前日期（今天） |

> description 原文：
> `timeFrom` = 「查询起始时间，YYYY-MM-DD 格式（如 2026-01-18），默认为5年前」
> `timeTo` = 「查询结束时间，YYYY-MM-DD 格式（如 2026-05-18）。默认取当前日期（今天）」
> 27 个工具逐字相同，无变体。

| 工具 | 业务含义 | 日期参数 | 其他可选过滤 | 有 `title` |
|---|---|---|---|---|
| `company_get_abnormal_operation` | 经营异常名录 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_bankruptcy_reorg` | 破产重整案件 | `timeFrom` / `timeTo` | — | ✅ |
| `company_get_court_announcements` | 法院公告 | `timeFrom` / `timeTo` | `causeOfAction` `role` | ❌ |
| `company_get_court_sessions` | 开庭公告 | `timeFrom` / `timeTo` | `causeOfAction` `role` | ❌ |
| `company_get_default_info` | 综合违约（债券违约 / 商票逾期 / 非标风险）| `timeFrom` / `timeTo` | — | ❌ |
| `company_get_disciplinary_list` | 惩戒名单 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_discredit` | 失信被执行人 | `timeFrom` / `timeTo` | — | ✅ |
| `company_get_environment_penalty` | 环保行政处罚 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_equity_pledged` | 股权出质登记 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_executed_persons` | 被执行人案件 | `timeFrom` / `timeTo` | — | ✅ |
| `company_get_filing_info` | 法院立案 | `timeFrom` / `timeTo` | `causeOfAction` `role` | ❌ |
| `company_get_final_case` | 终结本次执行程序案件 | `timeFrom` / `timeTo` | — | ✅ |
| `company_get_financial_leasing` | 融资租赁登记 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_high_consumers` | 董监高限制高消费 | `timeFrom` / `timeTo` | — | ✅ |
| `company_get_illegal_dishonesty` | 严重违法失信 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_illegal_tax` | 税收违法 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_judgments` | 法院裁判文书 | `timeFrom` / `timeTo` | `causeOfAction` `role` | ❌ |
| `company_get_judicial_sales` | 司法拍卖标的 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_land_acquisition` | 国有土地受让 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_legal_notice` | 诉讼文书送达公告 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_news_sentiment` | 新闻舆情 | `timeFrom` / `timeTo` | `tagCode` `emotionId` `newsPenetrateEnable` | ❌ |
| `company_get_owing_tax` | 欠税公告 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_penalty_info` | 行政处罚 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_share_lockup` | 股权司法冻结 | `timeFrom` / `timeTo` | — | ✅ |
| `company_get_simple_cancellation` | 简易注销 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_tax_abnormal` | 税务非正常户认定 | `timeFrom` / `timeTo` | — | ❌ |
| `company_get_valuation_inquiry` | 司法资产询价 | `timeFrom` / `timeTo` | — | ❌ |

### 2.1 按业务主题分组

| 主题 | 工具 |
|---|---|
| **司法诉讼**（6） | `company_get_court_announcements`（法院公告）、`company_get_court_sessions`（开庭公告）、`company_get_filing_info`（法院立案）、`company_get_judgments`（裁判文书）、`company_get_legal_notice`（送达公告）、`company_get_judicial_sales`（司法拍卖） |
| **执行 / 失信**（5） | `company_get_executed_persons`（被执行人）、`company_get_discredit`（失信被执行人）、`company_get_final_case`（终本案件）、`company_get_high_consumers`（限制高消费）、`company_get_disciplinary_list`（惩戒名单） |
| **税务**（3） | `company_get_illegal_tax`（税收违法）、`company_get_owing_tax`（欠税公告）、`company_get_tax_abnormal`（非正常户认定） |
| **行政处罚**（3） | `company_get_penalty_info`（行政处罚）、`company_get_environment_penalty`（环保处罚）、`company_get_illegal_dishonesty`（严重违法失信） |
| **信用 / 违约**（2） | `company_get_default_info`（综合违约）、`company_get_abnormal_operation`（经营异常名录） |
| **股权 / 资产**（4） | `company_get_equity_pledged`（股权出质）、`company_get_share_lockup`（股权司法冻结）、`company_get_land_acquisition`（土地受让）、`company_get_valuation_inquiry`（司法资产询价） |
| **存续状态**（3） | `company_get_bankruptcy_reorg`（破产重整）、`company_get_simple_cancellation`（简易注销）、`company_get_financial_leasing`（融资租赁登记） |
| **舆情**（1） | `company_get_news_sentiment`（新闻舆情） |

### 2.2 带额外过滤参数的 5 个工具

| 工具 | 额外参数 | 说明 |
|---|---|---|
| `company_get_court_announcements` | `causeOfAction` (array) / `role` (array) | 按案由、当事人角色过滤；完整枚举需先调 `company_get_biz_enum(listType=2, categoryName="案由"/"当事人角色")` |
| `company_get_court_sessions` | 同上 | 同上 |
| `company_get_filing_info` | 同上 | 同上 |
| `company_get_judgments` | 同上 | 同上 |
| `company_get_news_sentiment` | `tagCode` (array) / `emotionId` (array) / `newsPenetrateEnable` (boolean) | `emotionId` 取 `negative` / `neutral` / `positive`；`newsPenetrateEnable` 是全 server 唯一没有 `default` 的布尔参数 |

---

## 三、完全没有日期参数的 27 个工具

这些工具返回的是**当前状态快照**或**全量列表**，不支持按时间筛选。

| 分族 | 工具数 | 工具 |
|---|---|---|
| `company_list_*` | 21 | `company_list_beneficial_owner`、`company_list_actual_controller`、`company_list_key_personnel`、`company_list_customer_info`、`company_list_tech_roster`、`company_list_controlled_entity`、`company_list_shareholder`、`company_list_trade_credit`、`company_list_tax_qual`、`company_list_ubo_related`、`company_list_equity_change`、`company_list_contact`、`company_list_trademark`、`company_list_standard`、`company_list_change_record`、`company_list_bidding`、`company_list_annual_report`、`company_list_tax_credit_rating`、`company_list_patent`、`company_list_investment`、`company_list_supplier` |
| `company_get_*` | 4 | `company_get_registration_info`（工商档案）、`company_get_enterprise_score`（风险评分）、`company_get_liquidation`（破产清算）、`company_get_biz_enum`（枚举字典） |
| 其他 | 2 | `company_search_entity`（企业检索）、`company_traverse_equity`（股权穿透） |

> 其中 4 个工具用 `history` (boolean, default `false`) 代替时间筛选，控制"查当前 / 查历史"：`company_list_key_personnel`、`company_list_shareholder`、`company_list_patent`、`company_list_investment`。这是本 server 里**第二套时间语义**——粗粒度的历史开关，与 `timeFrom`/`timeTo` 的精确区间并存但互不通用。

---

## 四、⚠️ 描述承诺了时间窗口、却没有区间参数的 4 个工具

这 4 个工具的 description 明确写了数据窗口，但 `inputSchema` 里**没有** `timeFrom`/`timeTo`，调用方无法收窄范围，也无法确认后端实际用的窗口：

| 工具 | description 里的窗口 | 实际参数 |
|---|---|---|
| `company_get_enterprise_score` | 「查询企业**近五年**综合风险评分记录」 | 仅 `companyKey` |
| `company_get_liquidation` | 「查询企业**近五年**关联的破产清算信息」 | 仅 `companyKey` |
| `company_list_equity_change` | 「查询企业**近一年**的股权变更列表」 | 仅 `companyKey` |
| `company_list_bidding` | 「查询企业**近一年**的招投标公告列表」 | 仅 `companyKey` |

`company_get_enterprise_score` 和 `company_get_liquidation` 尤其突兀——它们和另外 25 个 `company_get_*` 风险类工具是同一族、同样写「近五年」，唯独这两个没给区间参数。

**建议**：这 4 个补上 `timeFrom` / `timeTo`（默认值分别为 5 年前 / 1 年前），与同族对齐。

---

## 五、⚠️ `title` 缺失的 21 个工具

`timeFrom` / `timeTo` 只有 6 个工具补了 `title`（「查询起始时间」/「查询结束时间」），其余 21 个只有 `description`：

| 状态 | 工具 |
|---|---|
| 有 `title`（6） | `company_get_bankruptcy_reorg`、`company_get_discredit`、`company_get_executed_persons`、`company_get_final_case`、`company_get_high_consumers`、`company_get_share_lockup` |
| **无 `title`（21）** | `company_get_abnormal_operation`、`company_get_court_announcements`、`company_get_court_sessions`、`company_get_default_info`、`company_get_disciplinary_list`、`company_get_environment_penalty`、`company_get_equity_pledged`、`company_get_filing_info`、`company_get_financial_leasing`、`company_get_illegal_dishonesty`、`company_get_illegal_tax`、`company_get_judgments`、`company_get_judicial_sales`、`company_get_land_acquisition`、`company_get_legal_notice`、`company_get_news_sentiment`、`company_get_owing_tax`、`company_get_penalty_info`、`company_get_simple_cancellation`、`company_get_tax_abnormal`、`company_get_valuation_inquiry` |

同一个参数、同一份 description，一半有 title 一半没有，说明是分批加的、没有统一回填。对依赖 `title` 渲染参数摘要的客户端，这 21 个工具的日期参数会显示为无标签。

---

## 六、调用示例

```bash
# 默认窗口（近 5 年 → 今天）
{"companyKey": "贵州茅台股份有限公司"}

# 指定区间
{"companyKey": "91520100214601596K", "timeFrom": "2024-01-01", "timeTo": "2026-09-04"}

# 区间 + 案由/角色过滤（仅 4 个司法类工具支持）
{"companyKey": "贵州茅台股份有限公司", "timeFrom": "2024-01-01", "timeTo": "2026-09-04",
 "causeOfAction": ["买卖合同纠纷"], "role": ["被告"]}
```

> `companyKey` 传**企业名称全称**或**统一社会信用代码**，不是证券代码。
