# vserver_finance_data 字段核对 + 全工具调用验证

实连 + 逐个调用，2026-09-04。**13 个工具全部调用成功**，32 个参数。

## 一、调用验证 13/13 ✅

| 工具 | 关键入参 | 返回 |
|---|---|---|
| `quote_search_realtime_indicators` | `keyword:"最新价"` | 284B 指标中英文名 |
| `quote_get_realtime_indicators` | `windCodes:"600519.SH,000858.SZ"` | 茅台 1330.00 +2.40% |
| `quote_get_historical_dataseries` | `type:1` + `params{rangeflag:2,startDate,endDate}` | 1.7KB 日K |
| `general_search_indicators` | `keyword:"收盘价"` | 得 `s_dq_close` |
| `general_get_indicatordata` | `indicatorCode:"s_dq_close"` | 收盘价 1330 |
| `general_search_datasets` | `keyword:"股本"` | 得 `InstitutionalInvestors21` |
| `general_get_dataset` | `reportId` + `condition{windCode}` | 177KB 机构投资者明细 |
| `general_search_documents` | `documentType:"新闻"` + `startDate`/`endDate` | 472 条命中 |
| `general_get_document` | `documentType:"news"` + `documentId` | 文档详情 |
| `general_query_documents` | `question:"贵州茅台最新新闻"` | 3.7KB |
| `general_search_research_insight` | 无参 | 得 `T001` |
| `general_get_research_insight` | `templateId:"T001"` | 全球股市联动综述 |
| `general_query_data` | `question:"贵州茅台最新收盘价"` | 359B |

链式依赖：4→5、6→7、8→9、11→12 均验证通过。

## 二、已修复 ✅

| 项 | 原状 | 现状 |
|---|---|---|
| `general_search_documents` 区间起点 | `beginDate` | **`startDate`** |
| `quote_get_historical_dataseries` 嵌套区间 | `params.begin` / `params.end` | **`params.startDate` / `params.endDate`** |

## 三、不统一项

### ① `documentType` 同概念 3 套取值 + 2 个字段名 ⚠️ 实测踩坑

| 工具 | 字段 | 取值 |
|---|---|---|
| `general_search_documents` | `documentType` | **中文**：新闻 / 公告 / 研报 |
| `general_get_document` | `documentType` | **英文码**：news / na / rpp |
| `general_query_documents` | `docType` | **数字码**：1=新闻, 3=公告 |

前两个是上下游关系：search 返回的文档类型写「新闻」，直接传给 `general_get_document` 会失败，必须手工映射成 `news`。

### ② `startDate`/`endDate` 在同一 server 有 3 种格式

| 位置 | 格式 |
|---|---|
| `general_search_documents` | `YYYY-MM-DD` |
| `general_query_documents` | `YYYY-MM-DD HH:MM:SS` |
| `general_get_dataset` 的 `condition`（由 `general_search_datasets` 返回的动态 inputSchema 定义） | **`YYYYMMDD`**（无分隔符） |

### ③ 其他

| 项 | 现状 |
|---|---|
| `windCodes` 类型 | `quote_get_realtime_indicators` 是逗号分隔 **`string`**，全 132 工具唯一（其余 13 处均 `array`） |
| 嵌套参数对象 3 个名字 | `params`（quote_get_historical_dataseries）/ `parameter`（general_get_indicatordata，单数）/ `condition`（general_get_dataset） |
| 条数上限 2 个名字 | `maxCount`(def 5) / `topK`(def 3) |
| ID 后缀混用 | `documentId` `reportId` `templateId` 用 Id，`indicatorCode` 用 Code |
| `required`+`default` 矛盾 | `quote_get_realtime_indicators.indexes` 标 required 却带 8 个默认指标 |
| `title` 缺失 7/32 | `quote_search_realtime_indicators.keyword`、`general_search_datasets.keyword`、`general_get_dataset.reportId`+`condition`、`general_search_research_insight.keyword`、`general_get_research_insight.templateId`+`arg` |
| 工具前缀 | `quote_*`(3) + `general_*`(10)，双前缀 |

### ④ 改名后描述残留

- `general_search_documents.endDate` 描述仍写「与 **beginDate** 可单独或同时使用」
- `params.startDate` 描述仍是 **`YYYYY-MM-DD`（5 个 Y）**，且与 `params.endDate` 都标注「8位数字」（实际 10 位）
- `params.rangeflag` 描述已同步更新 ✅

## 四、已统一 ✅

`keyword`(5 工具)、`question`(2)、`windCode`(4)，全部 camelCase。

## 五、建议

| P | 动作 |
|---|---|
| P0 | `general_get_document.documentType` 接受中文值（与 `general_search_documents` 输出直连），或 search 结果直接返回英文码 |
| P0 | 清描述残留：`beginDate` 字样、`YYYYY-MM-DD` 笔误、「8位数字」说法 |
| P1 | `general_query_documents` 的 `startDate`/`endDate` 支持纯 `YYYY-MM-DD`；dataset 动态 schema 的 `YYYYMMDD` 统一为 `YYYY-MM-DD` |
| P1 | `windCodes` 改 `array<string>`（或两者都收） |
| P2 | `docType` → `documentType`；`parameter` → `params`；`maxCount` → `topK` 或统一 `limit` |
| P2 | `indicatorCode` 与 `*Id` 后缀二选一 |
| P3 | 补 7 个 `title`；解开 `indexes` 的 required+default |

---

> 逐工具的边界 / 入参 / 故意错误 / 工具协同专项测试见 [`test-report-finance-data.md`](test-report-finance-data.md)。

## 描述正确性复核（2026-09-07）

13 个工具全部实调，比对 `description` 与真实返回。

### ① P0：`general_query_data` 的【返回】结构描述完全错误

描述：「返回 JSON 对象，其中 **`data.内容`** 为**标准 Markdown 表格文本**」

实际：

```json
{"data":{"data":[{"columns":[{"name":"Wind代码","type":"string"},
 {"name":"最新收盘价","type":"number","unit":"元"},…],
 "rows":[["600519.SH","贵州茅台",1321.99,"20260907 10:56:46","20260907","CNY"]]}]},"error":null}
```

没有 `内容` 字段，也不是 Markdown，是 `columns`/`rows` 结构化表。按描述去取 `data.内容` 必然拿到 `undefined`。

### ② `general_get_document` 的返回字段随 documentType 变化，描述未说明

描述：「返回单篇文档的编号、标题、类型、发布日期、**作者**、来源、**正文内容**及**附件链接**」

实测三种类型（均使用 `general_search_documents` 当场取回的新鲜 `documentId`）：

| documentType | 实际字段 | 正文 |
|---|---|---|
| `news` 新闻 | 编号/标题/类型/发布时间/来源/文档内容/原文链接 | **恒为空串**（3/3 篇） |
| `na` 公告 | 编号/标题/类型/发布时间/文档内容（**无来源、无原文链接**） | ✅ 1140 字 |
| `rpp` 研报 | 编号/标题/类型/发布时间/来源/文档内容/原文链接（**空**） | ✅ 941 字 |

- **没有 `作者` 字段**——研报的作者藏在 `来源` 的嵌套 JSON 里：`{"机构":"西南证券","作者":"朱会振，舒尚立"}`
- **没有「附件链接」**，只有 `原文链接`，且公告类不返回、研报类为空
- 新闻类拿不到正文，只能靠 `原文链接` 自行抓取

另：09-05 记录的「`general_get_document` 需动态 documentId」已复现——用过期占位符返回 `isError=true` +「文档详情数据为空」；换新鲜 id 即正常。

### ③ `general_search_documents` 的 `documentType` 描述与自身 enum 矛盾

```
description: "文档类型,必填。可选值: 新闻、公告、研报。"
enum:        ["news","na","rpp"]
```

同一字段里中文取值与英文 enum 并存。而下游 `general_get_document` 的同名字段描述写的是 `news (新闻), na (公告), rpp (研报)`——两处口径不一致。

### ④ `general_search_documents.endDate` 引用了不存在的参数名

> 「结束日期…与 **`beginDate`** 可单独或同时使用。」

该 server 没有 `beginDate`，配对参数是 `startDate`（其自身描述里写的是「与 `endDate` 可单独或同时使用」，方向正确）。

### ⑤ 返回内容里泄漏内部备注

`general_search_datasets` 的报表 `description` 字段原样透出内部记录：

```
"内地市场股本股东.机构投资者（合并同机构明细）。reportPeriod按位或，前端默认25；
 常用年报=8。来源：任务.xlsx；Cloud验证通过"
```

「来源：任务.xlsx」「Cloud验证通过」「前端默认25」属于内部研发备注，不应出现在对外描述里。

### ⑥ `inputSchema.title` 泄漏内部类名

| 工具 | schema.title |
|---|---|
| `general_search_research_insight` | `MetaContentListArguments` |
| `general_get_research_insight` | `FinanceGetReferenceArguments` |

### ⑦ `quote_get_realtime_indicators` 仍不可用

`isError=true` +「服务暂时不可用，请稍后重试」，与 09-05 记录一致（09-04 曾正常）。同 server 的 `quote_search_realtime_indicators`、`quote_get_historical_data_series` 均正常。

### ⑧ 描述与实际一致的部分 ✅

`quote_search_realtime_indicators`（只返回 `enName`/`cnName` 元信息，不返回数值）、`general_search_indicators`（返回参数定义 Schema 与调用示例）、`general_get_indicator_data`、`general_get_dataset`、`general_search_documents`、`general_query_documents`、`general_search_research_insight`、`general_get_research_insight`、`quote_get_historical_data_series` 的【返回】与实际回包吻合。

### 建议

| P | 动作 |
|---|---|
| **P0** | 修正 `general_query_data`【返回】：没有 `data.内容`，也不是 Markdown |
| **P1** | `general_get_document`【返回】按 documentType 分别说明字段集；说明新闻类无正文；作者字段独立出来或说明它嵌在 `来源` 里 |
| **P1** | `general_search_documents.documentType` 描述改用英文 enum 值，与 `general_get_document` 对齐 |
| **P1** | `endDate` 描述里的 `beginDate` → `startDate` |
| **P1** | `general_search_datasets` 的报表描述做脱敏，去掉「任务.xlsx」「Cloud验证通过」等内部备注 |
| P2 | `inputSchema.title` 改为工具名，不要透出 `*Arguments` 类名 |
| P2 | `quote_get_realtime_indicators` 恢复可用性 |
