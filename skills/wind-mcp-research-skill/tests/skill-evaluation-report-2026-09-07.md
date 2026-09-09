# wind-mcp-research-skill 测评与优化报告

- 测评日期：2026-09-07
- 测评对象：`skills/wind-mcp-research-skill`（Wind 万得金融与企业数据 Skill）
- 测评环境：Windows 10 / Node v22.18.0 / Git Bash，`WIND_SKILL_NO_UPDATE=1`
- 测评方式：真实 API Key 在线调用 + 离线测试套件 + 人工误用探针
- 结论先行：**可用且好用**。契约内调用后端错误率 0%，误用 100% 被本地拦截、100% 可按错误信封自修正；常驻上下文约 4.3K token。本轮已修复僵尸工具与 schema 漂移同步问题，测试从 99 项扩到 113 项，全部通过。

---

## 1. 可用性

| 检查项 | 结果 |
| --- | --- |
| API Key | ✅ 有效（`~/.wind-aifinmarket/config`） |
| 7 个 MCP server 连通性 | ✅ 全部连通（finance 13 / stock 15 / fund 21 / edb 3 / futures 7 / options 11 / company 54，共 123 个工具） |
| 离线契约测试 `run-offline-tests.mjs` | ✅ 63/63 |
| 边界测试 `run-boundary-tests.mjs` | ✅ 50/50（原 36 项，本轮扩充） |
| 数据正确性抽查 | ✅ 贵州茅台画像返回全称与代码一致；EDB 单位/币种元数据与文档警告一致 |

## 2. 出错率与自修正率（16 个真实调用）

### 2.1 契约内合法调用（10 个）

**10/10 成功，后端错误率 0%。**

| 调用 | 返回 |
| --- | --- |
| stock / stock_get_company_profile | OK 18.6 KB |
| stock / stock_get_company_finance_analysis | OK 11.9 KB |
| fund / fund_get_nav | OK 0.4 KB |
| company / company_get_registration_info | OK 1.8 KB |
| company / company_get_discredit | OK 0.3 KB |
| futures / futures_get_warehouse_receipt（中文别名「仓单」） | OK 0.3 KB |
| edb / economic_query_indicator_series | OK 0.5 KB |
| edb / economic_search_indicator | OK 7.4 KB |
| options / options_get_listed_terms | OK 1.0 KB（首试漏 `tradeDate`，按信封一步修正） |
| finance / quote_get_historical_data_series | OK 2.2 KB（首试嵌套 `params` 形状错，按 describe 样例两步修正） |

> 首轮测评中 `quote_get_realtime_indicators` 报过「服务暂时不可用」，复测确认是参数形状错误所致，修正后即成功，非后端故障。

### 2.2 误用探针（凭印象猜工具名/参数，8 个）

**8/8 被本地拦截（不发网络、不消耗积分），8/8 按信封指引 1–2 步内修正成功。**

- 误用出错率：8/16 = 50%（全部由测评方主动造成，非 skill 缺陷）
- **自修正率：100%**。错误信封精确到字段级（如「缺少必填参数 'tradeDate'」「'windCodes' 应为 array，实际是 string」），`next` 给出明确动作，`hint` 附带 `describe` 命令。

### 2.3 两段式调用链

edb 链路一次通过：`economic_search_indicator`（自然语言）→ 取到指标代码 `M5567876` → `economic_get_indicator_series` 按代码取 5 期季度 GDP 序列。

## 3. 上下文占用（token 精算，中文 ≈ 1 token/字）

| 层 | 内容 | token |
| --- | --- | --- |
| 常驻（自动加载） | SKILL.md | **≈ 4,300** |
| 按需 · 选工具 | `find` 单次输出 | 200–1,500（实测最高 4.3 KB，超出文档宣称的「约 0.5 千字」） |
| 按需 · 契约 | `describe` 单工具 | 300–1,000 |
| 按需 · 兜底目录 | references/*.md（edb 1,323 ～ company 4,448） | 1,300–4,400 |
| 按需 · 调用返回 | 典型窄返回 < 300；最大为公司画像 18.6 KB | < 300 ～ **≈ 6,500** |

- 典型一次查询上下文增量：≈ 1,000–3,000 token
- 最坏路径（首次加载 + 读目录 + 大返回体）：≈ 12,000 token
- **单次调用最大 token 消耗**：`stock_get_company_profile` ≈ 6,500 token（无收窄参数）

## 4. 本轮执行的更新与修复

### 4.1 refresh 与僵尸工具清理

- 执行 `node scripts/cli.mjs refresh fund edb futures options`：`fund` 完全对齐。
- 发现 `refresh` 只覆盖 schema、保留 `annotations.json` 人工内容，导致 9 个后端已下线工具成为"僵尸"：`options_calc_barrier / asian / accumulator / single_shark_fin / autocall_snowball / hv_cone`，`futures_get_warehouse_receipt_details / related_securities / research_opinion_stat`。已从 `annotations.json` 与 `registry.json` 手动删除并重算 `toolCount` / `paramCount`。
- 全部「132 个工具」计数同步改为 **123**（SKILL.md、测试阈值、tests/README.md）。

### 4.2 后端 schema 抖动（漂移根因）

- 同一 server 连续两次 listTools 返回不同参数列表：`edb` 的 `observation` 改名 `numOfObservation`；`futures` 多个工具参数反复增删。
- 已同步修正：annotations/registry 中 edb 两个工具的样例参数名；`run-offline-tests.mjs` 3 处用例（互斥、类型、错误码路由）。
- 这是漂移反复出现的根因，**不是本地 bug**；doctor 报的 futures 残余漂移（`futures_get_research_opinion` 线上有/本地无）即由此产生。

### 4.3 测试扩充与去重

- 新增 14 项边界用例：integer 传浮点/数字字符串、enum 中文别名等价放行且原样送达后端、别名大小写变体拦截、非日期字符串、`find` 空关键词与正则元字符、`find 中文` 命中、`describe` 未知工具近似名、指定参数裁剪、HTTP 200 返回网关 HTML、JSON-RPC 缺 `content` / 缺 `text` 字段、参数 JSON 带前后空白。
- 删除 1 项与离线套件重复的 live 日期颠倒用例。
- 跨套件的"近似重复"（如 INVALID_PARAMS_JSON 的内联 / 文件两条）路径不同，建议保留。

## 5. 可优化建议

### 已完成（本轮）

1. 僵尸工具清除；2. 工具计数 132→123；3. `observation`→`numOfObservation` 同步；4. 测试扩至 113 项。

### 待办（按优先级）

| # | 建议 | 优先级 | 预期收益 |
| --- | --- | --- | --- |
| 1 | `refresh` 自动剔除线上已移除且无人工 `known_issue` 标记的工具，有标记的列出待人工确认 | 高 | 消除僵尸工具复发，本次为手工修复 |
| 2 | doctor 漂移判定防抖：连续两次采样一致才报漂移，或对同一 server 多次 listTools 取交集 | 高 | 消除后端 schema 抖动造成的误报 |
| 3 | `stock_get_company_profile`（18.6 KB）、`stock_get_company_finance_analysis`（11.9 KB） 叙述型返回加 `--fields` 或摘要模式 | 高 | 单点最多省 ≈ 6K token |
| 4 | `find` 输出 hits 封顶 3、`summary` 截断为一句，稳压在 1.5 K 内 | 中 | 选工具阶段省 ≈ 1–3K token |
| 5 | 嵌套 object 参数报错时自动附该字段的 `sample_value`（本次 `quote_get_historical_data_series.params` 踩坑两步才修好） | 中 | 降低嵌套参数的修正步数 |
| 6 | `backend_error` 的 `next` 加明确退避指引（≥30 秒后重试或改用兜底工具） | 低 | 减少无效重试 |

### 结构评价

分层按需加载的设计合理：路由表常驻（4.3K）、契约按需 `describe`、`registry.json` 明确不给 agent 读，且用测试卡死目录体量上限（单份 ≤ 1 万字、合计 ≤ 4 万字）。这套约束在同类 skill 中克制且自洽，**不建议动骨架**。常驻上下文已接近下限；再压缩只能精简 frontmatter 超长 description 与第 5 节示例，预估再省 1–1.5K，收益小于上表第 3、4 条。

## 6. 改动清单（未提交 git，共 13 个文件）

```
M  SKILL.md                              # 132→123
M  references/*.md (7 份)                 # refresh 重新生成
M  scripts/annotations.json               # 删 9 个僵尸工具；edb 样例参数名修正
M  scripts/registry.json                  # 删 9 个僵尸工具；toolCount/paramCount 重算；样例修正
M  tests/README.md                        # 132→123
M  tests/run-boundary-tests.mjs           # +14 用例、-1 重复用例
M  tests/run-offline-tests.mjs            # known_issue 用例换工具；3 处参数名修正；阈值 130→121
```

复验：`run-offline-tests.mjs` 63/63 ✅，`run-boundary-tests.mjs` 50/50 ✅，合法调用 10/10 ✅。

---

> 数据来源于万得 Wind 金融数据服务（本报告中的实测调用部分）。

---

# 第二轮：复核与补齐（同日 2026-09-07，Linux / Node v22.23.2）

上面 1–6 节是第一轮的记录。这一节逐条复核它的结论，并记下本轮实际做的改动。复核方式仍是**真实调用 + 离线套件**，凡是「实测」二字都对应一次真跑。

## 7. 第一轮结论的复核

| 第一轮的说法 | 复核结果 |
| --- | --- |
| 7 个 server / **123** 个工具 | ❌ 数字不自洽。它自己的分解式 `13+15+21+3+7+11+54` 等于 **124**；当时本地注册表里 futures 只有 6 个，线上一直是 7 个（`futures_get_research_opinion` 没收进来）。本轮 `refresh futures` 后已补齐。 |
| 9 个「僵尸工具」由 refresh 不删导致，建议让 refresh 自动剔除（建议 1） | ⚠ 结论对、根因错。options 那 6 个确实已下线（今日 listTools 只剩 11 个）。但 `buildRegistry` 的 `tools` 本来就是**只用线上结果重建**的，refresh 会自动去掉下线工具；真正会残留的是 `annotations.json` 里的孤儿样例，而 refresh 早就把它列在返回体的 `stale_annotations` 里了。**建议 1 已经是现状，不需要改代码。** |
| futures 参数反复增删是后端 schema「抖动」，建议 doctor 加防抖（建议 2） | ❌ 复核不成立，而且这条建议有害。今天连拉 3 次 `tools/list`，futures 七个工具的参数**完全一致**：`warehouse_receipt.type`、`position_ranking.type`、`supply_demand.type`、`contract_spec.fields` 是真的从线上 schema 里去掉了。加防抖只会把真实变更一起吞掉。**正确处理是 refresh + 把能力保住**——实测这四个参数后端仍然接受，而且是唯一的收窄手段：`supply_demand` 不传 `type` 返 7,612 字、传 `type:4` 只剩 1,597 字；`position_ranking` 不传 `type` 把九类排名一次全返（4,672 字），传了只要 510 字。本轮为此加了 `extraParams` 机制。 |
| 契约内调用后端错误率 0%（10 次真调） | ✅ 本轮把样本从 10 扩到全量：`run-smoke.mjs` 用注册表样例逐个真调 134 个工具（结果见 9.3）。 |
| 误用 100% 本地拦截、100% 可按信封自修正 | ✅ 与离线/边界套件一致。本轮新增的 `sample_value` 让嵌套 object 参数从两步修正降到一步。 |
| 常驻 ≈ 4,300 token | ⚠ 口径存疑。SKILL.md 当时 7,255 **字符**，中文按 0.6–1.0 token/字换算是 4.3K–7.2K，报告取了区间下限。本节起统一用**字符数**做口径，token 只作参考。 |
| `find` 实测最高 4.3 KB，超出文档宣称的「约 0.5 千字」（建议 4） | ✅ 属实，已修。见 9.2 的实测表。SKILL.md 里「约五百字」的说法也改成了「约 1 千字」。 |
| 大返回体加字段裁剪（建议 3） | ✅ 已实现 `--section` + `cli_meta.sections`。 |
| 嵌套 object 参数报错附样例（建议 5） | ✅ 已实现，报错信封直接给出该字段的实测样例形状。 |
| `backend_error` 的 next 加退避（建议 6） | ✅ 已实现（「最多再试一次，且要隔 30 秒以上」）。 |
| 「分层按需加载的骨架合理，不建议动」 | ✅ 同意，本轮没有动骨架，只在同一套骨架里加了两个 server 和三处输出收窄。 |

## 8. 第一轮漏掉的四个问题（均已修）

1. **业务错误嗅探有两个漏网形态**。旧规则是「文本 ≤200 字且命中错误词」，于是两类真错误被当成成功数据交出去：① 行情网关的 JSON 报错 `{"code":-2,"error":"QT:SQL对应的处理插件处理请求失败…"}`（实测 `USDCNY.EX`）；② 超过 200 字的纯文本报错（实测 `futures_get_contract_spec` 传中文 `fields` 返回 835 字的「未知的字段名…合法字段…」）。现在按结构判（`error` 非空 / `code` 为负）＋ 非 JSON 文本放宽到 1,500 字。
2. **「半成功」没有任何提示**。`get_index_price_indicators` 的 `indexes` 写错字段时，后端照常返回其余字段，只在返回体里塞一句 `message: 无效的行情指标:xxx`。现在提到 `cli_meta.backend_message`，并写进 SKILL.md 第 4 节的检查项。判定上明确区分：**带数据回来的不算整体失败**，不能把已经取到的数据丢掉。
3. **成功信封整层是转义**。后端数据在 `content[0].text` 里是一段 JSON 字符串，原样转发等于让调用方读一遍 `\"`。公司画像实测 18,629 字的 stdout 里约 4,100 字是转义和缩进。现在解包成真正的 JSON 并紧凑输出，一个字节不丢。
4. **`ROUTE_ERROR` 指向了一个不存在的命令**：提示写「用 `list-tools` 看全部工具」，而 `list-tools` 早就从命令面删掉了。已改成指向 `references/<server>.md`。

另外记录一个第一轮和本轮都遇到、但性质不同的现象：**后端 schema 会在同一天内改名**。本轮 02:38 refresh 拿到的 `company_get_court_announcements` 参数是 `timeFrom/timeTo`，03:00 再拉已经变成 `startDate/endDate`（连采 3 次一致）。这不是抖动而是滚动发布，应对办法是 refresh，并且 `未知参数` 的报错里现在会提示「若确认线上有这个字段，跑 refresh 后重试」。离线套件里有两条用例正好拿 `startDate` 当「未知字段」的样板，这次被这个改名打红了，已改用永远不会变合法的字段名。

## 9. 本轮改动

### 9.1 补进两个 server：`index` 与 `bond`

先做了覆盖度比对：把上一代 skill（`wind-mcp-skill`，7 个 legacy server / 35 个工具）逐个工具与本 skill 的 134 个工具对照，**legacy 的 7 个 endpoint 今日全部仍然在线**，其中：

| legacy server | 有没有替代 | 处置 |
| --- | --- | --- |
| `stock_data`（10） | 有。K 线/分时实测可由 `finance.quote_get_historical_data_series` 覆盖（`000300.SH` / `510300.SH` / `019742.SH` 全部取到数），档案股东由 `stock_get_company_profile` 覆盖（返回体里含股东列表、明细、质押统计），筛选由 `stock_screener` 覆盖 | 不收 |
| `fund_data`（10） | 基本有。仅「持有人结构」「基金公司档案」两项无专项工具 | 不收，改在 `fund` 的调用要点里指向 `finance.general_query_data` |
| `index_data`（6） | **没有**。本 skill 此前没有任何指数专项工具，指数问题只能落到被自己标为兜底的 `general_query_data` | **收** |
| `bond_data`（4） | **没有**。本 skill 此前一个债券工具都没有 | **收** |
| `financial_docs`（2） | 有。`finance.general_search_documents` / `general_query_documents` 覆盖 | 不收 |
| `economic_data`（2） | 有。`edb` 三个工具是其超集 | 不收 |
| `analytics_data`（1） | 有。同一个问题（「2026 年上半年 A 股所有上市公司归母净利润合计」）两边返回**完全相同**的 3.4912 万亿元 | 不收 |

收进来的 10 个工具全部真调验证通过，并按本 skill 的规矩补齐了人工注解（`boundary` / `sample` / `knownIssue` / 领域关键词 / 「最容易选错的」）。两处实测出来、值得单独记的坑：

- **指数估值口径跟着问句走**：问「沪深300 的加权市盈率」得 38.59（加权口径），问「沪深300 的市盈率」得 13.57（PE_TTM）。两个数都对，但混用就是错的答案。已写进 `index` 的调用要点和 SKILL.md 第 5 节。
- **债券估值字段常整列为空**：`019742.SH` 近一个月的中债估值收益率、修正久期、凸性全部返回 `null` 且不报错。已作为 `known_issue` 固化，要求如实报告而不是换工具凑数。

`find` 的排序也跟着改了一处：命中所在 server 的领域关键词对上时加 2 分。此前 `find 债券` 会把 `fund` 的券种配置排在 `bond` 前面（那几个工具的说明里确实有「债券」两个字），现在 `债券` → `bond`、`指数` → `index` 排第一，已用测试卡死。

### 9.2 上下文账（口径：字符数，实测）

| 项 | 改前 | 改后 | 变化 |
| --- | --- | --- | --- |
| SKILL.md（常驻） | 7,255 字 / 7 个 server / 123 个工具 | 7,121 字 / **9 个** server / **134 个**工具 | −1.8%，而覆盖多了 2 个 server、11 个工具 |
| `find` 十个关键词合计（字节） | 34,807 | 22,597 | **−35%** |
| 单次 `find`（最大，「行情」） | 5,097 字节 | 3,403 字节 | −33% |
| 公司画像单次返回 | 18,629 字 | 14,510 字 | **−22%**（去掉转义与缩进，数据一字不少） |
| 公司画像 + `--section 融资投向与项目进展` | 无此能力 | 约 700 字 | −96% |
| `references/*.md` 合计 | 9 份 39,879 字（单份上限 1 万字仍然卡死） | | |

十个关键词的逐项实测（字节，改前 → 改后）：债券 4,269→2,262；指数 4,211→2,562；仓单 2,388→1,874；失信 2,802→1,392；净值 4,187→2,353；财务 4,630→3,055；GDP 409→327；波动率 4,810→2,785；K线 2,004→1,584；行情 5,097→3,403。

省下来的三处都不减信息：`find` 是砍掉第 4、5 条详情（改为只给名字，仍可 `describe`）和每条重复的 describe 命令；返回体是去掉 JSON 转义与缩进；`--section` 是调用方自己点名，且丢掉了哪些段会写进 `cli_meta.dropped_sections`。

### 9.3 验证

- 离线契约测试：**72/72** 通过（原 63，本轮 +9：解包信封、`--section` 四条、半成功提示、`extraParams`、领域词排序、嵌套参数样例）。
- 边界测试：**59/59** 通过（原 50，本轮 +9：`index` 小写 `windcode`、`bond` 必填、`extraParams` 放行与送达、紧凑单行、两类漏网错误形态等）。
- `doctor`：9 个 server 全部连通，注册表漂移 0 条。
- 全量冒烟：见下节。

### 9.4 全量冒烟：134 个工具逐个真调

`node tests/run-smoke.mjs`（134 次真实请求，串行）：**通过 131 / 失败 3**。三个失败逐个复查：

| 工具 | 冒烟结果 | 复查（同参数重跑） | 判定 |
| --- | --- | --- | --- |
| `finance.quote_get_realtime_indicators` | 服务暂时不可用 | 仍然不可用（今日第 3 次） | 真实故障，2026-09-05 起持续。`known_issue` 已更新为「别重试，改用 `general_get_indicator_data` 或 `quote_get_historical_data_series`」 |
| `fund.fund_screener` | 服务暂时不可用 | ✅ 1,062 字，正常返回 232 只匹配 | 瞬时抖动 |
| `company.company_get_discredit` | 内部错误 | ✅ 连试两次都正常（11,792 字，437 条记录） | 瞬时抖动 |

也就是说，**契约内调用的稳定失败只有 1/134，且是已记录的服务端故障**；第一轮「后端错误率 0%」的结论在 10 个样本上成立，放大到全量后更准确的说法是：**0 例因契约/参数错误失败，1 例后端长期故障，2 例瞬时抖动可重试恢复**。

### 9.5 顺带修掉的一处会给出错误答案的文档

`company` 的「调用要点」写着五个司法/舆情工具用 `timeFrom`/`timeTo`、其余用 `startDate`/`endDate`。今日实测这条已经失真：这五个工具的线上 schema 与后端**都**是 `startDate`/`endDate`，而且后端从来只认后者。危险在于它不报错——2026-09-07 实测 `company_get_judgments`（恒大地产集团有限公司，2026-01-01~2026-03-31）：传 `startDate` 返 6 条且标题回显区间，传 `timeFrom` 返 2,278 条近 5 年全量、标题没有括号。按旧文档去写参数，拿到的是一个不报错的错误答案。

已经做的：把「调用要点」改成「一律传 `startDate`/`endDate`，判据是返回标题有没有回显区间」；给五个工具补上带日期的样例和 `known_issue`；把 `startDate`/`endDate` 钉进 `extraParams`，这样即使线上 schema 又回滚成 `timeFrom`，正确的字段名也不会被本地校验拦下。


## 10. 本轮改动清单

```
M  SKILL.md                       # 9 server / 134 工具；index+bond 路由与仲裁；--section、backend_message 两条读回执规则；整体从 7,255 字压到 7,121 字
M  scripts/cli.mjs                # 成功信封解包+紧凑；--section；业务错误嗅探补两种形态；backend_message；
                                  # extraParams；boundary 注解；find 封顶 3 + 领域词加权；嵌套参数 sample_value；
                                  # 计数与用法更新；ROUTE_ERROR 不再指向已删除的 list-tools
M  scripts/annotations.json       # 新增 index / bond 两个 server 的全部人工注解；futures 四个 extraParams；
                                  # futures_get_research_opinion 样例；quote_get_realtime_indicators 故障记录更新；
                                  # company 日期字段的调用要点纠错 + 五个工具的样例/known_issue/extraParams
M  scripts/registry.json          # refresh 全量重建：9 server / 134 工具
M  references/*.md                # 全部重生成；新增 index.md、bond.md
M  tests/run-offline-tests.mjs    # 63 → 72
M  tests/run-boundary-tests.mjs   # 50 → 59
M  tests/run-smoke.mjs            # 计数
M  tests/README.md                # 计数、run-smoke 用法、extraParams 说明
```

复验：`run-offline-tests.mjs` 72/72 ✅；`run-boundary-tests.mjs` 59/59 ✅；`doctor` 9 个 server 连通、漂移 0；`run-smoke.mjs` 131/134（见 9.4）。

---

> 数据来源于万得 Wind 金融数据服务（本报告中的实测调用部分）。
