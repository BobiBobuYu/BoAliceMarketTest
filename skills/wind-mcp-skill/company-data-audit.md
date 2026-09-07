# vserver_company_data 字段核对 + 全工具调用验证

实连 + 逐个调用。**54 个工具全部调用成功**，127 个参数。样本：恒大地产集团有限公司（补充样本：比亚迪、万科、中石化、海航、北大方正、保利、紫金）。

- 2026-09-04：首轮字段核对 + 54/54 调用验证
- **2026-09-07：描述正确性专项复核**（逐工具比对 `description` 与真实返回）

## ⚠️ 日期字段错位再次复发（2026-09-07，第 5 轮）

09-04 收尾时 schema 与后端已对齐到 `startDate`/`endDate`。09-07 复测发现 **5 个工具的 schema 回滚到了 `timeFrom`/`timeTo`，而后端仍只认 `startDate`/`endDate`**——即第 3 轮的错位重现：

| 工具 | schema 声明 | 传 `timeFrom` | 传 `startDate` |
|---|---|---|---|
| `company_get_judgments` | `timeFrom`/`timeTo` | 2278 条，回溯 5 年（参数被吞） | **6 条**，标题回显区间 |
| `company_get_court_announcements` | `timeFrom`/`timeTo` | 1577 条 | **62 条** |
| `company_get_court_sessions` | `timeFrom`/`timeTo` | 15248 条 | **61 条** |
| `company_get_filing_info` | `timeFrom`/`timeTo` | 7938 条 | **262 条** |
| `company_get_news_sentiment` | `timeFrom`/`timeTo` | 3399 条全量 | **94 条** |

同区间对照：`2026-01-01 ~ 2026-03-31` / 恒大地产集团有限公司。其余 22 个带区间的工具仍是 `startDate`/`endDate`，正常生效。

**判据**：参数被接受时返回标题会回显区间——`# 企业裁判文书信息的查询结果（恒大地产集团有限公司；2026-01-01~2026-03-31）`；被吞掉时标题没有括号。调用后看这个括号即可确认。

**结论**：这 5 个工具一律传 `startDate`/`endDate`，无视 schema 声明。全 7 个 server 中只有 company 存在 `timeFrom` 残留。

## 一、调用验证 54/54 ✅

| 分族 | 工具数 | 结果 |
|---|---|---|
| `company_get_*`（风险 / 司法 / 舆情 / 工商 / 枚举） | 31 | 全通 |
| `company_list_*`（股东 / 投资 / 商标 / 专利 / 年报等） | 21 | 全通 |
| `company_search_entity` / `company_traverse_equity` | 2 | 全通 |

数据量样例：`share_lockup` 74KB / `list_annual_report` 45KB / `penalty_info` 39KB / `judicial_sales` 29KB；空结果（0 条）也返回结构完整的「已全量扫描…未发现记录」，非报错。

## 二、描述正确性复核（2026-09-07）

54 个工具全部实调，逐条比对 `description` 的【功能】/【返回】/【边界】与真实返回内容、参数说明与后端实际接受值。

### A. 会导致调用直接失败的（3 项）

**A1. 描述指向一个不存在的工具 `company_get_biz_num`** — 8 处引用，5 个工具

`court_announcements`、`court_sessions`、`judgments`、`news_sentiment`、`filing_info` 的 `causeOfAction`/`role`/`tagCode` 描述里写「请调用 `company_get_biz_num(listType=2, categoryName=...)`」。真名是 **`company_get_biz_enum`**。仅 `filing_info` 的 `causeOfAction` 一处写对，同工具的 `role` 又写错。后端报错文案里还出现第三个名字 `risk_get_biz_enum`——三个名字互不相同。

**A2. 内联 enum 含后端拒收的值 `侵犯财产`** — 4 个工具的 `causeOfAction`

字典（`company_get_biz_enum(listType=2, categoryName="案由")`）里的正确值是 `侵犯财产罪`：

```
causeOfAction=["侵犯财产"]   → causeOfAction参数错误,但是参数'侵犯财产'匹配到相似参数'侵犯财产罪'...
causeOfAction=["侵犯财产罪"] → 正常返回（0 条）
causeOfAction=["执行案件"]   → 正常返回（191 条）
```

`role`（10 项）、`tagCode`（10 项）的内联 enum 与字典完全一致，只有这一个错值。

**A3. 三个过滤参数无 enum、无取值说明、无字典覆盖，且合法词表与自身返回列的显示值不一致**

| 参数 | 实测合法值 | 会被拒的直觉值 |
|---|---|---|
| `company_list_patent.patentType` | `实用新型` / `外观设计` / `授权发明` / `发明申请` | `发明`、`发明专利` → `无效的专利类型` |
| `company_list_patent.lawStatus` | `有效` | `授权`（正是它自己「最新法律状态」列的值）、`失效` → `无效的法律状态` |
| `company_list_trademark.trademarkStatus` | `已注册` / `商标申请` | `无效` → `无效的商标状态` |

`company_get_biz_enum` 只覆盖 案由 / 当事人角色 / 舆情标签 三类，这三个参数没有任何字典兜底。描述只说「传空字符串时查询全部」，等于让调用方靠猜。

### B. 描述与实际返回不符（7 项）

| 工具 | 问题 |
|---|---|
| `company_get_default_info` | 【返回】只写非标资产，并声明「不将非标资产风险表述为债券违约」；实际返回 **3 张表**：非标资产风险 9 条 + 商票逾期 38 条 + **债券违约 9 条**。【边界】写对了，【返回】漏了三分之二 |
| `company_list_annual_report` | 【边界】整段串台，写的是「只核查年报披露的客户或供应商信息；项目级招标、中标公告不纳入本范围」——客户/供应商工具的文案。实际返回 8 个板块（基本信息/对外投资/股东/担保/社保/股权变更/年报变更/网站） |
| `company_list_equity_change` | 实际只返回**近一年**（输出标题写死「近一年内的股权变更」），描述未提窗口，【边界】还说「关注历史变化」。空结果文案「未发现近一年内的任何记录」易被误读为「无股权变更」（同问题项 ③） |
| `company_get_share_lockup` | 工具名意为「股份锁定」，实际返回**股权司法冻结/司法协助**（H1 = `企业司法协助`，恒大 454 条）。描述文本正确，是工具名误导 |
| `company_traverse_equity` | 唯一返回裸 JSON 而非 markdown 的工具；实测只穿透到**第 2 层**，描述称「多层穿透」却未说明深度上限，也无深度参数 |
| `company_get_land_acquisition` | 描述写「发布单位」，实际列名「批准单位」；实际另有「土地受让人」「合同签订日期」两列未提及 |
| `company_list_standard` / `company_get_discredit` | 描述「标准名称」→ 实际列名「标准信息」；描述「发布日期」→ 实际列名「发生时间」 |

### C. 行为正确但描述缺失（3 项）

- **`company_get_news_sentiment` 不传区间时对高舆情量主体稳定失败**：万科、比亚迪均返回 `isError=true` +「服务暂时不可用」（各复现 2 次），传窄区间后正常（万科 2026-08 单月 100 条）。恒大不传区间正常，故与数据量相关而非随机抖动。描述宣称的「默认 5 年」恰好让大主体的默认调用必失败。
- `newsPenetrateEnable` 不传时**默认 true**（返回标题回显「是否穿透：true」），描述未写默认值。
- 截断阈值不统一且均未写进描述：多数 30 条；`discredit` / `share_lockup` / `trademark` / `patent` / `news_sentiment` 为 100 条；`controlled_entity` 200 条。

### D. 描述可用性

**48/54 个工具的【适用场景】是同一句模板**——「核查企业的XXX；用于尽职调查、合规核对或业务关系梳理。」对 Agent 选工具零区分度，真正可区分的信息全压在【边界】里。另有 19 个【功能】含「查询企业的企业XX」叠字（详见问题项 ①）。

### E. 验证通过的描述

`history` 参数语义准确（比亚迪股东 11→52 条、主要人员 29→51 条）；`startDate` 类工具「默认为 5 年前」准确（今天 2026-09-07，默认回溯 2021-09-07）；`company_get_biz_enum` 的 `listType` 1/2 说明完全正确；`trade_credit`、`tech_roster`、`land_acquisition`、`environment_penalty` 的返回字段清单与描述吻合。

### F. 未能验证

7 个工具在 恒大/比亚迪/万科/保利/中石化/紫金/海航/北大方正 全部 8 个样本下均为 0 记录，【返回】字段清单无从核对：`disciplinary_list`、`financial_leasing`、`illegal_dishonesty`、`illegal_tax`、`liquidation`、`simple_cancellation`、`tax_abnormal`。

### G. 输出侧数据质量（非描述缺陷，但影响可信度）

- **日期格式串档**：`abnormal_operation`「列入日期为 20221008」、`equity_pledged`「公示日期为 20211122」、`owing_tax`「公告日期为 20250416」是裸 `YYYYMMDD`，其余均为 `YYYY-MM-DD`
- **摘要占位符泄漏**：`executed_persons`「系统已为您实时检索 **-** 至今的动态…最近一次立案于 **-**」；`filing_info` / `court_sessions`「案由为**。**」
- **金额汇总恒为 0**：`discredit`「涉案总金额 0 元」、`executed_persons`「被执行总金额 0 元」、`high_consumers`「涉案总金额 0 元」，而明细表内执行标的为实数（`final_case` 的 1630 亿汇总正确）
- **商标注册号被当日期解析**：`3668-10-20`、`3669-08-05`（应为 `36681020` / `36690805`）
- **疑似测试数据混入**：`customer_info` 对恒大返回的 29 条招投标客户全为深圳水务系列，标题含「系统测试单一来源采购方式流程」「操作手册编写」「但一来对外0131」

## 三、已改进 ✅

| 项 | 上一轮 | 本轮 |
|---|---|---|
| `title` 覆盖 | 105/127 缺失（17%） | **127/127 = 100%** |
| 工具描述 | 长短不一的自由文本 | **54/54 全部改为 `【功能】/【适用场景】/【返回】/【边界】` 结构化模板**（与 stock_research 一致） |
| 描述过度承诺 | 4 个工具声称「近五年/近一年」却无区间参数 | 描述重写后不再提窗口，口径矛盾消失 |

## 四、问题项

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

## 五、已统一 ✅

`companyKey` 52 处描述一致；27 处区间参数规格一致（可选、`YYYY-MM-DD`、默认近 5 年→今天），但**字段名已分裂成 22 个 `startDate` + 5 个 `timeFrom`**（见顶部第 5 轮）；`title` 127/127；工具前缀 `company_*` 54/54；全 camelCase。

## 六、建议

| P | 动作 |
|---|---|
| **P0** | **5 个工具的 schema 回滚到 `timeFrom`/`timeTo`，后端仍只认 `startDate`/`endDate`**——第 3 轮错位重现，参数被静默吞掉。要么后端补收 `timeFrom`，要么 schema 改回 `startDate` |
| **P0** | 描述里的 `company_get_biz_num` 是不存在的工具名（8 处），改为 `company_get_biz_enum`；后端报错文案里的 `risk_get_biz_enum` 一并统一 |
| **P0** | `causeOfAction` 内联 enum 的 `侵犯财产` 改为 `侵犯财产罪`（4 个工具），与字典对齐 |
| **P1** | `patentType` / `lawStatus` / `trademarkStatus` 补 enum 或纳入 `company_get_biz_enum` 字典；当前合法值与返回列显示值不一致（`授权发明` vs `授权`） |
| **P1** | `company_get_default_info` 的【返回】补上商票逾期、债券违约两块；`company_list_annual_report` 的【边界】纠正串台文案 |
| **P1** | 报错文案改用与 schema 一致的字段名；`yyyy-MM-dd` → `YYYY-MM-DD` |
| **P1** | 描述模板做语言润色：去掉「XX查询公开记录」的动词重复、「企业的企业」、内部分类分隔符 `｜`；48/54 雷同的【适用场景】改写出区分度 |
| **P1** | `company_get_news_sentiment` 不传区间时对大主体必失败，需修后端或在描述中要求必传区间 |
| P2 | `company_list_equity_change` 的 1 年隐藏窗口写进描述，或开放为参数 |
| P2 | 未知日期字段应报错而非静默忽略 |
| P2 | 截断改结构化字段（`total` / `returned` / `hasMore`），并提供分页入参；当前阈值 30/100/200 三套且均未文档化 |
| P2 | `company_get_share_lockup` 更名（实际返回股权司法冻结）；`company_traverse_equity` 说明穿透深度上限为 2 层 |
| P2 | 修复摘要占位符泄漏（`-` / 空案由）与金额汇总恒为 0；统一裸 `YYYYMMDD` 日期 |
| P3 | `history` → `includeHistory`，与 futures_data 对齐；修 `bankruptcy_reorg` 的重复句号 |
| P3 | 商标注册号被当日期解析（`3668-10-20`）；`customer_info` 疑似测试数据混入 |
