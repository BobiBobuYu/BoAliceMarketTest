# vserver_finance_data 逐工具测试报告

测试日期 **2026-09-07**　endpoint `https://mcp.wind.com.cn/vserver_finance_data/mcp/`　工具 **13 个** / 参数 32 个

用例 **130 条**：正常调用 55（每工具 ×5）、边界 44、故意错误 31，另加链式协同 6 组与 `period`/`windCode` 过滤专项复验 20 次。

## 一、正常调用错误率

| 工具 | 通过 | 平均耗时 | 返回体积 |
|---|---|---|---|
| `quote_search_realtime_indicators` | **5/5** | 1951 ms | 284 B |
| `quote_get_realtime_indicators` | **5/5** | 1530 ms | 244 B |
| `quote_get_historical_data_series` | **5/5** | 2159 ms | **223978 B** ⚠️ |
| `general_search_indicators` | **5/5** | 1105 ms | 501 B |
| `general_get_indicator_data` | **5/5** | 1482 ms | 130 B |
| `general_search_datasets` | **5/5** | 1357 ms | 3108 B |
| `general_get_dataset` | 未纳入 ×5（需动态 reportId，见协同章） | — | — |
| `general_search_documents` | **5/5** | 1427 ms | 2930 B |
| `general_get_document` | 未纳入 ×5（需动态 documentId，见协同章） | — | — |
| `general_query_documents` | **5/5** | 3644 ms | 9035~16753 B |
| `general_search_research_insight` | **5/5** | 1156 ms | 20587 B |
| `general_get_research_insight` | **5/5** | 986 ms | 2313 B |
| `general_query_data` | **5/5** | 2120 ms | 359 B |
| **合计** | **55/55 = 100%** | 1720 ms | — |

**本 server 是四个里最快的**（平均 1720 ms）。

**`quote_get_realtime_indicators` 已恢复**——09-05 和 09-07 上午都是 `isError` +「服务暂时不可用」，本轮 5/5 通过，复验亦正常。此前的"已知故障"应解除。

**`quote_get_historical_data_series` 返回 224 KB 需要警惕**——同一组参数在 09-07 上午返回的是 1775 B（20 行日 K × 5 列），下午变成 4840 行 1 分钟数据 × 2 列。见第二章。

---

## 二、❌ P0：`quote_get_historical_data_series` 的 `period` 完全失效，`indexes` 部分失效

该工具【功能】声明提供「按周期聚合的历史 K 线（1/5/…/240 分钟、日/周/月/季/半年/年）」，schema 里 `period` 定义了 15 档编码（`10=日K`、`11=周K`、`12=月K`、`1=1分钟`、`4=10分钟`…）。

### `period` 无效

固定 `windCode=600519.SH, type="1", rangeflag=2, startDate=2026-08-01, endDate=2026-08-29, indexes="TIME,OPEN,HIGH,LOW,MATCH"`：

| period | 语义 | 实际返回 |
|---|---|---|
| `10` | 日 K | 4840 行，`2026-08-03T09:30` → `2026-08-28T15:00` |
| `11` | 周 K | **完全相同** 4840 行 |
| `1` | 1 分钟 | **完全相同** 4840 行 |
| `4` | 10 分钟 | **完全相同** 4840 行 |

换窄区间 `2026-08-25 ~ 2026-08-26` 复验：`period=10`（日K）与 `period=12`（月K）都返回 **484 行**（2 交易日 × 242 根 = 1 分钟线）。

**四档周期返回完全一致的 1 分钟数据 → `period` 参数是死的，工具退化为"只能取 1 分钟线"。**

`rangeflag=0 + count=5` 同样受影响：返回 5 行，但是 `2026-09-07T09:30 → 09:34` 的 5 根**1 分钟**线，而非 5 个日 K。

### `indexes` 只支持 3 个字段

| indexes 请求 | 实际 headers |
|---|---|
| `TIME,MATCH` | `['TIME','MATCH']` ✅ |
| `TIME,VOLUME` | 2 列 ✅ |
| `TIME,OPEN,HIGH,LOW,MATCH`（5 字段） | **`['TIME','MATCH']`** —— OPEN/HIGH/LOW 被丢弃 |
| `TIME,OPEN,HIGH,LOW,MATCH,VOLUME`（6 字段） | **3 列（TIME/MATCH/VOLUME）** |

schema 明确列了 `OPEN=开盘、HIGH=最高、LOW=最低`，实际全部拿不到。

### 会话内退化

同一组参数，09-07 上午返回 `[["2026-08-03T00:00:00...","1350.60","1363.35","1346.00","1358.98"]]`——20 行日 K × 5 列，完全正常。下午退化为 4840 行 1 分钟 × 2 列。**这是会话期间发生的退化，不是长期状态。**

### 其它入参

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `windCode` | 「缺少必填参数: windCode」 | ✅ |
| `type="0"` 分时 | 7436 B 分时 | ✅ |
| 不传 `type` | 与 `type="0"` **完全相同** | ⚠️ 描述未说明默认值 |
| `type="2"` 非枚举 | **静默返回分时** | ❌ enum 未校验 |
| `type=1` 传数字 | 返回 233 B / 4 列 OPEN,HIGH,LOW,MATCH（**与 `type="1"` 不同**） | ❌ 类型不同走不同分支 |
| 不传 `params` | 与 `type="0"` 相同 | ✅ |
| **忘记 `rangeflag`（只给区间）** | **仍返回 222762 B 完整区间数据** | ❌ 描述说「仅 rangeflag=2 时生效」，实际不传也生效 |
| `startDate > endDate` | **「服务暂时不可用，请稍后重试」** | ❌ 文案掩盖真因 |
| 未来区间 | `{"data": [], "headers": [...]}` | ✅ 干净空结果 |
| `params` 传字符串 | **「服务暂时不可用」** | ❌ 应报类型错误 |

另：`endDate` 描述写「格式 YYYY-MM-DD（**8位数字**）」——YYYY-MM-DD 是 10 字符，自相矛盾（09-04 已记录，本轮仍在）。

---

## 三、❌ P0：`general_search_documents` 的 `windCode` 对新闻类失效

| 入参 | 总数量 | 首条标题 |
|---|---|---|
| 只 `documentType=news` | 100000 | 刚刚官宣：仙林德基，本月26日开业！ |
| `+windCode=600519.SH` | **100000** | **多行业联合红利资产8月报：周期资源品现金流改善**（与茅台无关） |
| `+keyword=茅台` | 10000 | 临近中秋，老茅台走强… |
| `+windCode + keyword` | **10000**（与只有 keyword 相同） | 同上 |
| `+startDate/endDate` | 30956 | — |

换标的复验：`documentType=news, windCode=002594.SZ`（比亚迪）→ 100000 条，首条「一周产业观察：政策倒逼资本出手，汽车供应链话语权迎来重分配」，与比亚迪无关。

**但公告和研报类正常**：

| 入参 | 总数量 | 首条 |
|---|---|---|
| `documentType=na, windCode=600519.SH` | **1231** | 贵州茅台:关于会计政策变更的公告 ✅ |
| `documentType=rpp, windCode=600519.SH` | **830** | 贵州茅台（600519.SH）：茅台酒稳健… ✅ |

`windCode` 本身是被校验的（传 `999999.SH` → 「未识别到有效的金融标的」），**解析通过后在新闻查询里被丢弃**。

同样是会话内退化：09-07 上午 `documentType=news, windCode=600519.SH` 返回总数量 **473**，首条「食品饮料行业资金流入榜：贵州茅台等5股净流入资金超亿元」，过滤完全正常。

---

## 四、❌ P0：`general_query_data` 的【返回】结构描述完全错误

> 【返回】「返回 JSON 对象，其中 **`data.内容`** 为**标准 Markdown 表格文本**」

实际：

```json
{"data":{"data":[{"columns":[{"name":"Wind代码","type":"string"},
 {"name":"最新收盘价","type":"number","unit":"元"},…],
 "rows":[["600519.SH","贵州茅台",1321.99,"20260907 10:56:46","20260907","CNY"]]}]},"error":null}
```

没有 `内容` 字段，也不是 Markdown。按描述取 `data.内容` 必得 `undefined`。

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `question` | 「缺少必填参数: question」 | ✅ |
| `""` | 「问句为空」 | ✅ |
| **非金融问句「今天天气怎么样」** | **返回西安/南京最低气温序列** | ❌ 与 `stock_screener` 同源，无领域约束 |
| 跨市场「腾讯控股和苹果的最新市值」 | ✅ 298 B | ✅ |

---

## 五、`general_get_document` 的返回字段随 documentType 变化

【返回】声明「返回单篇文档的编号、标题、类型、发布日期、**作者**、来源、**正文内容**及**附件链接**」。实测（documentId 全部由 `general_search_documents` 当场取回）：

| documentType | 实际字段 | 正文长度 |
|---|---|---|
| `news` 新闻 | 编号/标题/类型/发布时间/来源/文档内容/原文链接 | **0**（复现 4/4 篇） |
| `na` 公告 | 编号/标题/类型/发布时间/文档内容（**无来源、无原文链接**） | 1140 ✅ |
| `rpp` 研报 | 编号/标题/类型/发布时间/来源/文档内容/原文链接（**空**） | 941 ✅ |

- **没有 `作者` 字段**——研报作者嵌在 `来源` 里：`{"机构":"西南证券","作者":"朱会振，舒尚立"}`
- **没有「附件链接」**，只有 `原文链接`，公告类不返回、研报类为空
- 新闻类拿不到正文，只能靠 `原文链接` 自行抓取

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `documentId` | 「缺少必填参数: documentId」 | ✅ |
| `documentId` 伪造 | 「文档详情数据为空」 | ✅ |
| `documentType="新闻"`（非枚举） | **静默接受，正常返回** | ❌ enum 未校验 |

另：`documentId` 描述有笔误「通常**通常**从general_search_documents…」

---

## 六、其余工具逐项

### 6.1 `quote_search_realtime_indicators`　`keyword*`

| 用例 | 结果 | 评价 |
|---|---|---|
| 「最新价」 | ✅ 6 个候选 | ✅ |
| 英文 `NEWPRICE` | ✅ 3 个候选 | ✅ 与描述"英文名"一致 |
| 拼音 `zuixinjia` | ✅ 382 B | ✅ 与描述"拼音"一致 |
| 无匹配 | `[]` | ✅ 干净空 |
| **`""` 空字符串** | **「服务暂时不可用，请稍后重试」** | ❌ 应报"参数为空" |

### 6.2 `quote_get_realtime_indicators`　`windCodes*` / `indexes*(default 8 字段)`

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `windCodes` / 缺 `indexes` | 均正确报「缺少必填参数」 | ✅ |
| `indexes=""` 测 default | ✅ 410 B，返回 8 个默认字段 | ✅ default 真实生效 |
| 跨品种 `600519.SH,00700.HK,IF2609.CFE` | ✅ 3 行 | ✅ 与描述一致 |
| 中文名「贵州茅台」 | ✅ | ✅ |
| **`windCodes` 传数组** | **静默接受并正常返回** | ⚠️ 描述说逗号分隔 string |
| `indexes` 非法字段名 | `Invalid value '不存在的指标XYZ' for field 'indexes'` | ✅ **有枚举校验** |

### 6.3 `general_search_indicators`　`keyword*` / `windCode` / `maxCount(default 5)`

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `keyword` | 「缺少必填参数: keyword」 | ✅ |
| **`maxCount` = 1 / 0 / -1 / 100** | **四者返回完全相同的 501 B** | ❌ **`maxCount` 完全不生效** |
| `windCode=00700.HK` 过滤 | 997 B（比不传多） | ✅ 与描述"按证券品种过滤"一致 |
| 无匹配 | `{"indicators": []}` | ✅ |

返回项含 `指标名称/指标代码/单位/指标释义/参数定义Schema/调用示例` ✅ 与【返回】描述完全吻合。

### 6.4 `general_get_indicator_data`　`windCode*` / `indicatorCode*` / `parameter`

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `indicatorCode` | 「缺少必填参数: indicatorCode」 | ✅ |
| `indicatorCode` 不存在 | 「没有找到 not_a_code 指标」 | ✅ 文案精准 |
| `windCode` 不存在 | 「未识别到有效的金融标的:999999.SH」 | ✅ |
| 港股 `00700.HK` | ✅ 收盘价 442.8 元 | ✅ |
| `parameter:{"交易日期":"1年前"}` | ✅ 返回 2025-09-05 收盘价 1483 元 | ✅ 参数真实生效 |
| `parameter:{"交易日期":"1月前"}` | ✅ 2026-08-07，1309.22 元 | ✅ |
| **`parameter` 非法枚举值** | **`{"failed": [], "success": []}`** | ❌ 静默空结果，不报错 |
| `parameter:{"复权方式":"后复权"}` | 单位从「元」变「**万元**」，数值 1.2317 | ⚠️ 单位随取值动态切换，调用方必须读 `单位` 字段 |

### 6.5 `general_search_datasets` / `general_get_dataset`

| 用例 | 结果 | 评价 |
|---|---|---|
| 不传 keyword | 63769 B 全部报表 | ✅ |
| 无匹配 | 「无相应搜索内容」 | ✅ |
| `get_dataset` 缺 `condition` | 「缺少必填参数: condition」 | ✅ |
| `reportId` 不存在 | 「Report id NoSuchReport 不存在」 | ✅ 文案精准 |
| `condition` 缺必填字段 | 「Parameter windCode is required」 | ✅ |
| **`condition` 加 schema 外字段** | **正常返回 44515 B** | ❌ 描述明写「**禁止添加 schema 没有的字段**」，实际不校验 |

**返回内容泄漏内部备注**：`general_search_datasets` 的报表 `description` 原样透出
`"…reportPeriod按位或，前端默认25；常用年报=8。来源：任务.xlsx；Cloud验证通过"`——「任务.xlsx」「Cloud验证通过」「前端默认25」属研发内部记录。

### 6.6 `general_search_documents` 的 `documentType` 描述自相矛盾

```
description: "文档类型,必填。可选值: 新闻、公告、研报。"
enum:        ["news","na","rpp"]
```

同一字段里中文取值与英文 enum 并存，而下游 `general_get_document` 写的是 `news (新闻), na (公告), rpp (研报)`——两处口径不一致。实测传中文「新闻」被静默接受。

另：`endDate` 描述写「与 **`beginDate`** 可单独或同时使用」——该 server 没有 `beginDate`，配对参数是 `startDate`。

其余边界：日期区间过滤 ✅、未来区间 ✅、`start>end` ✅ 均正常。

### 6.7 `general_query_documents`　`question*` / `docType` / `queryMode` / `topK` / `startDate` / `endDate`

| 用例 | 结果 | 评价 |
|---|---|---|
| 缺 `question` | 「缺少必填参数: question」 | ✅ |
| `topK=1` / `50` | 3679 B / 41444 B | ✅ 生效 |
| `topK=0` | **13458 B（非空）** | ❌ 无下界校验 |
| `docType=["3"]` 公告 | 224033 B 年报 | ✅ |
| **`docType=["9"]` 非法** | **静默返回新闻** | ❌ 未校验 |
| `queryMode="1"` | ✅ 6548 B | ✅ |
| **`queryMode="9"` 非枚举** | **静默返回数据** | ❌ enum 未校验 |
| 日期带时分秒 | ✅ 12767 B | ✅ 与描述一致 |
| **日期只给纯日期** | 静默接受，但返回的 `url` 全部为 `null` | ⚠️ 格式不符时降级，无提示 |

### 6.8 `general_search_research_insight` / `general_get_research_insight`

| 用例 | 结果 | 评价 |
|---|---|---|
| 按关键词「公司战略」 | ✅ T306 | ✅ |
| 按模板 ID「T305」 | ✅ | ✅ |
| 无匹配 | `[]` | ✅ |
| 缺 `templateId` | 「缺少必填参数: templateId」 | ✅ |
| `templateId` 不存在 | `[]` | ⚠️ 空数组而非报错 |
| `T305` + `arg=600519.SH` | ✅ 1662 B 可比公司分析 | ✅ |
| **`T001` + 多余的 `arg`** | **`[]`** | ❌ T001 不需要 `arg`，多传一个无关参数就变空结果——不是被忽略而是被"用坏" |

`inputSchema.title` 泄漏内部类名：`general_search_research_insight` → `MetaContentListArguments`；`general_get_research_insight` → `FinanceGetReferenceArguments`。

---

## 七、工具协同（6 条链路全部通过）

| 链路 | 传递字段 | 结果 |
|---|---|---|
| `quote_search_realtime_indicators` → `quote_get_realtime_indicators` | `enName` → `indexes` | ✅ `AFTERCHANGERATIO` |
| 同上 | `cnName` → `indexes` | ✅ 「盘后涨跌幅」，返回 headers 统一归一为 enName |
| `general_search_indicators` → `general_get_indicator_data` | `指标代码` → `indicatorCode`，`调用示例.parameter` → `parameter` | ✅ **`调用示例` 可整个作为入参直接使用** |
| `general_search_datasets` → `general_get_dataset` | `id` → `reportId`，`exampleCondition` → `condition` | ✅ **`exampleCondition` 可直接搬运** |
| `general_search_documents` → `general_get_document` | `文档编号` → `documentId` | ✅ news/na/rpp 三类全通 |
| `general_search_research_insight` → `general_get_research_insight` | `templateId` + `exampleCondition.arg` | ✅ T306 |

**协同设计是四个 server 里最完善的**——`search_*` 类工具直接给出可执行的 `调用示例` / `exampleCondition`，下游照搬即可。

唯一坑：`documentType` 上游字段描述写中文、enum 是英文，且上游返回体里的 `文档类型` 是中文（「新闻」），下游要传英文（`news`），需要人工映射。

---

## 八、汇总

| 维度 | 通过率 |
|---|---|
| 正常调用 | **55/55 = 100%** |
| 边界用例（行为合理） | 39/44 |
| 故意错误（被正确拦截） | 12/31 |

### 问题清单

| P | 工具 | 问题 |
|---|---|---|
| **P0** | `quote_get_historical_data_series` | `period` 完全失效（4 档周期返回相同 1 分钟数据）；`indexes` 丢弃 OPEN/HIGH/LOW；会话内从"正常日K"退化 |
| **P0** | `general_search_documents` | `windCode` 对 `news` 类型完全失效（返回 100000 条无关新闻），`na`/`rpp` 正常；会话内退化 |
| **P0** | `general_query_data` | 【返回】说 `data.内容` 是 Markdown，实际是 `columns`/`rows`，字段不存在 |
| **P1** | `general_get_document` | 字段集随 documentType 变化未说明；**新闻类正文恒为空**；无「作者」「附件链接」字段 |
| **P1** | `general_search_indicators` | `maxCount` 完全不生效（1/0/-1/100 返回相同） |
| **P1** | `general_search_documents` | `documentType` 描述写中文取值、enum 是英文，自相矛盾；`endDate` 描述引用不存在的 `beginDate` |
| **P1** | `general_search_datasets` | 返回内容泄漏内部备注（「任务.xlsx」「Cloud验证通过」「前端默认25」） |
| **P1** | `general_get_research_insight` | 给不需要 `arg` 的模板多传 `arg` → 空结果而非忽略 |
| P2 | `quote_get_historical_data_series` | `rangeflag` 不传也生效（描述说仅 rangeflag=2 生效）；`type` enum 未校验且 `"1"` 与 `1` 走不同分支 |
| P2 | `general_query_documents` | `queryMode` / `docType` / `topK=0` 均未校验；纯日期格式静默降级导致 `url` 为 null |
| P2 | `general_get_dataset` | 描述「禁止添加 schema 没有的字段」未被执行 |
| P2 | 多处 | 空参数 / 类型错误 / `start>end` 返回「服务暂时不可用」，掩盖真实原因 |
| P3 | 2 个工具 | `inputSchema.title` 泄漏内部类名 `MetaContentListArguments` / `FinanceGetReferenceArguments` |
| P3 | `quote_get_historical_data_series` | `endDate` 描述「YYYY-MM-DD（8位数字）」自相矛盾 |
| P3 | `general_get_document` | `documentId` 描述「通常通常从…」笔误 |

### 结论

**响应最快（1720 ms）、链式协同设计最好（6/6 通过，`调用示例`/`exampleCondition` 可直接搬运）、`quote_get_realtime_indicators` 已从故障中恢复。**

但也是四个 server 里 P0 最多的：两个核心取数工具在会话期间发生功能退化（K 线周期失效、新闻标的过滤失效），且都是**静默返回错误数据而非报错**——调用方拿到的是"看起来正常"的 224 KB 分钟线和 10 万条无关新闻。加上 `general_query_data` 的返回结构描述错误，三处都会让照文档编码的调用方直接拿到错误结果。
