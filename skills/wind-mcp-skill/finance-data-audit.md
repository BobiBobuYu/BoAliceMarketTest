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
